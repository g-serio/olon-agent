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
  const assistantPrefill = config.assistantPrefill?.trimEnd() ?? "";
  const requestMessages = assistantPrefill
    ? [...config.messages, { role: "assistant" as const, content: assistantPrefill }]
    : config.messages;
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
      messages: requestMessages,
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
  let full = assistantPrefill;

  if (assistantPrefill) {
    onChunk(assistantPrefill);
  }

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
        const parsed = JSON.parse(payload) as {
          type?: string;
          delta?: { text?: string; stop_reason?: string | null };
        };
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          full += parsed.delta.text;
          onChunk(parsed.delta.text);
        }
        if (parsed.type === "message_delta" && parsed.delta?.stop_reason === "max_tokens") {
          throw new Error("Anthropic response incomplete: max_tokens");
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }

  return full;
}

export async function generateAnthropic(config: LlmRequestConfig, signal?: AbortSignal): Promise<string> {
  const assistantPrefill = config.assistantPrefill?.trimEnd() ?? "";
  const requestMessages = assistantPrefill
    ? [...config.messages, { role: "assistant" as const, content: assistantPrefill }]
    : config.messages;
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
      messages: requestMessages,
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return `${assistantPrefill}${stripCodeFences(extractTextBlocks(data))}`;
}
