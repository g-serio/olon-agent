import { NextResponse } from "next/server";
import { FALLBACK_FONT_CATALOG } from "@/lib/google-fonts";

export const runtime = "nodejs";

let cachedFonts: typeof FALLBACK_FONT_CATALOG | null = null;
let cachedAt = 0;

function normalizeGoogleFontsPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return FALLBACK_FONT_CATALOG;

  const list = (payload as { familyMetadataList?: unknown[] }).familyMetadataList;
  if (!Array.isArray(list)) return FALLBACK_FONT_CATALOG;

  const mapped = list
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const rec = entry as Record<string, unknown>;
      const family = typeof rec.family === "string" ? rec.family : "";
      const category = typeof rec.category === "string" ? rec.category : "sans-serif";
      const lastModified = typeof rec.lastModified === "string" ? rec.lastModified : undefined;
      if (!family) return null;
      return { family, category, lastModified };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.family.localeCompare(b.family));

  return mapped.length > 0 ? mapped : FALLBACK_FONT_CATALOG;
}

export async function GET() {
  const now = Date.now();
  if (cachedFonts && now - cachedAt < 1000 * 60 * 60 * 6) {
    return NextResponse.json({ fonts: cachedFonts, cached: true });
  }

  try {
    const res = await fetch("https://fonts.google.com/metadata/fonts", {
      headers: {
        "User-Agent": "olon-agent-font-picker",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Google Fonts metadata ${res.status}`);
    }

    const raw = await res.text();
    const jsonText = raw.replace(/^\)\]\}'\s*/, "");
    const payload = JSON.parse(jsonText) as unknown;
    cachedFonts = normalizeGoogleFontsPayload(payload);
    cachedAt = now;

    return NextResponse.json({ fonts: cachedFonts, cached: false });
  } catch {
    cachedFonts = FALLBACK_FONT_CATALOG;
    cachedAt = now;
    return NextResponse.json({ fonts: cachedFonts, cached: false, fallback: true });
  }
}
