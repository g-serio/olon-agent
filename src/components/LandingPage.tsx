import React, { useMemo } from "react";
import {
  ArrowRight,
  Bot,
  Boxes,
  Cable,
  GalleryVerticalEnd,
  Sparkles,
} from "lucide-react";
import type { ProviderAvailability } from "@/types";

interface LandingPageProps {
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  onStart: () => void;
}

const PROVIDER_LABELS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Google Gemini" },
] as const;

export function LandingPage({
  providerAvailability,
  providerSetupLoaded,
  onStart,
}: LandingPageProps) {
  const readyProviders = useMemo(
    () => Object.values(providerAvailability).filter(Boolean).length,
    [providerAvailability]
  );

  return (
    <div className="landing-shell">
      <section className="landing-hero">
        <div className="landing-hero__main">
          <div className="landing-hero__eyebrow">OlonAgent · Open source site engine</div>
          <h1 className="landing-hero__title">
            Genera tenant OlonJS con due agenti, i tuoi modelli e il tuo design system.
          </h1>
          <p className="landing-hero__copy">
            Carichi theme e asset, scegli i modelli che vuoi usare e ottieni uno script che
            passa da generazione a build reale. Il prodotto resta gratis: paghi solo le API key
            che hai gia deciso di usare.
          </p>

          <div className="landing-hero__actions">
            <button className="btn btn--primary" onClick={onStart}>
              <span>Inizia un tenant</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
            <div className="landing-note">
              <span className={["led", providerSetupLoaded ? "led--ok" : "led--muted"].join(" ")} />
              <span>{providerSetupLoaded ? `${readyProviders}/3 provider pronti` : "lettura env in corso"}</span>
            </div>
          </div>
        </div>

        <aside className="landing-hero__side">
          <div className="landing-panel">
            <div className="landing-panel__eyebrow">Supporto modelli</div>
            <div className="landing-provider-list">
              {PROVIDER_LABELS.map((provider) => {
                const ready = providerAvailability[provider.id];
                return (
                  <div className="landing-provider-row" key={provider.id}>
                    <div className="landing-provider-row__main">
                      <span className={["led", ready ? "led--ok" : "led--muted"].join(" ")} />
                      <span>{provider.label}</span>
                    </div>
                    <span className="landing-provider-row__meta">{ready ? "env ok" : "non attivo"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      <section className="landing-flow">
        <div className="landing-section-head">
          <div className="landing-section-head__eyebrow">Come funziona</div>
          <h2 className="landing-section-head__title">Tre passaggi, un unico lavoro.</h2>
        </div>

        <div className="landing-steps">
          <article className="landing-step-card">
            <div className="landing-step-card__icon">
              <GalleryVerticalEnd size={18} aria-hidden="true" />
            </div>
            <div className="landing-step-card__index">01</div>
            <h3 className="landing-step-card__title">Carichi il DNA visivo</h3>
            <p className="landing-step-card__copy">
              Theme JSON, token e asset di brand entrano come sorgente concreta del tenant.
            </p>
          </article>

          <article className="landing-step-card">
            <div className="landing-step-card__icon">
              <Bot size={18} aria-hidden="true" />
            </div>
            <div className="landing-step-card__index">02</div>
            <h3 className="landing-step-card__title">Instradi i modelli</h3>
            <p className="landing-step-card__copy">
              Scegli il modello creativo e quello di build. L'orchestrazione resta interna.
            </p>
          </article>

          <article className="landing-step-card">
            <div className="landing-step-card__icon">
              <Cable size={18} aria-hidden="true" />
            </div>
            <div className="landing-step-card__index">03</div>
            <h3 className="landing-step-card__title">Chiudi in sandbox reale</h3>
            <p className="landing-step-card__copy">
              Il secondo agente esegue, corregge e converge su uno script finale pronto da usare.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-strip">
        <div className="landing-strip__item">
          <Sparkles size={16} aria-hidden="true" />
          <span>Creativo di default</span>
        </div>
        <div className="landing-strip__item">
          <Boxes size={16} aria-hidden="true" />
          <span>OlonJS v1.6 come source of truth</span>
        </div>
        <div className="landing-strip__item">
          <Bot size={16} aria-hidden="true" />
          <span>Anthropic, OpenAI, Gemini</span>
        </div>
      </section>
    </div>
  );
}
