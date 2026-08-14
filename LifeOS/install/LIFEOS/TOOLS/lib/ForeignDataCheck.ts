/**
 * ForeignDataCheck — structural detection of personal/foreign data inside the
 * system repo (~/.claude).
 *
 * Born from the 2026-08-11 lifelog incident: a concurrent session's
 * relative-write bug mirrored an absolute filesystem path INSIDE the repo
 * (LIFEOS/Users/<name>/.../lifelog-monitor-<id>.json) holding personal
 * conversation transcripts. A checkpoint commit then git-tracked the files, and
 * the release cut caught them only because the transcript CONTENT happened to
 * contain a home-path string. This module makes the catch structural: the
 * SHAPE of the path and the SHAPE of the content are each sufficient, no
 * content-string luck required.
 *
 * The invariant enforced across its consumers: the only sanctioned
 * personal-data locations inside ~/.claude are the `LIFEOS/USER/` and
 * `LIFEOS/MEMORY/` symlinks into the private USER_DATA repo
 * (~/.config/LIFEOS/USER). Everything else tracked in ~/.claude is SYSTEM and
 * shippable. Contract: LIFEOS/DOCUMENTATION/SystemUserBoundary.md.
 *
 * Consumers (each an independent layer):
 *   - <your-release-skill>/Tools/UpdateKaiRepo.ts  — GATE 1B, refuses the commit/push
 *   - hooks/CheckpointPerISC.hook.ts          — never stages a foreign path
 *   - <your-release-skill>/Tools/ShadowRelease.ts   — release gate G24 on staging
 *   - LIFEOS/TOOLS/MemorySystem.ts + LIFEOS/PULSE/lib/memory-proposals.ts —
 *     assertInsideUserData() refuses personal writes outside USER_DATA
 *   - ~/.claude/.gitignore carries the same shapes as static patterns
 *
 * Pure and dependency-free beyond node builtins. Path checks are lexical over
 * repo-RELATIVE paths (git output); filesystem checks use lstat/realpath so a
 * symlinked component can never redirect or defeat them.
 */

import { closeSync, existsSync, lstatSync, openSync, readFileSync, readSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve as pathResolve, sep } from "node:path";

// Directory names that exist at an absolute filesystem root (macOS + Linux)
// and therefore appear as path COMPONENTS when a relative-write bug mirrors an
// absolute path into the repo. Case-sensitive on purpose: the bug reproduces
// the exact casing of the real filesystem dir, and case-sensitive matching
// keeps legitimate lowercase code dirs (`src/system/`, `lib/library/`) clean.
export const ABS_MIRROR_SEGMENTS: ReadonlySet<string> = new Set([
  "Users", "home", "private", "var", "tmp", "Volumes", "etc", "opt", "System", "Library",
]);

// Real tracked top-level directories of ~/.claude (git ls-tree HEAD, 2026-08-11).
// Enumerated so a root-level absolute-mirror hit can never flag a legitimate
// repo dir. Currently disjoint from ABS_MIRROR_SEGMENTS — the allowlist is
// belt-and-suspenders for the day a future top-level dir collides.
const REAL_TOP_DIRS: ReadonlySet<string> = new Set([
  ".github", "agents", "backups", "cache", "commands", "hooks", "skills",
  "scratchpad", "teams", "test", "workflows", "Plugins", "LIFEOS",
]);

// Personal-data FILE signatures, matched on the basename only (a directory
// named `_LIFELOG` or a doc named `Granola.md` must never hit). Each entry
// names a known personal-export shape.
const PERSONAL_NAME_SIGNATURES: ReadonlyArray<{ test: (base: string) => boolean; label: string }> = [
  // The export family is `lifelog-<kind>-<id>` — monitor, followup, and any
  // future kind. Keyed to the shape (kind word + id), not to specific kinds, so
  // a new variant can't slip the gate the way `lifelog-followup-<id>` did past a
  // `monitor`/`transcript`-only rule (INC 7.38.4). `Lifelog.md`/`_LIFELOG` don't
  // match — they lack the `-<kind>-<digit>` export shape.
  { test: (b) => /^lifelog-[a-z]+-\d/i.test(b), label: "lifelog export (Bee wearable / followup transcript)" },
  { test: (b) => /lifelog/i.test(b) && /transcript/i.test(b), label: "lifelog transcript export" },
  { test: (b) => /^bee-(conversation|transcript|export|lifelog)/i.test(b), label: "Bee wearable export" },
  { test: (b) => /granola/i.test(b) && /(transcript|export)/i.test(b), label: "Granola meeting export" },
];

