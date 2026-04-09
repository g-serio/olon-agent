import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ContentMode } from "@/types";

interface ContentStepProps {
  contentMode: ContentMode;
  domain: string;
  userContent: string;
  onContentModeChange: (mode: ContentMode) => void;
  onDomainChange: (value: string) => void;
  onUserContentChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContentStep({
  contentMode,
  domain,
  userContent,
  onContentModeChange,
  onDomainChange,
  onUserContentChange,
  onBack,
  onNext,
}: ContentStepProps) {
  const canProceed =
    contentMode === "provide"
      ? userContent.trim().length > 0
      : domain.trim().length > 0;

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Target e contenuti</div>
        <div className="card__desc">
          Definisci il dominio del sito e come gestire i contenuti. L&apos;Agente 1 costruira sezioni, copy e struttura pertinenti al brand.
        </div>
      </div>

      <div className="field">
        <label className="field__label">Strategia contenuti</label>
        <div className="radio-group">
          <div
            className={["radio-card", contentMode === "generate" ? "radio-card--selected" : ""].filter(Boolean).join(" ")}
            onClick={() => onContentModeChange("generate")}
          >
            <div className="radio-card__dot" />
            <div className="radio-card__title">Genera automaticamente</div>
            <div className="radio-card__desc">
              L&apos;agente crea copy, struttura e dati JSON dal dominio indicato.
            </div>
          </div>

          <div
            className={["radio-card", contentMode === "provide" ? "radio-card--selected" : ""].filter(Boolean).join(" ")}
            onClick={() => onContentModeChange("provide")}
          >
            <div className="radio-card__dot" />
            <div className="radio-card__title">Fornisco i contenuti</div>
            <div className="radio-card__desc">
              Incolla testi e struttura esistenti da integrare nel tenant.
            </div>
          </div>
        </div>
      </div>

      {contentMode === "generate" && (
        <div className="field">
          <label className="field__label">Dominio / descrizione del brand</label>
          <input
            className="field__input"
            placeholder="es. SaaS di project management per team distribuiti - moderno, minimalista"
            value={domain}
            onChange={(e) => onDomainChange(e.target.value)}
          />
        </div>
      )}

      {contentMode === "provide" && (
        <div className="field">
          <label className="field__label">Contenuti (testo libero, JSON, o struttura)</label>
          <textarea
            className="field__input"
            rows={9}
            placeholder={
              "Nome brand: ...\nTagline: ...\nSezioni: hero, features, cta\nHero title: ...\nHero subtitle: ...\nFeature 1: ..."
            }
            value={userContent}
            onChange={(e) => onUserContentChange(e.target.value)}
          />
        </div>
      )}

      <div className="btn-row">
        <button className="btn btn--ghost btn--sm" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Indietro</span>
        </button>
        <button
          className="btn btn--primary"
          onClick={onNext}
          disabled={!canProceed}
        >
          <span>Avvia Agente 1</span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
