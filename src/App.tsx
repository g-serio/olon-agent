"use client";

import React, { useState } from "react";

import { BrandPage } from "@/components/BrandPage";
import { WorkflowShell } from "@/components/WorkflowShell";
import { BrandStep } from "@/components/steps/BrandStep";
import { ContentStep } from "@/components/steps/ContentStep";
import { GeneratingStep } from "@/components/steps/GeneratingStep";
import { ReviewStep } from "@/components/steps/ReviewStep";
import { DoneStep } from "@/components/steps/DoneStep";
import { usePipeline } from "@/hooks/usePipeline";

/**
 * App — top-level router for OlonAgent.
 *
 * Three responsibilities, in this order:
 *   1. Decide whether the user is still on the entry screen (BrandPage)
 *      or already inside the workflow (WorkflowShell + step).
 *   2. When inside the workflow, render the correct step body for the
 *      current PipelineStep.
 *   3. Hand the step its slice of pipeline state and callbacks.
 *
 * The chrome (wordmark, step indicator, Models dialog) is intentionally
 * NOT rendered on BrandPage — that screen owns its own minimal layout.
 *
 * History note: an earlier version mounted a single global header on
 * every screen including the landing. The product owner explicitly
 * rejected that — the entry screen must read as a brand page (mark +
 * hero in fold), not a tool screen with a topbar. See ADR-002.
 */
export default function App() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const {
    state,
    set,
    logRef,
    streamRef,
    handleDsUpload,
    handleSvgUpload,
    removeSvg,
    runAgent1,
    runAgent2,
    downloadAgent1Script,
    copyScript,
    downloadFinalScript,
    goBack,
    goToStep,
    restart,
  } = usePipeline();

  // Pipeline entry: brand page only. No chrome.
  if (!workspaceOpen) {
    return (
      <BrandPage
        providerAvailability={state.providerAvailability}
        providerSetupLoaded={state.providerSetupLoaded}
        onStart={() => setWorkspaceOpen(true)}
      />
    );
  }

  // Inside the workflow: chrome + step body.
  return (
    <WorkflowShell
      step={state.step}
      providerAvailability={state.providerAvailability}
      providerSetupLoaded={state.providerSetupLoaded}
      agent1Config={state.agent1Config}
      agent2Config={state.agent2Config}
      onAgentChange={(agent, next) =>
        set(agent === "agent1" ? "agent1Config" : "agent2Config", next)
      }
      onExit={() => setWorkspaceOpen(false)}
    >
      <StepBody
        state={state}
        set={set}
        logRef={logRef}
        streamRef={streamRef}
        handleDsUpload={handleDsUpload}
        handleSvgUpload={handleSvgUpload}
        removeSvg={removeSvg}
        runAgent1={runAgent1}
        runAgent2={runAgent2}
        downloadAgent1Script={downloadAgent1Script}
        copyScript={copyScript}
        downloadFinalScript={downloadFinalScript}
        goBack={goBack}
        goToStep={goToStep}
        restart={restart}
        onExit={() => setWorkspaceOpen(false)}
      />
    </WorkflowShell>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   StepBody — pure step-id → component switch.
   Extracted so App stays a thin entry/router and the step matrix lives
   in one obvious place.
   ────────────────────────────────────────────────────────────────── */

type Pipeline = ReturnType<typeof usePipeline>;

interface StepBodyProps extends Omit<Pipeline, "state" | "set"> {
  state: Pipeline["state"];
  set: Pipeline["set"];
  onExit: () => void;
}

function StepBody({
  state,
  set,
  logRef,
  streamRef,
  handleDsUpload,
  handleSvgUpload,
  removeSvg,
  runAgent1,
  runAgent2,
  downloadAgent1Script,
  copyScript,
  downloadFinalScript,
  goBack,
  goToStep,
  restart,
  onExit,
}: StepBodyProps) {
  const progressPct = (() => {
    if (!state.isWorking) return 100;
    const targets: Record<number, number> = { 2: 50000, 4: 5000 };
    const target = targets[state.step] ?? 20000;
    return Math.min(
      92,
      8 + Math.floor((state.streamText.length / target) * 84),
    );
  })();

  if (state.step === 0) {
    return (
      <BrandStep
        dsJson={state.dsJson}
        dsFileName={state.dsFileName}
        svgAssets={state.svgAssets}
        providerSetupLoaded={state.providerSetupLoaded}
        typographyContract={state.typographyContract}
        llmReady={state.llmReady}
        onDsUpload={handleDsUpload}
        onSvgUpload={handleSvgUpload}
        onRemoveSvg={removeSvg}
        onTypographyContractChange={(value) =>
          set("typographyContract", value)
        }
        onBack={onExit}
        onNext={() => set("step", 1)}
      />
    );
  }

  if (state.step === 1) {
    return (
      <ContentStep
        contentMode={state.contentMode}
        domain={state.domain}
        userContent={state.userContent}
        onContentModeChange={(mode) => set("contentMode", mode)}
        onDomainChange={(value) => set("domain", value)}
        onUserContentChange={(value) => set("userContent", value)}
        onBack={goBack}
        onNext={runAgent1}
      />
    );
  }

  if (state.step === 2 || state.step === 4) {
    return (
      <GeneratingStep
        agentLabel={state.agentLabel}
        logs={state.logs}
        streamText={state.streamText}
        isWorking={state.isWorking}
        logRef={logRef}
        streamRef={streamRef}
        progressPct={progressPct}
        onBack={() => goToStep(state.step === 2 ? 1 : 3)}
      />
    );
  }

  if (state.step === 3) {
    return (
      <ReviewStep
        script={state.agent1Script}
        tenantName={state.tenantName}
        onTenantNameChange={(value) => set("tenantName", value)}
        onBack={() => goToStep(1)}
        onDownload={downloadAgent1Script}
        onProceed={runAgent2}
        copied={state.copied}
        onCopy={copyScript}
      />
    );
  }

  if (state.step === 5) {
    return (
      <DoneStep
        deployResult={state.deployResult}
        script={state.finalScript}
        onCopy={copyScript}
        onDownload={downloadFinalScript}
        copied={state.copied}
        onBack={() => goToStep(3)}
        onRestart={() => {
          restart();
          onExit();
        }}
      />
    );
  }

  return null;
}
