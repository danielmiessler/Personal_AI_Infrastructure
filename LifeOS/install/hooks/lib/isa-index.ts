/**
 * isa-index.ts — the persistent ISA backlog index (library, not a CLI).
 *
 * PURPOSE:
 * ISAs are the memory of the principal's work and tools. They must be
 * PERSISTENT and FINDABLE forever. Freshness may govern what is PUSHED at
 * session start; nothing may govern what EXISTS or is FINDABLE. Before this
 * module, an ISA-recorded item went invisible in two steps — off the
 * SessionStart block at 48h, out of work.json at 7d (TTL hard-delete) — and
 * after that lived only as bytes on disk, pull-only (task 3783).
 *
 * This file is that memory. It is APPEND-ONLY BY CONSTRUCTION:
 *   - there is no exported function that removes an entry;
 *   - there is no retention/purge knob, deliberately (a retention knob on
 *     memory is the exact defect 3783 removes);
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
 * READ PATH:
 *   - LoadContext.hook.ts "Stalled ISAs" block (any age, display-capped)
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
// Defaults are the values that were hardcoded before 3783 — conservative, and
// what upstream ships. The principal's instance overrides them in settings.user.json.
// There is deliberately NO index-retention knob: see the header.

export interface IsaPickupKnobs {
  /** Master switch for index writes and the stalled block. */
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
  return dir.startsWith(root) ? dir.slice(root.length) : dir;
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

/** Write-path guard (2026-07-25 audit, finding 1): if an index file EXISTS but
 *  does not parse as an index, move it aside before we publish a fresh one —
 *  the file is gitignored and single-copy, so overwriting it is the one way
 *  this store can silently lose index-only memory. Read paths never call this
 *  (a display hook must not rename files). Returns without throwing. */
function quarantineIfCorrupt(path: string): void {
  try {
    if (!existsSync(path)) return;
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    if (parsed && typeof parsed === 'object' && parsed.entries && typeof parsed.entries === 'object') return;
  } catch { /* unparseable — fall through to quarantine */ }
  try {
    const aside = `${path}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    renameSync(path, aside);
    console.error(`⚠️ isa-index: existing index was corrupt — quarantined to ${aside}; rebuilding from disk (index-only entries, if any, are preserved in the quarantined copy)`);
  } catch { /* rename failed — leave in place; the atomic publish still replaces old-or-new wholesale */ }
}

// ── Lock + atomic publish ─────────────────────────────────────────────────

const LOCK_STALE_MS = 10_000;
const LOCK_RETRIES = 5;
const LOCK_RETRY_SLEEP_MS = 20;

function lockPathFor(indexPath: string): string {
  return indexPath + '.lock';
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

function lockAgeMs(lock: string): number {
  try {
    return Date.now() - statSync(lock).mtimeMs;
  } catch {
    return -1; // gone
  }
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
function acquireLock(lock: string): boolean {
  for (let attempt = 0; attempt <= LOCK_RETRIES; attempt++) {
    try {
      mkdirSync(lock);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'EEXIST') return false;
      const age = lockAgeMs(lock);
      if (age === -1 || age > LOCK_STALE_MS) {
        try { rmSync(lock, { recursive: true, force: true }); } catch {}
        try { mkdirSync(lock); return true; } catch { /* lost the race — retry */ }
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
    writeFileSync(tmp, JSON.stringify(index, null, 2));
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
  // The artifact is present in this observation — clear any tombstone.
  delete merged.missing;
  delete merged.missingSince;
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

  // The lock is a sibling of the index file, so its parent must exist before
  // the non-recursive mkdir that IS the lock. Failure here (e.g. a file where
  // the directory should be) is a hard failure the caller must see.
  try {
    mkdirSync(dirname(path), { recursive: true });
  } catch {
    return false;
  }

  const lock = lockPathFor(path);
  if (!acquireLock(lock)) return false;
  try {
    quarantineIfCorrupt(path);
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
        const present = (() => { try { return existsSync(entry.path); } catch { return false; } })();
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
 * it works even when the artifact has been moved or deleted.
 */
export function archiveWorkRows(
  rows: Array<{ slug: string; session: Record<string, any> }>,
  opts: { path?: string } = {},
): boolean {
  const now = new Date().toISOString();
  const entries: IsaIndexEntry[] = [];

  for (const { slug, session } of rows) {
    const phase = String(session.phase || 'unknown').toLowerCase();
    if (PLACEHOLDER_PHASES.has(phase)) continue; // harness bookkeeping, not an ISA
    const abs = resolveRowIsaPath(session.isa);
    if (!abs) continue;
    const checked = Number(session.criteria?.checked ?? 0) || 0;
    const total = Number(session.criteria?.total ?? 0) || 0;
    entries.push({
      key: indexKeyForArtifact(abs),
      kind: abs.includes('/LIFEOS/TOOLS/') ? 'tool' : 'work',
      slug,
      title: String(session.task || session.sessionName || slug),
      artifact: abs.split('/').pop() || 'ISA.md',
      path: abs,
      phase,
      checked,
      total,
      unchecked: Math.max(0, total - checked),
      remainingWork: false,
      remainingOpen: 0,
      lastTouched: String(session.lastToolActivity || session.updatedAt || session.started || now),
      firstIndexed: now,
      lastIndexed: now,
      source: 'work-expiry',
    });
  }

  if (entries.length === 0) return true; // nothing to preserve — eviction is safe
  return upsertIsaEntries(entries, { path: opts.path });
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
