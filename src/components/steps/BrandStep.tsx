"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileJson,
  ImagePlus,
  Sparkles,
  X,
} from "lucide-react";

import { FontPicker } from "@/components/FontPicker";
import { TokenPreview } from "@/components/TokenPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  applyTypographyPreset,
  buildFontStack,
  buildGoogleFontsCssUrl,
  FALLBACK_FONT_CATALOG,
  findFontByFamily,
  getTypographyDirectionPresets,
  getTypographyPresetById,
  resolveFontChoice,
  selectedTypographyFamilies,
  suggestTypographyContract,
} from "@/lib/google-fonts";
import { cn } from "@/lib/utils";
import type {
  DsJsonSchema,
  FontCatalogItem,
  SvgAsset,
  TypographyContract,
} from "@/types";

/**
 * BrandStep — "Theme & Assets" step (PipelineStep = 0).
 *
 * Layout contract (ratified by product owner, post first iteration):
 *   • Sticky header — context (eyebrow + title + subtitle) on the left,
 *     environment status pill on the right. Stays anchored as user
 *     scrolls; never eaten by the form.
 *   • Scrollable body — single max-w container with a 2-column grid on
 *     lg+ (form on the left, focus/progress aside on the right). On
 *     md- the aside drops below the form.
 *   • Sticky footer — Back / Continue. Always reachable. The earlier
 *     iteration relied on viewport-height tricks and the buttons got
 *     clipped — this footer pattern guarantees they don't.
 *   • Models card removed from the body — agent routing is now a global
 *     concern owned by the Topbar dialog (see ModelsDialog).
 *   • "Behavior" policy card removed — that copy belonged in docs, not
 *     in a per-tenant setup form.
 *   • Brief/focus panel on the right is short, no editorial filler;
 *     it's a working aid (progress + one-line guidance), not prose.
 *
 * Scroll contract:
 *   The root opts INTO `h-full overflow-hidden` so the sticky header
 *   and footer are anchored against the WorkflowShell's main region.
 *   The middle <div> is the actual scroll container. See
 *   WorkflowShell.tsx for the matching shell-side contract.
 *
 * Wording:
 *   English only. No legacy Italian copy survives this file.
 */

interface BrandStepProps {
  dsJson: DsJsonSchema | null;
  dsFileName: string;
  svgAssets: SvgAsset[];
  /** True once we've finished probing env for provider keys. Drives the
      footer disabled-state copy. */
  providerSetupLoaded: boolean;
  typographyContract: TypographyContract;
  /** True when at least one provider has a usable key. Required to
      proceed to the Content step. */
  llmReady: boolean;
  onDsUpload: (file: File) => void;
  onSvgUpload: (file: File) => void;
  onRemoveSvg: (name: string) => void;
  onTypographyContractChange: (value: TypographyContract) => void;
  onBack: () => void;
  onNext: () => void;
}

