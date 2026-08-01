#!/usr/bin/env bun
/**
 * @version 1.2.0
 * StopGates.hook.ts — the ONE Stop-event gate hook.
 *
 * Consolidation (2026-07-11, hooks BPE pass): merges the three per-turn gate
 * spawns into one process, reading stdin ONCE. Each gate file remains the
 * owner of its logic (and stays runnable standalone via its own shim); this
 * hook imports their exported run() and evaluates in the old registration
 * order:
 *
 *   1. OutputFormatGate.run()  — banner/aispeak/heartbeat (telemetry-only today)
 *   2. VerificationGate.run()  — claim-vs-evidence teeth (T1-T3 block)
 *   3. ISACloseGate.run()      — ISA-freshness teeth at major-work completion
 *   4. ISAFoldGate.run()       — D-50 teeth: prod mutated + ISA untouched blocks
 *   5. WritingGate.run()       — authored-prose audit teeth (strong signals block)
 *
 * Decision semantics: the FIRST gate returning a `decision:"block"` wins and
 * is emitted; later gates are still evaluated for their telemetry EXCEPT after
 * a block (matching the old behavior closely enough — two simultaneous blocks
 * were never actionable, the harness takes one recovery turn anyway).
 * `{continue:true}` returns (stop_hook_active recovery) are emitted once.
 *
 * Failure mode: each gate's run() fails open internally; this wrapper catches
 * anything residual per-gate so one gate's crash never silences the others.
 * The gate must never be why a Stop breaks — always exit 0.
 */

import { readHookInput } from "./lib/hook-io";
import { run as formatGate } from "./FormatGate.hook";
import { run as verificationGate } from "./VerificationGate.hook";
import { run as isaCloseGate } from "./ISACloseGate.hook";
import { run as isaFoldGate } from "./ISAFoldGate.hook";
import { run as isaStructureGate } from "./ISAGate.hook";
import { run as writingGate } from "./WritingGate.hook";

type GateFn = (input: any) => Promise<object | null>;

// OutputFormatGate (mode-banner telemetry) removed 2026-07-11; FormatGate is
// its unified-format successor WITH TEETH (2026-07-11): deterministic
// structural checks on the one LifeOS format — banner first, 🗣️ closer last,
// 🧠 line when a delta arrived, ≤2 prose em-dashes. Voice/vocabulary drift
// stays DriftReminder's job; this gate is structure only. First in order so a
// format fix is the recovery turn's single clear instruction.
const GATES: Array<[string, GateFn]> = [
  ["FormatGate", formatGate],
  ["VerificationGate", verificationGate],
  // ISACloseGate: a completion claim on an active run with a provably stale ISA blocks
  // once. Order matters — evidence gaps (VerificationGate) outrank the bookkeeping fold-in.
  ["ISACloseGate", isaCloseGate],
  // ISAFoldGate (2026-07-29, D-50 enforcement): prod mutated this turn + active run +
  // ISA untouched + reply silent on ISA state → block. Phrase-independent — the gap
  // ISACloseGate's COMPLETION_RE cannot see ("rigged and armed" isn't "done").
  ["ISAFoldGate", isaFoldGate],
  // ISAGate (2026-07-24, granularity/testability upgrade F3): blocks a close
  // (phase: complete written this turn) on un-gameable STRUCTURAL violations —
  // non-M/N progress, fog-at-complete, missing anchors_to. Scoped to ISAs
  // touched this turn (legacy files never retroactively gated). Complements
  // ISACloseGate (stale-ISA) with a different, structural tooth.
  ["ISAGate", isaStructureGate],
  ["WritingGate", writingGate],
];

(async () => {
  const input = await readHookInput();
  if (!input) process.exit(0);

  let emitted: object | null = null;
  for (const [name, gate] of GATES) {
    try {
      const d = await gate(input);
      if (d && !emitted) {
        emitted = d;
        // A block ends the turn's gate evaluation — the recovery turn re-runs all gates.
        if ((d as { decision?: string }).decision === "block") break;
      }
    } catch (err) {
      console.error(`[StopGates] ${name} error:`, err);
    }
  }
  if (emitted) console.log(JSON.stringify(emitted));
  process.exit(0);
})().catch((err) => {
  console.error("[StopGates] fatal:", err);
  process.exit(0);
});
