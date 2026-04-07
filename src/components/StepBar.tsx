import React from "react";
import { STEP_LABELS, type PipelineStep } from "@/types";

interface StepBarProps {
  step: PipelineStep;
}

export function StepBar({ step }: StepBarProps) {
  return (
    <div className="stepbar">
      {STEP_LABELS.map((label, i) => (
        <div className="stepbar__item" key={i}>
          <div className="stepbar__col">
            <div
              className={[
                "stepbar__circle",
                i === step ? "stepbar__circle--active" : "",
                i < step ? "stepbar__circle--done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={[
                "stepbar__label",
                i === step ? "stepbar__label--active" : "",
                i < step ? "stepbar__label--done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div
              className={[
                "stepbar__line",
                i < step ? "stepbar__line--done" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}
