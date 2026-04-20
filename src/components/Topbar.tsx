"use client";

import React from "react";
import { Check } from "lucide-react";

import { ModelsDialog } from "@/components/ModelsDialog";
import { OlonMark } from "@/components/ui/logo/OlonMark";
import { cn } from "@/lib/utils";
import { STEP_LABELS, type PipelineStep } from "@/types";
import type { AgentModelConfig, ProviderAvailability } from "@/types";

/**
 * Topbar — workflow chrome.
 *
 * Mounts ONLY when the user is inside the workflow (workspaceOpen=true).
 * Never renders on the BrandPage.
 *
 * Layout:
 *   [ wordmark ]   [ — inline step indicator — ]   [ Models ▾ ] [ status ]
 *
 * Design rules:
 *   • Single horizontal bar, fixed height (h-12 = 48px) so it doesn't
 *     eat the fold.
 *   • Light surface, subtle bottom border, no shadow.
 *   • Step indicator collapses to dots+labels on md+, dots-only on sm.
 *   • Wordmark is the same mark as on BrandPage but smaller — visual
 *     continuity from entry → workflow.
 */

const STEP_LABELS_EN: string[] = [
  "Theme & Assets",
  "Content",
  "Generating",
  "Review",
  "Build",
  "Done",
];

interface TopbarProps {
  step: PipelineStep;
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  onAgentChange: (agent: "agent1" | "agent2", next: AgentModelConfig) => void;
  /** Optional — if provided, renders an "Exit" affordance on the wordmark. */
  onExit?: () => void;
}

export function Topbar({
  step,
  providerAvailability,
  providerSetupLoaded,
  agent1Config,
  agent2Config,
  onAgentChange,
  onExit,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-12 w-full border-b border-border bg-background/95 backdrop-blur",
        "flex items-center justify-between gap-4 px-4 md:px-6",
      )}
      role="banner"
    >
      <Wordmark onClick={onExit} />

      <InlineStepBar step={step} />

      <div className="flex shrink-0 items-center gap-2">
        <ModelsDialog
          providerAvailability={providerAvailability}
          providerSetupLoaded={providerSetupLoaded}
          agent1Config={agent1Config}
          agent2Config={agent2Config}
          onAgentChange={onAgentChange}
        />
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Wordmark — compact version of the BrandPage mark.
   When `onClick` is provided, becomes a button that returns to the
   brand page. Tooltip-style hint via title attribute.
   ────────────────────────────────────────────────────────────────── */

function Wordmark({ onClick }: { onClick?: () => void }) {
  /* Mark only — no text. Per product owner the brand identity is the
     OlonMark glyph; written "OlonAgent" is reserved for prose contexts
     (metadata, docs), not on-screen UI. */
  const content = <OlonMark size={22} />;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Back to start"
        aria-label="Back to start"
        className="shrink-0 rounded-sm outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {content}
      </button>
    );
  }

  return <div className="shrink-0">{content}</div>;
}

/* ──────────────────────────────────────────────────────────────────────
   InlineStepBar — horizontal, dense, lives inside the topbar height.
   Built fresh in Tailwind; the legacy <StepBar /> component is left
   alone (it still uses bespoke .stepbar CSS classes from globals.legacy).
   ────────────────────────────────────────────────────────────────── */

function InlineStepBar({ step }: { step: PipelineStep }) {
  return (
    <nav
      aria-label="Workflow progress"
      className="hidden min-w-0 flex-1 items-center justify-center md:flex"
    >
      <ol className="flex items-center gap-1.5">
        {STEP_LABELS_EN.map((label, i) => {
          const isActive = i === step;
          const isDone = i < step;
          const isLast = i === STEP_LABELS_EN.length - 1;

          return (
            <li key={i} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors",
                  isActive && "bg-primary/10",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border text-[10px] font-medium",
                    isActive &&
                      "border-primary bg-primary text-primary-foreground",
                    isDone &&
                      "border-primary/40 bg-primary/15 text-primary",
                    !isActive &&
                      !isDone &&
                      "border-border bg-card text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {isDone ? (
                    <Check className="size-2.5" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive && "text-foreground",
                    isDone && "text-muted-foreground",
                    !isActive && !isDone && "text-muted-foreground/70",
                  )}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <span
                  className={cn(
                    "h-px w-3 shrink-0",
                    isDone ? "bg-primary/40" : "bg-border",
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
