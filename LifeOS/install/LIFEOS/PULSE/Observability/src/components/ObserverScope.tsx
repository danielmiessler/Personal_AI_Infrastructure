"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useObserverMode } from "@/contexts/ObserverModeContext";
import { observerScopeFor } from "@/lib/observer";

/**
 * Keeps <html data-observer-scope> in sync on client-side navigation (the
 * pre-paint script in layout.tsx handles the initial load) and shows the
 * full-page indicator chip when a wholly-personal page is blurred.
 */
export default function ObserverScope() {
  const pathname = usePathname();
  const { observerMode } = useObserverMode();
  const scope = observerScopeFor(pathname ?? "/");

  useEffect(() => {
    document.documentElement.setAttribute("data-observer-scope", scope);
  }, [scope]);

  if (!observerMode || scope !== "full") return null;

  return (
    <div className="fixed inset-x-0 top-24 z-50 flex justify-center pointer-events-none">
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-full text-[12px] tracking-[0.14em] font-medium"
        style={{
          background: "rgba(251,191,36,0.12)",
          border: "1px solid rgba(251,191,36,0.35)",
          color: "rgb(251,191,36)",
          backdropFilter: "blur(6px)",
        }}
      >
        OBSERVER MODE — personal page hidden
      </div>
    </div>
  );
}
