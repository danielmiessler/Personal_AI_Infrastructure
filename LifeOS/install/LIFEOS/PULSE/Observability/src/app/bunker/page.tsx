"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageShell, PageHeader, Panel, PanelHeader, Pill, EmptyState, type Dim } from "@/components/ui/chrome";
import { Container } from "lucide-react";

// ── Bunker: the application-harness readout. Each app is a bay with ISA probes. ──

interface Probe { isc: string; check: string; status: string; detail: string }
interface AppSecurity {
  status: "green" | "orange" | "red";
  lastScan: string;
  targets: string[];
  fails: number;
  errors: number;
  failing: { target: string; category: string; check: string; severity: string }[];
}
interface App {
  name: string; type: string; dir: string; isaPath: string; url?: string;
  pass: number; fail: number; skip: number; og: boolean; favicon: boolean; shot: boolean; probes: Probe[];
  security?: AppSecurity | null;
}
interface Snapshot {
  apps: App[];
  summary: { apps: number; green: number; probesPass: number; probesTotal: number; manual: number };
  lastFetch: string | null;
}

function st(a: App): "ok" | "down" | "idle" {
  const total = a.pass + a.fail;
  if (total === 0) return "idle";
  return a.fail > 0 ? "down" : "ok";
}
// app/probe status → design-token dimension. ok=ok, down=err, idle=warn.
const stDim = (s: string): Dim => (s === "ok" ? "ok" : s === "down" ? "err" : "warn");
const dimVar = (d: Dim): string => `var(--${d === "blue" ? "accent-blue" : d === "neutral" ? "ink-3" : d})`;

// Security grade pill — every bay answers "last security check: when, and
// green/orange/red" without a click.
function SecPill({ sec }: { sec: AppSecurity | null | undefined }) {
  if (!sec) return <Pill dim="neutral" title="No cloud scan target matched this app">SEC · NO SCAN</Pill>;
  const dim: Dim = sec.status === "green" ? "ok" : sec.status === "orange" ? "warn" : "err";
  const t = new Date(sec.lastScan);
  const when = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <Pill dim={dim} title={`Last cloud security scan ${t.toLocaleString()} · ${sec.targets.join(", ")}${sec.errors ? ` · ${sec.errors} checks errored` : ""}`}>
      SEC {sec.status.toUpperCase()}{sec.fails > 0 ? ` · ${sec.fails}` : ""} · {when}
    </Pill>
  );
}

function planesForType(type: string): { plane: string; components: { name: string; live: boolean }[] }[] {
  const harness = { name: "test-harness", live: true };
  const health = { name: "health", live: true };
  const config = { name: "config + isa", live: true };
  if (type === "web-static") {
    return [
      { plane: "OBSERVABILITY", components: [{ name: "tracking (admin)", live: false }, health, { name: "cost", live: false }] },
      { plane: "DELIVERY", components: [{ name: "deploy (workers)", live: false }, { name: "brand assets", live: true }, { name: "link-gate", live: false }] },
      { plane: "QUALITY", components: [harness] },
      { plane: "CONTROL", components: [config, { name: "type playbook", live: false }] },
      { plane: "IDENTITY", components: [{ name: "auth", live: false }, { name: "user/auth logs", live: false }] },
      { plane: "SECURITY", components: [{ name: "secrets / scanning / headers", live: false }] },
    ];
  }
  return [
    { plane: "QUALITY", components: [harness] },
    { plane: "OBSERVABILITY", components: [health, { name: "metrics", live: false }] },
    { plane: "CONTROL", components: [config, { name: "type playbook", live: false }] },
  ];
}