export interface ForeignCheckResult {
  foreign: boolean;
  reason?: string;
}

/**
 * Decide whether a repo-relative path inside ~/.claude is FOREIGN — i.e. must
 * never be tracked in the system repo nor ship in a release.
 *
 * Foreign =
 *   (a) an absolute-filesystem-mirror shape: an absolute-fs dirname
 *       (ABS_MIRROR_SEGMENTS) appearing as a DIRECTORY component at the repo
 *       root or anywhere under LIFEOS/ — the relative-write-bug shape; or
 *   (b) a personal-data file signature by basename (lifelog/Bee/Granola
 *       export names).
 *
 * NOT foreign: anything under the `LIFEOS/USER/` or `LIFEOS/MEMORY/` symlink
 * subtrees — that is legitimately USER data and other gates own whether it may
 * appear in a diff at all. The exclusion matches the symlink NAMES at the
 * boundary (compared case-insensitively for APFS), never by resolving them.
 */
export function isForeignToSystemRepo(
  relPath: string,
  opts: { realTopDirs?: ReadonlySet<string> } = {},
): ForeignCheckResult {
  const topDirs = opts.realTopDirs ?? REAL_TOP_DIRS;
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
  if (!norm) return { foreign: false };
  // `git status` reports a fully-untracked directory with a trailing slash
  // (`?? LIFEOS/TOOLS/Users/`) — every segment of such an entry is a directory
  // component, including the last one.
  const isDirEntry = norm.endsWith("/");
  const segs = norm.split("/").filter((s) => s.length > 0 && s !== ".");

  // Sanctioned USER-data subtrees, by symlink name. "USER"/"MEMORY" never
  // collides with the incident's "Users" — different string even case-folded.
  if (segs.length > 1 && segs[0] === "LIFEOS") {
    const second = (segs[1] ?? "").toUpperCase();
    if (second === "USER" || second === "MEMORY") return { foreign: false };
  }

  // (a) absolute-mirror shape at the repo root: first component is an
  // absolute-fs dirname, is a directory component (something under it), and is
  // not a real tracked top-level dir.
  if ((segs.length > 1 || isDirEntry) && ABS_MIRROR_SEGMENTS.has(segs[0]!) && !topDirs.has(segs[0]!)) {
    return {
      foreign: true,
      reason: `absolute-filesystem mirror at repo root: '${segs[0]}/' is an absolute-path dirname, not a system-repo dir (relative-write-bug shape)`,
    };
  }

  // (a) absolute-mirror shape under LIFEOS/: any interior (directory)
  // component that is an absolute-fs dirname. The USER/MEMORY subtrees
  // returned early above.
  if (segs[0] === "LIFEOS") {
    const dirBound = isDirEntry ? segs.length : segs.length - 1;
    for (let i = 1; i < dirBound; i++) {
      if (ABS_MIRROR_SEGMENTS.has(segs[i]!)) {
        return {
          foreign: true,
          reason: `absolute-filesystem mirror under LIFEOS/: '${segs.slice(0, i + 1).join("/")}/' (relative-write-bug shape)`,
        };
      }
    }
  }

  // (b) personal-data file signature by basename.
  const base = segs[segs.length - 1]!;
  for (const sig of PERSONAL_NAME_SIGNATURES) {
    if (sig.test(base)) {
      return { foreign: true, reason: `personal-data filename signature: ${sig.label}` };
    }
  }

  return { foreign: false };
}

// Above this size, JSON.parse is skipped and a bounded head-scan decides. A
// personal transcript this large is still caught (fail-suspicious), just via
// tokens instead of structure.
const TRANSCRIPT_PARSE_CAP_BYTES = 25 * 1024 * 1024;
const TRANSCRIPT_HEAD_SCAN_BYTES = 256 * 1024;

function isUtteranceLike(el: unknown): boolean {
  if (!el || typeof el !== "object" || Array.isArray(el)) return false;
  const o = el as Record<string, unknown>;
  const hasSpeaker = "speaker" in o;
  const hasStamp = "spoken_at" in o || "spokenAt" in o;
  const hasText = typeof o.text === "string";
  // speaker + timestamp is the strong shape; speaker + text alone qualifies
  // only inside a `transcript`-keyed array (see caller) — that pairing is the
  // documented export shape and the key scopes it away from generic fixtures.
  return hasSpeaker && (hasStamp || hasText);
}

