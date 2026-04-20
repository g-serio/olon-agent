"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Pencil, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ContentMode } from "@/types";

/**
 * ContentStep — "Content & target" step (PipelineStep = 1).
 *
 * Same chrome shape as BrandStep:
 *   • Sticky header (title + inline description)
 *   • Scrollable body (single column, narrow — this step is focused)
 *   • Sticky footer (Back / Run Agent 1)
 *
 * Layout intent: this step is much shorter than Theme & Assets, so we
 * deliberately do NOT use the 2-column [main + aside] grid. A single
 * narrow column reads as a focused decision screen, which matches what
 * the user is doing here: pick a strategy, then either describe the
 * domain or paste the content. No need for a side panel of guidance.
 *
 * English wording only.
 */

interface ContentStepProps {
  contentMode: ContentMode;
  domain: string;
  userContent: string;
  onContentModeChange: (mode: ContentMode) => void;
  onDomainChange: (value: string) => void;
  onUserContentChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContentStep({
  contentMode,
  domain,
  userContent,
  onContentModeChange,
  onDomainChange,
  onUserContentChange,
  onBack,
  onNext,
}: ContentStepProps) {
  const canProceed =
    contentMode === "provide"
      ? userContent.trim().length > 0
      : domain.trim().length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* ── Sticky header ─────────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur",
          "px-6 py-4 lg:px-10",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground lg:text-[24px]">
            Content &amp; target.
          </h1>
          <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
            Tell the agent what to build for. Pick a strategy, then describe
            the domain or paste the actual content.
          </p>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[820px] space-y-6 px-6 py-8 lg:py-10">
          <StrategySection
            contentMode={contentMode}
            onContentModeChange={onContentModeChange}
          />

          {contentMode === "generate" ? (
            <DomainSection domain={domain} onDomainChange={onDomainChange} />
          ) : (
            <ContentSection
              userContent={userContent}
              onUserContentChange={onUserContentChange}
            />
          )}
        </div>
      </div>

      {/* ── Sticky footer ─────────────────────────────────────── */}
      <footer
        className={cn(
          "sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur",
          "px-6 py-3 lg:px-10",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {contentMode === "generate"
                  ? "Describe the domain to continue"
                  : "Paste content to continue"}
              </span>
            )}
            <Button onClick={onNext} disabled={!canProceed} size="lg">
              <span>Run Agent 1</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Strategy — two radio cards.

   Hand-built (not shadcn RadioGroup) so the cards can carry icon +
   title + description in a single click target. Behaviour matches a
   radiogroup: arrow keys would be nice but the screen reader still
   gets `role=radio` semantics from the buttons.
   ════════════════════════════════════════════════════════════════════ */

function StrategySection({
  contentMode,
  onContentModeChange,
}: {
  contentMode: ContentMode;
  onContentModeChange: (mode: ContentMode) => void;
}) {
  return (
    <SectionCard
      title="Content strategy"
      description="Choose how the agent gets the words. You can change strategy any time before running."
    >
      <div role="radiogroup" aria-label="Content strategy" className="grid gap-3 sm:grid-cols-2">
        <StrategyCard
          selected={contentMode === "generate"}
          onSelect={() => onContentModeChange("generate")}
          icon={<Sparkles className="size-4" aria-hidden="true" />}
          title="Auto-generate"
          description="The agent drafts copy, structure and data JSON from the domain you describe."
        />
        <StrategyCard
          selected={contentMode === "provide"}
          onSelect={() => onContentModeChange("provide")}
          icon={<Pencil className="size-4" aria-hidden="true" />}
          title="Provide content"
          description="Paste your own copy or structured input. The agent integrates it as-is."
        />
      </div>
    </SectionCard>
  );
}

function StrategyCard({
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border p-4 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected
          ? "border-primary/60 bg-primary/[0.04] shadow-[0_0_0_1px_var(--primary)] ring-1 ring-primary/40"
          : "border-border bg-card hover:border-border-strong hover:bg-elevated/50",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md",
            selected
              ? "bg-primary/10 text-primary"
              : "bg-elevated text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span
          aria-hidden="true"
          className={cn(
            "ml-auto inline-flex size-4 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong bg-card",
          )}
        >
          {selected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
        </span>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{description}</p>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Domain section (auto-generate mode)
   ════════════════════════════════════════════════════════════════════ */

function DomainSection({
  domain,
  onDomainChange,
}: {
  domain: string;
  onDomainChange: (value: string) => void;
}) {
  return (
    <SectionCard
      title="Domain"
      description="One line describing what the tenant is for. The agent uses this as the brief for every section it drafts."
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-domain">Domain or brand description</Label>
        <input
          id="content-domain"
          type="text"
          value={domain}
          onChange={(e) => onDomainChange(e.target.value)}
          placeholder="e.g. SaaS for distributed product teams · modern, minimal"
          className={cn(
            "h-10 rounded-md border border-input bg-background px-3 text-sm",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        />
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════
   Content section (provide mode)
   ════════════════════════════════════════════════════════════════════ */

function ContentSection({
  userContent,
  onUserContentChange,
}: {
  userContent: string;
  onUserContentChange: (value: string) => void;
}) {
  return (
    <SectionCard
      title="Your content"
      description="Free text, JSON or a structured outline. The agent treats it as canonical and won't paraphrase it."
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-body">Content</Label>
        <textarea
          id="content-body"
          rows={10}
          value={userContent}
          onChange={(e) => onUserContentChange(e.target.value)}
          placeholder={
            "Brand name: ...\nTagline: ...\nSections: hero, features, cta\nHero title: ...\nHero subtitle: ...\nFeature 1: ..."
          }
          className={cn(
            "min-h-[220px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-mono leading-relaxed",
            "placeholder:font-sans placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        />
      </div>
    </SectionCard>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SectionCard — local primitive shared with BrandStep visual language
   ════════════════════════════════════════════════════════════════════ */

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="pb-4">
        <h2 className="text-base font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-[68ch] text-sm leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
