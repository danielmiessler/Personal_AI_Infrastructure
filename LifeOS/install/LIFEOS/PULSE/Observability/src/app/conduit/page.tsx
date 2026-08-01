"use client";

import { useEffect, useState } from "react";
import { Radar, Circle, GitCommit, Cpu, MonitorSmartphone, Sparkles } from "lucide-react";
import { PageShell, PageHeader, Panel, PanelHeader, StatTile, EmptyState } from "@/components/ui/chrome";

/**
 * Conduit tab — LifeOS's sensory layer. This component holds ZERO data; it fetches
 * everything live from /api/conduit/* (which reads USER/CONDUIT) and renders it.
 * Data/code separated by construction. The content-type read comes from a CACHED
 * hourly insight file — this component NEVER calls a model on load.
 */

interface Block { label: string; kind: "creation" | "consumption" | "neutral"; minutes: number }
interface DailyRecord {
  date: string;
  conduitVersion: string;
  totalMinutes: number;
  creationMinutes: number;
  consumptionMinutes: number;
  neutralMinutes: number;
  blocks: Block[];
  commits: number;
  sessions: number;
}
interface SourceStatus {
  id: string; label: string; captures: string; eventType: string;
  enabled: boolean; pollIntervalSec: number; eventsToday: number; lastEventTs: string | null;
}
interface SourcesReport { pollIntervalSec: number; date: string; sources: SourceStatus[] }
interface ContentType { label: string; share: number; evidence: string }
interface Insight {
  available: boolean; date: string; generatedAt?: string; level?: string; model?: string;
  eventsConsidered?: number; narrative: string; contentTypes: ContentType[];
  /** True while an on-demand run is in flight server-side. public PR #1647, @elhoim */
  building?: boolean;
}

const hm = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
const ratioPct = (r: DailyRecord) =>
  r.creationMinutes + r.consumptionMinutes > 0
    ? Math.round((r.creationMinutes / (r.creationMinutes + r.consumptionMinutes)) * 100)
    : 0;

const kindColor: Record<string, string> = {
  creation: "text-ok",
  consumption: "text-warn",
  neutral: "text-ink-2",
};

const sourceIcon: Record<string, React.ReactNode> = {
  appFocus: <MonitorSmartphone className="w-4 h-4" />,
  git: <GitCommit className="w-4 h-4" />,
  claudeSession: <Cpu className="w-4 h-4" />,
};

// Cool→warm cycle for content-type bars, drawn from the life-dimension tokens.
const themeColors = [
  "var(--freedom)", "var(--health)", "var(--relationships)", "var(--money)", "var(--creative)", "var(--rhythms)",
];

