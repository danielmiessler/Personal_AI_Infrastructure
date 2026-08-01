/**
 * Projects Pulse module — read-only surface over the project source files. Holds
 * ZERO data: parses the USER files on every request and serves them grouped by
 * source. Edit a source file → the view changes with no code change and no rebuild.
 *
 * Route: GET /api/projects → { count, source, generatedAt, projects, groups }
 *   - Top-level count/source/projects mirror the "live" group (back-compat).
 *   - groups: one entry per source — live apps (PROJECTS.md), TELOS projects
 *     (TELOS.md ## Projects), retired (PROJECTS_RETIRED.md).
 *
 * Data/code separation: no project name, path, URL, or stack is hardcoded here.
 * Every field is derived from the markdown at request time.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MODULE_NAME = "projects";
const USER_DIR = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "LIFEOS", "USER");
const PROJECTS_PATH = join(USER_DIR, "PROJECTS.md");

/** Every project source Pulse knows about — one tab each on the dashboard. */
const SOURCES: { key: string; label: string; path: string; source: string; kind: "table" | "telos" }[] = [
  { key: "live", label: "Live Apps", path: PROJECTS_PATH, source: "USER/PROJECTS.md", kind: "table" },
  { key: "telos", label: "TELOS", path: join(USER_DIR, "TELOS", "TELOS.md"), source: "USER/TELOS/TELOS.md § Projects", kind: "telos" },
  { key: "retired", label: "Retired", path: join(USER_DIR, "PROJECTS_RETIRED.md"), source: "USER/PROJECTS_RETIRED.md", kind: "table" },
];
const state = { running: false };

export type Badge =
  | "system-of-record"
  | "sensitive"
  | "in-design"
  | "decommissioned"
  | "concept";

export interface Project {
  name: string; // clean display name (markup, emoji, status stripped)
  rawName: string; // original first-cell text
  path: string; // local path, backticks stripped
  url: string; // display text of the URL cell
  href: string | null; // real https:// link, or null when not a URL ("—", notes)
  deploy: string; // deploy command/text, backticks stripped
  stack: string; // stack / description
  badges: Badge[]; // derived status flags
  openSession: boolean; // has a matching "Open Sessions to Resume" row
}

// ── Cell helpers ─────────────────────────────────────────────────────────────

