import { LLM_PROVIDERS } from "./catalog";
import { generateAnthropic, streamAnthropic } from "./providers/anthropic";
import { generateGemini, streamGemini } from "./providers/gemini";
import { generateOpenAI, streamOpenAI } from "./providers/openai";
import type { LlmProvider, LlmRequestConfig } from "./types";

const STREAMERS = {
  anthropic: streamAnthropic,
  openai: streamOpenAI,
  gemini: streamGemini,
} as const;

const GENERATORS = {
  anthropic: generateAnthropic,
  openai: generateOpenAI,
  gemini: generateGemini,
} as const;

export function getProviderCatalog() {
  return LLM_PROVIDERS;
}

export function isKnownProvider(provider: string): provider is LlmProvider {
  return LLM_PROVIDERS.some((entry) => entry.id === provider);
}

export function getProviderEnvAvailability(): Record<LlmProvider, boolean> {
  return LLM_PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = Boolean(process.env[provider.envKey]);
    return acc;
  }, {} as Record<LlmProvider, boolean>);
}

export async function streamText(
  config: LlmRequestConfig,
  onChunk: (chunk: string) => void,
  signal: AbortSignal
): Promise<string> {
  return STREAMERS[config.provider](config, onChunk, signal);
}

export async function generateText(config: LlmRequestConfig, signal?: AbortSignal): Promise<string> {
  return GENERATORS[config.provider](config, signal);
}

