"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { localOnlyApiCall } from "@/lib/local-api";
import {
  Zap,
  Bot,
  Layers,
  Workflow,
  Plug,
  Globe,
  Terminal,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Capability Strip ───
//
// Top-of-agents-page telemetry: which harness capabilities are actually in
// use — skills, agent dispatches, parallel bursts, orchestrator (Workflow),
// MCP tools, web tools. Fed by /api/capabilities, which parses hook-written
// JSONL (tool-activity, subagent-events). Zero tokens: pure log parsing.
//
// 2026-07-28 dynamic pass ({{PRINCIPAL_NAME}}: "make the top area more dynamic in terms
// of what capabilities are being used"): chips order themselves by recency —
// whatever fired last leads the strip — fresh use (<2 min) pulses, a
// sparkline carries tool-call volume across the window, and capabilities
// with zero use collapse into one quiet trailing group instead of a row of
// dead zeros. The strip now READS as live ecosystem telemetry.

interface CapabilitiesData {
  generated_at: string;
  window_minutes: number;
  totals: {
    tool_calls: number;
    sessions: number;
    skills: number;
    agent_dispatches: number;
    workflow_runs: number;
    send_messages: number;
    tool_searches: number;
    web_searches: number;
    web_fetches: number;
  };
  skills: Array<{ name: string; count: number }>;
  agents: {
    dispatches: number;
    models: Record<string, number>;
    types: Record<string, number>;
    fanouts: number;
    max_fanout: number;
  };
  parallel: { bursts: number; max_width: number };
  mcp: Array<{ server: string; count: number }>;
  tools: Array<{ name: string; count: number }>;
  /** ms-epoch of the newest event per capability key (server-computed). */
  last_used: Record<string, number>;
  /** Tool-call volume across the window, oldest bucket first. */
  series: { buckets: number[]; bucket_minutes: number };
}

const WINDOWS = [
  { minutes: 60, label: "1h" },
  { minutes: 360, label: "6h" },
  { minutes: 1440, label: "24h" },
];

/** Fresh = fired inside the last 2 minutes — the chip pulses. */
const FRESH_MS = 2 * 60 * 1000;

function agoShort(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// ─── Sparkline — tool-call volume over the window ───

function Sparkline({ buckets }: { buckets: number[] }) {
  const max = Math.max(...buckets, 1);
  const w = 120;
  const h = 18;
  const step = w / (buckets.length - 1 || 1);
  const points = buckets
    .map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0 opacity-90" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="#7dcfff"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* live edge dot — the newest bucket */}
      <circle
        cx={w}
        cy={h - 2 - (buckets[buckets.length - 1] / max) * (h - 4)}
        r="2"
        fill="#7dcfff"
      />
    </svg>
  );
}

interface ChipDef {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  count: number;
  lastUsed: number | null;
  tooltip?: string[];
}

function Chip({ chip }: { chip: ChipDef }) {
  const fresh = chip.lastUsed != null && Date.now() - chip.lastUsed < FRESH_MS;
  const Icon = chip.icon;
  return (
    <div className="group relative flex items-center gap-1.5 shrink-0 whitespace-nowrap">
      {fresh && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />}
      <Icon className={`w-3.5 h-3.5 shrink-0 ${fresh ? "text-sky-300" : "text-sky-400"}`} />
      <span className="text-[13px] text-ink-3 whitespace-nowrap">{chip.label}</span>
      <span className="text-[13px] font-mono whitespace-nowrap text-ink-1 font-semibold">
        {chip.value}
      </span>
      {chip.lastUsed != null && (
        <span className={`text-[11px] font-mono ${fresh ? "text-sky-300" : "text-ink-3"}`}>
          {agoShort(chip.lastUsed)}
        </span>
      )}
      {chip.tooltip && chip.tooltip.length > 0 && (
        <div className="absolute top-full left-0 mt-1.5 px-2.5 py-1.5 rounded-md bg-[rgba(20,28,56,0.97)] border border-line-2 text-[13px] text-ink-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 min-w-[160px] max-w-[320px] whitespace-nowrap">
          {chip.tooltip.map((line, i) => (
            <div key={i} className="leading-snug font-mono">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CapabilityStrip() {
  const [data, setData] = useState<CapabilitiesData | null>(null);
  const [windowMin, setWindowMin] = useState(60);

  const fetchData = useCallback(async () => {
    try {
      const d = await localOnlyApiCall<CapabilitiesData>(
        `/api/capabilities?window=${windowMin}`,
      );
      setData(d);
    } catch {
      // strip stays hidden until data arrives
    }
  }, [windowMin]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const { active, quiet } = useMemo(() => {
    if (!data) return { active: [] as ChipDef[], quiet: [] as ChipDef[] };
    const t = data.totals;
    const lu = data.last_used ?? {};
    const modelEntries = Object.entries(data.agents.models);
    const webTotal = t.web_searches + t.web_fetches;

    const chips: ChipDef[] = [
      {
        key: "skills",
        icon: Zap,
        label: "Skills",
        value:
          data.skills.length > 0
            ? `${t.skills} (${data.skills
                .slice(0, 2)
                .map((s) => s.name)
                .join(", ")}${data.skills.length > 2 ? "…" : ""})`
            : "0",
        count: t.skills,
        lastUsed: lu.skills ?? null,
        tooltip: data.skills.map((s) => `${s.name} ×${s.count}`),
      },
      {
        key: "agents",
        icon: Bot,
        label: "Agents",
        value:
          t.agent_dispatches > 0
            ? `${t.agent_dispatches}${
                modelEntries.length > 0
                  ? ` (${modelEntries.map(([m, c]) => `${m}×${c}`).join(", ")})`
                  : ""
              }`
            : "0",
        count: t.agent_dispatches,
        lastUsed: lu.agents ?? null,
        tooltip: [
          ...modelEntries.map(([m, c]) => `${m} ×${c}`),
          ...(data.agents.max_fanout >= 2 ? [`fan-out max ×${data.agents.max_fanout}`] : []),
        ],
      },
      {
        key: "parallel",
        icon: Layers,
        label: "Parallel",
        value:
          data.parallel.bursts > 0
            ? `${data.parallel.bursts} bursts, max ×${data.parallel.max_width}`
            : "0",
        count: data.parallel.bursts,
        // Bursts carry no per-event recency; they sort by count among peers.
        lastUsed: null,
        tooltip:
          data.parallel.bursts > 0
            ? [`${data.parallel.bursts} same-second bursts`, `widest ×${data.parallel.max_width}`]
            : undefined,
      },
      {
        key: "workflow",
        icon: Workflow,
        label: "Orchestrator",
        value: `${t.workflow_runs}`,
        count: t.workflow_runs,
        lastUsed: lu.workflow ?? null,
      },
      {
        key: "send_messages",
        icon: MessageSquare,
        label: "Agent msgs",
        value: `${t.send_messages}`,
        count: t.send_messages,
        lastUsed: lu.send_messages ?? null,
      },
      {
        key: "mcp",
        icon: Plug,
        label: "MCP",
        value: data.mcp.length > 0 ? data.mcp.map((m) => m.server).join(", ") : "0",
        count: data.mcp.reduce((s, m) => s + m.count, 0),
        lastUsed: lu.mcp ?? null,
        tooltip: data.mcp.map((m) => `${m.server} ×${m.count}`),
      },
      {
        key: "web",
        icon: Globe,
        label: "Web",
        value: `${webTotal}`,
        count: webTotal,
        lastUsed: lu.web ?? null,
      },
      {
        key: "tools",
        icon: Terminal,
        label: "Tool calls",
        value: `${t.tool_calls} · ${t.sessions} sess`,
        count: t.tool_calls,
        lastUsed: lu.tool_call ?? null,
        tooltip: data.tools.map((x) => `${x.name} ×${x.count}`),
      },
    ];

    // Recency owns the order: what fired last leads. Recency-less actives
    // (parallel) fall back behind timestamped ones, ordered by volume.
    const active = chips
      .filter((c) => c.count > 0)
      .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0) || b.count - a.count);
    const quiet = chips.filter((c) => c.count === 0);
    return { active, quiet };
  }, [data]);

  if (!data) return null;

  return (
    <div className="flex items-center flex-wrap gap-x-5 gap-y-1 px-4 py-1.5 bg-[rgba(15,26,51,0.5)] border-b border-white/[0.04] shrink-0">
      <span className="text-[13px] font-semibold text-ink-2 tracking-wide shrink-0 uppercase">
        Capabilities
      </span>

      {data.series?.buckets?.length > 1 && <Sparkline buckets={data.series.buckets} />}

      {active.map((chip) => (
        <Chip key={chip.key} chip={chip} />
      ))}

      {quiet.length > 0 && (
        <span
          className="text-[12px] text-ink-3 opacity-60 shrink-0 whitespace-nowrap"
          title="No use inside the selected window"
        >
          quiet: {quiet.map((c) => c.label).join(" · ")}
        </span>
      )}

      {/* Window toggle */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        {WINDOWS.map((w) => (
          <button
            key={w.minutes}
            onClick={() => setWindowMin(w.minutes)}
            className={`px-1.5 py-0.5 rounded text-[13px] font-mono transition-colors ${
              windowMin === w.minutes
                ? "bg-sky-500/15 text-sky-300"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}
