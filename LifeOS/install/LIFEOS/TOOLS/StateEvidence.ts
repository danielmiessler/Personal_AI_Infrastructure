#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * StateEvidence — observed reality per life domain, gathered into one cache.
 *
 * The interview system argues from this file: it is the "what actually happened"
 * side of the ledger, against which the principal's own CURRENT_STATE claims are
 * checked. Four domains — health, activity, work, money — each carrying metrics
 * plus per-source liveness so a stale feed is never mistaken for a real signal.
 *
 * LOCAL FILES ONLY. No network. Runs on cron, so malformed or missing sources
 * degrade to null metrics + an "unavailable" source note; nothing throws.
 *
 * Usage:
 *   bun StateEvidence.ts                     Full JSON to stdout + write cache
 *   bun StateEvidence.ts --json              Same
 *   bun StateEvidence.ts --markdown          Human-readable evidence panel
 *   bun StateEvidence.ts --domain health     One domain as JSON, no cache write
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";

// Normalize env path vars that Claude Code injects without shell expansion (LifeOS#1404)
for (const k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const v = process.env[k];
  if (v && /^\$\{?HOME\}?(\/|$)/.test(v)) process.env[k] = v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
const LIFEOS_DIR = process.env.LIFEOS_DIR || join(HOME, ".claude", "LIFEOS");
const CACHE_DIR = join(LIFEOS_DIR, "USER", "CACHE");
export const EVIDENCE_CACHE_PATH = join(CACHE_DIR, "state-evidence.json");

const OURA_DIR = join(LIFEOS_DIR, "USER", "HEALTH", "DATA", "oura");
const HEALTH_CURRENT = join(LIFEOS_DIR, "USER", "HEALTH", "current.json");
const CONDUIT_DIR = join(LIFEOS_DIR, "USER", "CONDUIT", "daily");
const WORK_STATE = join(LIFEOS_DIR, "MEMORY", "STATE", "work.json");
const EXPENSES = join(LIFEOS_DIR, "USER", "FINANCES", "expenses.json");
const REPO_DIR = join(HOME, ".claude");

// ---------- types ----------

export type SourceState = "live" | "stale" | "dead" | "unavailable";

export interface SourceStatus {
  id: string;
  status: SourceState;
  last_observation?: string | null;
  reason?: string;
}

export type MetricValue =
  | number
  | string
  | null
  | string[]
  | Array<Record<string, unknown>>
  | Record<string, number>;

export interface DomainEvidence {
  metrics: Record<string, MetricValue>;
  sources: SourceStatus[];
}

export type DomainName = "health" | "activity" | "work" | "money";

export interface Evidence {
  schema: 1;
  generated_at: string;
  domains: Record<DomainName, DomainEvidence>;
}

export const DOMAIN_NAMES: DomainName[] = ["health", "activity", "work", "money"];

// ---------- date helpers (local calendar days) ----------

const DAY_FILE_RE = /^(\d{4}-\d{2}-\d{2})\.json$/;

/** Local calendar date, YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days from a YYYY-MM-DD calendar date to today. Null when unparseable. */
export function daysAgo(dateStr: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return null;
  const then = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (Number.isNaN(then)) return null;
  return Math.round((today - then) / 86_400_000);
}

function round(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Mean of the defined numbers in a list. Null when nothing is defined. */
function avg(values: Array<number | null | undefined>, places = 2): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return round(nums.reduce((s, v) => s + v, 0) / nums.length, places);
}

function readJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Every YYYY-MM-DD.json in a dir, oldest first. Unreadable dir → empty. */
function readDayFiles<T>(dir: string): Array<{ day: string; data: T }> {
  let names: string[];
  try {
    if (!existsSync(dir)) return [];
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: Array<{ day: string; data: T }> = [];
  for (const name of names.sort()) {
    const m = DAY_FILE_RE.exec(name);
    if (!m) continue;
    const data = readJson<T>(join(dir, name));
    if (data === null) continue;
    out.push({ day: m[1], data });
  }
  return out;
}

function unavailable(id: string, reason: string): SourceStatus {
  return { id, status: "unavailable", last_observation: null, reason };
}

/** live inside `liveWithinDays`, otherwise stale, carrying the last observation date. */
function liveness(id: string, newestDay: string | null, liveWithinDays: number, now: Date): SourceStatus {
  if (!newestDay) return unavailable(id, "no data files");
  const age = daysAgo(newestDay, now);
  if (age === null) return unavailable(id, "unparseable observation date");
  return {
    id,
    status: age <= liveWithinDays ? "live" : "stale",
    last_observation: newestDay,
    ...(age > liveWithinDays ? { reason: `${age}d since last observation` } : {}),
  };
}

// ---------- health ----------

interface OuraDay {
  metrics?: {
    oura_sleep_score?: number | null;
    oura_readiness_score?: number | null;
    oura_activity_score?: number | null;
    steps?: number | null;
    sleep_duration_h?: number | null;
    sleep_efficiency?: number | null;
    avg_sleep_hr?: number | null;
    avg_sleep_hrv?: number | null;
    spo2_avg?: number | null;
    raw?: {
      sleep?: Array<{ lowest_heart_rate?: number | null; type?: string }>;
    };
  };
}

/**
 * True resting HR for a day: Oura's lowest_heart_rate from the raw sleep
 * periods (long_sleep preferred). Distinct from avg_sleep_hr — average HR
 * DURING sleep runs systematically higher than RHR, and conflating the two
 * was the apples-to-oranges Max flagged (2026-08-11 review, finding 1).
 */
function restingHr(m: OuraDay["metrics"]): number | null {
  const periods = m?.raw?.sleep ?? [];
  const candidates = periods
    .filter((p) => typeof p.lowest_heart_rate === "number")
    .sort((a, b) => (a.type === "long_sleep" ? -1 : 1) - (b.type === "long_sleep" ? -1 : 1));
  if (candidates.length === 0) return null;
  const long = candidates.filter((p) => p.type === "long_sleep");
  const pool = long.length ? long : candidates;
  return Math.min(...pool.map((p) => p.lowest_heart_rate as number));
}

interface HealthCurrent {
  sources?: Record<string, { status?: string; lastError?: string | null; note?: string }>;
}

export function gatherHealth(now: Date = new Date()): DomainEvidence {
  const days = readDayFiles<OuraDay>(OURA_DIR);
  const sources: SourceStatus[] = [];
  const metrics: Record<string, MetricValue> = {};

  if (days.length === 0) {
    sources.push(unavailable("oura", "no oura day files"));
    for (const key of [
      "sleep_h_avg_7d", "sleep_h_avg_30d", "sleep_efficiency_avg_7d", "sleep_efficiency_avg_30d",
      "hrv_avg_7d", "hrv_avg_30d", "sleep_hr_avg_7d", "sleep_hr_avg_30d",
      "rhr_avg_7d", "rhr_avg_30d",
      "steps_avg_7d", "steps_avg_30d", "sleep_score_avg_7d", "sleep_score_avg_30d",
      "readiness_avg_7d", "readiness_avg_30d", "latest_sleep_record_day",
      "newest_observation", "oldest_observation_30d",
    ]) metrics[key] = null;
    metrics.days_with_data_30d = 0;
  } else {
    const inWindow = (day: string, n: number): boolean => {
      const age = daysAgo(day, now);
      return age !== null && age >= 0 && age < n;
    };
    const win = (n: number) => days.filter((d) => inWindow(d.day, n));

    for (const n of [7, 30]) {
      const rows = win(n).map((d) => d.data.metrics ?? {});
      // Activity-only files carry no sleep keys; the sleep aggregates skip them by
      // virtue of avg() ignoring null, while steps still counts.
      metrics[`sleep_h_avg_${n}d`] = avg(rows.map((r) => r.sleep_duration_h));
      metrics[`sleep_efficiency_avg_${n}d`] = avg(rows.map((r) => r.sleep_efficiency), 1);
      metrics[`hrv_avg_${n}d`] = avg(rows.map((r) => r.avg_sleep_hrv), 1);
      metrics[`sleep_hr_avg_${n}d`] = avg(rows.map((r) => r.avg_sleep_hr), 1);
      metrics[`rhr_avg_${n}d`] = avg(rows.map((r) => restingHr(r)), 1);
      metrics[`steps_avg_${n}d`] = avg(rows.map((r) => r.steps), 0);
      metrics[`sleep_score_avg_${n}d`] = avg(rows.map((r) => r.oura_sleep_score), 1);
      metrics[`readiness_avg_${n}d`] = avg(rows.map((r) => r.oura_readiness_score), 1);
    }

    // current.json's `day` label runs ahead of its own sleep data — compute from
    // the day files themselves, newest file that actually carries a sleep record.
    const withSleep = days.filter((d) => typeof d.data.metrics?.sleep_duration_h === "number");
    metrics.latest_sleep_record_day = withSleep.length ? withSleep[withSleep.length - 1].day : null;
    const window30 = win(30);
    metrics.days_with_data_30d = window30.length;
    metrics.newest_observation = days[days.length - 1].day;
    metrics.oldest_observation_30d = window30.length ? window30[0].day : null;

    sources.push(liveness("oura", days[days.length - 1].day, 3, now));
  }

  const current = readJson<HealthCurrent>(HEALTH_CURRENT);
  for (const id of ["apple", "eightsleep", "function"]) {
    const entry = current?.sources?.[id];
    if (!entry) {
      sources.push(unavailable(id, "not present in health current.json"));
      continue;
    }
    sources.push({
      id,
      status: "dead",
      last_observation: null,
      reason: entry.status ?? entry.lastError ?? entry.note ?? "unknown",
    });
  }

  return { metrics, sources };
}

// ---------- activity ----------

interface ConduitDay {
  totalMinutes?: number | null;
  creationMinutes?: number | null;
  consumptionMinutes?: number | null;
  neutralMinutes?: number | null;
  blocks?: Array<{ label?: string; kind?: string; minutes?: number }>;
}

export function gatherActivity(now: Date = new Date()): DomainEvidence {
  const days = readDayFiles<ConduitDay>(CONDUIT_DIR);
  const metrics: Record<string, MetricValue> = {};
  const sources: SourceStatus[] = [];

  if (days.length === 0) {
    for (const key of [
      "total_minutes_avg_7d", "total_minutes_avg_30d", "creation_minutes_avg_7d", "creation_minutes_avg_30d",
      "consumption_minutes_avg_7d", "consumption_minutes_avg_30d", "creation_ratio_7d", "creation_ratio_30d",
    ]) metrics[key] = null;
    metrics.top_apps_7d = [];
    metrics.days_with_data_30d = 0;
    metrics.newest_observation = null;
    metrics.oldest_observation_30d = null;
    sources.push(unavailable("conduit", "no conduit daily rollups"));
    return { metrics, sources };
  }

  const win = (n: number) =>
    days.filter((d) => {
      const age = daysAgo(d.day, now);
      return age !== null && age >= 0 && age < n;
    });

  for (const n of [7, 30]) {
    const rows = win(n).map((d) => d.data);
    const total = avg(rows.map((r) => r.totalMinutes), 0);
    const creation = avg(rows.map((r) => r.creationMinutes), 0);
    metrics[`total_minutes_avg_${n}d`] = total;
    metrics[`creation_minutes_avg_${n}d`] = creation;
    metrics[`consumption_minutes_avg_${n}d`] = avg(rows.map((r) => r.consumptionMinutes), 0);
    metrics[`creation_ratio_${n}d`] = total && creation !== null && total > 0 ? round(creation / total, 3) : null;
  }

  const appMinutes = new Map<string, number>();
  for (const d of win(7)) {
    for (const block of d.data.blocks ?? []) {
      if (!block.label || typeof block.minutes !== "number") continue;
      appMinutes.set(block.label, (appMinutes.get(block.label) ?? 0) + block.minutes);
    }
  }
  metrics.top_apps_7d = [...appMinutes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, minutes]) => ({ label, minutes }));
  const window30 = win(30);
  metrics.days_with_data_30d = window30.length;
  metrics.newest_observation = days[days.length - 1].day;
  metrics.oldest_observation_30d = window30.length ? window30[0].day : null;

  sources.push(liveness("conduit", days[days.length - 1].day, 2, now));
  return { metrics, sources };
}

