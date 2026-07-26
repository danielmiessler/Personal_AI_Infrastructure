/**
 * Tier B write-lock recovery.
 *
 * Memory writes run inside hook-spawned subprocesses. One killed after it
 * created `<note>.lock` but before it released used to jam that note's writes
 * forever, silently. These tests pin the three properties that fix relies on:
 * a lock whose holder is gone gets broken, a lock whose holder is running does
 * not, and either outcome is visible to an operator.
 *
 * Hermetic: notes live in a temp dir and LIFEOS_DIR points the observability
 * log at a temp dir, so nothing here touches a real install.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";

import { appendToTierBFile } from "../../LIFEOS/TOOLS/MemorySystem";
import { LOCK_STALE_MS } from "../../LIFEOS/TOOLS/MemoryLock";

const LOCK_LOG = ["MEMORY", "OBSERVABILITY", "memory-locks.jsonl"];

let root: string;
let notePath: string;
let lockPath: string;
let priorLifeosDir: string | undefined;

/** Children spawned by a test, killed and reaped in afterEach. */
let children: ReturnType<typeof Bun.spawn>[] = [];

/** A live process on this host. Returns its pid. */
function spawnLiveProcess(): number {
  const proc = Bun.spawn(["sleep", "300"], { stdout: "ignore", stderr: "ignore" });
  children.push(proc);
  return proc.pid;
}

/**
 * A pid that is provably not a process: spawn one, kill it, and wait on the
 * exit rather than on the clock. Awaiting `exited` also reaps the zombie —
 * a zombie still answers kill(pid, 0), so an unreaped pid would read as alive.
 */
async function deadPid(): Promise<number> {
  const proc = Bun.spawn(["sleep", "300"], { stdout: "ignore", stderr: "ignore" });
  const pid = proc.pid;
  proc.kill("SIGKILL");
  await proc.exited;
  return pid;
}

function writeLock(body: string, ageMs = 0): void {
  writeFileSync(lockPath, body, "utf8");
  if (ageMs > 0) {
    const when = new Date(Date.now() - ageMs);
    utimesSync(lockPath, when, when);
  }
}

function holderRecord(pid: number, host = hostname()): string {
  return JSON.stringify({ pid, host, ts: new Date().toISOString() }) + "\n";
}

function lockLogRows(): Record<string, any>[] {
  const path = join(root, "lifeos", ...LOCK_LOG);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "lifeos-memlock-"));
  mkdirSync(join(root, "notes"), { recursive: true });
  notePath = join(root, "notes", "Note.md");
  lockPath = `${notePath}.lock`;
  priorLifeosDir = process.env.LIFEOS_DIR;
  process.env.LIFEOS_DIR = join(root, "lifeos");
  children = [];
});

afterEach(async () => {
  for (const proc of children) {
    proc.kill("SIGKILL");
    await proc.exited;
  }
  children = [];
  if (priorLifeosDir === undefined) delete process.env.LIFEOS_DIR;
  else process.env.LIFEOS_DIR = priorLifeosDir;
  rmSync(root, { recursive: true, force: true });
});

describe("appendToTierBFile lock recovery", () => {
  test("uncontended write succeeds and leaves no lockfile", () => {
    const result = appendToTierBFile(notePath, "first line\n");

    expect(result.ok).toBe(true);
    expect(readFileSync(notePath, "utf8")).toBe("first line\n");
    expect(existsSync(lockPath)).toBe(false);
  });

  test("stale lock from a dead process is recovered and the write succeeds", async () => {
    const pid = await deadPid();
    writeLock(holderRecord(pid));

    const result = appendToTierBFile(notePath, "recovered write\n");

    expect(result.ok).toBe(true);
    expect(readFileSync(notePath, "utf8")).toContain("recovered write");
    expect(existsSync(lockPath)).toBe(false);
  });

  test("recovery is decided on liveness, not age: a seconds-old dead holder is broken", async () => {
    const pid = await deadPid();
    writeLock(holderRecord(pid), 2_000);

    expect(Date.now() - statSync(lockPath).mtimeMs).toBeLessThan(LOCK_STALE_MS);
    expect(appendToTierBFile(notePath, "no TTL wait\n").ok).toBe(true);
  });

  test("stale lock recovery is logged with the dead holder's pid", async () => {
    const pid = await deadPid();
    writeLock(holderRecord(pid));

    appendToTierBFile(notePath, "recovered write\n");

    const recovered = lockLogRows().filter((row) => row.event === "stale_lock_recovered");
    expect(recovered).toHaveLength(1);
    expect(recovered[0].reason).toBe("holder-process-gone");
    expect(recovered[0].previous_pid).toBe(pid);
    expect(recovered[0].label).toBe("MemorySystem");
    expect(recovered[0].lock).toBe(lockPath);
  });

  test("fresh lock from a live process is respected and the write is refused", () => {
    const pid = spawnLiveProcess();
    writeLock(holderRecord(pid));

    const result = appendToTierBFile(notePath, "must not land\n");

    expect(result.ok).toBe(false);
    expect((result as { code: string }).code).toBe("EWRITE_FAILED");
    expect((result as { message: string }).message).toContain("Lock held");
    expect(existsSync(notePath)).toBe(false);
    // The live holder's lock is still theirs.
    expect(existsSync(lockPath)).toBe(true);
    expect(JSON.parse(readFileSync(lockPath, "utf8")).pid).toBe(pid);
  });

  test("a refused write is logged, not silent", () => {
    const pid = spawnLiveProcess();
    writeLock(holderRecord(pid));

    appendToTierBFile(notePath, "must not land\n");

    const rows = lockLogRows();
    expect(rows.some((row) => row.event === "lock_contended")).toBe(true);
    expect(rows.some((row) => row.event === "write_failed")).toBe(true);
    expect(rows.some((row) => row.event === "stale_lock_recovered")).toBe(false);
  });

  test("an unparseable lock is respected inside the TTL and broken past it", () => {
    writeLock("", 1_000);
    expect(appendToTierBFile(notePath, "too soon\n").ok).toBe(false);

    utimesSync(lockPath, new Date(Date.now() - LOCK_STALE_MS - 1_000), new Date(Date.now() - LOCK_STALE_MS - 1_000));
    expect(appendToTierBFile(notePath, "aged out\n").ok).toBe(true);

    const recovered = lockLogRows().filter((row) => row.event === "stale_lock_recovered");
    expect(recovered).toHaveLength(1);
    expect(recovered[0].reason).toBe("expired-unverifiable-holder");
  });

  test("a live holder recorded on another host falls back to the age rule", () => {
    const pid = spawnLiveProcess();
    writeLock(holderRecord(pid, `${hostname()}-elsewhere`), LOCK_STALE_MS + 1_000);

    const result = appendToTierBFile(notePath, "cross-host recovery\n");

    expect(result.ok).toBe(true);
    const recovered = lockLogRows().filter((row) => row.event === "stale_lock_recovered");
    expect(recovered[0].reason).toBe("expired-unverifiable-holder");
  });
});
