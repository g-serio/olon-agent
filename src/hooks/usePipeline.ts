import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_AGENT_MODELS } from "@/lib/llm/catalog";
import { resolveDesignTokens } from "@/lib/design-system";
import { createEmptyTypographyContract } from "@/lib/google-fonts";
import { buildGoogleFontsCssUrl, selectedTypographyFamilies } from "@/lib/google-fonts";
import {
  buildAgent1PlanSystemPrompt,
  buildAgent1PlanUserMessage,
  buildAgent1RetryUserMessage,
  buildAgent1ScriptUserMessage,
  buildAgent1UserMessage,
} from "@/prompts/agent1";
import { fetchProviderSetup, generateLlm, loadPrompt, streamLlm } from "@/api/llm";
import type {
  AgentModelConfig,
  ContentMode,
  DeployResult,
  DsJsonSchema,
  LogEntry,
  LogType,
  PipelineStep,
  ProviderAvailability,
  SandboxEvent,
  SvgAsset,
  TypographyContract,
} from "@/types";

interface PipelineState {
  step: PipelineStep;
  dsJson: DsJsonSchema | null;
  dsFileName: string;
  svgAssets: SvgAsset[];
  contentMode: ContentMode;
  domain: string;
  userContent: string;
  tenantName: string;
  logs: LogEntry[];
  isWorking: boolean;
  streamText: string;
  agentLabel: string;
  agent1Script: string;
  finalScript: string;
  deployResult: DeployResult | null;
  copied: boolean;
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  typographyContract: TypographyContract;
}

