import type { AgentModelConfig } from "@/types";

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChunkCallback = (chunk: string, full: string) => void;

const LLM_URL = "/api/llm";
const promptCache = new Map<string, string>();

export async function loadPrompt(name: string): Promise<string> {
  if (promptCache.has(name)) return promptCache.get(name)!;
  const res = await fetch(`/lib/${name}`);
  if (!res.ok) throw new Error(`Failed to load prompt ${name}: ${res.status}`);
  const text = await res.text();
  promptCache.set(name, text);
  return text;
}

export async function fetchProviderSetup() {
  const res = await fetch(LLM_URL);
  if (!res.ok) throw new Error(`Failed to load provider setup: ${res.status}`);
  return res.json() as Promise<{
    providers: Array<{
      id: AgentModelConfig["provider"];
      label: string;
      envKey: string;
      models: Array<{ id: string; label: string; tier: string }>;
    }>;
    envAvailability: Record<AgentModelConfig["provider"], boolean>;
  }>;
}

export async function streamLlm(
  agent: AgentModelConfig,
  messages: LlmMessage[],
  onChunk: ChunkCallback,
  signal: AbortSignal,
  maxTokens = 64000,
  system?: string
): Promise<string> {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      provider: agent.provider,
      model: agent.model,
      maxTokens,
      messages,
      system,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM API ${res.status}: ${text.slice(0, 400)}`);
  }

  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let full = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as { type?: string; delta?: string; error?: string };
        if (parsed.type === "text-delta" && parsed.delta) {
          full += parsed.delta;
          onChunk(parsed.delta, full);
        }
        if (parsed.type === "error" && parsed.error) {
          throw new Error(parsed.error);
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }

  return full;
}
