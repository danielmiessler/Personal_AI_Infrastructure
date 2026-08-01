/**
 * Bunker module — feeds the Pulse "Bunker" tab.
 *
 * Bunker (~/.claude/LIFEOS/PULSE/Bunker) is the source of truth. This module shells out to its
 * CLI (`bunker data`), caches the snapshot, and serves it at /api/bunker. Pulse only
 * displays; Bunker computes. CLI-as-contract keeps Pulse decoupled from bunker internals.
 *
 * Routes (all under /api/bunker):
 *   GET  /api/bunker          → { apps[], summary, lastFetch, stale }
 *   GET  /api/bunker/status   → module health
 *   GET  /api/bunker/arbol    → cloud infra-security scan (Arbol F_INFRA_SECURITY last report)
 *   POST /api/bunker/refresh  → force an immediate re-scan
 */

import { join } from "path";
import { existsSync, readFileSync } from "fs";

const HOME = process.env.HOME ?? "";
const MODULE = "bunker";
// Bunker CODE folded under Pulse (data/code separation); DATA (shots) lives in
// the USER config tree, so shot images are read from there, never from BUNKER_DIR.
const BUNKER_DIR = process.env.BUNKER_DIR || join(HOME, ".claude", "LIFEOS", "PULSE", "Bunker");
const BUNKER_BIN = join(BUNKER_DIR, "bin", "bunker.ts");
const BUNKER_SHOTS_DIR = join(HOME, ".config", "LIFEOS", "USER", "PULSE", "Bunker", "shots");

interface State {
  running: boolean;
  startedAt: Date | null;
  cache: any | null;
  lastFetch: Date | null;
  pollHandle: ReturnType<typeof setInterval> | null;
}

const state: State = { running: false, startedAt: null, cache: null, lastFetch: null, pollHandle: null };

// ASYNC, never sync (2026-07-26). The old spawnSync froze Pulse's entire event
// loop for the length of a `bunker data` run — and the moment Pulse itself was
// registered in Bunker, that run contained curl probes against :31337, which
// could never answer because the thread that would answer them was the one
// blocked waiting. Self-deadlock: every probe burned its full timeout, refresh
// took minutes, /health starved, and the daemon got SIGKILLed in a loop.
// Overlap guard + subprocess timeout keep one bounded scan in flight at most.
let refreshInFlight = false;
const REFRESH_TIMEOUT_MS = 4 * 60_000;

async function refresh(): Promise<{ ok: boolean; reason?: string }> {
  if (refreshInFlight) return { ok: false, reason: "refresh already in flight" };
  refreshInFlight = true;
  try {
    const proc = Bun.spawn(["bun", BUNKER_BIN, "data"], { stdout: "pipe", stderr: "pipe" });
    const timer = setTimeout(() => { try { proc.kill(); } catch { /* already gone */ } }, REFRESH_TIMEOUT_MS);
    const [out, errTxt, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    clearTimeout(timer);
    if (code !== 0) {
      return { ok: false, reason: `bunker data exit ${code}: ${errTxt.slice(0, 200)}` };
    }
    state.cache = JSON.parse(out);
    state.lastFetch = new Date();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err) };
  } finally {
    refreshInFlight = false;
  }
}

export async function start(): Promise<void> {
  console.log(`[${MODULE}] Starting...`);
  state.running = true;
  state.startedAt = new Date();
  // Fire-and-forget: a full scan can take minutes and module start gates the
  // HTTP server coming up. The tab renders "first scan pending" until it lands.
  refresh().then((r) => {
    if (!r.ok) console.warn(`[${MODULE}] initial refresh failed: ${r.reason}`);
  });
  // 5-min cadence, matching the launchd monitor. 60s meant a near-continuous
  // probe storm across every registered app for a display surface.
  state.pollHandle = setInterval(() => {
    refresh().catch((err) => console.error(`[${MODULE}] poll error: ${err}`));
  }, 300_000);
  console.log(`[${MODULE}] Polling ${BUNKER_BIN} every 300s (async)`);
}

export async function stop(): Promise<void> {
  console.log(`[${MODULE}] Stopping...`);
  state.running = false;
  if (state.pollHandle) {
    clearInterval(state.pollHandle);
    state.pollHandle = null;
  }
}

/** Is the Bunker implementation actually present on this install?
 *
 * `LIFEOS/PULSE/Bunker/**` is a containment zone: the concept ships via
 * DOCUMENTATION, the implementation stays private. This module ships. Before
 * 2026-07-31 it reported `healthy`/`stopped` regardless, so a public install
 * rendered a Bunker tab fronting a binary that cannot exist — the same
 * boundary-crossing defect as the Hermes manifest importing into the zone,
 * one layer up. Report absence honestly instead of a status. */
