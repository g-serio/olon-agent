"use client";

import React, { useMemo } from "react";
import { ArrowRight } from "lucide-react";

import { OlonMark } from "@/components/ui/logo/OlonMark";
import { cn } from "@/lib/utils";
import type { ProviderAvailability } from "@/types";

/**
 * BrandPage — entry screen of OlonAgent.
 *
 * Design intent (locked, repeated three times by product owner):
 *   • One screen, in fold at 1280×800. NEVER scrolls.
 *   • Wordmark top-left only. NO topbar / NO StepBar / NO chrome.
 *   • Hero centered: eyebrow → display title → sub → [status pill] [CTA].
 *   • Light theme.
 *   • English copy only.
 *
 * Quality intent (review pass, post first iteration):
 *   • The CTA is a hand-built hero button, not the generic shadcn
 *     <Button size="lg">. Hero buttons are the most-loved element on
 *     a brand page; they need shadow, hover lift, an animated arrow,
 *     and proper presence. Generic primitive doesn't deliver that.
 *   • Title: NO <br />. Single line that wraps naturally. Display
 *     typography means tight leading (1.05) and tight tracking.
 *   • Body: ~22ch line-height for readability, real margin from title.
 *   • Action row order: [secondary status pill] then [primary CTA].
 *     Primary action sits last (right) so the eye lands on it last —
 *     standard ergonomic placement.
 */

interface BrandPageProps {
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  onStart: () => void;
}

const PROVIDER_LABELS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
] as const;

export function BrandPage({
  providerAvailability,
  providerSetupLoaded,
  onStart,
}: BrandPageProps) {
  const readyCount = useMemo(
    () => Object.values(providerAvailability).filter(Boolean).length,
    [providerAvailability],
  );

  return (
    <main
      className={cn(
        "relative h-screen w-full overflow-hidden",
        "bg-background text-foreground font-sans antialiased",
      )}
    >
      <Wordmark />

      {/* Ambient gradient orbs — single-purpose decoration. Positioned
          off-canvas so the hero stays the only focal point. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full bg-primary/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-44 -left-32 size-[420px] rounded-full bg-accent/[0.06] blur-3xl"
      />

      <div className="relative z-0 flex h-full w-full items-center justify-center px-6">
        <div className="flex w-full max-w-[680px] flex-col items-center text-center">
          <Eyebrow />

          <h1
            className={cn(
              "mt-6 font-display font-medium text-foreground",
              "text-[44px] leading-[1.05] tracking-[-0.025em]",
              "md:text-[56px]",
            )}
          >
            Generate OlonJS tenants with two agents and your models.
          </h1>

          <p
            className={cn(
              "mt-6 max-w-[44ch] text-balance text-base leading-[1.55] text-muted-foreground",
              "md:text-[15px]",
            )}
          >
            Plug in your design system and your models. Ship a tenant that
            goes from draft to real build in a single pass.
          </p>

          <div className="mt-9 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <ProviderStatusPill
              providerAvailability={providerAvailability}
              providerSetupLoaded={providerSetupLoaded}
              readyCount={readyCount}
            />
            <HeroCta onClick={onStart} />
          </div>
        </div>
      </div>

      <FooterNote />
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Wordmark — top-left corner mark.

   Per product owner: graphic mark only, NO "OlonAgent" text. The mark
   IS the brand identity. We use the same OlonMark used by JPS so the
   two products share visual continuity.
   ────────────────────────────────────────────────────────────────── */

function Wordmark() {
  return (
    <div className="absolute left-8 top-7 z-10 md:left-12 md:top-9">
      <OlonMark size={36} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Eyebrow — subtle category label above the title. Pure information,
   no LED (status moved into the dedicated pill below the title).
   ────────────────────────────────────────────────────────────── */

function Eyebrow() {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/50 px-3.5 py-1",
        "text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm",
      )}
    >
      <span className="size-1.5 rounded-full bg-primary/70" />
      Open source · OlonJS v1.6
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   HeroCta — primary action.

   Built on the same .btn-brand utility used by jsonpages-platform
   (gradient 135° primary-400 → primary-700, layered shadow incl.
   inner top highlight). Hand-tunes the size and motion on top:
     • h-12 (48px), generous horizontal padding (28/22)
     • Geist body font + tight tracking for a tactile, premium feel
     • Hover lifts -2px and the arrow nudges +2px
     • Active flattens

   Why not <Button>? The shadcn primitive is great for app chrome
   but its `default` variant is intentionally neutral. A landing
   hero CTA needs the brand gradient, not flat bg-primary.
   ────────────────────────────────────────────────────────────── */

function HeroCta({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "btn-brand group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8",
        "text-[15px] font-semibold tracking-[-0.01em]",
        "transition-[transform,box-shadow,background] duration-200 ease-out",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.985]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <span>Start a tenant</span>
      <ArrowRight
        className="size-4 -mr-0.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   ProviderStatusPill — secondary, smaller than the CTA. Sits to its
   left so the eye reads "info → action".
   ────────────────────────────────────────────────────────────── */

interface ProviderStatusPillProps {
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  readyCount: number;
}

function ProviderStatusPill({
  providerAvailability,
  providerSetupLoaded,
  readyCount,
}: ProviderStatusPillProps) {
  /* Heights match the HeroCta (h-12 = 48px) so the action row reads as
     a single, balanced unit. Visual hierarchy comes from treatment
     (subtle border + transparent bg vs CTA's filled brand color +
     shadow), not from size mismatch. */

  if (!providerSetupLoaded) {
    return (
      <span className="inline-flex h-12 items-center px-3 text-xs text-muted-foreground">
        Reading environment…
      </span>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex h-12 items-center gap-2.5 rounded-lg border border-border/70 bg-card/40 pl-3 pr-4",
        "text-xs text-muted-foreground backdrop-blur-sm",
      )}
      role="status"
      aria-label={`${readyCount} of 3 providers ready`}
    >
      <span className="flex items-center gap-1">
        {PROVIDER_LABELS.map((provider) => (
          <span
            key={provider.id}
            title={`${provider.label}: ${providerAvailability[provider.id] ? "ready" : "no key"}`}
            className={cn(
              "size-1.5 rounded-full",
              providerAvailability[provider.id]
                ? "bg-success-indicator"
                : "bg-muted-foreground/30",
            )}
          />
        ))}
      </span>
      <span className="font-mono text-[11px] font-medium text-foreground">
        {readyCount}/3
      </span>
      <span>providers ready</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   FooterNote — single low-weight line at the bottom of the viewport.
   Anchored absolute so it never pushes the hero off-fold.
   ────────────────────────────────────────────────────────────── */

function FooterNote() {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[11px] text-muted-foreground/70">
      You only pay your own API keys. The product stays free.
    </div>
  );
}
