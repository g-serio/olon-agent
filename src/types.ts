export interface ColorProperty {
  type: string;
  default?: string;
  description?: string;
}

export interface DsJsonSchema {
  name?: string;
  version?: string;
  tokens?: Record<string, unknown>;
  examples?: Array<Record<string, unknown>>;
  properties?: {
    name?: ColorProperty & { default?: string };
    version?: ColorProperty & { default?: string };
    tokens?: {
      properties?: {
        colors?: { properties?: Record<string, ColorProperty> };
        borderRadius?: Record<string, unknown>;
        spacing?: Record<string, unknown>;
        zIndex?: Record<string, unknown>;
        modes?: Record<string, unknown>;
        typography?: {
          properties?: Record<string, unknown>;
        };
      };
    };
  };
}

export interface SvgAsset {
  name: string;
  content: string;
}

export interface FontCatalogItem {
  family: string;
  category: string;
  lastModified?: string;
}

export interface TypographyFontChoice {
  family: string;
  category: string;
  stack: string;
}

export type TypographyDirectionId =
  | "editorial-serif"
  | "brand-sans"
  | "tech-stack"
  | "luxury-contrast"
  | "playful-display";

export interface TypographyDirectionSelection {
  presetId: TypographyDirectionId | null;
  source: "preset" | "manual" | "design-system" | "mixed";
}

export interface TypographyContract {
  direction: TypographyDirectionSelection;
  fontFamily: {
    primary: TypographyFontChoice | null;
    mono: TypographyFontChoice | null;
    display: TypographyFontChoice | null;
  };
  wordmark: {
    fontFamily: TypographyFontChoice | null;
    weight: string;
    tracking: string;
  };
}

export interface TypographyDirectionPreset {
  id: TypographyDirectionId;
  label: string;
  summary: string;
  rationale: string;
  primary: string;
  display: string;
  mono?: string;
  wordmark?: string;
  wordmarkWeight?: string;
  wordmarkTracking?: string;
}

export type LlmProvider = "anthropic" | "openai" | "gemini";
export type ContentMode = "generate" | "provide";

export type LogType = "info" | "agent" | "success" | "error";

export interface LogEntry {
  msg: string;
  type: LogType;
}

export interface DeployResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface AgentModelConfig {
  provider: LlmProvider;
  model: string;
}

export interface ProviderAvailability {
  anthropic: boolean;
  openai: boolean;
  gemini: boolean;
}

// 0 Brand | 1 Content | 2 Agent1 generating | 3 Review+download | 4 Sandbox | 5 Done
export type PipelineStep = 0 | 1 | 2 | 3 | 4 | 5;

export const STEP_LABELS: string[] = [
  "Brand",
  "Contenuto",
  "Generazione",
  "Review",
  "Build",
  "Pronto",
];

export interface SandboxEvent {
  type: "log" | "done" | "fatal";
  msg?: string;
  logType?: LogType;
  script?: string;
}
