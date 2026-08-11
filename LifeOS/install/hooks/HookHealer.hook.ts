#!/usr/bin/env bun
/**
 * @version 1.1.0
 * HookHealer.hook.ts - Self-healing for the registered-script exec-bit class,
 * plus the orphaned-hook lane (a script on disk that no event ever reaches).
 *
 * PURPOSE:
 * The Write tool creates files mode 0644. A hook registered in settings as a
 * direct-exec command ("$HOME/.claude/hooks/X.hook.ts") then fails every
 * invocation with "/bin/sh: Permission denied" until someone notices.
 * This hook detects and repairs that class automatically.
 *
 * The orphan lane (1.1.0) catches the opposite problem: a hook that ships, gets
 * documented as if it were running, and is wired to nothing. Six of them were
 * sitting in here like that (public issue #1817) — the README table and the
 * wiring diagram both described them as live. Nobody had ever compared the
 * files on disk against what's actually registered, so it went unnoticed until
 * someone audited the manifest by hand.
 *
 * MODES:
 * - (default)  SessionStart sweep: every script directly executed by a
 *              settings hook command (first token of each command segment)
 *              must exist and be executable. Missing exec bit -> chmod +x.
 *              Missing file / missing shebang -> surfaced warning only.
 *              Then the orphan lane over ~/.claude/hooks (warning only).
 * - --posttool PostToolUse(Write|Edit) ingestion guard: a written file under
 *              ~/.claude whose content starts with "#!" gets its exec bit
 *              immediately - heals at the ingestion point.
 *
 * SAFETY:
 * - chmod containment: only ever touches paths under ~/.claude
 * - non-blocking: exits 0 on every path, including internal errors
 * - registered via "bun <path>" so it is immune to losing its own exec bit
 * - the orphan lane never fixes anything, it just tells you. Deciding when a
 *   hook should fire is a human call, and auto-registering something would be
 *   a worse bug than the one we're reporting.
 *
 * OUTPUTS:
 * - MEMORY/OBSERVABILITY/hook-healer.jsonl (heal/warning/orphan events)
 * - stdout "🩹 HookHealer: ..." line when something was healed or needs attention
 *
 * PERFORMANCE: <50ms for the exec-bit sweep (two JSON reads + stat per
 * registered path). The orphan lane adds one directory listing plus a read of
 * each hook file (~570KB across the shipped tree) for the import scan.
 */

