import React from "react";
import type { LogEntry, LogType } from "@/types";

interface TerminalProps {
  logs: LogEntry[];
  termRef: React.RefObject<HTMLDivElement>;
  cursor?: boolean;
}

const MSG_CLASS: Record<LogType, string> = {
  info:    "term__msg--info",
  agent:   "term__msg--agent",
  success: "term__msg--success",
  error:   "term__msg--error",
};

export function Terminal({ logs, termRef, cursor = false }: TerminalProps) {
  return (
    <div className="term" ref={termRef}>
      {logs.map((entry, i) => (
        <div className="term__line" key={i}>
          <span className="term__prompt">$</span>
          <span className={MSG_CLASS[entry.type]}>{entry.msg}</span>
        </div>
      ))}
      {cursor && <span className="term__cursor" />}
    </div>
  );
}
