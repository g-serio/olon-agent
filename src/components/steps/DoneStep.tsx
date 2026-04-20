"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Loader2,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeployResult } from "@/types";

/**
 * DoneStep — PipelineStep = 5.
 *
 * Terminal state of the workflow: Agent 2 completed in the sandbox,
 * `tsc` came back green, and the verified install script
 * (`install_npm.jpcore.sh`) is ready for the user to run locally.
 *
 * Same sticky-header / scrollable-body / sticky-footer shape as the
 * other steps. Deviation from earlier versions: we now surface the
 * `deployResult` explicitly — previously it was passed in and ignored,
 * which hid useful information about what the sandbox actually did.
 *
 * English wording only.
 */

interface DoneStepProps {
  deployResult: DeployResult | null;
  script: string;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  onBack: () => void;
  onRestart: () => void;
}

export function DoneStep({
  deployResult,
  script,
  onCopy,
  onDownload,
  copied,
  onBack,
  onRestart,
}: DoneStepProps) {
  const lines = script.split("\n").length;
  const kb = (script.length / 1024).toFixed(1);

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
          <GreenBuildBadge />
          <h1 className="font-display text-[22px] font-medium leading-[1.15] tracking-[-0.02em] text-foreground lg:text-[24px]">
            Tenant ready.
          </h1>
          <p className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
            Agent 2 finished in the sandbox and{" "}
            <code className="font-mono text-[12px]">tsc</code> came back green.
            The install script below recreates the verified{" "}
            <code className="font-mono text-[12px]">src/</code> in any OlonJS
            project.
          </p>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1080px] space-y-5 px-6 py-6 lg:px-10 lg:py-8">
          <DeployOutcome result={deployResult} />

          <StatsStrip lines={lines} kb={kb} />

          <ScriptViewer
            script={script}
            copied={copied}
            onCopy={onCopy}
            onDownload={onDownload}
          />

          <NextStepsCard />
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
            <span>Back to review</span>
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="size-4" aria-hidden="true" />
              <span>Download .sh</span>
            </Button>
            <Button onClick={onRestart} size="lg">
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>New tenant</span>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GreenBuildBadge — success chip in the header.
   ════════════════════════════════════════════════════════════════════ */

function GreenBuildBadge() {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
        "border-success-border bg-success text-success-foreground",
        "text-[10px] font-medium uppercase tracking-[0.12em]",
      )}
    >
      <CheckCircle2 className="size-3" aria-hidden="true" />
      Green build
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DeployOutcome — surfaces what the sandbox actually did.

   Three real-world shapes:
     • result === null            → no deploy attempted (older runs,
                                    or local-only mode). Hide entirely.
     • result.ok === true         → success callout, optional URL.
     • result.skipped === true    → neutral info callout.
     • result.ok === false        → warning (build was green but the
                                    deploy step failed; user can still
                                    run the script locally).
   ════════════════════════════════════════════════════════════════════ */

function DeployOutcome({ result }: { result: DeployResult | null }) {
  if (!result) return null;

  if (result.skipped) {
    return (
      <Callout
        tone="info"
        icon={<Info className="size-4" aria-hidden="true" />}
        title="Deploy skipped"
      >
        The sandbox built and verified the tenant but did not push it anywhere.
        Run the script below to install it locally.
      </Callout>
    );
  }

  if (!result.ok) {
    return (
      <Callout
        tone="warning"
        icon={<AlertTriangle className="size-4" aria-hidden="true" />}
        title="Deploy failed"
      >
        The build was green, but the optional deploy step reported an error
        {result.error ? `: ${result.error}` : "."} You can still run the script
        below to install the tenant locally.
      </Callout>
    );
  }

  /* result.ok === true — try to surface a URL if the deployer left one
     in `data`. Common keys: url, previewUrl, href. */
  const url = pickUrl(result.data);

  return (
    <Callout
      tone="success"
      icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
      title="Deployed successfully"
    >
      {url ? (
        <>
          The tenant is live at{" "}
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-success-foreground underline underline-offset-2 hover:no-underline"
          >
            {prettyHost(url)}
          </a>
          . The script below mirrors what was deployed.
        </>
      ) : (
        <>The sandbox pushed the tenant to its target. The script below mirrors what was deployed.</>
      )}
    </Callout>
  );
}

