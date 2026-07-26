#!/usr/bin/env bun
/**
 * MemoryLock — crash-safe per-file write lock for the memory subsystem.
 *
 * The problem this exists to solve: memory writes run inside hook-spawned
 * subprocesses. If the harness times one out — or the machine loses power —
 * after the lockfile is created but before the release runs, the `.lock` file
 * survives on disk forever. Without a staleness check, every later write to
 * that note fails with "Lock held", permanently and silently.
 *
 * Recovery is decided on EVIDENCE first, age second:
 *
 *   1. The holder stamps its pid + host into the lockfile at acquire time.
 *   2. A contender that finds the lock held reads that stamp. If the holder
 *      ran on this host and `kill(pid, 0)` says the process is gone, the lock
 *      is stale — the holder died. Break it immediately; no waiting on a TTL.
 *   3. If liveness can't be established (unreadable/empty stamp, a lockfile
 *      written by an older build, or a holder recorded on a different host)
 *      we fall back to age: older than `LOCK_STALE_MS` is stale.
 *   4. A holder that is provably alive is RESPECTED — up to `LOCK_STALE_MS`.
 *      Past that it is broken anyway, because a per-note append that has held
 *      the lock for minutes is either hung or a recycled pid, and neither may
 *      jam memory writes forever.
 *
 * Every unknown resolves toward "assume alive" so the failure mode is a
 * refused write (loud, recoverable) rather than two concurrent writers
 * corrupting the same note.
 *
 * Breaking a stale lock is done by renaming it aside and then re-creating with
 * O_EXCL, so at most one of several concurrent recoverers wins. The inode
 * observed when the staleness call was made is re-checked after the rename; if
 * it changed, we raced a fresh holder, put its lock back, and refuse.
 *
 * Recovery and contention are both appended to
 * `LIFEOS/MEMORY/OBSERVABILITY/memory-locks.jsonl` and echoed to stderr, so an
 * operator can tell "recovered from a crash" from "nothing ever went wrong".
 *
 * `LOCK_STALE_MS` matches DerivedSync.ts's constant of the same name — this is
 * the same convention, with the liveness probe added.
 */

import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join as pathJoin } from "node:path";
import { homedir, hostname } from "node:os";

// ── Constants ──

/** Age past which a lock is stale when liveness can't be proven (or the holder hung). */
export const LOCK_STALE_MS = 5 * 60 * 1000;

// ── Types ──

interface Holder {
  pid: number;
  host: string;
  ts: string;
}

export interface LockHandle {
  ok: true;
  /** True when acquisition required breaking a stale lock left by a dead/hung holder. */
  recovered: boolean;
  release(): void;
}

export type LockError =
  | { ok: false; code: "ELOCK_HELD"; message: string }
  | { ok: false; code: "ELOCK_ERROR"; message: string };

export type LockResult = LockHandle | LockError;

export interface AcquireOptions {
  /** Override the staleness window. Defaults to LOCK_STALE_MS. */
  staleMs?: number;
  /** Prefix for stderr lines and the `label` field on log rows. */
  label?: string;
}

// ── Observability ──

function lockLogPath(): string {
  const base = process.env.LIFEOS_DIR || pathJoin(homedir(), ".claude", "LIFEOS");
  return pathJoin(base, "MEMORY", "OBSERVABILITY", "memory-locks.jsonl");
}

/**
 * Append one JSONL row and echo to stderr. Every event here is abnormal — a
 * recovered crash, a refused write — so it always earns an operator-visible
 * line. Best-effort: observability must never be the reason a write fails.
 */
export function logLockEvent(row: {
  event: "stale_lock_recovered" | "lock_contended" | "write_failed";
  label?: string;
  message: string;
  [key: string]: unknown;
}): void {
  const label = row.label ?? "MemoryLock";
  const line = { ts: new Date().toISOString(), pid: process.pid, ...row, label };
  try {
    const path = lockLogPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(line) + "\n", "utf8");
  } catch {
    /* observability is best-effort */
  }
  console.error(`[${label}] ${row.event}: ${row.message}`);
}

// ── Liveness ──

/**
 * Is `pid` a process on this machine right now? Signal 0 does no work, it only
 * runs the kernel's permission + existence checks. ESRCH is the only answer
 * that proves absence: EPERM means the process exists under another uid, and
 * any other error means we simply don't know. Both resolve to "alive" so an
 * ambiguous probe can never break a live lock.
 */
function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 1) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: any) {
    return e?.code !== "ESRCH";
  }
}

// ── Lockfile primitives ──

function holderRecord(): string {
  const holder: Holder = { pid: process.pid, host: hostname(), ts: new Date().toISOString() };
  return JSON.stringify(holder) + "\n";
}

/** O_CREAT | O_EXCL create. True if we now hold the lock, false if someone else does. */
function tryCreate(lockPath: string): boolean {
  try {
    writeFileSync(lockPath, holderRecord(), { flag: "wx" });
    return true;
  } catch (e: any) {
    if (e?.code === "EEXIST") return false;
    throw e;
  }
}

