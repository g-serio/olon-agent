"use client";

import React from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LogEntry, LogType } from "@/types";

/**
 * GeneratingStep — "Agent at work" watcher (PipelineStep = 2 or 4).
 *
 * Used twice: while Agent 1 generates the build script, and while
 * Agent 2 runs that script in the sandbox. Same shape both times.
 *
 * Layout intent: this screen has no user input. The user is watching
 * the agent stream tokens. So we let the live-output pane FILL the
 * fold instead of letting the page scroll.
 *
 *   ┌─ sticky header ────────────────────────┐
 *   │ [AGENT 1] Running…   subtitle          │
 *   │ [progress bar strip]                   │
 *   ├────────────────────────────────────────┤
 *   │ Activity log    (h-40, scrolls inside) │
 *   ├────────────────────────────────────────┤
 *   │ Live output                            │
 *   │ (flex-1, scrolls inside, mono font)    │
 *   ├────────────────────────────────────────┤
 *   │ [Back]                                 │
 *   └────────────────────────────────────────┘
 *
 * Root opts INTO `h-full overflow-hidden` so neither sticky element
 * gets clipped and the live pane can use the remaining height.
 *
 * English wording only.
 */

interface GeneratingStepProps {
  agentLabel: string;
  logs: LogEntry[];
  streamText: string;
  isWorking: boolean;
  logRef: React.RefObject<HTMLDivElement>;
  streamRef: React.RefObject<HTMLDivElement>;
  progressPct: number;
  onBack: () => void;
}

export function GeneratingStep({
  agentLabel,
  logs,
  streamText,
  isWorking,
  logRef,
  streamRef,
  progressPct,
  onBack,
}: GeneratingStepProps) {
  const hasStream = streamText.length > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      {/* ── Sticky header ─────────────────────────────────────── */}
      <header
        className={cn(
          "sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur",
        )}
      >
        <div className="px-6 py-4 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-baseline gap-x-3 gap-y-1">
            <AgentBadge label={agentLabel} working={isWorking} />
            <h1 className="font-display text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground lg:text-[24px]">
              {isWorking ? "Running…" : "Done."}
            </h1>
            <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
              {isWorking
                ? "Streaming live — every token the agent produces appears below in real time."
                : "Agent run complete. The output is ready for review."}
            </p>
          </div>
        </div>
        {/* Progress strip — full-bleed under the header content */}
        <div className="h-0.5 w-full bg-border/60" aria-hidden="true">
          <div
            className={cn(
              "h-full bg-primary transition-[width] duration-500 ease-out",
              isWorking ? "opacity-100" : "opacity-60",
            )}
            style={{ width: `${Math.max(2, Math.min(100, progressPct))}%` }}
          />
        </div>
      </header>

      {/* ── Body — 2 stacked panels, the bottom one absorbs free height ── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1240px] flex-col gap-4 px-6 py-5 lg:px-10 lg:py-6">
          <LogsPanel logs={logs} cursor={isWorking} termRef={logRef} />
          <StreamPanel
            visible={hasStream}
            streamText={streamText}
            isWorking={isWorking}
            streamRef={streamRef}
          />
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
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isWorking}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back</span>
          </Button>
          {isWorking && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              You can leave this open — the run continues in the background.
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AgentBadge — small chip that shows which agent is running.
   ════════════════════════════════════════════════════════════════════ */

function AgentBadge({ label, working }: { label: string; working: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-2.5 py-1",
        "text-[10px] font-medium uppercase tracking-[0.12em] text-primary",
      )}
    >
      {working ? (
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   LogsPanel — compact activity log.

   Fixed-height, scrolls inside. Color-coded by entry type. The legacy
   `<Terminal>` component is intentionally not reused: it carries its
   own bespoke .term CSS classes that fight the Tailwind layout.
   ════════════════════════════════════════════════════════════════════ */

const LOG_TYPE_STYLES: Record<LogType, string> = {
  info: "text-muted-foreground",
  agent: "text-primary",
  success: "text-success-indicator",
  error: "text-destructive-foreground",
};

function LogsPanel({
  logs,
  cursor,
  termRef,
}: {
  logs: LogEntry[];
  cursor: boolean;
  termRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <section className="shrink-0 rounded-lg border border-border bg-card">
      <PanelHeader title="Activity log" right={`${logs.length} events`} />
      <div
        ref={termRef}
        className={cn(
          "h-32 overflow-y-auto px-3.5 py-3 font-mono text-[12px] leading-[1.5]",
          /* Subtle inner scroll-fade so the bottom doesn't look clipped */
          "[mask-image:linear-gradient(to_bottom,black_0,black_calc(100%-12px),transparent_100%)]",
        )}
      >
        {logs.length === 0 ? (
          <span className="text-muted-foreground/60">Waiting for the first event…</span>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground/50" aria-hidden="true">
                ›
              </span>
              <span className={cn("min-w-0 break-words", LOG_TYPE_STYLES[entry.type])}>
                {entry.msg}
              </span>
            </div>
          ))
        )}
        {cursor && (
          <span
            className="ml-1 inline-block size-2 translate-y-0.5 animate-pulse bg-primary"
            aria-hidden="true"
          />
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   StreamPanel — live token stream, fills the remaining fold.
   ════════════════════════════════════════════════════════════════════ */

function StreamPanel({
  visible,
  streamText,
  isWorking,
  streamRef,
}: {
  visible: boolean;
  streamText: string;
  isWorking: boolean;
  streamRef: React.RefObject<HTMLDivElement>;
}) {
  if (!visible) {
    return (
      <section className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        {isWorking ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Awaiting first tokens…
          </span>
        ) : (
          <span>No output produced.</span>
        )}
      </section>
    );
  }

  const sizeKb = (streamText.length / 1024).toFixed(1);

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card">
      <PanelHeader title="Live output" right={`${sizeKb} KB`} />
      <div
        ref={streamRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-4 py-3",
          "font-mono text-[12.5px] leading-[1.55] text-foreground",
        )}
      >
        <pre className="whitespace-pre-wrap break-words">{streamText}</pre>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PanelHeader — shared chrome for the two body sections.
   ════════════════════════════════════════════════════════════════════ */

function PanelHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-baseline justify-between border-b border-border/70 px-3.5 py-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </span>
      {right && (
        <span className="font-mono text-[11px] text-muted-foreground/80">{right}</span>
      )}
    </header>
  );
}
