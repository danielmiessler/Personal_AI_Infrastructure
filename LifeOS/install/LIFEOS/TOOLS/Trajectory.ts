#!/usr/bin/env bun
/**
 * Trajectory.ts — the session transcript as queryable data.
 *
 * Claude Code already writes the full trajectory of every session to disk as
 * JSONL under ~/.claude/projects/<slugged-cwd>/<session-uuid>.jsonl. That record
 * is the only durable account of what actually happened — which files were
 * touched, which tools failed, what was said and when. Until now the only way to
 * interrogate it was ad-hoc jq. This makes it a first-class deterministic query
 * surface.
 *
 * CLI usage:
 *   bun ~/.claude/LIFEOS/TOOLS/Trajectory.ts sessions [--since <date>]
 *   bun ~/.claude/LIFEOS/TOOLS/Trajectory.ts grep <pattern> [--session <uuid>] [--role user|assistant|tool] [--since <date>] [--limit N] [-i]
 *   bun ~/.claude/LIFEOS/TOOLS/Trajectory.ts tools [--session <uuid>] [--since <date>]
 *   bun ~/.claude/LIFEOS/TOOLS/Trajectory.ts file <path-substring> [--since <date>] [--limit N]
 *
 * Global flags: --json (structured output), --root <dir> (transcript root).
 *
 * Read-only by construction: it opens nothing but `*.jsonl` files beneath the
 * transcript root, makes no network calls, and writes nothing anywhere.
 *
 * Exit codes: 0 on success including empty results, 2 on usage or read errors.
 *
 * Module usage:
 *   import { listSessions, grepTranscripts, toolStats, fileTouches } from './Trajectory'
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { basename, join } from "path";

// ============================================================================
// Types
// ============================================================================

/** One parsed JSONL record. Every field is optional — the format drifts between
 *  Claude Code versions and unknown line types must never be fatal. */
export interface TranscriptLine {
  type?: string;
  uuid?: string;
  timestamp?: string;
  cwd?: string;
  sessionId?: string;
  gitBranch?: string;
  version?: string;
  isSidechain?: boolean;
  aiTitle?: string;
  message?: {
    role?: string;
    model?: string;
    content?: unknown;
  };
  [key: string]: unknown;
}

export interface ContentBlock {
  type?: string;
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
  content?: unknown;
}

/** A transcript file located on disk, before it is read. */
export interface TranscriptFile {
  /** Session uuid, taken from the filename. */
  uuid: string;
  /** Slugged project directory name, e.g. `-home-daniel-Projects-wrenchmark`. */
  project: string;
  path: string;
  mtime: Date;
}

export interface SessionSummary {
  uuid: string;
  project: string;
  path: string;
  /** Earliest timestamp on any line carrying one; null if the file has none. */
  first: string | null;
  last: string | null;
  /** First cwd seen. A session can change directories; `cwds` holds them all. */
  cwd: string | null;
  cwds: string[];
  gitBranch: string | null;
  /** Claude Code's own generated title for the session, when present. */
  title: string | null;
  /** user + assistant lines. Excludes bookkeeping line types. */
  messages: number;
  toolCalls: number;
  /** Lines that failed to parse as JSON and were skipped. */
  skipped: number;
}

export type Role = "user" | "assistant" | "tool";

export interface GrepHit {
  session: string;
  project: string;
  timestamp: string | null;
  role: Role;
  /** Tool name for role=tool hits, else null. */
  tool: string | null;
  /** Which side of a tool exchange matched: "input" or "result". */
  part: string | null;
  text: string;
}

export interface ToolStat {
  name: string;
  count: number;
  failures: number;
}

export type FileAction = "read" | "write" | "edit";

export interface FileTouch {
  session: string;
  project: string;
  timestamp: string | null;
  tool: string;
  action: FileAction;
  path: string;
  /** True when the tool_result for this call came back an error. */
  failed: boolean;
}

export interface QueryOptions {
  root?: string;
  since?: Date | null;
  session?: string | null;
  limit?: number | null;
}

// ============================================================================
// Discovery
// ============================================================================

const HOME = process.env.HOME || "";

