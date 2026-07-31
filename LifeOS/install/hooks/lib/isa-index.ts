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
 * CONCURRENCY: ONE WRITER AT A TIME, because NOBODY EVER REMOVES AN EXISTING
 * LOCK. mkdir is the exclusive claim, confirmed by reading our own token back;
 * if the lock is already there we defer, whoever owns it and however old it is.
 * A lock is removed only by the owner that created it or by a human running rm.
 * A deferral never deletes. Publish is a single atomic rename, so readers never
 * see a partial file. The one caller that cannot tolerate a skip (TTL eviction)
 * checks the boolean return and defers its delete. Deferring forever is the
 * designed trade, so a lock held too long is surfaced on the SessionStart banner
 * (stuckLockNotice) for a human to clear. Full protocol and its residual
 * windows: § Lock + atomic publish.
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
import { createHash } from 'crypto';
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
  /** Identity of a `work-expiry` archive: WHICH incarnation of `slug` this is.
   *  Slugs recur (a directory name is reused), so slug alone cannot tell two
   *  archives apart, and merging on slug equality destroys the earlier one's
   *  memory. Absent on `sweep`/`sync` entries, whose identity is the key. */
  incarnation?: string;
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
  return escapeArtifactKey(key);
}

/** Reserved key namespace — see indexKeyForArtifact and workExpiryKey. */
export const WORK_EXPIRY_PREFIX = 'work-expiry:';
/** Escape marker for artifact keys that would otherwise land in a namespace. */
export const ARTIFACT_ESCAPE_PREFIX = 'artifact:';

/**
 * Make an artifact key safe against the reserved namespace, INJECTIVELY.
 *
 * The first version escaped only `work-expiry:` and prefixed `artifact:`. That
 * moved the collision instead of removing it: a real directory named
 * `artifact:work-expiry:x` mapped to itself while `work-expiry:x` mapped onto
 * it. The escape must therefore escape ITSELF.
 *
 * f(k) = k                      when k starts with neither prefix
 * f(k) = ARTIFACT_ESCAPE + k    otherwise
 *
 * Injective: two unescaped keys are equal only if identical; two escaped keys
 * likewise after stripping the common prefix; and an escaped key can never
 * equal an unescaped one, because the escaped form starts with a prefix the
 * unescaped form is defined not to have. Colons are legal in POSIX filenames,
 * so these are real (if unlikely) paths, and an append-only store has no
 * cleanup path for a key minted wrong.
 */
function escapeArtifactKey(key: string): string {
  return key.startsWith(WORK_EXPIRY_PREFIX) || key.startsWith(ARTIFACT_ESCAPE_PREFIX)
    ? `${ARTIFACT_ESCAPE_PREFIX}${key}`
    : key;
}

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
 *  quarantineIfCorrupt) instead of silently starting fresh.
 *
 *  FORWARD-TOLERANT BY CONSTRUCTION: the returned object is built field by
 *  field, so an index written by an older build — one carrying the retired
 *  `generation`/`writer` header fields — parses normally, its extra fields are
 *  ignored here and dropped by the next publish. An unrecognized header field is
 *  never a reason to read an index as empty; that would discard real memory over
 *  a header. */
