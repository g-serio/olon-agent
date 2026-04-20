"use client";

import React from "react";

import { Topbar } from "@/components/Topbar";
import { cn } from "@/lib/utils";
import type {
  AgentModelConfig,
  PipelineStep,
  ProviderAvailability,
} from "@/types";

/**
 * WorkflowShell — chrome for every workflow step (1..5 + the Theme/Assets
 * step that historically used PipelineStep=0).
 *
 * Mounts the Topbar above and gives children a height-constrained main
 * region (viewport minus topbar h-12).
 *
 * Scroll contract:
 *   • <main> uses overflow-y-auto, NOT overflow-hidden. This means
 *     unmigrated/legacy steps that don't yet know the fold contract
 *     can still scroll naturally and reach their primary actions.
 *   • Steps that have been refactored to be "in fold" opt in by setting
 *     `h-full overflow-hidden` on their own root container — at that
 *     point the page won't scroll and the step is responsible for any
 *     internal scrolling regions it needs (log panes, code viewers).
 *
 * Why not overflow-hidden by default? Because any step that grows past
 * the viewport (legacy BrandStep, or any new step with a long form)
 * would clip its primary CTAs and lock the user. Scroll-by-default is
 * the safe baseline; opt-in fold is the polished override.
 */

interface WorkflowShellProps {
  step: PipelineStep;
  providerAvailability: ProviderAvailability;
  providerSetupLoaded: boolean;
  agent1Config: AgentModelConfig;
  agent2Config: AgentModelConfig;
  onAgentChange: (agent: "agent1" | "agent2", next: AgentModelConfig) => void;
  onExit?: () => void;
  children: React.ReactNode;
}

export function WorkflowShell({
  step,
  providerAvailability,
  providerSetupLoaded,
  agent1Config,
  agent2Config,
  onAgentChange,
  onExit,
  children,
}: WorkflowShellProps) {
  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col overflow-hidden",
        "bg-background text-foreground font-sans antialiased",
      )}
    >
      <Topbar
        step={step}
        providerAvailability={providerAvailability}
        providerSetupLoaded={providerSetupLoaded}
        agent1Config={agent1Config}
        agent2Config={agent2Config}
        onAgentChange={onAgentChange}
        onExit={onExit}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
