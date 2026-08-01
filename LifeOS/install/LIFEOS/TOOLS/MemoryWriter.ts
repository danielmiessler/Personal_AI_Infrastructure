#!/usr/bin/env bun
/**
 * MemoryWriter — set-overwrite writer for PRINCIPAL_MEMORY.md / DA_MEMORY.md.
 *
 * LifeOS autonomic memory subsystem, F2.
 *
 * Set-overwrite design: the reviewer
 * submits the canonical full list it wants for a memory file. The writer:
 *   1. Validates each entry against the 5-prefix schema (silent-drop malformed)
 *   2. Validates each entry's length ≤ 256 chars (silent-drop over-length)
 *   3. Deduplicates (case-sensitive string match)
 *   4. Checks the accepted+deduped count against the 48-entry cap; if over,
 *      returns a structured at-cap error so the model can re-submit trimmed
 *   5. Writes atomically: acquire <file>.lock → write <file>.tmp → atomic rename
 *
 * Why set-overwrite beats incremental add/replace/remove:
 *   - No race surface (single atomic write per review)
 *   - Idempotent (same input produces same file)
 *   - Eviction is structural (model omits entries it wants gone)
 *   - Simpler mental model: "here is the state I want"
 *
 * Five prefixes only (case-sensitive, exact match, followed by ": "):
 *   NAME | ROLE | RELATION | PREFERENCE | RULE
 *
 * Allowed paths only (resolved + suffix-matched, no symlink escape):
 *   LIFEOS/USER/PRINCIPAL/PRINCIPAL_MEMORY.md
 *   LIFEOS/USER/DIGITAL_ASSISTANT/DA_MEMORY.md
 *
 * Observability: every successful setEntries appends a JSONL row to
 * MEMORY/OBSERVABILITY/memory-writes.jsonl per ISC-107.
 *
 * CLI:
 *   bun MemoryWriter.ts read <path>
 *   bun MemoryWriter.ts set <path> <entries-as-newline-delimited-stdin>
 *   bun MemoryWriter.ts test    (runs built-in smoke test)
 */

import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { homedir } from "node:os";

// ── Constants ──

const CLAUDE_ROOT = pathResolve(homedir(), ".claude");

const ALLOWED_FILES = new Set<string>([
  pathResolve(CLAUDE_ROOT, "LIFEOS/USER/PRINCIPAL/PRINCIPAL_MEMORY.md"),
  pathResolve(CLAUDE_ROOT, "LIFEOS/USER/DIGITAL_ASSISTANT/DA_MEMORY.md"),
]);

const PREFIX_PATTERN = /^(NAME|ROLE|RELATION|PREFERENCE|RULE): /;
const MAX_CHARS_PER_ENTRY = 256;
const MAX_ENTRIES = 48;

export const BEGIN_MARKER = "<!-- BEGIN ENTRIES -->";
export const END_MARKER = "<!-- END ENTRIES -->";

const OBSERVABILITY_PATH = pathResolve(
  CLAUDE_ROOT,
  "LIFEOS/MEMORY/OBSERVABILITY/memory-writes.jsonl",
);

// ── Types ──

export interface SetEntriesOk {
  ok: true;
  accepted: number;
  dropped_malformed: number;
  dropped_overlength: number;
  dropped_duplicates: number;
  prior_count: number;
  new_count: number;
  evictions: string[];
  additions: string[];
}

export interface SetEntriesErrAtCap {
  ok: false;
  code: "EAT_CAP";
  message: string;
  over_count: number;
  cap: number;
  indexed_submission: string[];
}

export interface SetEntriesErrPath {
  ok: false;
  code: "EINVAL_PATH";
  message: string;
}

export interface SetEntriesErrLock {
  ok: false;
  code: "ELOCK_HELD";
  message: string;
}

export interface SetEntriesErrIO {
  ok: false;
  code: "EWRITE_FAILED";
  message: string;
}

export interface SetEntriesErrShrink {
  ok: false;
  code: "ESUSPECT_SHRINK";
  message: string;
  prior_count: number;
  new_count: number;
}

