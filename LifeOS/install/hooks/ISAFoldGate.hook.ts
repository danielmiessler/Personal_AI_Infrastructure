#!/usr/bin/env bun
/**
 * @version 1.0.0
 * ISAFoldGate.hook.ts — the D-50 gate: prod mutated, ISA untouched → fold before closing.
 *
 * Origin (2026-07-29, {{PRINCIPAL_NAME}}: "you were supposed to do that after the work finished — why
 * isn't that functionality working from the hooks?"): ISACloseGate only wakes on completion
 * PHRASES, so a turn that installs secrets, applies an import, or deploys — and then reports
 * in words outside COMPLETION_RE's vocabulary — ends with the state-of-record stale and no
 * gate fired. Vector's D-50 named the failure class ("a fact that changed a claim got
 * written into narrative instead of into the claim"); this is its enforcement.
 *
 * BLOCK iff ALL hold; any failure ⇒ PASS (default pass, fail-open):
 *   1. not a stop-hook recovery pass (loop guard)
 *   2. the session is bound to an active run in work.json (phase ≠ complete)
 *   3. this turn's transcript contains ≥1 SUCCESSFUL prod-mutating call:
 *      a `deploy`-kind event, a remote D1 write (wrangler d1 execute … --remote with a
 *      write verb or --file), `wrangler secret put`, a remote KV key put/delete, or one
 *      of our own write-flag tools (`--apply`, Release.ts)
 *   4. no ISA edit in this turn, and no subagent this turn (a delegate may own the fold)
 *   5. the final message does not honestly address ISA state (ISA_ADDRESSED_RE — "ISA
 *      updated", "no ISA delta needed", etc. all pass)
 *
 * Unlike ISACloseGate there is NO once-per-run latch: every mutating turn owes its fold,
 * so recurrence is the point. Natural termination: the recovery turn either edits the ISA
 * or states why no delta is needed — both pass condition 4/5 next evaluation.
 *
 * Kill switch: ISAFOLDGATE_OFF=1. Fail-OPEN on any read/parse error.
 * TRIGGER: Stop (evaluated inside StopGates.hook.ts, after ISACloseGate)
 */

import type { HookInput } from "./lib/hook-io";
import { parseTurnEvents, spawnedAgent, type TxEvent } from "./lib/transcript-evidence";
import { findActiveSessionByUUID } from "./lib/isa-utils";
import { isaEditedThisTurn, ISA_ADDRESSED_RE } from "./ISACloseGate.hook";
import { appendFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

const LIFEOS = process.env.LIFEOS_DIR || join(process.env.HOME!, ".claude", "LIFEOS");
const OBS_PATH = join(LIFEOS, "MEMORY", "OBSERVABILITY", "isa-fold-gate.jsonl");

/** Prod-mutating command shapes. Conservative and explicit: each one is a class this
 * system actually uses to change remote state. A plain local test/build never matches. */
const PROD_MUTATION_RES: RegExp[] = [
  /wrangler\s+d1\s+execute\s+\S+[^\n]*--remote[^\n]*(--file|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bCREATE\b|\bALTER\b)/is,
  /wrangler\s+secret\s+put\b/i,
  /wrangler\s+kv\s+key\s+(put|delete)\b/i,
  /Tools\/Release\.ts\b/,
  /\s--apply\b/, // our importers' one write flag (ImportBackfill, ProvisionPortal, …)
];

export function prodMutations(ev: TxEvent[]): TxEvent[] {
  return ev.filter((e) => {
    if (e.isError) return false; // a failed attempt changed nothing
    if (e.kind === "deploy") return true;
    if (e.kind !== "command") return false;
    // Match on the command text only, never its output.
    return PROD_MUTATION_RES.some((re) => re.test(e.target));
  });
}

function obs(entry: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(OBS_PATH), { recursive: true });
    appendFileSync(OBS_PATH, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    /* observability must never break the gate */
  }
}

export async function run(input: HookInput): Promise<object | null> {
  try {
    if (process.env.ISAFOLDGATE_OFF === "1") return null;
    if ((input as { stop_hook_active?: boolean }).stop_hook_active) return null;

    const active = findActiveSessionByUUID(input.session_id);
    if (!active || active.session?.phase === "complete") return null;

    let ev: TxEvent[];
    try {
      ev = parseTurnEvents(input.transcript_path);
    } catch {
      obs({ decision: "pass-transcript-error" });
      return null;
    }

    const mutations = prodMutations(ev);
    if (mutations.length === 0) return null;
    if (isaEditedThisTurn(ev)) {
      obs({ decision: "pass-isa-edited", slug: active.slug, mutations: mutations.length });
      return null;
    }
    if (spawnedAgent(ev)) {
      obs({ decision: "pass-delegated", slug: active.slug });
      return null;
    }

    const message = (input as { last_assistant_message?: string }).last_assistant_message ?? "";
    if (ISA_ADDRESSED_RE.test(message)) {
      obs({ decision: "pass-isa-addressed", slug: active.slug });
      return null;
    }

    const sample = mutations
      .slice(0, 3)
      .map((m) => (m.kind === "deploy" ? "deploy" : m.target.slice(0, 60)))
      .join(" · ");
    obs({ decision: "block", slug: active.slug, mutations: mutations.length, sample });
    return {
      decision: "block",
      reason:
        `ISA FOLD GAP [ISAFoldGate/D-50]. This turn changed live state (${mutations.length} prod-mutating call(s): ${sample}) ` +
        `on the run '${active.slug}', but its ISA was not touched and the reply does not address ISA state. ` +
        `A fact that changes a claim goes into the claim, same turn (D-50; Algorithm claims 12-14). ` +
        `Fold the new state into ${active.session.isa || "the run's ISA"} now (evidence stubs on affected claims, ` +
        `progress/phase if changed), then restate — or state explicitly why no ISA delta is needed.`,
    };
  } catch (err) {
    obs({ decision: "pass-error", error: String(err) });
    return null;
  }
}
