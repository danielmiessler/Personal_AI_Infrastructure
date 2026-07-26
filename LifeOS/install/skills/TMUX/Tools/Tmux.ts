#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

type FlagValue = string | boolean;
type ParsedArgs = {
  positionals: string[];
  flags: Record<string, FlagValue>;
};

type ExecResult = {
  code: number;
  stdout: string;
  stderr: string;
};

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue | undefined };

type HostConfig = {
  name: string;
  ssh: string;
};

type PaneGeometry = {
  id: string;
  title: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

type TrackedPane = {
  id: string;
  role: string;
};

type TrackedSession = {
  id: string;
  name: string;
  socket: string;
  generation: string;
  kind: string;
  createdAt: string;
  windows: string[];
  panes: TrackedPane[];
};

type ToolState = {
  version: 1;
  sessions: TrackedSession[];
  buffers: string[];
};

type Confidence = "definitive" | "strong" | "weak";
type PaneStateName = "done" | "failed" | "working" | "idle" | "awaiting-input";

type PaneSignals = {
  exit: { present: boolean; dead: boolean; status: string; state?: PaneStateName };
  process: { present: boolean; descendants: number; state?: PaneStateName };
  screen: { present: boolean; state?: PaneStateName };
};

type MonitorPane = {
  id: string;
  session: string;
  window: string;
  title: string;
  state: PaneStateName;
  confidence: Confidence;
  signals: PaneSignals;
  disagreements: string[];
  currentCommand: string;
  commandResolvedOneLevelOnly: true;
  textTail: string;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const MONITOR_TAIL_LINES = 40;
const READ_DEFAULT_LINES = 80;
const FLASH_HOLD_MS = 1_200;
const VOICE_URL = "http://localhost:31337/notify";
const FIELD_DELIMITER = "|";
const BUFFER_PREFIX = "lifeos-tmux-";
const DEFAULT_SOCKET_LABEL = "default";

/** Name charset for anything that becomes a tmux session or window name. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
/** Charset for a --feature value, which is embedded in a generated session name. */
const SAFE_FEATURE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/;
/** SSH destinations are passed as a single shell word typed into a pane. */
const SAFE_SSH_TARGET = /^[A-Za-z0-9._@:%+/-]+$/;

let socketLabel: string | undefined;

function usageText(): string {
  return `Tmux.ts - JSON CLI wrapper driving tmux as an agent cockpit

USAGE:
  bun ~/.claude/skills/TMUX/Tools/Tmux.ts <subcommand> [options]

SUBCOMMANDS:
  ping                                       Server reachability and tmux version
  send --target <id> "<text>" [--enter]      Type literal text into a pane
  read --target <id> [--lines N]             Capture pane text, last N lines
  boot-team --name <n> --tiers a,b,c [--cwd] Session with one titled pane per tier
  race --feature <f> --agents N [--cmd]      N panes running the same command
  fleet --name <n> --grid RxC [--cmds "a;b"] Deterministic RxC grid of panes
  mini-fleet [--hosts <csv>]                 One SSH pane per host from USER config
  monitor [--session <id>] [--once] [--interval N]
  list | tree [--session <id>]               Structured topology
  flash --target <id> [--bell]               Attention signal (degraded, see help doc)
  voice "<msg>"                              Pulse voice notification
  kill --target <id>                         Teardown, ID-only, generation-checked
  doctor                                     Environment and safety self-check

GLOBAL:
  --socket <name>                            Use a private server via tmux -L <name>
  --help, -h                                 Show this help text

OUTPUT:
  Every subcommand prints exactly one JSON object to stdout and exits 0 when ok is true.
  monitor without --once prints one JSON object per poll pass.
`;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, FlagValue> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }
    if (token.startsWith("--")) {
      const name = token.slice(2);
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }
    } else {
      positionals.push(token);
    }
  }

  return { positionals, flags };
}

function flagString(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === "string" ? value : undefined;
}

function flagBoolean(args: ParsedArgs, name: string): boolean {
  return args.flags[name] === true;
}

function requireFlag(args: ParsedArgs, name: string): string | JsonObject {
  const value = flagString(args, name);
  if (value === undefined || value.trim() === "") {
    return { ok: false, error: `Missing required --${name}`, code: "missing-flag" };
  }
  return value;
}

function parsePositiveInteger(value: string | undefined, fallback: number, label: string): number | JsonObject {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || String(parsed) !== value.trim()) {
    return { ok: false, error: `${label} must be a positive integer`, code: "bad-flag" };
  }
  return parsed;
}

function expandHome(pathValue: string): string {
  if (pathValue === "~") {
    return homedir();
  }
  if (pathValue.startsWith("~/")) {
    return join(homedir(), pathValue.slice(2));
  }
  return pathValue;
}

function isSessionId(value: string): boolean {
  return /^\$\d+$/.test(value);
}

function isWindowId(value: string): boolean {
  return /^@\d+$/.test(value);
}

function isPaneId(value: string): boolean {
  return /^%\d+$/.test(value);
}

function isTmuxId(value: string): boolean {
  return isSessionId(value) || isWindowId(value) || isPaneId(value);
}

function idKind(value: string): "session" | "window" | "pane" | "invalid" {
  if (isSessionId(value)) return "session";
  if (isWindowId(value)) return "window";
  if (isPaneId(value)) return "pane";
  return "invalid";
}

function rejectNonId(value: string, flag: string): JsonObject {
  return {
    ok: false,
    code: "not-an-id",
    error:
      `--${flag} must be a tmux object ID ($N session, @N window, %N pane), got ${JSON.stringify(value)}. ` +
      "Names are refused because tmux -t resolves exact, then fnmatch, then unambiguous prefix: " +
      "with sessions 'prod' and 'production-work' present, targeting 'production' hits 'production-work' " +
      "and exits 0 with no warning. Use list/tree to get IDs.",
  };
}

async function processText(stream: ReadableStream<Uint8Array> | null): Promise<string> {
  if (stream === null) {
    return "";
  }
  return await new Response(stream).text();
}

