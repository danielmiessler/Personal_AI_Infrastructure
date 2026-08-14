#!/usr/bin/env bun

import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

type RosterEntry = { name: string; sessionPath: string | null; live: boolean };

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  error: Error | null;
};

type KittyWindow = {
  env: Record<string, unknown>;
  foreground_processes: unknown[];
};

type KittyTab = {
  title: string;
  windows: KittyWindow[];
};

type KittyOsWindow = {
  tabs: KittyTab[];
};

const ansi = {
  altScreen: "\x1b[?1049h",
  normalScreen: "\x1b[?1049l",
  hideCursor: "\x1b[?25l",
  showCursor: "\x1b[?25h",
  home: "\x1b[H",
  clearToEnd: "\x1b[J",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  inverse: "\x1b[7m",
  inverseOff: "\x1b[27m",
  green: "\x1b[32m",
  faint: "\x1b[90m",
};

const sessionExtension = ".kitty-session";
const liveStateTimeoutMs = 2_000;
const actionTimeoutMs = 5_000;

const activeProcesses = new Set<ReturnType<typeof Bun.spawn>>();
const activeTimers = new Set<ReturnType<typeof setTimeout>>();
let restored = false;
let terminalEntered = false;

function homeDirectory(): string {
  const fromEnv = process.env.HOME;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv;
  } else {
    return homedir();
  }
}

function sessionsDirectory(): string {
  return join(homeDirectory(), ".config", "kitty", "sessions");
}

function projectsFilePath(): string {
  return join(homeDirectory(), ".claude", "LIFEOS", "USER", "PROJECTS.md");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function cleanProjectName(rawName: string): string {
  return rawName.replace(/\*/g, "").trim();
}

function readSessionEntries(): RosterEntry[] {
  let names: string[];
  try {
    names = readdirSync(sessionsDirectory());
  } catch (error) {
    if (isMissingPathError(error)) {
      names = [];
    } else {
      names = [];
    }
  }

  const entries: RosterEntry[] = [];
  for (const fileName of names) {
    if (fileName.endsWith(sessionExtension)) {
      const name = basename(fileName, sessionExtension).trim();
      if (name.length > 0) {
        entries.push({
          name,
          sessionPath: join(sessionsDirectory(), fileName),
          live: false,
        });
      } else {
        continue;
      }
    } else {
      continue;
    }
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function readProjectEntries(): RosterEntry[] {
  let content: string;
  try {
    content = readFileSync(projectsFilePath(), "utf8");
  } catch (error) {
    if (isMissingPathError(error)) {
      content = "";
    } else {
      content = "";
    }
  }

  const entries: RosterEntry[] = [];
  const linePattern = /^\| \*\*(.+?)\*\*/;
  for (const line of content.split(/\r?\n/)) {
    if (entries.length >= 40) {
      break;
    } else {
      const match = line.match(linePattern);
      if (match !== null && typeof match[1] === "string") {
        const name = cleanProjectName(match[1]);
        if (name.length > 0) {
          entries.push({ name, sessionPath: null, live: false });
        } else {
          continue;
        }
      } else {
        continue;
      }
    }
  }
  return entries;
}

function buildRoster(): RosterEntry[] {
  const bySlug = new Map<string, RosterEntry>();

  for (const projectEntry of readProjectEntries()) {
    const slug = slugify(projectEntry.name);
    if (slug.length > 0 && !bySlug.has(slug)) {
      bySlug.set(slug, { ...projectEntry });
    } else {
      continue;
    }
  }

  for (const sessionEntry of readSessionEntries()) {
    const slug = slugify(sessionEntry.name);
    if (slug.length === 0) {
      continue;
    } else {
      const existing = bySlug.get(slug);
      if (existing !== undefined) {
        existing.sessionPath = sessionEntry.sessionPath;
      } else {
        bySlug.set(slug, { ...sessionEntry });
      }
    }
  }

  return Array.from(bySlug.values());
}

function isMissingPathError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code?: unknown }).code === "ENOENT";
  } else {
    return false;
  }
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?()[\]{}^$|\\/]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return true;
  } else {
    return false;
  }
}

