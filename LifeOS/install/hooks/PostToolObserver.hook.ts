#!/usr/bin/env bun
/**
 * @version 1.0.3
 * TRIGGER: PostToolUse (catchall, matcher "") — must stay on the empty matcher so it fires on EVERY tool call.
 * PostToolObserver.hook.ts — the ONE sync catchall PostToolUse hook.
 *
 * Consolidation (2026-07-11, hooks BPE pass): merges the two sync catchall
 * spawns that fire on EVERY tool call into one process:
 *
 *   1. LoopDetector.run()    — exact-repeat / oscillation / hammering detection
 *   2. AlgorithmNudge.run()  — Algorithm live nudge layer (run-scoped nudges +
 *                              always-on late-ISA; renamed from ISANudge 2026-07-11)
 *
 * Both emit additionalContext; outputs are joined with a newline into one
 * hookSpecificOutput. EventLogger stays separately registered (async — pure
 * observability, no context channel needed). Each sub-hook file remains the
 * owner of its logic and runnable standalone.
 *
 * Failure mode: per-sub-hook try/catch; never blocks the session; exit 0.
 */

import { run as loopDetector } from "./LoopDetector.hook";
import { run as algorithmNudge } from "./AlgorithmNudge.hook";
import { run as systemChangeSurface } from "./SystemChangeSurface.hook";

/** The ⚙️ line follows the 🧠 contract: computed by the hook, echoed verbatim.
 *  Stating that beside the line is what keeps it from being paraphrased. */
const SURFACE_PREAMBLE =
  "<lifeos-system-delta>\nSystem-surface changes this turn (computed deterministically by " +
  "SystemChangeSurface.hook.ts). Render this line VERBATIM as the ⚙️ SYSTEM line of the " +
  "output format, exactly once, immediately above the 🧠 MEMORY line. Do not recompute or " +
  "rephrase it:\n";

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), 2000);
    process.stdin.on("data", (c) => { data += c.toString(); });
    process.stdin.on("end", () => { clearTimeout(timer); resolve(data); });
    process.stdin.on("error", () => { clearTimeout(timer); resolve(data); });
  });
}

(async () => {
  const raw = await readStdin();
  if (!raw.trim()) process.exit(0);
  let input: Record<string, unknown>;
  try { input = JSON.parse(raw); } catch { process.exit(0); }

  const parts: string[] = [];
  try { const m = loopDetector(input as never); if (m) parts.push(m); } catch {}
  try { const m = algorithmNudge(input as never); if (m) parts.push(m); } catch {}
  try { const m = systemChangeSurface(input as never); if (m) parts.push(SURFACE_PREAMBLE + m + "\n</lifeos-system-delta>"); } catch {}

  if (parts.length > 0) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: (input.hook_event_name as string) || "PostToolUse",
        additionalContext: parts.join("\n"),
      },
    }));
  }
  process.exit(0);
})().catch(() => process.exit(0));
