"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  MessageCircleWarning,
  Ban,
  UserRoundPen,
  BookOpenCheck,
  Database,
  Clock,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  Pill,
} from "@/components/ui/chrome";

interface ShapeItem {
  label: string;
  description: string;
  pattern: string;
}

interface RuleItem {
  rule: string;
}

interface DecisionRow {
  ts: string;
  tool: string;
  cmd_prefix: string;
  decision: string;
  reasons: string[];
  matched_pattern?: string;
  cache: "hit" | "miss" | "n/a";
}

interface SecuritySnapshot {
  generatedAt: string;
  l1: { title: string; location: string; summary: string; note: string };
  l2: { title: string; location: string; deny: RuleItem[]; ask: RuleItem[]; counts: { deny: number; ask: number } };
  l3: {
    title: string;
    location: string;
    loaded: boolean;
    dangerous: ShapeItem[];
    credential: ShapeItem[];
    injection: ShapeItem[];
    counts: { dangerous: number; credential: number; injection: number };
  };
  telemetry: {
    permissionCache: {
      exists: boolean;
      path: string;
      entryCount: number;
      sizeBytes: number | null;
      oldestTs: string | null;
      newestTs: string | null;
    };
    decisions: {
      exists: boolean;
      path: string;
      sampledCount: number;
      recent: DecisionRow[];
      byDecision: Record<string, number>;
    };
  };
}

function formatBytes(n: number | null): string {
  if (n === null) return "—";
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function formatTs(ts: string | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function ShapeList({ items }: { items: ShapeItem[] }) {
  if (items.length === 0) return <div className="text-[12px] text-ink-3 py-2">None found.</div>;
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="py-2 border-b border-line-1 last:border-b-0">
          <div className="text-sm font-medium text-ink-1">{item.label}</div>
          <div className="text-[12px] text-ink-3 mt-0.5">{item.description}</div>
          <div className="text-[12px] mono text-ink-2 mt-1 truncate" title={item.pattern}>
            {item.pattern}
          </div>
        </div>
      ))}
    </div>
  );
}

function RuleList({ items }: { items: RuleItem[] }) {
  if (items.length === 0) return <div className="text-[12px] text-ink-3 py-2">None found.</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="text-[12px] mono px-2 py-1 rounded-md bg-surface-3 text-ink-2">
          {item.rule}
        </span>
      ))}
    </div>
  );
}

