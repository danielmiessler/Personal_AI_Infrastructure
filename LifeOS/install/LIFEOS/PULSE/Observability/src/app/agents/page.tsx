"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SystemHealthVitals from "@/components/activity/insights/SystemHealthVitals";
import CapabilityStrip from "@/components/activity/CapabilityStrip";
import { PageShell, TabBar, type TabSpec } from "@/components/ui/chrome";
import { Mountain, Activity } from "lucide-react";

// The tab bodies are the heavy code on this route — WorkBoard pulls framer-motion,
// ObservabilityDashboard pulls the live chart. Loading them eagerly made /agents
// ~8× heavier than any other Pulse page (74 kB route). Split each into its own
// chunk so the shell (vitals + strip + tabs) paints instantly and the active
// tab's code streams in; the inactive tab never downloads until it's opened.
const TabFallback = () => (
  <div className="flex items-center justify-center h-64 text-ink-3 text-sm">Loading…</div>
);
const WorkBoard = dynamic(() => import("@/components/activity/WorkBoard"), {
  ssr: false,
  loading: TabFallback,
});
const ObservabilityDashboard = dynamic(() => import("@/components/activity/ObservabilityDashboard"), {
  ssr: false,
  loading: TabFallback,
});

// ─── Agents Page ───
//
// 2026-07-14 redesign: the mode-tab structure (Iterate/Optimize/Loop/Native)
// died with the mode system (retired 2026-07-11). Two surfaces remain:
//
//   WORK     — the board: tracked runs as climbs (claims closing on evidence),
//              untracked sessions as liveness. Data: /api/algorithm.
//   ACTIVITY — the live event layer: hooks, tools, agents. Data: /api/events/recent.
//
// Phase visualization doctrine: lifecycle is DERIVED from run data
// (src/lib/lifecycle.ts); nothing here renders declared phase stations.

type Tab = "work" | "activity";

const tabs: TabSpec<Tab>[] = [
  { id: "work", label: "Work", icon: Mountain, dim: "creative" },
  { id: "activity", label: "Activity", icon: Activity, dim: "rhythms" },
];

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>("work");

  return (
    <PageShell fullBleed>
      <SystemHealthVitals />
      <CapabilityStrip />

      <TabBar
        className="px-4 py-2 shrink-0 border-b border-line-2 bg-surface-2"
        tabs={tabs}
        active={tab}
        onChange={setTab}
      />

      {tab === "work" && <WorkBoard />}
      {tab === "activity" && <ObservabilityDashboard />}
    </PageShell>
  );
}
