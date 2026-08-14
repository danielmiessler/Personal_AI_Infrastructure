#!/usr/bin/env bun
/**
 * Heartbeat Tick — the deterministic fast-loop check for the Hermes Heartbeat job.
 *
 * Runs every 10 minutes as a Hermes cron pre-run script. Spends ZERO model
 * tokens: it does cheap local/API checks and emits a wake-gate JSON line as its
 * final stdout line. `{"wakeAgent": false}` skips the LLM entirely (the Hermes
 * scheduler contract); any findings wake the agent with the findings injected
 * as context.
 *
 * Checks (each deterministic, each stateful under $HERMES_HOME/state/heartbeat/):
 *   1. Calendar lookahead — events starting soon that haven't had prep dispatched.
 *   2. Important-mail candidates — unread headers matched against VIP/pattern rules.
 *   3. Time-sensitive queue — items enqueued by slower jobs, due now.
 *   4. Location (optional) — public-venue daemon-update candidates, off by default.
 *
 * Config: $LIFEOS_ROOT/LIFEOS/USER/CONFIG/heartbeat.json (personal, never in code).
 * Non-interrupt findings are also appended to ledger.jsonl for the morning brief.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { homedir } from "os";

const LIFEOS_ROOT = process.env.LIFEOS_ROOT || join(homedir(), ".claude");
const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), ".hermes");
const STATE_DIR = join(HERMES_HOME, "state", "heartbeat");
const CONFIG_PATH = join(LIFEOS_ROOT, "LIFEOS", "USER", "CONFIG", "heartbeat.json");

interface Config {
  calendar: { lookaheadMinutes: number };
  mail: { vipSenders: string[]; importantPatterns: string[]; maxAgeHours: number };
  location: { enabled: boolean };
  quietHours: { start: string; end: string };
}

const DEFAULTS: Config = {
  calendar: { lookaheadMinutes: 90 },
  mail: { vipSenders: [], importantPatterns: [], maxAgeHours: 24 },
  location: { enabled: false },
  quietHours: { start: "23:30", end: "07:00" },
};

function loadJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function saveJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function inQuietHours(cfg: Config, now: Date): boolean {
  const [sh, sm] = cfg.quietHours.start.split(":").map(Number);
  const [eh, em] = cfg.quietHours.end.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return start > end ? mins >= start || mins < end : mins >= start && mins < end;
}

function run(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, { encoding: "utf-8", timeout: 30_000 });
  return { ok: r.status === 0, stdout: r.stdout || "" };
}

const findings: string[] = [];
const errors: string[] = [];
mkdirSync(STATE_DIR, { recursive: true });
const cfg = loadJson<Config>(CONFIG_PATH, DEFAULTS);
const now = new Date();
const quiet = inQuietHours(cfg, now);

// ── 1. Calendar lookahead ──────────────────────────────────────────────
const prepPath = join(STATE_DIR, "prep-sent.json");
const prepSent = loadJson<Record<string, string>>(prepPath, {});
// The calendar tool ships only with the private calendar skill — absent on a
// public install, which is an unconfigured leg to skip, never a per-tick error.
const gcalTool = join(LIFEOS_ROOT, "skills", "_CALENDAR", "Tools", "gcal.ts");
if (existsSync(gcalTool)) {
  const to = new Date(now.getTime() + cfg.calendar.lookaheadMinutes * 60_000);
  const r = run("bun", [
    gcalTool,
    "list", "--from", now.toISOString(), "--to", to.toISOString(), "--max", "10",
  ]);
  if (r.ok) {
    try {
      const events = (JSON.parse(r.stdout).items || []) as any[];
      for (const ev of events) {
        if (ev.status === "cancelled" || !ev.start?.dateTime) continue; // skip all-day
        if (prepSent[ev.id]) continue;
        const startsIn = Math.round((new Date(ev.start.dateTime).getTime() - now.getTime()) / 60_000);
        findings.push(
          `MEETING_PREP: "${ev.summary || "(untitled)"}" starts in ${startsIn}m (${ev.start.dateTime})` +
          (ev.attendees?.length ? ` · attendees: ${ev.attendees.map((a: any) => a.email).join(", ")}` : "") +
          (ev.location ? ` · location: ${ev.location}` : "") +
          (ev.description ? ` · notes: ${String(ev.description).slice(0, 300)}` : ""),
        );
        prepSent[ev.id] = now.toISOString(); // optimistic: guarantees no duplicate-prep spam
      }
      // GC entries older than 7 days
      for (const [id, ts] of Object.entries(prepSent))
        if (now.getTime() - new Date(ts).getTime() > 7 * 86_400_000) delete prepSent[id];
    } catch (e) {
      errors.push(`calendar parse: ${e}`);
    }
  } else errors.push("calendar query failed");
}

// ── 2. Important-mail candidates (headers only, never bodies) ──────────
const seenPath = join(STATE_DIR, "seen-mail.json");
const seen = loadJson<Record<string, string>>(seenPath, {});
// gws is the principal's Workspace CLI — absent on most installs; skip, don't error.
if (Bun.which("gws")) {
  const r = run("gws", ["gmail", "+triage", "--format", "json"]);
  if (r.ok) {
    try {
      const jsonStart = r.stdout.indexOf("{");
      const msgs = (JSON.parse(r.stdout.slice(jsonStart)).messages || []) as any[];
      for (const m of msgs) {
        if (seen[m.id]) continue;
        seen[m.id] = now.toISOString();
        const ageH = (now.getTime() - new Date(m.date).getTime()) / 3_600_000;
        if (ageH > cfg.mail.maxAgeHours) continue;
        const from = String(m.from || "").toLowerCase();
        const subject = String(m.subject || "");
        const vip = cfg.mail.vipSenders.some((v) => from.includes(v.toLowerCase()));
        const pat = cfg.mail.importantPatterns.some((p) => new RegExp(p, "i").test(subject));
        if (vip || pat)
          findings.push(`IMPORTANT_MAIL_CANDIDATE: from=${m.from} · subject="${subject}" · id=${m.id} · matched=${vip ? "vip" : "pattern"}`);
      }
      for (const [id, ts] of Object.entries(seen))
        if (now.getTime() - new Date(ts).getTime() > 3 * 86_400_000) delete seen[id];
    } catch (e) {
      errors.push(`mail parse: ${e}`);
    }
  } else errors.push("mail query failed");
}

// ── 3. Time-sensitive queue (fed by slower jobs, e.g. artist scanner) ──
const queuePath = join(STATE_DIR, "queue.json");
const queue = loadJson<any[]>(queuePath, []);
{
  let dirty = false;
  for (const item of queue) {
    if (item.delivered || new Date(item.dueAt) > now) continue;
    findings.push(`QUEUE_DELIVERY: [${item.source}] ${item.message}`);
    item.delivered = now.toISOString();
    dirty = true;
  }
  const kept = queue.filter((i) => !i.delivered || now.getTime() - new Date(i.delivered).getTime() < 7 * 86_400_000);
  if (dirty || kept.length !== queue.length) saveJson(queuePath, kept);
}

// ── 4. Location → public daemon update (off until plumbing exists) ─────
if (cfg.location.enabled) {
  const locPath = join(STATE_DIR, "location.json");
  const loc = loadJson<any>(locPath, null as any);
  if (loc?.updatedAt && now.getTime() - new Date(loc.updatedAt).getTime() < 20 * 60_000)
    findings.push(`LOCATION_CANDIDATE: ${JSON.stringify(loc)} — evaluate against venue allowlist before any daemon update`);
}

// ── Persist state, emit findings + wake gate ───────────────────────────
saveJson(prepPath, prepSent);
saveJson(seenPath, seen);

for (const f of findings)
  appendFileSync(join(STATE_DIR, "ledger.jsonl"), JSON.stringify({ ts: now.toISOString(), finding: f }) + "\n");

if (errors.length) console.log(`TICK_ERRORS (report only if persistent): ${errors.join(" | ")}`);

if (findings.length && !quiet) {
  console.log(findings.join("\n"));
  console.log(JSON.stringify({ wakeAgent: true }));
} else {
  if (findings.length && quiet)
    appendFileSync(join(STATE_DIR, "ledger.jsonl"), JSON.stringify({ ts: now.toISOString(), finding: "QUIET_HOURS_HELD: findings held for morning brief" }) + "\n");
  console.log(JSON.stringify({ wakeAgent: false }));
}