function containsTranscriptArray(node: unknown, depth: number): boolean {
  if (depth < 0 || !node || typeof node !== "object") return false;
  if (Array.isArray(node)) {
    // A bare top-level array of utterances only counts with the strong shape
    // (speaker + timestamp) — text alone is too generic without the
    // `transcript` key scoping it.
    return node.slice(0, 5).some((el) => {
      if (!el || typeof el !== "object" || Array.isArray(el)) return false;
      const o = el as Record<string, unknown>;
      return "speaker" in o && ("spoken_at" in o || "spokenAt" in o);
    });
  }
  const obj = node as Record<string, unknown>;
  const t = obj.transcript;
  if (Array.isArray(t) && t.slice(0, 5).some(isUtteranceLike)) return true;
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && containsTranscriptArray(value, depth - 1)) return true;
  }
  return false;
}

/**
 * Content-signature backstop: does this file structurally look like a personal
 * conversation transcript (Bee/Granola export shape — a `transcript` array
 * whose elements carry `speaker` plus `spoken_at`/`text`)?
 *
 * Deliberately independent of any home-path or identity string in the content
 * — this is the check that catches the incident class even when the transcript
 * text mentions nothing identifying. lstat-based: never follows a symlink.
 */
export function looksLikePersonalTranscript(absPath: string): boolean {
  let st;
  try { st = lstatSync(absPath); } catch { return false; }
  if (!st.isFile() || st.size === 0) return false;

  if (st.size > TRANSCRIPT_PARSE_CAP_BYTES) {
    // Too big to parse whole — bounded head-scan for the token triple.
    let head = "";
    try {
      const fd = openSync(absPath, "r");
      try {
        const buf = Buffer.alloc(TRANSCRIPT_HEAD_SCAN_BYTES);
        const n = readSync(fd, buf, 0, buf.length, 0);
        head = buf.subarray(0, n).toString("utf8");
      } finally { closeSync(fd); }
    } catch { return false; }
    return /"transcript"\s*:/.test(head) && /"speaker"\s*:/.test(head)
      && (/"spoken_?[aA]t"\s*:/.test(head) || /"text"\s*:/.test(head));
  }

  let text: string;
  try { text = readFileSync(absPath, "utf8"); } catch { return false; }
  const first = text.trimStart()[0];
  if (first !== "{" && first !== "[") return false;
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return false; }
  return containsTranscriptArray(parsed, 3);
}

/** Canonical USER_DATA repo root — where all personal data physically lives. */
export function userDataRoot(): string {
  return join(homedir(), ".config", "LIFEOS", "USER");
}

/**
 * Assert an absolute write target physically resolves INSIDE the USER_DATA
 * repo. Realpath-based on the deepest existing ancestor, so:
 *   - an intact `~/.claude/LIFEOS/USER` (or MEMORY) symlink resolves into
 *     ~/.config/LIFEOS/USER and passes;
 *   - a broken/replaced symlink (real dir inside ~/.claude) resolves under
 *     ~/.claude and is REFUSED — the write would land in the system tree;
 *   - a missing USER_DATA root refuses (fail-closed): a personal write with
 *     nowhere sanctioned to land must error loudly, never fall back.
 */
export function assertInsideUserData(absTarget: string): { ok: true } | { ok: false; reason: string } {
  let root: string;
  try {
    root = realpathSync(userDataRoot());
  } catch (e: any) {
    return { ok: false, reason: `USER_DATA root unresolvable at ${userDataRoot()} (${e?.message ?? e}) — refusing personal-data write (fail-closed)` };
  }

  let dir = pathResolve(absTarget);
  const tail: string[] = [];
  while (!existsSync(dir)) {
    const parent = dirname(dir);
    if (parent === dir) return { ok: false, reason: `no existing ancestor for ${absTarget}` };
    tail.unshift(basename(dir));
    dir = parent;
  }
  let real: string;
  try {
    real = realpathSync(dir);
  } catch (e: any) {
    return { ok: false, reason: `cannot resolve ${dir} (${e?.message ?? e})` };
  }
  const resolved = tail.length > 0 ? join(real, ...tail) : real;
  if (resolved === root || resolved.startsWith(root + sep)) return { ok: true };
  return {
    ok: false,
    reason: `resolved target ${resolved} is outside the USER_DATA repo (${root}) — personal data must never land in the system tree (SystemUserBoundary.md)`,
  };
}
