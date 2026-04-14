import React from "react";
import { ArrowLeft } from "lucide-react";
import { Terminal } from "@/components/Terminal";
import type { LogEntry } from "@/types";

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
  return (
    <div className="card">
      <div className="card__head">
        <div className="agent-tag agent-tag--a1">{agentLabel}</div>
        <div className="card__title">In esecuzione...</div>
        <div className="card__desc">
          Streaming live: ogni token generato appare in tempo reale.
        </div>
      </div>

      <div className="prog">
        <div className="prog__fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="field">
        <label className="field__label">Log</label>
        <Terminal logs={logs} termRef={logRef} cursor={isWorking} />
      </div>

      {streamText && (
        <div className="field mt-16">
          <label className="field__label">
            Output live - {(streamText.length / 1024).toFixed(1)} KB
          </label>
          <div className="code-viewer code-viewer--sm" ref={streamRef}>
            <pre>{streamText}</pre>
          </div>
        </div>
      )}

      {isWorking && (
        <div className="text-center mt-20 text-muted">
          <span className="pulse">Generazione in corso...</span>
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Indietro</span>
        </button>
      </div>
    </div>
  );
}
