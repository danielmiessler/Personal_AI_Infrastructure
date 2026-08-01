#!/usr/bin/env bun
/**
 * @version 1.0.3
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { paiPath } from './lib/paths';
import { getISOTimestamp } from './lib/time';

interface PostToolUseInput { session_id?: string; tool_name?: string; tool_input?: unknown; tool_response?: unknown; error?: unknown; hook_event_name?: string; }
interface WindowEntry { sig: string; tool: string; failed: boolean; ts: string; }
interface LoopState { window: WindowEntry[]; alerted: string[]; seq: number; lastAlert: number; }
const COOLDOWN = 4;
interface StatePaths { dir: string; file: string; }
interface Detection { episodeKey: string; message: string; }
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
function parseInput(raw: string): PostToolUseInput | null {
  if (!raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as PostToolUseInput : null;
  } catch {
    return null;
  }
}
function sanitizeSessionId(sessionId: unknown): string {
  const raw = String(sessionId ?? '').trim();
  const safe = raw ? raw.replace(/[^A-Za-z0-9._-]/g, '_') : 'unknown';
  return safe || 'unknown';
}
function statePaths(sessionId: unknown): StatePaths {
  const dir = paiPath('MEMORY', 'STATE', 'loop-detector');
  const sessionFile = `${sanitizeSessionId(sessionId)}.json`;
  return { dir, file: paiPath('MEMORY', 'STATE', 'loop-detector', sessionFile) };
}
function isWindowEntry(item: unknown): item is WindowEntry {
  if (!item || typeof item !== 'object') return false;
  const entry = item as Record<string, unknown>;
  return typeof entry.sig === 'string' && typeof entry.tool === 'string'
    && typeof entry.failed === 'boolean' && typeof entry.ts === 'string';
}
function readState(file: string): LoopState {
  if (!existsSync(file)) return { window: [], alerted: [], seq: 0, lastAlert: 0 };
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const window = Array.isArray(parsed?.window) ? parsed.window.filter(isWindowEntry) : [];
    const alerted = Array.isArray(parsed?.alerted) ? parsed.alerted.filter((item: unknown) => typeof item === 'string') : [];
    const seq = typeof parsed?.seq === 'number' ? parsed.seq : 0;
    const lastAlert = typeof parsed?.lastAlert === 'number' ? parsed.lastAlert : 0;
    return { window, alerted, seq, lastAlert };
  } catch {
    return { window: [], alerted: [], seq: 0, lastAlert: 0 };
  }
}
function persistState(paths: StatePaths, state: LoopState): void {
  mkdirSync(paths.dir, { recursive: true });
  writeFileSync(paths.file, JSON.stringify(state, null, 2));
}
function signatureFor(input: PostToolUseInput): string {
  const tool = input.tool_name || 'unknown';
  const body = JSON.stringify(input.tool_input ?? {});
  return `${tool}:${createHash('sha256').update(body).digest('hex')}`;
}
function summarizeInput(input: unknown): string {
  const compact = JSON.stringify(input ?? {}).replace(/\s+/g, ' ');
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}
/**
 * A failed tool call does NOT emit PostToolUse — Claude Code routes it to the
 * separate PostToolUseFailure event (verified 2026-07-28: a failing Bash added
 * one line to tool-failures.jsonl and zero to tool-activity.jsonl). So reading
 * `input.error` on PostToolUse could never be true, `failed` was always false,
 * and detectHammering's `failedCount >= 3` was unreachable. The hook is now
 * registered for both events; either the error field or the event name marks
 * the entry failed.
 */
