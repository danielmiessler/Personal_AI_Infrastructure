"use client";

/**
 * Ledger — the change-tracking read surface.
 * What changed, when, at what version, verified how — system edits and estate deploys.
 * Data: GET /api/ledger (modules/ledger.ts). This page holds zero data logic.
 */

import { useEffect, useState } from "react";
import {
  GitCommitVertical,
  Package,
  Rocket,
  ScrollText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import {
  EmptyState,
  PageHeader,
  PageShell,
  Panel,
  PanelHeader,
  Pill,
  StatTile,
  type Dim,
} from "@/components/ui/chrome";

interface LedgerPayload {
  generated_at: string;
  versions: { lifeos: string | null; algorithm: string | null; system_prompt: string | null };
  registry: {
    last_updated: string | null;
    total_updates: number | null;
    recent: {
      timestamp: string;
      title: string;
      significance: string | null;
      change_type: string | null;
      version: string | null;
      files: number;
    }[];
  } | null;
  deploys: {
    ts: string;
    project: string;
    target: string;
    domain: string | null;
    sha: string | null;
    version: string | null;
    ok: boolean;
  }[];
  integrity: {
    last_run: { ts: string; exitCode: number; blocking: number; info?: number } | null;
    clean: boolean | null;
  };
  drift: { ts: string; count: number; tag: string } | null;
  errors: string[];
}

const SIG_DIM: Record<string, Dim> = {
  critical: "err",
  major: "warn",
  moderate: "blue",
  minor: "neutral",
  trivial: "neutral",
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LedgerPage() {
  const [data, setData] = useState<LedgerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/ledger")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((j) => alive && setData(j))
        .catch((e) => alive && setError(String(e)));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Ledger" icon={ScrollText} subtitle="Change tracking" />
        <EmptyState icon={ScrollText} title="Ledger API unreachable" hint={error} />
      </PageShell>
    );
  }

  const integrityClean = data?.integrity?.clean;
  const driftCount = data?.drift?.count ?? 0;

  return (
    <PageShell>
      <PageHeader
        title="Ledger"
        icon={ScrollText}
        subtitle="What changed, when, at what version — system edits and estate deploys"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatTile label="LifeOS" value={data?.versions?.lifeos ?? "—"} icon={Package} />
        <StatTile label="Algorithm" value={data?.versions?.algorithm ?? "—"} icon={Workflow} />
        <StatTile label="Prompt" value={data?.versions?.system_prompt ?? "—"} icon={ScrollText} />
        <StatTile
          label="Updates"
          value={data?.registry?.total_updates ?? "—"}
          icon={GitCommitVertical}
          sub={data?.registry?.last_updated ? `last ${timeAgo(data.registry.last_updated)}` : undefined}
        />
        <StatTile
          label="Integrity"
          value={integrityClean == null ? "—" : integrityClean ? "clean" : "blocked"}
          dim={integrityClean == null ? "neutral" : integrityClean ? "ok" : "err"}
          icon={ShieldCheck}
          sub={data?.integrity?.last_run ? timeAgo(data.integrity.last_run.ts) : "no run recorded"}
        />
        <StatTile
          label="Drift"
          value={driftCount}
          unit="files"
          dim={driftCount >= 10 ? "warn" : "ok"}
          icon={Rocket}
          sub={data?.drift?.tag ? `since ${data.drift.tag}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel>
          <PanelHeader
            title="System updates"
            icon={GitCommitVertical}
            meta={data?.registry ? `latest ${data.registry.recent.length}` : undefined}
          />
          {data?.registry?.recent?.length ? (
            <ul className="flex flex-col divide-y divide-line-2">
              {data.registry.recent.map((u, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <Pill dim={SIG_DIM[u.significance ?? ""] ?? "neutral"}>{u.significance ?? "?"}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink-1 truncate">{u.title}</div>
                    <div className="text-[12px] text-ink-3 mono">
                      {timeAgo(u.timestamp)}
                      {u.version ? ` · v${u.version}` : ""}
                      {u.change_type ? ` · ${u.change_type}` : ""}
                      {u.files ? ` · ${u.files} files` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={GitCommitVertical} title="No registry entries readable" />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Estate deploys"
            icon={Rocket}
            meta={data ? `latest ${data.deploys.length}` : undefined}
          />
          {data?.deploys?.length ? (
            <ul className="flex flex-col divide-y divide-line-2">
              {data.deploys.map((d, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <Pill dim={d.ok ? "ok" : "err"}>{d.ok ? "ok" : "fail"}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink-1 truncate">
                      {d.project}
                      {d.domain ? <span className="text-ink-3"> · {d.domain}</span> : null}
                    </div>
                    <div className="text-[12px] text-ink-3 mono">
                      {timeAgo(d.ts)} · {d.target}
                      {d.version ? ` · v${d.version}` : d.sha ? ` · ${d.sha}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Rocket}
              title="No deploy events yet"
              hint="Every gated deploy records here via LedgerDeployEvent — events accumulate as projects ship."
            />
          )}
        </Panel>
      </div>
    </PageShell>
  );
}
