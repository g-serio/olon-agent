import React from "react";
import type { DsJsonSchema } from "@/types";

interface TokenPreviewProps {
  dsJson: DsJsonSchema;
}

export function TokenPreview({ dsJson }: TokenPreviewProps) {
  const colorProps = dsJson?.properties?.tokens?.properties?.colors?.properties;
  if (!colorProps) return null;

  // Deduplicate by hex value: repeated semantics (e.g. #FDFCF9 used for
  // card/elevated/popover/input) would crowd out unique colors like terra/parchment.
  const seen = new Set<string>();
  const pairs = Object.entries(colorProps).filter(([, v]) => {
    if (!v.default) return false;
    const hex = v.default.toLowerCase();
    if (seen.has(hex)) return false;
    seen.add(hex);
    return true;
  });

  return (
    <div className="mt-12">
      <label className="field__label">
        Token colore rilevati ({pairs.length})
      </label>
      <div className="token-row">
        {pairs.map(([key, token]) => (
          <div
            key={key}
            className="tswatch"
            style={{ background: token.default }}
          >
            <div className="tswatch__tt">
              {key}: {token.default}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
