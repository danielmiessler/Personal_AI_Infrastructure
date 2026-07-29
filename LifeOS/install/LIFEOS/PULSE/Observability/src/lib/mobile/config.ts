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

/**
 * Split a URL-ish string into its path and everything after it.
 *
 * The query string is load-bearing, not decoration: Knowledge, Docs and TELOS
 * all identify the thing you are looking at with `?slug=` / `?id=`. Dropping it
 * during a plane switch silently returns you to the index, which reads as "the
 * entry won't open". That was a real bug — a tapped Knowledge entry linked to
 * `/knowledge?category=research&slug=…`, the redirect rebuilt it as `/m/knowledge`,
 * and the note vanished.
 */
function splitPath(url: string): { path: string; rest: string } {
  const cut = url.search(/[?#]/);
  return cut === -1 ? { path: url, rest: "" } : { path: url.slice(0, cut), rest: url.slice(cut) };
}

/** "/work" -> "/m/work"; "/" -> "/m"; query and hash preserved. */
export function toMobilePath(desktopPath: string): string {
  const { path, rest } = splitPath(desktopPath);
  const clean = path.replace(/\/+$/, "");
  const base = clean === "" || clean === "/" ? MOBILE_PREFIX : `${MOBILE_PREFIX}${clean}`;
  return base + rest;
}

/** "/m/work" -> "/work"; "/m" -> "/"; query and hash preserved. */
export function toDesktopPath(mobilePath: string): string {
  const { path, rest } = splitPath(mobilePath);
  if (!path.startsWith(MOBILE_PREFIX)) return mobilePath;
  const tail = path.slice(MOBILE_PREFIX.length).replace(/\/+$/, "");
  return (tail === "" ? "/" : tail) + rest;
}

/** True when this desktop path has a mobile route, so a link can be rewritten
 *  rather than followed out of the mobile plane. Callers pass the route list;
 *  this module stays free of the route registry. */
export function isMobileablePath(path: string, knownRoutes: readonly string[]): boolean {
  const { path: p } = splitPath(path);
  const key = p.replace(/^\//, "").replace(/\/+$/, "");
  return knownRoutes.includes(key);
}
