"use client";

/**
 * Device routing, client-side — the static export has no server render to
 * branch on, and a build-time decision could not respect a per-browser choice
 * anyway.
 *
 * The rule, in order:
 *   1. Mobile layer disabled at build time  → never redirect. Ever.
 *   2. Visitor pinned "desktop"             → never redirect.
 *   3. Viewport narrower than the breakpoint → send to the matching /m route.
 *
 * Visiting a `/m` URL directly clears any desktop pin, so the toggle is
 * symmetric: the phone shell's Monitor button pins desktop, and navigating
 * back into /m unpins it.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MOBILE_BREAKPOINT,
  MOBILE_PREFIX,
  MOBILE_UI_ENABLED,
  readUiPref,
  toMobilePath,
  writeUiPref,
} from "@/lib/mobile/config";

export default function MobileRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    if (!MOBILE_UI_ENABLED) return;

    // Already inside the mobile plane — treat that as choosing it.
    if (pathname === MOBILE_PREFIX || pathname.startsWith(`${MOBILE_PREFIX}/`)) {
      if (readUiPref() === "desktop") writeUiPref("mobile");
      return;
    }

    if (readUiPref() === "desktop") return;
    if (window.innerWidth >= MOBILE_BREAKPOINT) return;

    // Carry the query and hash across. `pathname` alone would drop `?slug=`,
    // which is how a tapped Knowledge entry used to land back on the index.
    window.location.replace(toMobilePath(pathname + window.location.search + window.location.hash));
  }, [pathname]);

  return null;
}
