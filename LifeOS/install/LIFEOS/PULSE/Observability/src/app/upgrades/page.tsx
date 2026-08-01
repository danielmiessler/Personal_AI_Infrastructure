"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ScrollText,
} from "lucide-react";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  Pill,
  EmptyState,
  dimStyle,
} from "@/components/ui/chrome";

interface QueueItem {
  id: string;
  claim: string;
  source: string;
  status: string;
  created: string;
  expires_in_days: number | null;
  confidence: number;
  target_surface: string;
  evidence_count: number;
  ledger_id: string | null;
  has_patch: boolean;
  recommendation: string;
}

interface QueueResponse {
  recommended: QueueItem[];
  implemented: QueueItem[];
  closed: QueueItem[];
  stats: {
    pending: number;
    implemented: number;
    closed: number;
    by_source: Record<string, number>;
  };
}

type ViewId = "recommended" | "implemented" | "closed";

const SOURCE_LABEL: Record<string, string> = {
  directive: "{{PRINCIPAL_NAME}} said",
  correction: "correction",
  "upgrade-skill": "upgrade scan",
  "algo-run": "/algo",
  autonomous: "autonomous",
  manual: "manual",
};

const SOURCE_DIM: Record<string, "ok" | "warn" | "err" | "relationships"> = {
  directive: "warn",
  correction: "err",
  "upgrade-skill": "ok",
  "algo-run": "ok",
  autonomous: "relationships",
  manual: "ok",
};