function isFailure(input: PostToolUseInput): boolean {
  if (input.hook_event_name === 'PostToolUseFailure') return true;
  return String(input.error ?? '').trim().length > 0;
}
function pushToWindow(state: LoopState, input: PostToolUseInput): void {
  state.window.push({ sig: signatureFor(input), tool: input.tool_name || 'unknown', failed: isFailure(input), ts: getISOTimestamp() });
  if (state.window.length > 20) state.window = state.window.slice(-20);
}
function detectExactRepeat(state: LoopState, input: PostToolUseInput): Detection | null {
  const sig = signatureFor(input);
  const matches = state.window.filter((entry) => entry.sig === sig);
  if (matches.length < 3) return null;
  const tool = input.tool_name || matches[matches.length - 1]?.tool || 'unknown';
  return { episodeKey: `exact:${sig}`, message: `[LOOP DETECTED] You've called ${tool} ${matches.length} times with the same input this session without progress. Last input: ${summarizeInput(input.tool_input)}.` };
}
function detectOscillation(state: LoopState): Detection | null {
  if (state.window.length < 4) return null;
  const last = state.window.slice(-4);
  const a = last[0].sig;
  const b = last[1].sig;
  const alternating = a !== b && last.every((entry, index) => entry.sig === (index % 2 === 0 ? a : b));
  if (!alternating) return null;
  return { episodeKey: `osc:${a}|${b}`, message: `[LOOP DETECTED] You're flip-flopping between ${last[0].tool} and ${last[1].tool} (a-b-a-b) without progress.` };
}
function detectHammering(state: LoopState): Detection | null {
  const byTool = new Map<string, WindowEntry[]>();
  for (const entry of state.window.slice(-8)) byTool.set(entry.tool, [...(byTool.get(entry.tool) ?? []), entry]);
  for (const [tool, entries] of byTool) {
    const failedCount = entries.filter((entry) => entry.failed).length;
    if (entries.length >= 5 && failedCount >= 3) {
      return { episodeKey: `hammer:${tool}`, message: `[LOOP DETECTED] You've hit ${tool} ${entries.length} times in quick succession and ${failedCount} failed.` };
    }
  }
  return null;
}
function firstNewDetection(state: LoopState, input: PostToolUseInput): Detection | null {
  for (const detection of [detectOscillation(state), detectExactRepeat(state, input), detectHammering(state)]) {
    if (detection && !state.alerted.includes(detection.episodeKey)) return detection;
  }
  return null;
}
function processInput(input: PostToolUseInput, paths: StatePaths): string | null {
  const state = readState(paths.file);
  pushToWindow(state, input);
  state.seq += 1;
  let detection = firstNewDetection(state, input);
  if (detection && state.lastAlert > 0 && state.seq - state.lastAlert < COOLDOWN) detection = null;
  if (detection) { state.alerted.push(detection.episodeKey); state.lastAlert = state.seq; }
  persistState(paths, state);
  return detection?.message ?? null;
}
function emitAdditionalContext(message: string, eventName?: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        // Echo the event we were actually invoked on — the hook now serves both
        // PostToolUse and PostToolUseFailure, and a mismatched name is dropped.
        hookEventName: eventName || "PostToolUse",
        additionalContext: message,
      },
    }) + "\n",
  );
}
function assertSelftest(condition: boolean, label: string): void {
  if (!condition) throw new Error(label);
}
function selftestPaths(name: string): StatePaths {
  const dir = join(process.env.TMPDIR || process.cwd(), 'loop-detector-selftest');
  return { dir, file: join(dir, `${name}.json`) };
}
function runSelftest(): void {
  const session = `selftest-${Date.now()}`;
  const paths = selftestPaths(session);
  try {
    const repeated = { session_id: session, tool_name: 'Read', tool_input: { file: 'a.ts' } };
    const messages = [processInput(repeated, paths), processInput(repeated, paths), processInput(repeated, paths)];
    assertSelftest(messages.filter(Boolean).length === 1 && Boolean(messages[2]), 'identical third trigger');
    assertSelftest(processInput(repeated, paths) === null, 'identical second trigger silent');
    const varied = selftestPaths(`${session}-varied`);
    for (let index = 0; index < 5; index += 1) {
      const message = processInput({ session_id: varied.file, tool_name: `Tool${index}`, tool_input: { index } }, varied);
      assertSelftest(message === null, 'varied no trigger');
    }
    const osc = selftestPaths(`${session}-osc`);
    const oscMsgs = [
      processInput({ session_id: osc.file, tool_name: 'Read', tool_input: { f: 'a' } }, osc),
      processInput({ session_id: osc.file, tool_name: 'Edit', tool_input: { f: 'b' } }, osc),
      processInput({ session_id: osc.file, tool_name: 'Read', tool_input: { f: 'a' } }, osc),
      processInput({ session_id: osc.file, tool_name: 'Edit', tool_input: { f: 'b' } }, osc),
    ];
    assertSelftest(Boolean(oscMsgs[3]) && oscMsgs.filter(Boolean).length === 1, 'oscillation fires at a-b-a-b');
    // Hammering: 5 calls to one tool with 3 failures. Inputs vary so the exact-
    // repeat detector stays silent and only detectHammering can fire. This case
    // was unreachable until PostToolUseFailure reached the hook.
    const ham = selftestPaths(`${session}-ham`);
    const hamMsgs = [0, 1, 2, 3, 4].map((index) =>
      processInput(
        {
          session_id: ham.file,
          tool_name: 'Bash',
          tool_input: { index },
          ...(index < 3 ? { hook_event_name: 'PostToolUseFailure', error: 'Exit code 1' } : {}),
        },
        ham,
      ),
    );
    assertSelftest(hamMsgs.some((m) => m?.includes('3 failed')), 'hammering fires on 5 calls / 3 failures');
    // Anti: the same five calls all succeeding must stay silent.
    const clean = selftestPaths(`${session}-clean`);
    const cleanMsgs = [0, 1, 2, 3, 4].map((index) =>
      processInput({ session_id: clean.file, tool_name: 'Bash', tool_input: { index } }, clean),
    );
    assertSelftest(cleanMsgs.every((m) => m === null), 'hammering silent when nothing failed');
    assertSelftest(parseInput('') === null, 'empty input');
    assertSelftest(parseInput('{not json') === null, 'malformed input');
    process.stdout.write('SELFTEST: PASS\n');
    process.exit(0);
  } catch (error) {
    const label = error instanceof Error ? error.message : 'unknown';
    process.stdout.write(`SELFTEST: FAIL ${label}\n`);
    process.exit(1);
  } finally {
    if (existsSync(paths.dir)) rmSync(paths.dir, { recursive: true, force: true });
  }
}
/** Returns the LOOP DETECTED context line, or null. Pure — no exit, no stdout. */
export function run(input: PostToolUseInput): string | null {
  try {
    return processInput(input, statePaths(input.session_id));
  } catch {
    return null;
  }
}

if (import.meta.main) {
  (async () => {
    if (process.argv.includes('--selftest')) runSelftest();
    const input = parseInput(await readStdin());
    if (input) {
      const message = run(input);
      if (message) emitAdditionalContext(message, input.hook_event_name);
    }
    process.exit(0);
  })();
}
