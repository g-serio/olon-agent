import React from "react";
import { LLM_PROVIDERS } from "@/lib/llm/catalog";
import type { AgentModelConfig, ProviderAvailability } from "@/types";

interface LlmSetupPanelProps {
  providerAvailability: ProviderAvailability;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  onAgentChange: (agent: "agent1" | "agent2", next: AgentModelConfig) => void;
  loaded: boolean;
}

function providerAccessLabel(hasEnvKey: boolean) {
  if (hasEnvKey) return "Server env";
  return "Non configurato";
}

function canUseProvider(provider: AgentModelConfig["provider"], providerAvailability: ProviderAvailability) {
  return providerAvailability[provider];
}

export function LlmSetupPanel({
  providerAvailability,
  agent1Config,
  agent2Config,
  onAgentChange,
  loaded,
}: LlmSetupPanelProps) {
  return (
    <div className="field">
      <label className="field__label">LLM setup</label>

      <div className="llm-panel">
        <div className="llm-panel__section">
          <div className="llm-panel__header">
            <div>
              <div className="llm-panel__title">Provider disponibili</div>
              <div className="llm-panel__desc">
                Il prodotto legge solo le env vars configurate sul server. Qui vedi quali provider sono davvero pronti e quali modelli puoi instradare ai due agenti.
              </div>
            </div>
            <div className={["status-pill", loaded ? "status-pill--ok" : ""].join(" ")}>
              {loaded ? "Provider pronti" : "Caricamento"}
            </div>
          </div>

          <div className="llm-provider-grid">
            {LLM_PROVIDERS.map((provider) => {
              const hasEnvKey = providerAvailability[provider.id];

              return (
                <div className="llm-provider-card" key={provider.id}>
                  <div className="llm-provider-card__top">
                    <div className="llm-provider-card__name">{provider.label}</div>
                    <div
                      className={[
                        "status-pill",
                        canUseProvider(provider.id, providerAvailability)
                          ? "status-pill--ok"
                          : "status-pill--muted",
                      ].join(" ")}
                    >
                      {providerAccessLabel(hasEnvKey)}
                    </div>
                  </div>

                  <div className="llm-provider-card__env">{provider.envKey}</div>
                  <div className="llm-provider-card__hint">
                    {hasEnvKey
                      ? "Configurato a livello ambiente."
                      : "Manca la env var richiesta per usare questo provider."}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="llm-panel__section">
          <div className="llm-panel__header">
            <div>
              <div className="llm-panel__title">Routing agenti</div>
              <div className="llm-panel__desc">
                Ogni agente puo usare un provider diverso. Se manca una chiave per il provider scelto, l’avvio resta bloccato in modo esplicito.
              </div>
            </div>
          </div>

          <div className="llm-agent-grid">
            {([
              ["agent1", "Agente 1", agent1Config],
              ["agent2", "Agente 2", agent2Config],
            ] as const).map(([agentId, label, config]) => {
              const providerMeta = LLM_PROVIDERS.find((provider) => provider.id === config.provider) ?? LLM_PROVIDERS[0];
              const providerReady = canUseProvider(config.provider, providerAvailability);

              return (
                <div className="llm-agent-card" key={agentId}>
                  <div className="llm-agent-card__head">
                    <div className="llm-agent-card__title">{label}</div>
                    <div className={["status-pill", providerReady ? "status-pill--ok" : "status-pill--warn"].join(" ")}>
                      {providerReady ? "Pronto" : "Chiave richiesta"}
                    </div>
                  </div>

                  <div className="field">
                    <label className="field__label">Provider</label>
                    <select
                      className="field__input"
                      value={config.provider}
                      onChange={(event) => {
                        const provider = event.target.value as AgentModelConfig["provider"];
                        const nextProvider = LLM_PROVIDERS.find((entry) => entry.id === provider) ?? LLM_PROVIDERS[0];
                        onAgentChange(agentId, {
                          provider,
                          model: nextProvider.models[0]?.id ?? "",
                        });
                      }}
                    >
                      {LLM_PROVIDERS.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field__label">Modello</label>
                    <select
                      className="field__input"
                      value={config.model}
                      onChange={(event) =>
                        onAgentChange(agentId, {
                          provider: config.provider,
                          model: event.target.value,
                        })
                      }
                    >
                      {providerMeta.models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