function formatTimestamp(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UpgradeCard({
  item,
  view,
  onAccept,
  onReject,
}: {
  item: QueueItem;
  view: ViewId;
  onAccept: (item: QueueItem) => void;
  onReject: (item: QueueItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const confidencePct = Math.round(item.confidence * 100);
  const expiresSoon = item.expires_in_days !== null && item.expires_in_days < 7;

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail) {
      setLoadingDetail(true);
      try {
        const resp = await fetch(`/api/upgrades/${encodeURIComponent(item.id)}`);
        if (resp.ok) setDetail(await resp.json());
      } finally {
        setLoadingDetail(false);
      }
    }
  }

  return (
    <Panel
      className="space-y-3"
      style={expiresSoon ? { borderColor: "var(--warn)" } : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0" style={dimStyle("relationships", true)}>
          <Sparkles size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-medium text-ink-1 leading-snug normal-case"
            style={{ fontFamily: "'concourse-t3', sans-serif" }}
          >
            {item.claim || item.id}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <Pill dim={SOURCE_DIM[item.source] ?? "ok"}>
              {SOURCE_LABEL[item.source] ?? item.source}
            </Pill>
            <Pill dim="ok">{confidencePct}%</Pill>
            {item.has_patch && <Pill dim="warn">PATCH → {item.target_surface}</Pill>}
            {!item.has_patch && item.target_surface !== "unknown" && (
              <span className="text-ink-3">
                → <span className="text-ink-2">{item.target_surface}</span>
              </span>
            )}
            {item.evidence_count > 0 && (
              <span className="text-ink-3">{item.evidence_count} signals</span>
            )}
            {item.ledger_id && (
              <span className="flex items-center gap-1 text-ink-3">
                <ScrollText size={11} />
                <span className="mono text-ink-2">{item.ledger_id}</span>
              </span>
            )}
            {item.expires_in_days !== null && (
              <span
                className={`flex items-center gap-1 ${
                  expiresSoon ? "text-warn font-semibold" : "text-ink-3"
                }`}
              >
                <Clock size={11} />
                expires in {item.expires_in_days}d
              </span>
            )}
            <span className="text-ink-3">{formatTimestamp(item.created)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {view === "recommended" && (
          <>
            <button
              onClick={() => onAccept(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={dimStyle("ok", true)}
            >
              <CheckCircle2 size={12} />
              {item.source === "autonomous" ? "Graduate" : "Accept"}
            </button>
            <button
              onClick={() => onReject(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={dimStyle("err", true)}
            >
              <XCircle size={12} />
              Reject
            </button>
          </>
        )}
        {view !== "recommended" && (
          <Pill dim={view === "implemented" ? "ok" : "err"}>{item.status}</Pill>
        )}
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-ink-2 hover:text-ink-1 hover:bg-surface-3 transition-colors ml-auto"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Hide" : "Detail"}
        </button>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-line-1 space-y-3 text-xs">
          {loadingDetail && <div className="text-ink-3 italic">Loading detail…</div>}
          {detail && (
            <>
              {(detail.recommendation || item.recommendation) && (
                <div>
                  <div className="text-ink-3 uppercase tracking-wide text-[13px] mb-1">
                    Recommendation
                  </div>
                  <p className="text-ink-2 whitespace-pre-wrap">
                    {detail.recommendation || item.recommendation}
                  </p>
                </div>
              )}
              {detail.current_state && (
                <div>
                  <div className="text-ink-3 uppercase tracking-wide text-[13px] mb-1">
                    Current State
                  </div>
                  <p className="text-ink-2 whitespace-pre-wrap">{detail.current_state}</p>
                </div>
              )}
              {detail.falsifier && (
                <div>
                  <div className="text-ink-3 uppercase tracking-wide text-[13px] mb-1">
                    Falsifier
                  </div>
                  <p className="text-ink-2">{detail.falsifier}</p>
                </div>
              )}
              {(detail.evidence_signals || detail.evidence)?.length > 0 && (
                <div>
                  <div className="text-ink-3 uppercase tracking-wide text-[13px] mb-1">
                    Evidence
                  </div>
                  <ul className="space-y-0.5 text-ink-2 mono">
                    {(detail.evidence_signals || detail.evidence)
                      .slice(0, 8)
                      .map((sig: string) => (
                        <li key={sig} className="truncate">
                          {sig}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {detail.proposed_patch && (
                <div>
                  <div className="text-ink-3 uppercase tracking-wide text-[13px] mb-1">
                    Proposed Patch (accepting applies it)
                  </div>
                  <pre className="text-ink-2 mono text-[11px] leading-snug whitespace-pre-wrap max-h-80 overflow-y-auto p-2 rounded bg-surface-3 border border-line-1">
                    {detail.proposed_patch}
                  </pre>
                </div>
              )}
              {detail.notes?.length > 0 && (
                <div>
                  <div className="text-ink-3 uppercase tracking-wide text-[13px] mb-1">
                    History
                  </div>
                  <ul className="space-y-0.5 text-ink-3 mono text-[11px]">
                    {detail.notes.map((n: string) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

export default function UpgradesPage() {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [view, setView] = useState<ViewId>("recommended");
  const [actionInFlight, setActionInFlight] = useState(false);

  const load = useCallback(async () => {
    try {
      const resp = await fetch("/api/upgrades");
      if (!resp.ok) {
        setError(`API returned ${resp.status}`);
        return;
      }
      setData((await resp.json()) as QueueResponse);
      setError(null);
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function performAction(item: QueueItem, action: "accept" | "reject", note?: string) {
    setActionInFlight(true);
    try {
      const resp = await fetch(
        `/api/upgrades/${encodeURIComponent(item.id)}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note: note || undefined }),
        }
      );
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        alert(`Failed: ${resp.status}${body.reason ? ` (${body.reason})` : ""}`);
        return;
      }
      await load();
    } finally {
      setActionInFlight(false);
    }
  }

  function handleAccept(item: QueueItem) {
    if (actionInFlight) return;
    const confirmed = window.confirm(
      item.has_patch
        ? "Accept AND APPLY this patch? The fixture is promoted and the regression suite runs — everything reverts if it goes red."
        : item.source === "autonomous"
          ? "Graduate this hypothesis to its target frame?"
          : "Accept this upgrade? It moves to accepted and waits for implementation (apply happens via the ledger flow)."
    );
    if (!confirmed) return;
    performAction(item, "accept");
  }

  function handleReject(item: QueueItem) {
    if (actionInFlight) return;
    const note = window.prompt("Reject reason (optional):") ?? "";
    performAction(item, "reject", note);
  }

  if (data === null && !error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-ink-3 text-sm">Loading upgrades…</div>
      </div>
    );
  }

  if (error) {
    return (
      <PageShell>
        <EmptyState
          icon={RefreshCw}
          title="Upgrades API not reachable"
          hint={<span className="mono">{error}</span>}
        />
      </PageShell>
    );
  }

  const q = data!;
  const items = view === "recommended" ? q.recommended : view === "implemented" ? q.implemented : q.closed;

  const VIEWS: { id: ViewId; label: string; count: number }[] = [
    { id: "recommended", label: "Recommended", count: q.stats.pending },
    { id: "implemented", label: "Implemented", count: q.stats.implemented },
    { id: "closed", label: "Rejected / Expired", count: q.stats.closed },
  ];

  return (
    <PageShell>
      <PageHeader
        icon={Sparkles}
        title="Upgrades"
        subtitle={
          <span className="max-w-2xl inline-block">
            The unified system-improvement queue — every candidate from every
            source: your directives ("from now on…"), harvested corrections,
            Upgrade-skill scans, /algo runs, and the autonomous deriver. Accept
            moves it forward; applying links it to the{" "}
            <code className="text-ink-2">Ledger</code>.
          </span>
        }
        actions={
          <span className="flex items-center gap-2 text-xs text-ink-3">
            <RefreshCw size={12} />
            {lastFetch ? `synced ${formatTimestamp(lastFetch.toISOString())}` : "syncing…"}
          </span>
        }
      />

      <div className="flex items-center gap-2 flex-wrap">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === v.id
                ? "text-ink-1 bg-surface-3 border border-line-1"
                : "text-ink-3 hover:text-ink-1"
            }`}
          >
            {v.label} <span className="mono">{v.count}</span>
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 text-xs text-ink-3">
          {Object.entries(q.stats.by_source).map(([s, n]) => (
            <span key={s}>
              {SOURCE_LABEL[s] ?? s}: <span className="text-ink-2 mono">{n}</span>
            </span>
          ))}
        </span>
      </div>

      {items.length === 0 ? (
        view === "recommended" ? (
          <EmptyStateGuide
            section="Upgrades"
            description="No pending upgrade candidates. Directives and corrections land here the turn they happen; the deriver adds up to 3 autonomous candidates nightly; Upgrade-skill and /algo runs persist their recommendations here."
            hideInterview
            daPromptExample="run an upgrade scan"
          />
        ) : (
          <EmptyState icon={Sparkles} title={`Nothing ${view} yet`} />
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <UpgradeCard
              key={item.id}
              item={item}
              view={view}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      <div className="text-[12px] text-ink-3 mono pt-2 border-t border-line-1">
        sources: MEMORY/UPGRADES/records/ + WISDOM/FRAMES/_hypotheses/ · api:
        /api/upgrades · capture: SatisfactionCapture.hook · applied half: /ledger
      </div>
    </PageShell>
  );
}
