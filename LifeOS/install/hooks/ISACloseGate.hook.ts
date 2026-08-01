#!/usr/bin/env bun
/**
 * @version 1.1.0
 * ISACloseGate.hook.ts — ISA-freshness gate at major-work completion (Stop).
 *
 * Scope: completion of a major piece of work, not every sub-task — the nudge layer already
 * covers mid-run staleness (AlgorithmNudge stale-isa). This gate has teeth exactly once, at
 * the close: a completion claim on a run whose ISA the work has outrun gets ONE block
 * instructing the fold-in (Algorithm claims 12-14).
 *
 * BLOCK iff ALL hold; any failure ⇒ PASS (default pass, fail-open):
 *   1. not a stop-hook recovery pass (loop guard)
 *   2. the session is bound to an active run in work.json (phase ≠ complete)
 *   3. the last message asserts completion in a claimable unit
 *      (reuses VerificationGate's unit split + non-claim guards)
 *   4. the message does not honestly address ISA state ("no ISA delta needed")
 *   5. no ISA edit in this turn's transcript, and no subagent this turn
 *      (a delegate may have updated the ISA in its own context)
 *   6. the run's ISA is stale: ≥ THRESHOLD tool calls since the last ISA edit
 *      (toolCallsSinceISAEditAbs, maintained by AlgorithmNudge ≥2.5.0 —
 *       resets ONLY on genuine ISA edits, never on nudge fire)
 *   7. not already blocked for this session+slug (fires once per run)
 *
 * Kill switch: ISACLOSEGATE_OFF=1. Threshold: ISACLOSEGATE_THRESHOLD (default 10).
 * Fail-OPEN on any read/parse error — the gate must never be why a Stop breaks.
 *
 * TRIGGER: Stop (evaluated inside StopGates.hook.ts, after VerificationGate)
 */

import { readHookInput, type HookInput } from "./lib/hook-io";
import { splitIntoUnits, stripNoise, unitIsClaimable } from "./VerificationGate.hook";
import { parseTurnEvents, spawnedAgent, type TxEvent } from "./lib/transcript-evidence";
import { findActiveSessionByUUID } from "./lib/isa-utils";
import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createHash } from "crypto";

const LIFEOS = process.env.LIFEOS_DIR || join(process.env.HOME!, ".claude", "LIFEOS");
const OBS_PATH = join(LIFEOS, "MEMORY", "OBSERVABILITY", "isa-close-gate.jsonl");
const STATE_PATH = join(LIFEOS, "MEMORY", "STATE", "isa-close-gate-blocked.json");
const NUDGE_STATE_DIR = join(LIFEOS, "MEMORY", "STATE", "isa-nudge");

const DEFAULT_THRESHOLD = 10;
const ISA_PATH_RE = /(?:^|\/)(?:ISA\.md|bunker\.isa\.md)$/i;

/** Major-work completion assertions. Bare "done"/"finished" units count on
 * purpose — with an active run bound and the ISA provably stale, "Done." IS
 * the moment this gate exists for. The unit guards (negation, question,
 * imperative, narration) upstream kill the ordinary-prose false positives. */
export const COMPLETION_RE =
  /\b(done|complete(d)?|finished|shipped|implemented|built\s+and\s+(verified|tested)|all\s+(\d+\s+)?claims?\s+closed|all\s+(green|passing)|feature\s+(is\s+)?(live|done|complete|in)|task\s+complete|work\s+(is\s+)?(done|complete)|good\s+to\s+go|ready\s+to\s+ship)\b/i;

/** Honest ISA-state statement — the author already addressed the artifact.
 * "ISA updated", "ISA already current", "no ISA delta needed" all pass. */
