import { NextRequest, NextResponse } from "next/server";
import { generateText, getProviderCatalog, getProviderEnvAvailability, isKnownProvider, streamText } from "@/lib/llm";
import type { LlmMessage, LlmProvider } from "@/lib/llm/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function getEnvApiKey(provider: LlmProvider): string {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY ?? "";
  if (provider === "openai") return process.env.OPENAI_API_KEY ?? "";
  return process.env.GEMINI_API_KEY ?? "";
}

export async function GET() {
  return NextResponse.json({
    providers: getProviderCatalog(),
    envAvailability: getProviderEnvAvailability(),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    provider,
    model,
    maxTokens,
    messages,
    system,
    assistantPrefill,
    stream: streamMode,
  } = (body ?? {}) as {
    provider?: string;
    model?: string;
    maxTokens?: number;
    messages?: LlmMessage[];
    system?: string;
    assistantPrefill?: string;
    stream?: boolean;
  };

  if (!provider || !isKnownProvider(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  if (!model) {
    return NextResponse.json({ error: "Model is required" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "At least one message is required" }, { status: 400 });
  }

  const resolvedApiKey = getEnvApiKey(provider);
  if (!resolvedApiKey) {
    return NextResponse.json({ error: `Missing API key for ${provider}` }, { status: 400 });
  }

  if (streamMode === false) {
    try {
      const text = await generateText({
        provider,
        model,
        apiKey: resolvedApiKey,
        maxTokens,
        system,
        assistantPrefill,
        messages,
      }, req.signal);

      return NextResponse.json({ text });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const encoder = new TextEncoder();
  const responseStream = new ReadableStream({
    async start(controller) {
      const push = (chunk: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-delta", delta: chunk })}\n\n`));
      };

      try {
        await streamText(
          {
            provider,
            model,
            apiKey: resolvedApiKey,
            maxTokens,
            system,
            assistantPrefill,
            messages,
          },
          push,
          req.signal
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(responseStream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
