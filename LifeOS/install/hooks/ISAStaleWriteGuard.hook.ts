#!/usr/bin/env bun
/**
 * @version 1.1.0
 * ISAStaleWriteGuard.hook.ts — stop a whole-file Write from silently discarding
 * ISA changes the writing session never saw.
 *
 * TWO ENTRY POINTS, one mechanism:
 *   PreToolUse  (Write)                      → `check()`, dispatched by PreToolGuard
 *   PostToolUse (Read|Write|Edit|MultiEdit)  → `main()`, records this session's view
 *
 * WHY THIS EXISTS (reproduced 2026-07-28 on a fixture, both directions):
 *   - `Edit` is SAFE. It replaces an exact string against whatever is on disk now,
 *     and the harness volunteers: "the file had been modified on disk since you
 *     last read it — the edit applied cleanly, but the file contains other changes
 *     not in your context." Concurrent Edits to different lines both survive.
 *   - `Write` DESTROYS SILENTLY. A whole-file Write from a stale view reverted
 *     another session's closed claim from `[x]` to `[ ]`, and the harness reported
 *     "file state is current in your context — no need to Read it back" — reassuring
 *     while the close was lost.
 *
 * So this guards `Write` and nothing else. Guarding Edit/MultiEdit would be
 * ceremony with no failure behind it.
 *
 * NOT A LOCK. Nothing is acquired, held, or released. The guard compares a content
 * hash against the hash this session last observed; a crashed, killed, or abandoned
 * session leaves nothing behind that could block a later one. This is the property
 * that keeps it un-fragile, and it is asserted as an anti-claim in the ISA
 * (MEMORY/WORK/20260728-isa-stale-write-guard/ISA.md).
 *
 * NOT A TICKET SYSTEM. No assignee, no `claimed_by`, no HITL/AFK, no ticket types.
 * The ISA format is untouched — no new section, key, or model-written marker. The
 * artifact gains nothing to maintain and nothing to forget; the guard is pure
 * infrastructure around it. (KNOWLEDGE/REJECTED/no-closed-enums-for-work-typing.md
 * stands; this deliberately does not reopen it.)
 *
 * FAIL POLICY: fail-OPEN everywhere. No recorded view, absent file, unparseable
 * input, unreadable state dir, any internal throw → allow. The guard only ever
 * blocks on a positive determination that on-disk content moved out from under
 * this session.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

type BlockResult = { block: true; message: string } | null;

const STATE_DIR = join(homedir(), ".claude/LIFEOS/MEMORY/STATE/isa-session-view");
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Both ISA homes, per ISAFormat: `<project>/ISA.md` for things with persistent
 * identity (including Bunker's `<app>.isa.md`) and `MEMORY/WORK/<slug>/ISA.md`
 * for tasks. Matched on basename so it holds wherever an ISA actually lives —
 * the guard must not inherit ISASync's `MEMORY/WORK/` filter, which would leave
 * project ISAs (where loss costs most) unprotected.
 */
function isISAPath(filePath: string): boolean {
  const name = basename(filePath).toLowerCase();
  return name === "isa.md" || name.endsWith(".isa.md");
}

function hashOf(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

function viewFile(sessionId: string): string {
  // Session ids are harness-generated UUIDs; strip anything that is not one so a
  // malformed id can never escape the state dir.
  const safe = sessionId.replace(/[^A-Za-z0-9_-]/g, "");
  return join(STATE_DIR, `${safe}.json`);
}

function readViews(sessionId: string): Record<string, string> {
  try {
    const f = viewFile(sessionId);
    if (!existsSync(f)) return {};
    const parsed = JSON.parse(readFileSync(f, "utf-8"));
    return parsed && typeof parsed.views === "object" ? parsed.views : {};
  } catch {
    return {};
  }
}

/** Best-effort GC of abandoned session views. Runs once per session — on the
 *  first ISA touch, when this session has no view file yet. */
function pruneStale(): void {
  try {
    const now = Date.now();
    for (const entry of readdirSync(STATE_DIR)) {
      const p = join(STATE_DIR, entry);
      try {
        if (now - statSync(p).mtimeMs > PRUNE_AFTER_MS) rmSync(p, { force: true });
      } catch {}
    }
  } catch {}
}

/**
 * Record what this session now believes the file contains. Called after a Read
 * (the view was established) and after a successful Write/Edit/MultiEdit (the
 * view advanced to what this session just produced).
 */
export function recordView(sessionId: string, filePath: string): void {
  try {
    if (!sessionId || !isISAPath(filePath) || !existsSync(filePath)) return;
    mkdirSync(STATE_DIR, { recursive: true });
    const f = viewFile(sessionId);
    if (!existsSync(f)) pruneStale();
    const views = readViews(sessionId);
    views[filePath] = hashOf(readFileSync(filePath, "utf-8"));
    const tmp = `${f}.tmp`;
    writeFileSync(tmp, JSON.stringify({ session_id: sessionId, views, updated: new Date().toISOString() }));
    // tmp+rename so a concurrent reader never observes a half-written view file.
    renameSync(tmp, f);
  } catch {
    // Recording is best-effort. A failure costs protection, never correctness:
    // a missing view fails OPEN in check().
  }
}

function denyMessage(filePath: string, theirs: string, mine: string): string {
  return [
    "",
    "═══════════════════════════════════════════════════════════════════════════",
    "  BLOCKED — stale whole-file Write to an ISA",
    "═══════════════════════════════════════════════════════════════════════════",
    "",
    `  ${filePath}`,
    "",
    "  This file changed on disk after you last saw it, so writing your whole",
    "  copy over it would discard those changes with no trace. On an ISA that",
    "  usually means a closed claim and its evidence.",
    "",
    `    on disk now : ${theirs.slice(0, 12)}`,
    `    your view   : ${mine.slice(0, 12)}`,
    "",
    "  Recover:",
    "    1. Read the file to pick up the current content.",
    "    2. Apply your change with Edit — it replaces an exact string against",
    "       what is on disk, so it keeps the other changes. Write replaces",
    "       everything, which is why only Write is guarded here.",
    "",
    "  Nothing is locked. Re-reading clears this immediately.",
    "",
    "═══════════════════════════════════════════════════════════════════════════",
    "",
  ].join("\n");
}

/**
 * Pure check for PreToolGuard dispatch. Block decision or null (allow).
 * FAIL-OPEN: any internal error → null, never block on a guard bug.
 */
export function check(input: any): BlockResult {
  try {
    if (input?.tool_name !== "Write") return null; // Edit/MultiEdit are safe by construction
    const filePath = input?.tool_input?.file_path;
    if (!filePath || !isISAPath(filePath)) return null;
    if (!existsSync(filePath)) return null; // creating it — nothing to lose

    const sessionId = input?.session_id;
    if (!sessionId) return null;

    const recorded = readViews(sessionId)[filePath];
    if (!recorded) return null; // never observed here — the harness's own
    // read-before-overwrite rule is the guard for that case

    const current = hashOf(readFileSync(filePath, "utf-8"));
    if (current === recorded) return null; // unchanged since we looked

    return { block: true, message: denyMessage(filePath, current, recorded) };
  } catch {
    return null;
  }
}

if (import.meta.main) {
  // PostToolUse entry: record the view. Never blocks, never fails loudly.
  try {
    const input = JSON.parse(readFileSync(0, "utf-8"));
    const tool = input?.tool_name;
    if (tool === "Read" || tool === "Write" || tool === "Edit" || tool === "MultiEdit") {
      recordView(input?.session_id, input?.tool_input?.file_path || "");
    }
  } catch {}
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}