export const ISA_ADDRESSED_RE =
  /\bISA(?:'s|s)?\s+(?:is\s+|was\s+|are\s+)?(?:already\s+)?(?:current|up[\s-]?to[\s-]?date|updated|unchanged|fresh|complete|closed|\d+\s*\/\s*\d+)\b|\bno\s+ISA\s+(?:update|delta|change)s?\s+(?:needed|required)\b|\bupdated?\s+the\s+ISA\b|\bISA\s+doesn'?t\s+need\b/i;

export function completionUnit(message: string): string | null {
  for (const u of splitIntoUnits(stripNoise(message)).filter(unitIsClaimable)) {
    // Recipe tail ("Run the tests, then it's done") — the comma split leaves a
    // "then …" fragment that isn't a claim about work already finished.
    if (/^\s*(then|and\s+then|after\s+that|so\s+that)\b/i.test(u)) continue;
    if (COMPLETION_RE.test(u)) return u;
  }
  return null;
}

export function isaEditedThisTurn(ev: TxEvent[]): boolean {
  return ev.some((e) => e.kind === "edit" && ISA_PATH_RE.test(e.target));
}

// ── State + telemetry (same shape as VerificationGate) ───────────────────────
function fingerprint(session: string, slug: string): string {
  return createHash("sha256").update(`${session}|${slug}`).digest("hex").slice(0, 16);
}
function alreadyBlocked(fp: string): boolean {
  try {
    if (!existsSync(STATE_PATH)) return false;
    return (JSON.parse(readFileSync(STATE_PATH, "utf-8")) as string[]).includes(fp);
  } catch { return false; }
}
function recordBlocked(fp: string): void {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    let arr: string[] = [];
    if (existsSync(STATE_PATH)) { try { arr = JSON.parse(readFileSync(STATE_PATH, "utf-8")); } catch {} }
    arr.push(fp);
    if (arr.length > 400) arr = arr.slice(-400);
    writeFileSync(STATE_PATH, JSON.stringify(arr));
  } catch {}
}
function obs(rec: Record<string, unknown>): void {
  try { mkdirSync(dirname(OBS_PATH), { recursive: true }); appendFileSync(OBS_PATH, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + "\n"); } catch {}
}

function staleness(sessionId: string): number | null {
  try {
    const p = join(NUDGE_STATE_DIR, `${sessionId}.json`);
    if (!existsSync(p)) return null;
    const s = JSON.parse(readFileSync(p, "utf-8"));
    const abs = s.toolCallsSinceISAEditAbs ?? (s as any).toolCallsSinceIsaEditAbs;
    return typeof abs === "number" ? abs : null;
  } catch { return null; }
}

/** Returns a decision object to emit, or null. Pure — no exit, no stdout. */
export async function run(input: HookInput): Promise<object | null> {
  if (process.env.ISACLOSEGATE_OFF === "1") return null;
  if (input.stop_hook_active === true) { obs({ decision: "skip-recovery" }); return null; }

  const message = input.last_assistant_message ?? "";
  if (!message.trim()) return null;
  const session = input.session_id ?? "";
  if (!session) return null;

  let active: ReturnType<typeof findActiveSessionByUUID> = null;
  try { active = findActiveSessionByUUID(session); } catch { return null; }
  if (!active) return null;
  if ((active.session.phase || "").toLowerCase() === "complete") return null;

  const unit = completionUnit(message);
  if (!unit) return null;

  if (ISA_ADDRESSED_RE.test(stripNoise(message))) { obs({ decision: "pass-isa-addressed", slug: active.slug }); return null; }

  let ev: TxEvent[] = [];
  try { ev = parseTurnEvents(input.transcript_path); } catch { obs({ decision: "pass-transcript-error" }); return null; }
  if (isaEditedThisTurn(ev)) { obs({ decision: "pass-isa-edited", slug: active.slug }); return null; }
  // A subagent may have folded results into the ISA inside its own transcript;
  // the abs counter also can't see subagent edits (primary-only gate upstream).
  if (spawnedAgent(ev)) { obs({ decision: "pass-subagent", slug: active.slug }); return null; }

  const threshold = Number(process.env.ISACLOSEGATE_THRESHOLD) || DEFAULT_THRESHOLD;
  const stale = staleness(session);
  if (stale === null || stale < threshold) { obs({ decision: "pass-fresh", slug: active.slug, stale }); return null; }

  const fp = fingerprint(session, active.slug);
  if (alreadyBlocked(fp)) { obs({ decision: "pass-dedupe", slug: active.slug }); return null; }

  recordBlocked(fp);
  obs({ decision: "block", slug: active.slug, unit, stale });
  return {
    decision: "block",
    reason: `ISA CLOSE GAP [ISACloseGate]. You declared work complete ("${unit}") on the run '${active.slug}', but its ISA hasn't been edited in ${stale} tool calls and wasn't updated this turn. At the close of a major piece of work the ISA must reflect it (Algorithm claims 12-14): close finished claims with one-line evidence stubs, record decisions and learnings, and update \`phase:\`/\`progress:\` if they changed. Update ${active.session.isa || "the run's ISA"} now, then restate — or state explicitly why no ISA delta is needed. This gate fires once per run.`,
  };
}

if (import.meta.main) {
  (async () => {
    const input = await readHookInput();
    if (input) {
      const d = await run(input);
      if (d) console.log(JSON.stringify(d));
    }
    process.exit(0);
  })().catch((err) => { console.error("[ISACloseGate] fatal:", err); process.exit(0); });
}
