import { useState, useRef, useCallback } from "react";
import { streamClaude, loadPrompt } from "@/api/claude";
import { buildAgent1UserMessage } from "@/prompts/agent1";
import type {
  PipelineStep,
  LogEntry,
  LogType,
  DeployResult,
  SandboxEvent,
  DsJsonSchema,
  SvgAsset,
  ContentMode,
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
  // Agent 1 output — shown in review
  agent1Script: string;
  // Final output from sandbox
  finalScript: string;
  deployResult: DeployResult | null;
  copied: boolean;
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:bash|sh|tsx?|typescript)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();
}

async function readSandboxStream(
  script: string,
  tenantName: string,
  onLog: (msg: string, type: LogType) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("/api/sandbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script, tenantName }),
    signal,
  });
  if (!res.ok) throw new Error(`Sandbox API ${res.status}`);

  const reader = res.body!.getReader();
  const dec    = new TextDecoder();
  let buf      = "";
  let done: string | null = null;

  while (true) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6)) as SandboxEvent;
        if (ev.type === "log")   onLog(ev.msg ?? "", ev.logType ?? "info");
        if (ev.type === "done")  done = ev.script ?? null;
        if (ev.type === "fatal") throw new Error(`Sandbox: ${ev.msg}`);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  if (done === null) throw new Error("Sandbox chiusa senza green build");
  return done;
}

