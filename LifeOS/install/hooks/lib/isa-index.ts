/**
 * isa-index.ts — the persistent ISA backlog index (library, not a CLI).
 *
 * PURPOSE:
 * ISAs are the memory of the principal's work and tools. They must be
 * PERSISTENT and FINDABLE forever. Freshness may govern what is PUSHED at
 * session start; nothing may govern what EXISTS or is FINDABLE. Before this
 * module, an ISA-recorded item went invisible in two steps — off the
 * SessionStart block at 48h, out of work.json at 7d (TTL hard-delete) — and
 * after that lived only as bytes on disk, pull-only.
 *
 * This file is that memory. It is APPEND-ONLY BY CONSTRUCTION:
 *   - there is no exported function that removes an entry;
 *   - there is no retention/purge knob, deliberately (a retention knob on
 *     memory is the exact defect this index removes);
 *   - an artifact deleted from disk is marked `missing`, never dropped, and
 *     un-marks itself if the file returns.
 *
 * Windows are knobs (§ loadPickupKnobs). The index has none.
 *
 * WRITE PATH — three producers, all converging here:
 *   1. IsaReconcile.ts        full sweep (both WORK trees + persistent tool ISAs)
 *   2. isa-utils syncToWorkJson  live upsert on every ISA edit
 *   3. isa-utils TTL/cap eviction  rows expire INTO the index, never into the void
 *
 * THE RETENTION INVARIANT, STATED WITH ITS EXCEPTIONS (it is not universal, and
 * writing it as if it were is how it stops being checkable):
 *   A work.json row is deleted only after it is retrievable from this index —
 *   EXCEPT (a) `native`/`starting` placeholder rows, which are harness
 *   bookkeeping and carry no memory to retrieve, and (b) when `isaPickup.enabled`
 *   is false, in which case there is no index and eviction reverts to the
 *   pre-index behavior of simply dropping the row. Everything else defers.
 *
 * READ PATH:
 *   - LoadContext.hook.ts "Stalled ISAs" block (display-capped, and bounded by
 *     `stalledMaxAgeDays` — 30d by default, 0 for genuinely any age)
 *
 * SCOPE OF `enabled`: it governs THIS index — all four write paths and the
 * stalled block. It does NOT govern the "Recent Sessions" block, which predates
 * the index and is a plain WORK-directory scan. Turning it off also turns
 * retention off: with no index to archive into, work.json eviction reverts to
 * the pre-index behavior of simply dropping old rows.
 *
 * COST: the read is one JSON parse of a file that grows without bound by
 * design, done synchronously at SessionStart; the display cap is applied after
 * the parse, so it bounds output, not work. The sweep that writes it is async
 * and walks every owned ISA. Both are cheap at realistic sizes (order 10ms at a
 * few thousand entries) but neither is constant-time, and calling the read
 * "cheap" without saying so would be overclaiming.
 *
 * CONCURRENCY: mkdir lock with stale takeover + tmp/rename publish, mirroring
 * hooks/lib/work-events.ts. Readers never see a partial file. On lock
 * contention a write is SKIPPED, never partial — safe because the ISA files on
 * disk remain ground truth and the next sweep re-reads them. The one caller
 * that cannot tolerate a skip (TTL eviction) checks the boolean return and
 * defers its delete.
 *
 * TRIGGER: n/a (shared lib — no stdin, no registration)
 *
 * @see ~/.claude/LIFEOS/DOCUMENTATION/Isa/IsaFormat.md
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join, dirname, resolve } from 'path';
import { getClaudeDir, getSettingsPath, paiPath } from './paths';

// ── Types ─────────────────────────────────────────────────────────────────

export type IsaKind = 'work' | 'tool';
export type IsaEntrySource = 'sweep' | 'sync' | 'work-expiry';

export interface IsaIndexEntry {
  /** Stable identity: the artifact's DIRECTORY, relative to ~/.claude.
   *  Directory (not file) so a PRD.md → ISA.md rename stays one entry. */
  key: string;
  kind: IsaKind;
  slug: string;
  title: string;
  /** Artifact filename actually found (ISA.md / PRD.md / …). */
  artifact: string;
  /** Absolute path to the artifact. */
  path: string;
  /** Lowercased ISA phase (`build`, `verify`, `complete`, …) or 'unknown'. */
  phase: string;
  checked: number;
  total: number;
  unchecked: number;
  /** A `## Remaining Work` section is present. */
  remainingWork: boolean;
  /** Unchecked `- [ ]` items inside that section. */
  remainingOpen: number;
  /** External tracker reference, if the ISA names one (see isaIndexEntryFrom). */
  taskRef?: string;
  projectRef?: string;
  /** phase:verify and untouched longer than the stranded window. */
  stranded?: boolean;
  /** Artifact mtime (ISO) — "last touched". */
  lastTouched: string;
  firstIndexed: string;
  lastIndexed: string;
  /** Artifact no longer on disk. Entry is RETAINED — this is the tombstone. */
  missing?: boolean;
  missingSince?: string;
  source: IsaEntrySource;
}

