import React from "react";
import { StepBar } from "@/components/StepBar";
import { BrandStep } from "@/components/steps/BrandStep";
import { ContentStep } from "@/components/steps/ContentStep";
import { GeneratingStep } from "@/components/steps/GeneratingStep";
import { ReviewStep } from "@/components/steps/ReviewStep";
import { DoneStep } from "@/components/steps/DoneStep";
import { usePipeline } from "@/hooks/usePipeline";

export default function App() {
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
    restart,
  } = usePipeline();

  const progressPct = (() => {
    if (!state.isWorking) return 100;
    const targets: Record<number, number> = { 2: 50000, 4: 5000 };
    const target = targets[state.step] ?? 20000;
    return Math.min(92, 8 + Math.floor((state.streamText.length / target) * 84));
  })();

  return (
    <div className="pipeline-root">
      <div className="pipeline-inner">
        <header className="hdr">
          <div className="hdr__wordmark">
            Olon<span>Agent</span>
          </div>
          <div className="hdr__sub">Site DNA Generator · OlonJS v1.5</div>
        </header>

        <StepBar step={state.step} />

        {state.step === 0 && (
          <BrandStep
            dsJson={state.dsJson}
            dsFileName={state.dsFileName}
            svgAssets={state.svgAssets}
            providerAvailability={state.providerAvailability}
            providerSetupLoaded={state.providerSetupLoaded}
            sessionApiKeys={state.sessionApiKeys}
            agent1Config={state.agent1Config}
            agent2Config={state.agent2Config}
            llmReady={state.llmReady}
            onDsUpload={handleDsUpload}
            onSvgUpload={handleSvgUpload}
            onRemoveSvg={removeSvg}
            onApiKeyChange={(provider, value) =>
              set("sessionApiKeys", {
                ...state.sessionApiKeys,
                [provider]: value,
              })
            }
            onAgentChange={(agent, next) =>
              set(agent === "agent1" ? "agent1Config" : "agent2Config", next)
            }
            onNext={() => set("step", 1)}
          />
        )}

        {state.step === 1 && (
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
        )}

        {(state.step === 2 || state.step === 4) && (
          <GeneratingStep
            agentLabel={state.agentLabel}
            logs={state.logs}
            streamText={state.streamText}
            isWorking={state.isWorking}
            logRef={logRef}
            streamRef={streamRef}
            progressPct={progressPct}
          />
        )}

        {state.step === 3 && (
          <ReviewStep
            script={state.agent1Script}
            tenantName={state.tenantName}
            onTenantNameChange={(value) => set("tenantName", value)}
            onDownload={downloadAgent1Script}
            onProceed={runAgent2}
            copied={state.copied}
            onCopy={copyScript}
          />
        )}

        {state.step === 5 && (
          <DoneStep
            deployResult={state.deployResult}
            script={state.finalScript}
            onCopy={copyScript}
            onDownload={downloadFinalScript}
            copied={state.copied}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}
