import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class names safely.
 * - `clsx` flattens conditional/object/array forms into a single string.
 * - `twMerge` resolves conflicting Tailwind utilities (e.g. `px-2 px-4` -> `px-4`).
 *
 * Use this anywhere you'd otherwise hand-roll a `[a, b].filter(Boolean).join(" ")`
 * for utility classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
