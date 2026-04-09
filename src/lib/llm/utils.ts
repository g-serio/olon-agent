import type { LlmMessage } from "./types";

export function stripCodeFences(text: string): string {
  return text.replace(/^```(?:[\w-]+)?\s*\n?/m, "").replace(/\n?```\s*$/m, "").trim();
}

export function buildTranscript(messages: LlmMessage[]): string {
  return messages
    .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
    .join("\n\n");
}

export async function readJsonSafely(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: text };
  }
}

