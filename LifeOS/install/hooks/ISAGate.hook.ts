#!/usr/bin/env bun
/**
 * @version 1.1.0
 * ISAGate.hook.ts — deterministic ISA structural gate at the close transition (Stop).
 *
 * Thesis: the ISA doctrine's STRUCTURAL promises (mechanical progress count,
 * fog empty at close, every claim anchored to the stated goal) were enforced by
 * a markdown checklist the model may or may not run — so they leaked into closed
 * ISAs at scale (92 no-anchors, 60 no-anti, 14 fog-at-complete; 2026-07-23 audit).
 * This gate makes the un-gameable subset mechanical.
 *
 * Firing rule — BLOCK iff ALL hold; any failure ⇒ PASS (default pass):
 *   1. not a stop-hook recovery pass (loop guard)
 *   2. an ISA.md was Edit/Written THIS TURN (so legacy files are never gated
 *      retroactively — ISC-20 of the upgrade: the gate applies to new closes only)
 *   3. that ISA is at `phase: complete` on disk
 *   4. ISAGate.gateReport finds ≥1 HARD violation (progress-format / fog-at-complete
 *      / anchors-missing) — advisories NEVER block (the Goodhart line).
 *
 * Fail-OPEN on any read/parse error — the gate must never be why a Stop breaks.
 * The Goodhart-killed prose-quality Stop-block is NOT revived here: only binary
 * structural facts a throwaway entry cannot satisfy are hard. Env kill: ISAGATE_OFF=1.
 *
 * TRIGGER: Stop (dispatched by StopGates.hook.ts)
 */

import { parseTurnEvents } from "./lib/transcript-evidence";
import { gateReport } from "../LIFEOS/TOOLS/ISAGate";
import { existsSync, readFileSync } from "fs";

export async function run(input: any): Promise<object | null> {
  try {
    if (process.env.ISAGATE_OFF === "1") return null;
    if (input?.stop_hook_active) return null; // recovery pass — don't re-block
    const transcriptPath = input?.transcript_path;
    if (!transcriptPath || !existsSync(transcriptPath)) return null;

    // ISA files Edit/Written this turn — the gate never reaches back to a file
    // the turn didn't touch, so legacy closed ISAs are never retroactively gated.
    const events = parseTurnEvents(transcriptPath);
    const isaPaths = [
      ...new Set(
        events
          .filter((e) => e.kind === "edit" && /(^|\/)ISA\.md$/.test(e.target))
          .map((e) => e.target),
      ),
    ];
    if (!isaPaths.length) return null;

    const offenders: { path: string; hard: string[] }[] = [];
    for (const p of isaPaths) {
      if (!existsSync(p)) continue;
      // Only gate a genuine close.
      if (!/^phase:\s*complete\b/m.test(readFileSync(p, "utf8"))) continue;
      const r = gateReport(p);
      if (r.blocks) offenders.push({ path: p, hard: r.hard.map((h) => `[${h.code}] ${h.message}`) });
    }
    if (!offenders.length) return null;

    const lines = offenders.flatMap((o) => [
      `  ${o.path.replace(process.env.HOME || "", "~")}`,
      ...o.hard.map((h) => `    ❌ ${h}`),
    ]);
    return {
      decision: "block",
      reason:
        `ISA structural gate — an ISA closed this turn (phase: complete) has hard violations that must be fixed before it can close:\n` +
        lines.join("\n") +
        `\n\nThese are structural facts, not judgment calls. Fix the ISA (graduate/kill fog, add anchors_to, write progress as M/N), or set phase back to climbing if it isn't actually done. Advisories (bundled/event/uncovered claims) are surfaced by \`bun LIFEOS/TOOLS/ISAGate.ts <isa>\` and do NOT block.`,
    };
  } catch {
    return null; // fail open
  }
}