function stripFences(text: string): string {
  return text.replace(/^```(?:bash|sh|tsx?|typescript)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

const AGENT1_BASH_PREFILL = "#!/bin/bash\nset -e\n";
const AGENT1_PLAN_PREFILL = "{";
const AGENT1_MAX_RETRIES = 1;

interface Agent1ImplementationPlan {
  summary: string;
  filesToWrite: string[];
  forbiddenWrites: string[];
  typography: {
    googleFontsUrl: string;
    families: string[];
    themeJsonFontFamily: {
      primary: string;
      display: string;
      mono: string;
    };
    wordmark: {
      fontFamily: string;
      weight: string;
      tracking: string;
    };
  };
  scriptContract: {
    rawBashOnly: boolean;
    startsWithShebang: boolean;
    secondLine: string;
  };
  executionOutline: string[];
}

function createEmptyProviderAvailability(): ProviderAvailability {
  return {
    anthropic: false,
    openai: false,
    gemini: false,
  };
}

function providerReady(
  providerAvailability: ProviderAvailability,
  provider: AgentModelConfig["provider"]
) {
  return providerAvailability[provider];
}

function slugifyTenantPart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function extractBrandLikeValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const titleLineMatch = trimmed.match(/(?:^|\n)\s*titolo\s+del\s+sito\s*:\s*(.+)$/im);
  if (titleLineMatch?.[1]) return titleLineMatch[1].trim();

  const mdTitleMatch = trimmed.match(/(?:^|\n)\s*#\s+(.+)$/m);
  if (mdTitleMatch?.[1]) return mdTitleMatch[1].trim();

  const brandMatch = trimmed.match(/(?:^|\n)\s*(?:nome brand|brand|site name|project name)\s*:\s*(.+)$/im);
  if (brandMatch?.[1]) return brandMatch[1].trim();

  return trimmed.length <= 64 ? trimmed : "";
}

function extractSiteJsonFromScript(script: string): string | null {
  const match = script.match(
    /cat\s*>\s*src\/data\/config\/site\.json\s*<<\s*['"]?([A-Z0-9_]+)['"]?\s*\n([\s\S]*?)\n\1/mi
  );
  return match?.[2]?.trim() ?? null;
}

function extractTenantNameFromScript(script: string): string {
  const siteJsonText = extractSiteJsonFromScript(script);
  if (!siteJsonText) return "";

  try {
    const site = JSON.parse(siteJsonText) as {
      identity?: { title?: string };
      header?: {
        data?: {
          title?: string;
          brandText?: string;
          logoText?: string;
          siteTitle?: string;
        };
      };
      footer?: {
        data?: {
          brandText?: string;
        };
      };
    };

    return (
      site.header?.data?.title ||
      site.header?.data?.brandText ||
      site.header?.data?.logoText ||
      site.header?.data?.siteTitle ||
      site.identity?.title ||
      site.footer?.data?.brandText ||
      ""
    );
  } catch {
    return "";
  }
}

function resolveTenantName(
  tenantName: string,
  script: string,
  dsJson: DsJsonSchema | null,
  dsFileName: string,
  domain: string,
  userContent: string
): string {
  const resolved = dsJson ? resolveDesignTokens(dsJson) : null;
  const candidates = [
    tenantName,
    extractTenantNameFromScript(script),
    extractBrandLikeValue(userContent),
    resolved?.name ?? "",
    dsJson?.name ?? "",
    dsFileName,
    extractBrandLikeValue(domain),
    "tenant",
  ];

  for (const candidate of candidates) {
    const slug = slugifyTenantPart(candidate).slice(0, 48).replace(/-+$/g, "");
    if (slug) return slug;
  }

  return "tenant";
}

function validateTypographyContractInScript(
  script: string,
  typographyContract: TypographyContract
): string[] {
  const selectedFamilies = selectedTypographyFamilies(typographyContract);
  if (selectedFamilies.length === 0) return [];

  const issues: string[] = [];
  const lowerScript = script.toLowerCase();
  const googleFontsUrl = buildGoogleFontsCssUrl(selectedFamilies).toLowerCase();

  if (lowerScript.includes("src/fonts.css")) {
    issues.push("Lo script prova a usare src/fonts.css invece di src/index.css.");
  }

  if (!lowerScript.includes("src/index.css")) {
    issues.push("Lo script non aggiorna src/index.css per importare i font.");
  }

  if (!lowerScript.includes("src/data/config/theme.json")) {
    issues.push("Lo script non genera src/data/config/theme.json.");
  }

  if (!lowerScript.includes(googleFontsUrl)) {
    issues.push("Lo script non include l'URL Google Fonts esatta del contract.");
  }

  for (const family of selectedFamilies) {
    if (!lowerScript.includes(family.toLowerCase())) {
      issues.push(`Lo script non cita la famiglia selezionata: ${family}.`);
    }
  }

  return issues;
}

function extractJsonObject(text: string): string | null {
  const cleaned = stripFences(text).trim();
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) return cleaned;

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return cleaned.slice(start, end + 1);
}

function parseAgent1Plan(text: string): Agent1ImplementationPlan | null {
  const jsonText = extractJsonObject(text);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as Partial<Agent1ImplementationPlan>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      filesToWrite: Array.isArray(parsed.filesToWrite)
        ? parsed.filesToWrite.filter((value): value is string => typeof value === "string")
        : [],
      forbiddenWrites: Array.isArray(parsed.forbiddenWrites)
        ? parsed.forbiddenWrites.filter((value): value is string => typeof value === "string")
        : [],
      typography: {
        googleFontsUrl:
          typeof parsed.typography?.googleFontsUrl === "string" ? parsed.typography.googleFontsUrl : "",
        families: Array.isArray(parsed.typography?.families)
          ? parsed.typography.families.filter((value): value is string => typeof value === "string")
          : [],
        themeJsonFontFamily: {
          primary:
            typeof parsed.typography?.themeJsonFontFamily?.primary === "string"
              ? parsed.typography.themeJsonFontFamily.primary
              : "",
          display:
            typeof parsed.typography?.themeJsonFontFamily?.display === "string"
              ? parsed.typography.themeJsonFontFamily.display
              : "",
          mono:
            typeof parsed.typography?.themeJsonFontFamily?.mono === "string"
              ? parsed.typography.themeJsonFontFamily.mono
              : "",
        },
        wordmark: {
          fontFamily:
            typeof parsed.typography?.wordmark?.fontFamily === "string"
              ? parsed.typography.wordmark.fontFamily
              : "",
          weight:
            typeof parsed.typography?.wordmark?.weight === "string" ? parsed.typography.wordmark.weight : "",
          tracking:
            typeof parsed.typography?.wordmark?.tracking === "string"
              ? parsed.typography.wordmark.tracking
              : "",
        },
      },
      scriptContract: {
        rawBashOnly: parsed.scriptContract?.rawBashOnly === true,
        startsWithShebang: parsed.scriptContract?.startsWithShebang === true,
        secondLine:
          typeof parsed.scriptContract?.secondLine === "string" ? parsed.scriptContract.secondLine : "",
      },
      executionOutline: Array.isArray(parsed.executionOutline)
        ? parsed.executionOutline.filter((value): value is string => typeof value === "string")
        : [],
    };
  } catch {
    return null;
  }
}

function validateAgent1Plan(
  plan: Agent1ImplementationPlan,
  typographyContract: TypographyContract
): string[] {
  const issues: string[] = [];
  const selectedFamilies = selectedTypographyFamilies(typographyContract);
  const normalizedFiles = new Set(plan.filesToWrite.map((value) => value.trim().toLowerCase()));
  const normalizedForbidden = new Set(plan.forbiddenWrites.map((value) => value.trim().toLowerCase()));
  const normalizedPlanFamilies = new Set(plan.typography.families.map((value) => value.trim().toLowerCase()));

  if (!plan.summary.trim()) {
    issues.push("Il piano non contiene un summary utile.");
  }

  if (!plan.scriptContract.rawBashOnly) {
    issues.push("Il piano non dichiara che l'output finale deve essere raw bash only.");
  }

  if (!plan.scriptContract.startsWithShebang) {
    issues.push("Il piano non dichiara il vincolo startsWithShebang.");
  }

  if (plan.scriptContract.secondLine.trim() !== "set -e") {
    issues.push("Il piano non dichiara che la seconda riga deve essere set -e.");
  }

  if (plan.executionOutline.length === 0) {
    issues.push("Il piano non contiene un executionOutline.");
  }

  if (selectedFamilies.length > 0) {
    const googleFontsUrl = buildGoogleFontsCssUrl(selectedFamilies);

    if (!normalizedFiles.has("src/index.css")) {
      issues.push("Il piano non prevede la scrittura di src/index.css.");
    }

    if (!normalizedFiles.has("src/data/config/theme.json")) {
      issues.push("Il piano non prevede la scrittura di src/data/config/theme.json.");
    }

    if (plan.typography.googleFontsUrl.trim() !== googleFontsUrl) {
      issues.push("Il piano non riporta l'URL Google Fonts esatta del contract.");
    }

    for (const family of selectedFamilies) {
      if (!normalizedPlanFamilies.has(family.toLowerCase())) {
        issues.push(`Il piano non include la famiglia selezionata: ${family}.`);
      }
    }

    if (typographyContract.fontFamily.primary?.stack) {
      if (plan.typography.themeJsonFontFamily.primary.trim() !== typographyContract.fontFamily.primary.stack) {
        issues.push("Il piano non allinea theme.json.fontFamily.primary al contract.");
      }
    }

    if (typographyContract.fontFamily.display?.stack) {
      if (plan.typography.themeJsonFontFamily.display.trim() !== typographyContract.fontFamily.display.stack) {
        issues.push("Il piano non allinea theme.json.fontFamily.display al contract.");
      }
    }

    if (typographyContract.fontFamily.mono?.stack) {
      if (plan.typography.themeJsonFontFamily.mono.trim() !== typographyContract.fontFamily.mono.stack) {
        issues.push("Il piano non allinea theme.json.fontFamily.mono al contract.");
      }
    }

    if (
      typographyContract.wordmark.fontFamily?.stack &&
      plan.typography.wordmark.fontFamily.trim() !== typographyContract.wordmark.fontFamily.stack
    ) {
      issues.push("Il piano non allinea la famiglia del wordmark al contract.");
    }

    if (plan.typography.wordmark.weight.trim() !== typographyContract.wordmark.weight) {
      issues.push("Il piano non allinea il peso del wordmark al contract.");
    }

    if (plan.typography.wordmark.tracking.trim() !== typographyContract.wordmark.tracking) {
      issues.push("Il piano non allinea il tracking del wordmark al contract.");
    }
  }

  if (!normalizedForbidden.has("src/app.tsx")) {
    issues.push("Il piano non protegge esplicitamente src/App.tsx.");
  }

  if (normalizedFiles.has("src/fonts.css")) {
    issues.push("Il piano prova a usare src/fonts.css.");
  }

  if (!normalizedForbidden.has("src/fonts.css")) {
    issues.push("Il piano non marca src/fonts.css come write proibito.");
  }

  return issues;
}

function toCanonicalPlanJson(plan: Agent1ImplementationPlan): string {
  return JSON.stringify(plan, null, 2);
}

function summarizeInvalidOutput(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.slice(0, 220) || "(vuoto)";
}

async function readSandboxStream(
  script: string,
  tenantName: string,
  llm: AgentModelConfig,
  onLog: (msg: string, type: LogType) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script, tenantName, llm }),
    signal,
  });

  if (!res.ok) throw new Error(`Sandbox API ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneScript: string | null = null;

  while (true) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6)) as SandboxEvent;
        if (event.type === "log") onLog(event.msg ?? "", event.logType ?? "info");
        if (event.type === "done") doneScript = event.script ?? null;
        if (event.type === "fatal") throw new Error(`Sandbox: ${event.msg}`);
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }

  if (doneScript === null) throw new Error("Sandbox chiusa senza green build");
  return doneScript;
}

