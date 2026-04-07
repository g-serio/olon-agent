export interface ColorProperty {
  type: string;
  default?: string;
  description?: string;
}

export interface DsJsonSchema {
  properties?: {
    tokens?: {
      properties?: {
        colors?: { properties?: Record<string, ColorProperty> };
        typography?: {
          properties?: {
            fontFamily?: { properties?: Record<string, ColorProperty> };
          };
        };
      };
    };
  };
}

export interface SvgAsset {
  name: string;
  content: string;
}

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
  script?: string;  // final install_npm.jpcore.sh content
}
