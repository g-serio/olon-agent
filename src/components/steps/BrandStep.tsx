import React, { useCallback, useState } from "react";
import { LlmSetupPanel } from "@/components/LlmSetupPanel";
import { TokenPreview } from "@/components/TokenPreview";
import type {
  AgentModelConfig,
  DsJsonSchema,
  ProviderAvailability,
  SessionApiKeys,
  SvgAsset,
} from "@/types";

interface BrandStepProps {
  dsJson: DsJsonSchema | null;
  dsFileName: string;
  svgAssets: SvgAsset[];
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  sessionApiKeys: SessionApiKeys;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  llmReady: boolean;
  onDsUpload: (file: File) => void;
  onSvgUpload: (file: File) => void;
  onRemoveSvg: (name: string) => void;
  onApiKeyChange: (provider: keyof SessionApiKeys, value: string) => void;
  onAgentChange: (agent: "agent1" | "agent2", next: AgentModelConfig) => void;
  onNext: () => void;
}

export function BrandStep({
  dsJson,
  dsFileName,
  svgAssets,
  providerAvailability,
  providerSetupLoaded,
  sessionApiKeys,
  agent1Config,
  agent2Config,
  llmReady,
  onDsUpload,
  onSvgUpload,
  onRemoveSvg,
  onApiKeyChange,
  onAgentChange,
  onNext,
}: BrandStepProps) {
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (file.name.endsWith(".json")) onDsUpload(file);
      else if (file.name.endsWith(".svg")) onSvgUpload(file);
    },
    [onDsUpload, onSvgUpload]
  );

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Design system e motore LLM</div>
        <div className="card__desc">
          Carica il design system del brand, aggiungi gli asset SVG e scegli quali provider usare per i due agenti. Il sito resta gratuito: paghi solo le API key che decidi di usare.
        </div>
      </div>

      <LlmSetupPanel
        sessionApiKeys={sessionApiKeys}
        providerAvailability={providerAvailability}
        agent1Config={agent1Config}
        agent2Config={agent2Config}
        onApiKeyChange={onApiKeyChange}
        onAgentChange={onAgentChange}
        loaded={providerSetupLoaded}
      />

      {!llmReady && (
        <div className="info-box">
          Configura un provider utilizzabile per Agente 1 e Agente 2. Puoi usare le chiavi da server env oppure aggiungere override locali per la sessione.
        </div>
      )}

      <div className="field">
        <label className="field__label">Design system JSON schema</label>
        <div
          className={["dropzone", drag ? "dropzone--drag" : ""].filter(Boolean).join(" ")}
          onDragOver={(event) => {
            event.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDrag(false);
            handleFile(event.dataTransfer.files[0]);
          }}
        >
          <input type="file" accept=".json" onChange={(event) => handleFile(event.target.files?.[0])} />
          <div className="dropzone__icon">◆</div>
          {dsFileName ? (
            <div className="dropzone__label">
              <strong>{dsFileName}</strong> caricato
            </div>
          ) : (
            <div className="dropzone__label">
              Trascina o <strong>seleziona il .json</strong>
            </div>
          )}
          <div className="dropzone__sub">olon.theme.schema.json · design-system.schema.json</div>
        </div>
        {dsJson && <TokenPreview dsJson={dsJson} />}
      </div>

      <div className="field">
        <label className="field__label">Asset SVG (logo, icone) - opzionale</label>
        <div className="dropzone" style={{ padding: "20px 32px" }}>
          <input
            type="file"
            accept=".svg"
            multiple
            onChange={(event) => {
              if (!event.target.files) return;
              Array.from(event.target.files).forEach(onSvgUpload);
            }}
          />
          <div className="dropzone__label">
            <strong>Aggiungi SVG</strong>
          </div>
          <div className="dropzone__sub">Puoi selezionare piu file</div>
        </div>

        {svgAssets.length > 0 && (
          <div className="file-tags">
            {svgAssets.map((asset) => (
              <div className="ftag" key={asset.name}>
                <span className="ftag__ok">◆</span>
                {asset.name}
                <span className="ftag__rm" onClick={() => onRemoveSvg(asset.name)}>
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="btn-row">
        <button className="btn btn--ghost btn--sm" disabled>
          ← Indietro
        </button>
        <button className="btn btn--primary" onClick={onNext} disabled={!llmReady || !providerSetupLoaded}>
          Continua →
        </button>
      </div>
    </div>
  );
}