export default function SecurityPage() {
  const [data, setData] = useState<SecuritySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/security");
      if (res.ok) {
        setData(await res.json());
        setError(null);
      } else {
        setError(`/api/security → ${res.status}`);
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!data && !error) {
    return (
      <PageShell>
        <PageHeader icon={ShieldCheck} title="Security" subtitle="Loading security posture…" />
      </PageShell>
    );
  }

  const totalShapes = data ? data.l3.counts.dangerous + data.l3.counts.credential + data.l3.counts.injection : 0;

  return (
    <PageShell>
      <PageHeader
        icon={ShieldCheck}
        title="Security"
        subtitle="Read-only view of the live three-layer security model — constitutional rule, native permissions.deny/ask, and the Safety.hook.ts classifier shapes — plus permission-cache and decision telemetry."
      />

      {error && (
        <Panel>
          <span className="text-sm" style={{ color: "var(--err)" }}>{error}</span>
        </Panel>
      )}

      {data && (
        <>
          {totalShapes === 0 && data.l2.counts.deny === 0 && (
            <EmptyStateGuide
              section="Security"
              description="The live security posture — enforced patterns, deny/ask rules, and permission telemetry."
              hideInterview
              daPromptExample="show me the security page"
            />
          )}

          {!data.l3.loaded && (
            <Panel>
              <span className="text-sm" style={{ color: "var(--warn)" }}>
                Could not load hooks/lib/safety-classifier.ts — dangerous/credential/injection sections are empty.
                Native permissions.deny/ask (settings.json) still render below.
              </span>
            </Panel>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={ShieldAlert} dim="err" label="Classifier shapes" value={totalShapes} sub="dangerous + credential + injection" />
            <StatTile icon={Ban} dim="err" label="Native deny rules" value={data.l2.counts.deny} sub="settings.json permissions.deny" />
            <StatTile icon={UserRoundPen} dim="warn" label="Native ask rules" value={data.l2.counts.ask} sub="settings.json permissions.ask" />
            <StatTile
              icon={Database}
              dim="money"
              label="Permission cache"
              value={data.telemetry.permissionCache.entryCount}
              sub={data.telemetry.permissionCache.exists ? formatBytes(data.telemetry.permissionCache.sizeBytes) : "not created yet"}
            />
          </div>

          <Panel>
            <PanelHeader title={data.l1.title} icon={BookOpenCheck} meta={data.l1.location} />
            <p className="text-sm text-ink-2 mb-2">{data.l1.summary}</p>
            <p className="text-[12px] text-ink-3">{data.l1.note}</p>
          </Panel>

          <Panel>
            <PanelHeader title="Native permissions.deny" icon={Ban} meta={`${data.l2.counts.deny} rules · ${data.l2.location}`} />
            <RuleList items={data.l2.deny} />
          </Panel>

          <Panel>
            <PanelHeader title="Native permissions.ask" icon={UserRoundPen} meta={`${data.l2.counts.ask} rules`} />
            <RuleList items={data.l2.ask} />
          </Panel>

          <Panel>
            <PanelHeader title="Dangerous shapes" icon={ShieldAlert} meta={`${data.l3.counts.dangerous} patterns · ${data.l3.location}`} />
            <ShapeList items={data.l3.dangerous} />
          </Panel>

          <Panel>
            <PanelHeader title="Credential paths" icon={KeyRound} meta={`${data.l3.counts.credential} patterns`} />
            <ShapeList items={data.l3.credential} />
          </Panel>

          <Panel>
            <PanelHeader title="Injection shapes" icon={MessageCircleWarning} meta={`${data.l3.counts.injection} patterns`} />
            <ShapeList items={data.l3.injection} />
          </Panel>

          <Panel>
            <PanelHeader
              title="Permission cache & recent decisions"
              icon={Database}
              meta={data.telemetry.permissionCache.exists ? `${data.telemetry.permissionCache.entryCount} cached allow decisions` : "cache file not created yet"}
            />
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div className="text-[12px] text-ink-3 space-y-1">
                <div><span className="text-ink-2">Cache path:</span> <span className="mono">{data.telemetry.permissionCache.path}</span></div>
                <div><span className="text-ink-2">Oldest entry:</span> {formatTs(data.telemetry.permissionCache.oldestTs)}</div>
                <div><span className="text-ink-2">Newest entry:</span> {formatTs(data.telemetry.permissionCache.newestTs)}</div>
              </div>
              <div className="text-[12px] text-ink-3 space-y-1">
                <div><span className="text-ink-2">Decisions log:</span> <span className="mono">{data.telemetry.decisions.path}</span></div>
                <div>
                  <span className="text-ink-2">By decision:</span>{" "}
                  {Object.entries(data.telemetry.decisions.byDecision).length === 0
                    ? "—"
                    : Object.entries(data.telemetry.decisions.byDecision).map(([k, v]) => `${k}=${v}`).join(", ")}
                </div>
              </div>
            </div>
            {data.telemetry.decisions.recent.length === 0 ? (
              <div className="text-[12px] text-ink-3">
                No PermissionRequest classifications logged yet. hooks/Safety.hook.ts writes a line here every time the
                PermissionRequest path classifies a Bash/Write/Edit/MultiEdit/mcp__ call.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line-1">
                      <th className="text-left py-2 pr-3 text-ink-3">Time</th>
                      <th className="text-left py-2 pr-3 text-ink-3">Tool</th>
                      <th className="text-left py-2 pr-3 text-ink-3">Command prefix</th>
                      <th className="text-left py-2 pr-3 text-ink-3">Decision</th>
                      <th className="text-left py-2 pr-3 text-ink-3">Cache</th>
                      <th className="text-left py-2 text-ink-3">Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.telemetry.decisions.recent.map((d, i) => (
                      <tr key={i} className="border-b border-line-1">
                        <td className="py-2 pr-3 text-ink-3 whitespace-nowrap">{formatTs(d.ts)}</td>
                        <td className="py-2 pr-3 text-ink-1">{d.tool}</td>
                        <td className="py-2 pr-3 mono text-ink-2 max-w-[240px] truncate" title={d.cmd_prefix}>{d.cmd_prefix}</td>
                        <td className="py-2 pr-3">
                          <Pill dim={d.decision === "allow" ? "ok" : "neutral"}>{d.decision}</Pill>
                        </td>
                        <td className="py-2 pr-3 text-ink-3">{d.cache}</td>
                        <td className="py-2 text-ink-3">{d.reasons?.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel className="opacity-85">
            <div className="text-xs text-ink-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Generated {formatTs(data.generatedAt)}. Full model: <span className="mono">LIFEOS/DOCUMENTATION/Security/README.md</span>
            </div>
          </Panel>
        </>
      )}
    </PageShell>
  );
}