export function usePipeline() {
  const [state, setState] = useState<PipelineState>({
    step: 0,
    dsJson: null, dsFileName: "", svgAssets: [],
    contentMode: "generate", domain: "", userContent: "",
    tenantName: "",
    logs: [], isWorking: false, streamText: "", agentLabel: "",
    agent1Script: "",
    finalScript: "",
    deployResult: null, copied: false,
  });

  const abortRef  = useRef<AbortController | null>(null);
  const logRef    = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const set = useCallback(
    <K extends keyof PipelineState>(key: K, value: PipelineState[K]) =>
      setState(p => ({ ...p, [key]: value })),
    []
  );

  const addLog = useCallback((msg: string, type: LogType = "info") => {
    setState(p => ({ ...p, logs: [...p.logs, { msg, type }] }));
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 30);
  }, []);

  const scrollStream = useCallback(() => {
    setTimeout(() => { if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight; }, 10);
  }, []);

  // Brand
  const handleDsUpload = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      setState(p => ({ ...p, dsJson: JSON.parse(text), dsFileName: file.name }));
    } catch { alert("File JSON non valido."); }
  }, []);

  const handleSvgUpload = useCallback(async (file: File) => {
    const content = await file.text();
    setState(p => ({
      ...p,
      svgAssets: [...p.svgAssets.filter(a => a.name !== file.name), { name: file.name, content }],
    }));
  }, []);

  const removeSvg = useCallback((name: string) =>
    setState(p => ({ ...p, svgAssets: p.svgAssets.filter(a => a.name !== name) })), []);

  // ── Step 2: Agent 1 generates src_tenant.sh ──────────────────────────────

  const runAgent1 = useCallback(async () => {
    abortRef.current = new AbortController();
    setState(p => ({
      ...p, step: 2, isWorking: true,
      streamText: "", logs: [],
      agentLabel: "Agente 1 — Generazione src_tenant.sh",
    }));
    addLog("Caricamento system prompt...", "info");

    let systemPrompt: string;
    try {
      systemPrompt = await loadPrompt("agent1.prompt.txt");
    } catch (e) {
      addLog(`Errore caricamento prompt: ${(e as Error).message}`, "error");
      setState(p => ({ ...p, isWorking: false }));
      return;
    }

    addLog("Agente 1 avviato — generazione OlonJS v1.5...", "agent");

    const userMsg = buildAgent1UserMessage(
      state.dsJson, state.svgAssets, state.contentMode, state.domain, state.userContent
    );

    let raw = "";
    try {
      await streamClaude(
        [{ role: "user", content: userMsg }],
        (_c, full) => {
          raw = full;
          setState(p => ({ ...p, streamText: full }));
          scrollStream();
        },
        abortRef.current.signal,
        64000,
        systemPrompt
      );
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError") addLog(`Errore: ${err.message}`, "error");
      setState(p => ({ ...p, isWorking: false }));
      return;
    }

    const script = stripFences(raw);
    if (!script.startsWith("#!/")) {
      addLog("Agent 1 non ha prodotto uno script bash valido", "error");
      setState(p => ({ ...p, isWorking: false }));
      return;
    }

    addLog(`src_tenant.sh generato — ${(script.length / 1024).toFixed(1)} KB · ${script.split("\n").length.toLocaleString()} righe`, "success");

    // Go to review step
    setState(p => ({
      ...p, step: 3, isWorking: false,
      agent1Script: script, streamText: "",
    }));
  }, [state.dsJson, state.svgAssets, state.contentMode, state.domain, state.userContent, addLog, scrollStream]);

  // ── Step 4: Sandbox — Agent 2 ─────────────────────────────────────────────

  const runAgent2 = useCallback(async () => {
    abortRef.current = new AbortController();
    setState(p => ({
      ...p, step: 4, isWorking: true,
      streamText: "", logs: [],
      agentLabel: "Agente 2 — Sandbox E2B · Green Build",
    }));
    addLog("Sandbox avviata...", "agent");

    const tenantName = state.tenantName || state.domain.replace(/\s+/g, "-").toLowerCase() || "tenant";

    let finalScript: string;
    try {
      finalScript = await readSandboxStream(
        state.agent1Script,
        tenantName,
        (msg, type) => addLog(msg, type),
        abortRef.current.signal
      );
    } catch (e) {
      const err = e as Error;
      if (err.name === "AbortError") { setState(p => ({ ...p, isWorking: false })); return; }
      addLog(`Build fallito: ${err.message}`, "error");
      setState(p => ({ ...p, isWorking: false }));
      return;
    }

    addLog("✓ install_npm.jpcore.sh pronto per il download", "success");
    setState(p => ({
      ...p, step: 5, isWorking: false,
      finalScript,
      deployResult: { ok: false, skipped: true },
    }));
  }, [state.agent1Script, state.tenantName, state.domain, addLog]);

  // Download helpers
  const downloadAgent1Script = useCallback(() => {
    const blob = new Blob([state.agent1Script], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "src_tenant.sh"; a.click();
    URL.revokeObjectURL(url);
  }, [state.agent1Script]);

  const copyScript = useCallback(async () => {
    await navigator.clipboard.writeText(state.finalScript);
    set("copied", true);
    setTimeout(() => set("copied", false), 2000);
  }, [state.finalScript, set]);

  const downloadFinalScript = useCallback(() => {
    const blob = new Blob([state.finalScript], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "install_npm.jpcore.sh"; a.click();
    URL.revokeObjectURL(url);
  }, [state.finalScript]);

  const goBack = useCallback(() => {
    abortRef.current?.abort();
    setState(p => ({ ...p, step: Math.max(0, p.step - 1) as PipelineStep, isWorking: false }));
  }, []);

  const restart = useCallback(() => {
    abortRef.current?.abort();
    setState({
      step: 0,
      dsJson: null, dsFileName: "", svgAssets: [],
      contentMode: "generate", domain: "", userContent: "",
      tenantName: "",
      logs: [], isWorking: false, streamText: "", agentLabel: "",
      agent1Script: "", finalScript: "",
      deployResult: null, copied: false,
    });
  }, []);

  return {
    state, set, logRef, streamRef,
    handleDsUpload, handleSvgUpload, removeSvg,
    runAgent1, runAgent2,
    downloadAgent1Script, copyScript, downloadFinalScript,
    goBack, restart,
  };
}