export default function BunkerPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/bunker", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      setData(await r.json());
      setError(null);
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id); }, []);

  const app = data?.apps.find((a) => a.name === selected) ?? null;

  return (
    <PageShell>
      <PageHeader
        icon={Container}
        title="Bunker"
        subtitle="Universal application harness · discovery-based registry · the harness speaks ISA"
        actions={
          <>
            <Pill dim="ok">
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)", animation: "pulse 2s ease-in-out infinite" }} />
              SYSTEMS ONLINE
            </Pill>
            {data && (
              <Pill dim={data.summary.probesPass === data.summary.probesTotal ? "ok" : "warn"}>
                {data.summary.apps} APPS · {data.summary.probesPass}/{data.summary.probesTotal} ✓
              </Pill>
            )}
          </>
        }
      />

      {error && (
        <Panel style={{ borderLeftWidth: 2, borderLeftColor: "var(--err)" }}>
          <span style={{ color: "var(--err)" }}>SIGNAL LOST · /api/bunker — {error}</span>
        </Panel>
      )}
      {!data && !error && <EmptyState title="Establishing link…" />}

      {data && !app && (
        <>
          <Bays data={data} onOpen={setSelected} />
          <SiteHealthPanel />
          <ArbolPanel />
          <CostPanel />
        </>
      )}
      {data && app && <Readout app={app} onBack={() => setSelected(null)} />}

      {data && (
        <div className="text-[11px] tracking-[0.12em] text-ink-3">
          {data.lastFetch ? `LAST SCAN ${new Date(data.lastFetch).toLocaleTimeString()} · ` : ""}discovery-based registry
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </PageShell>
  );
}