export function usePipeline() {
  const [state, setState] = useState<PipelineState>({
    step: 0,
    dsJson: null,
    dsFileName: "",
    svgAssets: [],
    contentMode: "generate",
    domain: "",
    userContent: "",
    tenantName: "",
    logs: [],
    isWorking: false,
    streamText: "",
    agentLabel: "",
    agent1Script: "",
    finalScript: "",
    deployResult: null,
    copied: false,
    providerAvailability: createEmptyProviderAvailability(),
    providerSetupLoaded: false,
    agent1Config: { ...DEFAULT_AGENT_MODELS.agent1 },
    agent2Config: { ...DEFAULT_AGENT_MODELS.agent2 },
    typographyContract: createEmptyTypographyContract(),
  });

  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    fetchProviderSetup()
      .then((payload) => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          providerAvailability: payload.envAvailability,
          providerSetupLoaded: true,
        }));
      })
      .catch(() => {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          providerSetupLoaded: true,
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  const set = useCallback(
    <K extends keyof PipelineState>(key: K, value: PipelineState[K]) =>
      setState((prev) => ({ ...prev, [key]: value })),
    []
  );

  const addLog = useCallback((msg: string, type: LogType = "info") => {
    setState((prev) => ({ ...prev, logs: [...prev.logs, { msg, type }] }));
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 30);
  }, []);

  const scrollStream = useCallback(() => {
    setTimeout(() => {
      if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }, 10);
  }, []);

  const handleDsUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as DsJsonSchema;
      setState((prev) => ({
        ...prev,
        dsJson: parsed,
        dsFileName: file.name,
        tenantName: prev.tenantName || resolveTenantName("", "", parsed, file.name, prev.domain, prev.userContent),
      }));
    } catch {
      alert("File JSON non valido.");
    }
  }, []);

  const handleSvgUpload = useCallback(async (file: File) => {
    const content = await file.text();
    setState((prev) => ({
      ...prev,
      svgAssets: [...prev.svgAssets.filter((asset) => asset.name !== file.name), { name: file.name, content }],
    }));
  }, []);

  const removeSvg = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      svgAssets: prev.svgAssets.filter((asset) => asset.name !== name),
    }));
  }, []);

  const runAgent1 = useCallback(async () => {
    abortRef.current = new AbortController();
    setState((prev) => ({
      ...prev,
      step: 2,
      isWorking: true,
      streamText: "",
      logs: [],
      agentLabel: `Agente 1 - ${prev.agent1Config.provider}/${prev.agent1Config.model}`,
    }));
    addLog("Caricamento system prompt...", "info");

    let systemPrompt: string;
    try {
      systemPrompt = await loadPrompt("agent1.prompt.txt");
    } catch (error) {
      addLog(`Errore caricamento prompt: ${(error as Error).message}`, "error");
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    addLog("Agente 1 avviato - generazione src_tenant.sh...", "agent");

    const userMessage = buildAgent1UserMessage(
      state.dsJson,
      state.svgAssets,
      state.contentMode,
      state.domain,
      state.userContent,
      state.typographyContract
    );

    const runPhase = async (
      phaseLabel: string,
      phaseSystemPrompt: string,
      messages: Array<{ role: "user" | "assistant"; content: string }>,
      assistantPrefill?: string
    ): Promise<string> => {
      let rawPhase = "";
      setState((prev) => ({ ...prev, streamText: "" }));
      addLog(phaseLabel, "agent");

      await streamLlm(
        state.agent1Config,
        messages,
        (_chunk, full) => {
          rawPhase = full;
          setState((prev) => ({ ...prev, streamText: full }));
          scrollStream();
        },
        abortRef.current!.signal,
        64000,
        phaseSystemPrompt,
        assistantPrefill
      );

      return rawPhase;
    };

    const planMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: buildAgent1PlanUserMessage(userMessage) },
    ];

    let validatedPlan: Agent1ImplementationPlan | null = null;
    let validatedPlanJson = "";

    for (let attempt = 0; attempt <= AGENT1_MAX_RETRIES; attempt += 1) {
      let planRaw = "";

      try {
        addLog(`Fase 1/2 - piano strutturato (${attempt + 1}/${AGENT1_MAX_RETRIES + 1})`, "agent");
        setState((prev) => ({ ...prev, streamText: "" }));
        planRaw = await generateLlm(
          state.agent1Config,
          planMessages,
          abortRef.current!.signal,
          64000,
          buildAgent1PlanSystemPrompt(),
          state.agent1Config.provider === "anthropic" ? AGENT1_PLAN_PREFILL : undefined
        );
        setState((prev) => ({ ...prev, streamText: planRaw }));
        scrollStream();
      } catch (error) {
        const err = error as Error;
        if (err.name !== "AbortError") addLog(`Errore piano Agent 1: ${err.message}`, "error");
        setState((prev) => ({ ...prev, isWorking: false }));
        return;
      }

      const parsedPlan = parseAgent1Plan(planRaw);
      if (!parsedPlan) {
        const issues = [
          "Il piano non e un JSON valido con l'oggetto richiesto.",
          `Anteprima output invalido: ${summarizeInvalidOutput(planRaw)}`,
        ];
        issues.forEach((issue) => addLog(issue, "error"));

        if (attempt === AGENT1_MAX_RETRIES) {
          addLog("Agent 1 non ha prodotto un piano strutturato valido.", "error");
          setState((prev) => ({ ...prev, isWorking: false }));
          return;
        }

        addLog("Retry guidato del piano con gli errori deterministici rilevati...", "info");
        planMessages.push({
          role: "user",
          content: buildAgent1RetryUserMessage("plan", issues, planRaw),
        });
        continue;
      }

      const planIssues = validateAgent1Plan(parsedPlan, state.typographyContract);
      if (planIssues.length > 0) {
        planIssues.forEach((issue) => addLog(issue, "error"));

        if (attempt === AGENT1_MAX_RETRIES) {
          addLog("Agent 1 non ha prodotto un piano conforme al contract.", "error");
          setState((prev) => ({ ...prev, isWorking: false }));
          return;
        }

        addLog("Retry guidato del piano con i vincoli mancati...", "info");
        planMessages.push({
          role: "user",
          content: buildAgent1RetryUserMessage("plan", planIssues, toCanonicalPlanJson(parsedPlan)),
        });
        continue;
      }

      validatedPlan = parsedPlan;
      validatedPlanJson = toCanonicalPlanJson(parsedPlan);
      addLog(
        `Piano validato - ${parsedPlan.filesToWrite.length} file previsti, ${parsedPlan.executionOutline.length} step`,
        "success"
      );
      break;
    }

    if (!validatedPlan) {
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    const scriptMessages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: buildAgent1ScriptUserMessage(userMessage, validatedPlanJson) },
    ];

    let finalScript = "";

    for (let attempt = 0; attempt <= AGENT1_MAX_RETRIES; attempt += 1) {
      let rawScript = "";

      try {
        rawScript = await runPhase(
          `Fase 2/2 - generazione src_tenant.sh (${attempt + 1}/${AGENT1_MAX_RETRIES + 1})`,
          systemPrompt,
          scriptMessages,
          state.agent1Config.provider === "anthropic" ? AGENT1_BASH_PREFILL : undefined
        );
      } catch (error) {
        const err = error as Error;
        if (err.name !== "AbortError") addLog(`Errore script Agent 1: ${err.message}`, "error");
        setState((prev) => ({ ...prev, isWorking: false }));
        return;
      }

      const script = stripFences(rawScript);
      const scriptIssues: string[] = [];

      if (!script.startsWith("#!/")) {
        scriptIssues.push("Agent 1 non ha prodotto uno script bash valido.");
      }

      scriptIssues.push(...validateTypographyContractInScript(script, state.typographyContract));

      if (scriptIssues.length > 0) {
        scriptIssues.forEach((issue) => addLog(issue, "error"));

        if (attempt === AGENT1_MAX_RETRIES) {
          addLog("Agent 1 non ha superato i guardrail finali dello script.", "error");
          setState((prev) => ({ ...prev, isWorking: false }));
          return;
        }

        addLog("Retry guidato dello script con i guardrail falliti...", "info");
        scriptMessages.push({
          role: "user",
          content: buildAgent1RetryUserMessage("script", scriptIssues, script),
        });
        continue;
      }

      finalScript = script;
      break;
    }

    if (!finalScript) {
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    addLog(
      `src_tenant.sh generato - ${(finalScript.length / 1024).toFixed(1)} KB · ${finalScript
        .split("\n")
        .length.toLocaleString()} righe`,
      "success"
    );

    setState((prev) => ({
      ...prev,
      step: 3,
      isWorking: false,
      agent1Script: finalScript,
      streamText: "",
      tenantName:
        prev.tenantName ||
        resolveTenantName(
          "",
          finalScript,
          prev.dsJson,
          prev.dsFileName,
          prev.domain,
          prev.userContent
        ),
    }));
    return;

    let raw = "";

    try {
      await streamLlm(
        state.agent1Config,
        [{ role: "user", content: userMessage }],
        (_chunk, full) => {
          raw = full;
          setState((prev) => ({ ...prev, streamText: full }));
          scrollStream();
        },
        abortRef.current!.signal,
        64000,
        systemPrompt,
        state.agent1Config.provider === "anthropic" ? AGENT1_BASH_PREFILL : undefined
      );
    } catch (error) {
      const err = error as Error;
      if (err.name !== "AbortError") addLog(`Errore: ${err.message}`, "error");
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    const script = stripFences(raw);
    if (!script.startsWith("#!/")) {
      addLog("Agent 1 non ha prodotto uno script bash valido", "error");
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    const typographyIssues = validateTypographyContractInScript(
      script,
      state.typographyContract
    );
    if (typographyIssues.length > 0) {
      typographyIssues.forEach((issue) => addLog(issue, "error"));
      addLog("Agent 1 ha ignorato il typography contract. Rigenera con un prompt piu stretto.", "error");
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    addLog(
      `src_tenant.sh generato - ${(script.length / 1024).toFixed(1)} KB · ${script.split("\n").length.toLocaleString()} righe`,
      "success"
    );

    setState((prev) => ({
      ...prev,
      step: 3,
      isWorking: false,
      agent1Script: script,
      streamText: "",
      tenantName:
        prev.tenantName || resolveTenantName("", script, prev.dsJson, prev.dsFileName, prev.domain, prev.userContent),
    }));
  }, [
    addLog,
    scrollStream,
    state.agent1Config,
    state.contentMode,
    state.domain,
    state.dsJson,
    state.svgAssets,
    state.typographyContract,
    state.userContent,
  ]);

  const runAgent2 = useCallback(async () => {
    abortRef.current = new AbortController();
    setState((prev) => ({
      ...prev,
      step: 4,
      isWorking: true,
      streamText: "",
      logs: [],
      agentLabel: `Agente 2 - ${prev.agent2Config.provider}/${prev.agent2Config.model}`,
    }));
    addLog("Sandbox avviata...", "agent");

    const tenantName = resolveTenantName(
      state.tenantName,
      state.agent1Script,
      state.dsJson,
      state.dsFileName,
      state.domain,
      state.userContent
    );

    let finalScript: string;
    try {
      finalScript = await readSandboxStream(
        state.agent1Script,
        tenantName,
        state.agent2Config,
        (msg, type) => addLog(msg, type),
        abortRef.current.signal
      );
    } catch (error) {
      const err = error as Error;
      if (err.name === "AbortError") {
        setState((prev) => ({ ...prev, isWorking: false }));
        return;
      }
      addLog(`Build fallito: ${err.message}`, "error");
      setState((prev) => ({ ...prev, isWorking: false }));
      return;
    }

    addLog("install_npm.jpcore.sh pronto per il download", "success");
    setState((prev) => ({
      ...prev,
      step: 5,
      isWorking: false,
      finalScript,
      deployResult: { ok: false, skipped: true },
    }));
  }, [
    addLog,
    state.agent1Script,
    state.agent2Config,
    state.domain,
    state.dsJson,
    state.dsFileName,
    state.tenantName,
    state.userContent,
  ]);

  const downloadAgent1Script = useCallback(() => {
    const blob = new Blob([state.agent1Script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "src_tenant.sh";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [state.agent1Script]);

  const copyScript = useCallback(async () => {
    await navigator.clipboard.writeText(state.finalScript);
    set("copied", true);
    setTimeout(() => set("copied", false), 2000);
  }, [set, state.finalScript]);

  const downloadFinalScript = useCallback(() => {
    const blob = new Blob([state.finalScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "install_npm.jpcore.sh";
    anchor.click();
    URL.revokeObjectURL(url);
  }, [state.finalScript]);

  const goBack = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      step: Math.max(0, prev.step - 1) as PipelineStep,
      isWorking: false,
    }));
  }, []);

  const goToStep = useCallback((step: PipelineStep) => {
    abortRef.current?.abort();
    setState((prev) => ({
      ...prev,
      step,
      isWorking: false,
    }));
  }, []);

  const restart = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({
      step: 0,
      dsJson: null,
      dsFileName: "",
      svgAssets: [],
      contentMode: "generate",
      domain: "",
      userContent: "",
      tenantName: "",
      logs: [],
      isWorking: false,
      streamText: "",
      agentLabel: "",
      agent1Script: "",
      finalScript: "",
      deployResult: null,
      copied: false,
      providerAvailability: prev.providerAvailability,
      providerSetupLoaded: prev.providerSetupLoaded,
      agent1Config: prev.agent1Config,
      agent2Config: prev.agent2Config,
      typographyContract: createEmptyTypographyContract(),
    }));
  }, []);

  const llmReady =
    providerReady(state.providerAvailability, state.agent1Config.provider) &&
    providerReady(state.providerAvailability, state.agent2Config.provider);

  return {
    state: {
      ...state,
      llmReady,
    },
    set,
    logRef,
    streamRef,
    handleDsUpload,
    handleSvgUpload,
    removeSvg,
    runAgent1,
    runAgent2,
    downloadAgent1Script,
    copyScript,
    downloadFinalScript,
    goBack,
    goToStep,
    restart,
  };
}
