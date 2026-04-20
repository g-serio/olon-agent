import { resolveDesignTokens } from "@/lib/design-system";
import type {
  DsJsonSchema,
  FontCatalogItem,
  TypographyContract,
  TypographyDirectionId,
  TypographyDirectionPreset,
  TypographyFontChoice,
} from "@/types";

export const FALLBACK_FONT_CATALOG: FontCatalogItem[] = [
  { family: "Instrument Sans", category: "sans-serif" },
  { family: "Inter", category: "sans-serif" },
  { family: "Manrope", category: "sans-serif" },
  { family: "Space Grotesk", category: "sans-serif" },
  { family: "Archivo", category: "sans-serif" },
  { family: "IBM Plex Sans", category: "sans-serif" },
  { family: "Source Serif 4", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "Fraunces", category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  { family: "Bricolage Grotesque", category: "display" },
  { family: "Playfair Display", category: "display" },
  { family: "Syne", category: "display" },
  { family: "Sora", category: "sans-serif" },
  { family: "JetBrains Mono", category: "monospace" },
  { family: "IBM Plex Mono", category: "monospace" },
  { family: "Fira Code", category: "monospace" },
  { family: "Space Mono", category: "monospace" },
];

const TYPOGRAPHY_DIRECTION_PRESETS: TypographyDirectionPreset[] = [
  {
    id: "editorial-serif",
    label: "Editorial Serif",
    summary: "Authoritative headlines, calm body, magazine voice.",
    rationale: "Best for narrative, editorial or premium tenants with an elegant cadence.",
    primary: "Source Serif 4",
    display: "Cormorant Garamond",
    mono: "IBM Plex Mono",
    wordmark: "Cormorant Garamond",
    wordmarkWeight: "600",
    wordmarkTracking: "-0.04em",
  },
  {
    id: "brand-sans",
    label: "Neutral Sans",
    summary: "Clean, contemporary, fit for brand and generalist products.",
    rationale: "Cuts complexity and keeps a very versatile baseline.",
    primary: "Manrope",
    display: "Instrument Sans",
    mono: "IBM Plex Mono",
    wordmark: "Instrument Sans",
    wordmarkWeight: "700",
    wordmarkTracking: "-0.03em",
  },
  {
    id: "tech-stack",
    label: "Tech Stack",
    summary: "Precise UI, sharp body, operational accent.",
    rationale: "Strong for software products, dashboards and more systemic narratives.",
    primary: "IBM Plex Sans",
    display: "Space Grotesk",
    mono: "JetBrains Mono",
    wordmark: "Space Grotesk",
    wordmarkWeight: "700",
    wordmarkTracking: "-0.05em",
  },
  {
    id: "luxury-contrast",
    label: "Luxury Contrast",
    summary: "High contrast between sober body and iconic display.",
    rationale: "For fashion, hospitality or luxury brand experiences.",
    primary: "Manrope",
    display: "Playfair Display",
    mono: "IBM Plex Mono",
    wordmark: "Playfair Display",
    wordmarkWeight: "700",
    wordmarkTracking: "-0.06em",
  },
  {
    id: "playful-display",
    label: "Playful Display",
    summary: "More character, creative tone, contemporary energy.",
    rationale: "Works when the brand wants a less neutral, more distinctive voice.",
    primary: "Sora",
    display: "Bricolage Grotesque",
    mono: "Space Mono",
    wordmark: "Bricolage Grotesque",
    wordmarkWeight: "700",
    wordmarkTracking: "-0.04em",
  },
];

export function fontCategoryFallback(category: string): string {
  switch (category) {
    case "serif":
      return "Georgia, \"Times New Roman\", serif";
    case "monospace":
      return "\"SFMono-Regular\", \"JetBrains Mono\", \"Fira Code\", monospace";
    case "display":
      return "Helvetica, Arial, sans-serif";
    case "handwriting":
      return "\"Segoe Script\", cursive";
    case "sans-serif":
    default:
      return "Helvetica, Arial, sans-serif";
  }
}

export function buildFontStack(family: string, category: string): string {
  return `"${family}", ${fontCategoryFallback(category)}`;
}

export function createFontChoice(font: FontCatalogItem): TypographyFontChoice {
  return {
    family: font.family,
    category: font.category,
    stack: buildFontStack(font.family, font.category),
  };
}

export function findFontByFamily(
  family: string,
  pool: FontCatalogItem[]
): FontCatalogItem | null {
  const normalizedFamily = family.trim().toLowerCase();
  if (!normalizedFamily) return null;

  return (
    pool.find((font) => font.family.trim().toLowerCase() === normalizedFamily) ?? null
  );
}

export function resolveFontChoice(
  family: string,
  pool: FontCatalogItem[]
): TypographyFontChoice | null {
  const match = findFontByFamily(family, pool);
  return match ? createFontChoice(match) : null;
}

export function filterFontCatalog(
  pool: FontCatalogItem[],
  query: string,
  limit = 12
): FontCatalogItem[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return pool.slice(0, limit);
  }

  const startsWith = pool.filter((font) =>
    font.family.toLowerCase().startsWith(normalizedQuery)
  );
  const includes = pool.filter(
    (font) =>
      !font.family.toLowerCase().startsWith(normalizedQuery) &&
      font.family.toLowerCase().includes(normalizedQuery)
  );

  return [...startsWith, ...includes].slice(0, limit);
}

