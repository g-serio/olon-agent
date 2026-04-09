import type { DsJsonSchema } from "@/types";

export interface ResolvedDesignTokens {
  name?: string;
  version?: string;
  colors: Record<string, string>;
  typography: Record<string, unknown>;
  borderRadius: Record<string, string>;
  spacing: Record<string, string>;
  zIndex: Record<string, string>;
  modes: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function toStringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce<Record<string, string>>((acc, [key, entry]) => {
    if (typeof entry === "string") {
      acc[key] = entry;
      return acc;
    }

    if (isRecord(entry) && typeof entry.default === "string") {
      acc[key] = entry.default;
    }

    return acc;
  }, {});
}

function firstNonEmptyStringMap(...sources: unknown[]): Record<string, string> {
  for (const source of sources) {
    const mapped = toStringMap(source);
    if (Object.keys(mapped).length > 0) return mapped;
  }
  return {};
}

function firstNonEmptyRecord(...sources: unknown[]): Record<string, unknown> {
  for (const source of sources) {
    if (isRecord(source) && Object.keys(source).length > 0) return source;
  }
  return {};
}

export function resolveDesignTokens(dsJson: DsJsonSchema | null): ResolvedDesignTokens | null {
  if (!dsJson) return null;

  const rootTokens = pickObject(dsJson.tokens);
  const firstExample = Array.isArray(dsJson.examples) && isRecord(dsJson.examples[0]) ? dsJson.examples[0] : {};
  const exampleTokens = pickObject(firstExample.tokens);
  const schemaTokenProperties = pickObject(dsJson.properties?.tokens?.properties);

  const resolvedName =
    (typeof dsJson.name === "string" && dsJson.name) ||
    (typeof firstExample.name === "string" && firstExample.name) ||
    (typeof dsJson.properties?.name?.default === "string" && dsJson.properties?.name?.default) ||
    undefined;

  const resolvedVersion =
    (typeof dsJson.version === "string" && dsJson.version) ||
    (typeof firstExample.version === "string" && firstExample.version) ||
    (typeof dsJson.properties?.version?.default === "string" && dsJson.properties?.version?.default) ||
    undefined;

  return {
    name: resolvedName,
    version: resolvedVersion,
    colors: firstNonEmptyStringMap(rootTokens.colors, exampleTokens.colors, schemaTokenProperties.colors),
    typography: firstNonEmptyRecord(rootTokens.typography, exampleTokens.typography, schemaTokenProperties.typography),
    borderRadius: firstNonEmptyStringMap(rootTokens.borderRadius, exampleTokens.borderRadius, schemaTokenProperties.borderRadius),
    spacing: firstNonEmptyStringMap(rootTokens.spacing, exampleTokens.spacing, schemaTokenProperties.spacing),
    zIndex: firstNonEmptyStringMap(rootTokens.zIndex, exampleTokens.zIndex, schemaTokenProperties.zIndex),
    modes: firstNonEmptyRecord(rootTokens.modes, exampleTokens.modes, schemaTokenProperties.modes),
  };
}