export interface IsaIndex {
  version: number;
  updatedAt: string;
  entries: Record<string, IsaIndexEntry>;
}

export const ISA_INDEX_VERSION = 1;

/** Phases that mean "nothing to pick up". Everything else is backlog. */
export const TERMINAL_PHASES = new Set([
  'complete', 'completed', 'closed', 'done', 'abandoned', 'archived',
]);

/** Placeholder phases that are harness bookkeeping, not ISAs. Never indexed. */
const PLACEHOLDER_PHASES = new Set(['native', 'starting']);

// ── Knobs (§ leg 5) ───────────────────────────────────────────────────────
//
// Defaults are the values that were previously hardcoded — conservative, and
// what ships by default. An instance overrides them in settings.user.json.
// There is deliberately NO index-retention knob: see the header.

export interface IsaPickupKnobs {
  /** Switch for THIS index: all write paths and the stalled block. Does not
   *  govern the Recent Sessions block. Off also means work.json rows are
   *  dropped on expiry rather than archived — there is no index to keep. */
  enabled: boolean;
  /** LoadContext "Recent Sessions" push window. */
  recentWorkWindowHours: number;
  /** Max rows in the "Recent Sessions" block. */
  recentWorkLimit: number;
  /** Max rows in the "Stalled ISAs" block. DISPLAY cap — never a data cap. */
  stalledDisplayLimit: number;
  /** Age ceiling for the stalled block, in days. 0 = no limit (index-forever). */
  stalledMaxAgeDays: number;
  /** phase:verify untouched this long → flagged `stranded` in the index. */
  strandedAfterDays: number;
  /** IsaReconcile: ISAs older than this are indexed but not synced to work.json. */
  reconcileMaxAgeDays: number;
  /** work.json view-freshness. Rows expire INTO the index at these ages. */
  workJson: {
    nativeStartingHours: number;
    completeHours: number;
    defaultDays: number;
    capRows: number;
  };
}

export const DEFAULT_PICKUP_KNOBS: IsaPickupKnobs = {
  enabled: true,
  recentWorkWindowHours: 48,
  recentWorkLimit: 8,
  stalledDisplayLimit: 5,
  stalledMaxAgeDays: 30,
  strandedAfterDays: 7,
  reconcileMaxAgeDays: 30,
  workJson: {
    nativeStartingHours: 4,
    completeHours: 24,
    defaultDays: 7,
    capRows: 50,
  },
};

let knobCache: { mtime: number; path: string; knobs: IsaPickupKnobs } | null = null;

function num(raw: unknown, fallback: number, { min = 0 }: { min?: number } = {}): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < min) return fallback;
  return n;
}

/**
 * Read the `isaPickup` block from settings.json (system defaults merged with
 * the user overlay at SessionStart). Never throws: a missing or malformed
 * block yields DEFAULT_PICKUP_KNOBS, so a bad edit degrades to stock behavior
 * instead of breaking session startup.
 */