function resolvePresetFont(
  family: string | undefined,
  pool: FontCatalogItem[]
): TypographyFontChoice | null {
  if (!family) return null;
  return (
    resolveFontChoice(family, pool) ??
    resolveFontChoice(family, FALLBACK_FONT_CATALOG)
  );
}

function buildPresetContract(
  preset: TypographyDirectionPreset,
  source: TypographyContract["direction"]["source"],
  pool: FontCatalogItem[]
): TypographyContract {
  return {
    direction: {
      presetId: preset.id,
      source,
    },
    fontFamily: {
      primary: resolvePresetFont(preset.primary, pool),
      display: resolvePresetFont(preset.display, pool),
      mono: resolvePresetFont(preset.mono, pool),
    },
    wordmark: {
      fontFamily: resolvePresetFont(preset.wordmark ?? preset.display, pool),
      weight: preset.wordmarkWeight ?? "700",
      tracking: preset.wordmarkTracking ?? "-0.05em",
    },
  };
}

export function getTypographyDirectionPresets(): TypographyDirectionPreset[] {
  return TYPOGRAPHY_DIRECTION_PRESETS;
}

export function getTypographyPresetById(
  presetId: TypographyDirectionId | null
): TypographyDirectionPreset | null {
  if (!presetId) return null;
  return TYPOGRAPHY_DIRECTION_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

function inferPresetIdFromTypographyText(text: string): TypographyDirectionId {
  if (text.includes("playfair") || text.includes("cormorant") || text.includes("serif")) {
    return "editorial-serif";
  }

  if (
    text.includes("mono") ||
    text.includes("plex") ||
    text.includes("grotesk") ||
    text.includes("space grotesk")
  ) {
    return "tech-stack";
  }

  if (text.includes("luxury") || text.includes("elegant") || text.includes("contrast")) {
    return "luxury-contrast";
  }

  if (text.includes("display") || text.includes("playful") || text.includes("bricolage")) {
    return "playful-display";
  }

  return "brand-sans";
}

export function suggestTypographyContract(
  dsJson: DsJsonSchema | null,
  pool: FontCatalogItem[]
): TypographyContract {
  const resolved = resolveDesignTokens(dsJson);
  const typographyText = JSON.stringify(resolved?.typography ?? {}).toLowerCase();
  const presetId = inferPresetIdFromTypographyText(typographyText);
  const preset = getTypographyPresetById(presetId);

  if (!preset) {
    return createEmptyTypographyContract();
  }

  const source = typographyText && typographyText !== "{}" ? "design-system" : "preset";
  return buildPresetContract(preset, source, pool);
}

export function applyTypographyPreset(
  presetId: TypographyDirectionId,
  currentContract: TypographyContract,
  pool: FontCatalogItem[]
): TypographyContract {
  const preset = getTypographyPresetById(presetId);
  if (!preset) return currentContract;

  return buildPresetContract(preset, "preset", pool);
}

function encodeGoogleFontFamily(family: string): string {
  return family.trim().replace(/\s+/g, "+");
}

export function buildGoogleFontsCssUrl(families: string[]): string {
  const uniqueFamilies = Array.from(
    new Set(families.map((family) => family.trim()).filter(Boolean))
  );

  if (uniqueFamilies.length === 0) return "";

  const params = uniqueFamilies
    .map((family) => `family=${encodeGoogleFontFamily(family)}:wght@400;500;600;700;800`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function selectedTypographyFamilies(contract: TypographyContract): string[] {
  return [
    contract.fontFamily.primary?.family ?? "",
    contract.fontFamily.display?.family ?? "",
    contract.fontFamily.mono?.family ?? "",
    contract.wordmark.fontFamily?.family ?? "",
  ].filter(Boolean);
}

export function createEmptyTypographyContract(): TypographyContract {
  return {
    direction: {
      presetId: null,
      source: "manual",
    },
    fontFamily: {
      primary: null,
      mono: null,
      display: null,
    },
    wordmark: {
      fontFamily: null,
      weight: "700",
      tracking: "-0.05em",
    },
  };
}
