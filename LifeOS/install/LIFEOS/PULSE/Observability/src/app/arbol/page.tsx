"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Cloud, ArrowLeft, Box, GitBranch, Timer, ShieldCheck, ShieldAlert, ChevronRight } from "lucide-react";
import Link from "next/link";
import EmptyStateGuide from "@/components/EmptyStateGuide";
import {
  PageShell,
  PageHeader,
  Panel,
  StatTile,
  Pill,
  type Dim,
} from "@/components/ui/chrome";

interface ArbolWorker {
  name: string;
  type: "action" | "pipeline" | "flow";
  cfName: string | null;
  lastModified: string;
}

interface ArbolDetail {
  name: string;
  type: "action" | "pipeline" | "flow";
  wrangler: string | null;
  source: string | null;
  lastModified: string;
}

const TYPE_CONFIG = {
  action: { icon: Box, color: "var(--creative)", label: "Action", prefix: "A_", dim: "creative" },
  pipeline: { icon: GitBranch, color: "var(--freedom)", label: "Pipeline", prefix: "P_", dim: "freedom" },
  flow: { icon: Timer, color: "var(--rhythms)", label: "Flow", prefix: "F_", dim: "rhythms" },
} as const;

// ── Security scan status strip (compact; links to the full Security view) ──
// Same private, runtime-only source as the Security page. Shows at-a-glance scan health
// here because the security scan runs on Arbol infrastructure — full detail lives on /security.
interface ScanSummary {
  scan: { timestamp: string | null; targetsScanned: number; findingCounts: { critical: number; high: number } } | null;
}

function relTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
}

function SecurityScanStrip() {
  const { data } = useQuery<ScanSummary>({
    queryKey: ["arbol-security-scan"],
    queryFn: async () => (await fetch("/api/security/attack-surface")).json(),
    refetchInterval: 60_000,
  });
  const scan = data?.scan;
  const crit = scan?.findingCounts?.critical ?? 0;
  const high = scan?.findingCounts?.high ?? 0;
  const clean = crit === 0 && high === 0;
  const Icon = clean ? ShieldCheck : ShieldAlert;

  return (
    <Link href="/security" className="block group">
      <Panel className="p-3 transition-colors hover:bg-[var(--surface-2)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${clean ? "text-ok" : "text-err"}`} />
            <span className="text-sm font-medium text-ink-1">Attack Surface Scan</span>
            <Pill dim={clean ? "ok" : "err"}>{clean ? "clean" : `${crit} critical · ${high} high`}</Pill>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-2">
            <span className="mono">{scan?.targetsScanned ?? "—"} targets</span>
            <span>hourly · {relTimeShort(scan?.timestamp)}</span>
            <span className="flex items-center gap-0.5 text-ink-3 group-hover:text-ink-1">details <ChevronRight className="w-3.5 h-3.5" /></span>
          </div>
        </div>
      </Panel>
    </Link>
  );
}

