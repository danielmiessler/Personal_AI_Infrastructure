#!/usr/bin/env bun
/**
 * IsDown.ts — Is a site down for everyone, or just you?
 *
 * Probes the site from multiple vantage points and compares:
 *   1. LOCAL  — direct HTTP fetch from this machine
 *   2. REMOTE — downforeveryoneorjustme.com public API (their vantage point)
 *   3. --deep — check-host.net multi-node sweep (7 nodes worldwide)
 *
 * Usage:
 *   bun IsDown.ts <domain-or-url> [--deep] [--json] [--timeout <seconds>]
 *
 * Exit codes:
 *   0 = up for everyone
 *   1 = down for everyone
 *   2 = down just for you (local fails, world succeeds)
 *   3 = usage / probe error (couldn't reach the checking APIs)
 *
 * Verdict rules:
 *   - A checker node that never reports is "no answer", NOT down — it is
 *     excluded from verdict math (fixed 2026-07-13: pending nodes were
 *     being counted as down, producing false "regional outage" verdicts).
 *   - A single down node among 3+ reporting up nodes is checker noise;
 *     it's shown in the table but doesn't flip the verdict.
 */

interface Check {
  vantage: string; // human label, e.g. "Local (this machine)" or "UK, London"
  status: "up" | "down" | "no-answer";
  detail: string; // e.g. "HTTP 200 · 65ms" or error text
}

type Verdict = "up-everywhere" | "down-everywhere" | "just-you" | "mixed" | "unknown";

export {}; // top-level await requires module context

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));

const timeoutIdx = args.indexOf("--timeout");
const timeoutSec = timeoutIdx !== -1 ? Number(args[timeoutIdx + 1]) || 10 : 10;
if (timeoutIdx !== -1) {
  const v = args[timeoutIdx + 1];
  const i = positional.indexOf(v);
  if (i !== -1) positional.splice(i, 1);
}

function usage(code: number): never {
  console.error(`Usage: isdown <domain-or-url> [--deep] [--json] [--timeout <seconds>]

Checks whether a site is down for everyone or just you.
  --deep     Also sweep 7 nodes worldwide via check-host.net
  --json     Machine-readable output
  --timeout  Per-probe timeout in seconds (default 10)`);
  process.exit(code);
}

if (positional.length !== 1 || flags.has("--help")) usage(flags.has("--help") ? 0 : 3);

const raw = positional[0];
const url = raw.match(/^https?:\/\//) ? raw : `https://${raw}`;
let domain: string;
try {
  domain = new URL(url).hostname;
} catch {
  console.error(`Invalid domain or URL: ${raw}`);
  process.exit(3);
}

// Reject garbage that URL() tolerates: hostname must be a dotted name or IP
const validHost =
  /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain) || // domain.tld
  /^(\d{1,3}\.){3}\d{1,3}$/.test(domain) || // IPv4
  domain.startsWith("["); // IPv6 literal
if (!validHost) {
  console.error(`Invalid domain or URL: ${raw} (parsed hostname: ${domain})`);
  process.exit(3);
}

const timeoutMs = timeoutSec * 1000;
const UA = { "User-Agent": "Mozilla/5.0 (compatible; isdown-cli)" };

async function probeLocal(): Promise<Check> {
  const start = performance.now();
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: UA });
    const ms = Math.round(performance.now() - start);
    return {
      vantage: "Local (this machine)",
      status: res.status < 500 ? "up" : "down",
      detail: `HTTP ${res.status} · ${ms}ms`,
    };
  } catch (e: any) {
    return { vantage: "Local (this machine)", status: "down", detail: e?.cause?.message || e?.message || String(e) };
  }
}

