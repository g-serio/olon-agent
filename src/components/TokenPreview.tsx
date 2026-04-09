import React from "react";
import { resolveDesignTokens } from "@/lib/design-system";
import type { DsJsonSchema } from "@/types";

interface TokenPreviewProps {
  dsJson: DsJsonSchema;
}

export function TokenPreview({ dsJson }: TokenPreviewProps) {
  const resolved = resolveDesignTokens(dsJson);
  if (!resolved) return null;

  const seen = new Set<string>();
  const pairs = Object.entries(resolved.colors).filter(([, value]) => {
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  if (pairs.length === 0) return null;

  return (
    <div className="mt-12">
      <label className="field__label">Token colore rilevati ({pairs.length})</label>
      <div className="token-row">
        {pairs.map(([key, value]) => (
          <div key={key} className="tswatch" style={{ background: value }}>
            <div className="tswatch__tt">
              {key}: {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