function isKittyLsShape(value: unknown): value is KittyOsWindow[] {
  if (!Array.isArray(value)) {
    return false;
  } else if (value.length === 0) {
    return true;
  } else {
    for (const osWindow of value) {
      if (!isRecord(osWindow) || !Array.isArray(osWindow.tabs)) {
        return false;
      } else {
        for (const tab of osWindow.tabs) {
          if (!isRecord(tab) || typeof tab.title !== "string" || !Array.isArray(tab.windows)) {
            return false;
          } else {
            for (const window of tab.windows) {
              if (!isRecord(window) || !isRecord(window.env) || !Array.isArray(window.foreground_processes)) {
                return false;
              } else {
                continue;
              }
            }
          }
        }
      }
    }
    return true;
  }
}

function liveSlugsFromKittyLsJson(stdout: string, entries: RosterEntry[]): Set<string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (_error) {
    return null;
  }

  if (!isKittyLsShape(parsed)) {
    return null;
  } else {
    return liveSlugsFromKittyLs(parsed, entries);
  }
}

function liveSlugsFromKittyLs(osWindows: KittyOsWindow[], entries: RosterEntry[]): Set<string> {
  const liveSlugs = new Set<string>();
  const entriesBySlug = new Map<string, RosterEntry>();
  for (const entry of entries) {
    const slug = slugify(entry.name);
    if (slug.length > 0) {
      entriesBySlug.set(slug, entry);
    } else {
      continue;
    }
  }

  for (const osWindow of osWindows) {
    for (const tab of osWindow.tabs) {
      for (const entry of entries) {
        const slug = slugify(entry.name);
        if (slug.length > 0 && tab.title.startsWith(`session:${entry.name}`)) {
          liveSlugs.add(slug);
        } else {
          continue;
        }
      }

      for (const window of tab.windows) {
        const projectSlug = window.env.KITTY_SESSION_PROJECT;
        if (typeof projectSlug === "string" && entriesBySlug.has(projectSlug)) {
          liveSlugs.add(projectSlug);
        } else {
          continue;
        }
      }
    }
  }

  return liveSlugs;
}

async function runCommandWithTimeout(args: string[], timeoutMs: number): Promise<CommandResult> {
  let processHandle: ReturnType<typeof Bun.spawn>;
  try {
    processHandle = Bun.spawn(args, {
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      timedOut: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }

  activeProcesses.add(processHandle);
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      processHandle.kill("SIGKILL");
      resolve("timeout");
    }, timeoutMs);
    activeTimers.add(timeoutHandle);
  });

  const stdoutPromise = streamToText(processHandle.stdout);
  const stderrPromise = streamToText(processHandle.stderr);
  const completedPromise = Promise.all([processHandle.exited, stdoutPromise, stderrPromise] as const);
  const result = await Promise.race([completedPromise, timeoutPromise]);

  if (timeoutHandle !== null) {
    clearTimeout(timeoutHandle);
    activeTimers.delete(timeoutHandle);
  } else {
    // The timer is always assigned synchronously before the promise can resolve.
  }

  if (result === "timeout") {
    activeProcesses.delete(processHandle);
    return {
      ok: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      timedOut,
      error: null,
    };
  } else {
    const [exitCode, stdout, stderr] = result;
    activeProcesses.delete(processHandle);
    return {
      ok: exitCode === 0,
      stdout,
      stderr,
      exitCode,
      timedOut,
      error: null,
    };
  }
}

function streamToText(stream: ReadableStream<Uint8Array> | number | undefined | null): Promise<string> {
  if (stream instanceof ReadableStream) {
    return new Response(stream).text();
  } else {
    return Promise.resolve("");
  }
}

function restore(): void {
  if (restored) {
    return;
  } else {
    restored = true;
  }

  for (const timer of activeTimers) {
    clearTimeout(timer);
  }
  activeTimers.clear();

  for (const processHandle of activeProcesses) {
    processHandle.kill("SIGKILL");
  }
  activeProcesses.clear();

  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    try {
      process.stdin.setRawMode(false);
    } catch (_error) {
      // Restore must be best-effort and never mask the original exit reason.
    }
  } else {
    // Non-TTY stdin has no raw mode to restore.
  }

  if (terminalEntered) {
    process.stdout.write(`${ansi.showCursor}${ansi.normalScreen}${ansi.reset}`);
    terminalEntered = false;
  } else {
    // Non-interactive modes never enter the alternate screen.
  }
}

