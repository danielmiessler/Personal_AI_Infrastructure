#!/usr/bin/env bun
/**
 * BashWriteRelay.hook.ts — replay the Write-shaped PostToolUse hooks for files a Bash call wrote.
 * @version 1.1.0
 * @event PostToolUse
 * @matcher Bash
 *
 * WHY (#2079): `permissions.defaultMode: "auto"` tells the
 * model to prefer Bash for file writes, and ISASync, CheckpointPerISC, ConfigEvalFire and
 * SystemChangeSurface are registered on Write/Edit/MultiEdit only. An ISA written by heredoc
 * therefore never reached work.json, the per-claim commit never fired, the eval suite never ran,
 * and the ⚙️ SYSTEM line stayed silent. This hook closes the gap without touching the four:
 * it watches Bash, finds the files that changed since its last run for this session, and replays
 * each of the four with a synthesized Write payload carrying `file_path`.
 *
 * HOW: mtime narrows the candidates on a bounded set of watched roots (never by parsing the
 * command), then a CONTENT HASH decides. A path is a change for this call only when its hash
 * differs from the hash in a SHARED claims ledger, and claiming it updates that ledger.
 * A path never seen before is recorded and not replayed, so pre-existing state is never
 * attributed to whoever happens to run first. A change set larger than MAX_REPLAY (a checkout,
 * a bulk generator) is logged and skipped rather than fanned out.
 *
 * WHY THE HASH AND THE SHARED LEDGER (over-reporting found in the first live day of the
 * mtime-only 1.0.0). Two defects, both visible in one ⚙️ SYSTEM line that named files the
 * session never touched:
 *   1. **mtime is not content.** A backup commit, a generator that rewrites a file byte-identical,
 *      or a checkout moves mtime with no edit, so `CLAUDE.md` and `LIFEOS/VERSION` were reported
 *      as modified while git showed them clean. Same lesson as the archive's
 *      "freshness is not proof of a write — verify content, not mtime".
 *   2. **"changed since MY last scan" is not "changed BY me."** Baselines were per session, and
 *      hooks run inside every headless `claude -p` child, so several live sessions each
 *      attributed the memory loop's identity-file write to themselves within minutes.
 * First claimer wins, exactly once, and everyone else sees the updated hash and stays silent.
 *
 * Output: one PostToolUse `additionalContext` carrying whatever the four produced, concatenated.
 * Never blocks: every failure path exits 0 with no output.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join, resolve } from "path";
import { homedir } from "os";
import { isSubagentContext } from "./lib/subagent";

// Anchor on the home directory like every sibling hook. LIFEOS_DIR names the LIFEOS
// subfolder on a live install, so it is the wrong root for hook state.
const PAI = join(homedir(), ".claude");
const STATE_DIR = join(PAI, "LIFEOS", "MEMORY", "STATE", "bash-write-relay");
const LOG = join(PAI, "LIFEOS", "MEMORY", "OBSERVABILITY", "bash-write-relay.jsonl");
const MAX_REPLAY = 40;
/** Shared across every session: path -> the content hash last attributed to somebody. */
const CLAIMS = join(STATE_DIR, "claims.json");
const CLAIMS_LOCK = join(STATE_DIR, "claims.lock");
const LOCK_STALE_MS = 10_000;
/** Above this, hashing costs more than the readout is worth; mtime alone decides. */
const MAX_HASH_BYTES = 4 * 1024 * 1024;
const HOOK_TIMEOUT_MS = 15_000;

/** The four hooks the issue names. Order: registry first, so the ⚙️ line sees the ISA row. */
const REPLAY_HOOKS = [
  "ISASync.hook.ts",
  "CheckpointPerISC.hook.ts",
  "ConfigEvalFire.hook.ts",
  "SystemChangeSurface.hook.ts",
];

