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

interface ModelOption {
  provider: AgentModelConfig["provider"];
  model: string;
  label: string;
}

const MODEL_OPTIONS: ModelOption[] = LLM_PROVIDERS.flatMap((provider) =>
  provider.models.map((model) => ({
    provider: provider.id,
    model: model.id,
    label: `${provider.label} · ${model.label}`,
  }))
);

function encodeModelValue(config: AgentModelConfig) {
  return `${config.provider}::${config.model}`;
}

function decodeModelValue(value: string): AgentModelConfig {
  const [provider, model] = value.split("::");
  return {
    provider: provider as AgentModelConfig["provider"],
    model,
  };
}

export function LlmSetupPanel({
  providerAvailability,
  agent1Config,
  agent2Config,
  onAgentChange,
  loaded,
}: LlmSetupPanelProps) {
  const readyProviders = LLM_PROVIDERS.filter((provider) => providerAvailability[provider.id]).length;

  return (
    <div className="llm-minimal">
      <div className="llm-minimal__providers">
        <div className="field__label">Provider attivi</div>
        <div className="provider-thinbar" aria-label="Provider availability">
          {LLM_PROVIDERS.map((provider) => {
            const ready = providerAvailability[provider.id];
            return (
              <div className="provider-thinbar__item" key={provider.id}>
                <span className={["led", ready ? "led--ok" : "led--muted"].join(" ")} />
                <span className="provider-thinbar__label">{provider.label}</span>
              </div>
            );
          })}
          <div className="provider-thinbar__meta">
            <span className={["led", loaded ? "led--ok" : "led--muted"].join(" ")} />
            <span>{loaded ? `${readyProviders}/3` : "..."}</span>
          </div>
        </div>
      </div>

      <div className="llm-model-grid">
        <div className="field">
          <label className="field__label">Modello creativo</label>
          <select
            className="field__input"
            value={encodeModelValue(agent1Config)}
            onChange={(event) => onAgentChange("agent1", decodeModelValue(event.target.value))}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={`${option.provider}-${option.model}`} value={`${option.provider}::${option.model}`}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label">Modello build</label>
          <select
            className="field__input"
            value={encodeModelValue(agent2Config)}
            onChange={(event) => onAgentChange("agent2", decodeModelValue(event.target.value))}
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={`${option.provider}-${option.model}`} value={`${option.provider}::${option.model}`}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
