#!/usr/bin/env bun
/**
 * @version 1.1.0
 * Reflect.ts — the reflection writer. Schema 9.
 *
 * WHY THIS EXISTS (2026-07-24, spend-dial fix F3/F4):
 * Reflections were appended by hand, so the corpus drifted: only 100 of 1,225
 * records carried schema 7, `context_sufficient` was null in 987 of them, and
 * one malformed line (an unescaped \Z) made the whole file unstreamable by jq —
 * the file the /algo loop reads.
 *
 * The worse defect was `within_budget`. Algorithm claim 15 checks spend via
 * "SELF + reflection within_budget", and self-attestation returned true in
 * 1,163 of 1,220 records (95.3%). Over the same period SpendAuditor — which
 * already runs on its own trigger set — returned 65 underspend against 19
 * match. Two contradicting signals with nothing joining them.
 *
 * So `within_budget` is now DERIVED here and the caller cannot supply it:
 *   spend-audit verdict "match"                  -> true
 *   spend-audit verdict "underspend"/"overspend" -> false
 *   no audit for the session                     -> null  (never true)
 *
 * That last line is the point. Absence of measurement is not a pass. A null
 * reads as "unmeasured" in the corpus instead of silently inflating the
 * pass rate, which is exactly how the 95% number was manufactured.
 *
 * SCHEMA 9 (2026-07-28): the self-critique channel (Q1–Q3 lineage, "what would
 * a smarter run have done") was orphaned in the 7→8 rebuild — schema 8 kept
 * only optional notes, so the corpus's improvement signal went dark on
 * 2026-07-11 and nothing noticed for 17 days. Schema 9 restores it as ONE
 * required `reflection` field. Operational notes stay in `notes`.
 *
 * Usage:
 *   bun Reflect.ts --session <id> --slug <slug> --reflection "..."
 *                  [--iteration N] [--claims ISC-1,ISC-2] [--evidence bun-test,curl]
 *                  [--deploys v1.2.0] [--work-kind feature-build]
 *                  [--context-sufficient true|false] [--notes "..."]
 *                  [--dry-run]
 *
 * Exit codes: 0 appended (or dry-run valid) · 1 validation failure, nothing
 * written. A malformed record is never appended — that is the corpus gate.
 */

import { existsSync, appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LIFEOS = process.env.LIFEOS_DIR ?? join(process.env.HOME ?? "~", ".claude", "LIFEOS");
const REFLECTIONS = join(LIFEOS, "MEMORY", "LEARNING", "REFLECTIONS", "algorithm-reflections.jsonl");
const SPEND_AUDIT = join(LIFEOS, "MEMORY", "OBSERVABILITY", "spend-audit.jsonl");
const SUBAGENT_EVENTS = join(LIFEOS, "MEMORY", "OBSERVABILITY", "subagent-events.jsonl");

const SCHEMA = 9;

export interface SpendFacts {
  /** SpendAuditor verdict for this session, or null when never audited. */
  verdict: "match" | "underspend" | "overspend" | null;
  verdict_confidence: number | null;
  /** Agent dispatches observed for this session. */
  dispatches: number;
  /** model -> count, so rung mix is auditable after the fact. */
  rung_mix: Record<string, number>;
}

export interface Reflection {
  schema: 9;
  ts: string;
  session_id: string;
  slug: string;
  iteration: number;
  work_kind: string | null;
  claims_closed: string[];
  evidence_classes: string[];
  deploys: string[];
  /** DERIVED — never caller-supplied. null means unmeasured, not pass. */
  within_budget: boolean | null;
  spend: SpendFacts;
  context_sufficient: boolean | null;
  /** The self-critique channel (Q1–Q3 lineage): what a smarter run would have done. Required. */
  reflection: string;
  notes: string | null;
}

/** Read a JSONL file, skipping unparseable lines rather than throwing. */
function readJsonl(path: string): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  const out: Record<string, unknown>[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* tolerate; the writer gates new rows */ }
  }
  return out;
}

/**
 * Join SpendAuditor + dispatch telemetry for a session. This is the whole
 * point of the tool: the numbers come from what the system observed, not from
 * what the run says about itself.
 */
