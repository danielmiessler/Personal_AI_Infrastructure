"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { wikiPageUrl } from "@/lib/wiki-links";
import {
  Share2,
  ArrowRight,
  Library,
  Table2,
  Bookmark,
  Database,
  GitBranch,
  CircleDot,
  Sparkles,
  Radio,
  BarChart3,
  BookOpen,
  FileText,
  CircleCheck,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  TabBar,
  Pill,
  EmptyState,
  dimStyle,
  type Dim,
  type TabSpec,
} from "@/components/ui/chrome";

/**
 * Synapse tab — the input router (capture → journal → grade → route), made visible.
 *
 * Three tabs, stream-first:
 *   STREAM (default) — unified reverse-chron feed of new content from ALL
 *     sources (ledger captures, Knowledge notes, X-bookmark issues), origin
 *     filters, 60s auto-refresh.
 *   STATS  — the live numbers: tiles, knowledge by type, ledger by source,
 *     spreadsheet paths.
 *   SYSTEM — the documentation: the five-stage loop, the input catalog, and
 *     how this page gets its numbers.
 *
 * Holds ZERO data: everything comes from /api/synapse (the Pulse synapse module),
 * which composes the ledger worker, KNOWLEDGE scan, KV bookmark count, and
 * local _X state server-side. No secrets ever reach this bundle.
 */

interface RecentCapture {
  source: string;
  score: number | null;
  title: string | null;
  url: string | null;
  captured_at: string;
  status: string;
  note: { category: string; slug: string } | null;
}
interface RecentNote {
  title: string;
  category: string;
  slug: string;
  type: string;
  created: string;
}
interface RecentIssue {
  issue: number;
  url: string;
  created_at: string;
}
interface SynapseInput {
  n: number;
  name: string;
  trigger: string;
  component: string;
  status: "live" | "roadmap";
  ledger_count: number | null;
}
interface SheetPath { name: string; count: number | null; note: string }
interface SynapseData {
  generated_at: string;
  ledger: {
    total: number;
    by_source: Record<string, number>;
    by_status: Record<string, number>;
    captured: number;
    routed: number;
    recent: RecentCapture[];
  } | null;
  knowledge: {
    total: number;
    last7d: number;
    last30d: number;
    amber_promoted: number;
    by_type: Record<string, { total: number; last7d: number; last30d: number }>;
    recent: RecentNote[];
  } | null;
  bookmarks: {
    cloud_parsed: number | null;
    local_seen: number;
    issues_created: number;
    issues_skipped: number;
    recent_issues: RecentIssue[];
  };
  sheet: { paths: SheetPath[] };
  inputs: SynapseInput[];
  errors: Record<string, string> | null;
}

type TabId = "stream" | "stats" | "system";
const TABS: TabSpec<TabId>[] = [
  { id: "stream", label: "Stream", icon: Radio, dim: "money" },
  { id: "stats", label: "Stats", icon: BarChart3, dim: "money" },
  { id: "system", label: "System", icon: BookOpen, dim: "money" },
];

type StreamKind = "capture" | "note" | "issue";
interface StreamItem {
  kind: StreamKind;
  origin: string; // ledger source, "knowledge", or "x-bookmarks"
  title: string;
  href: string | null; // external link
  internal: string | null; // in-Pulse link (knowledge wiki)
  score: number | null;
  routed: boolean;
  note: { category: string; slug: string } | null;
  ts: string;
}

const REFRESH_MS = 60_000;

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

const nf = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString());

// Synapse's own hue (money token) marks captures; notes ride the ok token, issues the relationships token.
const KIND_DIM: Record<StreamKind, Dim> = {
  capture: "money",
  note: "ok",
  issue: "relationships",
};

// The five-stage loop, rendered as a horizontal flow with live counts.
function FlowStage({ name, desc, count, dim }: { name: string; desc: string; count?: string; dim: Dim }) {
  return (
    <div className="flex-1 min-w-[150px] rounded-lg p-3" style={dimStyle(dim, true)}>
      <div className="text-[12px] font-semibold tracking-[0.12em] uppercase">{name}</div>
      <div className="text-[11px] text-ink-3 mt-1 leading-snug">{desc}</div>
      {count && <div className="text-lg font-semibold text-ink-1 mt-1.5 tabular-nums">{count}</div>}
    </div>
  );
}

