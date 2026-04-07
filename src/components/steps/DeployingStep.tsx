import React from "react";
import { Terminal } from "@/components/Terminal";
import type { LogEntry } from "@/types";

interface DeployingStepProps {
  logs: LogEntry[];
  isWorking: boolean;
  logRef: React.RefObject<HTMLDivElement>;
}

export function DeployingStep({ logs, isWorking, logRef }: DeployingStepProps) {
  const pct = isWorking ? Math.min(88, 10 + logs.length * 16) : 100;

  return (
    <div className="card">
      <div className="card__head">
        <div className="agent-tag agent-tag--a2">◈ Agente 2 — Deployer</div>
        <div className="card__title">Compilazione e provisioning</div>
        <div className="card__desc">
          L'agente analizza lo script per errori TypeScript, applica i fix e invia il tenant al SaaS di provisioning.
        </div>
      </div>

      <div className="prog">
        <div className="prog__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="field">
        <label className="field__label">Log agente 2</label>
        <Terminal logs={logs} termRef={logRef} cursor={isWorking} />
      </div>

      {isWorking && (
        <div className="text-center mt-20 text-muted">
          <span className="pulse">Validazione TypeScript in corso…</span>
        </div>
      )}
    </div>
  );
}
