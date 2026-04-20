"use client";

import React from "react";
import { Bot, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LLM_PROVIDERS } from "@/lib/llm/catalog";
import { cn } from "@/lib/utils";
import type { AgentModelConfig, ProviderAvailability } from "@/types";

/**
 * ModelsDialog — global model routing config.
 *
 * Lives in the Topbar (workflow shell), accessible from any step.
 * Replaces the inline "Modelli" card that used to live inside BrandStep.
 *
 * Trigger: a compact pill-button showing X/3 providers ready.
 * Content: per-agent model picker, per-provider readiness LED.
 *
 * Note: the Select uses a composite "provider::model" string value because
 *   <Select> only carries a single string per option. We split it back into
 *   AgentModelConfig on change. Mirrors the same pattern that was in
 *   LlmSetupPanel.tsx.
 */

interface ModelsDialogProps {
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  onAgentChange: (agent: "agent1" | "agent2", next: AgentModelConfig) => void;
}

function encode(config: AgentModelConfig): string {
  return `${config.provider}::${config.model}`;
}

function decode(value: string): AgentModelConfig {
  const [provider, model] = value.split("::");
  return {
    provider: provider as AgentModelConfig["provider"],
    model,
  };
}

export function ModelsDialog({
  providerAvailability,
  providerSetupLoaded,
  agent1Config,
  agent2Config,
  onAgentChange,
}: ModelsDialogProps) {
  const readyCount = LLM_PROVIDERS.filter(
    (provider) => providerAvailability[provider.id],
  ).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 px-3 text-xs"
          aria-label="Configure models"
        >
          <Settings2 className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Models</span>
          <span className="flex items-center gap-1 border-l border-border pl-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {providerSetupLoaded ? `${readyCount}/3` : "…"}
            </span>
            <ProviderLeds availability={providerAvailability} />
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-4 text-primary" aria-hidden="true" />
            Model routing
          </DialogTitle>
          <DialogDescription>
            Pick the model that drives the creative draft and the one that
            converges the build. Provider availability is read from your
            local environment.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <ProviderRow
            availability={providerAvailability}
            providerSetupLoaded={providerSetupLoaded}
            readyCount={readyCount}
          />

          <div className="space-y-3">
            <ModelField
              label="Creative model"
              hint="Drafts the tenant from your design system."
              value={encode(agent1Config)}
              onChange={(value) => onAgentChange("agent1", decode(value))}
              providerAvailability={providerAvailability}
            />

            <ModelField
              label="Build model"
              hint="Runs the sandbox and converges to a working script."
              value={encode(agent2Config)}
              onChange={(value) => onAgentChange("agent2", decode(value))}
              providerAvailability={providerAvailability}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Provider LEDs (reused by trigger pill and dialog body) ─────────── */

function ProviderLeds({ availability }: { availability: ProviderAvailability }) {
  return (
    <span className="flex items-center gap-0.5">
      {LLM_PROVIDERS.map((provider) => (
        <span
          key={provider.id}
          title={`${provider.label}: ${availability[provider.id] ? "ready" : "no key"}`}
          className={cn(
            "size-1.5 rounded-full",
            availability[provider.id]
              ? "bg-success-indicator"
              : "bg-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

interface ProviderRowProps {
  availability: ProviderAvailability;
  providerSetupLoaded: boolean;
  readyCount: number;
}

function ProviderRow({
  availability,
  providerSetupLoaded,
  readyCount,
}: ProviderRowProps) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-label text-muted-foreground">
          Active providers
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {providerSetupLoaded ? `${readyCount}/3 ready` : "reading env…"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LLM_PROVIDERS.map((provider) => {
          const ready = availability[provider.id];
          return (
            <div
              key={provider.id}
              className={cn(
                "flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs",
                ready
                  ? "border-success-border bg-success/40 text-success-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  ready ? "bg-success-indicator" : "bg-muted-foreground/30",
                )}
              />
              <span className="truncate font-medium">{provider.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ModelFieldProps {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  providerAvailability: ProviderAvailability;
}

function ModelField({
  label,
  hint,
  value,
  onChange,
  providerAvailability,
}: ModelFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LLM_PROVIDERS.map((provider) => (
            <SelectGroup key={provider.id}>
              <SelectLabel className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    providerAvailability[provider.id]
                      ? "bg-success-indicator"
                      : "bg-muted-foreground/30",
                  )}
                />
                {provider.label}
              </SelectLabel>
              {provider.models.map((model) => (
                <SelectItem
                  key={`${provider.id}-${model.id}`}
                  value={`${provider.id}::${model.id}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{model.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                      {model.tier}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
