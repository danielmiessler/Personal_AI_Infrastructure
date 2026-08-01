#!/usr/bin/env bun
/**
 * RecurrenceLedger.ts — derived failure-class ledger over the observability streams.
 *
 * PURPOSE:
 * Gives every failure the system records a stable, deterministic class ID and
 * answers "is this healed?" with a number. The ledger is DERIVED — computed at
 * read time from the streams the gates already write — so no live gate's write
 * path is touched and the ledger can never drift from the evidence.
 *
 * Streams read (all under MEMORY/OBSERVABILITY unless noted):
 *   verification-gate.jsonl   blocks/would-blocks        → vgate:<type>
 *   format-gate.jsonl         flags/blocks               → fgate:<code>
 *   writing-gate.jsonl        blocks                     → wgate:<decision>
 *   tool-failures.jsonl       tool errors                → tool:<name>:<error-sig>
 *   hook-healer.jsonl         heals/warnings             → healer:<event>
 *   LEARNING/FAILURES/<month>/<capture>/sentiment.json   low-rating captures → capture:<pattern-slug>
 *
 * Patch history lives in MEMORY/LEARNING/PATCHES/registry.jsonl (appended by
 * PromoteFixture.ts when a healed class's fixture is promoted into the blocking
 * corpus). A class with events after its patch timestamp is REOPENED — the fix
 * did not take. A patched class silent ≥90d is a TRIM candidate.
 *
 * CLI:
 *   bun RecurrenceLedger.ts report [--window Nd] [--json]
 *
 * Exports (consumed by LearningPatternSynthesis.ts and tests):
 *   FRUSTRATION_PATTERNS, SUCCESS_PATTERNS  — single source for capture/rating classification
 *   deriveToolFailureSig, collectFailureEvents, collectObservabilityClusters,
 *   readPatchRegistry, appendPatchRegistry, buildReport
 */

import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";

// ── Paths (LIFEOS_DIR override mirrors the hook/test convention) ────────────
const LIFEOS_DIR = process.env.LIFEOS_DIR ?? path.join(homedir(), ".claude", "LIFEOS");
const MEMORY_DIR = path.join(LIFEOS_DIR, "MEMORY");
const OBS_DIR = path.join(MEMORY_DIR, "OBSERVABILITY");
const FAILURES_DIR = path.join(MEMORY_DIR, "LEARNING", "FAILURES");
const PATCHES_DIR = path.join(MEMORY_DIR, "LEARNING", "PATCHES");
const PATCH_REGISTRY = path.join(PATCHES_DIR, "registry.jsonl");

const TRIM_SILENT_DAYS = 90;

// ── Pattern dictionaries (canonical copy — LearningPatternSynthesis imports these) ──
export const FRUSTRATION_PATTERNS: Record<string, RegExp> = {
  "Time/Performance Issues": /time|slow|delay|hang|wait|long|minutes|hours/i,
  "Incomplete Work": /incomplete|missing|partial|didn't finish|not done/i,
  "Wrong Approach": /wrong|incorrect|not what|misunderstand|mistake/i,
  "Over-engineering": /over-?engineer|too complex|unnecessary|bloat/i,
  "Tool/System Failures": /fail|error|broken|crash|bug|issue/i,
  "Communication Problems": /unclear|confus|didn't ask|should have asked/i,
  "Repetitive Issues": /again|repeat|still|same problem/i,
};

export const SUCCESS_PATTERNS: Record<string, RegExp> = {
  "Quick Resolution": /quick|fast|efficient|smooth/i,
  "Good Understanding": /understood|clear|exactly|perfect/i,
  "Proactive Help": /proactive|anticipat|helpful|above and beyond/i,
  "Clean Implementation": /clean|simple|elegant|well done/i,
};

// ── Types ────────────────────────────────────────────────────────────────────
export interface FailureEvent {
  classId: string;
  ts: string; // ISO
  source: string; // stream name
  detail: string;
  sessionId?: string;
}

export interface PatchRecord {
  ts: string;
  class_id: string;
  hypothesis_slug: string;
  files: string[];
  fixture: string | null;
  note?: string;
}

export interface ClassReportRow {
  class_id: string;
  count: number;
  count_in_window: number;
  first_seen: string;
  last_seen: string;
  sources: string[];
  patch: { ts: string; hypothesis_slug: string } | null;
  recurrences_since_patch: number;
  flags: string[]; // REOPENED | TRIM-CANDIDATE
}

// ── Class-ID derivation (deterministic, no LLM) ──────────────────────────────
function slugify(s: string, cap = 48): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, cap) || "unknown";
}

