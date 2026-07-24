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
import { dirname, join, resolve as pathResolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { mkdtempSync, realpathSync } from "node:fs";

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
   * On-disk entries excluded from `entries` as invalid (bad/marker content or
   * over-length). NEVER silently ignorable: the reviewer's set-overwrite
   * submits `entries`, so anything listed here is erased by its next write.
   * Health CHECK 7.6 surfaces these as pending silent loss until resolved.
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
  if (!ALLOWED_FILES.has(abs) && !isTestPath(abs)) {
    return {
      ok: false,
      code: "EINVAL_PATH",
      message: `Path not in allowlist. MemoryWriter only operates on PRINCIPAL_MEMORY.md / DA_MEMORY.md. Got: ${abs}`,
    };
  }
  return { ok: true, abs };
}

// Test fixtures only: confined to the OS temp dir with a dedicated suffix, so
// the escape hatch can never target vault/user paths. This keeps the smoke
// test and bun tests off the LIVE memory files (the pre-2026-07-23 smoke test
// wrote to the real PRINCIPAL_MEMORY.md and its cleanup emptied it).
// Confinement is checked on REAL paths too, so a tmpdir symlink named
// *.memtest.md cannot point reads/snapshots at files outside the temp dir.
function isTestPath(abs: string): boolean {
  let tmpRoot: string;
  try {
    tmpRoot = realpathSync(tmpdir());
  } catch {
    tmpRoot = pathResolve(tmpdir());
  }
  const lexOk =
    abs.endsWith(".memtest.md") &&
    (abs.startsWith(pathResolve(tmpdir()) + "/") || abs.startsWith(tmpRoot + "/"));
  if (!lexOk) return false;
  try {
    const real = realpathSync(abs);
    return real.endsWith(".memtest.md") && real.startsWith(tmpRoot + "/");
  } catch {
    // Not created yet: confine by the real parent directory instead.
    try {
      const realDir = realpathSync(dirname(abs));
      return realDir === tmpRoot || realDir.startsWith(tmpRoot + "/");
    } catch {
      return false;
    }
  }
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
    // multiple on-disk lines, inflating the real entry count past every cap
    // and desyncing accepted/new_count from what reparse sees.
    if (/[\r\n]/.test(entry)) {
      malformed++;
      continue;
    }

    const m = entry.match(PREFIX_PATTERN);
    if (!m) {
      malformed++;
      continue;
    }

    // Entries may never contain the structural markers: a marker substring
    // inside an entry would blind naive parsers and pollute the block. A
    // pre-existing on-disk offender still parses whole (line-based markers),
    // but resubmission drops it here — visible as dropped_malformed.
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

// Line-based canonical model. Markers are recognized ONLY as whole trimmed
// lines, so an entry that merely mentions a marker can never truncate the
// block. Parse is uniformly lenient: every valid-prefix line anywhere after
// the frontmatter is an entry (block ∪ orphans, order-preserved, first-seen
// deduped); marker lines are structural and dropped; everything else is body,
// preserved verbatim — including invalid-prefix orphans (e.g. a stray `FACT:`
// line), which are never silently absorbed or deleted. Serialize always emits
// the canonical shape (frontmatter → body → BEGIN → entries → END → newline),
// so a single write converges any historical corruption (END-before-BEGIN,
// duplicate-END stacks) and repeated writes are byte-identical.
//
// This is THE parser for the memory files. Every consumer (LoadMemory hook,
// Pulse memory panel, MemoryHealthCheck, MemoryRestore, Telegram context)
// imports it — never a second marker-parsing implementation.

export interface ParsedMemoryFile {
  frontmatter: string;
  bodyLines: string[];
  entries: string[];
}

export function parseMemoryContent(content: string): ParsedMemoryFile {
  const fmMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  // A "frontmatter" that swallowed a marker line is a mis-close: an
  // unterminated opening fence closing on some later body `---` would hide the
  // whole entries block inside frontmatter (blinding the parse AND the shrink
  // guard while marker-sanity checks stay green). Demote to no-frontmatter so
  // every entry is recovered from the body instead.
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

  // Trailing blank body lines are separator artifacts; serialize re-adds
  // exactly one, keeping parse→serialize→parse byte-stable.
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
    // predictable tmpPath would otherwise be written THROUGH (the write hits
    // its target before the rename ever runs — confirmed attack). O_EXCL
    // refuses any pre-existing path, symlinks included.
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
    // fsync the containing directory so the rename itself is durable — without
    // it a power/kernel crash can roll the rename back despite ok:true.
    try {
      const dirFd = openSync(dirname(filePath), "r");
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
    } catch { /* dir fsync unsupported on some FSes — best-effort */ }
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
    // (this exact wipe happened once during a cross-vendor audit). Guard on the
    // RETENTION ratio (how much of prior survived), not on additions: a near-
    // total wipe that also adds one token entry is still a wipe. A genuine
    // consolidation keeps most facts (reworded entries still match by content
    // and count as retained) so it retains a high fraction; only a real
    // hallucinated-list wipe drops most of prior. Bypass legitimate hard
    // clears/restores via opts.allowDrastic.
    if (!options.allowDrastic && priorEntries.length >= 10) {
      const FLOOR = 3;
      const retained = priorEntries.length - evictions.length;
      const retentionRatio = retained / priorEntries.length;
      if (newEntries.length < FLOOR || retentionRatio < 0.5) {
        const shrinkErr: SetEntriesErrShrink = {
          ok: false,
          code: "ESUSPECT_SHRINK",
          message: `Refused: op drops ${evictions.length}/${priorEntries.length} prior entries (only ${retained} retained, ${(retentionRatio * 100).toFixed(0)}%; ${additions.length} added). A near-total replacement is blocked as likely-bad output regardless of additions — real curation keeps most facts. Pass allowDrastic for an intentional hard clear/restore.`,
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
  // Entries invalid at read time are excluded from `entries` but REPORTED,
  // never silently swallowed: a set-overwrite computed from `entries` would
  // otherwise erase them with no trace anywhere (the write's dropped_* counts
  // only cover the submission, which by then no longer contains them).
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

// Timestamp-insensitive comparison: serialize stamps last_updated per call.
function stripStamp(s: string): string {
  return s.replace(/^last_updated: .*$/m, "last_updated: X");
}

function countMarkerLines(s: string, marker: string): number {
  return s.split("\n").filter((l) => l.trim() === marker).length;
}

function smokeTest(): number {
  console.log("MemoryWriter smoke test starting…");

  // ── Pure canonical-rebuild fixtures (no filesystem) ──
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
      "FACT: legacy invalid-prefix orphan stays in body ~explicit",
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
    console.error("FAIL: invalid-prefix orphan not preserved in body");
    return 1;
  }
  const s1 = serializeMemoryContent(p1, p1.entries, "smoke");
  const p2 = parseMemoryContent(s1);
  const s2 = serializeMemoryContent(p2, p2.entries, "smoke");
  if (stripStamp(s1) !== stripStamp(s2)) {
    console.error("FAIL: canonical rebuild not idempotent (s1 ≠ s2 modulo timestamp)");
    return 1;
  }
  if (countMarkerLines(s1, BEGIN_MARKER) !== 1 || countMarkerLines(s1, END_MARKER) !== 1) {
    console.error("FAIL: serialized output does not contain exactly one marker pair");
    return 1;
  }
  const crlf = "---\r\nschema_version: 1\r\n---\r\nNAME: Crlf User\r\n";
  const pc = parseMemoryContent(crlf);
  if (pc.entries.length !== 1 || pc.entries[0] !== "NAME: Crlf User") {
    console.error("FAIL: CRLF fixture did not parse to 1 entry");
    return 1;
  }
  const sc = serializeMemoryContent(pc, pc.entries, "smoke");
  if (stripStamp(sc) !== stripStamp(serializeMemoryContent(parseMemoryContent(sc), parseMemoryContent(sc).entries, "smoke"))) {
    console.error("FAIL: CRLF fixture not stable after canonicalization");
    return 1;
  }
  const bare = `NAME: Bare User\n${END_MARKER}\n`;
  const pb = parseMemoryContent(bare);
  if (pb.entries.length !== 1 || pb.frontmatter !== "") {
    console.error("FAIL: frontmatter-less fixture misparsed");
    return 1;
  }
  console.log("  pure fixtures: corrupted/CRLF/frontmatter-less all canonicalize, idempotent");

  // ── Filesystem legs against a temp fixture (never the live files) ──
  const tmpDir = mkdtempSync(join(tmpdir(), "memwriter-smoke-"));
  const testFile = join(tmpDir, "PRINCIPAL_MEMORY.memtest.md");
  writeFileSync(testFile, "---\nschema_version: 1\n---\n\n# Fixture\n\n" + BEGIN_MARKER + "\n" + END_MARKER + "\n", "utf8");
  const writer = "smoke-test";

  // 1. Read initial state (should be empty)
  const r0 = read(testFile);
  if ("code" in r0) {
    console.error(`FAIL: read returned error: ${r0.message}`);
    return 1;
  }
  console.log(`  initial: ${r0.count}/${r0.cap_entries} entries, ${r0.chars_used}/${r0.cap_chars} chars`);

  // 2. Write 3 valid entries + 1 malformed + 1 over-length + 1 dup
  const longStr = "X".repeat(300);
  const submission = [
    "NAME: SmokeTest User",
    "PREFERENCE: Smoke-test prefers terse outputs",
    "RULE: Smoke-test always cleans up after itself",
    "INVALID_PREFIX: this should be dropped",
    `RULE: sneaks in a ${END_MARKER} marker`, // marker-substring: rejected at validate
    `PREFERENCE: ${longStr}`,
    "NAME: SmokeTest User", // duplicate
  ];
  const w1 = setEntries(testFile, submission, { updatedBy: writer });
  if (!w1.ok) {
    console.error(`FAIL: setEntries returned error: ${w1.code} — ${w1.message}`);
    return 1;
  }
  console.log(`  write 1: accepted=${w1.accepted}, dropped_malformed=${w1.dropped_malformed}, dropped_overlength=${w1.dropped_overlength}, dropped_duplicates=${w1.dropped_duplicates}, evictions=${w1.evictions.length}`);
  if (w1.accepted !== 3) {
    console.error(`FAIL: expected 3 accepted, got ${w1.accepted}`);
    return 1;
  }
  if (w1.dropped_malformed !== 2) {
    console.error(`FAIL: expected 2 malformed drops (bad prefix + marker substring), got ${w1.dropped_malformed}`);
    return 1;
  }
  if (w1.dropped_overlength !== 1) {
    console.error(`FAIL: expected 1 overlength drop, got ${w1.dropped_overlength}`);
    return 1;
  }
  if (w1.dropped_duplicates !== 1) {
    console.error(`FAIL: expected 1 dup drop, got ${w1.dropped_duplicates}`);
    return 1;
  }

  // 3. Read back, verify
  const r1 = read(testFile);
  if ("code" in r1) {
    console.error(`FAIL: read after write returned error: ${r1.message}`);
    return 1;
  }
  if (r1.count !== 3) {
    console.error(`FAIL: expected 3 entries on readback, got ${r1.count}`);
    return 1;
  }
  console.log(`  readback: ${r1.count}/${r1.cap_entries} entries, ${r1.chars_used}/${r1.cap_chars} chars`);

  // 4. Set-overwrite with fewer entries (test eviction)
  const w2 = setEntries(testFile, ["NAME: SmokeTest User"], { updatedBy: writer });
  if (!w2.ok) {
    console.error(`FAIL: second write returned error: ${(w2 as any).message}`);
    return 1;
  }
  if (w2.evictions.length !== 2) {
    console.error(`FAIL: expected 2 evictions, got ${w2.evictions.length}`);
    return 1;
  }
  console.log(`  write 2 (set-overwrite with 1 entry): evictions=${w2.evictions.length} ← PREFERENCE + RULE evicted`);

  // 5. Test at-cap error
  const tooMany = Array.from({ length: 49 }, (_, i) => `PREFERENCE: smoke entry ${i}`);
  const w3 = setEntries(testFile, tooMany, { updatedBy: writer });
  if (w3.ok) {
    console.error(`FAIL: expected EAT_CAP error, got success`);
    return 1;
  }
  if (w3.code !== "EAT_CAP") {
    console.error(`FAIL: expected EAT_CAP, got ${w3.code}`);
    return 1;
  }
  console.log(`  write 3 (49 entries): correctly rejected with ${w3.code} — over_count=${w3.over_count}`);

  // 6. Test path rejection
  const w4 = setEntries("/etc/passwd", ["NAME: hacker"], { updatedBy: writer });
  if (w4.ok) {
    console.error(`FAIL: expected EINVAL_PATH for /etc/passwd, got success`);
    return 1;
  }
  if (w4.code !== "EINVAL_PATH") {
    console.error(`FAIL: expected EINVAL_PATH, got ${w4.code}`);
    return 1;
  }
  console.log(`  write 4 (/etc/passwd): correctly rejected with ${w4.code}`);

  // 7. On-disk heal: corrupted fixture converges to canonical in one write, stable in two
  const healFile = join(tmpDir, "HEAL.memtest.md");
  writeFileSync(healFile, corrupted, "utf8");
  const healParsed = parseMemoryContent(readFileSync(healFile, "utf8"));
  const h1 = setEntries(healFile, healParsed.entries, { updatedBy: writer });
  if (!h1.ok) {
    console.error(`FAIL: heal write returned error: ${(h1 as any).message}`);
    return 1;
  }
  const healed1 = readFileSync(healFile, "utf8");
  if (countMarkerLines(healed1, BEGIN_MARKER) !== 1 || countMarkerLines(healed1, END_MARKER) !== 1) {
    console.error("FAIL: healed file does not have exactly one marker pair");
    return 1;
  }
  if (!healed1.includes("FACT: legacy invalid-prefix orphan")) {
    console.error("FAIL: heal dropped the invalid-prefix body orphan");
    return 1;
  }
  const h2 = setEntries(healFile, parseMemoryContent(healed1).entries, { updatedBy: writer });
  if (!h2.ok || stripStamp(readFileSync(healFile, "utf8")) !== stripStamp(healed1)) {
    console.error("FAIL: second heal write not byte-stable (modulo timestamp)");
    return 1;
  }
  console.log(`  heal: corrupted fixture → canonical in one write, stable in two, orphan preserved`);

  // 8. Cleanup — remove the temp fixtures (live files were never touched)
  const w5 = setEntries(testFile, [], { updatedBy: "smoke-test-cleanup" });
  if (!w5.ok) {
    console.error(`FAIL: cleanup write returned error: ${(w5 as any).message}`);
    return 1;
  }
  console.log(`  cleanup: ${w5.new_count} entries remaining (should be 0)`);
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort */ }

  console.log("✓ MemoryWriter smoke test PASSED");
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
