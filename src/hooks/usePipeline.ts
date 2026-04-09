import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_AGENT_MODELS } from "@/lib/llm/catalog";
import { buildAgent1UserMessage } from "@/prompts/agent1";
import { fetchProviderSetup, getSessionApiKey, loadPrompt, streamLlm } from "@/api/llm";
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
  SessionApiKeys,
  SvgAsset,
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
  sessionApiKeys: SessionApiKeys;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
}

function stripFences(text: string): string {
  return text.replace(/^```(?:bash|sh|tsx?|typescript)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

function createEmptyProviderAvailability(): ProviderAvailability {
  return {
    anthropic: false,
    openai: false,
    gemini: false,
  };
}

function createEmptySessionKeys(): SessionApiKeys {
  return {
    anthropic: "",
    openai: "",
    gemini: "",
  };
}

function providerReady(providerAvailability: ProviderAvailability, sessionApiKeys: SessionApiKeys, provider: AgentModelConfig["provider"]) {
  return providerAvailability[provider] || sessionApiKeys[provider].trim().length > 0;
}

async function readSandboxStream(
  script: string,
  tenantName: string,
  llm: AgentModelConfig,
  apiKey: string | undefined,
  onLog: (msg: string, type: LogType) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script, tenantName, llm: { ...llm, apiKey } }),
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
    sessionApiKeys: createEmptySessionKeys(),
    agent1Config: { ...DEFAULT_AGENT_MODELS.agent1 },
    agent2Config: { ...DEFAULT_AGENT_MODELS.agent2 },
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
      setState((prev) => ({ ...prev, dsJson: JSON.parse(text), dsFileName: file.name }));
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
      state.userContent
    );

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
        abortRef.current.signal,
        64000,
        systemPrompt,
        getSessionApiKey(state.sessionApiKeys, state.agent1Config.provider)
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
    }));
  }, [
    addLog,
    scrollStream,
    state.agent1Config,
    state.contentMode,
    state.domain,
    state.dsJson,
    state.sessionApiKeys,
    state.svgAssets,
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

    const tenantName = state.tenantName || state.domain.replace(/\s+/g, "-").toLowerCase() || "tenant";

    let finalScript: string;
    try {
      finalScript = await readSandboxStream(
        state.agent1Script,
        tenantName,
        state.agent2Config,
        getSessionApiKey(state.sessionApiKeys, state.agent2Config.provider),
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
    state.sessionApiKeys,
    state.tenantName,
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
      sessionApiKeys: prev.sessionApiKeys,
      agent1Config: prev.agent1Config,
      agent2Config: prev.agent2Config,
    }));
  }, []);

  const llmReady =
    providerReady(state.providerAvailability, state.sessionApiKeys, state.agent1Config.provider) &&
    providerReady(state.providerAvailability, state.sessionApiKeys, state.agent2Config.provider);

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
    restart,
  };
}
