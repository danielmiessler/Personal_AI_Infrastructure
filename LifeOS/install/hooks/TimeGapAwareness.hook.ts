#!/usr/bin/env bun
/**
 * @version 1.0.0
 * TimeGapAwareness.hook.ts — surface how long it's been since the last turn
 * on UserPromptSubmit, and cue the model to acknowledge long gaps out loud.
 *
 * Complements TimeContext.hook.ts (ported from public PR #1511), which
 * injects the live wall clock every turn but has no memory of the previous
 * turn — it can't tell the model whether 10 seconds or 10 months passed
 * since the user last spoke. Conversational cues alone are ambiguous too
 * (e.g. "I'm back after 3:30" says nothing about which 3:30, or how many
 * hours followed it), so this hook persists the timestamp of each turn and
 * diffs against it on the next one.
 *
 * Two thresholds, deliberately separate:
 *   - 30 minutes: note the gap internally (additionalContext only) so normal
 *     rapid back-and-forth doesn't get noisy per-turn clutter.
 *   - 2 hours: also cue the model to briefly acknowledge the gap out loud —
 *     silently *knowing* the gap isn't the point; surfacing it is what
 *     actually signals to the user that the context-awareness is real.
 *
 * Fails open throughout: a missing, corrupt, or unwritable state file never
 * blocks a turn — worst case, gap detection silently resets.
 *
 * Deliberately does not read stdin — gap tracking needs only wall-clock
 * timestamps, never prompt content, so there's nothing to drain.
 *
 * TRIGGER: UserPromptSubmit
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const LIFEOS_DIR = process.env.LIFEOS_DIR || join(homedir(), ".claude", "LIFEOS");
const STATE_PATH = join(LIFEOS_DIR, "MEMORY", "STATE", "time-gap-awareness.json");

const GAP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes — internal awareness only
const ACKNOWLEDGE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours — worth saying out loud

interface GapState {
  timestamp: string;
}

function formatGap(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"}`;
}

function loadLastTimestamp(): number | null {
  try {
    if (!existsSync(STATE_PATH)) return null;
    const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as Partial<GapState>;
    const t = typeof state.timestamp === "string" ? new Date(state.timestamp).getTime() : NaN;
    return Number.isFinite(t) ? t : null;
  } catch {
    return null; // corrupted state file — ignore, overwritten below
  }
}

function saveTimestamp(now: Date): void {
  try {
    mkdirSync(dirname(STATE_PATH), { recursive: true });
    const tmp = `${STATE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify({ timestamp: now.toISOString() } satisfies GapState));
    renameSync(tmp, STATE_PATH);
  } catch {
    // non-critical — worst case, gap detection resets next turn
  }
}

function emit(line: string): void {
  console.log(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: line },
    }),
  );
}

function main(): void {
  const now = new Date();
  const prevTimestamp = loadLastTimestamp();

  let line = "";
  if (prevTimestamp !== null) {
    const gapMs = now.getTime() - prevTimestamp;
    if (gapMs >= GAP_THRESHOLD_MS) {
      const gapText = formatGap(gapMs);
      line = `Last message was ${gapText} ago.`;
      if (gapMs >= ACKNOWLEDGE_THRESHOLD_MS) {
        line += ` Briefly acknowledge this gap (${gapText}) naturally at the start of your reply — a short, casual line, not a formal callout.`;
      }
    }
  }

  saveTimestamp(now);

  if (line) emit(line);
  process.exit(0);
}

try {
  main();
} catch {
  // fail open — never block a turn over gap tracking
  process.exit(0);
}
