import React from "react";
import { ArrowLeft, ArrowRight, Bot, Download } from "lucide-react";
import { CodeViewer } from "@/components/CodeViewer";

interface ReviewStepProps {
  script: string;
  tenantName: string;
  onTenantNameChange: (v: string) => void;
  onBack: () => void;
  onDownload: () => void;
  onProceed: () => void;
  copied: boolean;
  onCopy: () => void;
}

export function ReviewStep({
  script,
  tenantName,
  onTenantNameChange,
  onBack,
  onDownload,
  onProceed,
  copied,
  onCopy,
}: ReviewStepProps) {
  const lines = script.split("\n").length;
  const kb = (script.length / 1024).toFixed(1);
  const files = (script.match(/^cat > /gm) ?? []).length;

  return (
    <div className="card">
      <div className="card__head">
        <div className="agent-tag agent-tag--a1">
          <Bot size={14} aria-hidden="true" />
          <span>Agente 1 completato</span>
        </div>
        <div className="card__title">src_tenant.sh generato</div>
        <div className="card__desc">
          Scarica e ispeziona lo script. Quando sei pronto, configura il nome del tenant e avvia il build.
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__val">{files}</div>
          <div className="stat-card__label">File generati</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val">{lines.toLocaleString()}</div>
          <div className="stat-card__label">Righe</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val">{kb} KB</div>
          <div className="stat-card__label">Dimensione</div>
        </div>
      </div>

      <div className="field mt-20">
        <label className="field__label">src_tenant.sh</label>
        <CodeViewer
          code={script}
          onCopy={onCopy}
          onDownload={onDownload}
          copied={copied}
          small
        />
      </div>

      <hr className="divider" />

      <div className="field">
        <label className="field__label">Nome tenant</label>
        <input
          className="field__input"
          placeholder="es. santamamma"
          value={tenantName}
          onChange={(e) => onTenantNameChange(e.target.value)}
        />
        <div style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 6 }}>
          Verra usato come nome cartella: <code>npx @olonjs/cli new tenant {tenantName || "tenant"}</code>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Indietro</span>
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onDownload}>
          <Download size={14} aria-hidden="true" />
          <span>Scarica src_tenant.sh</span>
        </button>
        <button className="btn btn--accent" onClick={onProceed}>
          <span>Avvia Build</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
