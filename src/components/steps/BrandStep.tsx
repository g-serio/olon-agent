import React, { useState, useCallback } from "react";
import { TokenPreview } from "@/components/TokenPreview";
import type { DsJsonSchema, SvgAsset } from "@/types";

interface BrandStepProps {
  dsJson: DsJsonSchema | null;
  dsFileName: string;
  svgAssets: SvgAsset[];
  onDsUpload: (file: File) => void;
  onSvgUpload: (file: File) => void;
  onRemoveSvg: (name: string) => void;
  onNext: () => void;
}

export function BrandStep({
  dsJson,
  dsFileName,
  svgAssets,
  onDsUpload,
  onSvgUpload,
  onRemoveSvg,
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
        <div className="card__title">Design system</div>
        <div className="card__desc">
          Carica il tuo design system JSON Schema e gli asset SVG del brand. I token verranno iniettati nella catena OlonJS v1.5.
        </div>
      </div>

      {/* DS JSON */}
      <div className="field">
        <label className="field__label">Design system JSON schema</label>
        <div
          className={["dropzone", drag ? "dropzone--drag" : ""].filter(Boolean).join(" ")}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            accept=".json"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="dropzone__icon">◈</div>
          {dsFileName ? (
            <div className="dropzone__label">
              <strong>{dsFileName}</strong> caricato
            </div>
          ) : (
            <div className="dropzone__label">
              Trascina o <strong>seleziona il .json</strong>
            </div>
          )}
          <div className="dropzone__sub">
            olon.theme.schema.json · design-system.schema.json
          </div>
        </div>
        {dsJson && <TokenPreview dsJson={dsJson} />}
      </div>

      {/* SVG assets */}
      <div className="field">
        <label className="field__label">Asset SVG (logo, icone) — opzionale</label>
        <div className="dropzone" style={{ padding: "20px 32px" }}>
          <input
            type="file"
            accept=".svg"
            multiple
            onChange={(e) => {
              if (!e.target.files) return;
              Array.from(e.target.files).forEach(onSvgUpload);
            }}
          />
          <div className="dropzone__label">
            <strong>Aggiungi SVG</strong>
          </div>
          <div className="dropzone__sub">Puoi selezionare più file</div>
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
        <button className="btn btn--primary" onClick={onNext}>
          Continua →
        </button>
      </div>
    </div>
  );
}
