/**
 * SessionRoots — where recall finds harness session transcripts, and how to read them.
 *
 * Each harness writes transcripts in its own layout and line format. A session root
 * pairs a directory with a read-only parser that turns one transcript into
 * `{ sessionId, cwd, timestamp, text }` turns, so ContextSearch can rank sessions
 * from any harness the same way. Claude Code is the default root; other harnesses
 * are opt-in through `[cortex] session_roots` in LIFEOS_CONFIG.toml:
 *
 *   [cortex]
 *   session_roots = [
 *     { harness = "claude", dir = "~/.claude/projects" },
 *     { harness = "codex",  dir = "~/.codex/sessions" },
 *   ]
 *
 * Setting the key replaces the default list, so keep the claude entry when adding one.
 * Adding a harness means adding a parser to PARSERS. Parsers never write.
 */
import { openSync, readSync, closeSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const HOME = homedir();

/** Where a transcript ran. */
export interface SessionHead {
  sessionId: string;
  cwd: string | null;
  timestamp: Date | null;
}

/** One human turn from a transcript. */
export interface SessionTurn extends SessionHead {
  text: string;
}

export interface SessionParser {
  harness: string;
  /**
   * Regex (ripgrep syntax) that every line holding a human turn matches. Callers use it
   * to pull candidate lines out with ripgrep instead of reading whole transcripts, which
   * run to hundreds of MB. Keep it tight: a loose marker also pulls in multi-MB lines.
   */
  turnPattern: string;
  /**
   * Turn lines longer than this are skipped when extracting snippets. For stores where
   * user messages can carry inline images: a few such lines otherwise cost gigabytes.
   */
  maxTurnLineBytes?: number;
  /** Session identity from the start of the file, or null to skip the transcript. */
  head(path: string): SessionHead | null;
  /** Human turns, in file order, from transcript lines (whole file or pre-filtered). */
  turns(lines: string[], head: SessionHead): Iterable<SessionTurn>;
  /**
   * Transcripts to read for project discovery. Defaults to every transcript; a harness
   * that already groups transcripts by working directory can return one per group.
   */
  discoveryFiles?(dir: string): string[];
}

export interface SessionRoot {
  harness: string;
  dir: string;
  parser: SessionParser;
}

/** Read up to `bytes` from the start of a file. */
function readHead(path: string, bytes: number): string {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const n = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, n).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

/** First line of a file, reading more only when the line is longer than expected. */
function readFirstLine(path: string, max = 1_048_576): string {
  for (let bytes = 65_536; ; bytes *= 4) {
    const text = readHead(path, Math.min(bytes, max));
    const nl = text.indexOf("\n");
    if (nl !== -1) return text.slice(0, nl);
    if (bytes >= max || text.length < bytes) return text;
  }
}

function parseLine(ln: string): any {
  try { return JSON.parse(ln); } catch { return null; }
}

function toDate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function uuidFromPath(path: string): string {
  return (path.split("/").pop() ?? path).replace(/\.jsonl$/, "");
}

/**
 * Claude Code: `<root>/<cwd-slug>/<uuid>.jsonl`, one JSON event per line. Human turns
 * are `type: "user"` events; tool results share that type and carry no text blocks.
 */
const claude: SessionParser = {
  harness: "claude",
  turnPattern: '"type":"user"',
  // The session time is the first user event's timestamp. That event can sit behind
  // large snapshot lines, so read up to 1 MB before falling back to the file mtime.
  head(path) {
    const text = readHead(path, 16_384);
    const m = text.match(/"cwd"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    let cwd: string | null = null;
    if (m) { try { cwd = JSON.parse(`"${m[1]}"`); } catch {} }
    const firstUserTime = (t: string): Date | null => {
      for (const ln of t.split("\n")) {
        if (!ln.includes('"type":"user"')) continue;
        const j = parseLine(ln);
        const d = j?.type === "user" ? toDate(j.timestamp) : null;
        if (d) return d;
      }
      return null;
    };
    let timestamp = firstUserTime(text);
    if (!timestamp) timestamp = firstUserTime(readHead(path, 1_048_576));
    return { sessionId: uuidFromPath(path), cwd, timestamp };
  },
  *turns(lines, head) {
    for (const ln of lines) {
      const j = parseLine(ln);
      if (j?.type !== "user") continue;
      const c = j?.message?.content;
      let t = "";
      if (typeof c === "string") t = c;
      else if (Array.isArray(c)) for (const p of c) if (p?.type === "text") t += " " + (p.text ?? "");
      yield { ...head, cwd: typeof j.cwd === "string" ? j.cwd : head.cwd, timestamp: toDate(j.timestamp), text: t.trim() };
    }
  },
  // One transcript dir per cwd, so the newest transcript in each dir is enough.
  discoveryFiles(dir) {
    const out: string[] = [];
    let subdirs;
    try { subdirs = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return out; }
    for (const s of subdirs) {
      const d = join(dir, s.name);
      let newest: { path: string; mtime: number } | null = null;
      try {
        for (const f of readdirSync(d)) {
          if (!f.endsWith(".jsonl")) continue;
          const p = join(d, f);
          const mt = statSync(p).mtimeMs;
          if (!newest || mt > newest.mtime) newest = { path: p, mtime: mt };
        }
      } catch { continue; }
      if (newest) out.push(newest.path);
    }
    return out;
  },
};

/**
 * Codex: `<root>/<yyyy>/<mm>/<dd>/rollout-*.jsonl`. Line 0 is `session_meta` (id, cwd,
 * start time); it embeds the base instructions, so it runs to tens of KB. Human turns
 * are `response_item` messages with `role: "user"`. Codex injects the AGENTS.md body
 * and `<environment_context>`-style blocks through the same channel before the human
 * speaks; those are dropped, since used as a snippet they make every session in a repo
 * look identical. Subagent rollouts (guardian reviews, spawned workers) carry
 * `source.subagent` and are skipped: they are machine turns about a parent session,
 * and unfiltered they outnumber real ones.
 */
const codex: SessionParser = {
  harness: "codex",
  // Near the line start only: `compacted` lines embed the whole history (user messages
  // included) and run to tens of MB. Field order varies by Codex version (`ordinal`,
  // `id` come and go), hence the bounded gaps instead of an exact prefix.
  turnPattern: '^.{0,120}"type":"response_item","payload":\\{"type":"message",.{0,120}"role":"user"',
  // User messages carry pasted screenshots as inline base64 (1-2 MB per line).
  maxTurnLineBytes: 262_144,
  head(path) {
    const j = parseLine(readFirstLine(path));
    if (j?.type !== "session_meta") return null;
    const p = j.payload ?? {};
    if (p?.source && typeof p.source === "object" && p.source.subagent) return null;
    const sessionId = typeof p.id === "string" ? p.id : uuidFromPath(path);
    return { sessionId, cwd: typeof p.cwd === "string" ? p.cwd : null, timestamp: toDate(p.timestamp ?? j.timestamp) };
  },
  *turns(lines, head) {
    for (const ln of lines) {
      const j = parseLine(ln);
      const p = j?.payload;
      if (j?.type !== "response_item" || p?.type !== "message" || p?.role !== "user") continue;
      let t = "";
      for (const c of p.content ?? []) if (typeof c?.text === "string") t += " " + c.text;
      t = t.trim();
      if (t.startsWith("# AGENTS.md instructions")) continue;
      yield { ...head, timestamp: toDate(j.timestamp), text: t };
    }
  },
};

export const PARSERS: Record<string, SessionParser> = { claude, codex };

function expandHome(p: string): string {
  if (p === "~") return HOME;
  if (p.startsWith("~/")) return resolve(HOME, p.slice(2));
  return p;
}

let cached: SessionRoot[] | null = null;

/**
 * Configured roots, or Claude alone. Reads LIFEOS_CONFIG.toml directly rather than through
 * LifeosConfig.ts, because that loader throws when identity fields are missing and recall
 * must keep working on a half-configured install.
 */
export function sessionRoots(): SessionRoot[] {
  if (cached) return cached;
  cached = [{ harness: "claude", dir: join(HOME, ".claude", "projects"), parser: claude }];
  const path = process.env.LIFEOS_CONFIG_PATH ?? join(HOME, ".claude", "LIFEOS", "USER", "CONFIG", "LIFEOS_CONFIG.toml");
  let raw: any;
  try { raw = require(path); } catch { return cached; }
  const list = raw?.cortex?.session_roots;
  if (!Array.isArray(list)) return cached;
  const roots: SessionRoot[] = [];
  for (const e of list) {
    const parser = PARSERS[e?.harness];
    if (!parser || typeof e?.dir !== "string") {
      console.error(`ContextSearch: skipping session root ${JSON.stringify(e)} (known harnesses: ${Object.keys(PARSERS).join(", ")})`);
      continue;
    }
    roots.push({ harness: parser.harness, dir: expandHome(e.dir), parser });
  }
  return (cached = roots);
}

/** Every .jsonl under a root, at any depth. */
export function transcriptFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".jsonl")) out.push(p);
    }
  };
  walk(dir);
  return out;
}