function ago(ts: string | null | undefined): string {
  if (!ts) return "—";
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return "—";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export default function ConduitPage() {
  const [today, setToday] = useState<DailyRecord | null>(null);
  const [recent, setRecent] = useState<DailyRecord[]>([]);
  const [sources, setSources] = useState<SourcesReport | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Locally-known "a run is in flight". The server is the authority (it reports
  // `building` on /insight), but the button has to respond to the click before the
  // first poll comes back. public PR #1647, @elhoim
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    fetch("/api/conduit/today").then((r) => r.json()).then(setToday).catch((e) => setError(String(e)));
    fetch("/api/conduit/recent?days=7").then((r) => r.json()).then((d) => Array.isArray(d) && setRecent(d)).catch(() => {});
    fetch("/api/conduit/sources").then((r) => r.json()).then(setSources).catch(() => {});
    fetch("/api/conduit/insight").then((r) => r.json()).then(setInsight).catch(() => {});
  }, []);

  // Poll while a run is in flight; stop as soon as the server says it's done.
  // The insight job is an inference call — seconds, not milliseconds — so the
  // POST returns 202 immediately and the result arrives through this poll.
  useEffect(() => {
    if (!building) return;
    let cancelled = false;
    const id = setInterval(async () => {
      try {
        const next: Insight = await (await fetch("/api/conduit/insight")).json();
        if (cancelled) return;
        setInsight(next);
        if (!next.building) setBuilding(false);
      } catch {
        /* transient — keep polling until the timeout below */
      }
    }, 3000);
    // Hard stop so a server-side crash can't leave the button spinning forever.
    const timeout = setTimeout(() => setBuilding(false), 180_000);
    return () => { cancelled = true; clearInterval(id); clearTimeout(timeout); };
  }, [building]);

  async function runInsight() {
    setBuilding(true);
    try {
      await fetch("/api/conduit/insight/build", { method: "POST" });
    } catch (e) {
      setBuilding(false);
      setError(String(e));
    }
  }

  const pollSec = sources?.pollIntervalSec;

  return (
    <PageShell className="max-w-[1100px]">
      <PageHeader
        icon={Radar}
        title="Conduit"
        subtitle={
          <>
            What LifeOS is seeing — local activity capture{pollSec ? `, polling every ${pollSec}s` : ""}, rolled up
            deterministically. All data under USER/CONDUIT; nothing leaves the machine.
          </>
        }
      />

      {error && <div className="text-warn text-sm">Couldn&apos;t reach Conduit API: {error}</div>}
      {!today && !error && <div className="text-ink-3 text-sm">Loading…</div>}

      {today && (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile label="Creation ratio" value={`${ratioPct(today)}%`} dim="ok" />
            <StatTile label="Tracked today" value={hm(today.totalMinutes)} />
            <StatTile label="LifeOS sessions" value={String(today.sessions)} />
            <StatTile label="Commits" value={String(today.commits)} />
          </div>

          {/* What's flowing in — the hourly content-type read */}
          <Panel>
            <PanelHeader
              icon={Sparkles}
              title="What's flowing in"
              actions={
                <span className="flex items-center gap-3">
                  <span className="text-[12px] text-ink-3 mono">
                    {insight?.available
                      ? `hourly read · ${insight.level ?? "low"} · updated ${ago(insight.generatedAt)}`
                      : "hourly read"}
                  </span>
                  <button
                    type="button"
                    onClick={runInsight}
                    disabled={building}
                    className="text-[12px] mono px-2 py-1 rounded border border-ink-3/30 text-ink-2 hover:text-ink-1 hover:border-ink-3/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {building ? "reading…" : "run now"}
                  </button>
                </span>
              }
            />
            {!insight && <div className="text-ink-3 text-sm">Loading…</div>}
            {insight && (
              <>
                <p className="text-ink-1 text-sm leading-relaxed mb-4">{insight.narrative}</p>
                {insight.contentTypes.length > 0 ? (
                  <div className="space-y-2.5">
                    {insight.contentTypes.map((t, i) => (
                      <ThemeBar key={t.label} t={t} color={themeColors[i % themeColors.length]} />
                    ))}
                  </div>
                ) : (
                  !insight.available && (
                    <div className="text-xs text-ink-3">
                      The insight job runs on the hour. Use <span className="text-ink-2 mono">run now</span> above, or
                      from a shell:{" "}
                      <code className="text-ink-2 mono">bun ~/.claude/LIFEOS/PULSE/Conduit/BuildInsight.ts</code>
                    </div>
                  )
                )}
              </>
            )}
          </Panel>

          {/* Sources & cadence */}
          <Section title="Sources & cadence">
            {!sources && <Row left="—" right="loading…" />}
            {sources?.sources.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span style={{ color: s.enabled ? "var(--accent-blue)" : "var(--ink-3)" }}>{sourceIcon[s.id]}</span>
                  <span className="min-w-0">
                    <span className="text-ink-1 flex items-center gap-2">
                      {s.label}
                      <span className={`inline-flex items-center gap-1 text-[10px] ${s.enabled ? "text-ok" : "text-ink-3"}`}>
                        <Circle className="w-1.5 h-1.5" style={{ fill: s.enabled ? "var(--ok)" : "var(--ink-3)" }} />
                        {s.enabled ? "on" : "off"}
                      </span>
                    </span>
                    <span className="block text-xs text-ink-3 truncate">{s.captures}</span>
                  </span>
                </span>
                <span className="flex items-center gap-4 shrink-0 text-right">
                  <span className="text-ink-3 text-xs">every {s.pollIntervalSec}s</span>
                  <span className="text-ink-2 tabular-nums w-20">{s.eventsToday} today</span>
                  <span className="text-ink-3 text-xs w-16">{ago(s.lastEventTs)}</span>
                </span>
              </div>
            ))}
          </Section>

          {/* Creation vs consumption bar */}
          <div>
            <div className="flex justify-between text-xs mb-1 gap-2">
              <span className="text-ok whitespace-nowrap">Creation {hm(today.creationMinutes)}</span>
              <span className="text-warn whitespace-nowrap">Consumption {hm(today.consumptionMinutes)}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "var(--surface-3)" }}>
              <div style={{ width: `${ratioPct(today)}%`, background: "var(--ok)" }} />
              <div className="flex-1" style={{ background: "var(--warn)" }} />
            </div>
          </div>

          {/* Where the time went */}
          <Section title="Where the time went (today)">
            {today.blocks.length === 0 && <Row left="—" right="no app-focus events yet" />}
            {today.blocks.map((b) => (
              <Row key={b.label} left={b.label} right={hm(b.minutes)} note={b.kind} noteClass={kindColor[b.kind]} />
            ))}
          </Section>

          {/* Recent days */}
          {recent.length > 0 && (
            <Section title="Recent days">
              {recent.map((r) => (
                <Row key={r.date} left={r.date} right={`${hm(r.totalMinutes)} · ${ratioPct(r)}% creation · ${r.sessions} sessions`} />
              ))}
            </Section>
          )}

          <div className="text-xs text-ink-3">
            Conduit v{today.conduitVersion} · local capture · all data under USER/CONDUIT
          </div>
        </>
      )}
    </PageShell>
  );
}

function ThemeBar({ t, color }: { t: ContentType; color: string }) {
  const pct = Math.round(t.share * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs mb-1.5">
        <span className="text-ink-1 whitespace-nowrap">{t.label}</span>
        <span className="text-ink-2 tabular-nums shrink-0">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
        <div style={{ width: `${Math.max(2, pct)}%`, height: "100%", background: color }} />
      </div>
      {t.evidence && <div className="text-[11px] text-ink-3 mt-1.5 truncate">{t.evidence}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="p-0 overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <PanelHeader title={title} className="mb-0" />
      </div>
      <div className="divide-y divide-line-1">{children}</div>
    </Panel>
  );
}

function Row({ left, right, note, noteClass }: { left: string; right: string; note?: string; noteClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-ink-2 truncate mr-3">{left}</span>
      <span className="flex items-center gap-3 shrink-0">
        {note && <span className={`text-xs ${noteClass ?? "text-ink-3"}`}>{note}</span>}
        <span className="text-ink-2 tabular-nums whitespace-nowrap">{right}</span>
      </span>
    </div>
  );
}
