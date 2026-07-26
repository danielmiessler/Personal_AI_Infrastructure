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
 */
function atomicWrite(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  try {
    writeFileSync(tmp, content, { encoding: "utf8" });
    renameSync(tmp, filePath);
  } catch (error) {
    // Best-effort cleanup — the original write failure is what the caller needs.
    try {
      rmSync(tmp, { force: true });
    } catch {}
    throw error;
  }
}

export function atomicWriteJSON(filePath: string, data: unknown): void {
  atomicWrite(filePath, JSON.stringify(data, null, 2) + "\n");
}

export function atomicWriteText(filePath: string, content: string): void {
  atomicWrite(filePath, content);
}