export function bunkerAvailable(): boolean {
  return existsSync(BUNKER_BIN);
}

export function health(): { status: string; details?: Record<string, unknown> } {
  if (!bunkerAvailable()) {
    return {
      status: "unavailable",
      details: {
        reason: "Bunker implementation not present on this install (private component)",
        bunker_dir: BUNKER_DIR,
      },
    };
  }
  return {
    status: state.running ? "healthy" : "stopped",
    details: {
      apps: state.cache?.summary?.apps ?? 0,
      last_fetch: state.lastFetch?.toISOString() ?? null,
      bunker_dir: BUNKER_DIR,
    },
  };
}

// ── Arbol cloud infra-security (F_INFRA_SECURITY worker) ──
// The hourly cloud scanner is part of the same uptime/security stack Bunker
// fronts. This proxies its last report so the token stays server-side and the
// tab shows cloud health next to the local probe results. Worker URL is derived
// from ~/.config/arbol/config.yaml (subdomain + auth_token) — nothing
// user-specific is hardcoded here (this file ships in releases).

interface ArbolCheck { target: string; category: string; check: string; status: string; evidence?: string; severity: string }
interface ArbolReport { timestamp: string; summary: { pass: number; fail: number; error: number; skip: number }; checks: ArbolCheck[] }

let arbolCache: { at: number; report: ArbolReport } | null = null;
let pentestCache: { at: number; online: boolean } | null = null;