function Thumb({ app, w, h }: { app: App; w: number; h: number }) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  // Prefer the real live-page screenshot (bunker shots), then the OG image, then the tile.
  const kind = app.shot && !broken.shot ? "shot" : app.og && !broken.og ? "og" : null;
  if (kind) {
    return (
      <img
        src={`/api/bunker/asset?app=${encodeURIComponent(app.name)}&kind=${kind}`}
        alt={app.name}
        onError={() => setBroken((b) => ({ ...b, [kind]: true }))}
        className="border border-line-2"
        style={{ width: w, height: h, objectFit: "cover", objectPosition: "top", borderRadius: 3, flex: "none", background: "var(--ground)" }}
      />
    );
  }
  return (
    <div
      className="border border-line-2 text-ink-3"
      style={{ width: w, height: h, borderRadius: 3, flex: "none", background: "var(--ground)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: h > 60 ? 22 : 13 }}
    >
      {app.type === "cli" ? "›_" : app.name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const PAGE_SIZE = 10;

function Bays({ data, onOpen }: { data: Snapshot; onOpen: (n: string) => void }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(data.apps.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = data.apps.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);
  const pager = pages > 1 && (
    <div className="flex items-center gap-4 text-[12px] tracking-[0.14em]">
      <button
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={cur === 0}
        className="cursor-pointer disabled:cursor-default"
        style={{ background: "none", border: "none", padding: 0, color: cur === 0 ? "var(--ink-3)" : "var(--accent-blue)" }}
      >◂ PREV</button>
      <span className="text-ink-3">PAGE {cur + 1}/{pages} · {data.apps.length} APPS</span>
      <button
        onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
        disabled={cur >= pages - 1}
        className="cursor-pointer disabled:cursor-default"
        style={{ background: "none", border: "none", padding: 0, color: cur >= pages - 1 ? "var(--ink-3)" : "var(--accent-blue)" }}
      >NEXT ▸</button>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PanelHeader title={`Application Bays (${data.apps.length})`} />
        {pager}
      </div>
      {shown.map((a) => {
        const dim = stDim(st(a));
        const c = dimVar(dim);
        const total = a.pass + a.fail;
        const pct = total === 0 ? 0 : Math.round((a.pass / total) * 100);
        return (
          <Panel
            key={a.name}
            hover
            onClick={() => onOpen(a.name)}
            className="flex flex-row items-center gap-4 cursor-pointer"
            style={{ borderLeftWidth: 2, borderLeftColor: c }}
          >
            <Thumb app={a} w={132} h={70} />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, flex: "none" }} />
                <span className="text-ink-1" style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.02em" }}>{a.name}</span>
                <Pill dim="neutral">{a.type.toUpperCase()}</Pill>
                <SecPill sec={a.security} />
              </div>
              <div className="flex items-center gap-2.5">
                <div className="bg-surface-1 rounded-[3px] overflow-hidden" style={{ height: 5, width: 180, maxWidth: "40vw", flex: "none" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: c }} />
                </div>
                <span style={{ fontSize: 12, color: c, letterSpacing: "0.06em" }}>{total === 0 ? "NO PROBES" : `${a.pass}/${total}`}</span>
              </div>
            </div>
            <span className="text-ink-3" style={{ fontSize: 12, letterSpacing: "0.14em", flex: "none" }}>OPEN ▸</span>
          </Panel>
        );
      })}
      {pager}
      <Panel className="border-dashed text-ink-3 text-[12px] tracking-[0.1em]">+ ADOPT AN APP · bunker adopt &lt;dir&gt;</Panel>
    </div>
  );
}

function Readout({ app, onBack }: { app: App; onBack: () => void }) {
  const dim = stDim(st(app));
  const c = dimVar(dim);
  const total = app.pass + app.fail;
  const pct = total === 0 ? 0 : Math.round((app.pass / total) * 100);

  return (
    <div className="flex flex-col gap-3.5">
      <button onClick={onBack} className="self-start text-[12px] tracking-[0.14em] cursor-pointer" style={{ background: "none", border: "none", color: "var(--accent-blue)", padding: 0 }}>◂ ALL BAYS</button>

      {(app.shot || app.og) && <Thumb app={app} w={1120} h={280} />}

      <div className="flex items-center gap-3 flex-wrap">
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, flex: "none" }} />
        <span className="text-ink-1" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.04em" }}>{app.name}</span>
        <Pill dim="neutral">{app.type.toUpperCase()}</Pill>
        <span style={{ fontSize: 13, color: c, letterSpacing: "0.08em" }}>{total === 0 ? "NO PROBES" : `${app.pass}/${total} · ${pct}%`}</span>
      </div>

      <RPanel title="Test Harness · ISA Criteria & Probes" live>
        {app.probes.map((p) => {
          const pd = stDim(p.status === "pass" ? "ok" : p.status === "fail" ? "down" : "idle");
          const pc = dimVar(pd);
          const tag = p.status === "pass" ? "[OK]" : p.status === "fail" ? "[XX]" : "[--]";
          return (
            <div key={p.isc} className="flex items-center gap-3 border-b border-line-1" style={{ padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: pc, flex: "none", width: 34 }} className="mono">{tag}</span>
              <span className="text-ink-3 mono" style={{ flex: "none", width: 52 }}>{p.isc}</span>
              <span className="text-ink-1 flex-1 min-w-0">{p.check}</span>
              <span className="text-ink-3" style={{ flex: "none" }}>{p.detail}</span>
            </div>
          );
        })}
      </RPanel>

      <RPanel title="Components · Six Planes" live>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 34, rowGap: 16 }}>
          {planesForType(app.type).map((pl) => (
            <div key={pl.plane}>
              <div className="text-[10px] tracking-[0.2em] mb-1.5" style={{ color: "var(--accent-blue)" }}>{pl.plane}</div>
              {pl.components.map((cp) => (
                <div key={cp.name} className="flex items-center gap-2" style={{ padding: "2px 0", fontSize: 13 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: cp.live ? "var(--ok)" : "var(--ink-3)", flex: "none" }} />
                  <span className="text-ink-2 flex-1 min-w-0">{cp.name}</span>
                  <span style={{ fontSize: 9, letterSpacing: "0.1em", color: cp.live ? "var(--ok)" : "var(--warn)", flex: "none" }}>{cp.live ? "LIVE" : "PENDING"}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </RPanel>

      <RPanel title="Live Metrics" live={false}>
        <p className="text-ink-3" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          NOT WIRED. Planned: admin tracking + a real-time viewers badge for this app, pageviews, per-app cloud cost. No fake numbers here.
        </p>
      </RPanel>
      <RPanel title="Identity & Logs" live={false}>
        <p className="text-ink-3" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          {app.type === "web-enterprise" ? "Auth: OIDC (planned)." : "Auth: none for this type."} User + auth logs sink: pending.
        </p>
      </RPanel>
      <RPanel title="Source" live>
        <div className="text-ink-3" style={{ fontSize: 12, lineHeight: 1.7 }} data-sensitive>
          <div>type&nbsp;&nbsp; {app.type}</div>
          <div>dir&nbsp;&nbsp;&nbsp;&nbsp; {app.dir}</div>
          <div>isa&nbsp;&nbsp;&nbsp;&nbsp; {app.isaPath}</div>
        </div>
      </RPanel>
    </div>
  );
}

// ── Cost: what the monitoring stack actually costs on Cloudflare. Real request
// counts from the CF analytics API, projected monthly and priced against the plan. ──

interface CostWorker { name: string; reqPerDay: number; reqPerMonth: number }
interface CostData {
  updatedAt: string;
  totalReqPerMonth: number;
  includedRequests: number;
  pctOfIncluded: number;
  marginalMonthly: number;
  standaloneMonthly: number;
  plan: string;
  workers: CostWorker[];
  error?: string;
}

const fmtN = (n: number): string => n.toLocaleString();

function CostPanel() {
  const [c, setC] = useState<CostData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/bunker/cost", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error ?? "HTTP " + r.status);
        setC(j); setErr(null);
      } catch (e) { setErr(String(e)); }
    };
    load();
    const id = setInterval(load, 60 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Panel style={{ borderLeftWidth: 2, borderLeftColor: err ? "var(--err)" : "var(--ok)" }}>
      <PanelHeader
        title="Monitoring Cost · Cloudflare"
        actions={
          c ? (
            <>
              <Pill dim="ok">${c.marginalMonthly.toFixed(2)}/mo MARGINAL</Pill>
              <Pill dim="neutral">{c.pctOfIncluded < 0.1 ? "<0.1" : c.pctOfIncluded.toFixed(1)}% OF INCLUDED</Pill>
            </>
          ) : (
            <Pill dim={err ? "err" : "neutral"}>{err ? "OFFLINE" : "…"}</Pill>
          )
        }
      />
      {err && <span style={{ color: "var(--err)", fontSize: 13 }}>SIGNAL LOST · /api/bunker/cost — {err}</span>}
      {c && (
        <>
          <p className="text-ink-2" style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 10px" }}>
            The uptime and security monitors run {fmtN(c.totalReqPerMonth)} worker requests/month, about{" "}
            {c.pctOfIncluded < 0.1 ? "under 0.1" : c.pctOfIncluded.toFixed(1)}% of the {fmtN(c.includedRequests / 1_000_000)}M included in the
            plan. Marginal cost is <strong style={{ color: "var(--ok)" }}>$0</strong> — it all sits inside the flat {c.plan}.
            Billed purely per-request it would be about ${c.standaloneMonthly.toFixed(2)}/month.
          </p>
          {c.workers.map((w) => (
            <div key={w.name} className="flex items-center gap-3 border-b border-line-1" style={{ padding: "5px 0", fontSize: 13 }}>
              <span className="text-ink-1 flex-1 min-w-0">{w.name}</span>
              <span className="text-ink-3 mono whitespace-nowrap" style={{ flex: "none" }}>{fmtN(w.reqPerDay)}/day</span>
              <span className="text-ink-2 mono whitespace-nowrap" style={{ flex: "none", width: 120, textAlign: "right" }}>{fmtN(w.reqPerMonth)}/mo</span>
            </div>
          ))}
          <div className="text-[11px] tracking-[0.12em] text-ink-3" style={{ paddingTop: 6 }}>
            LIVE FROM CLOUDFLARE ANALYTICS · updated {new Date(c.updatedAt).toLocaleTimeString()} · 24h window projected to 30.4 days
          </div>
        </>
      )}
    </Panel>
  );
}

// ── Site Health: the cloud uptime leg. Every deployed site checked every 5 min
// by the A_SITE_HEALTH worker (was a public dashboard, now authenticated and
// read into Pulse server-side). ──

interface SiteRow { name: string; url: string; state: string; lastCheck: string; since: string; spark: number[] }
interface SiteHealthData { total: number; red: number; degraded: number; updatedAt: string; apps: SiteRow[]; error?: string }

const siteDim = (s: string): Dim => (s === "green" ? "ok" : s === "degraded" ? "warn" : "err");

function SiteHealthPanel() {
  const [d, setD] = useState<SiteHealthData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/bunker/sitehealth", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error ?? "HTTP " + r.status);
        setD(j); setErr(null);
      } catch (e) { setErr(String(e)); }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const allGreen = d ? d.red === 0 && d.degraded === 0 : false;

  return (
    <Panel style={{ borderLeftWidth: 2, borderLeftColor: err ? "var(--err)" : "var(--accent-blue)" }}>
      <PanelHeader
        title="Cloud Uptime · Every Deployed Site"
        actions={
          d ? (
            <>
              <Pill dim="neutral">{d.total} SITES · 5-MIN</Pill>
              <Pill dim={allGreen ? "ok" : d.red > 0 ? "err" : "warn"}>
                {d.total - d.red - d.degraded} UP{d.degraded ? ` · ${d.degraded} DEGRADED` : ""}{d.red ? ` · ${d.red} DOWN` : ""}
              </Pill>
            </>
          ) : (
            <Pill dim={err ? "err" : "neutral"}>{err ? "OFFLINE" : "…"}</Pill>
          )
        }
      />
      {err && <span style={{ color: "var(--err)", fontSize: 13 }}>SIGNAL LOST · /api/bunker/sitehealth — {err}</span>}
      {d && (
        <>
          {[...d.apps].sort((a, b) => (siteDim(a.state) === "err" ? -1 : siteDim(b.state) === "err" ? 1 : 0)).map((s) => {
            const sd = siteDim(s.state);
            const col = dimVar(sd);
            return (
              <div key={s.name} className="flex items-center gap-3 border-b border-line-1" style={{ padding: "6px 0", fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: col, flex: "none" }} />
                <span className="text-ink-1" style={{ flex: "none", minWidth: 220 }}>{s.name}</span>
                <span style={{ color: col, flex: "none", width: 90, fontSize: 12, letterSpacing: "0.06em" }}>{s.state.toUpperCase()}</span>
                <span className="flex-1" />
                <span className="text-ink-3 whitespace-nowrap" style={{ flex: "none", fontSize: 12 }} title={`since ${new Date(s.since).toLocaleString()}`}>
                  checked {new Date(s.lastCheck).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
          <div className="text-[11px] tracking-[0.12em] text-ink-3" style={{ paddingTop: 6 }}>
            LAST CLOUD CHECK {new Date(d.updatedAt).toLocaleString()} · arbol worker A_SITE_HEALTH · 5-min cron · authenticated
          </div>
        </>
      )}
    </Panel>
  );
}

// ── Arbol: the cloud leg of the same uptime/security stack. Hourly worker scan
// over every deployed property; Bunker shows its last report next to the local
// probe results so one page carries the whole picture. ──

interface ArbolFail { target: string; category: string; check: string; severity: string }
interface ArbolData {
  timestamp: string;
  summary: { pass: number; fail: number; error: number; skip: number };
  targets: number;
  bySeverity: Record<string, number>;
  failing: ArbolFail[];
  error?: string;
}

const sevDim = (s: string): Dim => (s === "critical" || s === "high" ? "err" : s === "medium" ? "warn" : "neutral");

function ArbolPanel() {
  const [arbol, setArbol] = useState<ArbolData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/bunker/arbol", { cache: "no-store" });
        const j = await r.json();
        if (!r.ok || j.error) throw new Error(j.error ?? "HTTP " + r.status);
        setArbol(j);
        setErr(null);
      } catch (e) { setErr(String(e)); }
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  const shown = arbol ? (showAll ? arbol.failing : arbol.failing.slice(0, 10)) : [];

  return (
    <Panel style={{ borderLeftWidth: 2, borderLeftColor: err ? "var(--err)" : "var(--accent-blue)" }}>
      <PanelHeader
        title="Cloud Watch · Arbol Infra-Security"
        actions={
          arbol ? (
            <>
              <Pill dim="neutral">{arbol.targets} TARGETS · HOURLY</Pill>
              <Pill dim={arbol.summary.fail > 0 ? "warn" : "ok"}>
                {arbol.summary.pass} PASS · {arbol.summary.fail} FAIL · {arbol.summary.error} ERR
              </Pill>
              {Object.entries(arbol.bySeverity).map(([sev, n]) => (
                <Pill key={sev} dim={sevDim(sev)}>{n} {sev.toUpperCase()}</Pill>
              ))}
            </>
          ) : (
            <Pill dim={err ? "err" : "neutral"}>{err ? "OFFLINE" : "…"}</Pill>
          )
        }
      />
      {err && <span style={{ color: "var(--err)", fontSize: 13 }}>SIGNAL LOST · /api/bunker/arbol — {err}</span>}
      {arbol && (
        <>
          {shown.map((f, i) => (
            <div key={f.target + f.check + i} className="flex items-center gap-3 border-b border-line-1" style={{ padding: "6px 0", fontSize: 13 }}>
              <span className="mono" style={{ color: `var(--${sevDim(f.severity) === "err" ? "err" : sevDim(f.severity) === "warn" ? "warn" : "ink-3"})`, flex: "none", width: 76 }}>
                [{({ critical: "CRIT", high: "HIGH", medium: "MED", low: "LOW" } as Record<string, string>)[f.severity] ?? f.severity.toUpperCase().slice(0, 4)}]
              </span>
              <span className="text-ink-1" style={{ flex: "none", minWidth: 200 }}>{f.target}</span>
              <span className="text-ink-2 flex-1 min-w-0">{f.check}</span>
              <span className="text-ink-3" style={{ flex: "none" }}>{f.category}</span>
            </div>
          ))}
          {arbol.failing.length > 10 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="self-start text-[12px] tracking-[0.12em] cursor-pointer"
              style={{ background: "none", border: "none", color: "var(--accent-blue)", padding: "6px 0 0" }}
            >
              {showAll ? "◂ SHOW FEWER" : `SHOW ALL ${arbol.failing.length} FAILING ▸`}
            </button>
          )}
          <div className="text-[11px] tracking-[0.12em] text-ink-3" style={{ paddingTop: 6 }}>
            LAST CLOUD SCAN {new Date(arbol.timestamp).toLocaleString()} · arbol worker F_INFRA_SECURITY · hourly cron
          </div>
        </>
      )}
    </Panel>
  );
}

function RPanel({ title, live, children }: { title: string; live: boolean; children: ReactNode }) {
  return (
    <Panel style={{ borderLeftWidth: 2, borderLeftColor: live ? "var(--ok)" : "var(--warn)" }}>
      <PanelHeader
        title={title}
        actions={<Pill dim={live ? "ok" : "warn"}>{live ? "LIVE" : "PENDING"}</Pill>}
      />
      {children}
    </Panel>
  );
}
