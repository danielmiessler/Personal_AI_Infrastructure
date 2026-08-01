import { writeFileSync, renameSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Write to a uniquely-named sibling temp file, then rename it over the target.
 *
 * `renameSync` within a filesystem is atomic, so a reader either sees the whole
 * previous file or the whole new one — never a truncated prefix. This matters
 * for any file whose loss breaks the next launch (settings.json et al): a
 * truncate-then-write leaves invalid JSON behind if the process is killed
 * mid-write (SessionStart hook timeouts kill the process group) or the disk
 * fills. Here both of those fail on the temp file and the target is untouched.
 *
 * On failure the temp file is removed, so a failed write leaves nothing behind.
 * A hard kill can still strand a temp file, but the name (`<target>.tmp.<pid>.<ms>`)
 * never matches the target's extension, so it can't be read back as real config.
 *
 * public PR #1643, @elhoim
 */
function atomicWrite(filePath: string, content: string, mode?: number): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    // `mode` is applied at CREATE time, not chmod-after-rename: a rename-then-chmod
    // leaves the file readable at the default 0644 for a window on every write,
    // and re-creating drops whatever mode the previous file had. Callers writing
    // restricted config (0600) must pass it here. (Max review, 2026-07-29.)
    writeFileSync(tmp, content, mode === undefined ? { encoding: "utf8" } : { encoding: "utf8", mode });
    renameSync(tmp, filePath);
  } catch (error) {
    // Best-effort cleanup — the original write failure is what the caller needs.
    try {
      rmSync(tmp, { force: true });
    } catch {}
    throw error;
  }
}

export function atomicWriteJSON(filePath: string, data: unknown, mode?: number): void {
  atomicWrite(filePath, JSON.stringify(data, null, 2) + "\n", mode);
}

export function atomicWriteText(filePath: string, content: string, mode?: number): void {
  atomicWrite(filePath, content, mode);
}
