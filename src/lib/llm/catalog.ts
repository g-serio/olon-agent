import type { LlmProviderDescriptor } from "./types";

export const LLM_PROVIDERS: LlmProviderDescriptor[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", tier: "balanced" },
      { id: "claude-opus-4-20250514", label: "Claude Opus 4", tier: "quality" },
      { id: "claude-opus-4-1-20250805", label: "Claude Opus 4.1", tier: "quality" },
      { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet", tier: "speed" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      { id: "gpt-5.4", label: "GPT-5.4", tier: "quality" },
      { id: "gpt-5.4-pro", label: "GPT-5.4 Pro", tier: "quality" },
      { id: "gpt-4.1", label: "GPT-4.1", tier: "balanced" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", tier: "speed" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    models: [
      { id: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview", tier: "quality" },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", tier: "balanced" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "quality" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "speed" },
    ],
  },
];

export const DEFAULT_AGENT_MODELS = {
  agent1: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  },
  agent2: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  },
} as const;