export function deriveSpend(sessionId: string): SpendFacts {
  const audits = readJsonl(SPEND_AUDIT)
    .filter((r) => r.session_id === sessionId)
    .filter((r) => r.verdict && typeof r.verdict === "object");

  const last = audits.at(-1);
  const v = (last?.verdict ?? null) as { verdict?: string; confidence?: number } | null;
  const verdict = (v?.verdict as SpendFacts["verdict"]) ?? null;

  const rung_mix: Record<string, number> = {};
  let dispatches = 0;
  for (const e of readJsonl(SUBAGENT_EVENTS)) {
    if (e.session_id !== sessionId) continue;
    if (e.event !== "subagent_start") continue;
    dispatches++;
    const m = (e.subagent_model as string) ?? "inherited";
    rung_mix[m] = (rung_mix[m] ?? 0) + 1;
  }

  return {
    verdict: verdict === "match" || verdict === "underspend" || verdict === "overspend" ? verdict : null,
    verdict_confidence: typeof v?.confidence === "number" ? v.confidence : null,
    dispatches,
    rung_mix,
  };
}

/**
 * within_budget from measured spend. `null` when the session was never
 * audited — an unmeasured run must never read as a passing one.
 */
export function deriveWithinBudget(spend: SpendFacts): boolean | null {
  if (spend.verdict === null) return null;
  return spend.verdict === "match";
}

/** Schema-8 shape gate. Returns the list of problems; empty means valid. */
export function validate(r: Partial<Reflection>): string[] {
  const errs: string[] = [];
  if (r.schema !== SCHEMA) errs.push(`schema must be ${SCHEMA}`);
  for (const f of ["ts", "session_id", "slug"] as const) {
    if (typeof r[f] !== "string" || !r[f]) errs.push(`${f} must be a non-empty string`);
  }
  if (typeof r.iteration !== "number" || r.iteration < 0) errs.push("iteration must be a non-negative number");
  for (const f of ["claims_closed", "evidence_classes", "deploys"] as const) {
    if (!Array.isArray(r[f])) errs.push(`${f} must be an array`);
    else if ((r[f] as unknown[]).some((x) => typeof x !== "string")) errs.push(`${f} must contain only strings`);
  }
  if (!(r.within_budget === true || r.within_budget === false || r.within_budget === null)) {
    errs.push("within_budget must be true|false|null");
  }
  if (!r.spend || typeof r.spend !== "object") errs.push("spend facts missing");
  if (!(r.context_sufficient === true || r.context_sufficient === false || r.context_sufficient === null)) {
    errs.push("context_sufficient must be true|false|null");
  }
  if (typeof r.reflection !== "string" || !r.reflection.trim()) {
    errs.push("reflection must be a non-empty string — what would a smarter run have done (--reflection)");
  }
  // The record must survive a round trip, or it poisons the corpus for jq.
  try {
    const s = JSON.stringify(r);
    if (s.includes("\n")) errs.push("record contains a raw newline");
    JSON.parse(s);
  } catch (e) {
    errs.push(`record is not serializable: ${e instanceof Error ? e.message : String(e)}`);
  }
  return errs;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const list = (name: string): string[] =>
  (arg(name) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function tri(name: string): boolean | null {
  const v = arg(name);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

if (import.meta.main) {
  const session_id = arg("session");
  const slug = arg("slug");
  if (!session_id || !slug) {
    console.error("Reflect.ts: --session and --slug are required");
    process.exit(1);
  }
  if (process.argv.includes("--within-budget")) {
    console.error("Reflect.ts: within_budget is derived from spend-audit.jsonl and cannot be supplied (F3/C11).");
    process.exit(1);
  }

  const spend = deriveSpend(session_id);
  const record: Reflection = {
    schema: SCHEMA,
    ts: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    session_id,
    slug,
    iteration: Number(arg("iteration") ?? 1),
    work_kind: arg("work-kind") ?? null,
    claims_closed: list("claims"),
    evidence_classes: list("evidence"),
    deploys: list("deploys"),
    within_budget: deriveWithinBudget(spend),
    spend,
    context_sufficient: tri("context-sufficient"),
    reflection: (arg("reflection") ?? "").trim(),
    notes: arg("notes") ?? null,
  };

  const errs = validate(record);
  if (errs.length) {
    console.error("Reflect.ts: record REJECTED, nothing appended:");
    for (const e of errs) console.error(`  - ${e}`);
    process.exit(1);
  }

  const line = JSON.stringify(record);
  if (process.argv.includes("--dry-run")) {
    console.log(line);
    process.exit(0);
  }
  appendFileSync(REFLECTIONS, line + "\n", "utf8");
  const wb = record.within_budget === null ? "null (unaudited)" : String(record.within_budget);
  console.log(`✅ reflection appended · within_budget=${wb} · verdict=${spend.verdict ?? "none"} · dispatches=${spend.dispatches}`);
}