/** Watched roots, relative to PAI. Files: exact. Dirs: walked. */
const WATCHED_FILES = [
  "CLAUDE.md",
  "settings.json",
  "settings.local.json",
  "LIFEOS/LIFEOS_SYSTEM_PROMPT.md",
  "LIFEOS/VERSION",
  "LIFEOS/USER/PROJECTS.md",
];
const WATCHED_DIRS = [
  "LIFEOS/ALGORITHM",
  "LIFEOS/RULES",
  "LIFEOS/TOOLS",
  "hooks",
  "skills",
  "LIFEOS/USER/PRINCIPAL",
  "LIFEOS/USER/DIGITAL_ASSISTANT",
  "LIFEOS/USER/TELOS",
  "LIFEOS/USER/CONFIG",
  "LIFEOS/USER/PROJECTS",
  "LIFEOS/MEMORY/WORK",
];
const SKIP_DIRS = new Set(["node_modules", ".git", "_retired", "logs", "dist", "build", ".cache", "backups"]);
const SKIP_EXT = new Set([".jsonl", ".log", ".lock", ".html", ".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".tar", ".gz"]);

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

interface Input {
  session_id?: string;
  tool_name?: string;
  tool_input?: { command?: string };
  [k: string]: unknown;
}

function readInput(): Input {
  try { return JSON.parse(readFileSync(0, "utf-8")); } catch { return {}; }
}

function ext(p: string): string {
  const i = p.lastIndexOf(".");
  return i < 0 ? "" : p.slice(i).toLowerCase();
}

function walk(dir: string, sinceMs: number, out: string[], depth = 0): void {
  if (depth > 8 || out.length > MAX_REPLAY * 4) return;
  let entries: import("fs").Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(p, sinceMs, out, depth + 1);
    } else if (e.isFile()) {
      if (SKIP_EXT.has(ext(e.name))) continue;
      try { if (statSync(p).mtimeMs > sinceMs) out.push(p); } catch { /* vanished */ }
    }
  }
}

/** ISA paths the registry already knows, wherever they live on disk. */
function registeredIsaPaths(): string[] {
  try {
    const raw = readFileSync(join(PAI, "LIFEOS", "MEMORY", "STATE", "work.json"), "utf-8");
    const found: string[] = [];
    const visit = (v: unknown): void => {
      if (typeof v === "string") { if (v.endsWith("/ISA.md")) found.push(v.replace(/^~/, homedir())); }
      else if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(visit);
    };
    visit(JSON.parse(raw));
    return Array.from(new Set(found));
  } catch { return []; }
}

function changedSince(sinceMs: number): string[] {
  const out: string[] = [];
  for (const f of WATCHED_FILES) {
    const p = join(PAI, f);
    try { if (statSync(p).mtimeMs > sinceMs) out.push(p); } catch { /* absent */ }
  }
  for (const d of WATCHED_DIRS) walk(join(PAI, d), sinceMs, out);
  for (const p of registeredIsaPaths()) {
    try { if (statSync(p).mtimeMs > sinceMs) out.push(resolve(p)); } catch { /* absent */ }
  }
  return Array.from(new Set(out.map((p) => resolve(p))));
}

function hashFile(p: string): string | null {
  try {
    const st = statSync(p);
    if (!st.isFile() || st.size > MAX_HASH_BYTES) return null;
    return createHash("sha1").update(readFileSync(p)).digest("hex");
  } catch { return null; }
}

/** mkdir is atomic on every filesystem we run on, so it is the lock. */
function withClaimsLock<T>(fn: () => T): T | null {
  for (let i = 0; i < 20; i++) {
    try { mkdirSync(CLAIMS_LOCK); } catch {
      try {
        if (Date.now() - statSync(CLAIMS_LOCK).mtimeMs > LOCK_STALE_MS) rmSync(CLAIMS_LOCK, { recursive: true, force: true });
      } catch { /* someone else cleaned it */ }
      Bun.sleepSync(15);
      continue;
    }
    try { return fn(); } finally { try { rmSync(CLAIMS_LOCK, { recursive: true, force: true }); } catch {} }
  }
  return null;   // could not take the lock: report nothing rather than double-report
}

type Claims = Record<string, { hash: string; at: number; session: string }>;

/**
 * Of `candidates`, the paths whose CONTENT changed since anyone last claimed them.
 * Claiming is part of the same locked read-modify-write, so two concurrent sessions
 * cannot both win the same write.
 */