/** Normalized signature for a tool error: first meaningful line, digits and paths stripped. */
export function deriveToolFailureSig(error: string): string {
  const lines = (error || "").split("\n").map(l => l.trim()).filter(Boolean);
  let head = lines[0] ?? "";
  // "Exit code N" alone is too generic — pull in the next line's head for identity.
  if (/^exit code \d+$/i.test(head) && lines[1]) head = `${head} ${lines[1].slice(0, 60)}`;
  const normalized = head
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\/~]\S+/g, "") // paths
    .replace(/\d+/g, "");
  return slugify(normalized);
}

export function classifyCaptureText(text: string): string {
  for (const [name, re] of Object.entries(FRUSTRATION_PATTERNS)) {
    if (re.test(text)) return slugify(name);
  }
  return "unclassified";
}

// ── Stream parsers ───────────────────────────────────────────────────────────
function loadJsonl(filepath: string): any[] {
  if (!fs.existsSync(filepath)) return [];
  return fs.readFileSync(filepath, "utf-8")
    .split("\n")
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(x => x !== null);
}

type StreamDef = { file: string; toEvent: (r: any) => FailureEvent | null };

const STREAMS: StreamDef[] = [
  {
    file: "verification-gate.jsonl",
    toEvent: r => (r.decision === "block" || r.decision === "would-block-logonly")
      ? { classId: `vgate:${r.type ?? "T?"}`, ts: r.ts, source: "verification-gate", detail: [r.unit, r.evSummary].filter(Boolean).join(" — ") }
      : null,
  },
  {
    file: "format-gate.jsonl",
    toEvent: r => (r.decision === "flag" || r.decision === "block") && r.code
      ? { classId: `fgate:${slugify(String(r.code))}`, ts: r.ts, source: "format-gate", detail: String(r.detail ?? ""), sessionId: r.session_id }
      : null,
  },
  {
    file: "writing-gate.jsonl",
    toEvent: r => r.decision === "block"
      ? { classId: "wgate:block", ts: r.ts, source: "writing-gate", detail: `strong=${r.strong} weak=${r.weak}`, sessionId: r.session_id }
      : null,
  },
  {
    file: "tool-failures.jsonl",
    toEvent: r => r.event === "tool_failure"
      ? { classId: `tool:${slugify(String(r.tool_name ?? "unknown"), 24)}:${deriveToolFailureSig(String(r.error ?? ""))}`, ts: r.timestamp, source: "tool-failures", detail: String(r.error ?? "").slice(0, 200), sessionId: r.session_id }
      : null,
  },
  {
    file: "hook-healer.jsonl",
    toEvent: r => r.event
      ? { classId: `healer:${slugify(String(r.event), 24)}`, ts: r.timestamp, source: "hook-healer", detail: String(r.path ?? "") }
      : null,
  },
];

function collectCaptureEvents(): FailureEvent[] {
  if (!fs.existsSync(FAILURES_DIR)) return [];
  const out: FailureEvent[] = [];
  for (const month of fs.readdirSync(FAILURES_DIR)) {
    const monthDir = path.join(FAILURES_DIR, month);
    if (!fs.statSync(monthDir).isDirectory()) continue;
    for (const cap of fs.readdirSync(monthDir)) {
      const sentimentPath = path.join(monthDir, cap, "sentiment.json");
      if (!fs.existsSync(sentimentPath)) continue;
      try {
        const s = JSON.parse(fs.readFileSync(sentimentPath, "utf-8"));
        const text = `${s.summary ?? ""} ${s.detailed_context ?? ""}`;
        out.push({
          classId: `capture:${classifyCaptureText(text)}`,
          ts: s.captured_at ?? new Date(fs.statSync(sentimentPath).mtime).toISOString(),
          source: "failure-capture",
          detail: String(s.summary ?? "").slice(0, 200),
          sessionId: s.session_id,
        });
      } catch { /* skip malformed capture */ }
    }
  }
  return out;
}

/** All failure events across every stream, oldest-first. windowDays=0 → all history. */
export function collectFailureEvents(windowDays = 0): FailureEvent[] {
  const cutoff = windowDays > 0 ? Date.now() - windowDays * 86400_000 : 0;
  const events: FailureEvent[] = [];
  for (const s of STREAMS) {
    for (const r of loadJsonl(path.join(OBS_DIR, s.file))) {
      const e = s.toEvent(r);
      if (!e || !e.ts) continue;
      if (cutoff && new Date(e.ts).getTime() < cutoff) continue;
      events.push(e);
    }
  }
  for (const e of collectCaptureEvents()) {
    if (cutoff && new Date(e.ts).getTime() < cutoff) continue;
    events.push(e);
  }
  return events.sort((a, b) => a.ts.localeCompare(b.ts));
}