async function runProcess(command: string[], timeoutMs: number): Promise<ExecResult> {
  let proc: Bun.Subprocess<"pipe", "pipe", "pipe">;
  try {
    proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe", stdin: "pipe" });
  } catch (error) {
    return { code: 127, stdout: "", stderr: error instanceof Error ? error.message : String(error) };
  }

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);

  try {
    const [code, stdout, stderr] = await Promise.all([
      proc.exited,
      processText(proc.stdout),
      processText(proc.stderr),
    ]);
    clearTimeout(timeout);
    if (timedOut) {
      return { code: code === 0 ? 124 : code, stdout, stderr: stderr || "Process timed out" };
    }
    return { code, stdout, stderr };
  } catch (error) {
    clearTimeout(timeout);
    proc.kill();
    return { code: 1, stdout: "", stderr: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Every tmux invocation goes through here as an argv array. There is no shell in
 * this tool, so no payload can ever be interpolated into a command string.
 */
function tmuxCommand(args: string[]): string[] {
  if (socketLabel !== undefined) {
    return ["tmux", "-L", socketLabel, ...args];
  }
  return ["tmux", ...args];
}

async function tmuxExec(args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ExecResult> {
  return await runProcess(tmuxCommand(args), timeoutMs);
}

function resultError(result: ExecResult, context: string, code = "tmux-failed"): JsonObject {
  const detail = (result.stderr || result.stdout || "unknown tmux error").trim();
  return { ok: false, code, error: `${context}: ${detail}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function socketKey(): string {
  return socketLabel ?? DEFAULT_SOCKET_LABEL;
}

// ---------------------------------------------------------------------------
// Server identity: generation tokens
// ---------------------------------------------------------------------------

/**
 * tmux object IDs restart at $0/@0/%0 for every new server incarnation, so a
 * stored ID silently retargets a different object after a restart. #{pid} and
 * #{start_time} both change on restart, so their pair identifies the incarnation.
 */
async function currentGeneration(): Promise<string | undefined> {
  const result = await tmuxExec(["display-message", "-p", "#{pid}:#{start_time}"]);
  if (result.code !== 0) {
    return undefined;
  }
  const token = result.stdout.trim();
  return token === "" || token.startsWith(":") ? undefined : token;
}

async function serverRunning(): Promise<boolean> {
  const result = await tmuxExec(["list-sessions", "-F", "#{session_id}"]);
  if (result.code === 0) {
    return true;
  }
  return !/no server running|error connecting|No such file/i.test(`${result.stdout}${result.stderr}`);
}

// ---------------------------------------------------------------------------
// State: what this tool created, and on which server incarnation
// ---------------------------------------------------------------------------

function statePath(): string {
  const override = process.env.TMUX_SKILL_STATE;
  if (override !== undefined && override.trim() !== "") {
    return expandHome(override);
  }
  return join(homedir(), ".claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/TMUX/state.json");
}

function emptyState(): ToolState {
  return { version: 1, sessions: [], buffers: [] };
}

function isTrackedSession(value: unknown): value is TrackedSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.socket === "string" &&
    typeof record.generation === "string" &&
    Array.isArray(record.windows) &&
    Array.isArray(record.panes)
  );
}

function loadState(): ToolState {
  const path = statePath();
  if (!existsSync(path)) {
    return emptyState();
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return emptyState();
    }
    const record = parsed as Record<string, unknown>;
    const sessions = Array.isArray(record.sessions) ? record.sessions.filter(isTrackedSession) : [];
    const buffers = Array.isArray(record.buffers) ? record.buffers.filter((b) => typeof b === "string") : [];
    return { version: 1, sessions, buffers: buffers as string[] };
  } catch {
    return emptyState();
  }
}

function saveState(state: ToolState): void {
  const path = statePath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    renameSync(temporary, path);
  } catch {
    // State is an optimisation for teardown safety, not a correctness requirement
    // for read-only paths. A failed write must not fail the caller's subcommand.
  }
}

function recordSession(entry: TrackedSession): void {
  const state = loadState();
  state.sessions = state.sessions.filter(
    (session) => !(session.socket === entry.socket && session.id === entry.id && session.generation === entry.generation),
  );
  state.sessions.push(entry);
  saveState(state);
}

function trackedForSocket(state: ToolState): TrackedSession[] {
  return state.sessions.filter((session) => session.socket === socketKey());
}

// ---------------------------------------------------------------------------
// Field queries. pane_current_path is deliberately never in a delimited template.
// ---------------------------------------------------------------------------

/**
 * Splits a delimited -F record. Any field that can carry arbitrary bytes (only
 * pane_title, which defaults to the machine hostname and can be set by the pane
 * via OSC 2) must be LAST in the template so a delimiter inside it rejoins here
 * instead of shifting every column. #{q:} does not escape delimiters and
 * #{b64:} does not exist in tmux 3.6, so ordering is the only defence.
 */
function splitRecord(line: string, fixedFields: number): string[] {
  const parts = line.split(FIELD_DELIMITER);
  if (parts.length <= fixedFields) {
    return parts;
  }
  return [...parts.slice(0, fixedFields), parts.slice(fixedFields).join(FIELD_DELIMITER)];
}

function nonEmptyLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim() !== "");
}

async function listPaneGeometry(windowOrSession: string): Promise<PaneGeometry[] | JsonObject> {
  const scope = isSessionId(windowOrSession) ? ["-s"] : [];
  const result = await tmuxExec([
    "list-panes",
    ...scope,
    "-t",
    windowOrSession,
    "-F",
    ["#{pane_id}", "#{pane_left}", "#{pane_top}", "#{pane_width}", "#{pane_height}", "#{pane_title}"].join(
      FIELD_DELIMITER,
    ),
  ]);
  if (result.code !== 0) {
    return resultError(result, "list-panes failed");
  }
  return nonEmptyLines(result.stdout).map((line) => {
    const [id, left, top, width, height, title] = splitRecord(line, 5);
    return {
      id,
      left: Number.parseInt(left, 10),
      top: Number.parseInt(top, 10),
      width: Number.parseInt(width, 10),
      height: Number.parseInt(height, 10),
      title: title ?? "",
    };
  });
}

function geometryJson(panes: PaneGeometry[]): JsonValue {
  return panes.map((pane) => ({
    id: pane.id,
    left: pane.left,
    top: pane.top,
    width: pane.width,
    height: pane.height,
    title: pane.title,
  })) as unknown as JsonValue;
}

// ---------------------------------------------------------------------------
// Target resolution
// ---------------------------------------------------------------------------

async function resolvePane(target: string): Promise<string | JsonObject> {
  if (!isTmuxId(target)) {
    return rejectNonId(target, "target");
  }
  // display-message exits 0 and prints an EMPTY string for a target that does
  // not exist, so the exit code alone is not proof of resolution. The returned
  // value has to be checked, or a missing pane silently becomes target "".
  const resolved = await tmuxExec(["display-message", "-p", "-t", target, "#{pane_id}"]);
  if (resolved.code !== 0) {
    return resultError(resolved, `could not resolve ${target} to a pane`, "target-missing");
  }
  const paneId = resolved.stdout.trim();
  if (!isPaneId(paneId)) {
    return { ok: false, code: "target-missing", error: `${target} does not resolve to a live pane on socket ${socketKey()}` };
  }
  return paneId;
}

/**
 * $TMUX is set when this process runs inside a pane. Writing keys into our own
 * pane would echo the wrapper's own payload into the transcript driving it.
 */
async function selfPaneGuard(paneId: string): Promise<JsonObject | undefined> {
  const insideTmux = process.env.TMUX;
  const ownPane = process.env.TMUX_PANE;
  if (insideTmux === undefined || ownPane === undefined || ownPane !== paneId) {
    return undefined;
  }
  const ownSocket = insideTmux.split(",")[0];
  const targetSocket = await tmuxExec(["display-message", "-p", "#{socket_path}"]);
  if (targetSocket.code === 0 && targetSocket.stdout.trim() !== ownSocket) {
    return undefined;
  }
  return {
    ok: false,
    code: "self-target",
    error: `Refusing to send keys into the pane this wrapper is running in (${paneId}).`,
  };
}

// ---------------------------------------------------------------------------
// Window configuration
// ---------------------------------------------------------------------------

/**
 * Applied per window. remain-on-exit is a WINDOW option: the session-scoped form
 * returns success and silently does nothing. Panes added later by split-window
 * inherit it (verified), but a window added later by new-window does not, so
 * this runs for every window this tool creates. Nothing here uses -g: a global
 * option reaches sessions this tool never created, and unsetting it would strip
 * the operator's own configuration.
 */
async function configureWindow(windowId: string, borderFormat: string): Promise<JsonObject | undefined> {
  const settings: Array<[string, string]> = [
    ["remain-on-exit", "on"],
    ["allow-rename", "off"],
    ["automatic-rename", "off"],
    ["pane-border-status", "top"],
    ["pane-border-format", borderFormat],
  ];
  for (const [option, value] of settings) {
    const result = await tmuxExec(["set-option", "-w", "-t", windowId, option, value]);
    if (result.code !== 0) {
      return resultError(result, `set-option -w ${option} failed`);
    }
  }
  return undefined;
}

async function sessionExists(name: string): Promise<boolean> {
  // "=name" anchors the target to an exact match, defeating prefix resolution.
  const result = await tmuxExec(["has-session", "-t", `=${name}`]);
  return result.code === 0;
}

type CreatedSession = {
  sessionId: string;
  windowId: string;
  paneId: string;
  generation: string;
};

async function createSession(
  name: string,
  cwd: string | undefined,
  width: number,
  height: number,
): Promise<CreatedSession | JsonObject> {
  if (!SAFE_NAME.test(name)) {
    return {
      ok: false,
      code: "bad-name",
      error: `Session name must match ${SAFE_NAME.source} (tmux forbids '.' and ':' in names)`,
    };
  }
  if (await sessionExists(name)) {
    return { ok: false, code: "name-taken", error: `A session named ${name} already exists on this server` };
  }

  const args = [
    "new-session",
    "-d",
    "-s",
    name,
    "-x",
    String(width),
    "-y",
    String(height),
    "-P",
    "-F",
    ["#{session_id}", "#{window_id}", "#{pane_id}"].join(FIELD_DELIMITER),
  ];
  if (cwd !== undefined) {
    const resolved = expandHome(cwd);
    if (!existsSync(resolved)) {
      return { ok: false, code: "bad-cwd", error: `--cwd does not exist: ${cwd}` };
    }
    args.splice(2, 0, "-c", resolved);
  }

  const result = await tmuxExec(args);
  if (result.code !== 0) {
    return resultError(result, "new-session failed");
  }
  const [sessionId, windowId, paneId] = result.stdout.trim().split(FIELD_DELIMITER);
  if (!isSessionId(sessionId) || !isWindowId(windowId) || !isPaneId(paneId)) {
    return { ok: false, code: "unexpected-output", error: `new-session returned unparseable IDs: ${result.stdout.trim()}` };
  }

  const generation = await currentGeneration();
  if (generation === undefined) {
    return { ok: false, code: "no-generation", error: "Could not read the server generation token after creating the session" };
  }
  return { sessionId, windowId, paneId, generation };
}

async function splitPane(fromPane: string, vertical: boolean, percent: number | undefined, cwd: string | undefined): Promise<string | JsonObject> {
  const args = ["split-window", vertical ? "-v" : "-h", "-t", fromPane];
  if (percent !== undefined) {
    args.push("-l", `${percent}%`);
  }
  if (cwd !== undefined) {
    args.push("-c", expandHome(cwd));
  }
  args.push("-P", "-F", "#{pane_id}");

  const result = await tmuxExec(args);
  if (result.code !== 0) {
    return resultError(result, `split-window from ${fromPane} failed`, "split-failed");
  }
  const paneId = result.stdout.trim();
  if (!isPaneId(paneId)) {
    return { ok: false, code: "unexpected-output", error: `split-window returned unparseable pane id: ${paneId}` };
  }
  return paneId;
}

async function titlePane(paneId: string, title: string): Promise<JsonObject | undefined> {
  const result = await tmuxExec(["select-pane", "-t", paneId, "-T", title]);
  if (result.code !== 0) {
    return resultError(result, `select-pane -T failed for ${paneId}`);
  }
  return undefined;
}

async function applyLayout(windowId: string, layout: string): Promise<void> {
  // A single-pane window has no layout to apply; tmux errors and it is not fatal.
  await tmuxExec(["select-layout", "-t", windowId, layout]);
}

async function sendLiteral(paneId: string, text: string, enter: boolean): Promise<JsonObject | undefined> {
  // -l sends the payload literally. Without it a payload word like "Enter" or
  // "C-c" is interpreted as a keypress. "--" stops flag parsing so a payload
  // starting with "-" is not read as an option (verified: it is required).
  const sent = await tmuxExec(["send-keys", "-t", paneId, "-l", "--", text]);
  if (sent.code !== 0) {
    return resultError(sent, "send-keys failed");
  }
  if (enter) {
    const key = await tmuxExec(["send-keys", "-t", paneId, "Enter"]);
    if (key.code !== 0) {
      return resultError(key, "send-keys Enter failed");
    }
  }
  return undefined;
}

async function capturePane(paneId: string, lines: number): Promise<{ text: string; total: number } | JsonObject> {
  // -S -N is a scrollback START OFFSET, not a line count: on a 24-row pane
  // "-S -10" returns 34 lines. "-S -" takes the whole history and the tail is
  // sliced here, which is the only way to honour a real "last N lines".
  const result = await tmuxExec(["capture-pane", "-p", "-J", "-S", "-", "-t", paneId]);
  if (result.code !== 0) {
    return resultError(result, `capture-pane failed for ${paneId}`, "capture-failed");
  }
  const all = result.stdout.replace(/\n$/, "").split("\n");
  // capture-pane emits every ROW of the pane, so a mostly-empty pane returns its
  // full height as trailing blank rows. Slicing the tail without dropping those
  // returns N empty strings and reads as "the agent printed nothing".
  let end = all.length;
  while (end > 0 && all[end - 1].trim() === "") {
    end -= 1;
  }
  const content = all.slice(0, end);
  return { text: content.slice(-lines).join("\n"), total: content.length };
}

// ---------------------------------------------------------------------------
// Process-tree layer for monitor
// ---------------------------------------------------------------------------

async function processChildCounts(): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  const result = await runProcess(["ps", "-eo", "pid=,ppid="], DEFAULT_TIMEOUT_MS);
  if (result.code !== 0) {
    return counts;
  }
  for (const line of nonEmptyLines(result.stdout)) {
    const parts = line.trim().split(/\s+/);
    const parent = Number.parseInt(parts[1], 10);
    if (Number.isFinite(parent)) {
      counts.set(parent, (counts.get(parent) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Weak layer. Screen text is guesswork: a prompt-looking tail can be a finished
 * agent, a paused one, or an agent that printed a prompt character inside its
 * output. Everything derived here is reported with confidence "weak".
 */
function classifyScreen(text: string): PaneStateName {
  const tail = text.trimEnd();
  if (/(do you want|\[y\/n\]|\(y\/n\)|press enter|continue\?|password:|passphrase)/i.test(tail) || /\?\s*$/.test(tail)) {
    return "awaiting-input";
  }
  if (/(^|\n)\s*(done|completed|finished|exit code:\s*0)\b/i.test(tail) || /[✓✔]\s*(done|complete|completed)?/i.test(tail)) {
    return "done";
  }
  if (/(^|\n)[^\n]*[$%#❯]\s*$/.test(tail)) {
    return "idle";
  }
  return "working";
}

function resolveSignals(signals: PaneSignals): { state: PaneStateName; confidence: Confidence; disagreements: string[] } {
  const disagreements: string[] = [];
  let state: PaneStateName;
  let confidence: Confidence;

  if (signals.exit.present && signals.exit.dead) {
    state = signals.exit.state ?? "done";
    confidence = "definitive";
  } else if (signals.screen.present && signals.screen.state === "awaiting-input") {
    // The strong layer answers "is a process running", which cannot express
    // awaiting-input at all. This is the one case where the weak layer decides,
    // and the JSON says so.
    state = "awaiting-input";
    confidence = "weak";
  } else if (signals.process.present && signals.process.state !== undefined) {
    state = signals.process.state;
    confidence = "strong";
  } else if (signals.screen.present && signals.screen.state !== undefined) {
    state = signals.screen.state;
    confidence = "weak";
  } else {
    state = "idle";
    confidence = "weak";
  }

  if (signals.screen.present && signals.screen.state !== undefined && signals.screen.state !== state) {
    disagreements.push(`screen=${signals.screen.state} (weak) overruled by ${state} (${confidence})`);
  }
  if (
    signals.process.present &&
    signals.process.state !== undefined &&
    signals.process.state !== state &&
    confidence === "definitive"
  ) {
    disagreements.push(`process=${signals.process.state} (strong) overruled by ${state} (definitive)`);
  }
  return { state, confidence, disagreements };
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

async function notifyVoice(message: string): Promise<boolean> {
  try {
    const response = await fetch(VOICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, voice_enabled: true }),
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

async function commandPing(): Promise<JsonObject> {
  const version = await runProcess(["tmux", "-V"], DEFAULT_TIMEOUT_MS);
  if (version.code !== 0) {
    return resultError(version, "tmux -V failed (is tmux installed?)", "tmux-missing");
  }

  // start-server does not leave a server running when there are no sessions: it
  // exits as soon as the invoking command returns. Reachability is therefore the
  // exit code of list-sessions, not an attempt to start anything.
  const sessions = await tmuxExec(["list-sessions", "-F", "#{session_id}"]);
  const running = sessions.code === 0;

  return {
    ok: true,
    version: version.stdout.trim(),
    socket: socketKey(),
    serverRunning: running,
    sessions: running ? nonEmptyLines(sessions.stdout).length : 0,
    generation: running ? ((await currentGeneration()) ?? null) : null,
    nested: process.env.TMUX !== undefined,
  };
}

async function commandSend(args: ParsedArgs): Promise<JsonObject> {
  const targetValue = requireFlag(args, "target");
  if (typeof targetValue !== "string") {
    return targetValue;
  }

  const text = args.positionals.join(" ");
  if (text === "") {
    return { ok: false, code: "missing-text", error: "Missing text positional" };
  }

  const entered = flagBoolean(args, "enter");
  if (/[\r\n]/.test(text) && !entered) {
    // Measured on tmux 3.6: send-keys -l, paste-buffer, paste-buffer -p,
    // paste-buffer -r and paste-buffer -p -r ALL executed the payload in a ready
    // shell. No transport is safe, and bracketed-paste state is not exposed by
    // any format variable, so the payload is what gets validated.
    return {
      ok: false,
      code: "multiline-refused",
      error:
        "Refusing multi-line text without --enter. A carriage return or newline in the payload EXECUTES the " +
        "line it terminates, and no tmux send mechanism prevents that. Strip newlines, or pass --enter to " +
        "state that submitting is intended.",
      offendingCharacters: text.includes("\r") ? "CR and/or LF" : "LF",
    };
  }

  const paneId = await resolvePane(targetValue);
  if (typeof paneId !== "string") {
    return paneId;
  }
  const guard = await selfPaneGuard(paneId);
  if (guard !== undefined) {
    return guard;
  }

  const error = await sendLiteral(paneId, text, entered);
  if (error !== undefined) {
    return error;
  }
  return { ok: true, target: paneId, bytes: Buffer.byteLength(text, "utf8"), entered };
}

async function commandRead(args: ParsedArgs): Promise<JsonObject> {
  const targetValue = requireFlag(args, "target");
  if (typeof targetValue !== "string") {
    return targetValue;
  }
  const lines = parsePositiveInteger(flagString(args, "lines"), READ_DEFAULT_LINES, "--lines");
  if (typeof lines !== "number") {
    return lines;
  }

  const paneId = await resolvePane(targetValue);
  if (typeof paneId !== "string") {
    return paneId;
  }
  const captured = await capturePane(paneId, lines);
  if (!("text" in captured)) {
    return captured;
  }
  const returned = captured.text === "" ? 0 : captured.text.split("\n").length;
  return {
    ok: true,
    target: paneId,
    requestedLines: lines,
    returnedLines: returned,
    scrollbackLines: captured.total,
    text: captured.text,
  };
}

async function commandBootTeam(args: ParsedArgs): Promise<JsonObject> {
  const nameValue = requireFlag(args, "name");
  if (typeof nameValue !== "string") {
    return nameValue;
  }
  const tiers = (flagString(args, "tiers") ?? "orchestrator,lead,worker,worker")
    .split(",")
    .map((role) => role.trim())
    .filter((role) => role.length > 0);
  if (tiers.length === 0) {
    return { ok: false, code: "bad-flag", error: "--tiers must include at least one role" };
  }
  for (const role of tiers) {
    if (!SAFE_NAME.test(role)) {
      return { ok: false, code: "bad-flag", error: `Tier role must match ${SAFE_NAME.source}, got ${JSON.stringify(role)}` };
    }
  }

  const cwd = flagString(args, "cwd");
  // An 80x24 default window runs out of space around four panes. Size the
  // session up front so the lead-split strategy has room.
  const created = await createSession(nameValue, cwd, Math.max(200, 40 * tiers.length), Math.max(50, 8 * tiers.length));
  if (!("sessionId" in created)) {
    return created;
  }

  const configureError = await configureWindow(created.windowId, "#{pane_index}:#{pane_title}");
  if (configureError !== undefined) {
    return configureError;
  }
  await tmuxExec(["rename-window", "-t", created.windowId, nameValue]);

  const panes: TrackedPane[] = [{ id: created.paneId, role: tiers[0] }];
  const titleError = await titlePane(created.paneId, tiers[0]);
  if (titleError !== undefined) {
    return titleError;
  }

  for (let index = 1; index < tiers.length; index += 1) {
    // Splitting the newest pane each time halves the remaining space
    // exponentially and dies at "no space for new pane" around seven panes.
    // Splitting the LEAD pane and re-flowing with main-vertical does not.
    const paneId = await splitPane(created.paneId, false, undefined, cwd);
    if (typeof paneId !== "string") {
      return { ...paneId, createdSoFar: panes as unknown as JsonValue, session: created.sessionId };
    }
    await applyLayout(created.windowId, "main-vertical");
    const roleError = await titlePane(paneId, tiers[index]);
    if (roleError !== undefined) {
      return roleError;
    }
    panes.push({ id: paneId, role: tiers[index] });
  }

  await applyLayout(created.windowId, "main-vertical");

  const geometry = await listPaneGeometry(created.windowId);
  if (!Array.isArray(geometry)) {
    return geometry;
  }

  recordSession({
    id: created.sessionId,
    name: nameValue,
    socket: socketKey(),
    generation: created.generation,
    kind: "boot-team",
    createdAt: new Date().toISOString(),
    windows: [created.windowId],
    panes,
  });

  const byId = new Map(geometry.map((pane) => [pane.id, pane]));
  return {
    ok: true,
    session: created.sessionId,
    name: nameValue,
    window: created.windowId,
    generation: created.generation,
    socket: socketKey(),
    layout: "main-vertical",
    panes: panes.map((pane) => ({
      id: pane.id,
      role: pane.role,
      left: byId.get(pane.id)?.left ?? null,
      top: byId.get(pane.id)?.top ?? null,
      width: byId.get(pane.id)?.width ?? null,
      height: byId.get(pane.id)?.height ?? null,
    })) as unknown as JsonValue,
    verified: geometry.length === tiers.length,
  };
}

async function commandRace(args: ParsedArgs): Promise<JsonObject> {
  const featureValue = requireFlag(args, "feature");
  if (typeof featureValue !== "string") {
    return featureValue;
  }
  if (!SAFE_FEATURE.test(featureValue)) {
    return { ok: false, code: "bad-flag", error: `--feature must match ${SAFE_FEATURE.source}` };
  }
  const agents = parsePositiveInteger(flagString(args, "agents"), 0, "--agents");
  if (typeof agents !== "number") {
    return agents;
  }
  if (agents < 1) {
    return { ok: false, code: "bad-flag", error: "--agents is required and must be positive" };
  }

  const command = flagString(args, "cmd");
  if (command !== undefined && /[\r\n]/.test(command)) {
    return { ok: false, code: "multiline-refused", error: "--cmd must be a single line" };
  }

  const sessionName = `race-${featureValue.replace(/ /g, "-")}`;
  const cwd = flagString(args, "cwd");
  const created = await createSession(sessionName, cwd, Math.max(200, 40 * agents), Math.max(50, 8 * agents));
  if (!("sessionId" in created)) {
    return created;
  }
  const configureError = await configureWindow(created.windowId, "#{pane_index}:#{pane_title}");
  if (configureError !== undefined) {
    return configureError;
  }
  await tmuxExec(["rename-window", "-t", created.windowId, sessionName]);

  const panes: TrackedPane[] = [{ id: created.paneId, role: "race-1" }];
  for (let index = 1; index < agents; index += 1) {
    const paneId = await splitPane(created.paneId, false, undefined, cwd);
    if (typeof paneId !== "string") {
      return { ...paneId, createdSoFar: panes as unknown as JsonValue, session: created.sessionId };
    }
    await applyLayout(created.windowId, "main-vertical");
    panes.push({ id: paneId, role: `race-${index + 1}` });
  }
  await applyLayout(created.windowId, "main-vertical");

  for (const pane of panes) {
    const titleError = await titlePane(pane.id, pane.role);
    if (titleError !== undefined) {
      return titleError;
    }
    if (command !== undefined) {
      const sendError = await sendLiteral(pane.id, command, true);
      if (sendError !== undefined) {
        return sendError;
      }
    }
  }

  recordSession({
    id: created.sessionId,
    name: sessionName,
    socket: socketKey(),
    generation: created.generation,
    kind: "race",
    createdAt: new Date().toISOString(),
    windows: [created.windowId],
    panes,
  });

  const geometry = await listPaneGeometry(created.windowId);
  return {
    ok: true,
    session: created.sessionId,
    name: sessionName,
    window: created.windowId,
    generation: created.generation,
    socket: socketKey(),
    feature: featureValue,
    command: command ?? null,
    panes: panes as unknown as JsonValue,
    geometry: Array.isArray(geometry) ? geometryJson(geometry) : null,
    verified: Array.isArray(geometry) && geometry.length === agents,
  };
}

function parseGrid(value: string | undefined): { rows: number; cols: number } | JsonObject {
  const grid = value ?? "2x2";
  const match = grid.match(/^([1-9][0-9]*)x([1-9][0-9]*)$/i);
  if (!match) {
    return { ok: false, code: "bad-flag", error: "--grid must be in RxC form, for example 2x2" };
  }
  const rows = Number.parseInt(match[1], 10);
  const cols = Number.parseInt(match[2], 10);
  if (rows * cols > 64) {
    return { ok: false, code: "bad-flag", error: "--grid may not exceed 64 panes" };
  }
  return { rows, cols };
}

/**
 * select-layout tiled ignores the requested shape and computes its own
 * near-square arrangement from the pane count: 1x5 and 5x1 both yield 3 rows by
 * 2 columns. A real RxC grid has to be built explicitly. Percentages are chosen
 * so each successive split leaves equal-sized siblings: splitting off (n-1)/n of
 * the remaining space n-1 times produces n equal tracks.
 */
async function buildGrid(firstPane: string, rows: number, cols: number, cwd: string | undefined): Promise<string[][] | JsonObject> {
  const rowPanes: string[] = [firstPane];
  let cursor = firstPane;
  for (let index = 0; index < rows - 1; index += 1) {
    const percent = Math.round((100 * (rows - 1 - index)) / (rows - index));
    const paneId = await splitPane(cursor, true, percent, cwd);
    if (typeof paneId !== "string") {
      return paneId;
    }
    rowPanes.push(paneId);
    cursor = paneId;
  }

  const grid: string[][] = [];
  for (const rowPane of rowPanes) {
    const row = [rowPane];
    let columnCursor = rowPane;
    for (let index = 0; index < cols - 1; index += 1) {
      const percent = Math.round((100 * (cols - 1 - index)) / (cols - index));
      const paneId = await splitPane(columnCursor, false, percent, cwd);
      if (typeof paneId !== "string") {
        return paneId;
      }
      row.push(paneId);
      columnCursor = paneId;
    }
    grid.push(row);
  }
  return grid;
}

async function commandFleet(args: ParsedArgs): Promise<JsonObject> {
  const nameValue = requireFlag(args, "name");
  if (typeof nameValue !== "string") {
    return nameValue;
  }
  const grid = parseGrid(flagString(args, "grid"));
  if (!("rows" in grid)) {
    return grid;
  }
  const commands = (flagString(args, "cmds") ?? "")
    .split(";")
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd.length > 0);
  for (const command of commands) {
    if (/[\r\n]/.test(command)) {
      return { ok: false, code: "multiline-refused", error: "--cmds entries must each be a single line" };
    }
  }

  const cwd = flagString(args, "cwd");
  const created = await createSession(nameValue, cwd, Math.max(120, 60 * grid.cols), Math.max(30, 12 * grid.rows));
  if (!("sessionId" in created)) {
    return created;
  }
  const configureError = await configureWindow(created.windowId, "#{pane_index}:#{pane_title}");
  if (configureError !== undefined) {
    return configureError;
  }
  await tmuxExec(["rename-window", "-t", created.windowId, nameValue]);

  const built = await buildGrid(created.paneId, grid.rows, grid.cols, cwd);
  if (!Array.isArray(built)) {
    return { ...built, session: created.sessionId, hint: "the window may be too small for the requested grid" };
  }

  const flat = built.flat();
  const panes: TrackedPane[] = flat.map((id, index) => ({ id, role: `cell-${index + 1}` }));
  for (let index = 0; index < panes.length; index += 1) {
    const titleError = await titlePane(panes[index].id, panes[index].role);
    if (titleError !== undefined) {
      return titleError;
    }
    const command = commands[index];
    if (command !== undefined) {
      const sendError = await sendLiteral(panes[index].id, command, true);
      if (sendError !== undefined) {
        return sendError;
      }
    }
  }

  recordSession({
    id: created.sessionId,
    name: nameValue,
    socket: socketKey(),
    generation: created.generation,
    kind: "fleet",
    createdAt: new Date().toISOString(),
    windows: [created.windowId],
    panes,
  });

  // Geometry is measured, not assumed: distinct pane_top values must equal the
  // requested row count, and every row must hold exactly the column count.
  const geometry = await listPaneGeometry(created.windowId);
  if (!Array.isArray(geometry)) {
    return geometry;
  }
  const tops = [...new Set(geometry.map((pane) => pane.top))].sort((a, b) => a - b);
  const perRow = tops.map((top) => geometry.filter((pane) => pane.top === top).length);
  const verified = tops.length === grid.rows && perRow.every((count) => count === grid.cols);

  return {
    ok: true,
    session: created.sessionId,
    name: nameValue,
    window: created.windowId,
    generation: created.generation,
    socket: socketKey(),
    grid: { rows: grid.rows, cols: grid.cols },
    cells: built.map((row, rowIndex) =>
      row.map((id, colIndex) => {
        const pane = geometry.find((candidate) => candidate.id === id);
        return {
          id,
          row: rowIndex,
          col: colIndex,
          cmd: commands[rowIndex * grid.cols + colIndex] ?? null,
          left: pane?.left ?? null,
          top: pane?.top ?? null,
          width: pane?.width ?? null,
          height: pane?.height ?? null,
        };
      }),
    ) as unknown as JsonValue,
    verified,
    measured: { distinctRows: tops.length, panesPerRow: perRow as unknown as JsonValue },
  };
}

function parseHostsCsv(value: string): HostConfig[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const equalsIndex = entry.indexOf("=");
      if (equalsIndex === -1) {
        return { name: entry, ssh: entry };
      }
      return { name: entry.slice(0, equalsIndex).trim(), ssh: entry.slice(equalsIndex + 1).trim() };
    });
}

function isHostConfig(value: unknown): value is HostConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.name === "string" && typeof record.ssh === "string";
}

const FLEET_CONFIG_RELATIVE = ".claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/TMUX/fleet.json";

function loadFleetConfig(): HostConfig[] | JsonObject {
  const configPath = join(homedir(), FLEET_CONFIG_RELATIVE);
  if (!existsSync(configPath)) {
    return {
      ok: false,
      code: "no-fleet-config",
      error:
        "No hosts configured. Pass --hosts name=ssh,name2=ssh2 or create " +
        `~/${FLEET_CONFIG_RELATIVE.replace(/^\.claude\//, ".claude/")} with ` +
        '{"hosts":[{"name":"...","ssh":"..."}]}',
    };
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(configPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, code: "bad-fleet-config", error: "fleet.json must contain an object" };
    }
    const hosts = (parsed as Record<string, unknown>).hosts;
    if (!Array.isArray(hosts) || !hosts.every(isHostConfig)) {
      return {
        ok: false,
        code: "bad-fleet-config",
        error: 'fleet.json must have shape {"hosts":[{"name":"...","ssh":"..."}]}',
      };
    }
    return hosts;
  } catch (error) {
    return {
      ok: false,
      code: "bad-fleet-config",
      error: `Failed to read fleet.json: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function validateHost(host: HostConfig): JsonObject | undefined {
  if (!SAFE_NAME.test(host.name)) {
    return { ok: false, code: "bad-host", error: `Host name must match ${SAFE_NAME.source}` };
  }
  if (!SAFE_SSH_TARGET.test(host.ssh)) {
    return { ok: false, code: "bad-host", error: `SSH target for ${host.name} contains unsupported characters` };
  }
  return undefined;
}

async function commandMiniFleet(args: ParsedArgs): Promise<JsonObject> {
  const hostFlag = flagString(args, "hosts");
  const hosts = hostFlag !== undefined ? parseHostsCsv(hostFlag) : loadFleetConfig();
  if (!Array.isArray(hosts)) {
    return hosts;
  }
  if (hosts.length === 0) {
    return { ok: false, code: "no-hosts", error: "No hosts configured" };
  }
  for (const host of hosts) {
    const invalid = validateHost(host);
    if (invalid !== undefined) {
      return invalid;
    }
  }

  const sessionName = flagString(args, "name") ?? "mini-fleet";
  const created = await createSession(sessionName, undefined, Math.max(200, 40 * hosts.length), Math.max(50, 8 * hosts.length));
  if (!("sessionId" in created)) {
    return created;
  }
  const configureError = await configureWindow(created.windowId, "#{pane_index}:#{pane_title}");
  if (configureError !== undefined) {
    return configureError;
  }
  await tmuxExec(["rename-window", "-t", created.windowId, sessionName]);

  const panes: TrackedPane[] = [{ id: created.paneId, role: hosts[0].name }];
  for (let index = 1; index < hosts.length; index += 1) {
    const paneId = await splitPane(created.paneId, false, undefined, undefined);
    if (typeof paneId !== "string") {
      return { ...paneId, session: created.sessionId };
    }
    await applyLayout(created.windowId, "main-vertical");
    panes.push({ id: paneId, role: hosts[index].name });
  }
  await applyLayout(created.windowId, "main-vertical");

  for (let index = 0; index < panes.length; index += 1) {
    const titleError = await titlePane(panes[index].id, panes[index].role);
    if (titleError !== undefined) {
      return titleError;
    }
    const sendError = await sendLiteral(panes[index].id, `ssh ${hosts[index].ssh}`, true);
    if (sendError !== undefined) {
      return sendError;
    }
  }

  recordSession({
    id: created.sessionId,
    name: sessionName,
    socket: socketKey(),
    generation: created.generation,
    kind: "mini-fleet",
    createdAt: new Date().toISOString(),
    windows: [created.windowId],
    panes,
  });

  const geometry = await listPaneGeometry(created.windowId);
  return {
    ok: true,
    session: created.sessionId,
    name: sessionName,
    window: created.windowId,
    generation: created.generation,
    socket: socketKey(),
    source: hostFlag !== undefined ? "--hosts" : `~/${FLEET_CONFIG_RELATIVE}`,
    hosts: panes.map((pane, index) => ({ pane: pane.id, name: hosts[index].name, ssh: hosts[index].ssh })) as unknown as JsonValue,
    geometry: Array.isArray(geometry) ? geometryJson(geometry) : null,
    verified: Array.isArray(geometry) && geometry.length === hosts.length,
  };
}

// ---------------------------------------------------------------------------
// Topology
// ---------------------------------------------------------------------------

type TopologyPane = {
  id: string;
  index: number;
  dead: boolean;
  deadStatus: string;
  pid: number;
  currentCommand: string;
  width: number;
  height: number;
  left: number;
  top: number;
  title: string;
};

async function listPanesDetailed(sessionFilter: string | undefined): Promise<Array<TopologyPane & { session: string; sessionName: string; window: string; windowName: string }> | JsonObject> {
  const scope = sessionFilter === undefined ? ["-a"] : ["-s", "-t", sessionFilter];
  const result = await tmuxExec([
    "list-panes",
    ...scope,
    "-F",
    [
      "#{session_id}",
      "#{session_name}",
      "#{window_id}",
      "#{window_name}",
      "#{pane_id}",
      "#{pane_index}",
      "#{pane_dead}",
      "#{pane_dead_status}",
      "#{pane_pid}",
      "#{pane_current_command}",
      "#{pane_width}",
      "#{pane_height}",
      "#{pane_left}",
      "#{pane_top}",
      // pane_title is LAST and is the only free-form field. pane_current_path is
      // never included: it carries raw filesystem bytes that can contain the
      // delimiter or a newline, and neither #{q:} nor a base64 modifier can
      // escape it in tmux 3.6.
      "#{pane_title}",
    ].join(FIELD_DELIMITER),
  ]);
  if (result.code !== 0) {
    if (/no server running|error connecting/i.test(result.stderr)) {
      return [];
    }
    return resultError(result, "list-panes failed");
  }

  return nonEmptyLines(result.stdout).map((line) => {
    const f = splitRecord(line, 14);
    return {
      session: f[0],
      sessionName: f[1],
      window: f[2],
      windowName: f[3],
      id: f[4],
      index: Number.parseInt(f[5], 10),
      dead: f[6] === "1",
      deadStatus: f[7] ?? "",
      pid: Number.parseInt(f[8], 10),
      currentCommand: f[9] ?? "",
      width: Number.parseInt(f[10], 10),
      height: Number.parseInt(f[11], 10),
      left: Number.parseInt(f[12], 10),
      top: Number.parseInt(f[13], 10),
      title: f[14] ?? "",
    };
  });
}

async function commandTree(args: ParsedArgs): Promise<JsonObject> {
  const sessionFilter = flagString(args, "session");
  if (sessionFilter !== undefined && !isSessionId(sessionFilter)) {
    return rejectNonId(sessionFilter, "session");
  }

  const panes = await listPanesDetailed(sessionFilter);
  if (!Array.isArray(panes)) {
    return panes;
  }

  const generation = await currentGeneration();
  const tracked = trackedForSocket(loadState());
  const trackedIds = new Set(tracked.filter((s) => s.generation === generation).map((s) => s.id));
  const roleByPane = new Map<string, string>();
  for (const session of tracked) {
    if (session.generation !== generation) continue;
    for (const pane of session.panes) {
      roleByPane.set(pane.id, pane.role);
    }
  }

  const sessions = new Map<string, { id: string; name: string; tracked: boolean; windows: Map<string, JsonObject> }>();
  for (const pane of panes) {
    let session = sessions.get(pane.session);
    if (session === undefined) {
      session = { id: pane.session, name: pane.sessionName, tracked: trackedIds.has(pane.session), windows: new Map() };
      sessions.set(pane.session, session);
    }
    let window = session.windows.get(pane.window);
    if (window === undefined) {
      window = { id: pane.window, name: pane.windowName, panes: [] };
      session.windows.set(pane.window, window);
    }
    (window.panes as JsonValue[]).push({
      id: pane.id,
      index: pane.index,
      role: roleByPane.get(pane.id) ?? null,
      title: pane.title,
      dead: pane.dead,
      deadStatus: pane.deadStatus,
      pid: pane.pid,
      currentCommand: pane.currentCommand,
      left: pane.left,
      top: pane.top,
      width: pane.width,
      height: pane.height,
    });
  }

  return {
    ok: true,
    socket: socketKey(),
    generation: generation ?? null,
    sessions: [...sessions.values()].map((session) => ({
      id: session.id,
      name: session.name,
      tracked: session.tracked,
      windows: [...session.windows.values()] as unknown as JsonValue,
    })) as unknown as JsonValue,
    notes: [
      "pane_current_path is deliberately absent: its raw bytes can contain the field delimiter or a newline.",
      "pane_title defaults to the machine hostname, so an untitled pane is not an empty string.",
      "currentCommand resolves one level only: a process under a wrapper reports the wrapper.",
    ] as unknown as JsonValue,
  };
}

// ---------------------------------------------------------------------------
// Monitor
// ---------------------------------------------------------------------------

async function monitorPass(sessionFilter: string | undefined): Promise<MonitorPane[] | JsonObject> {
  const panes = await listPanesDetailed(sessionFilter);
  if (!Array.isArray(panes)) {
    return panes;
  }
  const childCounts = await processChildCounts();

  const states: MonitorPane[] = [];
  for (const pane of panes) {
    const signals: PaneSignals = {
      exit: {
        present: true,
        dead: pane.dead,
        status: pane.deadStatus,
        state: pane.dead ? (pane.deadStatus === "0" ? "done" : "failed") : undefined,
      },
      process: { present: false, descendants: 0 },
      screen: { present: false },
    };

    if (!pane.dead && Number.isFinite(pane.pid)) {
      const descendants = childCounts.get(pane.pid) ?? 0;
      signals.process = { present: true, descendants, state: descendants > 0 ? "working" : "idle" };
    }

    let textTail = "";
    const captured = await capturePane(pane.id, MONITOR_TAIL_LINES);
    if ("text" in captured) {
      textTail = captured.text;
      signals.screen = { present: true, state: classifyScreen(textTail) };
    }

    const resolved = resolveSignals(signals);
    states.push({
      id: pane.id,
      session: pane.session,
      window: pane.window,
      title: pane.title,
      state: resolved.state,
      confidence: resolved.confidence,
      signals,
      disagreements: resolved.disagreements,
      currentCommand: pane.currentCommand,
      commandResolvedOneLevelOnly: true,
      textTail,
    });
  }
  return states;
}

async function commandMonitor(args: ParsedArgs): Promise<number> {
  const interval = parsePositiveInteger(flagString(args, "interval"), 3, "--interval");
  if (typeof interval !== "number") {
    console.log(JSON.stringify(interval));
    return 1;
  }
  const sessionFilter = flagString(args, "session");
  if (sessionFilter !== undefined && !isSessionId(sessionFilter)) {
    console.log(JSON.stringify(rejectNonId(sessionFilter, "session")));
    return 1;
  }

  const once = flagBoolean(args, "once");
  const quiet = flagBoolean(args, "no-voice");
  const previous = new Map<string, PaneStateName>();
  let stopping = false;

  process.on("SIGINT", () => {
    stopping = true;
    process.stdout.write(`${JSON.stringify({ ok: true, stopped: true })}\n`);
    process.exit(0);
  });

  while (!stopping) {
    const pass = await monitorPass(sessionFilter);
    if (!Array.isArray(pass)) {
      console.log(JSON.stringify(pass));
      return 1;
    }

    for (const pane of pass) {
      const before = previous.get(pane.id);
      // done/failed mean the pane's process exited and remain-on-exit preserved
      // it. working->idle is the other completion signal and the common one: a
      // command finished but its shell is still alive, so the pane never dies.
      const label =
        pane.state === "awaiting-input"
          ? "awaiting input"
          : pane.state === "failed"
            ? `failed with status ${pane.signals.exit.status}`
            : pane.state === "done"
              ? "done"
              : pane.state === "idle" && before === "working"
                ? "back at a prompt"
                : undefined;
      if (before !== undefined && before !== pane.state && label !== undefined && !quiet) {
        await notifyVoice(`tmux pane ${pane.id} ${pane.title} is ${label}`);
      }
      previous.set(pane.id, pane.state);
    }

    console.log(JSON.stringify({ ok: true, socket: socketKey(), panes: pass as unknown as JsonValue }));
    if (once) {
      return 0;
    }
    // tmux has no push API for pane state, so this polls until SIGINT.
    await sleep(interval * 1_000);
  }

  console.log(JSON.stringify({ ok: true, stopped: true }));
  return 0;
}

// ---------------------------------------------------------------------------
// Flash
// ---------------------------------------------------------------------------

async function commandFlash(args: ParsedArgs): Promise<JsonObject> {
  const targetValue = requireFlag(args, "target");
  if (typeof targetValue !== "string") {
    return targetValue;
  }
  if (!isTmuxId(targetValue)) {
    return rejectNonId(targetValue, "target");
  }

  const windowResult = await tmuxExec(["display-message", "-p", "-t", targetValue, "#{window_id}"]);
  if (windowResult.code !== 0) {
    return resultError(windowResult, `could not resolve ${targetValue}`, "target-missing");
  }
  const windowId = windowResult.stdout.trim();
  if (!isWindowId(windowId)) {
    return { ok: false, code: "target-missing", error: `${targetValue} does not resolve to a live window on socket ${socketKey()}` };
  }

  const actions: string[] = [];
  const message = await tmuxExec(["display-message", "-t", targetValue, `ATTENTION: ${targetValue}`]);
  if (message.code === 0) {
    actions.push("display-message");
  }

  try {
    const styled = await tmuxExec(["set-option", "-w", "-t", windowId, "pane-border-style", "fg=red,bold"]);
    const activeStyled = await tmuxExec(["set-option", "-w", "-t", windowId, "pane-active-border-style", "fg=red,bold"]);
    if (styled.code === 0 && activeStyled.code === 0) {
      actions.push("transient-border-style");
    }
    if (isPaneId(targetValue)) {
      const selected = await tmuxExec(["select-pane", "-t", targetValue]);
      if (selected.code === 0) {
        actions.push("select-pane");
      }
    }
    await sleep(FLASH_HOLD_MS);
  } finally {
    // Scoped to the window this tool created; -u restores the inherited value
    // rather than writing the operator's global configuration.
    await tmuxExec(["set-option", "-w", "-t", windowId, "-u", "pane-border-style"]);
    await tmuxExec(["set-option", "-w", "-t", windowId, "-u", "pane-active-border-style"]);
  }

  let bell: string;
  if (flagBoolean(args, "bell")) {
    const paneId = await resolvePane(targetValue);
    if (typeof paneId === "string") {
      const rung = await tmuxExec(["send-keys", "-t", paneId, "-H", "07"]);
      bell = rung.code === 0 ? "sent-as-input-byte" : "failed";
      if (rung.code === 0) {
        actions.push("bell");
      }
    } else {
      bell = "failed";
    }
  } else {
    bell = "skipped";
  }

  return {
    ok: true,
    target: targetValue,
    window: windowId,
    actions: actions as unknown as JsonValue,
    bell,
    degraded: true,
    degradedReason:
      "tmux has no GUI pulse. All of this is text on an ATTACHED client only: a detached operator sees none " +
      "of it. --bell writes byte 0x07 into the pane's INPUT stream, which a live prompt or TUI may swallow or " +
      "echo, so it is opt-in. Voice via monitor is the real attention mechanism.",
  };
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

async function commandVoice(args: ParsedArgs): Promise<JsonObject> {
  const message = args.positionals.join(" ");
  if (message.trim() === "") {
    return { ok: false, code: "missing-text", error: "Missing voice message positional" };
  }
  const notified = await notifyVoice(message);
  return { ok: true, notified, endpoint: VOICE_URL };
}

// ---------------------------------------------------------------------------
// Kill
// ---------------------------------------------------------------------------

async function commandKill(args: ParsedArgs): Promise<JsonObject> {
  if (args.flags.all === true || args.flags.a === true) {
    return {
      ok: false,
      code: "refused",
      error:
        "Refusing --all. tmux's kill-session -a kills every session EXCEPT the target, which on a shared server " +
        "destroys the operator's own work. Kill IDs one at a time.",
    };
  }

  const targetValue = requireFlag(args, "target");
  if (typeof targetValue !== "string") {
    return targetValue;
  }
  const kind = idKind(targetValue);
  if (kind === "invalid") {
    return rejectNonId(targetValue, "target");
  }

  const generation = await currentGeneration();
  if (generation === undefined) {
    return { ok: false, code: "no-server", error: "No tmux server is running on this socket" };
  }

  const state = loadState();
  const tracked = trackedForSocket(state);
  const owning = tracked.find(
    (session) =>
      session.id === targetValue ||
      session.windows.includes(targetValue) ||
      session.panes.some((pane) => pane.id === targetValue),
  );

  if (owning === undefined) {
    return {
      ok: false,
      code: "not-owned",
      error:
        `${targetValue} was not created by this tool on socket ${socketKey()}, so it will not be destroyed. ` +
        "This is the guard that stops a teardown reaching the operator's own sessions.",
    };
  }
  if (owning.generation !== generation) {
    return {
      ok: false,
      code: "stale-generation",
      error:
        `${targetValue} was recorded against server generation ${owning.generation} but the running server is ` +
        `${generation}. tmux restarts IDs at $0/@0/%0, so this ID now points at a different object. Refusing.`,
      recordedGeneration: owning.generation,
      currentGeneration: generation,
    };
  }

  const command = kind === "session" ? "kill-session" : kind === "window" ? "kill-window" : "kill-pane";
  const result = await tmuxExec([command, "-t", targetValue]);
  if (result.code !== 0) {
    return resultError(result, `${command} failed`, "kill-failed");
  }

  if (kind === "session") {
    state.sessions = state.sessions.filter((session) => !(session.socket === socketKey() && session.id === targetValue));
  } else if (kind === "window") {
    owning.windows = owning.windows.filter((window) => window !== targetValue);
  } else {
    owning.panes = owning.panes.filter((pane) => pane.id !== targetValue);
  }
  saveState(state);

  return { ok: true, killed: targetValue, kind, session: owning.id, generation };
}

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------

async function commandDoctor(): Promise<JsonObject> {
  const version = await runProcess(["tmux", "-V"], DEFAULT_TIMEOUT_MS);
  if (version.code !== 0) {
    return resultError(version, "tmux -V failed (is tmux installed?)", "tmux-missing");
  }

  const running = await serverRunning();
  const generation = running ? await currentGeneration() : undefined;
  const state = loadState();
  const tracked = trackedForSocket(state);

  const live: JsonValue[] = [];
  const orphaned: JsonValue[] = [];
  const warnings: string[] = [];

  for (const session of tracked) {
    if (session.generation !== generation) {
      orphaned.push({
        id: session.id,
        name: session.name,
        recordedGeneration: session.generation,
        reason: "server generation no longer matches; IDs may now point elsewhere",
        createdAt: session.createdAt,
      });
      continue;
    }
    const exists = await tmuxExec(["has-session", "-t", `=${session.name}`]);
    if (exists.code !== 0) {
      orphaned.push({ id: session.id, name: session.name, reason: "session no longer exists", createdAt: session.createdAt });
      continue;
    }

    const windowChecks: JsonValue[] = [];
    for (const windowId of session.windows) {
      const remain = await tmuxExec(["show-options", "-w", "-t", windowId, "-v", "remain-on-exit"]);
      const border = await tmuxExec(["show-options", "-w", "-t", windowId, "-v", "pane-border-status"]);
      const rename = await tmuxExec(["show-options", "-w", "-t", windowId, "-v", "allow-rename"]);
      const remainValue = remain.stdout.trim();
      const borderValue = border.stdout.trim();
      const renameValue = rename.stdout.trim();
      if (remainValue !== "on") {
        warnings.push(`${windowId} (${session.name}): remain-on-exit is ${remainValue || "off"}; an exited pane will vanish with no exit status`);
      }
      if (borderValue !== "top" && borderValue !== "bottom") {
        warnings.push(`${windowId} (${session.name}): pane-border-status is ${borderValue || "off"}; role titles are invisible`);
      }
      if (renameValue === "on") {
        warnings.push(`${windowId} (${session.name}): allow-rename is on; a pane's OSC 2 escape can clobber its role title`);
      }
      windowChecks.push({ window: windowId, remainOnExit: remainValue || "off", paneBorderStatus: borderValue || "off", allowRename: renameValue || "off" });
    }

    live.push({
      id: session.id,
      name: session.name,
      kind: session.kind,
      createdAt: session.createdAt,
      panes: session.panes.length,
      windows: windowChecks as unknown as JsonValue,
    });
  }

  // This tool never uses paste-buffer, because named buffers are server-global,
  // readable from any session, silently overwritten by a same-name load-buffer,
  // and not trimmed by buffer-limit (which only trims automatic buffers).
  // doctor still reports any that leaked from an older build or another caller.
  const buffers = await tmuxExec(["list-buffers", "-F", "#{buffer_name}"]);
  const leaked = buffers.code === 0 ? nonEmptyLines(buffers.stdout).filter((name) => name.startsWith(BUFFER_PREFIX)) : [];
  if (leaked.length > 0) {
    warnings.push(`${leaked.length} named buffer(s) with prefix ${BUFFER_PREFIX} are still on the server`);
  }
  if (orphaned.length > 0) {
    warnings.push(`${orphaned.length} tracked session(s) are orphaned; they are ignored by kill and can be cleared from the state file`);
  }
  if (process.env.TMUX !== undefined) {
    warnings.push("Running nested inside a tmux pane: this tool refuses to send keys into its own pane, and --socket targets a different server than the one hosting it");
  }

  return {
    ok: true,
    version: version.stdout.trim(),
    socket: socketKey(),
    serverRunning: running,
    generation: generation ?? null,
    nested: process.env.TMUX !== undefined,
    nestedPane: process.env.TMUX_PANE ?? null,
    statePath: statePath().replace(homedir(), "~"),
    trackedSessions: live as unknown as JsonValue,
    orphanedSessions: orphaned as unknown as JsonValue,
    leakedBuffers: leaked as unknown as JsonValue,
    warnings: warnings as unknown as JsonValue,
    usesPasteBuffer: false,
  };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function dispatch(command: string, args: ParsedArgs): Promise<JsonObject | number> {
  switch (command) {
    case "ping":
      return await commandPing();
    case "send":
      return await commandSend(args);
    case "read":
      return await commandRead(args);
    case "boot-team":
      return await commandBootTeam(args);
    case "race":
      return await commandRace(args);
    case "fleet":
      return await commandFleet(args);
    case "mini-fleet":
      return await commandMiniFleet(args);
    case "monitor":
      return await commandMonitor(args);
    case "list":
    case "tree":
      return await commandTree(args);
    case "flash":
      return await commandFlash(args);
    case "voice":
      return await commandVoice(args);
    case "kill":
      return await commandKill(args);
    case "doctor":
      return await commandDoctor();
    default:
      return { ok: false, code: "unknown-subcommand", error: `Unknown subcommand: ${command}` };
  }
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h" || argv[0] === "help") {
    console.log(usageText());
    return 0;
  }

  const command = argv[0];
  const parsed = parseArgs(argv.slice(1));

  const socketFlag = flagString(parsed, "socket") ?? process.env.TMUX_SKILL_SOCKET;
  if (socketFlag !== undefined && socketFlag.trim() !== "") {
    if (!SAFE_NAME.test(socketFlag)) {
      console.log(JSON.stringify({ ok: false, code: "bad-flag", error: `--socket must match ${SAFE_NAME.source}` }));
      return 1;
    }
    socketLabel = socketFlag;
  }

  const result = await dispatch(command, parsed);
  if (typeof result === "number") {
    return result;
  }
  console.log(JSON.stringify(result));
  return result.ok === true ? 0 : 1;
}

try {
  const code = await main();
  process.exit(code);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({ ok: false, code: "unhandled", error: message }));
  process.exit(1);
}
