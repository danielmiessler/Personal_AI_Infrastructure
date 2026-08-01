#!/usr/bin/env bun
/**
 * @version 1.0.1
 * ConfigEvalFire — PostToolUse(Write|Edit) hook that fires the {{DA_NAME}} behavioural
 * regression suite when a behaviour-defining file changes.
 *
 * "Integrated into the harness": editing the system prompt, DA/principal identity,
 * CLAUDE.md, OPERATIONAL_RULES, or a hook can silently shift {{DA_NAME}}'s dispositions
 * (verify-before-done, concision/voice, no-fabricated-confidence, lead-with-answer).
 * This catches that at the moment of the change. It NEVER blocks the edit — it
 * debounces and spawns LIFEOS/TOOLS/ConfigEvalOnChange.ts detached, then exits 0.
 *
 * Billing: the spawned process deletes ANTHROPIC_API_KEY/AUTH_TOKEN and CLAUDECODE
 * so the eval runs on the subscription via Inference.ts, and nested bun is allowed.
 *
 * Failure mode: any error logs to stderr and exits 0 (never block a tool call).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { isSubagentContext as isSubagent } from './lib/subagent';

const CLAUDE_ROOT = resolve(homedir(), '.claude');
const RUNNER = resolve(CLAUDE_ROOT, 'LIFEOS/TOOLS/ConfigEvalOnChange.ts');
const STATE = resolve(CLAUDE_ROOT, 'LIFEOS/MEMORY/OBSERVABILITY/config-eval-state.json');
const DEBOUNCE_MINUTES = 5;

// Substrings that mark a file as behaviour-defining.
const SENTINELS = [
  'LIFEOS/LIFEOS_SYSTEM_PROMPT.md',
  'DIGITAL_ASSISTANT/DA_IDENTITY.md',
  'PRINCIPAL/PRINCIPAL_IDENTITY.md',
  'CONFIG/OPERATIONAL_RULES.md',
  '.hook.ts',
];
// CLAUDE.md matched separately (exact basename, any dir).
function isSentinel(path: string): boolean {
  if (SENTINELS.some((s) => path.includes(s))) return true;
  return /(^|\/)CLAUDE\.md$/.test(path);
}

function readInput(): { filePath: string | null } {
  try {
    const raw = readFileSync(0, 'utf8');
    if (!raw.trim()) return { filePath: null };
    const j = JSON.parse(raw);
    const fp = j?.tool_input?.file_path;
    return { filePath: typeof fp === 'string' ? fp : null };
  } catch {
    return { filePath: null };
  }
}

function minutesSince(iso: string | null): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : (Date.now() - t) / 60_000;
}

function loadLastFire(): string | null {
  try {
    return existsSync(STATE) ? (JSON.parse(readFileSync(STATE, 'utf8')).last_fire ?? null) : null;
  } catch {
    return null;
  }
}

function saveLastFire(iso: string): void {
  mkdirSync(dirname(STATE), { recursive: true });
  const tmp = `${STATE}.tmp`;
  writeFileSync(tmp, JSON.stringify({ last_fire: iso }, null, 2) + '\n');
  renameSync(tmp, STATE);
}

function main(): void {
  try {
    if (isSubagent()) process.exit(0);

    const { filePath } = readInput();
    if (!filePath || !isSentinel(filePath)) process.exit(0);
    if (minutesSince(loadLastFire()) < DEBOUNCE_MINUTES) process.exit(0);
    if (!existsSync(RUNNER)) process.exit(0);

    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;
    delete env.CLAUDECODE;

    // Pass a short trigger label (basename) for the notification.
    const label = filePath.split('/').slice(-1)[0];
    const proc = spawn('bun', [RUNNER, label], { env, stdio: 'ignore', detached: true });
    proc.unref();
    saveLastFire(new Date().toISOString());
  } catch (e) {
    process.stderr.write(`ConfigEvalFire error: ${(e as Error)?.message || String(e)}\n`);
  }
  process.exit(0);
}

main();