function claimChanged(candidates: string[], sessionId: string): string[] {
  const res = withClaimsLock<string[]>(() => {
    let claims: Claims = {};
    try { claims = JSON.parse(readFileSync(CLAIMS, "utf-8")) as Claims; } catch { /* first run */ }
    const mine: string[] = [];
    for (const p of candidates) {
      const h = hashFile(p);
      if (h === null) continue;                      // unreadable or too big: no claim, no report
      const prior = claims[p];
      if (!prior) {                                  // first sighting is a baseline, never a change
        claims[p] = { hash: h, at: Date.now(), session: sessionId };
        continue;
      }
      if (prior.hash === h) continue;                // mtime moved, bytes did not: nothing happened
      // Real content change, and this call is the first to see it, so it owns the report.
      // The row's `session` is only rewritten on a genuine claim — a passer-by overwriting it
      // would make the ledger lie about who reported what.
      claims[p] = { hash: h, at: Date.now(), session: sessionId };
      mine.push(p);
    }
    // Bound the ledger: watched roots are small, but an ISA sweep can add rows.
    const keys = Object.keys(claims);
    if (keys.length > 4000) {
      const keep = keys.sort((a, b) => (claims[b]!.at) - (claims[a]!.at)).slice(0, 3000);
      const trimmed: Claims = {};
      for (const k of keep) trimmed[k] = claims[k]!;
      claims = trimmed;
    }
    try { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(CLAIMS, JSON.stringify(claims)); } catch {}
    return mine;
  });
  return res ?? [];
}

function log(row: Record<string, unknown>): void {
  try {
    mkdirSync(join(PAI, "LIFEOS", "MEMORY", "OBSERVABILITY"), { recursive: true });
    writeFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...row }) + "\n", { flag: "a" });
  } catch { /* observability is best-effort */ }
}

function replay(input: Input, filePath: string): string[] {
  const payload = JSON.stringify({
    ...input,
    tool_name: "Write",
    tool_input: { file_path: filePath },
    relayed_from: "Bash",
  });
  const contexts: string[] = [];
  for (const hook of REPLAY_HOOKS) {
    const hookPath = join(PAI, "hooks", hook);
    if (!existsSync(hookPath)) continue;
    try {
      const r = Bun.spawnSync(["bun", hookPath], { stdin: Buffer.from(payload), stdout: "pipe", stderr: "ignore", timeout: HOOK_TIMEOUT_MS });
      const text = r.stdout ? new TextDecoder().decode(r.stdout).trim() : "";
      if (!text) continue;
      for (const line of text.split("\n")) {
        try {
          const j = JSON.parse(line);
          const ctx = j?.hookSpecificOutput?.additionalContext;
          if (typeof ctx === "string" && ctx.trim()) contexts.push(ctx.trim());
        } catch { /* non-JSON line, ignore */ }
      }
    } catch { /* one hook failing never stops the others */ }
  }
  return contexts;
}

function main(): void {
  const input = readInput();
  if ((input.tool_name || "") !== "Bash") return;
  if (isSubagentContext(input)) return;
  const sessionId = String(input.session_id || "");
  if (!SESSION_ID_RE.test(sessionId)) return;

  const now = Date.now();
  const stateFile = join(STATE_DIR, `${sessionId}.json`);
  let lastScanMs: number | null = null;
  try { lastScanMs = JSON.parse(readFileSync(stateFile, "utf-8")).lastScanMs ?? null; } catch { /* first call */ }

  // Always advance the baseline first, so a crash below cannot replay the same files twice.
  try { mkdirSync(STATE_DIR, { recursive: true }); writeFileSync(stateFile, JSON.stringify({ lastScanMs: now })); } catch { /* fine */ }
  if (lastScanMs === null) return; // first Bash call of the session: baseline only

  const candidates = changedSince(lastScanMs);
  if (candidates.length === 0) return;
  if (candidates.length > MAX_REPLAY) {
    log({ session: sessionId, skipped: candidates.length, reason: "bulk change set over MAX_REPLAY" });
    return;
  }

  // mtime said "touched"; the hash says whether the bytes moved, and the shared ledger says
  // whether this session is the one that gets to report it.
  const changed = claimChanged(candidates, sessionId);
  if (changed.length === 0) {
    log({ session: sessionId, candidates: candidates.length, replayed: [], reason: "no content change this session could claim" });
    return;
  }

  const contexts: string[] = [];
  for (const f of changed) contexts.push(...replay(input, f));
  log({ session: sessionId, replayed: changed.map((p) => p.replace(PAI + "/", "")), contexts: contexts.length });
  if (contexts.length === 0) return;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: contexts.join("\n\n") } }));
}

try { main(); } catch { /* never block */ }
process.exit(0);
