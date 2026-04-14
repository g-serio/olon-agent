export type LlmProvider = "anthropic" | "openai" | "gemini";

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequestConfig {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  maxTokens?: number;
  system?: string;
  assistantPrefill?: string;
  messages: LlmMessage[];
}

export interface LlmProviderModel {
  id: string;
  label: string;
  tier: "quality" | "balanced" | "speed";
}

export interface LlmProviderDescriptor {
  id: LlmProvider;
  label: string;
  envKey: string;
  models: LlmProviderModel[];
}