// pentest_worker is an optional key naming the account's pentest-orchestrator
// worker. The name stays in the private config file — never in this source —
// so shipped code carries no private-security identifiers (G18).
function arbolConfig(): { subdomain: string; token: string; pentestWorker?: string } | null {
  try {
    const y = readFileSync(join(HOME, ".config", "arbol", "config.yaml"), "utf8");
    const subdomain = y.match(/^subdomain:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    const token = y.match(/^auth_token:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    const pentestWorker = y.match(/^pentest_worker:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
    if (!subdomain || !token) return null;
    return { subdomain, token, pentestWorker };
  } catch { return null; }
}

async function fetchArbolReport(): Promise<ArbolReport | null> {
  if (arbolCache && Date.now() - arbolCache.at < 5 * 60_000) return arbolCache.report;
  const cfg = arbolConfig();
  if (!cfg) return null;
  try {
    const r = await fetch(`https://arbol-f-infra-security.${cfg.subdomain}.workers.dev/report`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!r.ok) return null;
    const report = (await r.json()) as ArbolReport;
    arbolCache = { at: Date.now(), report };
    return report;
  } catch { return null; }
}

async function pentestOnline(): Promise<boolean | null> {
  if (pentestCache && Date.now() - pentestCache.at < 5 * 60_000) return pentestCache.online;
  const cfg = arbolConfig();
  if (!cfg?.pentestWorker) return null;
  try {
    const r = await fetch(`https://${cfg.pentestWorker}.${cfg.subdomain}.workers.dev/health`, { signal: AbortSignal.timeout(4000) });
    pentestCache = { at: Date.now(), online: r.ok };
    return r.ok;
  } catch {
    pentestCache = { at: Date.now(), online: false };
    return false;
  }
}

// Per-app security rollup: match arbol scan targets to an app by normalized
// name substring (an app usually deploys at a domain containing its name),
// aggregate that app's failing checks, and grade: red = critical/high failing,
// orange = medium/low failing, green = matched and clean. Null when no scan
// target matches the app.
export interface AppSecurity {
  status: "green" | "orange" | "red";
  lastScan: string;
  targets: string[];
  fails: number;
  errors: number;
  failing: { target: string; category: string; check: string; severity: string }[];
}

function securityForApp(appName: string, report: ArbolReport): AppSecurity | null {
  const name = appName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const checks = report.checks.filter((c) => c.target.toLowerCase().replace(/[^a-z0-9.]/g, "").includes(name));
  if (checks.length === 0) return null;
  const failing = checks.filter((c) => c.status === "fail");
  const errors = checks.filter((c) => c.status === "error").length;
  const worstRed = failing.some((c) => c.severity === "critical" || c.severity === "high");
  return {
    status: failing.length === 0 ? "green" : worstRed ? "red" : "orange",
    lastScan: report.timestamp,
    targets: [...new Set(checks.map((c) => c.target))],
    fails: failing.length,
    errors,
    failing: failing.map((c) => ({ target: c.target, category: c.category, check: c.check, severity: c.severity })),
  };
}

// ── Cloud site-health (A_SITE_HEALTH worker) ──
// The hourly-cron cloud uptime checker over every deployed site. Its data used
// to be a public no-auth dashboard; it's now authenticated and read here
// server-side so the roster and uptime history stay private and live in Pulse.

interface SiteHealthApp { name: string; type: string; url: string; state: string; pass: number; fail: number; updated_at: string; since: string; history?: { state: string }[] }

let siteHealthCache: { at: number; body: unknown } | null = null;

async function siteHealthReport(): Promise<Response> {
  if (siteHealthCache && Date.now() - siteHealthCache.at < 60_000) return Response.json(siteHealthCache.body);
  const cfg = arbolConfig();
  if (!cfg) return Response.json({ error: "arbol not configured (~/.config/arbol/config.yaml)" }, { status: 503 });
  try {
    const r = await fetch(`https://arbol-a-site-health.${cfg.subdomain}.workers.dev/status`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
    });
    if (!r.ok) return Response.json({ error: `site-health worker HTTP ${r.status}` }, { status: 502 });
    const data = (await r.json()) as { apps: SiteHealthApp[]; total: number; red: number; degraded: number; updatedAt: string };
    // Compact per-app: state, last check, last-24h spark (state per tick).
    const apps = (data.apps ?? []).map((a) => ({
      name: a.name,
      url: a.url,
      state: a.state,
      lastCheck: a.updated_at,
      since: a.since,
      spark: (a.history ?? []).map((h) => (h.state === "green" ? 2 : h.state === "degraded" ? 1 : 0)),
    }));
    const body = { total: data.total, red: data.red, degraded: data.degraded, updatedAt: data.updatedAt, apps };
    siteHealthCache = { at: Date.now(), body };
    return Response.json(body);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

// ── Monitoring cost (Cloudflare Workers) ──
// Real request counts from the Cloudflare GraphQL Analytics API for the workers
// that run the uptime + security monitoring, projected to a monthly figure and
// priced against the Workers Paid plan. Token/account read server-side from the
// canonical env; nothing sensitive reaches the browser.

// The optional pentest worker (private name, from config) joins the cost
// rollup when configured; worker names are [a-z0-9-] so direct interpolation
// into the regex is safe.
function monitorWorkersRe(): RegExp {
  const extra = arbolConfig()?.pentestWorker;
  const base = "site-health|infra-security|send-email";
  return new RegExp(extra ? `${base}|${extra}` : base);
}
// Workers Paid: $5/mo flat includes 10M requests; $0.30 per additional million.
const CF_INCLUDED_REQUESTS = 10_000_000;
const CF_OVERAGE_PER_MILLION = 0.30;

let costCache: { at: number; body: unknown } | null = null;

function cfCreds(): { acct: string; token: string } | null {
  let acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !token) {
    try {
      const env = readFileSync(join(HOME, ".claude", ".env"), "utf8");
      acct ||= env.match(/^CLOUDFLARE_ACCOUNT_ID=["']?([^"'\n]+)/m)?.[1];
      token ||= env.match(/^CLOUDFLARE_API_TOKEN=["']?([^"'\n]+)/m)?.[1];
    } catch { /* no env file */ }
  }
  return acct && token ? { acct, token } : null;
}

async function costReport(): Promise<Response> {
  if (costCache && Date.now() - costCache.at < 60 * 60_000) return Response.json(costCache.body);
  const creds = cfCreds();
  if (!creds) return Response.json({ error: "cloudflare credentials not found in env" }, { status: 503 });
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const query = `query($acct:String!,$since:Time!){viewer{accounts(filter:{accountTag:$acct}){workersInvocationsAdaptive(limit:200,filter:{datetime_geq:$since}){sum{requests} dimensions{scriptName}}}}}`;
  try {
    const r = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { acct: creds.acct, since } }),
    });
    const j = await r.json();
    const rows = j?.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
    const workers = rows
      .filter((x: any) => monitorWorkersRe().test(x.dimensions.scriptName))
      .map((x: any) => ({ name: x.dimensions.scriptName, reqPerDay: x.sum.requests, reqPerMonth: Math.round(x.sum.requests * 30.4) }))
      .sort((a: any, b: any) => b.reqPerMonth - a.reqPerMonth);
    const totalMonth = workers.reduce((n: number, w: any) => n + w.reqPerMonth, 0);
    const pctOfIncluded = (totalMonth / CF_INCLUDED_REQUESTS) * 100;
    // Marginal cost: these workers sit inside the flat plan's included quota, so
    // the true marginal cost is $0; the standalone figure shows what they'd cost
    // if billed purely per-request.
    const standaloneMonthly = (totalMonth / 1_000_000) * CF_OVERAGE_PER_MILLION;
    const body = {
      updatedAt: new Date().toISOString(),
      totalReqPerMonth: totalMonth,
      includedRequests: CF_INCLUDED_REQUESTS,
      pctOfIncluded,
      marginalMonthly: 0,
      standaloneMonthly,
      plan: "Workers Paid ($5/mo flat, 10M requests included)",
      workers,
    };
    costCache = { at: Date.now(), body };
    return Response.json(body);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

// Critical/high banner feed. Reads the user's security system (Arbol). If the
// user has NO security system configured, returns { configured: false } and the
// banner never renders — data/code separation: this is generic system code that
// only lights up when a real security source exists behind it.
async function criticalBanner(): Promise<Response> {
  const cfg = arbolConfig();
  if (!cfg) return Response.json({ configured: false });
  const report = await fetchArbolReport();
  if (!report) return Response.json({ configured: true, reachable: false, count: 0, items: [] });
  const crit = report.checks.filter((c) => c.status === "fail" && (c.severity === "critical" || c.severity === "high"));
  return Response.json({
    configured: true,
    reachable: true,
    timestamp: report.timestamp,
    count: crit.length,
    critical: crit.filter((c) => c.severity === "critical").length,
    high: crit.filter((c) => c.severity === "high").length,
    items: crit.slice(0, 12).map((c) => ({ target: c.target, check: c.check, severity: c.severity, evidence: (c.evidence ?? "").slice(0, 120) })),
  });
}

async function arbolReport(): Promise<Response> {
  const report = await fetchArbolReport();
  if (!report) {
    const cfg = arbolConfig();
    return Response.json(
      { error: cfg ? "arbol worker unreachable" : "arbol not configured (~/.config/arbol/config.yaml)" },
      { status: cfg ? 502 : 503 },
    );
  }
  const failing = report.checks.filter((c) => c.status === "fail");
  const bySeverity: Record<string, number> = {};
  for (const c of failing) bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
  return Response.json({
    timestamp: report.timestamp,
    summary: report.summary,
    targets: new Set(report.checks.map((c) => c.target)).size,
    bySeverity,
    pentest: await pentestOnline(),
    failing: failing
      .sort((a, b) => ["critical", "high", "medium", "low"].indexOf(a.severity) - ["critical", "high", "medium", "low"].indexOf(b.severity))
      .map((c) => ({ target: c.target, category: c.category, check: c.check, severity: c.severity })),
  });
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (!pathname.startsWith("/api/bunker")) return null;
  const sub = pathname.replace(/^\/api\/bunker/, "") || "/";

  if (sub === "/status") return Response.json(health());
  if (req.method === "GET" && sub === "/arbol") return arbolReport();
  if (req.method === "GET" && sub === "/critical") return criticalBanner();
  if (req.method === "GET" && sub === "/sitehealth") return siteHealthReport();
  if (req.method === "GET" && sub === "/cost") return costReport();

  if (req.method === "POST" && sub === "/refresh") {
    const r = await refresh();
    return Response.json({ ok: r.ok, reason: r.reason ?? null, lastFetch: state.lastFetch?.toISOString() ?? null });
  }

  // Serve an app's visual: live screenshot (bunker shots), social image, or favicon.
  if (req.method === "GET" && sub.startsWith("/asset")) {
    const u = new URL(req.url);
    const appName = u.searchParams.get("app");
    const kindParam = u.searchParams.get("kind");
    const found = state.cache?.apps?.find((a: any) => a.name === appName);
    if (!found) return Response.json({ error: "unknown app" }, { status: 404 });
    // Screenshots live centrally in the USER data tree (never in an app's deploy payload, never in the code tree).
    const path = kindParam === "shot"
      ? join(BUNKER_SHOTS_DIR, `${found.name}.png`)
      : join(found.dir, "public", kindParam === "favicon" ? "favicon.svg" : "og.png"); // dir from trusted registry; filename whitelisted
    if (!existsSync(path)) return Response.json({ error: "no asset" }, { status: 404 });
    return new Response(Bun.file(path), { headers: { "Cache-Control": "public, max-age=300" } });
  }

  if (req.method === "GET" && (sub === "/" || sub === "")) {
    if (!state.cache) {
      return Response.json({
        apps: [],
        summary: { apps: 0, green: 0, probesPass: 0, probesTotal: 0, manual: 0 },
        lastFetch: null,
        stale: true,
        stale_reason: "no snapshot yet — first scan pending",
      });
    }
    // Fold the cloud security grade into each app so every bay carries
    // "when was the last security check, and is it green/orange/red".
    const report = await fetchArbolReport();
    const apps = (state.cache.apps ?? []).map((a: any) => ({
      ...a,
      security: report ? securityForApp(a.name, report) : null,
    }));
    return Response.json({ ...state.cache, apps, lastFetch: state.lastFetch?.toISOString() ?? null });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