export type SetEntriesResult =
  | SetEntriesOk
  | SetEntriesErrAtCap
  | SetEntriesErrPath
  | SetEntriesErrLock
  | SetEntriesErrIO
  | SetEntriesErrShrink;

export interface ReadResult {
  entries: string[];
  count: number;
  chars_used: number;
  cap_entries: number;
  cap_chars: number;
  /**
   * On-disk entries excluded from `entries` as invalid (marker/newline content or
   * over-length). NEVER silently ignorable: the reviewer's set-overwrite submits
   * `entries`, so anything listed here is erased by its next write.
   */
  dropped_invalid: { entry: string; reason: "malformed" | "overlength" }[];
}

// ── Path validation ──

function validatePath(filePath: string): { ok: true; abs: string } | SetEntriesErrPath {
  let abs: string;
  try {
    abs = pathResolve(filePath);
  } catch (e) {
    return { ok: false, code: "EINVAL_PATH", message: `Cannot resolve path: ${filePath}` };
  }
  if (!ALLOWED_FILES.has(abs)) {
    return {
      ok: false,
      code: "EINVAL_PATH",
      message: `Path not in allowlist. MemoryWriter only operates on PRINCIPAL_MEMORY.md / DA_MEMORY.md. Got: ${abs}`,
    };
  }
  return { ok: true, abs };
}

// ── Entry validation ──

interface ValidationOutcome {
  accepted: string[];
  malformed: number;
  overlength: number;
  duplicates: number;
}

function validateAndDedup(entries: string[]): ValidationOutcome {
  const seen = new Set<string>();
  const accepted: string[] = [];
  let malformed = 0;
  let overlength = 0;
  let duplicates = 0;

  for (const raw of entries) {
    const entry = raw.trim();
    if (entry.length === 0) continue;

    // One entry = one physical line. An embedded newline would serialize as
    // multiple on-disk lines, inflating the real entry count past every cap and
    // desyncing accepted/new_count from what a reparse sees.
    if (/[\r\n]/.test(entry)) {
      malformed++;
      continue;
    }

    const m = entry.match(PREFIX_PATTERN);
    if (!m) {
      malformed++;
      continue;
    }

    // Entries may never contain the structural markers: a marker substring inside
    // an entry would pollute the block and blind naive parsers. A pre-existing
    // on-disk offender still parses whole (markers are line-based), but
    // resubmission drops it here — visible as dropped_malformed.
    if (entry.includes(BEGIN_MARKER) || entry.includes(END_MARKER)) {
      malformed++;
      continue;
    }

    // Length check: total entry length must be ≤ prefix.length + MAX_CHARS_PER_ENTRY
    // Equivalently: the content AFTER the prefix must be ≤ MAX_CHARS_PER_ENTRY.
    const prefixWithColonSpace = m[0]; // e.g. "PREFERENCE: "
    const content = entry.slice(prefixWithColonSpace.length);
    if (content.length > MAX_CHARS_PER_ENTRY) {
      overlength++;
      continue;
    }

    if (seen.has(entry)) {
      duplicates++;
      continue;
    }
    seen.add(entry);
    accepted.push(entry);
  }

  return { accepted, malformed, overlength, duplicates };
}

// ── File parse / serialize ──

// Line-based canonical model (public PR #1593, @anikinsasha). The former
// indexOf-over-the-whole-body parse had three compounding defects that produced
// permanent, SILENT memory loss in the wild:
//
//   1. A stray END before BEGIN sent every write down the recovery branch, forever.
//   2. serializeFile's self-heal appended the missing BEGIN *after* that stray END,
//      manufacturing a permanent END-before-BEGIN inversion, and re-emitted one
//      fresh END per write — files grew a stack of END markers, +1 per curation,
//      never compacted.
//   3. Every reader bailed to zero entries on marker disorder, so sessions ran with
//      no memory loaded while the writer kept curating and the health check
//      reported clean headroom (0/48).
//
// The model that fixes it: markers are recognized ONLY as whole trimmed lines, so
// an entry that merely mentions a marker can never truncate the block. Parse is
// uniformly lenient — every valid-prefix line anywhere after the frontmatter is an
// entry (block ∪ orphans, order-preserved, first-seen deduped); marker lines are
// structural and dropped; everything else is body, preserved verbatim, including
// invalid-prefix orphans, which are never silently absorbed or deleted. Serialize
// always emits the canonical shape (frontmatter → body → BEGIN → entries → END →
// newline), so ONE write converges any historical corruption and repeated writes
// are byte-identical.
//
// This is THE parser for the memory files. Every consumer (LoadMemory hook, Pulse
// memory panel, MemoryHealthCheck, MemoryRestore) imports it — reader and writer
// can never diverge again. Never write a second marker-parsing implementation.