export function BrandStep({
  dsJson,
  dsFileName,
  svgAssets,
  providerSetupLoaded,
  typographyContract,
  llmReady,
  onDsUpload,
  onSvgUpload,
  onRemoveSvg,
  onTypographyContractChange,
  onBack,
  onNext,
}: BrandStepProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [fontCatalog, setFontCatalog] = useState<FontCatalogItem[]>(FALLBACK_FONT_CATALOG);

  const presets = useMemo(() => getTypographyDirectionPresets(), []);

  /* For each preset, resolve the real CSS font-family stack of its
     primary and display families, looked up against the live catalog.
     Lets each preset card render its OWN name in display and its OWN
     summary in primary — turning every card into a visual sample of
     the pairing it offers. */
  const presetSamples = useMemo(() => {
    const map: Record<string, { primaryStack: string; displayStack: string }> = {};
    for (const preset of presets) {
      const primaryFont = findFontByFamily(preset.primary, fontCatalog);
      const displayFont = findFontByFamily(preset.display, fontCatalog);
      map[preset.id] = {
        primaryStack: buildFontStack(
          preset.primary,
          primaryFont?.category ?? "sans-serif",
        ),
        displayStack: buildFontStack(
          preset.display,
          displayFont?.category ?? "sans-serif",
        ),
      };
    }
    return map;
  }, [presets, fontCatalog]);

  /* Unique list of every family any preset card needs to render itself.
     Precomputed once so we can mount a single <link> tag for the whole
     direction grid instead of one per card. */
  const presetFamilies = useMemo(() => {
    const set = new Set<string>();
    for (const preset of presets) {
      set.add(preset.primary);
      set.add(preset.display);
    }
    return Array.from(set);
  }, [presets]);

  const monoFonts = useMemo(
    () => fontCatalog.filter((font) => font.category === "monospace"),
    [fontCatalog],
  );
  const selectedFamilies = useMemo(
    () => selectedTypographyFamilies(typographyContract),
    [typographyContract],
  );
  const previewHref = useMemo(
    () => buildGoogleFontsCssUrl(selectedFamilies),
    [selectedFamilies],
  );
  const activePreset = useMemo(
    () => getTypographyPresetById(typographyContract.direction.presetId),
    [typographyContract.direction.presetId],
  );

  /* Hydrate the live Google Fonts catalog. The fallback list keeps the
     UI useful when the API is offline or rate-limited. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/google-fonts")
      .then((res) => res.json())
      .then((payload: { fonts?: FontCatalogItem[] }) => {
        if (cancelled) return;
        if (Array.isArray(payload.fonts) && payload.fonts.length > 0) {
          setFontCatalog(payload.fonts);
        }
      })
      .catch(() => {
        if (!cancelled) setFontCatalog(FALLBACK_FONT_CATALOG);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Auto-suggest a contract from the DS JSON ONLY if the user hasn't
     already picked anything. Never overwrites manual choices. */
  useEffect(() => {
    if (selectedFamilies.length > 0 || !dsJson) return;
    onTypographyContractChange(suggestTypographyContract(dsJson, fontCatalog));
  }, [dsJson, fontCatalog, onTypographyContractChange, selectedFamilies.length]);

  /* Precache every family used by any preset card so the direction grid
     can render each card's name/summary in its own real font BEFORE the
     user clicks. Single <link> tag, ~10 families total. */
  useEffect(() => {
    const linkId = "google-fonts-preview-presets";
    const href = buildGoogleFontsCssUrl(presetFamilies);
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!href) {
      existing?.remove();
      return;
    }
    if (existing) {
      existing.href = href;
      return;
    }
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => {
      if (document.getElementById(linkId) === link) {
        link.remove();
      }
    };
  }, [presetFamilies]);

  /* Mount a single <link rel="stylesheet"> with the user's chosen
     families so the previews use real glyphs, not fallback metrics. */
  useEffect(() => {
    const linkId = "google-fonts-preview-contract";
    const existing = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!previewHref) {
      existing?.remove();
      return;
    }
    if (existing) {
      existing.href = previewHref;
      return;
    }
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = previewHref;
    document.head.appendChild(link);
    return () => {
      if (document.getElementById(linkId) === link) {
        link.remove();
      }
    };
  }, [previewHref]);

  const patchDirectionSource = useCallback(
    (source: TypographyContract["direction"]["source"]): TypographyContract["direction"] => ({
      presetId: typographyContract.direction.presetId,
      source,
    }),
    [typographyContract.direction.presetId],
  );

  const commitFontFamily = useCallback(
    (field: "primary" | "display" | "mono" | "wordmark", font: FontCatalogItem) => {
      const resolved = resolveFontChoice(font.family, [font]);
      if (!resolved) return;
      const nextSource = typographyContract.direction.presetId ? "mixed" : "manual";

      if (field === "wordmark") {
        onTypographyContractChange({
          ...typographyContract,
          direction: patchDirectionSource(nextSource),
          wordmark: { ...typographyContract.wordmark, fontFamily: resolved },
        });
        return;
      }

      onTypographyContractChange({
        ...typographyContract,
        direction: patchDirectionSource(nextSource),
        fontFamily: { ...typographyContract.fontFamily, [field]: resolved },
      });
    },
    [onTypographyContractChange, patchDirectionSource, typographyContract],
  );

  const updateWordmarkField = useCallback(
    (field: "weight" | "tracking", value: string) => {
      onTypographyContractChange({
        ...typographyContract,
        direction: patchDirectionSource(
          typographyContract.direction.presetId ? "mixed" : "manual",
        ),
        wordmark: { ...typographyContract.wordmark, [field]: value },
      });
    },
    [onTypographyContractChange, patchDirectionSource, typographyContract],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* ── Sticky header ─────────────────────────────────────── */}
      <StepHeader />

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:py-10">
          <div className="min-w-0 space-y-6">
            {/* Side-by-side on md+ — both are short (one dropzone + a
                small results region), so stacking them was wasting
                vertical space the typography section actually needs. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DesignSystemSection
                dsJson={dsJson}
                dsFileName={dsFileName}
                onDsUpload={onDsUpload}
              />

              <BrandAssetsSection
                svgAssets={svgAssets}
                onSvgUpload={onSvgUpload}
                onRemoveSvg={onRemoveSvg}
              />
            </div>

            <TypographySection
              presets={presets}
              presetSamples={presetSamples}
              fontCatalog={fontCatalog}
              monoFonts={monoFonts}
              typographyContract={typographyContract}
              activePresetLabel={activePreset?.label ?? null}
              advancedOpen={advancedOpen}
              onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
              onApplyPreset={(presetId) =>
                onTypographyContractChange(
                  applyTypographyPreset(presetId, typographyContract, fontCatalog),
                )
              }
              onCommitFontFamily={commitFontFamily}
              onUpdateWordmarkField={updateWordmarkField}
            />
          </div>

          <FocusAside
            dsLoaded={Boolean(dsJson)}
            svgCount={svgAssets.length}
            familiesCount={selectedFamilies.length}
            directionLabel={
              typographyContract.direction.source === "design-system"
                ? "Suggested by your design system"
                : activePreset?.label ?? null
            }
          />
        </div>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────── */}
      <StepFooter
        canProceed={llmReady && providerSetupLoaded}
        disabledHint={
          !providerSetupLoaded
            ? "Reading environment…"
            : !llmReady
              ? "Configure at least one provider — see Models in the topbar"
              : null
        }
        onBack={onBack}
        onNext={onNext}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Header — title + inline description, single line.

   Stripped down per product owner: no eyebrow ("step n of N" lives in
   the Topbar's step indicator), no env status pill (the count lives in
   the Models dialog and the Continue button surfaces blocking state).
   What's left is the absolute minimum the user needs to know which
   step they're on and what it asks of them.
   ════════════════════════════════════════════════════════════════════ */

function StepHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur",
        "px-6 py-4 lg:px-10",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1
          className={cn(
            "font-display text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground",
            "lg:text-[24px]",
          )}
        >
          Theme &amp; assets.
        </h1>
        <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
          Plug in the tenant DNA — design system, brand SVGs, typography direction.
          The agent uses these as the source of truth and won&apos;t invent alternatives.
        </p>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section: Design system JSON
   ════════════════════════════════════════════════════════════════════ */

interface DesignSystemSectionProps {
  dsJson: DsJsonSchema | null;
  dsFileName: string;
  onDsUpload: (file: File) => void;
}

function DesignSystemSection({
  dsJson,
  dsFileName,
  onDsUpload,
}: DesignSystemSectionProps) {
  return (
    <SectionCard
      title="Design system"
      description="Drop the .json that defines colors, radii, spacing and type tokens. The agent treats it as the source of truth."
    >
      <FileDropzone
        accept=".json"
        primary={
          dsFileName ? (
            <>
              <strong className="font-medium text-foreground">{dsFileName}</strong>
              <span className="ml-1 text-muted-foreground">loaded</span>
            </>
          ) : (
            <>
              Drop or <strong className="font-medium text-foreground">choose .json</strong>
            </>
          )
        }
        secondary="olon.theme.schema.json · design-system.schema.json"
        icon={<FileJson className="size-5" aria-hidden="true" />}
        onFile={(file) => {
          if (file && file.name.endsWith(".json")) onDsUpload(file);
        }}
      />

      {dsJson && <TokenPreview dsJson={dsJson} className="mt-4" />}
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section: Brand assets (SVGs)
   ════════════════════════════════════════════════════════════════════ */

interface BrandAssetsSectionProps {
  svgAssets: SvgAsset[];
  onSvgUpload: (file: File) => void;
  onRemoveSvg: (name: string) => void;
}

function BrandAssetsSection({
  svgAssets,
  onSvgUpload,
  onRemoveSvg,
}: BrandAssetsSectionProps) {
  return (
    <SectionCard
      title="Brand assets"
      description="Logos, marks, decorative SVGs the agent must reuse verbatim — never reinvent."
    >
      <FileDropzone
        accept=".svg"
        multiple
        primary={
          <span className="inline-flex items-center gap-2">
            <ImagePlus className="size-4" aria-hidden="true" />
            <strong className="font-medium text-foreground">Drop SVGs or click to add</strong>
          </span>
        }
        secondary="Multiple files supported"
        compact
        onFiles={(files) => {
          Array.from(files)
            .filter((f) => f.name.endsWith(".svg"))
            .forEach(onSvgUpload);
        }}
      />

      {svgAssets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {svgAssets.map((asset) => (
            <SvgChip key={asset.name} name={asset.name} onRemove={() => onRemoveSvg(asset.name)} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SvgChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        "group/chip inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs",
      )}
    >
      <span className="text-success-indicator" aria-hidden="true">
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span className="max-w-[180px] truncate text-foreground" title={name}>
        {name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className={cn(
          "ml-0.5 inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground/70",
          "transition-colors hover:bg-elevated hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section: Typography direction (presets + summary + previews + advanced)
   ════════════════════════════════════════════════════════════════════ */

interface TypographySectionProps {
  presets: ReturnType<typeof getTypographyDirectionPresets>;
  presetSamples: Record<string, { primaryStack: string; displayStack: string }>;
  fontCatalog: FontCatalogItem[];
  monoFonts: FontCatalogItem[];
  typographyContract: TypographyContract;
  activePresetLabel: string | null;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  onApplyPreset: (
    presetId: ReturnType<typeof getTypographyDirectionPresets>[number]["id"],
  ) => void;
  onCommitFontFamily: (
    field: "primary" | "display" | "mono" | "wordmark",
    font: FontCatalogItem,
  ) => void;
  onUpdateWordmarkField: (field: "weight" | "tracking", value: string) => void;
}

function TypographySection({
  presets,
  presetSamples,
  fontCatalog,
  monoFonts,
  typographyContract,
  advancedOpen,
  onToggleAdvanced,
  onApplyPreset,
  onCommitFontFamily,
  onUpdateWordmarkField,
}: TypographySectionProps) {
  const directionFromDS = typographyContract.direction.source === "design-system";

  return (
    <SectionCard
      title="Typography direction"
      description="Pick a curated pairing. Each card is rendered in its own pairing — name in display, summary in primary."
      headerRight={
        directionFromDS ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="size-3" aria-hidden="true" />
            Suggested by your DS
          </span>
        ) : null
      }
    >
      <div
        role="list"
        aria-label="Typography presets"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
      >
        {presets.map((preset) => {
          const selected = typographyContract.direction.presetId === preset.id;
          const sample = presetSamples[preset.id];
          return (
            <button
              type="button"
              key={preset.id}
              role="listitem"
              onClick={() => onApplyPreset(preset.id)}
              className={cn(
                "group relative flex flex-col gap-2 rounded-lg border p-3.5 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                selected
                  ? "border-primary/60 bg-primary/[0.04] shadow-[0_0_0_1px_var(--primary)] ring-1 ring-primary/40"
                  : "border-border bg-card hover:border-border-strong hover:bg-elevated/50",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                {/* Preset NAME rendered in the preset's DISPLAY font.
                    The card's heading IS the live sample of the display
                    voice — no separate "Display sample" line needed. */}
                <span
                  className="truncate text-[18px] font-medium leading-tight tracking-[-0.015em] text-foreground"
                  style={{ fontFamily: sample?.displayStack }}
                >
                  {preset.label}
                </span>
                {selected && (
                  <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {preset.primary} / {preset.display}
              </div>

              {/* Summary in PRIMARY font — body voice sample. */}
              <p
                className="text-[13px] leading-snug text-muted-foreground"
                style={{ fontFamily: sample?.primaryStack }}
              >
                {preset.summary}
              </p>
            </button>
          );
        })}
      </div>

      <AdvancedTypography
        open={advancedOpen}
        onToggle={onToggleAdvanced}
        fontCatalog={fontCatalog}
        monoFonts={monoFonts}
        typographyContract={typographyContract}
        onCommitFontFamily={onCommitFontFamily}
        onUpdateWordmarkField={onUpdateWordmarkField}
      />
    </SectionCard>
  );
}

function AdvancedTypography({
  open,
  onToggle,
  fontCatalog,
  monoFonts,
  typographyContract,
  onCommitFontFamily,
  onUpdateWordmarkField,
}: {
  open: boolean;
  onToggle: () => void;
  fontCatalog: FontCatalogItem[];
  monoFonts: FontCatalogItem[];
  typographyContract: TypographyContract;
  onCommitFontFamily: (
    field: "primary" | "display" | "mono" | "wordmark",
    font: FontCatalogItem,
  ) => void;
  onUpdateWordmarkField: (field: "weight" | "tracking", value: string) => void;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Advanced typography</span>
          <span className="text-xs text-muted-foreground">
            manual override of mono, wordmark and pairings
          </span>
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-4 border-t border-border/70 p-4 md:grid-cols-2">
          <FontPicker
            fonts={fontCatalog}
            label="Primary font"
            placeholder="Search Google Fonts"
            value={typographyContract.fontFamily.primary}
            previewText="The quick brown fox jumps over the lazy dog"
            onSelect={(font) => onCommitFontFamily("primary", font)}
          />
          <FontPicker
            fonts={fontCatalog}
            label="Display font"
            placeholder="Search Google Fonts"
            value={typographyContract.fontFamily.display}
            previewText="Display hierarchy sample"
            onSelect={(font) => onCommitFontFamily("display", font)}
          />
          <FontPicker
            fonts={monoFonts}
            label="Mono font"
            placeholder="Search monospace fonts"
            value={typographyContract.fontFamily.mono}
            previewText="NAV-01 · META · 12PX"
            onSelect={(font) => onCommitFontFamily("mono", font)}
          />
          <FontPicker
            fonts={fontCatalog}
            label="Wordmark font"
            placeholder="Search Google Fonts"
            value={typographyContract.wordmark.fontFamily}
            previewText="Brand Wordmark"
            onSelect={(font) => onCommitFontFamily("wordmark", font)}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wordmark-weight">Wordmark weight</Label>
            <select
              id="wordmark-weight"
              className={cn(
                "h-9 rounded-md border border-input bg-background px-3 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              value={typographyContract.wordmark.weight}
              onChange={(e) => onUpdateWordmarkField("weight", e.target.value)}
            >
              {["400", "500", "600", "700", "800"].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wordmark-tracking">Wordmark tracking</Label>
            <input
              id="wordmark-tracking"
              type="text"
              value={typographyContract.wordmark.tracking}
              onChange={(e) => onUpdateWordmarkField("tracking", e.target.value)}
              placeholder="-0.05em"
              className={cn(
                "h-9 rounded-md border border-input bg-background px-3 text-sm font-mono",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Aside: Focus / progress
   ════════════════════════════════════════════════════════════════════ */

interface FocusAsideProps {
  dsLoaded: boolean;
  svgCount: number;
  familiesCount: number;
  directionLabel: string | null;
}

function FocusAside({
  dsLoaded,
  svgCount,
  familiesCount,
  directionLabel,
}: FocusAsideProps) {
  /* No sticky on purpose: with the aside ancored at top-24 and the
     left column scrolling freely, the two top edges drifted out of
     alignment as the user scrolled. The Focus card is short enough
     to be read at-a-glance when the user lands on the step;
     scrolling it away with the form keeps the "row 1 = aligned"
     contract intact. */
  return (
    <aside className="mt-6 lg:mt-0 lg:self-start">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Focus
        </div>
        <h2 className="mt-1 text-base font-medium text-foreground">
          What this step locks
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Define the visual contract the generator must respect — never inventing alternative
          families or random color tokens.
        </p>

        <ul className="mt-4 space-y-2 border-t border-border/70 pt-4 text-xs">
          <ProgressItem done={dsLoaded} label="Design system loaded" />
          <ProgressItem
            done={svgCount > 0}
            label={`Brand SVGs ${svgCount > 0 ? `(${svgCount})` : "added"}`}
          />
          <ProgressItem
            done={familiesCount >= 2}
            label={`Typography (${familiesCount}/4 set)`}
          />
        </ul>

        {directionLabel && (
          <div className="mt-4 rounded-md border border-primary/20 bg-primary/[0.04] px-3 py-2 text-xs text-foreground">
            <span className="font-mono text-[10px] uppercase tracking-wide text-primary/80">
              Direction
            </span>
            <div className="mt-0.5 truncate">{directionLabel}</div>
          </div>
        )}

        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Switch agents and models from <span className="font-medium text-foreground">Models</span> in the topbar.
        </p>
      </div>
    </aside>
  );
}

function ProgressItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
          done
            ? "border-success-indicator bg-success text-success-foreground"
            : "border-border bg-card text-muted-foreground/60",
        )}
        aria-hidden="true"
      >
        {done && <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </li>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Footer
   ════════════════════════════════════════════════════════════════════ */

function StepFooter({
  canProceed,
  disabledHint,
  onBack,
  onNext,
}: {
  canProceed: boolean;
  disabledHint: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur",
        "px-6 py-3 lg:px-10",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>

        <div className="flex items-center gap-3">
          {disabledHint && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {disabledHint}
            </span>
          )}
          <Button onClick={onNext} disabled={!canProceed} size="lg">
            <span>Continue</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Section primitives — local to this step
   ════════════════════════════════════════════════════════════════════ */

interface SectionCardProps {
  title: string;
  description?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

function SectionCard({ title, description, headerRight, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4 pb-4">
        <div>
          <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-[68ch] text-sm leading-snug text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {headerRight}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FileDropzone — drag/drop file input.
   Polymorphic on `multiple`: single-file callers pass `onFile`,
   multi-file callers pass `onFiles`. Visual treatment shared.
   ════════════════════════════════════════════════════════════════════ */

interface FileDropzoneBaseProps {
  accept: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  icon?: React.ReactNode;
  compact?: boolean;
}

type FileDropzoneProps =
  | (FileDropzoneBaseProps & { multiple?: false; onFile: (file: File) => void })
  | (FileDropzoneBaseProps & { multiple: true; onFiles: (files: FileList) => void });

function FileDropzone(props: FileDropzoneProps) {
  const { accept, primary, secondary, icon, compact } = props;
  const [drag, setDrag] = useState(false);

  const dispatchFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (props.multiple) {
        props.onFiles(files);
      } else {
        props.onFile(files[0]);
      }
    },
    [props],
  );

  return (
    <label
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed transition-colors",
        compact ? "px-4 py-4" : "px-6 py-7",
        drag
          ? "border-primary/60 bg-primary/[0.04]"
          : "border-border bg-elevated/40 hover:border-border-strong hover:bg-elevated/70",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        dispatchFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={props.multiple ?? false}
        className="sr-only"
        onChange={(e) => dispatchFiles(e.target.files)}
      />
      {icon && (
        <span className="flex size-9 items-center justify-center rounded-md bg-card text-muted-foreground">
          {icon}
        </span>
      )}
      <span className="text-sm text-muted-foreground">{primary}</span>
      {secondary && (
        <span className="font-mono text-[11px] text-muted-foreground/80">{secondary}</span>
      )}
    </label>
  );
}