const stripBackticks = (s: string) => s.replace(/`/g, "").trim();

/**
 * Split a markdown table row `| a | b | c |` into trimmed cell strings. Splits
 * only on UNESCAPED pipes — deploy commands legitimately contain `\|` (e.g.
 * `grep … \| xargs`, `curl … \| sh`), which markdown escapes; those stay in the
 * cell and are unescaped back to a literal `|`.
 */
function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return inner.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

/** A `|---|:--:|` style separator row (only dashes, colons, pipes, spaces). */
const isSeparator = (line: string) => /^\|[\s:|-]+\|?\s*$/.test(line.trim()) && line.includes("-");

/** Derive status badges from any cell text (name usually carries the flags). */
function deriveBadges(...cells: string[]): Badge[] {
  const hay = cells.join(" ");
  const low = hay.toLowerCase();
  const badges: Badge[] = [];
  if (hay.includes("🎯")) badges.push("system-of-record");
  if (hay.includes("🚨")) badges.push("sensitive");
  if (/\bin[\s-]?design\b/.test(low)) badges.push("in-design");
  if (/\bdecommissioned\b/.test(low)) badges.push("decommissioned");
  if (/\bconcept\b/.test(low)) badges.push("concept");
  return badges;
}

/**
 * Clean a project name cell into its display name. When the cell has a bold span
 * (`**Name** …trailing descriptor…`), the bold content is the name — trailing
 * flag text ("system of record", "HIGHLY SENSITIVE") is descriptor, not name.
 * Falls back to cleaning the whole cell when there's no bold markup.
 */
function cleanName(raw: string): string {
  const bold = raw.match(/\*\*(.+?)\*\*/);
  let s = bold ? bold[1] : raw;
  s = s.replace(/\*\*/g, "").replace(/__/g, ""); // stray bold
  s = s.replace(/_\((?:in design|decommissioned|concept)\)_/gi, ""); // italic status
  s = s.replace(/\((?:in design|decommissioned|concept)\)/gi, "");
  s = s.replace(/[🎯🚨🚧🔧✅🚀]/gu, ""); // status emoji
  s = s.replace(/_([^_]+)_/g, "$1"); // any remaining italic wrap
  return s.replace(/\s+/g, " ").trim();
}

/** Extract the first real https(s) href from a URL cell, or null. */
function deriveHref(urlCell: string): string | null {
  const cell = urlCell.trim();
  if (!cell || cell === "—" || cell === "-") return null;
  // ~~struck-through~~ URL = dead infra (retired rows) — never link it.
  if (/^~~/.test(cell)) return null;
  // Already a full URL?
  const full = cell.match(/https?:\/\/[^\s)]+/i);
  if (full) return full[0];
  // A bare domain / host[:port][/path] token — first one wins.
  const domain = cell.match(/\b((?:[a-z0-9-]+\.)+[a-z]{2,}|localhost)(?::\d+)?(?:\/[^\s),]*)?/i);
  if (!domain) return null;
  const host = domain[0];
  const scheme = /^localhost(?::|\/|$)/i.test(host) ? "http://" : "https://";
  return scheme + host;
}

/** Collect the normalized leading labels of every Open Session row. */
function openSessionLabels(md: string): string[] {
  const labels: string[] = [];
  const m = md.match(/##\s+Open Sessions to Resume[\s\S]*?(?=\n##\s|\n#\s|$)/);
  if (!m) return labels;
  for (const raw of m[0].split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim().startsWith("|") || isSeparator(line)) continue;
    const cells = splitRow(line);
    if (cells.length < 2 || /^project$/i.test(cells[0])) continue; // header
    const name = cleanName(cells[0]);
    if (name) labels.push(name.toLowerCase());
  }
  return labels;
}

/**
 * A project has an open session when a session label equals its name OR begins
 * with its name followed by a word boundary. Session rows are verbose descriptors
 * ("The Real Internet of Things (book site)", "Surface category lockdown"), so the
 * project name is a PREFIX of the label — exact-only matching under-counts.
 */
function hasOpenSession(name: string, labels: string[]): boolean {
  const n = name.toLowerCase();
  return labels.some((l) => l === n || l.startsWith(n + " ") || l.startsWith(n + ":"));
}

// ── Parser (pure, exported for tests) ────────────────────────────────────────

export function parseProjects(md: string): Project[] {
  const lines = md.split("\n");
  const projects: Project[] = [];
  const sessionLabels = openSessionLabels(md);

  // Find the main projects table header: a row naming Project + Deploy. The last
  // column has been renamed over time (Stack → ISA / detail), so don't pin it.
  let i = 0;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim().startsWith("|") && /\bProject\b/i.test(l) && /\bDeploy\b/i.test(l)) {
      break;
    }
  }
  if (i >= lines.length) return projects; // no table found
  i++; // move past header row

  for (; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, "");
    if (!line.trim().startsWith("|")) break; // table ended
    if (isSeparator(line)) continue;
    const cells = splitRow(line);
    if (cells.length < 5) continue;
    const [rawName, pathCell, urlCell, deployCell, ...rest] = cells;
    const stackCell = rest.join(" | "); // rejoin any stray pipes inside stack prose
    const name = cleanName(rawName);
    if (!name) continue;
    projects.push({
      name,
      rawName: rawName.trim(),
      path: stripBackticks(pathCell),
      url: urlCell.replace(/\*\*/g, "").replace(/~~/g, "").trim(),
      href: deriveHref(urlCell),
      deploy: stripBackticks(deployCell),
      stack: stackCell.replace(/\*\*/g, "").trim(),
      badges: deriveBadges(rawName, urlCell, stackCell),
      openSession: hasOpenSession(name, sessionLabels),
    });
  }
  return projects;
}

/**
 * Parse the `## Projects` section of TELOS.md — prose lines (optionally bulleted),
 * one project per non-empty line. These carry no path/URL/deploy; the whole line
 * is the project statement.
 */
export function parseTelosProjects(md: string): Project[] {
  // (?![\s\S]) = true end-of-string (with /m, $ would match every line end and
  // starve the lazy capture down to nothing).
  const m = md.match(/^##\s+Projects\b[^\n]*\n([\s\S]*?)(?=\n##\s|(?![\s\S]))/m);
  if (!m) return [];
  const projects: Project[] = [];
  for (const raw of m[1].split("\n")) {
    let line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("<!--")) continue;
    line = line.replace(/^[-*]\s+/, ""); // tolerate bulleted form
    const name = cleanName(line);
    if (!name) continue;
    projects.push({
      name,
      rawName: raw.trim(),
      path: "",
      url: "",
      href: null,
      deploy: "",
      stack: "",
      badges: [],
      openSession: false,
    });
  }
  return projects;
}

// ── Module contract ──────────────────────────────────────────────────────────

interface Group {
  key: string;
  label: string;
  source: string;
  count: number;
  projects: Project[];
  /** Drift signal: source file exists with content but nothing parsed. */
  error?: string;
}

interface ReadResult {
  count: number;
  source: string;
  generatedAt: string;
  projects: Project[];
  groups: Group[];
  error?: string;
}

/** Parse one source file into its group. Fail-soft: never throws. */
function readGroup(src: (typeof SOURCES)[number]): Group {
  const base = { key: src.key, label: src.label, source: src.source };
  try {
    if (!existsSync(src.path)) return { ...base, count: 0, projects: [], error: `${src.source} not found` };
    const md = readFileSync(src.path, "utf8");
    const projects = src.kind === "telos" ? parseTelosProjects(md) : parseProjects(md);
    const group: Group = { ...base, count: projects.length, projects };
    // Drift signal: file has content but nothing parsed → heading/format changed.
    if (projects.length === 0 && md.trim().length > 0) {
      group.error = `${src.source} present but no projects parsed — source format drifted`;
      console.warn(`[${MODULE_NAME}] ${group.error}`);
    }
    return group;
  } catch (err) {
    console.warn(`[${MODULE_NAME}] failed to read/parse ${src.source}: ${String(err)}`);
    return { ...base, count: 0, projects: [], error: String(err) };
  }
}

/**
 * Read + parse every source. Fail-soft per group; top-level fields mirror the
 * "live" group so pre-groups consumers keep working.
 */
function read(): ReadResult {
  const generatedAt = new Date().toISOString();
  const groups = SOURCES.map(readGroup);
  const live = groups.find((g) => g.key === "live") ?? groups[0];
  return {
    count: live.count,
    source: live.source,
    generatedAt,
    projects: live.projects,
    groups,
    ...(live.error ? { error: live.error } : {}),
  };
}

export async function start(): Promise<void> {
  state.running = true;
  console.log(`[${MODULE_NAME}] started`);
}
export async function stop(): Promise<void> {
  state.running = false;
}
export function health(): { status: string; details?: Record<string, unknown> } {
  if (!state.running) return { status: "stopped" };
  // Parse-drift is DEGRADED, not healthy-with-zero: a renamed column once zeroed
  // the page for a week while health stayed green (2026-07-19 incident).
  let counts: Record<string, number> = {};
  let drift: string[] = [];
  try {
    const r = read();
    counts = Object.fromEntries(r.groups.map((g) => [g.key, g.count]));
    drift = r.groups.filter((g) => g.error).map((g) => g.error!);
  } catch {
    /* ignore */
  }
  return {
    status: drift.length > 0 ? "degraded" : "healthy",
    details: { ...counts, ...(drift.length ? { drift } : {}) },
  };
}
export async function handleRequest(_req: Request, pathname: string): Promise<Response | null> {
  const sub = pathname.replace(/^\/api\/projects/, "") || "/";
  if (sub === "/" || sub === "/list") return Response.json(read());
  if (sub === "/status" || sub === "/health") return Response.json(health());
  return null;
}