export interface ParsedMemoryFile {
  frontmatter: string;
  bodyLines: string[];
  entries: string[];
}

export function parseMemoryContent(content: string): ParsedMemoryFile {
  const fmMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  // A "frontmatter" that swallowed a marker line is a mis-close: an unterminated
  // opening fence closing on some later body `---` would hide the whole entries
  // block inside frontmatter, blinding the parse AND the shrink guard while
  // marker-sanity checks stay green. Demote to no-frontmatter so every entry is
  // recovered from the body instead.
  const fmRaw = fmMatch ? fmMatch[0] : "";
  const fmValid = fmRaw !== "" && !fmRaw.includes(BEGIN_MARKER) && !fmRaw.includes(END_MARKER);
  const frontmatter = fmValid ? fmRaw.replace(/\r\n/g, "\n") : "";
  const afterFm = fmValid ? content.slice(fmRaw.length) : content;

  const bodyLines: string[] = [];
  const entries: string[] = [];
  const seen = new Set<string>();

  for (const line of afterFm.split(/\r?\n/)) {
    const t = line.trim();
    if (t === BEGIN_MARKER || t === END_MARKER) continue;
    if (t.length > 0 && PREFIX_PATTERN.test(t)) {
      if (!seen.has(t)) {
        seen.add(t);
        entries.push(t);
      }
      continue;
    }
    bodyLines.push(line);
  }

  // Trailing blank body lines are separator artifacts; serialize re-adds exactly
  // one, keeping parse→serialize→parse byte-stable.
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
    bodyLines.pop();
  }

  return { frontmatter, bodyLines, entries };
}

function updateFrontmatterTimestamp(frontmatter: string): string {
  if (!frontmatter) return frontmatter;
  const now = new Date().toISOString();
  // Replace last_updated value
  if (/^last_updated:.*$/m.test(frontmatter)) {
    return frontmatter.replace(/^last_updated:.*$/m, `last_updated: ${now}`);
  }
  // Add it before the closing ---
  return frontmatter.replace(/\n---\n$/, `\nlast_updated: ${now}\n---\n`);
}

function updateFrontmatterUpdatedBy(frontmatter: string, by: string): string {
  if (!frontmatter) return frontmatter;
  if (/^last_updated_by:.*$/m.test(frontmatter)) {
    return frontmatter.replace(/^last_updated_by:.*$/m, `last_updated_by: ${by}`);
  }
  return frontmatter.replace(/\n---\n$/, `\nlast_updated_by: ${by}\n---\n`);
}

/**
 * Always emits the canonical shape — frontmatter → body → BEGIN → entries → END →
 * trailing newline. No self-heal branches: there is exactly one output shape, so a
 * single write converges any corrupted file and a repeat write is byte-identical.
 */
export function serializeMemoryContent(
  parsed: ParsedMemoryFile,
  newEntries: string[],
  updatedBy: string,
): string {
  let fm = updateFrontmatterTimestamp(parsed.frontmatter);
  fm = updateFrontmatterUpdatedBy(fm, updatedBy);

  let out = fm;
  if (parsed.bodyLines.length > 0) out += parsed.bodyLines.join("\n") + "\n\n";
  out += BEGIN_MARKER + "\n";
  if (newEntries.length > 0) out += newEntries.join("\n") + "\n";
  out += END_MARKER + "\n";
  return out;
}

