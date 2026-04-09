import type { LlmRequestConfig } from "../types";
import { stripCodeFences } from "../utils";

function extractTextBlocks(data: { content?: { type: string; text?: string }[] }): string {
  return (data.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");
}

export async function streamAnthropic(
  config: LlmRequestConfig,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens ?? 64000,
      system: config.system,
      messages: config.messages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload) as { type?: string; delta?: { text?: string } };
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          full += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
      } catch {
        continue;
      }
    }
  }

  return full;
}

export async function generateAnthropic(config: LlmRequestConfig, signal?: AbortSignal): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens ?? 16000,
      system: config.system,
      messages: config.messages,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return stripCodeFences(extractTextBlocks(data));
}