function enterTerminal(): void {
  restored = false;
  terminalEntered = true;
  process.stdout.write(`${ansi.altScreen}${ansi.hideCursor}${ansi.home}${ansi.clearToEnd}`);
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    process.stdin.setRawMode(true);
  } else {
    // Tests may run without a TTY; interactive use is expected to run inside Kitty.
  }
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
}

function render(entries: RosterEntry[], selectedIndex: number, flashMessage: string | null): string {
  const lines: string[] = [];
  lines.push(`${ansi.bold}HELM DECK${ansi.reset}`);
  lines.push(`${ansi.dim}${"─".repeat(32)}${ansi.reset}`);

  if (entries.length === 0) {
    lines.push(`${ansi.dim}○ no projects${ansi.reset}`);
  } else {
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      } else {
        lines.push(renderEntry(entry, index === selectedIndex));
      }
    }
  }

  lines.push("");
  if (flashMessage !== null) {
    lines.push(`${ansi.faint}${flashMessage}${ansi.reset}`);
  } else {
    lines.push(`${ansi.faint}j/k move · enter open · q quit${ansi.reset}`);
  }

  return `${ansi.home}${ansi.clearToEnd}${lines.join("\n")}`;
}

function renderEntry(entry: RosterEntry, selected: boolean): string {
  const glyph = entry.live ? "●" : "○";
  const suffix = entry.sessionPath === null ? " (no session)" : "";
  const text = `${glyph} ${entry.name}${suffix}`;

  if (selected) {
    return `${ansi.inverse}${text}${ansi.inverseOff}${ansi.reset}`;
  } else if (entry.live) {
    return `${ansi.green}${glyph}${ansi.reset} ${entry.name}`;
  } else if (entry.sessionPath !== null) {
    return `${ansi.dim}${text}${ansi.reset}`;
  } else {
    return `${ansi.faint}${text}${ansi.reset}`;
  }
}

function clampSelection(index: number, entries: RosterEntry[]): number {
  if (entries.length === 0) {
    return 0;
  } else if (index < 0) {
    return 0;
  } else if (index >= entries.length) {
    return entries.length - 1;
  } else {
    return index;
  }
}

function describeCommandFailure(result: CommandResult): string {
  if (result.timedOut) {
    return "kitten command timed out";
  } else if (result.error !== null) {
    return result.error.message;
  } else if (result.stderr.trim().length > 0) {
    return result.stderr.trim();
  } else if (result.exitCode !== null) {
    return `kitten command exited ${result.exitCode}`;
  } else {
    return "kitten command failed";
  }
}

async function refreshLiveState(entries: RosterEntry[], repaint: () => void): Promise<void> {
  const result = await runCommandWithTimeout(["kitten", "@", "ls"], liveStateTimeoutMs);
  if (!result.ok) {
    return;
  } else {
    const liveSlugs = liveSlugsFromKittyLsJson(result.stdout, entries);
    if (liveSlugs === null) {
      return;
    } else {
      for (const entry of entries) {
        entry.live = liveSlugs.has(slugify(entry.name));
      }
      repaint();
    }
  }
}

async function actOnEntry(entry: RosterEntry): Promise<number> {
  if (entry.live) {
    const match = `title:^session:${escapeRegexLiteral(entry.name)}`;
    const result = await runCommandWithTimeout(["kitten", "@", "focus-tab", "--match", match], actionTimeoutMs);
    if (result.ok) {
      return 0;
    } else {
      process.stderr.write(`${describeCommandFailure(result)}\n`);
      return 1;
    }
  } else if (entry.sessionPath !== null) {
    const result = await runCommandWithTimeout(["kitten", "@", "action", "goto_session", entry.sessionPath], actionTimeoutMs);
    if (result.ok) {
      return 0;
    } else {
      process.stderr.write(`${describeCommandFailure(result)}\n`);
      return 1;
    }
  } else {
    return -1;
  }
}