// ── Atomic write with lock ──

function withLock<T>(filePath: string, action: () => T): T | SetEntriesErrLock | SetEntriesErrIO {
  const lockPath = `${filePath}.lock`;
  let fd: number | null = null;
  try {
    fd = openSync(lockPath, "wx"); // O_CREAT | O_EXCL
  } catch (e: any) {
    if (e?.code === "EEXIST") {
      return {
        ok: false,
        code: "ELOCK_HELD",
        message: `Lock held by another writer: ${lockPath}. Investigate stale lock if persistent.`,
      };
    }
    return {
      ok: false,
      code: "EWRITE_FAILED",
      message: `Failed to acquire lock: ${e?.message || String(e)}`,
    };
  }

  try {
    const result = action();
    return result;
  } catch (e: any) {
    return {
      ok: false,
      code: "EWRITE_FAILED",
      message: `Write action threw: ${e?.message || String(e)}`,
    };
  } finally {
    try {
      if (fd !== null) closeSync(fd);
    } catch { /* ignore */ }
    try {
      unlinkSync(lockPath);
    } catch { /* lockfile cleanup best-effort */ }
  }
}

// ── Per-write snapshots (recoverability) ──
// Every Tier-A write snapshots the PRIOR file content to a ring buffer before
// overwriting. set-overwrite has a "wipe the whole file" blast radius; git only
// covers between commits. This makes every individual autonomic write reversible
// via `MemoryRestore.ts`. Cheap: one file copy of <13KB, capped at 30 per file.
const SNAPSHOT_DIR = pathResolve(CLAUDE_ROOT, "LIFEOS/MEMORY/OBSERVABILITY/memory-snapshots");
const SNAPSHOT_RING = 30;

function snapshotBeforeWrite(absPath: string, priorContent: string): void {
  try {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const base = absPath.split("/").pop()!.replace(/\.md$/, "");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(pathResolve(SNAPSHOT_DIR, `${base}__${stamp}.md`), priorContent, "utf8");
    // Trim the ring: keep the newest SNAPSHOT_RING per base file.
    const mine = readdirSync(SNAPSHOT_DIR)
      .filter((f: string) => f.startsWith(`${base}__`))
      .sort(); // ISO stamp sorts chronologically
    for (const stale of mine.slice(0, Math.max(0, mine.length - SNAPSHOT_RING))) {
      try { rmSync(pathResolve(SNAPSHOT_DIR, stale)); } catch { /* best-effort */ }
    }
  } catch {
    // Snapshotting is best-effort; never fail a write because the backup failed.
  }
}

function atomicWrite(filePath: string, content: string): true | SetEntriesErrIO {
  const tmpPath = `${filePath}.tmp`;
  try {
    // O_EXCL ("wx") after a best-effort unlink: a symlink planted at the
    // predictable tmpPath would otherwise be written THROUGH — the write lands on
    // its target before the rename ever runs. O_EXCL refuses any pre-existing
    // path, symlinks included. (public PR #1593, @anikinsasha)
    try { unlinkSync(tmpPath); } catch { /* absent is the normal case */ }
    writeFileSync(tmpPath, content, { encoding: "utf8", flag: "wx" });
    // fsync the tmp file for durability before rename
    const fd = openSync(tmpPath, "r+");
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmpPath, filePath);
    // fsync the containing directory so the rename itself is durable — without it
    // a power/kernel crash can roll the rename back despite this returning ok.
    try {
      const dirFd = openSync(dirname(filePath), "r");
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
    } catch { /* dir fsync unsupported on some filesystems — best-effort */ }
    return true;
  } catch (e: any) {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
    return {
      ok: false,
      code: "EWRITE_FAILED",
      message: `Atomic write failed: ${e?.message || String(e)}`,
    };
  }
}

// ── Observability ──