import {
  existsSync, readFileSync, chmodSync, statSync, appendFileSync,
  mkdirSync, openSync, readSync, closeSync, realpathSync, readdirSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');
const HOOKS_DIR = join(CLAUDE_DIR, 'hooks');
const OBS_DIR = join(CLAUDE_DIR, 'LIFEOS', 'MEMORY', 'OBSERVABILITY');
const LOG_FILE = join(OBS_DIR, 'hook-healer.jsonl');
const SETTINGS_FILES = ['settings.json', 'settings.local.json'];

function log(event: Record<string, unknown>): void {
  try {
    if (!existsSync(OBS_DIR)) mkdirSync(OBS_DIR, { recursive: true });
    appendFileSync(LOG_FILE, JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n', 'utf-8');
  } catch {
    // Observability must never break healing
  }
}

function isExecutable(p: string): boolean {
  try { return (statSync(p).mode & 0o111) !== 0; } catch { return false; }
}

function hasShebang(p: string): boolean {
  try {
    const fd = openSync(p, 'r');
    const buf = Buffer.alloc(2);
    readSync(fd, buf, 0, 2, 0);
    closeSync(fd);
    return buf.toString('utf-8') === '#!';
  } catch { return false; }
}

/**
 * chmod +x with containment: only paths whose RESOLVED target lives under
 * ~/.claude (chmod follows symlinks — a link inside pointing outside must
 * never be healed), only when needed.
 */
function heal(p: string, source: string): boolean {
  if (!p.startsWith(CLAUDE_DIR + '/')) return false;
  if (!existsSync(p) || isExecutable(p)) return false;
  try {
    const realClaudeDir = realpathSync(CLAUDE_DIR);
    const real = realpathSync(p);
    if (!real.startsWith(realClaudeDir + '/')) {
      log({ event: 'containment-refused', path: p, resolved: real, source });
      return false;
    }
    chmodSync(real, statSync(real).mode | 0o111);
    log({ event: 'healed', path: real, source });
    console.error(`[HookHealer] chmod +x ${real}`);
    return true;
  } catch (err) {
    log({ event: 'heal-failed', path: p, source, error: String(err) });
    return false;
  }
}

function expandHome(token: string): string {
  return token.replace(/^\$HOME/, homedir()).replace(/^~(?=\/)/, homedir());
}

/**
 * Every (event, command) pair from the settings files. Read once and used by
 * both lanes below.
 *
 * We keep the event name rather than just the command because a hook can be
 * registered on one event while its header says it runs on three — and if you
 * only compare script names, that looks perfectly wired.
 */
function registeredCommands(): Array<{ event: string; command: string }> {
  const out: Array<{ event: string; command: string }> = [];
  for (const name of SETTINGS_FILES) {
    const file = join(CLAUDE_DIR, name);
    if (!existsSync(file)) continue;
    let parsed: { hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>> };
    try {
      parsed = JSON.parse(readFileSync(file, 'utf-8'));
    } catch {
      log({ event: 'settings-parse-failed', file });
      continue;
    }
    for (const [event, groups] of Object.entries(parsed.hooks ?? {})) {
      for (const group of groups ?? []) {
        for (const hook of group?.hooks ?? []) {
          if (typeof hook?.command === 'string') out.push({ event, command: hook.command });
        }
      }
    }
  }
  return out;
}

/**
 * Collect scripts that settings hook commands execute DIRECTLY (first token
 * of each command segment). Scripts passed as arguments to bun/sh are
 * deliberately excluded - their exec bit is irrelevant.
 */
function directExecPaths(registered: Array<{ command: string }>): Set<string> {
  const paths = new Set<string>();
  for (const { command } of registered) {
    for (const segment of command.split(/;|&&|\|\|/)) {
      const first = segment.trim().split(/\s+/)[0] ?? '';
      const p = expandHome(first);
      if (/\.(ts|js|sh)$/.test(p) && p.startsWith(CLAUDE_DIR + '/')) paths.add(p);
    }
  }
  return paths;
}

/** The event names a header might mention. Longest first, so "PostToolUse"
 *  doesn't match inside "PostToolUseFailure". */
const HOOK_EVENTS = [
  'PostToolUseFailure', 'UserPromptSubmit', 'PermissionRequest', 'SubagentStop',
  'SessionStart', 'SessionEnd', 'PostToolUse', 'PreToolUse', 'ConfigChange',
  'TaskCreated', 'StopFailure', 'Notification', 'PreCompact', 'Stop',
] as const;

/** Every hook script sitting in the hooks dir. */
function hookFilesOnDisk(): string[] {
  try {
    return readdirSync(HOOKS_DIR)
      .filter((f: string) => /\.hook\.(ts|sh)$/.test(f))
      .sort();
  } catch {
    return [];
  }
}

/**
 * One pass over the hook files, pulling out two things: which hooks get
 * imported by another hook, and which events each header says it runs on.
 *
 * The import part matters most. Plenty of hooks here are deliberately
 * registered nowhere because a dispatcher calls them directly (FormatGate is
 * called by StopGates, LoadMemory by MemoryTurnStart, and so on). Those are
 * fine, and flagging them would just train everyone to ignore the warning.
 */
function scanHookSources(files: string[]): {
  imported: Set<string>;
  declared: Map<string, string[]>;
} {
  const imported = new Set<string>();
  const declared = new Map<string, string[]>();
  for (const file of files) {
    const base = file.replace(/\.hook\.(ts|sh)$/, '');
    let src: string;
    try {
      src = readFileSync(join(HOOKS_DIR, file), 'utf-8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(/from\s+['"]\.\/([A-Za-z0-9_-]+)\.hook['"]/g)) {
      if (m[1] && m[1] !== base) imported.add(m[1]);
    }
    // Only an explicit TRIGGER: line counts. Headers mention event names in
    // passing all the time, and treating that as a claim about wiring made
    // this too noisy to be worth reading.
    const trigger = src.match(/^[ \t]*\*?[ \t]*TRIGGERS?:[ \t]*(.*)$/m)?.[1] ?? '';
    if (trigger) {
      const events = HOOK_EVENTS.filter((e) => new RegExp(`\\b${e}\\b`).test(trigger));
      if (events.length > 0) declared.set(base, events);
    }
  }
  return { imported, declared };
}

/**
 * Two things to report: hooks nothing ever fires, and hooks that fire on some
 * of the events their header claims but not all of them. Warnings only — we
 * never register anything automatically, because picking when a hook runs is a
 * judgement call and guessing wrong is worse than the gap we found.
 */
function orphanLane(registered: Array<{ event: string; command: string }>): string[] {
  const files = hookFilesOnDisk();
  if (files.length === 0) return [];

  // hook name -> the events it's actually wired to
  const eventsFor = new Map<string, Set<string>>();
  for (const { event, command } of registered) {
    for (const m of command.matchAll(/([A-Za-z0-9_-]+)\.hook\.(?:ts|sh)\b/g)) {
      const base = m[1] as string;
      if (!eventsFor.has(base)) eventsFor.set(base, new Set());
      (eventsFor.get(base) as Set<string>).add(event);
    }
  }

  const { imported, declared } = scanHookSources(files);
  const warnings: string[] = [];

  for (const file of files) {
    const base = file.replace(/\.hook\.(ts|sh)$/, '');
    const live = eventsFor.get(base);

    if (!live || live.size === 0) {
      if (imported.has(base)) continue; // a dispatcher calls it, so it's fine
      warnings.push(`orphan (registered on no event): ${file}`);
      log({ event: 'orphan', hook: file, declared: declared.get(base) ?? [], source: 'sweep' });
      continue;
    }

    // Same deal here: if a dispatcher calls it, it can run on events it has no
    // registration for, so comparing against the header would be wrong.
    if (imported.has(base)) continue;
    const missing = (declared.get(base) ?? []).filter((e) => !live.has(e));
    if (missing.length > 0) {
      warnings.push(`declares ${missing.join('+')} but is not registered there: ${file}`);
      log({ event: 'event-drift', hook: file, missing, registered: [...live], source: 'sweep' });
    }
  }
  return warnings;
}

function sweep(): void {
  const healed: string[] = [];
  const warnings: string[] = [];
  const registered = registeredCommands();
  for (const p of [...directExecPaths(registered)].sort()) {
    if (!existsSync(p)) {
      warnings.push(`missing: ${p}`);
      log({ event: 'missing', path: p, source: 'sweep' });
      continue;
    }
    if (!hasShebang(p)) {
      warnings.push(`no shebang: ${p}`);
      log({ event: 'no-shebang', path: p, source: 'sweep' });
    }
    if (heal(p, 'sweep')) healed.push(p);
  }
  warnings.push(...orphanLane(registered));
  if (healed.length > 0 || warnings.length > 0) {
    const short = (s: string) => s.replace(CLAUDE_DIR + '/', '');
    const parts: string[] = [];
    if (healed.length > 0) parts.push(`healed (chmod +x): ${healed.map(short).join(', ')}`);
    if (warnings.length > 0) parts.push(`needs attention: ${warnings.map(short).join('; ')}`);
    console.log(`🩹 HookHealer: ${parts.join(' | ')}`);
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 2000);
    // 10MB cap — unbounded buffering risked multi-GB allocation on a fast stream (public issue #1533, @christauff)
    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > 10_000_000) { clearTimeout(timer); try { process.stdin.pause(); } catch {} resolve(data); }
    });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
  });
}

async function posttool(): Promise<void> {
  const input = await readStdin();
  if (!input.trim()) return;
  let data: { tool_input?: { file_path?: string } };
  try { data = JSON.parse(input); } catch { return; }
  const fp = data?.tool_input?.file_path;
  if (typeof fp !== 'string') return;
  if (!fp.startsWith(CLAUDE_DIR + '/')) return;
  if (existsSync(fp) && hasShebang(fp) && !isExecutable(fp)) heal(fp, 'posttool');
}

async function main(): Promise<void> {
  try {
    if (process.argv.includes('--posttool')) {
      await posttool();
    } else {
      sweep();
    }
  } catch (err) {
    log({ event: 'internal-error', error: String(err) });
    console.error(`[HookHealer] Error: ${err}`);
  }
  process.exit(0);
}

main();
