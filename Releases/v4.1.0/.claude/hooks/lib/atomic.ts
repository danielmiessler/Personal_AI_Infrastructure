/**
 * atomic.ts — Atomic file write utilities
 *
 * Prevents data corruption when multiple hooks write to the same JSON state
 * files concurrently (Claude Code fires all hooks for an event in parallel).
 *
 * Pattern: write to a pid-namespaced .tmp file, then rename into place.
 * POSIX rename() is atomic — readers either see the old or new file, never
 * a partial write.
 */

import { writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';

/**
 * Write JSON to a file atomically via tmp-then-rename.
 * Safe for concurrent writers — last write wins, no partial reads.
 */
export function atomicWriteJSON(path: string, data: unknown): void {
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tmp, path);
  } catch (err) {
    try { unlinkSync(tmp); } catch {}
    throw err;
  }
}

/**
 * Write a string to a file atomically via tmp-then-rename.
 * Use for non-JSON files that still need atomic replacement.
 */
export function atomicWriteText(path: string, content: string): void {
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, content, 'utf-8');
    renameSync(tmp, path);
  } catch (err) {
    try { unlinkSync(tmp); } catch {}
    throw err;
  }
}