function ArbolLanding({
  workers,
  actions,
  pipelines,
  flows,
}: {
  workers: ArbolWorker[];
  actions: number;
  pipelines: number;
  flows: number;
}) {
  const grouped = {
    action: workers.filter((w) => w.type === "action"),
    pipeline: workers.filter((w) => w.type === "pipeline"),
    flow: workers.filter((w) => w.type === "flow"),
  };

  return (
    <PageShell>
      <PageHeader
        title="Arbol"
        subtitle="Cloud execution on Cloudflare Workers — actions (single units of work), pipelines (chained sequences), and flows (scheduled source-to-destination systems)."
        icon={Cloud}
        actions={<Pill dim="relationships">cloud mesh</Pill>}
      />

      <SecurityScanStrip />

      {workers.length === 0 && (
        <EmptyStateGuide
          section="Arbol Pipelines"
          description="Cloud-side actions and pipelines that compose into multi-step workflows — think Unix pipes for cron-driven AI work."
          hideInterview
          daPromptExample="help me set up my first Arbol action"
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total" value={workers.length} icon={Cloud} dim="relationships" />
        {(["action", "pipeline", "flow"] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const count = type === "action" ? actions : type === "pipeline" ? pipelines : flows;
          return (
            <StatTile
              key={type}
              label={`${cfg.label}s`}
              value={count}
              icon={cfg.icon}
              dim={cfg.dim as Dim}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["action", "pipeline", "flow"] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const typeWorkers = grouped[type];

          return (
            <div key={type} className="flex flex-col gap-3">
              <h2
                className="text-sm font-medium uppercase tracking-wider flex items-center gap-2 text-ink-3"
              >
                <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                {cfg.label}s
                <span className="text-ink-3 text-[12px]">({typeWorkers.length})</span>
              </h2>
              <div className="flex flex-col gap-2">
                {typeWorkers.map((worker) => (
                  <Link
                    key={worker.name}
                    href={`/arbol?name=${encodeURIComponent(worker.name)}`}
                    className="flex items-center gap-2 bg-surface-2 border border-line-2 rounded-xl px-3.5 py-2.5 transition-colors duration-200 hover:bg-surface-3 hover:border-line-3"
                    style={{ borderLeft: `3px solid ${cfg.color}` }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                    <span className="mono truncate text-ink-1 text-[13px]">
                      {worker.name.replace(/^_(A|P|F)_/, "")}
                    </span>
                    <Pill dim={cfg.dim as Dim} className="ml-auto">
                      {cfg.label}
                    </Pill>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

function ArbolDetailView({ detail }: { detail: ArbolDetail }) {
  const cfg = TYPE_CONFIG[detail.type];
  const Icon = cfg.icon;

  return (
    <PageShell className="max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/arbol" className="text-ink-2 hover:text-ink-1 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color: cfg.color }} />
            <Pill dim={cfg.dim as Dim}>{cfg.label}</Pill>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1 text-ink-1">{detail.name}</h1>
          <p className="mt-0.5 text-ink-3 text-[13px]">
            {new Date(detail.lastModified).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {detail.wrangler && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
            wrangler.jsonc
          </h2>
          <Panel className="p-0 overflow-hidden">
            <pre
              className="text-xs mono overflow-x-auto leading-relaxed p-4 text-ink-2"
              style={{ background: "var(--ground)", margin: 0 }}
            >
              <code>{detail.wrangler}</code>
            </pre>
          </Panel>
        </div>
      )}

      {detail.source && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-ink-3">
            src/index.ts
          </h2>
          <Panel className="p-0 overflow-hidden">
            <pre
              className="text-xs mono overflow-x-auto max-h-[600px] overflow-y-auto leading-relaxed p-4 text-ink-2"
              style={{ background: "var(--ground)", margin: 0 }}
            >
              <code>{detail.source}</code>
            </pre>
          </Panel>
        </div>
      )}

      {!detail.wrangler && !detail.source && (
        <p className="text-ink-2 text-sm">No readable files found in this worker.</p>
      )}
    </PageShell>
  );
}

function ArbolPageInner() {
  const searchParams = useSearchParams();
  const workerName = searchParams.get("name");
  const isViewing = !!workerName;

  const { data: listData } = useQuery<{
    workers: ArbolWorker[];
    total: number;
    actions: number;
    pipelines: number;
    flows: number;
  }>({
    queryKey: ["arbol-list"],
    queryFn: async () => {
      const res = await fetch("/api/wiki/arbol");
      if (!res.ok) throw new Error("Failed to fetch arbol workers");
      return res.json();
    },
    staleTime: 30_000,
    enabled: !isViewing,
  });

  const { data: detailData } = useQuery<ArbolDetail>({
    queryKey: ["arbol-detail", workerName],
    queryFn: async () => {
      const res = await fetch(`/api/wiki/arbol/${encodeURIComponent(workerName!)}`);
      if (!res.ok) throw new Error("Failed to fetch worker");
      return res.json();
    },
    enabled: isViewing,
  });

  if (isViewing && detailData) {
    return <ArbolDetailView detail={detailData} />;
  }

  if (!isViewing && listData) {
    return (
      <ArbolLanding
        workers={listData.workers}
        actions={listData.actions}
        pipelines={listData.pipelines}
        flows={listData.flows}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-ink-3 text-sm">Loading...</div>
    </div>
  );
}

export default function ArbolPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-ink-3 text-sm">Loading...</div>
        </div>
      }
    >
      <ArbolPageInner />
    </Suspense>
  );
}