export interface ObservabilityCluster {
  classId: string;
  count: number;
  lastSeen: string;
  examples: string[]; // up to 5 detail strings
  sigRefs: string[]; // obs:<ts> evidence refs, up to 10
}

/** Window-scoped clusters for the deriver's intake. Capture events excluded —
 *  those already flow to the deriver via ratings.jsonl. */
export function collectObservabilityClusters(windowDays: number): ObservabilityCluster[] {
  const byClass = new Map<string, FailureEvent[]>();
  for (const e of collectFailureEvents(windowDays)) {
    if (e.source === "failure-capture") continue;
    const arr = byClass.get(e.classId) ?? [];
    arr.push(e);
    byClass.set(e.classId, arr);
  }
  return [...byClass.entries()].map(([classId, evs]) => ({
    classId,
    count: evs.length,
    lastSeen: evs[evs.length - 1].ts,
    examples: [...new Set(evs.map(e => e.detail).filter(Boolean))].slice(0, 5),
    sigRefs: evs.slice(-10).map(e => `obs:${e.ts}`),
  })).sort((a, b) => b.count - a.count);
}

// ── Patch registry ───────────────────────────────────────────────────────────
export function readPatchRegistry(): PatchRecord[] {
  return loadJsonl(PATCH_REGISTRY) as PatchRecord[];
}

export function appendPatchRegistry(rec: PatchRecord): void {
  fs.mkdirSync(PATCHES_DIR, { recursive: true });
  fs.appendFileSync(PATCH_REGISTRY, JSON.stringify(rec) + "\n");
}

// ── Report ───────────────────────────────────────────────────────────────────
export function buildReport(windowDays = 30): ClassReportRow[] {
  const all = collectFailureEvents(0);
  const cutoff = Date.now() - windowDays * 86400_000;
  const patches = readPatchRegistry();
  const latestPatch = new Map<string, PatchRecord>();
  for (const p of patches) latestPatch.set(p.class_id, p); // last wins (registry is append-ordered)

  const byClass = new Map<string, FailureEvent[]>();
  for (const e of all) {
    const arr = byClass.get(e.classId) ?? [];
    arr.push(e);
    byClass.set(e.classId, arr);
  }

  const rows: ClassReportRow[] = [];
  for (const [classId, evs] of byClass.entries()) {
    const patch = latestPatch.get(classId) ?? null;
    const recurrences = patch ? evs.filter(e => e.ts > patch.ts).length : 0;
    const lastSeen = evs[evs.length - 1].ts;
    const flags: string[] = [];
    if (patch && recurrences > 0) flags.push("REOPENED");
    if (patch && Date.now() - new Date(lastSeen).getTime() >= TRIM_SILENT_DAYS * 86400_000) flags.push("TRIM-CANDIDATE");
    rows.push({
      class_id: classId,
      count: evs.length,
      count_in_window: evs.filter(e => new Date(e.ts).getTime() >= cutoff).length,
      first_seen: evs[0].ts,
      last_seen: lastSeen,
      sources: [...new Set(evs.map(e => e.source))],
      patch: patch ? { ts: patch.ts, hypothesis_slug: patch.hypothesis_slug } : null,
      recurrences_since_patch: recurrences,
      flags,
    });
  }
  return rows.sort((a, b) => b.count_in_window - a.count_in_window || b.count - a.count);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const json = args.includes("--json");
  const wIdx = args.indexOf("--window");
  const windowDays = wIdx >= 0 ? parseInt((args[wIdx + 1] ?? "30").replace(/d$/, ""), 10) : 30;
  if (!Number.isFinite(windowDays) || windowDays < 1) {
    console.error("error: --window must be Nd (e.g. 30d)");
    process.exit(1);
  }

  const rows = buildReport(windowDays);
  if (json) {
    console.log(JSON.stringify({ window_days: windowDays, classes: rows }, null, 2));
  } else {
    console.log(`Recurrence report — ${rows.length} failure classes (window ${windowDays}d)\n`);
    for (const r of rows) {
      const patch = r.patch ? ` patched:${r.patch.ts.slice(0, 10)}(${r.patch.hypothesis_slug})` : "";
      const flags = r.flags.length ? ` [${r.flags.join(", ")}]` : "";
      console.log(`${r.class_id}  total:${r.count} window:${r.count_in_window} last:${r.last_seen.slice(0, 10)}${patch}${flags}`);
    }
    const reopened = rows.filter(r => r.flags.includes("REOPENED"));
    if (reopened.length) console.log(`\n⚠️  ${reopened.length} class(es) REOPENED — patch did not hold.`);
  }
  process.exit(0);
}