export default function SynapsePage() {
  const [data, setData] = useState<SynapseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("stream");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    fetch("/api/synapse")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        setData(d);
        setError(null);
        setFetchedAt(Date.now());
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  // Initial load + 60s auto-refresh (module cache is 60s, so this is cheap).
  useEffect(() => {
    load();
    timer.current = setInterval(() => {
      load();
      forceTick((n) => n + 1); // re-render ages even if payload is cache-identical
    }, REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  // Hash deep-links: /synapse#stats, /synapse#system. Read once on mount.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "stats" || h === "system" || h === "stream") setTab(h as TabId);
  }, []);
  const switchTab = (t: TabId) => {
    setTab(t);
    window.history.replaceState(null, "", t === "stream" ? window.location.pathname : `#${t}`);
  };

  const L = data?.ledger;
  const K = data?.knowledge;
  const B = data?.bookmarks;
  const sourceEntries = Object.entries(L?.by_source ?? {}).sort((a, b) => b[1] - a[1]);

  // ── Unified stream: captures + notes + issues, merged reverse-chron ──
  const stream = useMemo<StreamItem[]>(() => {
    if (!data) return [];
    const items: StreamItem[] = [];
    const promotedSlugs = new Set<string>();
    for (const c of data.ledger?.recent ?? []) {
      if (c.note) promotedSlugs.add(c.note.slug);
      items.push({
        kind: "capture",
        origin: c.source,
        title: c.title || c.url || "(text note)",
        href: c.url,
        internal: null,
        score: c.score,
        routed: c.status === "routed",
        note: c.note,
        ts: c.captured_at,
      });
    }
    for (const n of data.knowledge?.recent ?? []) {
      // A promoted note already rides on its capture row — don't show it twice.
      if (promotedSlugs.has(n.slug)) continue;
      items.push({
        kind: "note",
        origin: "knowledge",
        title: n.title,
        href: null,
        internal: wikiPageUrl(encodeURIComponent(n.category), encodeURIComponent(n.slug)),
        score: null,
        routed: false,
        note: null,
        ts: n.created,
      });
    }
    for (const i of data.bookmarks?.recent_issues ?? []) {
      items.push({
        kind: "issue",
        origin: "x-bookmarks",
        title: `X bookmark → work issue #${i.issue}`,
        href: i.url,
        internal: null,
        score: null,
        routed: false,
        note: null,
        ts: i.created_at,
      });
    }
    return items.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  }, [data]);

  const origins = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of stream) counts.set(it.origin, (counts.get(it.origin) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [stream]);

  const visible = originFilter === "all" ? stream : stream.filter((i) => i.origin === originFilter);

  return (
    <PageShell className="max-w-[1200px]">
      {/* ── Header ── */}
      <PageHeader
        icon={Share2}
        title={
          <span className="flex items-center gap-3">
            Synapse
            <Pill dim="money">input router</Pill>
          </span>
        }
        subtitle="One contract in, the right home out — capture → amber ledger → grade → route → resurface."
      />

      {/* ── Tab bar ── */}
      <TabBar
        tabs={TABS}
        active={tab}
        onChange={switchTab}
        right={
          <div className="flex items-center gap-2 text-[11px] text-ink-3">
            <span
              className={error ? "inline-block w-1.5 h-1.5 rounded-full" : "inline-block w-1.5 h-1.5 rounded-full animate-pulse"}
              style={{ background: error ? "var(--err)" : "var(--ok)" }}
            />
            <span className="whitespace-nowrap">
              {error ? "offline" : fetchedAt ? `updated ${ago(new Date(fetchedAt).toISOString())} · auto 60s` : "loading…"}
            </span>
          </div>
        }
      />

      {error && <div className="text-warn text-sm">Couldn&apos;t reach the Synapse API: {error}</div>}
      {!data && !error && <div className="text-ink-3 text-sm">Loading…</div>}

      {/* ════ STREAM ════ */}
      {data && tab === "stream" && (
        <>
          {/* Compact stat strip */}
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px] text-ink-3">
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(L?.total ?? null)}</span> preserved</span>
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(L?.routed ?? 0)}</span> routed · <span className="text-ink-1 tabular-nums font-medium">{nf(L?.captured ?? 0)}</span> waiting</span>
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(K?.last7d ?? null)}</span> notes / 7d</span>
            <span><span className="text-ink-1 tabular-nums font-medium">{nf(B?.cloud_parsed ?? null)}</span> bookmarks / 90d</span>
          </div>

          {/* Origin filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setOriginFilter("all")}
              className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
              style={dimStyle("money", originFilter === "all")}
            >
              all <span className="tabular-nums opacity-70">{stream.length}</span>
            </button>
            {origins.map(([o, n]) => (
              <button
                key={o}
                onClick={() => setOriginFilter(originFilter === o ? "all" : o)}
                className="text-[11px] px-2.5 py-1 rounded-full mono transition-colors"
                style={dimStyle("money", originFilter === o)}
              >
                {o} <span className="tabular-nums opacity-70">{n}</span>
              </button>
            ))}
          </div>

          {/* The feed */}
          <Panel className="p-0 divide-y divide-line-1">
            {visible.length === 0 && <div className="p-4 text-sm text-ink-3">Nothing caught yet.</div>}
            {visible.map((it, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-2.5 text-sm min-w-0">
                <CircleDot className="w-3 h-3 shrink-0" style={{ color: `var(--${it.kind === "capture" ? "money" : it.kind === "note" ? "ok" : "relationships"})` }} />
                <span className="shrink-0 hidden sm:inline-flex">
                  <Pill dim={KIND_DIM[it.kind]} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5">
                    {it.kind}
                  </Pill>
                </span>
                <span className="mono text-[12px] text-ink-3 shrink-0 w-24 truncate">{it.origin}</span>
                <span className="flex-1 truncate text-ink-2">
                  {it.href ? (
                    <a href={it.href} target="_blank" rel="noreferrer" className="hover:text-ink-1 hover:underline">
                      {it.title}
                    </a>
                  ) : it.internal ? (
                    <a href={it.internal} className="hover:text-ink-1 hover:underline">
                      {it.title}
                    </a>
                  ) : (
                    it.title
                  )}
                </span>
                {it.note && (
                  <a
                    href={wikiPageUrl(encodeURIComponent(it.note.category), encodeURIComponent(it.note.slug))}
                    className="shrink-0 flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
                    style={dimStyle("ok", true)}
                  >
                    <Library className="w-3 h-3" />
                    note
                  </a>
                )}
                {it.routed && (
                  <span className="shrink-0 hidden md:flex items-center gap-1 text-[11px] text-ok">
                    <CircleCheck className="w-3 h-3" /> routed
                  </span>
                )}
                {it.score !== null && (
                  <span className="shrink-0 text-[11px] tabular-nums px-1.5 py-0.5 rounded" style={dimStyle("relationships", true)}>
                    {it.score}/10
                  </span>
                )}
                <span className="shrink-0 whitespace-nowrap text-[12px] text-ink-3 tabular-nums">{ago(it.ts)}</span>
              </div>
            ))}
          </Panel>
          <p className="text-[12px] text-ink-3">
            Merged live from three feeds: ledger captures (last 50), Knowledge Archive notes (30d), and X-bookmark work
            issues (30d). Paths without per-item records (browser hotkey → sheet) can&apos;t appear here — see System for why.
          </p>
        </>
      )}

      {/* ════ STATS ════ */}
      {data && tab === "stats" && (
        <>
          {/* ── What each number is ── */}
          <Panel className="text-[13px] leading-relaxed text-ink-2 space-y-1.5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 mb-2">What each number is</div>
            <div><span className="font-medium text-dim-money">The ledger</span> — the amber ledger, Synapse&apos;s permanent store (a D1 database). Every capture is written here the instant it&apos;s caught, before any grading. &ldquo;Preserved&rdquo; is its row count.</div>
            <div><span className="font-medium text-ok">Knowledge notes</span> — curated markdown notes in the Knowledge Archive (Ideas, Research, People…). The tile counts notes created across the <em>whole archive</em> by any pipeline (harvest, research, curation); &ldquo;via Synapse&rdquo; counts only notes Synapse promoted from the amber ledger.</div>
            <div><span className="font-medium text-dim-freedom">Spreadsheet</span> — the newsletter capture sheet the summarize worker appends to. Counts are per instrumented path; the browser-hotkey path has no counter yet.</div>
            <div><span className="font-medium text-dim-relationships">X bookmarks</span> — bookmarks the every-minute cloud cron pulled from X, summarized, and sent to the sheet (rolling 90 days), plus the local <span className="mono">tb</span> sweep that turns bookmarks into work issues.</div>
          </Panel>

          {/* ── Stats tiles ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <StatTile
              icon={Database}
              label="Preserved"
              value={nf(L?.total ?? null)}
              dim="money"
              sub="append-only D1 ledger rows"
            />
            <StatTile
              icon={GitBranch}
              label="Routed / waiting"
              value={`${nf(L?.routed ?? 0)} / ${nf(L?.captured ?? 0)}`}
              sub="routed to a home / caught, not yet routed"
            />
            <StatTile
              icon={Library}
              label="Knowledge notes"
              value={nf(K?.last7d ?? null)}
              dim="ok"
              sub={`created in 7d, whole archive · ${nf(K?.last30d ?? null)} in 30d · via Synapse: ${nf(K?.amber_promoted ?? null)}`}
            />
            <StatTile
              icon={Table2}
              label="To spreadsheet"
              value={nf((B?.cloud_parsed ?? 0) + (L?.by_source?.["surface"] ?? 0))}
              dim="freedom"
              sub="observed 90d: bookmark cron + Surface saves (hotkey path un-instrumented)"
            />
            <StatTile
              icon={Bookmark}
              label="X bookmarks"
              value={nf(B?.cloud_parsed ?? null)}
              dim="relationships"
              sub={`cloud cron, last 90d · ${nf(B?.local_seen ?? 0)} via local tb · ${nf(B?.issues_created ?? 0)} became issues`}
            />
          </div>

          {/* ── Knowledge base breakdown ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-1">Knowledge base — what got saved</h2>
            <p className="text-[12px] text-ink-3 mb-3">
              Notes created in the Knowledge Archive by <em>all</em> pipelines, by type.
              Synapse&apos;s own contribution is the &ldquo;via Synapse&rdquo; row — {nf(K?.amber_promoted ?? 0)} notes promoted from the
              ledger by the 30-min routing scheduler.
            </p>
            <Panel className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-3 border-b border-line-2">
                    <th className="px-4 py-2.5 font-medium">Note type</th>
                    <th className="px-4 py-2.5 font-medium text-right">7 days</th>
                    <th className="px-4 py-2.5 font-medium text-right">30 days</th>
                    <th className="px-4 py-2.5 font-medium text-right">All time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-1">
                  {Object.entries(K?.by_type ?? {})
                    .sort((a, b) => b[1].last30d - a[1].last30d || b[1].total - a[1].total)
                    .map(([type, c]) => (
                      <tr key={type}>
                        <td className="px-4 py-2.5 text-ink-1">{type}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{nf(c.last7d)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{nf(c.last30d)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink-3">{nf(c.total)}</td>
                      </tr>
                    ))}
                  <tr className="border-t border-line-2">
                    <td className="px-4 py-2.5 text-ok">via Synapse routing (all types)</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ok" colSpan={3}>{nf(K?.amber_promoted ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
            </Panel>
          </div>

          {/* ── Ledger by source + sheet paths ── */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">Ledger by source</h2>
              <Panel className="p-0 divide-y divide-line-1">
                {sourceEntries.length === 0 && <div className="p-4 text-sm text-ink-3">No captures yet.</div>}
                {sourceEntries.map(([source, n]) => (
                  <div key={source} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-ink-2 mono">{source}</span>
                    <span className="text-ink-1 tabular-nums">{nf(n)}</span>
                  </div>
                ))}
              </Panel>
            </div>
            <div>
              <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">Spreadsheet sends (per path)</h2>
              <Panel className="p-0 divide-y divide-line-1">
                {data.sheet.paths.map((p) => (
                  <div key={p.name} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-2 whitespace-nowrap">{p.name}</span>
                      <span className="text-ink-1 tabular-nums shrink-0">{nf(p.count)}</span>
                    </div>
                    <div className="text-[11px] text-ink-3 mt-1 leading-snug">{p.note}</div>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        </>
      )}

      {/* ════ SYSTEM ════ */}
      {data && tab === "system" && (
        <>
          <Panel className="text-[13px] leading-relaxed text-ink-2 max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3 mb-2">What Synapse is</div>
            <p className="mb-2">
              Synapse is the input router: anything worth keeping — a page, a tweet, a spoken thought, a feed item —
              gets caught by the nearest input, written to the amber ledger <em>before</em> any judgment,
              then graded against TELOS and routed to where it&apos;s useful: a Knowledge note, a work issue, a blog seed,
              the newsletter sheet.
            </p>
            <p>
              The name is the mechanic: a synapse is weighted transmission — grading sets the weight, routing propagates what clears the bar. The journal keeps the old name: like an insect in amber, nothing captured is ever lost, because the raw capture is preserved before any judgment can reject it.
            </p>
          </Panel>

          {/* ── The flow ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">The one loop</h2>
            <div className="flex flex-wrap items-stretch gap-2 mb-3">
              <FlowStage
                name="Capture"
                desc="8 live inputs, 3 roadmap — hotkey, bookmarks, harvest, voice, feed, Surface, CLI"
                count={`${data.inputs.filter((i) => i.status === "live").length} live inputs`}
                dim="freedom"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="Journal"
                desc="write-ahead to the amber ledger, before grading — nothing is ever lost"
                count={nf(L?.total ?? null)}
                dim="money"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="Grade"
                desc="scored against TELOS — is this good for what {{PRINCIPAL_NAME}} is actually doing?"
                dim="relationships"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="Route"
                desc="fan to KNOWLEDGE notes, Type:queue / Type:project issues, blog seeds, newsletter"
                count={`${nf(L?.routed ?? 0)} routed`}
                dim="ok"
              />
              <div className="hidden lg:flex items-center text-ink-3"><ArrowRight className="w-4 h-4" /></div>
              <FlowStage
                name="Resurface"
                desc="amber search · this page · promotion of the best rows to curated notes"
                dim="creative"
              />
            </div>
            <p className="text-[12px] text-ink-3">
              Destinations: KNOWLEDGE <span className="text-ink-2">idea</span> notes · work issues{" "}
              <span className="text-ink-2">Type:queue / Type:project</span> · newsletter sheet · blog seeds · feed source registry.
              Routing runs unattended every 30 min (<span className="text-ink-2">com.lifeos.amberroute</span>) and on demand via <span className="text-ink-2">amber route</span>.
            </p>
          </div>

          {/* ── Inputs catalog ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">Inputs — every way an idea gets caught</h2>
            <Panel className="p-0 overflow-x-auto mb-2">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-3 border-b border-line-2">
                    <th className="px-4 py-2.5 font-medium">#</th>
                    <th className="px-4 py-2.5 font-medium">Input</th>
                    <th className="px-4 py-2.5 font-medium">Trigger</th>
                    <th className="px-4 py-2.5 font-medium">Component</th>
                    <th className="px-4 py-2.5 font-medium text-right">Ledger rows</th>
                    <th className="px-4 py-2.5 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-1">
                  {data.inputs.map((i) => (
                    <tr key={i.n} className={i.status === "roadmap" ? "opacity-60" : ""}>
                      <td className="px-4 py-2.5 text-ink-3 tabular-nums">{i.n}</td>
                      <td className="px-4 py-2.5 text-ink-1">{i.name}</td>
                      <td className="px-4 py-2.5 text-ink-2">{i.trigger}</td>
                      <td className="px-4 py-2.5 text-ink-2 mono text-[12px]">{i.component}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">{i.ledger_count === null ? "—" : nf(i.ledger_count)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Pill dim={i.status === "live" ? "ok" : "neutral"} className="text-[11px] uppercase tracking-wider px-2 py-0.5">
                          {i.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
            <p className="text-[12px] text-ink-3">
              &ldquo;Ledger rows&rdquo; counts captures whose <span className="mono">source</span> tag maps to that input — inputs still
              dead-ending in the spreadsheet (hotkey, cloud bookmark cron) show &ldquo;—&rdquo; until Phase 3 wires them to the capture contract.
            </p>
          </div>

          {/* ── How this page works ── */}
          <div>
            <h2 className="text-sm uppercase tracking-[0.16em] text-ink-2 mb-3">How this page gets its numbers</h2>
            <Panel className="text-[13px] leading-relaxed text-ink-2 space-y-1.5 max-w-3xl">
              <div className="flex gap-2"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-dim-money" /><span><span className="text-ink-1">Ledger worker</span> — <span className="mono">/stats</span> and <span className="mono">/captures</span> on the D1-backed amber-ledger worker, bearer-authed server-side.</span></div>
              <div className="flex gap-2"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-ok" /><span><span className="text-ink-1">Knowledge Archive</span> — a frontmatter scan of <span className="mono">MEMORY/KNOWLEDGE</span> note files (<span className="mono">created:</span>, <span className="mono">source_amber_id:</span>).</span></div>
              <div className="flex gap-2"><FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-dim-relationships" /><span><span className="text-ink-1">X bookmarks</span> — SEEN_BOOKMARKS KV key count via the Cloudflare API, plus local <span className="mono">_X</span> state files for the <span className="mono">tb</span> sweep and issue creation.</span></div>
              <div className="pt-1">
                Everything is composed server-side by the Pulse <span className="mono">synapse</span> module (60s cache); no
                secrets reach the browser. Every number is a live probe of what actually ran — un-instrumented paths are
                labeled, never estimated.
              </div>
            </Panel>
          </div>
        </>
      )}

      {data && (
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <Sparkles className="w-3 h-3" />
          <span>
            generated {ago(data.generated_at)} · 60s cache
            {data.errors ? ` · degraded probes: ${Object.keys(data.errors).join(", ")}` : ""}
          </span>
        </div>
      )}
    </PageShell>
  );
}