function logWriteEvent(
  filePath: string,
  result: SetEntriesOk,
  updatedBy?: string,
): void {
  try {
    mkdirSync(dirname(OBSERVABILITY_PATH), { recursive: true });
    const row = JSON.stringify({
      ts: new Date().toISOString(),
      file: filePath.replace(CLAUDE_ROOT + "/", ""),
      updated_by: updatedBy ?? "unknown",
      prior_count: result.prior_count,
      new_count: result.new_count,
      accepted: result.accepted,
      dropped_malformed: result.dropped_malformed,
      dropped_overlength: result.dropped_overlength,
      dropped_duplicates: result.dropped_duplicates,
      evictions: result.evictions,
      additions: result.additions,
    });
    appendFileSync(OBSERVABILITY_PATH, row + "\n", "utf8");
  } catch {
    // Observability is best-effort; never fail a write because logging failed.
  }
}

// ── Public API ──

export interface SetEntriesOptions {
  /** Who is writing — appears in the file's frontmatter last_updated_by. */
  updatedBy?: string;
  /** Bypass the catastrophic-shrink guard (legitimate full-clear / restore). */
  allowDrastic?: boolean;
}

export function setEntries(
  filePath: string,
  entries: string[],
  options: SetEntriesOptions = {},
): SetEntriesResult {
  const pathCheck = validatePath(filePath);
  if (!("abs" in pathCheck)) return pathCheck;
  const abs = pathCheck.abs;

  if (!existsSync(abs)) {
    return {
      ok: false,
      code: "EINVAL_PATH",
      message: `Memory file does not exist (scaffold it first): ${abs}`,
    };
  }

  const validated = validateAndDedup(entries);
  const submitted = validated.accepted.length;
  const indexedSubmission = validated.accepted.map((e, i) => `[${i}] ${e}`);

  if (submitted > MAX_ENTRIES) {
    return {
      ok: false,
      code: "EAT_CAP",
      message: `Memory file cap is ${MAX_ENTRIES} entries — your submission has ${submitted} accepted+deduped entries. Trim ${submitted - MAX_ENTRIES} before re-submitting.`,
      over_count: submitted - MAX_ENTRIES,
      cap: MAX_ENTRIES,
      indexed_submission: indexedSubmission,
    };
  }

  const result = withLock(abs, () => {
    const content = readFileSync(abs, "utf8");
    const parsed = parseMemoryContent(content);
    const priorEntries = parsed.entries;
    const newEntries = validated.accepted;

    // Compute the symmetric delta: evictions (present before, absent now) and
    // additions (absent before, present now). Both feed the visibility surface.
    const newSet = new Set(newEntries);
    const priorSet = new Set(priorEntries);
    const evictions = priorEntries.filter((e) => !newSet.has(e));
    const additions = newEntries.filter((e) => !priorSet.has(e));

    // Catastrophic-shrink guard (computed IN-LOCK against the just-read prior
    // state, so it can't race a concurrent write). set-overwrite REPLACES the
    // file, so a hallucinated empty/tiny reviewer list would wipe real memory
    // (this exact wipe happened once during a cross-vendor audit). We block two
    // shapes only — and deliberately ALLOW large honest consolidation (many
    // drops accompanied by additions), so the reviewer can still shrink hard
    // when it's genuinely merging. Bypass for legitimate full-clears via opts.
    if (!options.allowDrastic && priorEntries.length >= 10) {
      const FLOOR = 3;
      const massDeleteNoAdd = evictions.length > priorEntries.length * 0.5 && additions.length === 0;
      if (newEntries.length < FLOOR || massDeleteNoAdd) {
        const shrinkErr: SetEntriesErrShrink = {
          ok: false,
          code: "ESUSPECT_SHRINK",
          message: `Refused: op would shrink ${priorEntries.length} → ${newEntries.length} entries (${evictions.length} dropped, ${additions.length} added). Near-empty results and mass-deletion-without-curation are blocked as likely-bad output. A real consolidation that drops many should also ADD merged entries.`,
          prior_count: priorEntries.length,
          new_count: newEntries.length,
        };
        return shrinkErr;
      }
    }

    // Snapshot the prior content before we overwrite — individual-write recovery.
    snapshotBeforeWrite(abs, content);

    const newContent = serializeMemoryContent(parsed, newEntries, options.updatedBy || "MemoryWriter");
    const writeRes = atomicWrite(abs, newContent);
    if (writeRes !== true) return writeRes;

    const ok: SetEntriesOk = {
      ok: true,
      accepted: newEntries.length,
      dropped_malformed: validated.malformed,
      dropped_overlength: validated.overlength,
      dropped_duplicates: validated.duplicates,
      prior_count: priorEntries.length,
      new_count: newEntries.length,
      evictions,
      additions,
    };
    logWriteEvent(abs, ok, options.updatedBy);
    return ok;
  });

  return result;
}