async function probeRemote(): Promise<Check> {
  const vantage = "downforeveryoneorjustme.com";
  try {
    const res = await fetch(`https://downforeveryoneorjustme.com/api/httpcheck/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(timeoutMs + 5000),
      headers: UA,
    });
    if (!res.ok) return { vantage, status: "no-answer", detail: `checker API returned HTTP ${res.status}` };
    const data = (await res.json()) as { isDown: boolean; statusCode: number };
    return { vantage, status: data.isDown ? "down" : "up", detail: `HTTP ${data.statusCode}` };
  } catch (e: any) {
    return { vantage, status: "no-answer", detail: e?.message || String(e) };
  }
}

async function probeDeep(): Promise<Check[]> {
  const headers = { Accept: "application/json", ...UA };
  const start = await fetch(`https://check-host.net/check-http?host=${encodeURIComponent(url)}&max_nodes=7`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs + 5000),
  });
  if (!start.ok) throw new Error(`check-host.net returned HTTP ${start.status}`);
  const { request_id, nodes } = (await start.json()) as {
    request_id: string;
    nodes: Record<string, [string, string, string, string, string]>;
  };

  // Poll until all nodes report or ~20s elapses; unreported nodes stay null
  let results: Record<string, any> = {};
  for (let i = 0; i < 10; i++) {
    await Bun.sleep(2000);
    const res = await fetch(`https://check-host.net/check-result/${request_id}`, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    results = (await res.json()) as Record<string, any>;
    if (Object.values(results).every((v) => v !== null)) break;
  }

  return Object.entries(nodes).map(([node, info]) => {
    const vantage = `${info[1]}, ${info[2]}`;
    const entry = results[node]?.[0]; // [ok, time, msg, code, ip] — or undefined if node never reported
    if (!Array.isArray(entry)) return { vantage, status: "no-answer" as const, detail: "node did not report in time" };
    const ok = entry[0] === 1;
    const ms = typeof entry[1] === "number" ? Math.round(entry[1] * 1000) : null;
    return {
      vantage,
      status: ok ? ("up" as const) : ("down" as const),
      detail: ok ? `HTTP ${entry[3]} · ${ms}ms` : String(entry[2] || "unreachable"),
    };
  });
}

function verdictOf(local: Check, world: Check[]): { verdict: Verdict; note: string | null } {
  const reporting = world.filter((c) => c.status !== "no-answer");
  const up = reporting.filter((c) => c.status === "up").length;
  const down = reporting.length - up;
  const localUp = local.status === "up";

  if (reporting.length === 0) {
    return localUp
      ? { verdict: "up-everywhere", note: "no external checker answered — verdict from local probe only" }
      : { verdict: "unknown", note: null };
  }
  if (!localUp) {
    if (up === 0) return { verdict: "down-everywhere", note: null };
    return { verdict: "just-you", note: down > 0 ? `${down} external node(s) also failed` : null };
  }
  if (down === 0) return { verdict: "up-everywhere", note: null };
  if (down === 1 && up >= 3) {
    return { verdict: "up-everywhere", note: "1 checker node failed — single-node noise, not an outage signal" };
  }
  if (up === 0) return { verdict: "mixed", note: "up for you but no external node reaches it — geo-block or local cache?" };
  return { verdict: "mixed", note: null };
}

const localP = probeLocal();
const remoteP = probeRemote();
const deepP = flags.has("--deep") ? probeDeep().catch((e: any) => e?.message || String(e)) : Promise.resolve(null);

const local = await localP;
const remote = await remoteP;
const deepOut = await deepP;
const deepError = typeof deepOut === "string" ? deepOut : null;
const deep: Check[] = Array.isArray(deepOut) ? deepOut : [];

const world = [remote, ...deep];
const { verdict, note } = verdictOf(local, world);
const all = [local, ...world];
const counts = {
  checked: all.length,
  up: all.filter((c) => c.status === "up").length,
  down: all.filter((c) => c.status === "down").length,
  noAnswer: all.filter((c) => c.status === "no-answer").length,
};

const exitCodes: Record<Verdict, number> = {
  "up-everywhere": 0,
  "down-everywhere": 1,
  "just-you": 2,
  mixed: 0,
  unknown: 3,
};

if (flags.has("--json")) {
  console.log(JSON.stringify({ domain, url, verdict, note, counts, checks: all, deepError }, null, 2));
  process.exit(exitCodes[verdict]);
}

const headline: Record<Verdict, string> = {
  "up-everywhere": `✅ ${domain} is UP for everyone`,
  "down-everywhere": `🔴 ${domain} is DOWN for everyone (not just you)`,
  "just-you": `🟡 ${domain} is down JUST FOR YOU — the rest of the internet reaches it`,
  mixed: `🟠 ${domain} is partially reachable — possible regional outage`,
  unknown: `⚪ ${domain} unreachable locally and no checker answered — can't tell if it's the site or your connection`,
};

const icon = { up: "✅", down: "🔴", "no-answer": "⚪" } as const;
const width = Math.max(...all.map((c) => c.vantage.length)) + 2;

console.log(headline[verdict]);
console.log();
console.log(`   ${"VANTAGE POINT".padEnd(width)} RESULT      DETAIL`);
for (const c of all) {
  const label = c.status === "no-answer" ? "no answer" : c.status;
  console.log(`   ${c.vantage.padEnd(width)} ${icon[c.status]} ${label.padEnd(9)} ${c.detail}`);
}
console.log();
const parts = [`${counts.up} up`, `${counts.down} down`];
if (counts.noAnswer > 0) parts.push(`${counts.noAnswer} no answer`);
console.log(`   Checked ${counts.checked} vantage points: ${parts.join(" · ")}`);
if (note) console.log(`   Note: ${note}`);
if (deepError) console.log(`   Note: deep sweep failed (${deepError})`);

process.exit(exitCodes[verdict]);