// ---------- work ----------

interface WorkSession {
  sessionName?: string;
  task?: string;
  phase?: string;
  progress?: string;
  started?: string;
  updatedAt?: string;
}

interface WorkState {
  sessions?: Record<string, WorkSession>;
}

/** ISO instant → whole days elapsed. Null when unparseable. */
function daysSinceIso(iso: string | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

export function gatherWork(now: Date = new Date()): DomainEvidence {
  const metrics: Record<string, MetricValue> = {};
  const sources: SourceStatus[] = [];

  const state = readJson<WorkState>(WORK_STATE);
  const sessions = state?.sessions ? Object.values(state.sessions) : null;

  if (!sessions) {
    metrics.sessions_14d = null;
    metrics.sessions_30d = null;
    metrics.recent_session_names = [];
    metrics.phases_14d = {};
    sources.push(unavailable("work-registry", "work.json missing or unreadable"));
  } else {
    const aged = sessions
      .map((s) => ({ s, age: daysSinceIso(s.updatedAt, now) }))
      .filter((x): x is { s: WorkSession; age: number } => x.age !== null);
    const within = (n: number) => aged.filter((x) => x.age >= 0 && x.age < n);

    metrics.sessions_14d = within(14).length;
    metrics.sessions_30d = within(30).length;
    metrics.recent_session_names = aged
      .slice()
      .sort((a, b) => a.age - b.age)
      .slice(0, 8)
      .map((x) => x.s.sessionName ?? x.s.task ?? "(unnamed)");

    const phases: Record<string, number> = {};
    for (const x of within(14)) {
      const phase = x.s.phase ?? "unknown";
      phases[phase] = (phases[phase] ?? 0) + 1;
    }
    metrics.phases_14d = phases;

    const newest = aged.length ? Math.min(...aged.map((x) => x.age)) : null;
    sources.push(
      newest === null
        ? unavailable("work-registry", "no sessions with a parseable updatedAt")
        : {
            id: "work-registry",
            status: newest <= 7 ? "live" : "stale",
            last_observation: null,
            ...(newest > 7 ? { reason: `${newest}d since last session update` } : {}),
          },
    );
  }

  // Local repo history. execFile with an argument array — never shell interpolation.
  let commits: string[] | null = null;
  try {
    const out = execFileSync(
      "git",
      ["-C", REPO_DIR, "log", "--since=14 days ago", "--format=%ad", "--date=short"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    commits = out.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    commits = null;
  }

  if (commits === null) {
    metrics.commits_14d = null;
    metrics.commit_days_14d = null;
    sources.push(unavailable("git", "git log unavailable"));
  } else {
    metrics.commits_14d = commits.length;
    metrics.commit_days_14d = new Set(commits).size;
    const newestCommitDay = commits.length ? commits.slice().sort()[commits.length - 1] : null;
    sources.push({
      id: "git",
      status: commits.length > 0 ? "live" : "stale",
      last_observation: newestCommitDay,
      ...(commits.length === 0 ? { reason: "no commits in 14d" } : {}),
    });
  }

  return { metrics, sources };
}

// ---------- money ----------

type Cycle = "monthly" | "annual" | "quarterly" | "weekly";

/** Mirrors the expenses CLI: amount is stored per its own cycle, normalized to monthly here. */
const CYCLE_TO_MONTHLY: Record<Cycle, number> = {
  monthly: 1,
  annual: 1 / 12,
  quarterly: 1 / 3,
  weekly: 52 / 12,
};

interface ExpenseLine {
  cycle?: string;
  amount?: number | null;
  status?: string;
}

interface ExpenseLedger {
  meta?: { updated?: string };
  subscriptions?: ExpenseLine[];
  oneoffs?: ExpenseLine[];
}

export function gatherMoney(now: Date = new Date()): DomainEvidence {
  const metrics: Record<string, MetricValue> = {};
  const sources: SourceStatus[] = [];

  const ledger = readJson<ExpenseLedger>(EXPENSES);
  if (!ledger) {
    metrics.monthly_recurring_total = null;
    metrics.entries_total = null;
    metrics.entries_needing_amount = null;
    metrics.meta_updated = null;
    metrics.newest_observation = null;
    metrics.oldest_observation_30d = null;
    sources.push(unavailable("expenses", "expenses.json missing or unreadable"));
    return { metrics, sources };
  }

  const subs = Array.isArray(ledger.subscriptions) ? ledger.subscriptions : [];
  const oneoffs = Array.isArray(ledger.oneoffs) ? ledger.oneoffs : [];
  const all = [...subs, ...oneoffs];
  const isLive = (l: ExpenseLine) => l.status === "active" || l.status === "needs-amount";

  let total = 0;
  for (const line of subs) {
    if (!isLive(line) || typeof line.amount !== "number") continue;
    const mult = CYCLE_TO_MONTHLY[(line.cycle ?? "monthly") as Cycle];
    if (typeof mult !== "number") continue;
    total += line.amount * mult;
  }

  const updated = ledger.meta?.updated ?? null;
  metrics.monthly_recurring_total = round(total);
  metrics.entries_total = all.length;
  metrics.entries_needing_amount = all.filter((l) => l.status === "needs-amount").length;
  metrics.meta_updated = updated;
  // The ledger carries one ledger-wide timestamp rather than dated observations,
  // so the newest and oldest observation collapse to the same date.
  metrics.newest_observation = updated;
  metrics.oldest_observation_30d = updated;

  sources.push(liveness("expenses", updated, 14, now));
  return { metrics, sources };
}

// ---------- assembly ----------

export function gatherDomain(domain: DomainName, now: Date = new Date()): DomainEvidence {
  switch (domain) {
    case "health": return gatherHealth(now);
    case "activity": return gatherActivity(now);
    case "work": return gatherWork(now);
    case "money": return gatherMoney(now);
  }
}

export function gatherEvidence(now: Date = new Date()): Evidence {
  return {
    schema: 1,
    generated_at: now.toISOString(),
    domains: {
      health: gatherHealth(now),
      activity: gatherActivity(now),
      work: gatherWork(now),
      money: gatherMoney(now),
    },
  };
}

/** Atomic write via temp file + rename, mirroring FreshnessCache. */
export function writeEvidenceCache(evidence: Evidence, path: string = EVIDENCE_CACHE_PATH): boolean {
  try {
    mkdirSync(join(path, ".."), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    renameSync(tmp, path);
    return true;
  } catch {
    return false;
  }
}

export function readEvidenceCache(path: string = EVIDENCE_CACHE_PATH): Evidence | null {
  return readJson<Evidence>(path);
}

// ---------- markdown panel ----------

function fmt(value: MetricValue): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((v) =>
        typeof v === "object" && v !== null && "label" in v
          ? `${String(v.label)} ${String((v as { minutes?: unknown }).minutes ?? "?")}m`
          : String(v),
      )
      .join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length ? entries.map(([k, v]) => `${k}:${v}`).join(" ") : "—";
  }
  return String(value);
}

export function renderMarkdown(evidence: Evidence): string {
  const lines: string[] = [];
  lines.push(`# State Evidence — ${evidence.generated_at.slice(0, 10)}`);
  for (const domain of DOMAIN_NAMES) {
    const d = evidence.domains[domain];
    lines.push("", `## ${domain}`, "");
    const keys = Object.keys(d.metrics);
    if (keys.length === 0) lines.push("- (no metrics)");
    for (const key of keys) lines.push(`- ${key}: ${fmt(d.metrics[key])}`);
    lines.push("", "Sources:");
    if (d.sources.length === 0) lines.push("- (none)");
    for (const s of d.sources) {
      const when = s.last_observation ? ` @ ${s.last_observation}` : "";
      const why = s.reason ? ` (${s.reason})` : "";
      lines.push(`- ${s.id}: ${s.status}${when}${why}`);
    }
  }
  return lines.join("\n");
}

// ---------- CLI ----------

if (import.meta.main) {
  const args = process.argv.slice(2);
  const domainFlag = args.indexOf("--domain");

  if (domainFlag !== -1) {
    const name = args[domainFlag + 1] as DomainName | undefined;
    if (!name || !DOMAIN_NAMES.includes(name)) {
      console.error(`--domain requires one of: ${DOMAIN_NAMES.join(", ")}`);
      process.exit(2);
    }
    console.log(JSON.stringify(gatherDomain(name), null, 2));
  } else {
    const evidence = gatherEvidence();
    writeEvidenceCache(evidence);
    console.log(args.includes("--markdown") ? renderMarkdown(evidence) : JSON.stringify(evidence, null, 2));
  }
}