export function read(filePath: string): ReadResult | SetEntriesErrPath {
  const pathCheck = validatePath(filePath);
  if (!("abs" in pathCheck)) return pathCheck;
  const abs = pathCheck.abs;

  if (!existsSync(abs)) {
    // Graceful degradation: missing file reads as zero entries
    return {
      entries: [],
      count: 0,
      chars_used: 0,
      cap_entries: MAX_ENTRIES,
      cap_chars: MAX_ENTRIES * MAX_CHARS_PER_ENTRY,
      dropped_invalid: [],
    };
  }

  const content = readFileSync(abs, "utf8");
  const parsed = parseMemoryContent(content);
  // Entries invalid at read time are excluded from `entries` but REPORTED, never
  // silently swallowed: a set-overwrite computed from `entries` would otherwise
  // erase them with no trace anywhere, since the write's dropped_* counts only
  // cover the submission, which by then no longer contains them.
  const valid = validateAndDedup(parsed.entries);
  const acceptedSet = new Set(valid.accepted);
  const dropped_invalid: ReadResult["dropped_invalid"] = [];
  for (const entry of parsed.entries) {
    if (acceptedSet.has(entry)) continue;
    const m = entry.match(PREFIX_PATTERN);
    const overlength = !!m && entry.slice(m[0].length).length > MAX_CHARS_PER_ENTRY;
    dropped_invalid.push({ entry, reason: overlength ? "overlength" : "malformed" });
  }
  const chars_used = valid.accepted.reduce((sum, e) => sum + e.length, 0);

  return {
    entries: valid.accepted,
    count: valid.accepted.length,
    chars_used,
    cap_entries: MAX_ENTRIES,
    cap_chars: MAX_ENTRIES * MAX_CHARS_PER_ENTRY,
    dropped_invalid,
  };
}

// ── CLI ──

