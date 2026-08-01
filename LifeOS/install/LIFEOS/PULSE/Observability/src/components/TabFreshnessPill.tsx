"use client";

// Universal per-tab freshness pill. Shown in the AppHeader top-right on every
// Pulse tab. Calls /api/tab-freshness?tab=<id> and renders the existing
// FreshnessIndicator. Tab id is inferred from the active pathname; the pill
// is hidden on the home / route (no specific tab active).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FreshnessIndicator, type FreshnessData } from "./FreshnessIndicator";

const TAB_FROM_PATH: Array<{ prefix: string; tabId: string }> = [
  { prefix: "/telos", tabId: "telos" },
  { prefix: "/work", tabId: "work" },
  { prefix: "/health", tabId: "health" },
  { prefix: "/finances", tabId: "finances" },
  { prefix: "/business", tabId: "business" },
  { prefix: "/local", tabId: "local" },
  { prefix: "/assistant", tabId: "assistant" },
  { prefix: "/agents", tabId: "agents" },
  { prefix: "/memory/knowledge", tabId: "knowledge" },
  { prefix: "/docs", tabId: "docs" },
  { prefix: "/skills", tabId: "skills" },
  { prefix: "/hooks", tabId: "hooks" },
  { prefix: "/arbol", tabId: "arbol" },
  { prefix: "/security", tabId: "security" },
  { prefix: "/performance", tabId: "performance" },
];

function activeTabId(pathname: string | null): string | null {
  if (!pathname) return null;
  for (const m of TAB_FROM_PATH) {
    if (pathname === m.prefix || pathname.startsWith(`${m.prefix}/`)) return m.tabId;
  }
  return null;
}

export function TabFreshnessPill({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const tabId = activeTabId(pathname);
  const [data, setData] = useState<FreshnessData | null>(null);

  useEffect(() => {
    if (!tabId) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/tab-freshness?tab=${encodeURIComponent(tabId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((payload: FreshnessData & { tabId?: string; perFile?: FreshnessData["perFile"] }) => {
        if (cancelled) return;
        setData({
          dataDate: payload.dataDate ?? null,
          label: payload.label ?? "",
          daysOld: payload.daysOld ?? null,
          tier: payload.tier ?? "unknown",
          perFile: Array.isArray(payload.perFile) ? payload.perFile : [],
        });
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          dataDate: null,
          label: "freshness check failed",
          daysOld: null,
          tier: "unknown",
          perFile: [],
        });
      });
    return () => { cancelled = true; };
  }, [tabId]);

  if (!tabId) return null;
  return <FreshnessIndicator freshness={data} className={className} compact />;
}
