import type { LlmMessage, LlmRequestConfig } from "../types";
import { stripCodeFences } from "../utils";

function buildGeminiContents(messages: LlmMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function extractGeminiText(data: {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}): string {
  return (data.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("");
}

export async function streamGemini(
  config: LlmRequestConfig,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: config.system
        ? { parts: [{ text: config.system }] }
        : undefined,
      contents: buildGeminiContents(config.messages),
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? 64000,
      },
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
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
      if (!payload) continue;

      try {
        const parsed = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const chunk = extractGeminiText(parsed);
        if (chunk) {
          full += chunk;
          onChunk(chunk);
        }
      } catch {
        continue;
      }
    }
  }

  return full;
}

export async function generateGemini(config: LlmRequestConfig, signal?: AbortSignal): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: config.system
        ? { parts: [{ text: config.system }] }
        : undefined,
      contents: buildGeminiContents(config.messages),
      generationConfig: {
        maxOutputTokens: config.maxTokens ?? 16000,
      },
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return stripCodeFences(extractGeminiText(data));
}

