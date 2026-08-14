#!/usr/bin/env bun
/**
 * @version 2.1.0
 * MemoryReviewFire — Stop hook that owns the WHOLE memory-review cadence.
 *
 * Consolidation (2026-07-11, thinking-system BPE strip): the old design split
 * the cadence across two hooks — MemoryReviewTrigger (per-prompt: tick counter,
 * idle detection, pending_review flag, debounce-cancel) and this one (consume
 * the flag at Stop). Firing at Stop is already the quiet moment the idle/
 * debounce machinery approximated, so the handshake was scaffolding. Now:
 *
 *   On every primary-session Stop:
 *     1. THIS SESSION's turn_count += 1, last_message_at = now
 *     2. If this session's turn_count >= turn_threshold AND minutes since the
 *        GLOBAL last_review >= min_minutes_between → spawn MemoryReviewer.ts
 *        detached, reset this session's counter, stamp the global clock.
 *
 * Per-session cadence (public issue #1711, @jacobo-ortiz): the turn counter used
 * to live in the single global review-state.json, so two concurrent sessions
 * incremented and reset each other's count — a busy session could starve a quiet
 * one, and read-modify-write interleaving lost ticks outright. The counter now
 * lives per session at MEMORY/STATE/memory-review/<session_id>.json, mirroring
 * the per-session pattern already used by hooks/MemoryTurnStart.hook.ts.
 *
 * The two halves of the trigger are deliberately scoped differently:
 *   - turn_threshold is PER SESSION. It asks "has this conversation moved enough
 *     to be worth reviewing?", which is only meaningful within one transcript.
 *   - min_minutes_between stays GLOBAL. It is the inference-volume guard, and a
 *     per-session rate cap would let N sessions run N reviews per window.
 *
 * OBSERVABILITY/review-state.json is still written on every Stop as a mirror, so
 * the statusline 🧠 MEM line, MemoryStatus.ts, MemoryHealthCheck.ts and the Pulse
 * memory module keep reading the schema they already know. Its `last_review_at`
 * remains load-bearing (it IS the global rate cap); its turn count is now
 * display-only and last-writer-wins across concurrent sessions.
 * Cadence parameters: LIFEOS/USER/CONFIG/memory-review.json.
 *
 * Failure mode: any error logs to stderr and exits 0 (never block Stop).
 */

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve as pathResolve } from "node:path";
import { homedir } from "node:os";
import { isSubagentContext as isSubagent } from './lib/subagent';

const CLAUDE_ROOT = pathResolve(homedir(), ".claude");
const STATE_PATH = pathResolve(CLAUDE_ROOT, "LIFEOS/MEMORY/OBSERVABILITY/review-state.json");
const SESSION_STATE_DIR = pathResolve(CLAUDE_ROOT, "LIFEOS/MEMORY/STATE/memory-review");
const CONFIG_PATH = pathResolve(CLAUDE_ROOT, "LIFEOS/USER/CONFIG/memory-review.json");
const FIRE_LOG_PATH = pathResolve(CLAUDE_ROOT, "LIFEOS/MEMORY/OBSERVABILITY/reviewer-fires.jsonl");
const REVIEWER_PATH = pathResolve(CLAUDE_ROOT, "LIFEOS/TOOLS/MemoryReviewer.ts");

/** Per-session state files older than this are pruned opportunistically. */
const SESSION_STATE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ReviewState {
  turn_count_since_last_review: number;
  last_review_at: string | null;
  last_message_at: string | null;
  pending_review: boolean; // kept for statusline schema compat; always false now
  schema_version: 1;
}

const INITIAL_STATE: ReviewState = {
  turn_count_since_last_review: 0,
  last_review_at: null,
  last_message_at: null,
  pending_review: false,
  schema_version: 1,
};

function loadConfig(): { turn_threshold: number; min_minutes_between: number } {
  const fallback = { turn_threshold: 8, min_minutes_between: 30 };
  try {
    if (!existsSync(CONFIG_PATH)) return fallback;
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    return {
      turn_threshold: typeof raw.turn_threshold === "number" ? raw.turn_threshold : fallback.turn_threshold,
      min_minutes_between: typeof raw.min_minutes_between === "number" ? raw.min_minutes_between : fallback.min_minutes_between,
    };
  } catch {
    return fallback;
  }
}