/** Default transcript root, overridable for tests and alternate installs. */
export function defaultRoot(): string {
  return process.env.CLAUDE_PROJECTS_DIR || join(HOME, ".claude", "projects");
}

/**
 * Enumerate transcript files: exactly `<root>/<project>/<uuid>.jsonl`, one level
 * deep. Nothing else under the root is opened, which is what keeps this tool
 * away from anything sensitive that happens to share the tree.
 */
export function findTranscripts(root: string = defaultRoot()): TranscriptFile[] {
  if (!existsSync(root)) return [];
  const out: TranscriptFile[] = [];
  for (const project of readdirSync(root)) {
    const dir = join(root, project);
    let entries: string[];
    try {
      if (!statSync(dir).isDirectory()) continue;
      entries = readdirSync(dir);
    } catch {
      continue; // unreadable project dir is not a reason to fail the query
    }
    for (const entry of entries) {
      if (!entry.endsWith(".jsonl")) continue;
      const path = join(dir, entry);
      try {
        const st = statSync(path);
        if (!st.isFile()) continue;
        out.push({ uuid: basename(entry, ".jsonl"), project, path, mtime: st.mtime });
      } catch {
        continue;
      }
    }
  }
  // mtime first so recent work reads last; path breaks ties so the order is stable.
  return out.sort((a, b) => a.mtime.getTime() - b.mtime.getTime() || a.path.localeCompare(b.path));
}

/** Parse a transcript, skipping blank and malformed lines rather than throwing. */
export function readTranscript(path: string): { lines: TranscriptLine[]; skipped: number } {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return { lines: [], skipped: 0 };
  }
  const lines: TranscriptLine[] = [];
  let skipped = 0;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) lines.push(parsed as TranscriptLine);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  return { lines, skipped };
}

// ============================================================================
// Content helpers
// ============================================================================

/** Content is either a bare string or an array of typed blocks, by line type. */
export function contentBlocks(content: unknown): ContentBlock[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (Array.isArray(content)) return content.filter((b) => b && typeof b === "object") as ContentBlock[];
  return [];
}

/** Flatten a tool_result's content, which may be a string or nested blocks. */
export function resultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (typeof b === "string") return b;
        if (b && typeof b === "object") {
          const block = b as ContentBlock;
          if (typeof block.text === "string") return block.text;
          if (block.type === "image") return "[image]";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (content && typeof content === "object") return JSON.stringify(content);
  return "";
}

function parseTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * A session is in range when any of its lines is, but timestamps only appear on
 * message lines. Falling back to mtime keeps timestamp-less files from silently
 * vanishing from a --since query.
 */
function sessionInRange(lines: TranscriptLine[], file: TranscriptFile, since: Date | null): boolean {
  if (!since) return true;
  let sawTimestamp = false;
  for (const line of lines) {
    const t = parseTime(line.timestamp);
    if (!t) continue;
    sawTimestamp = true;
    if (t >= since) return true;
  }
  return sawTimestamp ? false : file.mtime >= since;
}

function matchesSession(file: TranscriptFile, session: string | null | undefined): boolean {
  if (!session) return true;
  return file.uuid === session || file.uuid.startsWith(session);
}

// ============================================================================
// Queries
// ============================================================================

export function listSessions(opts: QueryOptions = {}): SessionSummary[] {
  const root = opts.root ?? defaultRoot();
  const since = opts.since ?? null;
  const out: SessionSummary[] = [];

  for (const file of findTranscripts(root)) {
    if (!matchesSession(file, opts.session)) continue;
    const { lines, skipped } = readTranscript(file.path);
    if (!sessionInRange(lines, file, since)) continue;

    let first: string | null = null;
    let last: string | null = null;
    let title: string | null = null;
    let gitBranch: string | null = null;
    let messages = 0;
    let toolCalls = 0;
    const cwds: string[] = [];

    for (const line of lines) {
      const t = parseTime(line.timestamp);
      if (t) {
        if (!first || t < new Date(first)) first = line.timestamp as string;
        if (!last || t > new Date(last)) last = line.timestamp as string;
      }
      if (typeof line.cwd === "string" && !cwds.includes(line.cwd)) cwds.push(line.cwd);
      if (typeof line.gitBranch === "string" && !gitBranch) gitBranch = line.gitBranch;
      if (line.type === "ai-title" && typeof line.aiTitle === "string") title = line.aiTitle;
      if (line.type === "user" || line.type === "assistant") messages++;
      if (line.type === "assistant") {
        for (const block of contentBlocks(line.message?.content)) {
          if (block.type === "tool_use") toolCalls++;
        }
      }
    }

    out.push({
      uuid: file.uuid,
      project: file.project,
      path: file.path,
      first,
      last,
      cwd: cwds[0] ?? null,
      cwds,
      gitBranch,
      title,
      messages,
      toolCalls,
      skipped,
    });
  }

  return out.sort((a, b) => (a.last ?? "").localeCompare(b.last ?? ""));
}

