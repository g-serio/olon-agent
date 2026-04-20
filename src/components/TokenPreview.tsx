"use client";

import React, { useMemo } from "react";

import { cn } from "@/lib/utils";
import { resolveDesignTokens } from "@/lib/design-system";
import type { DsJsonSchema } from "@/types";

/**
 * TokenPreview — visual proof that the uploaded design system was parsed.
 *
 * Renders a compact swatch row for the unique color tokens we resolved
 * out of the DS JSON. Tooltip on each swatch exposes the token name and
 * its hex value.
 *
 * Renders nothing when there are no tokens to show — the dropzone above
 * already conveys "no file yet" state, no need for a duplicate empty
 * state here.
 */

interface TokenPreviewProps {
  dsJson: DsJsonSchema;
  className?: string;
}

export function TokenPreview({ dsJson, className }: TokenPreviewProps) {
  const pairs = useMemo(() => {
    const resolved = resolveDesignTokens(dsJson);
    if (!resolved) return [] as Array<[string, string]>;

    const seen = new Set<string>();
    return Object.entries(resolved.colors).filter(([, value]) => {
      const normalized = value.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [dsJson]);

  if (pairs.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Detected color tokens
        </span>
        <span className="font-mono text-[11px] text-muted-foreground/80">
          {pairs.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pairs.map(([key, value]) => (
          <div
            key={key}
            title={`${key} · ${value}`}
            className={cn(
              "size-7 shrink-0 rounded-md border border-border/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
              "transition-transform duration-150 hover:scale-110",
            )}
            style={{ background: value }}
            aria-label={`${key}: ${value}`}
          />
        ))}
      </div>
    </div>
  );
}