async function runInteractive(): Promise<number> {
  const entries = buildRoster();
  let selectedIndex = clampSelection(0, entries);
  let flashMessage: string | null = null;
  let acting = false;

  const repaint = (): void => {
    process.stdout.write(render(entries, selectedIndex, flashMessage));
    flashMessage = null;
  };

  enterTerminal();
  repaint();
  void refreshLiveState(entries, repaint);

  return await new Promise<number>((resolve) => {
    const quit = (code: number): void => {
      process.stdin.off("data", onData);
      restore();
      resolve(code);
    };

    const onData = (chunk: string | Buffer): void => {
      if (acting) {
        return;
      } else {
        const key = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        void handleKey(key, entries, {
          getSelectedIndex: () => selectedIndex,
          setSelectedIndex: (nextIndex: number) => {
            selectedIndex = clampSelection(nextIndex, entries);
          },
          setFlashMessage: (message: string) => {
            flashMessage = message;
          },
          setActing: (nextActing: boolean) => {
            acting = nextActing;
          },
          repaint,
          quit,
        });
      }
    };

    process.stdin.on("data", onData);
  });
}

type KeyHandlers = {
  getSelectedIndex: () => number;
  setSelectedIndex: (index: number) => void;
  setFlashMessage: (message: string) => void;
  setActing: (acting: boolean) => void;
  repaint: () => void;
  quit: (code: number) => void;
};

async function handleKey(key: string, entries: RosterEntry[], handlers: KeyHandlers): Promise<void> {
  if (key === "j" || key === "\x1b[B") {
    handlers.setSelectedIndex(handlers.getSelectedIndex() + 1);
    handlers.repaint();
  } else if (key === "k" || key === "\x1b[A") {
    handlers.setSelectedIndex(handlers.getSelectedIndex() - 1);
    handlers.repaint();
  } else if (key === "g") {
    handlers.setSelectedIndex(0);
    handlers.repaint();
  } else if (key === "G") {
    handlers.setSelectedIndex(entries.length - 1);
    handlers.repaint();
  } else if (key === "\r" || key === "\n") {
    await handleEnter(entries, handlers);
  } else if (key === "q" || key === "\x1b" || key === "\x03") {
    handlers.quit(0);
  } else if (key.startsWith("\x1b[")) {
    handlers.repaint();
  } else {
    handlers.repaint();
  }
}

async function handleEnter(entries: RosterEntry[], handlers: KeyHandlers): Promise<void> {
  const selectedEntry = entries[handlers.getSelectedIndex()];
  if (selectedEntry === undefined) {
    handlers.setFlashMessage("no session file");
    handlers.repaint();
  } else if (!selectedEntry.live && selectedEntry.sessionPath === null) {
    handlers.setFlashMessage("no session file");
    handlers.repaint();
  } else {
    handlers.setActing(true);
    const exitCode = await actOnEntry(selectedEntry);
    if (exitCode === -1) {
      handlers.setActing(false);
      handlers.setFlashMessage("no session file");
      handlers.repaint();
    } else {
      handlers.quit(exitCode);
    }
  }
}

function installExitHandlers(): void {
  process.on("SIGINT", () => {
    restore();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    restore();
    process.exit(0);
  });

  process.on("uncaughtException", (error) => {
    restore();
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    restore();
    process.stderr.write(`${reason instanceof Error ? reason.message : String(reason)}\n`);
    process.exit(1);
  });
}

async function main(args: string[]): Promise<number> {
  const mode = args.find((arg) => arg === "--bench" || arg === "--roster");
  if (mode === "--bench") {
    const start = performance.now();
    const roster = buildRoster();
    const elapsedMs = Math.max(0, Math.round(performance.now() - start));
    process.stdout.write(`roster_ms=${elapsedMs} entries=${roster.length}\n`);
    return 0;
  } else if (mode === "--roster") {
    process.stdout.write(`${JSON.stringify(buildRoster())}\n`);
    return 0;
  } else {
    installExitHandlers();
    return await runInteractive();
  }
}

main(process.argv.slice(2))
  .then((exitCode) => {
    restore();
    process.exit(exitCode);
  })
  .catch((error: unknown) => {
    restore();
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
