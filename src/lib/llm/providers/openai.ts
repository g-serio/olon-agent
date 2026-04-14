import type { LlmRequestConfig } from "../types";
import { buildTranscript, stripCodeFences } from "../utils";

interface OpenAIResponseShape {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  output_text?: string;
}

interface OpenAIStreamEvent {
  type?: string;
  delta?: string;
  text?: string;
  response?: OpenAIResponseShape & {
    incomplete_details?: { reason?: string | null };
  };
}

function buildOpenAIRequest(config: LlmRequestConfig, streaming: boolean) {
  const payload: Record<string, unknown> = {
    model: config.model,
    instructions: config.system,
    input: buildTranscript(config.messages),
    max_output_tokens: config.maxTokens ?? (streaming ? 64000 : 16000),
  };

  if (streaming) {
    payload.stream = true;
  }

  if (config.model.startsWith("gpt-5")) {
    payload.text = { verbosity: "low" };

    if (config.model.startsWith("gpt-5.4-pro")) {
      payload.reasoning = { effort: "medium" };
    } else {
      payload.reasoning = { effort: "low" };
    }
  }

  return payload;
}

function extractOpenAIText(data: OpenAIResponseShape): string {
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }

  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");
}

export async function streamOpenAI(
  config: LlmRequestConfig,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildOpenAIRequest(config, true)),
    signal,
  });

  if (!res.ok) {
    throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
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
        const parsed = JSON.parse(payload) as OpenAIStreamEvent;

        if (parsed.type === "response.output_text.delta" && parsed.delta) {
          full += parsed.delta;
          onChunk(parsed.delta);
        }

        if (parsed.type === "response.output_text.done" && parsed.text && !full) {
          full = parsed.text;
          onChunk(parsed.text);
        }

        if (parsed.type === "response.completed" && parsed.response) {
          const completedText = extractOpenAIText(parsed.response);
          if (completedText && !full) {
            full = completedText;
            onChunk(completedText);
          }
        }

        if (parsed.type === "response.incomplete" && !full) {
          const reason = parsed.response?.incomplete_details?.reason ?? "unknown_reason";
          throw new Error(`OpenAI response incomplete: ${reason}`);
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  }

  return full;
}

export async function generateOpenAI(config: LlmRequestConfig, signal?: AbortSignal): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildOpenAIRequest(config, false)),
    signal,
  });

  if (!res.ok) {
    throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as OpenAIResponseShape;
  return stripCodeFences(extractOpenAIText(data));
}
