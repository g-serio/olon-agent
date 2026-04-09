import React from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { CodeViewer } from "@/components/CodeViewer";
import type { DeployResult } from "@/types";

interface DoneStepProps {
  deployResult: DeployResult | null;
  script: string;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  onRestart: () => void;
}

export function DoneStep({ script, onCopy, onDownload, copied, onRestart }: DoneStepProps) {
  const lines = script.split("\n").length;
  const kb = (script.length / 1024).toFixed(1);

  return (
    <div className="card">
      <div className="card__head">
        <div className="agent-tag agent-tag--a1">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>Green Build</span>
        </div>
        <div className="card__title">install_npm.jpcore.sh pronto</div>
        <div className="card__desc">
          Lo script ricrea il <code>src/</code> gia fixato e verificato. Eseguilo nella root di un progetto OlonJS.
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__val">{lines.toLocaleString()}</div>
          <div className="stat-card__label">Righe</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val">{kb} KB</div>
          <div className="stat-card__label">Dimensione</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val">
            <CheckCircle2 size={20} aria-hidden="true" />
          </div>
          <div className="stat-card__label">tsc green</div>
        </div>
      </div>

      <div className="field mt-20">
        <label className="field__label">install_npm.jpcore.sh</label>
        <CodeViewer
          code={script}
          onCopy={onCopy}
          onDownload={onDownload}
          copied={copied}
          small
        />
      </div>

      <div className="btn-row" style={{ justifyContent: "center" }}>
        <button className="btn btn--ghost" onClick={onRestart}>
          <RotateCcw size={14} aria-hidden="true" />
          <span>Nuovo tenant</span>
        </button>
      </div>
    </div>
  );
}
