import { resolveDesignTokens } from "@/lib/design-system";
import { buildGoogleFontsCssUrl, selectedTypographyFamilies } from "@/lib/google-fonts";
import type { ContentMode, DsJsonSchema, SvgAsset, TypographyContract } from "@/types";

function buildTypographyIndexCssSnippet(selectedFamilies: string[]): string {
  const url = buildGoogleFontsCssUrl(selectedFamilies);
  if (!url) return "";

  return `@import url('${url}');

/* Typography contract: import this before any other CSS rules. */`;
}

export function buildAgent1UserMessage(
  dsJson: DsJsonSchema | null,
  svgAssets: SvgAsset[],
  contentMode: ContentMode,
  domain: string,
  userContent: string,
  typographyContract: TypographyContract
): string {
  const parts: string[] = [];
  const selectedFamilies = selectedTypographyFamilies(typographyContract);

  parts.push(
    contentMode === "generate"
      ? `Business: ${domain || "Modern brand"}`
      : `Business:\n${userContent}`
  );

  if (selectedFamilies.length > 0) {
    const googleFontsUrl = buildGoogleFontsCssUrl(selectedFamilies);
    const indexCssSnippet = buildTypographyIndexCssSnippet(selectedFamilies);

    parts.push(
      `TYPOGRAPHY CONTRACT - authoritative input.
These font selections are mandatory and must be respected exactly.
Do not choose different font families.
Do not invent font family names.
Do not silently substitute similar fonts.

SCRIPT COMPLIANCE REQUIREMENTS FOR TYPOGRAPHY:
- The bash script MUST write or update \`src/index.css\`
- The FIRST LINE of \`src/index.css\` MUST be this exact import:
${indexCssSnippet}
- The bash script MUST write \`src/data/config/theme.json\`
- \`theme.json\` MUST use these exact font families in \`tokens.typography.fontFamily\`
- The generated tenant CSS and rendered typography must match the same families
- If a selected mono family exists, it must be used for the mono slot
- If a selected wordmark family exists, the rendered brand wordmark must use it
- Do not create \`src/fonts.css\`
- Do not move the Google Fonts import to another file

TYPOGRAPHY JSON:
${JSON.stringify(
  {
    typography: {
      direction: typographyContract.direction,
      fontFamily: {
        primary: typographyContract.fontFamily.primary?.stack ?? "",
        mono: typographyContract.fontFamily.mono?.stack ?? "",
        display: typographyContract.fontFamily.display?.stack ?? "",
      },
      wordmark: {
        fontFamily: typographyContract.wordmark.fontFamily?.stack ?? "",
        weight: typographyContract.wordmark.weight,
        tracking: typographyContract.wordmark.tracking,
      },
    },
  },
  null,
  2
)}

SELECTED FONT FAMILIES:
${JSON.stringify(selectedFamilies, null, 2)}

GOOGLE FONTS CSS URL:
${googleFontsUrl}

REQUIRED \`src/index.css\` TOP SNIPPET:
\`\`\`css
${indexCssSnippet}
\`\`\`

REQUIRED \`theme.json\` TYPOGRAPHY BLOCK:
\`\`\`json
${JSON.stringify(
  {
    fontFamily: {
      primary: typographyContract.fontFamily.primary?.stack ?? "",
      mono: typographyContract.fontFamily.mono?.stack ?? "",
      display: typographyContract.fontFamily.display?.stack ?? "",
    },
  },
  null,
  2
)}
\`\`\``
    );
  }

  if (dsJson) {
    const resolved = resolveDesignTokens(dsJson);

    parts.push(
      `DESIGN SYSTEM - mandatory input.
Use this uploaded JSON as a binding source for theme.json and the tenant theme bridge.

RAW DESIGN SYSTEM JSON:
${JSON.stringify(dsJson, null, 2)}

RESOLVED TOKENS:
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

export function buildAgent1PlanSystemPrompt(): string {
  return `You are the Agent 1 planning stage for an OlonJS tenant generator.

You do not write bash yet.
You produce ONLY strict JSON for a deterministic validator.

Hard constraints:
- Allowed output format: a single JSON object, no markdown fences, no prose
- Do not write bash
- Do not write code blocks
- Respect the uploaded design system and typography contract exactly
- The final implementation must not modify src/App.tsx
- The final implementation may write only src/** and index.html
- If a typography contract is present, the final implementation MUST write src/index.css and src/data/config/theme.json
- If a typography contract is present, the final implementation MUST use the exact Google Fonts URL from the user input
- Do not create src/fonts.css

Return JSON with this exact shape:
{
  "summary": "short description",
  "filesToWrite": ["src/index.css", "src/data/config/theme.json"],
  "forbiddenWrites": ["src/App.tsx", "src/fonts.css"],
  "typography": {
    "googleFontsUrl": "exact url or empty string",
    "families": ["family 1", "family 2"],
    "themeJsonFontFamily": {
      "primary": "exact stack or empty string",
      "display": "exact stack or empty string",
      "mono": "exact stack or empty string"
    },
    "wordmark": {
      "fontFamily": "exact stack or empty string",
      "weight": "string",
      "tracking": "string"
    }
  },
  "scriptContract": {
    "rawBashOnly": true,
    "startsWithShebang": true,
    "secondLine": "set -e"
  },
  "executionOutline": ["step 1", "step 2", "step 3"]
}`;
}

export function buildAgent1PlanUserMessage(baseUserMessage: string): string {
  return `${baseUserMessage}

PLANNING PHASE ONLY.
Return ONLY the strict JSON object described by the system instructions.
Do not write bash.
Do not include markdown fences.
Do not omit required keys.`;
}

export function buildAgent1ScriptUserMessage(
  baseUserMessage: string,
  validatedPlanJson: string
): string {
  return `${baseUserMessage}

VALIDATED IMPLEMENTATION PLAN - authoritative execution contract.
You must follow this plan exactly.

${validatedPlanJson}

SCRIPT GENERATION PHASE.
Return ONLY raw bash script text.
Do not include prose.
Do not include markdown fences.
The first character must be #.
The response must begin exactly with:
#!/bin/bash
set -e`;
}

export function buildAgent1RetryUserMessage(
  phase: "plan" | "script",
  issues: string[],
  previousOutput: string
): string {
  return `Previous ${phase} output failed deterministic validation.

Validation errors:
${issues.map((issue) => `- ${issue}`).join("\n")}

You must regenerate the ENTIRE ${phase === "plan" ? "JSON plan" : "bash script"} from scratch.
Do not explain what you changed.
Do not apologize.
Do not include markdown fences.

Previous invalid output:
${previousOutput}`;
}