export function loadPickupKnobs(settingsPath = getSettingsPath()): IsaPickupKnobs {
  try {
    const mtime = statSync(settingsPath).mtimeMs;
    if (knobCache && knobCache.path === settingsPath && knobCache.mtime === mtime) {
      return knobCache.knobs;
    }
    const raw = JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, any>;
    const k = raw?.isaPickup ?? {};
    const w = k.workJson ?? {};
    const d = DEFAULT_PICKUP_KNOBS;
    const knobs: IsaPickupKnobs = {
      enabled: k.enabled !== false,
      recentWorkWindowHours: num(k.recentWorkWindowHours, d.recentWorkWindowHours, { min: 1 }),
      recentWorkLimit: num(k.recentWorkLimit, d.recentWorkLimit, { min: 1 }),
      stalledDisplayLimit: num(k.stalledDisplayLimit, d.stalledDisplayLimit, { min: 1 }),
      stalledMaxAgeDays: num(k.stalledMaxAgeDays, d.stalledMaxAgeDays, { min: 0 }),
      strandedAfterDays: num(k.strandedAfterDays, d.strandedAfterDays, { min: 0 }),
      reconcileMaxAgeDays: num(k.reconcileMaxAgeDays, d.reconcileMaxAgeDays, { min: 1 }),
      workJson: {
        nativeStartingHours: num(w.nativeStartingHours, d.workJson.nativeStartingHours, { min: 1 }),
        completeHours: num(w.completeHours, d.workJson.completeHours, { min: 1 }),
        defaultDays: num(w.defaultDays, d.workJson.defaultDays, { min: 1 }),
        capRows: num(w.capRows, d.workJson.capRows, { min: 1 }),
      },
    };
    knobCache = { mtime, path: settingsPath, knobs };
    return knobs;
  } catch {
    return DEFAULT_PICKUP_KNOBS;
  }
}

/** Test seam — drop the mtime cache. */
export function clearPickupKnobCache(): void {
  knobCache = null;
}

// ── Paths ─────────────────────────────────────────────────────────────────

/** Index location. `LIFEOS_ISA_INDEX_PATH` overrides (tests, alternate roots). */
export function isaIndexPath(): string {
  return process.env.LIFEOS_ISA_INDEX_PATH || paiPath('MEMORY', 'STATE', 'isa-index.json');
}

/**
 * The two WORK trees. Sessions since 2026-07-24 create dirs in
 * ~/.claude/MEMORY/WORK; the older tree is <LIFEOS_DIR>/MEMORY/WORK. Scanning
 * only one starves the pickup surface of exactly the work it exists to surface.
 * Deduped (they coincide if LIFEOS_DIR is ~/.claude) and existence-filtered.
 */
export function workRoots(): string[] {
  return [
    join(getClaudeDir(), 'MEMORY', 'WORK'),
    paiPath('MEMORY', 'WORK'),
  ].filter((p, i, a) => a.indexOf(p) === i && existsSync(p));
}

/**
 * Stable entry key: the artifact's directory relative to ~/.claude. Unique
 * across both WORK trees and the TOOLS tree, human-readable, and unchanged by
 * a PRD.md → ISA.md rename. Paths outside ~/.claude key by absolute path.
 *
 * The path is resolved first. In an append-only store a malformed key is
 * PERMANENT — there is no cleanup path by design — so a relative path from a
 * caller that didn't normalize must never mint one.
 */
export function indexKeyForArtifact(artifactPath: string): string {
  const dir = dirname(resolve(artifactPath));
  const root = getClaudeDir() + '/';
  const key = dir.startsWith(root) ? dir.slice(root.length) : dir;
  // RESERVED NAMESPACE. `work-expiry:` keys are minted for work.json rows that
  // have no artifact to key on. A real directory literally named that would
  // collide with one, so an artifact never gets to mint a key inside it — the
  // prefix is escaped instead. Colons are legal in POSIX filenames, so this is
  // a real (if unlikely) path, and an append-only store has no cleanup path for
  // a key minted wrong.
  return key.startsWith(WORK_EXPIRY_PREFIX) ? `artifact:${key}` : key;
}

/** Reserved key namespace — see indexKeyForArtifact and workExpiryKey. */
export const WORK_EXPIRY_PREFIX = 'work-expiry:';

// ── Discovery ─────────────────────────────────────────────────────────────

export interface IsaSource {
  kind: IsaKind;
  /** Absolute path to the artifact file. */
  path: string;
  /** Directory name (WORK) or tool dir name (TOOLS). */
  dirName: string;
}

const ARTIFACT_NAMES = ['ISA.md', 'PRD.md'];