function loadState(): ReviewState {
  try {
    if (!existsSync(STATE_PATH)) return { ...INITIAL_STATE };
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return {
      turn_count_since_last_review: typeof raw.turn_count_since_last_review === "number" ? raw.turn_count_since_last_review : 0,
      last_review_at: typeof raw.last_review_at === "string" ? raw.last_review_at : null,
      last_message_at: typeof raw.last_message_at === "string" ? raw.last_message_at : null,
      pending_review: false,
      schema_version: 1,
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState(state: ReviewState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf8");
  renameSync(tmp, STATE_PATH);
}

// ── Per-session cadence state (public issue #1711, @jacobo-ortiz) ────────────

interface SessionReviewState {
  turn_count_since_last_review: number;
  last_review_at: string | null;
  last_message_at: string | null;
  schema_version: 1;
}

/**
 * Same sanitiser as hooks/MemoryTurnStart.hook.ts so both per-session stores
 * key off an identical filename for a given session.
 *
 * A null session_id (no stdin, or unparseable) degrades to one shared "unknown"
 * bucket — i.e. exactly the pre-fix global behaviour, which is the right
 * fallback: it never fires more often than the old code did.
 */
function sessionStatePath(sessionId: string | null): string {
  const safe = (sessionId ?? "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
  return join(SESSION_STATE_DIR, `${safe}.json`);
}

function loadSessionState(sessionId: string | null): SessionReviewState {
  const empty: SessionReviewState = {
    turn_count_since_last_review: 0,
    last_review_at: null,
    last_message_at: null,
    schema_version: 1,
  };
  try {
    const p = sessionStatePath(sessionId);
    if (!existsSync(p)) return empty;
    const raw = JSON.parse(readFileSync(p, "utf8"));
    return {
      turn_count_since_last_review:
        typeof raw.turn_count_since_last_review === "number" ? raw.turn_count_since_last_review : 0,
      last_review_at: typeof raw.last_review_at === "string" ? raw.last_review_at : null,
      last_message_at: typeof raw.last_message_at === "string" ? raw.last_message_at : null,
      schema_version: 1,
    };
  } catch {
    return empty;
  }
}

function saveSessionState(sessionId: string | null, state: SessionReviewState): void {
  const p = sessionStatePath(sessionId);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf8");
  renameSync(tmp, p);
}

/**
 * Drop per-session files untouched for SESSION_STATE_TTL_MS. Called only when a
 * review actually fires — rare enough to keep Stop cheap, frequent enough that
 * the directory cannot grow without bound. Never removes the current session's
 * file, and never throws.
 */
function pruneSessionStates(currentPath: string, nowMs: number): void {
  try {
    if (!existsSync(SESSION_STATE_DIR)) return;
    for (const name of readdirSync(SESSION_STATE_DIR)) {
      if (!name.endsWith(".json")) continue;
      const p = join(SESSION_STATE_DIR, name);
      if (p === currentPath) continue;
      try {
        if (nowMs - statSync(p).mtimeMs > SESSION_STATE_TTL_MS) unlinkSync(p);
      } catch { /* skip this file */ }
    }
  } catch { /* best-effort */ }
}

function minutesSince(iso: string | null, nowMs: number): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - t) / 60_000);
}

function logFire(payload: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(FIRE_LOG_PATH), { recursive: true });
    appendFileSync(FIRE_LOG_PATH, JSON.stringify(payload) + "\n", "utf8");
  } catch { /* best-effort */ }
}

/**
 * Claude Code hands every Stop hook a JSON payload on stdin carrying
 * session_id and transcript_path — the identity of the session that just
 * fired. Read it so the reviewer analyzes THIS session's transcript instead
 * of guessing via globally-newest-mtime, which grabs a concurrent session's
 * transcript whenever two sessions overlap (public issue #1495, @christauff).
 */
function readHookInput(): { sessionId: string | null; transcriptPath: string | null } {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return { sessionId: null, transcriptPath: null };
    const j = JSON.parse(raw);
    return {
      sessionId: typeof j.session_id === "string" ? j.session_id : null,
      transcriptPath: typeof j.transcript_path === "string" ? j.transcript_path : null,
    };
  } catch {
    return { sessionId: null, transcriptPath: null };
  }
}

function spawnReviewer(turnsReviewed: number, transcriptPath: string | null): { spawned: boolean; reason: string } {
  if (!existsSync(REVIEWER_PATH)) {
    return { spawned: false, reason: "reviewer-not-found" };
  }
  try {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;
    delete env.CLAUDECODE;
    const args = [REVIEWER_PATH, "review", "--turns", String(turnsReviewed)];
    if (transcriptPath && existsSync(transcriptPath)) args.push("--input", transcriptPath);
    const proc = spawn("bun", args, {
      env,
      stdio: "ignore",
      detached: true,
    });
    proc.unref();
    return { spawned: true, reason: `pid=${proc.pid}` };
  } catch (e) {
    return { spawned: false, reason: `spawn-failed: ${(e as Error)?.message || String(e)}` };
  }
}

function main(): void {
  try {
    if (isSubagent()) process.exit(0);

    const { sessionId, transcriptPath } = readHookInput();
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const config = loadConfig();
    const global = loadState();
    const session = loadSessionState(sessionId);

    // Tick THIS session only. A concurrent session's Stop no longer touches it.
    session.turn_count_since_last_review += 1;
    session.last_message_at = now;

    // Turn threshold: per session (has this conversation moved enough?).
    // Minute floor: global (the inference-volume guard across all sessions).
    const due =
      session.turn_count_since_last_review >= config.turn_threshold &&
      minutesSince(global.last_review_at, nowMs) >= config.min_minutes_between;

    if (due) {
      const turnsReviewed = session.turn_count_since_last_review;
      const { spawned, reason } = spawnReviewer(turnsReviewed, transcriptPath);
      logFire({ ts: now, turns_since_last_review: turnsReviewed, spawned, reason, session_id: sessionId, transcript_path: transcriptPath });
      session.turn_count_since_last_review = 0;
      session.last_review_at = now;
      global.last_review_at = now;
      pruneSessionStates(sessionStatePath(sessionId), nowMs);
    }

    saveSessionState(sessionId, session);

    // Mirror for the statusline / MemoryStatus / MemoryHealthCheck / Pulse.
    // Schema is unchanged; the turn count reflects whichever session wrote last
    // and is display-only, while last_review_at above is the real rate cap.
    global.turn_count_since_last_review = session.turn_count_since_last_review;
    global.last_message_at = now;
    saveState(global);
  } catch (e) {
    process.stderr.write(`MemoryReviewFire error: ${(e as Error)?.message || String(e)}\n`);
  }
  process.exit(0);
}

main();
