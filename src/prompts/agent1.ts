import { resolveDesignTokens } from "@/lib/design-system";
import type { ContentMode, DsJsonSchema, SvgAsset } from "@/types";

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
    const resolved = resolveDesignTokens(dsJson);

    parts.push(
      `DESIGN SYSTEM - use these tokens for theme.json:
Brand:
${JSON.stringify({ name: resolved?.name, version: resolved?.version }, null, 2)}
Colors:
${JSON.stringify(resolved?.colors ?? {}, null, 2)}
Typography:
${JSON.stringify(resolved?.typography ?? {}, null, 2)}
BorderRadius:
${JSON.stringify(resolved?.borderRadius ?? {}, null, 2)}
Spacing:
${JSON.stringify(resolved?.spacing ?? {}, null, 2)}
ZIndex:
${JSON.stringify(resolved?.zIndex ?? {}, null, 2)}
Modes:
${JSON.stringify(resolved?.modes ?? {}, null, 2)}`
    );
  }

  if (svgAssets.length > 0) {
    parts.push(
      `SVG ASSETS - embed inline in View.tsx components:\n${svgAssets
        .map((asset) => `### ${asset.name}\n${asset.content}`)
        .join("\n\n")}`
    );
  }

  return parts.join("\n\n");
}
