import type { DsJsonSchema, SvgAsset, ContentMode } from "@/types";

// System prompt is loaded at runtime from /lib/agent1.prompt.txt
// See public/lib/agent1.prompt.txt

export function buildAgent1UserMessage(
  dsJson: DsJsonSchema | null,
  svgAssets: SvgAsset[],
  contentMode: ContentMode,
  domain: string,
  userContent: string
): string {
  const parts: string[] = [];

  parts.push(
    contentMode === "generate"
      ? `Business: ${domain || "Modern brand"}`
      : `Business:\n${userContent}`
  );

  if (dsJson) {
    const colors =
      (dsJson as any)?.tokens?.colors ??
      dsJson?.properties?.tokens?.properties?.colors?.properties ??
      {};

    const typography =
      (dsJson as any)?.tokens?.typography ??
      dsJson?.properties?.tokens?.properties?.typography?.properties ??
      {};

    parts.push(
      `DESIGN SYSTEM — use these tokens for theme.json:\nColors:\n${JSON.stringify(colors, null, 2)}\nTypography:\n${JSON.stringify(typography, null, 2)}`
    );
  }

  if (svgAssets.length > 0) {
    parts.push(
      `SVG ASSETS — embed inline in View.tsx components:\n${svgAssets
        .map((a) => `### ${a.name}\n${a.content}`)
        .join("\n\n")}`
    );
  }

  return parts.join("\n\n");
}