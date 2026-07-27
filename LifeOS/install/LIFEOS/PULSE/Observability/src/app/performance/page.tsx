"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Zap,
  Clock,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  TabBar,
  dimStyle,
  type TabSpec,
} from "@/components/ui/chrome";

type Tab = "cost" | "failures" | "anthropic";

interface AnthropicSnapshot {
  ts: string;
  subscription: { five_hour_pct: number | null; seven_day_pct: number | null };
  api_spend: { month_used_usd: number | null; source: string };
  call_sites: { total: number; bypass: number; legit: number; new_since_baseline: string[] };
  alerts: string[];
}

interface AnthropicCallSite {
  file: string;
  line: number;
  classification: "bypass" | "legit" | "unknown";
  reason: string;
}

interface AnthropicData {
  current: AnthropicSnapshot | null;
  history: AnthropicSnapshot[];
  total_entries: number;
  sites: AnthropicCallSite[];
  baseline_updated: string | null;
}

interface CostData {
  days: number;
  totalSessions: number;
  totalCost: number;
  totalTokens: number;
  avgCostPerSession: number;
  costBreakdown: { input: number; output: number; cacheWrite: number; cacheRead: number };
  byModel: Array<{ model: string; cost: number; sessions: number; tokens: number }>;
  dailyCosts: Array<{ day: string; cost: number }>;
  topSessions: Array<{
    sessionId: string;
    project: string;
    primaryModel: string;
    messageCount: number;
    costTotal: number;
    totalTokens: number;
    firstTimestamp: string;
    lastTimestamp: string;
  }>;
}

interface FailureData {
  totalFailures: number;
  totalCalls: number;
  overallRate: number;
  byTool: Array<{ tool: string; failures: number; calls: number; failureRate: number }>;
  trend: Array<{ day: string; failures: number; total: number; rate: number }>;
}