function smokeTest(): number {
  console.log("MemoryWriter smoke test starting…");

  // Pure canonical-rebuild fixtures — NO filesystem, and in particular NOT the
  // live memory files. The pre-port smoke test ran setEntries against the real
  // PRINCIPAL_MEMORY.md and its step-7 cleanup submitted [], so running
  // `bun MemoryWriter.ts test` on a populated install WIPED real memory.
  // Write-path coverage lives in test/tools/MemoryWriter.test.ts.
  // (public PR #1593, @anikinsasha)
  const corrupted =
    [
      "---",
      "schema_version: 1",
      "---",
      "# Hot-Layer Memory",
      "",
      "<!-- template comment -->",
      END_MARKER,
      BEGIN_MARKER,
      END_MARKER,
      END_MARKER,
      "FACT: legacy invalid-prefix orphan stays in body",
      "NAME: Fixture User",
      `RULE: keep the ${END_MARKER} marker pair intact`,
      END_MARKER,
    ].join("\n") + "\n";

  const p1 = parseMemoryContent(corrupted);
  if (p1.entries.length !== 2) {
    console.error(`FAIL: corrupted fixture expected 2 entries, got ${p1.entries.length}`);
    return 1;
  }
  if (p1.entries[1] !== `RULE: keep the ${END_MARKER} marker pair intact`) {
    console.error(`FAIL: marker-substring entry truncated on parse: ${p1.entries[1]}`);
    return 1;
  }
  if (!p1.bodyLines.some((l) => l.startsWith("FACT: "))) {
    console.error("FAIL: invalid-prefix orphan was silently absorbed instead of kept in body");
    return 1;
  }
  console.log(`  parse: recovered ${p1.entries.length} entries from an END-before-BEGIN + END-stack file`);

  // One write converges to canonical shape: exactly one BEGIN, one END, in order.
  const rebuilt = serializeMemoryContent(p1, p1.entries, "smoke-test");
  const begins = rebuilt.split("\n").filter((l) => l.trim() === BEGIN_MARKER).length;
  const ends = rebuilt.split("\n").filter((l) => l.trim() === END_MARKER).length;
  if (begins !== 1 || ends !== 1) {
    console.error(`FAIL: canonical rebuild expected 1 BEGIN / 1 END, got ${begins} / ${ends}`);
    return 1;
  }
  if (rebuilt.indexOf(BEGIN_MARKER) > rebuilt.indexOf(END_MARKER)) {
    console.error("FAIL: canonical rebuild left END before BEGIN");
    return 1;
  }
  console.log(`  serialize: converged ${begins} BEGIN / ${ends} END, in order`);

  // Idempotency: a second round-trip is byte-identical apart from the stamp.
  const stripStamp = (s: string) => s.replace(/^last_updated: .*$/m, "last_updated: X");
  const again = serializeMemoryContent(parseMemoryContent(rebuilt), p1.entries, "smoke-test");
  if (stripStamp(again) !== stripStamp(rebuilt)) {
    console.error("FAIL: second write was not byte-identical — rebuild is not idempotent");
    return 1;
  }
  console.log("  idempotency: second write byte-identical");

  // Entry set is preserved verbatim across the heal (zero set-diff).
  const after = parseMemoryContent(rebuilt).entries;
  if (after.join("\u0000") !== p1.entries.join("\u0000")) {
    console.error("FAIL: entry set changed across the heal");
    return 1;
  }
  console.log(`  preservation: ${after.length}/${p1.entries.length} entries survived verbatim`);

  // CRLF and frontmatter-less shapes parse the same way.
  const crlf = `${BEGIN_MARKER}\r\nNAME: CRLF User\r\n${END_MARKER}\r\n`;
  if (parseMemoryContent(crlf).entries.length !== 1) {
    console.error("FAIL: CRLF file did not parse to 1 entry");
    return 1;
  }
  if (parseMemoryContent("NAME: No Frontmatter\n").entries.length !== 1) {
    console.error("FAIL: frontmatter-less file did not parse to 1 entry");
    return 1;
  }
  console.log("  tolerance: CRLF + frontmatter-less parse correctly");

  // Path allowlist still refuses anything outside the two memory files.
  const w = setEntries("/etc/passwd", ["NAME: hacker"], { updatedBy: "smoke-test" });
  if (w.ok || w.code !== "EINVAL_PATH") {
    console.error(`FAIL: expected EINVAL_PATH for /etc/passwd, got ${w.ok ? "success" : w.code}`);
    return 1;
  }
  console.log("  allowlist: /etc/passwd correctly rejected with EINVAL_PATH");

  console.log("✓ MemoryWriter smoke test PASSED (no live memory file was touched)");
  return 0;
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "test") {
    process.exit(smokeTest());
  }
  if (cmd === "read") {
    const path = process.argv[3];
    if (!path) {
      console.error("Usage: bun MemoryWriter.ts read <path>");
      process.exit(2);
    }
    const r = read(path);
    console.log(JSON.stringify(r, null, 2));
    process.exit("code" in r ? 1 : 0);
  }
  if (cmd === "set") {
    const path = process.argv[3];
    if (!path) {
      console.error("Usage: bun MemoryWriter.ts set <path>  (entries via stdin, one per line)");
      process.exit(2);
    }
    const stdin = await new Promise<string>((resolve) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => { data += chunk; });
      process.stdin.on("end", () => resolve(data));
    });
    const entries = stdin.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const r = setEntries(path, entries, { updatedBy: "cli" });
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  }
  console.error("Usage: bun MemoryWriter.ts {test|read <path>|set <path>}");
  process.exit(2);
}

if (import.meta.main) {
  main();
}
