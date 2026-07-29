"use client";

/**
 * Density — the one dial that lets a single component tree render at two
 * sizes. Desktop routes render with no provider above them, so they read the
 * default "comfortable" and are byte-identical to their pre-mobile output.
 * The mobile shell wraps its children in `compact`, and the chrome primitives
 * (src/components/ui/chrome.tsx) retune padding, gaps, and type off that.
 *
 * This is deliberately NOT a media query: media queries would force an edit in
 * every one of the 33 route pages. One context + the shared primitives means
 * the adaptation lives in exactly one place.
 */

import { createContext, useContext, type ReactNode } from "react";

export type Density = "comfortable" | "compact";

const DensityContext = createContext<Density>("comfortable");

export function DensityProvider({ value, children }: { value: Density; children: ReactNode }) {
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity(): Density {
  return useContext(DensityContext);
}

/** Convenience for the common branch. */
export function useCompact(): boolean {
  return useContext(DensityContext) === "compact";
}