export function readIsaIndex(path = isaIndexPath()): IsaIndex {
  try {
    if (!existsSync(path)) return emptyIndex();
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as IsaIndex;
    if (!parsed || typeof parsed !== 'object' || !parsed.entries || typeof parsed.entries !== 'object') {
      return emptyIndex();
    }
    return {
      version: parsed.version ?? ISA_INDEX_VERSION,
      updatedAt: parsed.updatedAt ?? '',
      entries: parsed.entries,
    };
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
export function quarantineIfCorrupt(path: string, lock: string, token: string): boolean {
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
  // OWNERSHIP RE-CHECK BEFORE A DESTRUCTIVE RENAME (window 1).
  // This rename is as destructive as the commit, and it happens EARLIER, so the
  // commit does not own "the last instruction that can destroy a published
  // index" — this one can. The check is what keeps a writer whose lock was
  // removed out of band from renaming a valid index aside as "corrupt" on the
  // strength of a judgement it made while it still held the lock.
  if (!stillOwnLock(lock, token)) {
    console.error('⚠️ isa-index: the index lock was released out of band before the corrupt-index quarantine; refusing to move the file aside. Nothing was written; the caller defers.');
    return false;
  }
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

/**
 * Errnos this module treats as PERMANENT — deterministic conditions that a
 * retry cannot resolve without an operator changing something.
 *
 * The claim these support is deliberately bounded: a KNOWN-PERMANENT SUBSET is
 * named, and anything unclassified defaults to transient-with-retry. That is
 * not "permanent failures are always identified" — an errno outside this set
 * that never self-heals will be reported as retryable, and the operator sees a
 * repeating diagnostic rather than a permanent one. Failing toward "retry" is
 * the safe direction: it never authorizes a delete.
 */
const PERMANENT_ERRNOS = new Set([
  'EROFS',        // read-only filesystem
  'EACCES',       // permission denied
  'EPERM',        // operation not permitted
  'ENOTDIR',      // a path component is not a directory
  'EISDIR',       // a directory sits where a file must be
  'ENAMETOOLONG', // the configured path cannot exist
  'ELOOP',        // symlink cycle on the configured path
  'EINVAL',       // malformed path/argument — configuration, not weather
]);

function isPermanentErrno(code: string | undefined): boolean {
  return !!code && PERMANENT_ERRNOS.has(code);
}

// ── Lock + atomic publish ─────────────────────────────────────────────────
//
// THE PROTOCOL: ONE WRITER AT A TIME, ENFORCED BY PID LIVENESS.
//
// mkdir is the exclusive claim — POSIX guarantees exactly one contender can
// create a directory that does not yet exist. That primitive was never the
// problem. The problem was always the rule for what to do when the directory is
// ALREADY there, and every answer that involved TAKING IT produced a critical.
// "Take it if it looks old" cannot tell a stopped writer from a dead one. "Take
// it if the owner is dead" is no better: proving death is not something a
// filesystem lets you do atomically with the claim, so two contenders can prove
// the same corpse and displace each other; putting a wrongly-captured lock back
// resurrects a directory another writer had moved on from; and the liveness
// answer itself is a lie across pid namespaces, containers, and a relocated
// index path shared by hosts that do not share a pid space.
//
// So there is no taking. The rule is total:
//
//   THE LOCK EXISTS   defer. Always. Whoever owns it, however old it is, alive
//                     or dead or unattributable. No age check. No liveness check
//                     as a decision input. Callers already treat a deferral as
//                     keep-my-rows, so deferring never deletes.
//
//   THE LOCK IS OURS  we created it with mkdir AND read our own token back out
//                     of it. Both, because the token write can fail silently or
//                     lose a race; a lock we cannot read our own name from is
//                     not ours, and proceeding on the belief that it is would be
//                     the last remaining way to end up with two writers.
//
// A lock is removed by exactly two actors: the owner that created it
// (releaseLock, owner-checked), and a human running rm by hand. There is no
// third. No code path in this module removes a lock it did not create, which is
// a structural property of the code rather than a race that has been narrowed.
//
// THE COST, STATED PLAINLY AND NOT BURIED: a lock whose owner died without
// releasing it blocks every subsequent index write until a human clears it. That
// is the designed trade, not an oversight. A deferral costs a stale index and
// work.json rows that stay unarchived — both recoverable, and neither deletes
// anything. A wrong takeover costs memory, which is not recoverable. Because the
// deferral is otherwise SILENT and unbounded, it is surfaced where a human will
// actually see it: stuckLockNotice() is rendered into the SessionStart ACTIVE
// WORK banner. Nothing auto-escalates and nothing auto-clears; the human closes
// it.
//
// ── EVERY CHECK-TO-MUTATION WINDOW, RE-DERIVED FOR THIS PROTOCOL ───────────
//
// Derived, not remembered: produced by sweeping the file for every renameSync /
// rmSync / unlinkSync / writeFileSync on SHARED state and naming the guard that
// precedes it. Excluded because the name is unique to this process and no other
// writer can be racing it: `${path}.tmp.${pid}`. Re-run that sweep when adding
// any mutation here; a window that is remembered rather than derived is how the
// quarantine rename went four rounds unlisted.
//
// WIDTH, STATED HONESTLY. Every window below is bounded in INSTRUCTIONS and
// UNBOUNDED IN WALL-CLOCK — a suspended process sits inside one for minutes. No
// reasoning here assumes a window is short.
//
//   1. QUARANTINE   quarantineIfCorrupt: stillOwnLock -> renameSync(path, aside)
//                   Consequence: a valid index is renamed aside as corrupt. The
//                   data is intact in the aside file; the canonical path is empty
//                   until an operator restores it.
//   2. COMMIT       publish: stillOwnLock -> renameSync(tmp, path)
//                   Consequence: we publish over a state a new owner is working
//                   from. Our payload is an append-only merge of what we read, so
//                   this loses only writes that landed after our own locked read.
//   3. RELEASE      releaseLock: stillOwnLock -> rmSync(lock)
//                   Consequence: we remove another owner's lock, admitting a
//                   third writer. Not narrowable — removal IS the operation.
//
// ALL THREE ARE UNREACHABLE CONCURRENTLY UNDER THIS MODULE'S OWN OPERATION.
// Each needs a second writer holding the lock while we still believe we do, and
// the only way the lock changes hands under a running owner is A HUMAN REMOVING
// IT BY HAND. Nothing in this module removes a lock it did not create.
//
// Three is the whole list because acquire contains no destructive step to list:
// mkdir creates, and a failed claim leaves the directory exactly as it was.
//
// THE CLAIM, EXACTLY: no lock is ever removed except by its owner or a human;
// this code cannot create a second writer. That is the whole of it. It is not
// "races are impossible" — an operator with rm can still produce one, and the
// three windows above say what that would cost.

/** Warn-only threshold. It gates a DIAGNOSTIC and nothing else — no code path in
 *  this module removes, takes or overrides a lock, on account of its age or of
 *  anything else. The name is load-bearing: a constant called STALE reads as a
 *  licence to take the lock, and that reading is what this protocol removed. */
const LOCK_WARN_AFTER_MS = 60_000;
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
 * Since no code path here removes a lock it did not create, a lock cannot change
 * hands under a RUNNING writer through anything this module does — so in normal
 * operation this is always true, and that is exactly the point: it is the
 * assertion that catches the one case the module does not control, a human
 * clearing a live lock by hand. It is also half of the acquire: a freshly
 * created lock is not ours until our token reads back out of it.
 *
 * If our token is gone, something outside this protocol touched the lock. Ours
 * was computed against a snapshot we can no longer vouch for, so we abort and
 * return false — the caller then defers its delete, the same fail-closed
 * direction as every other failure here.
 */
export function stillOwnLock(lock: string, token: string): boolean {
  try {
    return readFileSync(lockTokenPath(lock), 'utf-8') === token;
  } catch {
    return false; // token unreadable or gone — assume lost
  }
}

/** Record ownership. Called only after our own mkdir won the exclusive claim.
 *  Best-effort by nature, which is why acquireLock reads the token back rather
 *  than trusting this to have happened. */
function writeLockToken(lock: string, token: string): void {
  try {
    writeFileSync(lockTokenPath(lock), token);
  } catch { /* best effort — an unreadable token defers contenders, never removes anything */ }
}

/** The token currently recorded in a lock, or null if there is none to read. */
function readLockOwner(lock: string): string | null {
  try {
    return readFileSync(lockTokenPath(lock), 'utf-8');
  } catch {
    return null;
  }
}

/**
 * The pid recorded in a lock token, or null when the token carries no usable one.
 *
 * Tokens are minted as `<pid>-<ms>-<seq>`. A token we cannot parse is not an
 * error to recover from — it is an owner we cannot attribute, and that takes the
 * defer branch. Non-positive values are rejected explicitly rather than passed
 * along: `process.kill(0, sig)` addresses the CALLER'S ENTIRE PROCESS GROUP and
 * a negative pid addresses a group by id, so a malformed token must never reach
 * kill() carrying one. Today that call is signal 0 and would merely test the
 * group — but a predicate whose safety depends on the signal never changing is
 * one refactor away from being a real problem.
 */
function pidFromToken(token: string | null): number | null {
  if (!token) return null;
  const pid = Number(token.split('-')[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/**
 * How a lock's owning pid LOOKS, for the human-facing warning only.
 *
 * NO DECISION RIDES ON THIS. It is not consulted when acquiring, releasing,
 * publishing or quarantining; it exists so the stuck-lock notice can say
 * something useful about who is holding the thing. That is deliberate: pid
 * liveness is unreliable in exactly the environments this index can end up in —
 * a pid namespace or container makes a foreign pid look local, and a relocated
 * `LIFEOS_ISA_INDEX_PATH` on a share makes a remote writer's pid meaningless
 * here. When the answer feeds only prose, being wrong costs a misleading
 * sentence. A decision that rode on it would pay for being wrong in memory.
 *
 * Signal 0 runs the existence and permission checks without delivering anything.
 * ESRCH means no such process; EPERM means it exists but belongs to another
 * user; anything else we decline to interpret.
 */
export type LockOwnerState = 'alive' | 'dead' | 'unknown';

function describeOwner(pid: number | null): LockOwnerState {
  if (pid === null) return 'unknown';
  try {
    process.kill(pid, 0);
    return 'alive';
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ESRCH') return 'dead';
    if (code === 'EPERM') return 'alive';
    return 'unknown';
  }
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

/**
 * How long this lock has been held. DIAGNOSTIC ONLY — it feeds the warning that
 * asks a human to look, and nothing else. No caller may branch on it — age has
 * no bearing on who may hold a lock, and wiring it back into that decision is
 * the regression this protocol exists to prevent.
 *
 * The token is written once at acquire and never rewritten, so its mtime is the
 * moment the lock changed hands. The directory mtime is the fallback for a lock
 * whose token was never written at all.
 */
export function lockAgeMs(lock: string): number {
  for (const p of [lockTokenPath(lock), lock]) {
    try { return Date.now() - statSync(p).mtimeMs; } catch { /* try the next */ }
  }
  return -1; // gone
}

/**
 * Acquire the lock: mkdir, write our token, and READ IT BACK.
 *
 * The read-back is not belt-and-braces, it is the second half of the claim.
 * `mkdir` proving exclusive at the instant it ran does not prove the directory
 * is still ours a syscall later, and the token write is best-effort: it can fail
 * outright (a full or read-only volume), or land after a human removed our lock
 * and a fresh writer created and stamped its own. Returning true on the strength
 * of mkdir alone would let a writer proceed believing it owned a lock that
 * another process owns — the only remaining way this module could produce two
 * writers. So ownership is CONFIRMED, not assumed:
 * if the token does not read back as ours, we did not acquire.
 *
 * If the read-back fails we leave the directory exactly as we found it. We do
 * not remove it, even though we may well have created it, because "the lock I
 * think I made" is not distinguishable from "a lock someone made in the gap" —
 * and removing on that guess is precisely the class of move this protocol
 * abolished. The consequence is stated rather than hidden: a token write that
 * fails leaves a lock nobody owns, index writes defer from then on, and
 * stuckLockNotice() surfaces it for a human to clear.
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
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== 'EEXIST') {
        // NOT contention. A read-only volume, a file where the directory must
        // be, a permission problem — none of which resolve by retrying, and all
        // of which used to return a bare `false` while isa-utils pointed the
        // operator at a diagnostic that never printed.
        const permanent = code === 'EROFS' || code === 'EACCES' || code === 'EPERM' || code === 'ENOTDIR';
        console.error(`⚠️ isa-index: ${permanent ? 'PERMANENT — ' : ''}cannot acquire the index lock at ${lock} (${code || err}). Nothing was written${permanent ? '; this will NOT self-heal and every eviction defers until it is fixed' : '; the next run retries'}.`);
        return false;
      }
      // EEXIST — somebody holds it. That is the entire analysis. We do not ask
      // how old the lock is or whether its owner still exists, because no answer
      // to either question would change what we do.
      if (attempt < LOCK_RETRIES) sleepSync(LOCK_RETRY_SLEEP_MS);
      continue;
    }

    writeLockToken(lock, token);
    if (stillOwnLock(lock, token)) return true;

    // We created a directory but cannot read our own name in it. Do not remove
    // it, and do not retry into it — a retry would only mkdir-EEXIST against
    // whatever is there now, and burn the budget pretending to make progress.
    console.error(
      `⚠️ isa-index: created the index lock at ${lock} but could not confirm ownership — the owner token did not read back as ours. `
      + 'Refusing to proceed on an unconfirmed claim. Nothing was written and nothing was deleted. '
      + `If a lock is now sitting there unowned, index writes will defer until it is cleared by hand: rm -rf ${lock}`,
    );
    return false;
  }
  // Held for the whole retry budget. Whether that clears on its own depends on
  // the holder: a busy writer finishes and the next run gets in, while one that
  // died or stopped without releasing keeps deferring until a human clears it.
  // Both are the safe outcome — the caller keeps its rows — and the stuck-lock
  // notice on the SessionStart banner is what tells the human which it is.
  return false;
}

/**
 * Release the lock, checking ownership first.
 *
 * NOT "only if still ours" — that is window 3 in the enumeration above, and
 * POSIX cannot give the guarantee that phrasing claims. The check narrows the
 * failure from "always removes whatever lock exists" to "removes another owner's
 * lock only if the handover lands between the read and the rmSync", and there is
 * no atomic form to narrow it further: removal IS the operation.
 *
 * This is the one removal the protocol permits: the owner releasing the lock it
 * created. Under this protocol the lock can only have changed hands out of band
 * — a human clearing it — and the check is what keeps that from compounding into
 * a third writer.
 */
export function releaseLock(lock: string, token: string): void {
  try {
    if (!stillOwnLock(lock, token)) return;
    rmSync(lock, { recursive: true, force: true });
  } catch { /* best effort */ }
}

// ── The stuck-lock notice ─────────────────────────────────────────────────
//
// Deferring forever is the DESIGNED trade of "nobody ever removes a lock", and a
// designed trade with a silent failure mode is just a silent failure mode. If a
// writer dies holding the lock, every index write after it defers — correctly,
// losing nothing — but the surface goes quietly stale, and only a human can end
// it. So the condition is reported where humans actually look: the SessionStart
// ACTIVE WORK banner (LoadContext.hook.ts), which is the block this index feeds
// anyway.
//
// This is a pure READ. It renames nothing, removes nothing, and escalates
// nothing — a display path that mutates state is how the quarantine rename got
// its own critical. The human closes it, or it stays open.

export interface StuckLockNotice {
  /** Absolute path of the lock directory — also the thing to remove. */
  lock: string;
  heldMs: number;
  /** Pid recorded in the owner token, or null if there is none to read/parse. */
  ownerPid: number | null;
  /** Diagnostic only. Nothing branches on it (see describeOwner). */
  ownerState: LockOwnerState;
  /** The exact command an operator should run. */
  clearCommand: string;
}

/** "45s" / "14m" / "3h" / "2d" — duration for the notice. */
function humanDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/**
 * Is a lock sitting there long enough that a human should look? Returns null in
 * the normal case — no lock, or one held for less than the warn threshold, which
 * is ordinary contention and not worth a word.
 */
export function stuckLockNotice(path = isaIndexPath()): StuckLockNotice | null {
  try {
    const lock = lockPathFor(path);
    if (!existsSync(lock)) return null;
    const heldMs = lockAgeMs(lock);
    if (heldMs < 0 || heldMs <= LOCK_WARN_AFTER_MS) return null;
    const ownerPid = pidFromToken(readLockOwner(lock));
    return {
      lock,
      heldMs,
      ownerPid,
      ownerState: describeOwner(ownerPid),
      clearCommand: `rm -rf ${lock}`,
    };
  } catch {
    return null; // a display path never throws into a session banner
  }
}

/**
 * Render the notice for the SessionStart banner.
 *
 * It must say four things, because a warning that omits any of them leaves the
 * human unable to act: how long, who holds it, WHAT IS ACCUMULATING while it is
 * held, and the exact command. The consequence line is the one that is easy to
 * get wrong — nothing is being lost. work.json rows that should have expired are
 * KEPT rather than archived, which is the safe direction; what degrades is that
 * the index stops gaining entries and the backlog below it goes stale.
 */
export function renderStuckLockNotice(n: StuckLockNotice): string {
  const who = n.ownerPid === null
    ? 'an owner it cannot identify (no readable owner token)'
    : `pid ${n.ownerPid} (appears ${n.ownerState})`;
  return [
    '\n  ── ⚠️  ISA INDEX: WRITES ARE BLOCKED ──\n',
    `\n  🔒 The index lock has been held for ${humanDuration(n.heldMs)} by ${who}.`,
    '\n     Nothing is lost while it is held: every writer defers, and work.json',
    '\n     rows that should have expired are KEPT instead of archived. What does',
    '\n     degrade is that the index stops gaining entries, so the backlog above',
    '\n     goes stale and newly-finished work stops appearing in it.',
    '\n     This will NOT clear itself — no code here removes a lock it does not',
    '\n     own. If that process is gone or is not an ISA index writer, clear it:',
    `\n       ${n.clearCommand}\n`,
  ].join('');
}

/**
 * Commit the index: serialize to a private staging file, re-check ownership,
 * then ONE atomic rename into place.
 *
 * There is no second writer to race here. A contender reaches the critical
 * section only by proving THIS process dead, and a dead process does not arrive
 * at this line. That is why the commit needs no archive, no generation counter
 * and no repair pass: the protocol excludes the concurrent writer that those
 * mechanisms existed to survive.
 *
 * The ownership check that remains is not a race-narrowing device. It catches a
 * lock removed OUT OF BAND — an operator clearing one by hand — and it fails
 * toward discarding our own merge, the only direction that cannot lose somebody
 * else's.
 */
function publish(index: IsaIndex, path: string, lock: string, token: string): boolean {
  const tmp = `${path}.tmp.${process.pid}`;
  try {
    const payload: IsaIndex = {
      version: index.version,
      updatedAt: index.updatedAt,
      entries: index.entries,
    };
    // Compact, not pretty-printed. This file is machine-read on every
    // SessionStart and grows without bound by design; indentation roughly
    // doubles both its size and the parse cost for no consumer's benefit.
    writeFileSync(tmp, JSON.stringify(payload));

    if (!stillOwnLock(lock, token)) {
      console.error('⚠️ isa-index: the index lock was released out of band during serialization; discarding this merge rather than publishing over whatever holds it now. Nothing was published; the caller defers.');
      try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
      return false;
    }

    renameSync(tmp, path);
    return true;
  } catch (err) {
    // Classify, do not merely mention. An earlier version named EROFS/EACCES in
    // prose without ever inspecting err.code, so the "logged distinctly" claim
    // was false on exactly this path while acquireLock honoured it.
    const code = (err as NodeJS.ErrnoException)?.code;
    const permanent = isPermanentErrno(code);
    console.error(`⚠️ isa-index: ${permanent ? 'PERMANENT — ' : ''}publish failed for ${path} (${code || err}). Nothing was committed${permanent ? '; this will NOT self-heal and every eviction defers until it is fixed' : '; the next run retries'}.`);
    try { if (existsSync(tmp)) unlinkSync(tmp); } catch {}
    return false;
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

/**
 * Place one incoming entry, IDENTITY-SAFELY. Returns the key it actually landed
 * on, or `null` to abort the whole transaction.
 *
 * `mergeEntry` spreads incoming over existing, so an entry landing on a
 * contested key replaces it outright. That is correct for two observations OF
 * THE SAME ARTIFACT (a sweep re-reading a directory whose frontmatter slug
 * changed) and catastrophic for two different SESSIONS' archived memory.
 *
 * The rule is scoped by what an entry means:
 *   - `work-expiry` entries are one session-incarnation's memory. An incoming
 *     archive merges over a resident ONLY when it IS that resident — same slug
 *     AND same incarnation. Anything else re-keys to its own incarnation key.
 *     Slug equality is not identity: slugs recur, so incarnation 2 of a slug
 *     merging over incarnation 1 destroyed real memory while every guard
 *     reported success.
 *   - `sweep`/`sync` entries are observations of an artifact; the directory IS
 *     the identity, so a changed slug is an update. But a resident ARCHIVE is
 *     moved aside to its own incarnation key first, so an observation never
 *     overwrites session memory.
 *
 * An unresolvable collision fails closed. It never overwrites.
 */
function placeEntry(index: IsaIndex, incoming: IsaIndexEntry, now: string): string | null {
  // A work-expiry entry is never STORED without an identity. `undefined`
  // deliberately matches nothing — not even another `undefined` — so an entry
  // carrying no incarnation could never be verified as itself, and two of them
  // could never be told apart. Assigning one derived from the entry's own
  // fields makes both work: identical content yields the same identity (and
  // correctly merges), different content yields different identities (and
  // correctly re-keys). Legacy entries acquire an identity the first time they
  // are touched.
  if (incoming.source === 'work-expiry' && !incoming.incarnation) {
    incoming = { ...incoming, incarnation: derivedIncarnation(incoming) };
  }
  const existing = index.entries[incoming.key];

  if (incoming.source === 'work-expiry') {
    // Merge in place only onto the very same incarnation.
    if (!existing || sameIdentity(existing, incoming)) {
      index.entries[incoming.key] = mergeEntry(existing, incoming, now);
      return incoming.key;
    }
    const alt = incarnationKeyFor(incoming);
    const resident = index.entries[alt];
    if (resident && !sameIdentity(resident, incoming)) return null; // cannot place without loss
    index.entries[alt] = mergeEntry(resident, { ...incoming, key: alt }, now);
    return alt;
  }

  // Incoming is an artifact observation.
  if (existing && existing.source === 'work-expiry') {
    const alt = incarnationKeyFor(existing);
    const resident = index.entries[alt];
    if (resident && !sameIdentity(resident, existing)) return null; // cannot relocate without loss
    index.entries[alt] = { ...existing, key: alt };
    index.entries[incoming.key] = mergeEntry(undefined, incoming, now);
    return incoming.key;
  }

  index.entries[incoming.key] = mergeEntry(existing, incoming, now);
  return incoming.key;
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
/**
 * Plan produced INSIDE the transaction, against the index as actually read
 * under the lock. Returning `null` aborts the transaction without publishing.
 */
type IndexPlan = (index: IsaIndex, now: string) => IsaIndexEntry[] | null;

/**
 * TEST SEAM — fired inside the transaction, immediately after the index is read
 * under the lock and before the plan selects keys.
 *
 * Production never sets it. It exists because the serialization boundary is the
 * property under test, and a source-level assertion cannot show that a second
 * writer is actually excluded during that window. With it, a test can attempt a
 * real concurrent archive from inside another one's critical section.
 */
let afterLockedRead: (() => void) | null = null;
export function __setAfterLockedRead(fn: (() => void) | null): void { afterLockedRead = fn; }

/**
 * THE ONE SERIALIZED TRANSACTION.
 *
 * Everything that decides what gets written — reading the index, selecting
 * keys against that read, merging, and verifying the result — happens between
 * acquire and commit. Three rounds of this build put a guard before the lock
 * and shipped it: the guard computed keys against an unlocked snapshot, two
 * concurrent writers both saw a key unclaimed, both passed, and the second
 * merge silently replaced the first. Nothing computed before the lock can
 * establish a property about what the index will contain after it.
 *
 * A pre-lock read is therefore allowed only as an optimization, never as the
 * authority. There is currently no such read.
 */
function withIndexTransaction(path: string, plan: IndexPlan, opts: { reconcileMissing?: boolean } = {}): boolean {
  // The destination is operator-configurable; it may never alias an artifact.
  if (!isSafeIndexDestination(path)) {
    console.error(`⚠️ isa-index: PERMANENT — refusing to publish the index to ${path}; the destination must be a .json file and must not be an ISA artifact. Nothing was written, and this will NOT self-heal: every eviction defers until the configured path is corrected.`);
    return false;
  }

  // The lock is a sibling of the index file, so its parent must exist before
  // the non-recursive mkdir that IS the lock.
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    // `mkdirSync(recursive)` succeeds on an existing DIRECTORY, so EEXIST here
    // means a non-directory occupies the path — as permanent as EROFS.
    const permanent = code === 'EROFS' || code === 'EACCES' || code === 'EPERM'
      || code === 'ENOTDIR' || code === 'EEXIST';
    console.error(`⚠️ isa-index: ${permanent ? 'PERMANENT — ' : ''}cannot create the index directory ${dirname(path)} (${code || err}). Nothing was written${permanent ? '; this will NOT self-heal and every eviction defers until it is fixed' : '; the next run retries'}.`);
    return false;
  }

  const lock = lockPathFor(path);
  const token = mintLockToken();
  if (!acquireLock(lock, token)) return false;
  try {
    // A corrupt file that cannot be moved aside must not be published over:
    // the rebuild would replace unrecoverable index-only memory.
    if (!quarantineIfCorrupt(path, lock, token)) return false;
    const index = readIsaIndex(path);
    const now = new Date().toISOString();
    if (afterLockedRead) afterLockedRead();

    // Key selection happens HERE, against the index we just read under the lock.
    const entries = plan(index, now);
    if (entries === null) return false;

    const touched = new Set<string>();
    const placements: Array<{ planned: IsaIndexEntry; key: string }> = [];
    for (const incoming of entries) {
      if (PLACEHOLDER_PHASES.has(incoming.phase)) continue;
      const landed = placeEntry(index, incoming, now);
      if (landed === null) return false;
      // Compare against the identity as PLACED: placeEntry assigns one to a
      // work-expiry entry that arrived without it, and verifying against the
      // pre-placement value would fail for exactly those entries.
      placements.push({ planned: index.entries[landed], key: landed });
      touched.add(landed);
    }

    // POST-MERGE VERIFICATION, on the property rather than a proxy.
    //
    // "We produced N entries" and "we chose N distinct keys" were both true
    // while memory was being lost. So was "some entry with this slug exists" —
    // that scan passed when incarnation 2 of a slug had just merged over
    // incarnation 1, because it never asked WHICH incarnation survived.
    //
    // The property is: THIS planned entry is present AT THE KEY IT LANDED ON,
    // carrying ITS identity. Nothing weaker distinguishes "my memory survived"
    // from "something that looks like it did".
    for (const { planned, key } of placements) {
      const stored = index.entries[key];
      if (!stored || !sameIdentity(stored, planned)) {
        console.error(`⚠️ isa-index: post-merge verification failed for "${planned.slug}" at ${key} — refusing to publish. Nothing was written; the caller defers.`);
        return false;
      }
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

    return publish(index, path, lock, token);
  } catch (err) {
    console.error(`⚠️ isa-index: transaction aborted for ${path} (${err}). Nothing was committed; the caller defers.`);
    return false;
  } finally {
    releaseLock(lock, token);
  }
}

/**
 * Upsert entries into the index. Returns false when the write was skipped
 * (lock contention, I/O failure, or a merge that could not preserve identity)
 * — callers that must not lose the data check this and defer their mutation.
 */
export function upsertIsaEntries(entries: IsaIndexEntry[], opts: UpsertOptions = {}): boolean {
  const path = opts.path || isaIndexPath();
  if (entries.length === 0 && !opts.reconcileMissing) return true;
  return withIndexTransaction(path, () => entries, { reconcileMissing: opts.reconcileMissing });
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

  const path = opts.path || isaIndexPath();

  // The plan runs INSIDE the transaction, against the index read under the
  // lock. Key selection used to happen out here, which meant two concurrent
  // archives could both observe a key unclaimed, both pass, and the second
  // overwrite the first.
  return withIndexTransaction(path, (index, now) => {
    const entries: IsaIndexEntry[] = [];
    // Claims are by IDENTITY, not by slug. The previous version mapped key→slug
    // and reused a directory key whenever `owner === slug`, which is the same
    // false equation placeEntry made: a second incarnation of a recurring slug
    // took the first one's key and merged over its memory.
    const claimed = new Map<string, IsaIndexEntry>();
    for (const [k, e] of Object.entries(index.entries)) claimed.set(k, e);

    let recoverable = 0;
    for (const { slug, session } of rows) {
      const phase = String(session.phase || 'unknown').toLowerCase();
      if (PLACEHOLDER_PHASES.has(phase)) continue; // harness bookkeeping, not an ISA
      recoverable++;

      const checked = Number(session.criteria?.checked ?? 0) || 0;
      const total = Number(session.criteria?.total ?? 0) || 0;
      const abs = resolveRowIsaPath(session.isa);

      // A row with no usable `isa` path is still memory: the slug, title,
      // phase, criteria counts and timestamps all live on the ROW. It goes
      // under a reserved incarnation key, tombstoned because there is no
      // artifact to point at.
      //
      // The directory key is used only while unclaimed or already ours —
      // against THIS read, and against the keys this batch has already taken.
      const incarnation = incarnationDiscriminator(session);
      const dirKey = abs ? indexKeyForArtifact(abs) : null;
      const synthetic = workExpiryKey(slug, incarnation);

      // Identity of the archive this row will become, for comparison against
      // whatever already holds the key we would like to use.
      const identity = { slug, source: 'work-expiry' as const, incarnation } as IsaIndexEntry;
      const dirHolder = dirKey === null ? undefined : claimed.get(dirKey);
      const key = dirKey !== null && (dirHolder === undefined || sameIdentity(dirHolder, identity))
        ? dirKey
        : synthetic;

      // The chosen key must also be free of a DIFFERENT identity in what
      // already exists — not just in this batch, which is all the previous
      // version checked.
      const holder = claimed.get(key);
      if (holder !== undefined && !sameIdentity(holder, identity)) {
        console.error(`⚠️ isa-index: cannot archive work.json row "${slug}" without displacing "${holder.slug}" at key ${key}; deferring rather than overwriting.`);
        return null; // fail closed — the caller keeps every row
      }

      entries.push({
        key,
        incarnation,
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
      claimed.set(key, entries[entries.length - 1]);
    }

    // Distinct-key check retained as a cheap early abort. It is no longer the
    // guarantee — post-merge retrievability inside the transaction is.
    if (new Set(entries.map(e => e.key)).size !== recoverable) return null;
    return entries;
  });
}


/**
 * Synthetic key for an archived work.json row: reserved namespace, and unique
 * per INCARNATION.
 *
 * The previous version was `work-expiry:<slug>@<sanitized stamp>` with an
 * `@nostamp` fallback. Both halves collided. A row with no timestamp always
 * minted the same key, so a reused slug merged over an earlier incarnation's
 * memory; and the sanitizer stripped separators, so distinct stamps could
 * collapse onto one another.
 *
 * The discriminator is now a hash of what the row itself carries — the stamps,
 * the artifact path, the title, the phase and the criteria counts. Properties
 * that matter here:
 *   - TOTAL: there is no fallback branch, so no input mints a shared key.
 *   - DETERMINISTIC: re-archiving the same incarnation is idempotent, which is
 *     what makes a retry safe.
 *   - COLLISION-RESISTANT: two rows indistinguishable in every recorded field
 *     hash alike and are the same memory, so merging them loses nothing. A
 *     hash collision between DIFFERENT content is not identical content, so
 *     this is a resistance property, not an absolute — the previous wording
 *     ("only on identical content") claimed more than a hash can deliver.
 * Full-width hex: truncation to 64 bits was theoretical at this scale, but
 * widening costs nothing and retires the argument. Hex also cannot be altered
 * by the sanitizer that broke the last scheme.
 */
function incarnationDiscriminator(session: Record<string, any>): string {
  const material = JSON.stringify([
    session.started ?? null,
    session.updatedAt ?? null,
    session.lastToolActivity ?? null,
    session.isa ?? null,
    session.task ?? null,
    session.sessionName ?? null,
    session.phase ?? null,
    session.criteria?.checked ?? null,
    session.criteria?.total ?? null,
    session.sessionUUID ?? null,
  ]);
  return createHash('sha256').update(material).digest('hex');
}

function workExpiryKey(slug: string, incarnation: string): string {
  return `${WORK_EXPIRY_PREFIX}${slug}@${incarnation}`;
}

/**
 * The incarnation key for an entry already built (used when re-keying).
 *
 * Reads the identity the entry CARRIES. The previous version recomputed a hash
 * from entry fields while the plan computed one from session fields — two
 * different discriminators for one incarnation, so a relocated archive could
 * not be recognised as itself. Entries written before `incarnation` existed
 * have none; they fall back to a hash of their own fields, which is stable for
 * a given legacy entry and cannot collide with a real discriminator except by
 * hash collision.
 */
function incarnationKeyFor(entry: IsaIndexEntry): string {
  return `${WORK_EXPIRY_PREFIX}${entry.slug}@${entry.incarnation || derivedIncarnation(entry)}`;
}

/** Identity for an entry that carries none — derived from what it does carry. */
function derivedIncarnation(entry: IsaIndexEntry): string {
  return createHash('sha256').update(JSON.stringify([
    entry.lastTouched ?? null, entry.path ?? null, entry.title ?? null,
    entry.phase ?? null, entry.checked ?? null, entry.total ?? null,
  ])).digest('hex');
}

/**
 * Do these two entries denote the SAME memory?
 *
 * For an archive that means the same incarnation of the same slug — not merely
 * the same slug, which recurs. For an artifact observation the key is the
 * identity, so slug and source suffice.
 */
function sameIdentity(a: IsaIndexEntry, b: IsaIndexEntry): boolean {
  if (a.slug !== b.slug || a.source !== b.source) return false;
  if (b.source === 'work-expiry') {
    // UNDEFINED MATCHES NOTHING — not even another undefined. `undefined ===
    // undefined` is true, so two incarnation-less legacy archives compared
    // equal and merged in place: exactly the class the incarnation field was
    // added to close, surviving through the optionality of the field itself.
    //
    // Consequence, accepted deliberately: a legacy entry with no incarnation
    // re-archives under a fresh key rather than merging. That duplicates an
    // entry. Duplication is recoverable; a merged-away incarnation is not.
    if (a.incarnation === undefined || b.incarnation === undefined) return false;
    return a.incarnation === b.incarnation;
  }
  return true;
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
