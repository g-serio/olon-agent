import React from "react";

interface CodeViewerProps {
  code: string;
  viewerRef?: React.RefObject<HTMLDivElement>;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  small?: boolean;
}

export function CodeViewer({
  code,
  viewerRef,
  onCopy,
  onDownload,
  copied,
  small = false,
}: CodeViewerProps) {
  return (
    <div className="code-wrap">
      <div
        className={["code-viewer", small ? "code-viewer--sm" : ""].filter(Boolean).join(" ")}
        ref={viewerRef}
      >
        <pre>{code || "# (vuoto)"}</pre>
      </div>
      <div className="code-actions">
        <button
          className={["code-btn", copied ? "code-btn--ok" : ""].filter(Boolean).join(" ")}
          onClick={onCopy}
        >
          {copied ? "✓ Copiato" : "Copia"}
        </button>
        <button className="code-btn" onClick={onDownload}>
          ↓ .sh
        </button>
      </div>
    </div>
  );
}