function artifactIn(dir: string): string | null {
  for (const name of ARTIFACT_NAMES) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Every ISA this instance is responsible for: both WORK trees plus the
 * persistent tool ISAs under `LIFEOS/TOOLS/<tool>/`.
 *
 * A tool ISA is discovered by presence, not by registration — any directory
 * under LIFEOS/TOOLS that carries an ISA.md (or a legacy PRD.md) is one. A
 * tool with no ISA yet is skipped silently: that is a documentation finding,
 * not an index error.
 */
export function discoverIsaSources(): IsaSource[] {
  const sources: IsaSource[] = [];

  for (const root of workRoots()) {
    let dirs: string[] = [];
    try {
      dirs = readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch { continue; }
    for (const dirName of dirs) {
      const path = artifactIn(join(root, dirName));
      if (path) sources.push({ kind: 'work', path, dirName });
    }
  }

  const toolsRoot = paiPath('TOOLS');
  let toolDirs: string[] = [];
  try {
    toolDirs = readdirSync(toolsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch { toolDirs = []; }
  for (const dirName of toolDirs) {
    const path = artifactIn(join(toolsRoot, dirName));
    if (path) sources.push({ kind: 'tool', path, dirName });
  }

  // Dedupe by key — the same artifact reached twice (coinciding roots) is one entry.
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = indexKeyForArtifact(s.path);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Read ──────────────────────────────────────────────────────────────────

function emptyIndex(): IsaIndex {
  return { version: ISA_INDEX_VERSION, updatedAt: new Date(0).toISOString(), entries: {} };
}

/** Never throws. A missing or corrupt index reads as empty. NOTE the limit of
 *  the "next sweep rebuilds it" story: disk ISAs are ground truth only for
 *  entries that still have a file — tombstones, work-expiry archives, and
 *  firstIndexed provenance exist ONLY here. That is why the WRITE path
 *  quarantines a corrupt file before publishing over it (see
 *  quarantineIfCorrupt) instead of silently starting fresh. */
export function readIsaIndex(path = isaIndexPath()): IsaIndex {
  try {
    if (!existsSync(path)) return emptyIndex();
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as IsaIndex;
    if (!parsed || typeof parsed !== 'object' || !parsed.entries || typeof parsed.entries !== 'object') {
      return emptyIndex();
    }
    return { version: parsed.version ?? ISA_INDEX_VERSION, updatedAt: parsed.updatedAt ?? '', entries: parsed.entries };
  } catch {
    return emptyIndex();
  }
}

/** Write-path guard: if an index file EXISTS but does not parse as an index,
 *  move it aside before we publish a fresh one — the file is single-copy, so
 *  overwriting it is the one way this store can silently lose index-only
 *  memory. Read paths never call this (a display hook must not rename files).
 *
 *  Returns TRUE when it is safe to publish: either the file was fine, or it was
 *  corrupt AND is now preserved aside. Returns FALSE when the file is corrupt
 *  and could NOT be moved — publishing then would overwrite unrecoverable
 *  memory with a rebuild, so the caller must abort instead. Append-only is not
 *  a property we get to keep only when rename() happens to succeed. */
function quarantineIfCorrupt(path: string): boolean {
  try {
    if (!existsSync(path)) return true;
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    // `typeof [] === 'object'`, so an array would slip through a bare typeof
    // check and be treated as a valid entries map. Require a plain object.
    if (
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && parsed.entries && typeof parsed.entries === 'object' && !Array.isArray(parsed.entries)
    ) return true;
  } catch { /* unparseable — fall through to quarantine */ }
  try {
    const aside = `${path}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    renameSync(path, aside);
    console.error(`⚠️ isa-index: existing index was corrupt — quarantined to ${aside}; rebuilding from disk (index-only entries, if any, are preserved in the quarantined copy)`);
    return true;
  } catch (err) {
    console.error(`⚠️ isa-index: existing index is corrupt and could NOT be quarantined (${err}); refusing to publish over it. Nothing was written. If the cause is transient the next run recovers; if it is a permission or read-only-volume problem it will NOT self-heal and every eviction defers until it is fixed.`);
    return false;
  }
}

/**
 * The index writer's destination is operator-configurable (`LIFEOS_ISA_INDEX_PATH`).
 * Publishing renames over whatever sits at that path, so a path aliasing an ISA
 * artifact would let the index writer destroy the very memory it exists to keep
 * — and would falsify "the sweep never writes an ISA file" through the back
 * door. The destination must therefore look like an index, not an artifact.
 */
function isSafeIndexDestination(path: string): boolean {
  const name = (path.split('/').pop() || '').toLowerCase();
  if (ARTIFACT_BASENAMES.has(name)) return false;
  return name.endsWith('.json');
}

/** Artifact filenames the sweep reads. The index may never be pointed at one. */
const ARTIFACT_BASENAMES = new Set(['isa.md', 'prd.md']);

// ── Lock + atomic publish ─────────────────────────────────────────────────

const LOCK_STALE_MS = 10_000;
const LOCK_RETRIES = 5;
const LOCK_RETRY_SLEEP_MS = 20;

function lockPathFor(indexPath: string): string {
  return indexPath + '.lock';
}

/** Owner token written into the lock at acquire and re-checked before publish. */
function lockTokenPath(lock: string): string {
  return join(lock, 'owner');
}

let lockSeq = 0;
function mintLockToken(): string {
  return `${process.pid}-${Date.now()}-${++lockSeq}`;
}

/**
 * Is the lock still OURS?
 *
 * Stale takeover means a lock can be removed and re-created by another writer
 * while we hold it. Measured 2026-07-31, the whole locked operation is ~1.2s at
 * 400k entries / 193MB — three orders of magnitude past any realistic index — so
 * a writer does not out-run the 10s stale window by being slow. It out-runs it
 * by being STOPPED: a suspended laptop, a stalled network filesystem, a long GC
 * pause or SIGSTOP blows any fixed window at any index size, and no size-derived
 * threshold fixes that.
 *
 * So ownership is checked rather than assumed. If our token is gone, someone
 * took the lock and has published (or is publishing) their own merge; ours was
 * computed against a snapshot that no longer exists, and writing it would drop
 * their entries. We abort and return false — the caller then defers its delete,
 * which is the same fail-closed direction as every other failure here.
 */
export function stillOwnLock(lock: string, token: string): boolean {
  try {
    return readFileSync(lockTokenPath(lock), 'utf-8') === token;
  } catch {
    return false; // token unreadable or gone — assume lost
  }
}

/** Push the lock's staleness clock forward across a long phase. */
function touchLock(lock: string, token: string): void {
  try { writeFileSync(lockTokenPath(lock), token); } catch { /* best effort */ }
}

/** Synchronous sleep with no runtime assumptions (the write path is sync). */
function sleepSync(ms: number): void {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const until = Date.now() + ms;
    while (Date.now() < until) { /* spin — bounded by ms */ }
  }
}

export function lockAgeMs(lock: string): number {
  // Age off the TOKEN, not the directory: touchLock() rewrites the token to
  // push the clock forward across a long phase, and a directory's mtime does
  // not change when a file inside it is rewritten.
  for (const p of [lockTokenPath(lock), lock]) {
    try { return Date.now() - statSync(p).mtimeMs; } catch { /* try the next */ }
  }
  return -1; // gone
}

/**
 * mkdir lock with stale takeover.
 *
 * Only EEXIST means contention. Any other errno (a missing parent, a file where
 * the directory should be, a read-only volume) is a hard failure and returns
 * immediately — retrying it would burn the whole retry budget on an error that
 * cannot resolve itself, and the caller needs a prompt `false` to make its own
 * fail-safe decision.
 */
function acquireLock(lock: string, token: string): boolean {
  for (let attempt = 0; attempt <= LOCK_RETRIES; attempt++) {
    try {
      mkdirSync(lock);
      touchLock(lock, token);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'EEXIST') return false;
      const age = lockAgeMs(lock);
      if (age === -1 || age > LOCK_STALE_MS) {
        try { rmSync(lock, { recursive: true, force: true }); } catch {}
        try { mkdirSync(lock); touchLock(lock, token); return true; } catch { /* lost the race — retry */ }
      }
      if (attempt < LOCK_RETRIES) sleepSync(LOCK_RETRY_SLEEP_MS);
    }
  }
  return false;
}

function releaseLock(lock: string): void {
  try { rmSync(lock, { recursive: true, force: true }); } catch {}
}

/** tmp + rename: a reader either sees the old file or the new one, never a
 *  partial write. The tmp name carries the pid so concurrent writers that both
 *  hold a (stale-stolen) lock cannot corrupt each other's staging file. */
function publish(index: IsaIndex, path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp.${process.pid}`;
  try {
    // Compact, not pretty-printed. This file is machine-read on every
    // SessionStart and grows without bound by design; indentation roughly
    // doubles both its size and the parse cost for no consumer's benefit.
    writeFileSync(tmp, JSON.stringify(index));
    renameSync(tmp, path);
  } catch (err) {
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
    throw err;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────

/** Merge one incoming entry over an existing one. The ONLY entry-mutating
 *  rule in this module: fields update, identity fields persist, nothing is
 *  ever removed. `firstIndexed` is sticky; a returning artifact clears its
 *  tombstone. */
function mergeEntry(existing: IsaIndexEntry | undefined, incoming: IsaIndexEntry, now: string): IsaIndexEntry {
  const merged: IsaIndexEntry = {
    ...existing,
    ...incoming,
    firstIndexed: existing?.firstIndexed || incoming.firstIndexed || now,
    lastIndexed: now,
  };
  // The artifact is present in this observation — clear any tombstone. An
  // incoming entry that declares itself tombstoned (a work.json row archived
  // with no artifact path) is the exception: it is asserting absence, not
  // observing presence.
  if (incoming.missing) {
    merged.missing = true;
    merged.missingSince = incoming.missingSince || existing?.missingSince || now;
  } else {
    delete merged.missing;
    delete merged.missingSince;
  }
  return merged;
}

export interface UpsertOptions {
  /** Full-sweep mode: after merging, re-check every OTHER entry's artifact on
   *  disk and tombstone the ones that are gone. Entries are never removed. */
  reconcileMissing?: boolean;
  path?: string;
}

/**
 * Upsert entries into the index. Returns false when the write was skipped
 * (lock contention or I/O failure) — callers that must not lose the data
 * check this and defer their own mutation.
 */
export function upsertIsaEntries(entries: IsaIndexEntry[], opts: UpsertOptions = {}): boolean {
  const path = opts.path || isaIndexPath();
  if (entries.length === 0 && !opts.reconcileMissing) return true;

  // The destination is operator-configurable; it may never alias an artifact.
  if (!isSafeIndexDestination(path)) {
    console.error(`⚠️ isa-index: PERMANENT — refusing to publish the index to ${path}; the destination must be a .json file and must not be an ISA artifact. Nothing was written, and this will NOT self-heal: every eviction defers until the configured path is corrected.`);
    return false;
  }

  // The lock is a sibling of the index file, so its parent must exist before
  // the non-recursive mkdir that IS the lock. Failure here (e.g. a file where
  // the directory should be) is a hard failure the caller must see.
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch {
    return false;
  }

  const lock = lockPathFor(path);
  const token = mintLockToken();
  if (!acquireLock(lock, token)) return false;
  try {
    // A corrupt file that cannot be moved aside must not be published over:
    // the rebuild would replace unrecoverable index-only memory.
    if (!quarantineIfCorrupt(path)) return false;
    const index = readIsaIndex(path);
    const now = new Date().toISOString();
    const touched = new Set<string>();

    for (const incoming of entries) {
      if (PLACEHOLDER_PHASES.has(incoming.phase)) continue;
      touched.add(incoming.key);
      index.entries[incoming.key] = mergeEntry(index.entries[incoming.key], incoming, now);
    }

    if (opts.reconcileMissing) {
      for (const [key, entry] of Object.entries(index.entries)) {
        if (touched.has(key)) continue;
        // A pathless entry (an archived work.json row with no artifact) can
        // never be "present"; it is already tombstoned and stays that way.
        const present = (() => { try { return !!entry.path && existsSync(entry.path); } catch { return false; } })();
        if (present) {
          // Known but not in this sweep's scope (e.g. an alternate root) and
          // still on disk — clear a stale tombstone, keep everything else.
          if (entry.missing) { delete entry.missing; delete entry.missingSince; }
        } else if (!entry.missing) {
          entry.missing = true;
          entry.missingSince = now;
        }
      }
    }

    index.version = ISA_INDEX_VERSION;
    index.updatedAt = now;

    // Everything above read a SNAPSHOT. If our lock was taken over while we
    // worked, another writer has merged and published against that same
    // snapshot or a newer one, and publishing ours now would drop their
    // entries — an append-only store losing entries by write ordering. Check
    // ownership last, immediately before the rename, and fail closed.
    if (!stillOwnLock(lock, token)) {
      console.error('⚠️ isa-index: lock was taken over mid-write; discarding this merge rather than overwriting the other writer. Nothing was published; the caller defers.');
      return false;
    }
    touchLock(lock, token); // fresh clock for the serialize + rename phase
    publish(index, path);
    return true;
  } catch {
    return false;
  } finally {
    releaseLock(lock);
  }
}

/**
 * Archive work.json rows that are about to be evicted (TTL or cap). This is
 * the "expire INTO the index, not into the void" path: the caller deletes the
 * row ONLY when this returns true.
 *
 * Rows carry everything an entry needs, so this path never reads an ISA file —
 * it works even when the artifact has been moved or deleted, and even when the
 * row never recorded a path at all.
 *
 * TOTALITY IS THE INVARIANT, AND IT IS MEASURED ON KEYS, NOT ON ENTRIES.
 * Every row that carries recoverable memory must be RETRIEVABLE afterwards. An
 * earlier version counted entries PRODUCED, which is a proxy, not the property:
 * the index stores by key and `indexKeyForArtifact` keys by DIRECTORY, so two
 * rows whose artifacts sit in one directory (an `ISA.md` and a `PRD.md` side by
 * side — common in real trees) produced two entries that merged into ONE on
 * write. The count matched, the write succeeded, and the caller deleted both
 * rows with one row's memory retained. Same class as the pathless-row bug: a
 * guard that checks the wrong thing.
 *
 * So: keys are disambiguated first, so two rows can never collapse into one,
 * and the guard then counts DISTINCT KEYS. Any future change whose entries
 * collapse fails closed (defer the eviction) instead of silently dropping a
 * row. Only PLACEHOLDER_PHASES rows are legitimately keyless: they are harness
 * bookkeeping with nothing to keep.
 */
export function archiveWorkRows(
  rows: Array<{ slug: string; session: Record<string, any> }>,
  opts: { path?: string } = {},
): boolean {
  // Surface disabled: no index exists to archive into, so eviction reverts to
  // the pre-index behavior (a bounded view that simply drops old rows). Stated
  // in the knob's own `_docs` — turning the index off turns retention off.
  if (!loadPickupKnobs().enabled) return true;

  const now = new Date().toISOString();
  const entries: IsaIndexEntry[] = [];
  let recoverable = 0;

  // Every key this batch will occupy, plus the slug that owns it. A directory
  // key already held by a DIFFERENT session must not be merged over: that is
  // one row's memory overwriting another's.
  const existing = readIsaIndex(opts.path || isaIndexPath());
  const claimed = new Map<string, string>();
  for (const [k, e] of Object.entries(existing.entries)) claimed.set(k, e.slug);

  for (const { slug, session } of rows) {
    const phase = String(session.phase || 'unknown').toLowerCase();
    if (PLACEHOLDER_PHASES.has(phase)) continue; // harness bookkeeping, not an ISA
    recoverable++;

    const checked = Number(session.criteria?.checked ?? 0) || 0;
    const total = Number(session.criteria?.total ?? 0) || 0;
    const abs = resolveRowIsaPath(session.isa);

    // A row with no usable `isa` path is still memory: the slug, title, phase,
    // criteria counts and timestamps all live on the ROW. It goes under a
    // reserved synthetic key, tombstoned because there is no artifact to point
    // at. If the artifact later appears, the sweep indexes it under its real
    // key; this entry remains as the record that the row existed.
    //
    // The directory key is used only while it is unclaimed or already ours.
    // Otherwise the row falls back to its own synthetic key, so two sessions
    // sharing a directory both survive instead of one silently replacing the
    // other.
    const dirKey = abs ? indexKeyForArtifact(abs) : null;
    const owner = dirKey === null ? undefined : claimed.get(dirKey);
    const key = dirKey !== null && (owner === undefined || owner === slug)
      ? dirKey
      : workExpiryKey(slug, session);
    claimed.set(key, slug);

    entries.push({
      key,
      kind: abs?.includes('/LIFEOS/TOOLS/') ? 'tool' : 'work',
      slug,
      title: String(session.task || session.sessionName || slug),
      artifact: abs ? abs.split('/').pop() || 'ISA.md' : '',
      path: abs || '',
      phase,
      checked,
      total,
      unchecked: Math.max(0, total - checked),
      remainingWork: false,
      remainingOpen: 0,
      ...(abs ? {} : { missing: true, missingSince: now }),
      lastTouched: String(session.lastToolActivity || session.updatedAt || session.started || now),
      firstIndexed: now,
      lastIndexed: now,
      source: 'work-expiry',
    });
  }

  // THE GUARD, on keys rather than entries: distinct keys is what survives the
  // merge, so it is what "retrievable afterwards" actually means. Anything that
  // collapses here fails closed and the caller keeps its rows.
  if (new Set(entries.map(e => e.key)).size !== recoverable) return false;
  if (entries.length === 0) return true; // every row was a placeholder
  return upsertIsaEntries(entries, { path: opts.path });
}

/**
 * Synthetic key for a work.json row archived without a usable artifact path,
 * or whose directory key belongs to another session.
 *
 * Unique per INCARNATION, not per slug: slugs are reused (a directory name can
 * recur), and a bare `work-expiry:<slug>` would merge a later incarnation over
 * the archived memory of an earlier one — the same overwrite this key exists to
 * avoid. The discriminator is the row's own start/update stamp, so re-archiving
 * the same incarnation stays idempotent.
 */
function workExpiryKey(slug: string, session: Record<string, any>): string {
  const stamp = String(session.started || session.updatedAt || session.lastToolActivity || '')
    .replace(/[^0-9A-Za-z]/g, '') || 'nostamp';
  return `${WORK_EXPIRY_PREFIX}${slug}@${stamp}`;
}

/** work.json rows store `isa` relative to LIFEOS_DIR when the artifact lives
 *  under it, and absolute otherwise (the two-tree split). Resolve both. */
function resolveRowIsaPath(raw: unknown): string | null {
  const rel = typeof raw === 'string' ? raw.trim() : '';
  if (!rel) return null;
  return rel.startsWith('/') ? rel : join(paiPath(), rel);
}

// ── Query ─────────────────────────────────────────────────────────────────

export interface StalledQuery {
  /** 0 = no age limit. */
  maxAgeDays?: number;
  /** Display cap. Applied AFTER filtering — never a data cap. */
  limit?: number;
  /** Keys to exclude (already shown by another surface). */
  exclude?: Set<string>;
  now?: number;
}

export interface StalledIsa extends IsaIndexEntry {
  ageDays: number;
}

/**
 * Backlog: every indexed ISA whose phase is not terminal, at ANY age by
 * default, most-recently-touched first. Tombstoned entries are excluded from
 * the PUSH surface (they are still in the index and still findable — freshness
 * governs what is pushed, never what exists).
 */
export function stalledIsaEntries(index: IsaIndex, q: StalledQuery = {}): StalledIsa[] {
  const now = q.now ?? Date.now();
  const maxAgeDays = q.maxAgeDays ?? 0;
  const rows: StalledIsa[] = [];

  for (const entry of Object.values(index.entries)) {
    if (entry.missing) continue;
    if (TERMINAL_PHASES.has((entry.phase || '').toLowerCase())) continue;
    if (q.exclude?.has(entry.key)) continue;
    const touchedMs = Date.parse(entry.lastTouched || '');
    const ageDays = Number.isFinite(touchedMs) ? (now - touchedMs) / 86_400_000 : Number.POSITIVE_INFINITY;
    if (maxAgeDays > 0 && ageDays > maxAgeDays) continue;
    rows.push({ ...entry, ageDays });
  }

  rows.sort((a, b) => {
    const at = Date.parse(a.lastTouched || '') || 0;
    const bt = Date.parse(b.lastTouched || '') || 0;
    return bt - at;
  });

  return q.limit && q.limit > 0 ? rows.slice(0, q.limit) : rows;
}