function formatCost(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortModel(m: string): string {
  if (m.includes("fable")) {
    const ver = m.match(/fable-(\d+)/)?.[1];
    return ver ? `Fable ${ver}` : "Fable";
  }
  if (m.includes("opus")) return "Opus";
  if (m.includes("haiku")) return "Haiku";
  if (m.includes("sonnet")) return "Sonnet";
  return m.slice(0, 20);
}

const rowHoverIn = (e: React.MouseEvent<HTMLTableRowElement>) => (e.currentTarget.style.background = "var(--surface-3)");
const rowHoverOut = (e: React.MouseEvent<HTMLTableRowElement>) => (e.currentTarget.style.background = "transparent");

function CostTab({ data }: { data: CostData | null }) {
  if (!data) return <div className="p-8 text-ink-3">Loading cost data...</div>;

  const maxDaily = Math.max(...data.dailyCosts.map((d) => d.cost), 1);
  const isEmpty = data.totalSessions === 0 && data.totalCost === 0 && data.totalTokens === 0;

  return (
    <div className="space-y-6">
      {isEmpty && (
        <EmptyStateGuide
          section="Performance"
          description="Runtime telemetry — tool latency, model timing, agent durations. Populates as you use LifeOS."
          hideInterview
          daPromptExample="show me where my sessions are spending time"
        />
      )}
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={DollarSign}
          dim="money"
          label={`Total (${data.days}d)`}
          value={formatCost(data.totalCost)}
          sub={`${data.totalSessions.toLocaleString()} sessions`}
        />
        <StatTile icon={TrendingUp} dim="money" label="Avg / Session" value={formatCost(data.avgCostPerSession)} />
        <StatTile icon={Cpu} dim="money" label="Total Tokens" value={formatTokens(data.totalTokens)} />
        <StatTile
          icon={Zap}
          dim="money"
          label="Cache Read $"
          value={formatCost(data.costBreakdown.cacheRead)}
          sub={`${Math.round((data.costBreakdown.cacheRead / Math.max(data.totalCost, 0.01)) * 100)}% of total`}
        />
      </div>

      {/* Cost breakdown */}
      <Panel>
        <PanelHeader title="Cost Breakdown" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Input", val: data.costBreakdown.input, color: "var(--money)" },
            { label: "Output", val: data.costBreakdown.output, color: "var(--creative)" },
            { label: "Cache Write", val: data.costBreakdown.cacheWrite, color: "var(--rhythms)" },
            { label: "Cache Read", val: data.costBreakdown.cacheRead, color: "var(--health)" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-ink-3">{item.label}</span>
              </div>
              <div className="text-lg font-medium text-ink-1">{formatCost(item.val)}</div>
              <div className="text-xs text-ink-3">
                {Math.round((item.val / Math.max(data.totalCost, 0.01)) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Model breakdown */}
      <Panel>
        <PanelHeader title="Cost by Model" />
        <div className="space-y-2">
          {data.byModel.map((m) => (
            <div key={m.model} className="flex items-center gap-3">
              <span className="text-xs w-20 shrink-0 text-ink-1">{shortModel(m.model)}</span>
              <div className="flex-1 h-5 rounded bg-surface-3 overflow-hidden">
                <div
                  className="h-full flex items-center px-2"
                  style={{
                    width: `${Math.max((m.cost / Math.max(data.totalCost, 1)) * 100, 8)}%`,
                    background: "var(--money)",
                  }}
                >
                  <span className="text-[12px] whitespace-nowrap font-semibold" style={{ color: "var(--ground)" }}>
                    {formatCost(m.cost)} · {m.sessions} sessions
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Daily trend */}
      {data.dailyCosts.length > 1 && (
        <Panel>
          <PanelHeader title="Daily Cost Trend" />
          <div className="flex items-end gap-1 h-32">
            {data.dailyCosts.slice(-30).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-t-sm min-h-[2px] transition-all"
                  style={{ height: `${(d.cost / maxDaily) * 100}%`, background: "var(--money)" }}
                  title={`${d.day}: ${formatCost(d.cost)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[12px] text-ink-3">{data.dailyCosts[0]?.day?.slice(5)}</span>
            <span className="text-[12px] text-ink-3">
              {data.dailyCosts[data.dailyCosts.length - 1]?.day?.slice(5)}
            </span>
          </div>
        </Panel>
      )}

      {/* Top sessions */}
      <Panel>
        <PanelHeader title="Most Expensive Sessions" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line-1">
                <th className="text-left py-2 pr-3 text-ink-3">Cost</th>
                <th className="text-left py-2 pr-3 text-ink-3">Model</th>
                <th className="text-right py-2 pr-3 text-ink-3">Msgs</th>
                <th className="text-right py-2 pr-3 text-ink-3">Tokens</th>
                <th className="text-left py-2 text-ink-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.topSessions.slice(0, 15).map((s) => (
                <tr
                  key={s.sessionId}
                  className="border-b border-line-1 transition-colors"
                  onMouseEnter={rowHoverIn}
                  onMouseLeave={rowHoverOut}
                >
                  <td className="py-2 pr-3 font-medium text-ink-1">{formatCost(s.costTotal)}</td>
                  <td className="py-2 pr-3 text-ink-1">{shortModel(s.primaryModel)}</td>
                  <td className="py-2 pr-3 text-right text-ink-2">{s.messageCount}</td>
                  <td className="py-2 pr-3 text-right text-ink-2">{formatTokens(s.totalTokens)}</td>
                  <td className="py-2 text-ink-3">{(s.lastTimestamp || "").slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FailuresTab({ data }: { data: FailureData | null }) {
  if (!data) return <div className="p-8 text-ink-3">Loading failure data...</div>;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={AlertTriangle}
          dim="creative"
          label="Overall Failure Rate"
          value={`${data.overallRate}%`}
          sub={`${data.totalFailures.toLocaleString()} failures / ${data.totalCalls.toLocaleString()} calls`}
        />
        <StatTile
          icon={BarChart3}
          dim="creative"
          label="Top Offender"
          value={data.byTool[0]?.tool || "—"}
          sub={`${data.byTool[0]?.failures ?? 0} failures (${data.byTool[0]?.failureRate ?? 0}%)`}
        />
        <StatTile
          icon={Clock}
          dim="creative"
          label="Trend"
          value={data.trend.length >= 2 ? `${data.trend[data.trend.length - 1]?.rate ?? 0}%` : "—"}
          sub="Most recent day"
        />
      </div>

      {/* Daily trend */}
      {data.trend.length > 1 && (
        <Panel>
          <PanelHeader title="7-Day Failure Rate" />
          <div className="flex items-end gap-2 h-24">
            {data.trend.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1">
                <span className="text-[12px] text-ink-3">{d.rate}%</span>
                <div
                  className="w-full rounded-t-sm min-h-[2px]"
                  style={{ height: `${Math.min(d.rate * 5, 100)}%`, background: "var(--creative)" }}
                />
                <span className="text-[12px] text-ink-3">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Per-tool table */}
      <Panel>
        <PanelHeader title="Failure Rate by Tool" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line-1">
                <th className="text-left py-2 pr-4 text-ink-3">Tool</th>
                <th className="text-right py-2 pr-4 text-ink-3">Failures</th>
                <th className="text-right py-2 pr-4 text-ink-3">Total Calls</th>
                <th className="text-right py-2 pr-4 text-ink-3">Rate</th>
                <th className="text-left py-2 text-ink-3" style={{ width: "30%" }}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {data.byTool
                .filter((t) => t.failures > 0)
                .map((t) => (
                  <tr
                    key={t.tool}
                    className="border-b border-line-1 transition-colors"
                    onMouseEnter={rowHoverIn}
                    onMouseLeave={rowHoverOut}
                  >
                    <td className="py-2 pr-4 font-medium text-ink-1">{t.tool}</td>
                    <td className="py-2 pr-4 text-right text-err">{t.failures}</td>
                    <td className="py-2 pr-4 text-right text-ink-2">{t.calls.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-ink-1">{t.failureRate}%</td>
                    <td className="py-2">
                      <div className="h-2.5 rounded bg-surface-3 overflow-hidden">
                        <div
                          className="h-full"
                          style={{ width: `${Math.min(t.failureRate * 2, 100)}%`, background: "var(--creative)" }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function AnthropicTab({ data }: { data: AnthropicData | null }) {
  if (!data) return <div className="p-8 text-ink-3">Loading Anthropic cost data...</div>;
  if (!data.current)
    return (
      <div className="p-8 text-ink-3">
        No ledger entries yet. CostTracker cron runs hourly — next entry at :00.
        Run manually: <code className="mono">bun LIFEOS/TOOLS/CostTracker.ts log</code>
      </div>
    );

  const snap = data.current;
  const fiveH = snap.subscription.five_hour_pct ?? 0;
  const sevenD = snap.subscription.seven_day_pct ?? 0;
  const apiSpend = snap.api_spend.month_used_usd;
  const bypassSites = data.sites.filter((s) => s.classification === "bypass");
  const legitSites = data.sites.filter((s) => s.classification === "legit");
  const unknownSites = data.sites.filter((s) => s.classification === "unknown");

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {snap.alerts.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.08)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-err" />
            <span className="text-sm font-medium text-err">Active Alerts</span>
          </div>
          <ul className="text-sm space-y-1" style={{ color: "var(--err)" }}>
            {snap.alerts.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={ShieldCheck}
          dim="freedom"
          label="Subscription 5h"
          value={`${fiveH}%`}
          sub={fiveH > 80 ? "approaching cap" : "healthy"}
        />
        <StatTile
          icon={TrendingUp}
          dim="freedom"
          label="Subscription 7d"
          value={`${sevenD}%`}
          sub={sevenD > 80 ? "approaching cap" : "healthy"}
        />
        <StatTile
          icon={DollarSign}
          dim="money"
          label="API Spend MTD"
          value={apiSpend !== null ? `$${apiSpend.toFixed(2)}` : "—"}
          sub={apiSpend !== null ? snap.api_spend.source : "set ANTHROPIC_ADMIN_API_KEY"}
        />
        <StatTile
          icon={bypassSites.length > 0 ? XCircle : CheckCircle2}
          dim={bypassSites.length > 0 ? "err" : "health"}
          label="Bypass call sites"
          value={String(bypassSites.length)}
          sub={bypassSites.length === 0 ? "✅ all guarded" : "🚨 review and patch"}
        />
      </div>

      {/* Call sites inventory */}
      <Panel>
        <PanelHeader
          title={`Call Sites (${data.sites.length})`}
          actions={
            <span className="text-xs text-ink-3">
              baseline: {data.baseline_updated ? new Date(data.baseline_updated).toLocaleString() : "none"}
            </span>
          }
        />
        <div className="space-y-1" style={{ fontSize: 12 }}>
          {bypassSites.map((s, i) => (
            <div key={`b-${i}`} className="flex items-start gap-2 py-1">
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-err" />
              <div className="flex-1 min-w-0">
                <div className="mono truncate text-err">
                  {s.file}:{s.line}
                </div>
                <div className="text-ink-3 text-[12px]">{s.reason}</div>
              </div>
            </div>
          ))}
          {unknownSites.map((s, i) => (
            <div key={`u-${i}`} className="flex items-start gap-2 py-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warn" />
              <div className="flex-1 min-w-0">
                <div className="mono truncate text-warn">
                  {s.file}:{s.line}
                </div>
                <div className="text-ink-3 text-[12px]">{s.reason}</div>
              </div>
            </div>
          ))}
          {legitSites.map((s, i) => (
            <div key={`l-${i}`} className="flex items-start gap-2 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--health)" }} />
              <div className="flex-1 min-w-0">
                <div className="mono truncate text-ink-1">
                  {s.file}:{s.line}
                </div>
                <div className="text-ink-3 text-[12px]">{s.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* 24h trend */}
      <Panel>
        <PanelHeader title="Last 24h — subscription usage" />
        <div className="flex items-end gap-1" style={{ height: 80 }}>
          {data.history.length === 0 ? (
            <span className="text-ink-3 text-xs">Waiting for hourly samples…</span>
          ) : (
            data.history.map((h, i) => {
              const pct = h.subscription.five_hour_pct ?? 0;
              const alert = h.alerts.length > 0;
              return (
                <div
                  key={i}
                  className="flex-1"
                  title={`${new Date(h.ts).toLocaleTimeString()} — 5h=${pct}%, sites=${h.call_sites.total} (bypass=${h.call_sites.bypass})`}
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: alert ? "var(--err)" : "var(--money)",
                    borderRadius: 2,
                    minWidth: 8,
                  }}
                />
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] text-ink-3">{data.total_entries} total ledger entries</span>
          <span className="text-[12px] text-ink-3 mono">
            last sample: {new Date(snap.ts).toLocaleTimeString()}
          </span>
        </div>
      </Panel>

      {/* How-to */}
      <Panel className="opacity-85">
        <div className="text-xs text-ink-3 space-y-1">
          <div>
            <span className="mono" style={{ color: "var(--money)" }}>
              bun LIFEOS/TOOLS/CostTracker.ts status
            </span>{" "}
            — human-readable snapshot
          </div>
          <div>
            <span className="mono" style={{ color: "var(--money)" }}>
              bun LIFEOS/TOOLS/CostTracker.ts scan
            </span>{" "}
            — re-run static scan
          </div>
          <div>
            <span className="mono" style={{ color: "var(--money)" }}>
              bun LIFEOS/TOOLS/CostTracker.ts baseline
            </span>{" "}
            — lock a new known-good snapshot
          </div>
        </div>
      </Panel>
    </div>
  );
}

const TABS: TabSpec<Tab>[] = [
  { id: "cost", label: "Cost", icon: DollarSign, dim: "money" },
  { id: "failures", label: "Failures", icon: AlertTriangle, dim: "creative" },
  { id: "anthropic", label: "Anthropic", icon: ShieldCheck, dim: "freedom" },
];

export default function PerformancePage() {
  const [tab, setTab] = useState<Tab>("cost");
  const [costData, setCostData] = useState<CostData | null>(null);
  const [failureData, setFailureData] = useState<FailureData | null>(null);
  const [anthropicData, setAnthropicData] = useState<AnthropicData | null>(null);
  const [days, setDays] = useState(30);

  const fetchCost = useCallback(async () => {
    try {
      const res = await fetch(`/api/performance/cost?days=${days}`);
      if (res.ok) setCostData(await res.json());
    } catch { /* silent */ }
  }, [days]);

  const fetchFailures = useCallback(async () => {
    try {
      const res = await fetch("/api/performance/failures");
      if (res.ok) setFailureData(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchAnthropic = useCallback(async () => {
    try {
      const res = await fetch("/api/performance/anthropic-cost");
      if (res.ok) setAnthropicData(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchCost();
    fetchFailures();
    fetchAnthropic();
    const interval = setInterval(() => {
      fetchCost();
      fetchFailures();
      fetchAnthropic();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchCost, fetchFailures, fetchAnthropic]);

  const daysSwitcher = (
    <div className="flex items-center gap-1.5">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => setDays(d)}
          className="px-2.5 py-1 rounded-full text-[12px] font-medium cursor-pointer transition-colors"
          style={{
            ...dimStyle("money", days === d),
            ...(days === d ? { color: "var(--ink-1)" } : {}),
          }}
        >
          {d}d
        </button>
      ))}
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        icon={BarChart3}
        title="Performance"
        subtitle="Runtime cost, tool failures, and Anthropic subscription guardrails."
        actions={tab === "cost" ? daysSwitcher : undefined}
      />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === "cost" && <CostTab data={costData} />}
      {tab === "failures" && <FailuresTab data={failureData} />}
      {tab === "anthropic" && <AnthropicTab data={anthropicData} />}
    </PageShell>
  );
}
