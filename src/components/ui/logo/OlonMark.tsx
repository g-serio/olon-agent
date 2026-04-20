"use client";

import { cn } from "@/lib/utils";

/**
 * OlonMark — atom-style brand mark.
 *
 * Ported 1:1 from jsonpages-platform/src/components/ui/logo/OlonMark.tsx
 * so the two products share the exact same identity asset.
 *
 * Geometry:
 *   • outer ring — circle stroke 20px wide, vertical purple gradient
 *   • inner nucleus — solid filled circle in the accent color
 *
 * Tokens consumed (defined in globals.css :root):
 *   --mark-ring-top, --mark-ring-bottom, --mark-nucleus
 *
 * Variants:
 *   default — gradient ring + filled nucleus
 *   mono    — single-color ring + nucleus, currentColor (use inside
 *             dark backgrounds, links, or wherever a flat one-color
 *             reproduction is needed)
 */

interface OlonMarkProps {
  size?: number;
  variant?: "default" | "mono";
  className?: string;
}

export function OlonMark({
  size = 32,
  variant = "default",
  className,
}: OlonMarkProps) {
  const gradientId = `olon-ring-${size}`;

  if (variant === "mono") {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        aria-label="Olon mark"
        className={cn("flex-shrink-0", className)}
      >
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="currentColor"
          strokeWidth="20"
        />
        <circle cx="50" cy="50" r="15" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-label="Olon mark"
      className={cn("flex-shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--mark-ring-top)" />
          <stop offset="100%" stopColor="var(--mark-ring-bottom)" />
        </linearGradient>
      </defs>
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke={`url(#${gradientId})`}
        strokeWidth="20"
      />
      <circle cx="50" cy="50" r="15" fill="var(--mark-nucleus)" />
    </svg>
  );
}