export function grepTranscripts(
  pattern: RegExp,
  opts: QueryOptions & { role?: Role | null } = {},
): GrepHit[] {
  const root = opts.root ?? defaultRoot();
  const since = opts.since ?? null;
  const role = opts.role ?? null;
  const limit = opts.limit ?? null;
  const hits: GrepHit[] = [];

  for (const file of findTranscripts(root)) {
    if (limit !== null && hits.length >= limit) break;
    if (!matchesSession(file, opts.session)) continue;
    const { lines } = readTranscript(file.path);
    if (!sessionInRange(lines, file, since)) continue;

    // tool_use ids resolve a tool_result back to the tool that produced it.
    const toolNames = new Map<string, string>();
    for (const line of lines) {
      if (line.type !== "assistant") continue;
      for (const block of contentBlocks(line.message?.content)) {
        if (block.type === "tool_use" && block.id && block.name) toolNames.set(block.id, block.name);
      }
    }

    for (const line of lines) {
      if (limit !== null && hits.length >= limit) break;
      if (line.type !== "user" && line.type !== "assistant") continue;
      const ts = parseTime(line.timestamp);
      if (since && ts && ts < since) continue;

      for (const block of contentBlocks(line.message?.content)) {
        if (limit !== null && hits.length >= limit) break;
        const candidates = blockCandidates(line, block, toolNames);
        for (const candidate of candidates) {
          if (limit !== null && hits.length >= limit) break;
          if (role && candidate.role !== role) continue;
          if (!candidate.text) continue;
          pattern.lastIndex = 0;
          if (!pattern.test(candidate.text)) continue;
          hits.push({
            session: file.uuid,
            project: file.project,
            timestamp: (line.timestamp as string) ?? null,
            role: candidate.role,
            tool: candidate.tool,
            part: candidate.part,
            text: excerpt(candidate.text, pattern),
          });
        }
      }
    }
  }

  return hits;
}

interface Candidate {
  role: Role;
  tool: string | null;
  part: string | null;
  text: string;
}

/** Map one content block onto the searchable text it contributes, and to whom. */
function blockCandidates(
  line: TranscriptLine,
  block: ContentBlock,
  toolNames: Map<string, string>,
): Candidate[] {
  if (block.type === "tool_use") {
    return [
      {
        role: "tool",
        tool: block.name ?? null,
        part: "input",
        text: block.input ? JSON.stringify(block.input) : "",
      },
    ];
  }
  if (block.type === "tool_result") {
    return [
      {
        role: "tool",
        tool: (block.tool_use_id && toolNames.get(block.tool_use_id)) ?? null,
        part: "result",
        text: resultText(block.content),
      },
    ];
  }
  if (block.type === "thinking") {
    return [{ role: "assistant", tool: null, part: "thinking", text: block.thinking ?? "" }];
  }
  if (block.type === "text") {
    const role: Role = line.type === "assistant" ? "assistant" : "user";
    return [{ role, tool: null, part: null, text: block.text ?? "" }];
  }
  return [];
}

const EXCERPT_PAD = 60;

/** Return the matching region with surrounding context, on one line. */
export function excerpt(text: string, pattern: RegExp): string {
  pattern.lastIndex = 0;
  const m = pattern.exec(text);
  const flat = text.replace(/\s+/g, " ").trim();
  if (!m) return flat.slice(0, EXCERPT_PAD * 2);
  // Re-find in the flattened text so the window lines up with what is printed.
  pattern.lastIndex = 0;
  const flatMatch = pattern.exec(flat);
  const index = flatMatch ? flatMatch.index : 0;
  const start = Math.max(0, index - EXCERPT_PAD);
  const end = Math.min(flat.length, index + (flatMatch?.[0].length ?? 0) + EXCERPT_PAD);
  return (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "");
}