function readHolder(lockPath: string): Holder | null {
  try {
    const raw = readFileSync(lockPath, "utf8").trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pid !== "number" || typeof parsed?.host !== "string") return null;
    return { pid: parsed.pid, host: parsed.host, ts: String(parsed.ts ?? "") };
  } catch {
    return null;
  }
}

type Verdict = {
  stale: boolean;
  reason: string;
  ageMs: number;
  ino: number | null;
  holder: Holder | null;
};

function inspect(lockPath: string, staleMs: number): Verdict {
  let ino: number | null = null;
  let ageMs = 0;
  try {
    const st = statSync(lockPath);
    ino = st.ino;
    ageMs = Date.now() - st.mtimeMs;
  } catch {
    // Vanished between the failed create and the stat — the holder released it.
    return { stale: true, reason: "lock-vanished", ageMs: 0, ino: null, holder: null };
  }

  const holder = readHolder(lockPath);
  const verifiable = holder !== null && holder.host === hostname();

  if (verifiable && !isProcessAlive(holder!.pid)) {
    return { stale: true, reason: "holder-process-gone", ageMs, ino, holder };
  }
  if (ageMs > staleMs) {
    return {
      stale: true,
      reason: verifiable ? "holder-alive-but-expired" : "expired-unverifiable-holder",
      ageMs,
      ino,
      holder,
    };
  }
  return {
    stale: false,
    reason: verifiable ? "holder-alive" : "unverifiable-holder-within-ttl",
    ageMs,
    ino,
    holder,
  };
}

/**
 * Break a lock judged stale and take it. Rename-aside then O_EXCL create means
 * concurrent recoverers can't both end up holding it. `expectedIno` is the
 * inode the staleness call was made against — a mismatch means a live holder
 * created a new lock in between, so we put it back and refuse.
 */
function breakAndTake(lockPath: string, expectedIno: number | null): boolean {
  const asidePath = `${lockPath}.stale.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
  try {
    renameSync(lockPath, asidePath);
  } catch {
    // Someone else already moved it; just race for the create.
    return tryCreate(lockPath);
  }

  if (expectedIno !== null) {
    let actualIno: number | null = null;
    try {
      actualIno = statSync(asidePath).ino;
    } catch {
      actualIno = null;
    }
    if (actualIno !== expectedIno) {
      try {
        renameSync(asidePath, lockPath);
      } catch {
        /* nothing safe left to do */
      }
      return false;
    }
  }

  try {
    rmSync(asidePath, { force: true });
  } catch {
    /* the rename already freed the lock path */
  }
  return tryCreate(lockPath);
}

// ── Public API ──

/**
 * Acquire `lockPath`, recovering it automatically if the previous holder died.
 * Callers MUST call `release()` in a `finally`.
 */
export function acquire(lockPath: string, options: AcquireOptions = {}): LockResult {
  const staleMs = options.staleMs ?? LOCK_STALE_MS;
  const label = options.label ?? "MemoryLock";

  try {
    mkdirSync(dirname(lockPath), { recursive: true });
    if (tryCreate(lockPath)) return makeHandle(lockPath, false);
  } catch (e: any) {
    return {
      ok: false,
      code: "ELOCK_ERROR",
      message: `Failed to acquire lock ${lockPath}: ${e?.message || String(e)}`,
    };
  }

  const verdict = inspect(lockPath, staleMs);

  if (!verdict.stale) {
    const message = `Lock held: ${lockPath} (holder pid ${verdict.holder?.pid ?? "unknown"}, ${verdict.reason}, age ${verdict.ageMs}ms)`;
    logLockEvent({ event: "lock_contended", label, message, lock: lockPath, reason: verdict.reason, age_ms: verdict.ageMs });
    return { ok: false, code: "ELOCK_HELD", message };
  }

  let taken = false;
  try {
    taken = breakAndTake(lockPath, verdict.ino);
  } catch (e: any) {
    return {
      ok: false,
      code: "ELOCK_ERROR",
      message: `Failed to recover stale lock ${lockPath}: ${e?.message || String(e)}`,
    };
  }

  if (!taken) {
    const message = `Lock held: ${lockPath} (lost the stale-lock recovery race)`;
    logLockEvent({ event: "lock_contended", label, message, lock: lockPath, reason: "recovery-race-lost", age_ms: verdict.ageMs });
    return { ok: false, code: "ELOCK_HELD", message };
  }

  logLockEvent({
    event: "stale_lock_recovered",
    label,
    message: `Recovered stale lock ${lockPath} (${verdict.reason}, age ${verdict.ageMs}ms, previous holder pid ${verdict.holder?.pid ?? "unknown"})`,
    lock: lockPath,
    reason: verdict.reason,
    age_ms: verdict.ageMs,
    previous_pid: verdict.holder?.pid ?? null,
  });
  return makeHandle(lockPath, true);
}

function makeHandle(lockPath: string, recovered: boolean): LockHandle {
  return {
    ok: true,
    recovered,
    release(): void {
      try {
        rmSync(lockPath, { force: true });
      } catch {
        /* lockfile cleanup is best-effort */
      }
    },
  };
}
