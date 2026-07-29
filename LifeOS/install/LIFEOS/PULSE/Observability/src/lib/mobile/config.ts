/**
 * Mobile-UI configuration — the single knob set for Pulse's alternate
 * phone interface. `Tools/MobileUi.ts` rewrites MOBILE_UI_ENABLED here and
 * rebuilds; nothing else in the tree decides whether the mobile layer is on.
 *
 * Rollback contract: with MOBILE_UI_ENABLED false, no phone is ever redirected
 * away from the classic desktop UI, and a visitor who lands on /m is sent to
 * the desktop equivalent. The desktop interface is untouched either way.
 */

/** Master switch. Flipped by Tools/MobileUi.ts — keep the literal on one line. */
export const MOBILE_UI_ENABLED = true;

/** Viewports narrower than this (CSS px) are treated as phones. */
export const MOBILE_BREAKPOINT = 768;

/** URL prefix of the mobile route tree. */
export const MOBILE_PREFIX = "/m";

/** localStorage key holding the visitor's pinned interface ("mobile" | "desktop"). */
export const UI_PREF_KEY = "pulse.ui";

export type UiPref = "mobile" | "desktop";

export function readUiPref(): UiPref | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(UI_PREF_KEY);
    return v === "mobile" || v === "desktop" ? v : null;
  } catch {
    return null; // private mode / storage disabled — fall back to viewport detection
  }
}

export function writeUiPref(pref: UiPref | null): void {
  if (typeof window === "undefined") return;
  try {
    if (pref === null) window.localStorage.removeItem(UI_PREF_KEY);
    else window.localStorage.setItem(UI_PREF_KEY, pref);
  } catch {
    /* storage unavailable — the toggle still navigates, it just won't persist */
  }
}

/** "/work" -> "/m/work"; "/" -> "/m". */
export function toMobilePath(desktopPath: string): string {
  const clean = desktopPath.replace(/\/+$/, "");
  return clean === "" || clean === "/" ? MOBILE_PREFIX : `${MOBILE_PREFIX}${clean}`;
}

/** "/m/work" -> "/work"; "/m" -> "/". */
export function toDesktopPath(mobilePath: string): string {
  if (!mobilePath.startsWith(MOBILE_PREFIX)) return mobilePath;
  const rest = mobilePath.slice(MOBILE_PREFIX.length).replace(/\/+$/, "");
  return rest === "" ? "/" : rest;
}