export function toolStats(opts: QueryOptions = {}): ToolStat[] {
  const root = opts.root ?? defaultRoot();
  const since = opts.since ?? null;
  const counts = new Map<string, ToolStat>();

  for (const file of findTranscripts(root)) {
    if (!matchesSession(file, opts.session)) continue;
    const { lines } = readTranscript(file.path);
    if (!sessionInRange(lines, file, since)) continue;

    const toolNames = new Map<string, string>();
    for (const line of lines) {
      if (line.type !== "assistant") continue;
      const ts = parseTime(line.timestamp);
      if (since && ts && ts < since) continue;
      for (const block of contentBlocks(line.message?.content)) {
        if (block.type !== "tool_use" || !block.name) continue;
        if (block.id) toolNames.set(block.id, block.name);
        const stat = counts.get(block.name) ?? { name: block.name, count: 0, failures: 0 };
        stat.count++;
        counts.set(block.name, stat);
      }
    }

    // Failures live on the user-side tool_result, which only names the call by id.
    for (const line of lines) {
      if (line.type !== "user") continue;
      for (const block of contentBlocks(line.message?.content)) {
        if (block.type !== "tool_result" || block.is_error !== true) continue;
        const name = block.tool_use_id ? toolNames.get(block.tool_use_id) : undefined;
        if (!name) continue;
        const stat = counts.get(name);
        if (stat) stat.failures++;
      }
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/**
 * Tools that name a file in their input, and what they do to it. Bash is
 * deliberately excluded: a shell command that touches a file is not reliably
 * distinguishable from one that merely mentions a path, and guessing would put
 * fiction in an evidence tool. Use `grep` for shell archaeology.
 */
const FILE_TOOLS: Record<string, FileAction> = {
  Read: "read",
  NotebookRead: "read",
  Write: "write",
  Edit: "edit",
  MultiEdit: "edit",
  NotebookEdit: "edit",
};

const PATH_KEYS = ["file_path", "notebook_path", "filePath", "path"];

/** Pull every path out of a tool input, tolerating both scalar and list forms. */
export function pathsFromInput(input: Record<string, unknown> | undefined): string[] {
  if (!input) return [];
  const out: string[] = [];
  for (const key of PATH_KEYS) {
    const value = input[key];
    if (typeof value === "string" && value) out.push(value);
  }
  const files = input.files;
  if (Array.isArray(files)) {
    for (const f of files) if (typeof f === "string" && f) out.push(f);
  }
  return [...new Set(out)];
}

export function fileTouches(needle: string, opts: QueryOptions = {}): FileTouch[] {
  const root = opts.root ?? defaultRoot();
  const since = opts.since ?? null;
  const limit = opts.limit ?? null;
  const target = needle.toLowerCase();
  const touches: FileTouch[] = [];

  for (const file of findTranscripts(root)) {
    if (limit !== null && touches.length >= limit) break;
    if (!matchesSession(file, opts.session)) continue;
    const { lines } = readTranscript(file.path);
    if (!sessionInRange(lines, file, since)) continue;

    const failed = new Set<string>();
    for (const line of lines) {
      if (line.type !== "user") continue;
      for (const block of contentBlocks(line.message?.content)) {
        if (block.type === "tool_result" && block.is_error === true && block.tool_use_id) {
          failed.add(block.tool_use_id);
        }
      }
    }

    for (const line of lines) {
      if (limit !== null && touches.length >= limit) break;
      if (line.type !== "assistant") continue;
      const ts = parseTime(line.timestamp);
      if (since && ts && ts < since) continue;
      for (const block of contentBlocks(line.message?.content)) {
        if (limit !== null && touches.length >= limit) break;
        if (block.type !== "tool_use" || !block.name) continue;
        const action = FILE_TOOLS[block.name];
        if (!action) continue;
        for (const path of pathsFromInput(block.input)) {
          if (!path.toLowerCase().includes(target)) continue;
          touches.push({
            session: file.uuid,
            project: file.project,
            timestamp: (line.timestamp as string) ?? null,
            tool: block.name,
            action,
            path,
            failed: block.id ? failed.has(block.id) : false,
          });
          if (limit !== null && touches.length >= limit) break;
        }
      }
    }
  }

  return touches;
}

// ============================================================================
// Rendering
// ============================================================================

export function renderTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return "";
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const line = (cells: string[]) =>
    cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join("  ").trimEnd();
  return [line(headers), line(widths.map((w) => "─".repeat(w))), ...rows.map(line)].join("\n");
}

function shortTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tilde(path: string | null): string {
  if (!path) return "-";
  return HOME && path.startsWith(HOME) ? "~" + path.slice(HOME.length) : path;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// ============================================================================
// CLI
// ============================================================================

const USAGE = `Trajectory — query Claude Code session transcripts.

  trajectory sessions [--since <date>] [--session <uuid>]
  trajectory grep <pattern> [--session <uuid>] [--role user|assistant|tool] [--since <date>] [--limit N] [-i]
  trajectory tools [--session <uuid>] [--since <date>]
  trajectory file <path-substring> [--since <date>] [--limit N]

  --json          structured output instead of a table
  --root <dir>    transcript root (default ~/.claude/projects)
  -i              case-insensitive pattern (grep only)

  --since takes 48h / 7d, a local calendar date (2026-08-13), or a full ISO timestamp.

Pattern is a JavaScript regular expression. Read-only; makes no network calls.`;

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const valued = new Set(["since", "session", "role", "limit", "root"]);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-i") {
      flags.i = true;
    } else if (arg.startsWith("--")) {
      const [name, inline] = splitFlag(arg.slice(2));
      if (valued.has(name)) {
        const value = inline ?? argv[++i];
        if (value === undefined) throw new UsageError(`--${name} needs a value`);
        flags[name] = value;
      } else {
        flags[name] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command: positional.shift() ?? "", positional, flags };
}

function splitFlag(body: string): [string, string | undefined] {
  const eq = body.indexOf("=");
  return eq === -1 ? [body, undefined] : [body.slice(0, eq), body.slice(eq + 1)];
}

class UsageError extends Error {}

/**
 * Accepts a relative window (`48h`, `7d`, matching WorkSweep's --since), a bare
 * calendar date, or a full ISO timestamp.
 *
 * A bare `2026-08-13` is deliberately read as LOCAL midnight, not UTC. `new
 * Date("2026-08-13")` yields UTC midnight, which on a UTC-7 machine silently
 * pulls in the previous evening's sessions — and since output renders in local
 * time, the table would show rows dated before the cutoff. Timestamps in the
 * transcript are UTC and compare correctly either way; only the cutoff's
 * intent needs pinning.
 */
export function parseSince(raw: string, now: Date = new Date()): Date {
  const relative = /^(\d+)([hd])$/.exec(raw.trim());
  if (relative) {
    const n = Number(relative[1]);
    const ms = relative[2] === "h" ? 3_600_000 : 86_400_000;
    return new Date(now.getTime() - n * ms);
  }
  const bareDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (bareDate) {
    const d = new Date(Number(bareDate[1]), Number(bareDate[2]) - 1, Number(bareDate[3]));
    if (Number.isNaN(d.getTime())) throw new UsageError(`unparseable date: ${raw}`);
    return d;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new UsageError(`unparseable date: ${raw}`);
  return d;
}

function requireDate(raw: string | boolean | undefined): Date | null {
  if (raw === undefined) return null;
  if (typeof raw !== "string") throw new UsageError("--since needs a date");
  return parseSince(raw);
}

function requireLimit(raw: string | boolean | undefined): number | null {
  if (raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new UsageError(`--limit must be a positive integer, got ${raw}`);
  return n;
}

function optString(raw: string | boolean | undefined): string | null {
  return typeof raw === "string" ? raw : null;
}

export function run(argv: string[]): { out: string; code: number } {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    return { out: `${(err as Error).message}\n\n${USAGE}`, code: 2 };
  }

  const { command, positional, flags } = parsed;
  if (!command || flags.help) return { out: USAGE, code: command ? 0 : 2 };

  try {
    const opts: QueryOptions = {
      root: optString(flags.root) ?? undefined,
      since: requireDate(flags.since),
      session: optString(flags.session),
      limit: requireLimit(flags.limit),
    };
    const json = flags.json === true;

    switch (command) {
      case "sessions":
        return { out: renderSessions(listSessions(opts), json), code: 0 };

      case "grep": {
        const raw = positional[0];
        if (!raw) throw new UsageError("grep needs a pattern");
        const role = optString(flags.role);
        if (role && role !== "user" && role !== "assistant" && role !== "tool") {
          throw new UsageError(`--role must be user, assistant or tool, got ${role}`);
        }
        let pattern: RegExp;
        try {
          pattern = new RegExp(raw, flags.i === true ? "i" : "");
        } catch (err) {
          throw new UsageError(`invalid pattern: ${(err as Error).message}`);
        }
        const hits = grepTranscripts(pattern, { ...opts, role: role as Role | null });
        return { out: renderGrep(hits, json), code: 0 };
      }

      case "tools":
        return { out: renderTools(toolStats(opts), json), code: 0 };

      case "file": {
        const needle = positional[0];
        if (!needle) throw new UsageError("file needs a path substring");
        return { out: renderFiles(fileTouches(needle, opts), json), code: 0 };
      }

      default:
        throw new UsageError(`unknown command: ${command}`);
    }
  } catch (err) {
    if (err instanceof UsageError) return { out: `${err.message}\n\n${USAGE}`, code: 2 };
    return { out: `trajectory: ${(err as Error).message}`, code: 2 };
  }
}

function renderSessions(sessions: SessionSummary[], json: boolean): string {
  if (json) return JSON.stringify(sessions, null, 2);
  if (sessions.length === 0) return "no sessions";
  const rows = sessions.map((s) => [
    s.uuid,
    shortTime(s.first),
    shortTime(s.last),
    String(s.messages),
    String(s.toolCalls),
    truncate(tilde(s.cwd), 34),
    truncate(s.title ?? "-", 44),
  ]);
  const table = renderTable(["SESSION", "FIRST", "LAST", "MSGS", "TOOLS", "CWD", "TITLE"], rows);
  return `${table}\n\n${sessions.length} session(s)`;
}

function renderGrep(hits: GrepHit[], json: boolean): string {
  if (json) return JSON.stringify(hits, null, 2);
  if (hits.length === 0) return "no matches";
  const rows = hits.map((h) => [
    shortTime(h.timestamp),
    h.session.slice(0, 8),
    h.tool ? `${h.role}:${h.tool}` : h.role,
    truncate(h.text, 120),
  ]);
  const table = renderTable(["WHEN", "SESSION", "ROLE", "MATCH"], rows);
  return `${table}\n\n${hits.length} match(es)`;
}

function renderTools(stats: ToolStat[], json: boolean): string {
  if (json) return JSON.stringify(stats, null, 2);
  if (stats.length === 0) return "no tool calls";
  const rows = stats.map((s) => [s.name, String(s.count), String(s.failures)]);
  const total = stats.reduce((n, s) => n + s.count, 0);
  const failed = stats.reduce((n, s) => n + s.failures, 0);
  const table = renderTable(["TOOL", "CALLS", "FAILURES"], rows);
  return `${table}\n\n${total} call(s), ${failed} failure(s)`;
}

function renderFiles(touches: FileTouch[], json: boolean): string {
  if (json) return JSON.stringify(touches, null, 2);
  if (touches.length === 0) return "no file touches";
  const rows = touches.map((t) => [
    shortTime(t.timestamp),
    t.session.slice(0, 8),
    t.action + (t.failed ? " (failed)" : ""),
    t.tool,
    truncate(tilde(t.path), 80),
  ]);
  const table = renderTable(["WHEN", "SESSION", "ACTION", "TOOL", "PATH"], rows);
  return `${table}\n\n${touches.length} touch(es)`;
}

if (import.meta.main) {
  const { out, code } = run(process.argv.slice(2));
  if (out) console.log(out);
  process.exit(code);
}