function pickUrl(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  for (const key of ["url", "previewUrl", "href", "deployUrl"]) {
    const v = data[key];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  }
  return null;
}

function prettyHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/* ════════════════════════════════════════════════════════════════════
   Callout — generic banner for the three deploy outcomes.
   ════════════════════════════════════════════════════════════════════ */

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: "success" | "info" | "warning";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: "border-success-border bg-success text-success-foreground",
    info: "border-border bg-muted text-foreground",
    warning: "border-destructive-border bg-destructive text-destructive-foreground",
  };

  return (
    <section
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3",
        toneClasses[tone],
      )}
      role={tone === "warning" ? "alert" : "status"}
    >
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-medium leading-tight">{title}</div>
        <div className="text-[13px] leading-snug opacity-90">{children}</div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   StatsStrip — lines / size / tsc green.
   ════════════════════════════════════════════════════════════════════ */

function StatsStrip({ lines, kb }: { lines: number; kb: string }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <Stat label="Lines" value={lines.toLocaleString()} />
      <Stat label="Size" value={`${kb} KB`} />
      <Stat
        label="tsc"
        value={
          <span className="inline-flex items-center gap-1.5 text-success-indicator">
            <CheckCircle2 className="size-5" aria-hidden="true" />
            <span>green</span>
          </span>
        }
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="font-display text-[20px] font-medium leading-tight tracking-[-0.015em] text-foreground">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ScriptViewer — same shape as in ReviewStep but for the verified
   install script. Kept local rather than extracted into a shared
   primitive: the two screens have subtly different chrome (file name,
   tone of the surrounding copy) and a shared component would invite
   prop sprawl before we have a third use case to justify it.
   ════════════════════════════════════════════════════════════════════ */

function ScriptViewer({
  script,
  copied,
  onCopy,
  onDownload,
}: {
  script: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const isEmpty = script.length === 0;

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border/70 px-3.5 py-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            install_npm.jpcore.sh
          </span>
          {!isEmpty && (
            <span className="font-mono text-[11px] text-muted-foreground/70">
              bash · verified
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <PanelButton
            onClick={onCopy}
            ariaLabel={copied ? "Copied" : "Copy script"}
            tone={copied ? "success" : "default"}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            <span>{copied ? "Copied" : "Copy"}</span>
          </PanelButton>
          <PanelButton onClick={onDownload} ariaLabel="Download script">
            <Download className="size-3.5" aria-hidden="true" />
            <span>.sh</span>
          </PanelButton>
        </div>
      </header>
      <div
        className={cn(
          "h-[380px] overflow-y-auto px-4 py-3",
          "font-mono text-[12.5px] leading-[1.55] text-foreground",
        )}
      >
        {isEmpty ? (
          <span className="inline-flex items-center gap-2 text-muted-foreground/70">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Awaiting script…
          </span>
        ) : (
          <pre className="whitespace-pre">{script}</pre>
        )}
      </div>
    </section>
  );
}

function PanelButton({
  children,
  onClick,
  ariaLabel,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  tone?: "default" | "success";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1",
        "text-[11px] font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        tone === "success"
          ? "text-success-indicator hover:bg-success/60"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NextStepsCard — quick "what now?" reference.

   Closes the loop: the user just produced a script, this tells them
   exactly how to use it without forcing them back to the docs.
   ════════════════════════════════════════════════════════════════════ */

function NextStepsCard() {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-foreground">Next steps</h2>
      <ol className="mt-3 space-y-2 text-[13px] leading-snug text-muted-foreground">
        <Step n={1}>
          Open the OlonJS project where you want to install the tenant.
        </Step>
        <Step n={2}>
          Run the script from the project root:
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
            bash install_npm.jpcore.sh
          </code>
        </Step>
        <Step n={3}>
          Start dev server and verify in the browser. The script does not
          modify <code className="font-mono text-[12px]">package.json</code> or
          dependencies.
        </Step>
      </ol>
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          "border border-border bg-background text-[11px] font-medium text-foreground",
        )}
        aria-hidden="true"
      >
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}
