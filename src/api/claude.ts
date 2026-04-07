export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChunkCallback = (chunk: string, full: string) => void;

interface StreamDelta {
  type: string;
  delta?: { text?: string };
}

const PROXY_URL = "/api/claude";

// ─── Load prompt from public/lib at runtime ───────────────────────────────────
const promptCache = new Map<string, string>();

export async function loadPrompt(name: string): Promise<string> {
  if (promptCache.has(name)) return promptCache.get(name)!;
  const res = await fetch(`/lib/${name}`);
  if (!res.ok) throw new Error(`Failed to load prompt ${name}: ${res.status}`);
  const text = await res.text();
  promptCache.set(name, text);
  return text;
}

// ─── Stream Claude ────────────────────────────────────────────────────────────

export async function streamClaude(
  messages: ClaudeMessage[],
  onChunk: ChunkCallback,
  signal: AbortSignal,
  maxTokens = 64000,
  system?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "claude-opus-4-6",
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;

  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 400)}`);
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
        const parsed = JSON.parse(payload) as StreamDelta;
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          full += parsed.delta.text;
          onChunk(parsed.delta.text, full);
        }
      } catch { /* skip */ }
    }
  }

  if (buffer.startsWith("data: ")) {
    const payload = buffer.slice(6).trim();
    if (payload && payload !== "[DONE]") {
      try {
        const parsed = JSON.parse(payload) as StreamDelta;
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          full += parsed.delta.text;
          onChunk(parsed.delta.text, full);
        }
      } catch { /* ignore */ }
    }
  }

  return full;
}
