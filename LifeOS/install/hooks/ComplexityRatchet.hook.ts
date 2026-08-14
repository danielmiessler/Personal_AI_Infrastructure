#!/usr/bin/env bun
/**
 * @version 1.0.0
 *
 * ComplexityRatchet — a PostToolUse advisory that measures the complexity a
 * session ADDS and reports drift back into the live session while the work is
 * still happening. Inspired by github.com/0xwilliamortiz/ratchet: a ratchet
 * turns one way — complexity goes down or stays flat unless someone
 * deliberately turns it the other way.
 *
 * Baseline windowing is automatic here, not a stored snapshot: PostToolUse only
 * ever sees NEW edits, so every pre-existing line of debt is the baseline for
 * free. The hook measures growth from now, exactly the ratchet's "accept what's
 * already there, only new drift fires."
 *
 * v1 is ADVISE-ONLY: it emits additionalContext and never blocks. The tool has
 * already run by PostToolUse, and a measurement hook that can break an edit is
 * worse than the debt it watches. MODE is the single extension point for a
 * future guard/strict tier; leave it 'advise' until the numbers are proven.
 *
 * Fail-open is absolute: any parse, fs, or measurement error exits silently
 * (run() → null). This fires on every edit; it must never cost a keystroke.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { paiPath } from './lib/paths';

type Mode = 'advise'; // guard | strict are future tiers — not wired in v1.
const MODE: Mode = 'advise';

// Budgets. Deliberately generous: this flags blobs and dependency growth, not
// ordinary work. Tune here; there is no other source of truth for the numbers.
const BIG_EDIT_LINES = 200; // one edit adding more net lines than this → advise
const SESSION_BAND = 1000; // advise once each time cumulative net-add crosses a band

interface PostToolUseInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: unknown;
  hook_event_name?: string;
}
interface RatchetState { cumulative: number; deps: number; lastBand: number; alerted: string[]; }
interface StatePaths { dir: string; file: string; }

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 2000);
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
  } catch { return null; }
}

function sanitizeSessionId(sessionId: unknown): string {
  const raw = String(sessionId ?? '').trim();
  const safe = raw ? raw.replace(/[^A-Za-z0-9._-]/g, '_') : 'unknown';
  return safe || 'unknown';
}

function statePaths(sessionId: unknown): StatePaths {
  const dir = paiPath('MEMORY', 'STATE', 'complexity-ratchet');
  return { dir, file: join(dir, `${sanitizeSessionId(sessionId)}.json`) };
}

function readState(file: string): RatchetState {
  if (!existsSync(file)) return { cumulative: 0, deps: 0, lastBand: 0, alerted: [] };
  try {
    const p = JSON.parse(readFileSync(file, 'utf8'));
    return {
      cumulative: typeof p?.cumulative === 'number' ? p.cumulative : 0,
      deps: typeof p?.deps === 'number' ? p.deps : 0,
      lastBand: typeof p?.lastBand === 'number' ? p.lastBand : 0,
      alerted: Array.isArray(p?.alerted) ? p.alerted.filter((x: unknown) => typeof x === 'string') : [],
    };
  } catch { return { cumulative: 0, deps: 0, lastBand: 0, alerted: [] }; }
}

function persistState(paths: StatePaths, state: RatchetState): void {
  mkdirSync(paths.dir, { recursive: true });
  writeFileSync(paths.file, JSON.stringify(state, null, 2));
}

function lineCount(s: unknown): number {
  return typeof s === 'string' && s.length ? s.split('\n').length : 0;
}

// A dependency line in package.json: "name": "^1.2.3" and friends.
const DEP_LINE = /^\s*"[^"]+"\s*:\s*"[\^~>=<]*\d/;
function countNewDeps(oldStr: string, newStr: string, filePath: string): number {
  if (!/package\.json$/.test(filePath)) return 0;
  const oldDeps = new Set(oldStr.split('\n').filter((l) => DEP_LINE.test(l)).map((l) => l.trim()));
  let added = 0;
  for (const l of newStr.split('\n')) if (DEP_LINE.test(l) && !oldDeps.has(l.trim())) added += 1;
  return added;
}

interface Measure { net: number; deps: number; }
function measure(input: PostToolUseInput): Measure {
  const ti = (input.tool_input ?? {}) as Record<string, unknown>;
  const filePath = String(ti.file_path ?? '');
  const tool = input.tool_name;
  if (tool === 'Edit') {
    const oldS = String(ti.old_string ?? '');
    const newS = String(ti.new_string ?? '');
    return { net: lineCount(newS) - lineCount(oldS), deps: countNewDeps(oldS, newS, filePath) };
  }
  if (tool === 'MultiEdit') {
    const edits = Array.isArray(ti.edits) ? ti.edits : [];
    let net = 0, deps = 0;
    for (const e of edits) {
      const oldS = String((e as Record<string, unknown>)?.old_string ?? '');
      const newS = String((e as Record<string, unknown>)?.new_string ?? '');
      net += lineCount(newS) - lineCount(oldS);
      deps += countNewDeps(oldS, newS, filePath);
    }
    return { net, deps };
  }
  if (tool === 'Write') {
    // PostToolUse can't see the pre-write length, so a whole-file rewrite reads
    // as its full size. Honest approximation: Write counts its content as added.
    const content = String(ti.content ?? ti.file_text ?? '');
    return { net: lineCount(content), deps: countNewDeps('', content, filePath) };
  }
  return { net: 0, deps: 0 };
}

/** Pure. Returns an advisory line, or null. No exit, no stdout. */
export function processInput(input: PostToolUseInput, paths: StatePaths): string | null {
  const tool = input.tool_name;
  if (tool !== 'Edit' && tool !== 'Write' && tool !== 'MultiEdit') return null;
  const m = measure(input);
  const state = readState(paths.file);
  if (m.net > 0) state.cumulative += m.net;
  state.deps += m.deps;

  const notes: string[] = [];

  if (m.deps > 0) {
    const key = `dep:${state.deps}`;
    if (!state.alerted.includes(key)) {
      state.alerted.push(key);
      notes.push(`added ${m.deps} new ${m.deps === 1 ? 'dependency' : 'dependencies'} (${state.deps} this session) — a dependency is the most expensive kind of complexity to walk back; confirm it earns its keep`);
    }
  }

  if (m.net > BIG_EDIT_LINES) {
    const key = `big:${state.cumulative}`;
    if (!state.alerted.includes(key)) {
      state.alerted.push(key);
      notes.push(`this edit added ${m.net} net lines in one shot — a blob that large is usually worth a second look for something simpler`);
    }
  }

  const band = Math.floor(state.cumulative / SESSION_BAND);
  if (band > state.lastBand) {
    state.lastBand = band;
    notes.push(`net complexity this session has crossed ~${band * SESSION_BAND} added lines — the ratchet only turns down when someone turns it; make sure the growth is deliberate`);
  }

  persistState(paths, state);
  if (!notes.length || MODE !== 'advise') return null;
  return `[COMPLEXITY RATCHET] ${notes.join('; ')}.`;
}

export function run(input: PostToolUseInput): string | null {
  try { return processInput(input, statePaths(input.session_id)); }
  catch { return null; }
}

function emitAdditionalContext(message: string, eventName?: string): void {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: eventName || 'PostToolUse', additionalContext: message },
  }) + '\n');
}

// ── selftest ─────────────────────────────────────────────────────────────
function assert(cond: boolean, label: string): void { if (!cond) throw new Error(label); }
function testPaths(name: string): StatePaths {
  const dir = join(process.env.TMPDIR || process.cwd(), 'complexity-ratchet-selftest');
  return { dir, file: join(dir, `${name}.json`) };
}
function bigString(lines: number): string { return Array.from({ length: lines }, (_, i) => `line ${i}`).join('\n'); }
function runSelftest(): void {
  const stamp = `${process.pid}`;
  try {
    // Small edit stays silent.
    const p1 = testPaths(`small-${stamp}`);
    assert(processInput({ session_id: p1.file, tool_name: 'Edit', tool_input: { file_path: 'a.ts', old_string: 'x', new_string: 'x\ny' } }, p1) === null, 'small edit silent');

    // One big edit fires the blob advisory.
    const p2 = testPaths(`big-${stamp}`);
    const bigMsg = processInput({ session_id: p2.file, tool_name: 'Write', tool_input: { file_path: 'b.ts', content: bigString(250) } }, p2);
    assert(!!bigMsg && bigMsg.includes('net lines'), 'big write fires blob advisory');

    // New dependency fires the dep advisory.
    const p3 = testPaths(`dep-${stamp}`);
    const depMsg = processInput({ session_id: p3.file, tool_name: 'Edit', tool_input: { file_path: 'package.json', old_string: '  "deps": {\n', new_string: '  "deps": {\n    "left-pad": "^1.3.0"\n' } }, p3);
    assert(!!depMsg && depMsg.includes('dependency'), 'new dep fires advisory');

    // Non-edit tools ignored.
    const p4 = testPaths(`ignore-${stamp}`);
    assert(processInput({ session_id: p4.file, tool_name: 'Bash', tool_input: { command: 'ls' } }, p4) === null, 'non-edit ignored');

    // Cumulative band fires once, then stays quiet on the next small edit.
    const p5 = testPaths(`band-${stamp}`);
    const bandMsg = processInput({ session_id: p5.file, tool_name: 'Write', tool_input: { file_path: 'c.ts', content: bigString(1100) } }, p5);
    assert(!!bandMsg && bandMsg.includes('crossed'), 'session band fires');
    assert(processInput({ session_id: p5.file, tool_name: 'Edit', tool_input: { file_path: 'c.ts', old_string: 'a', new_string: 'a\nb' } }, p5) === null, 'band silent once crossed');

    // Fail-open on garbage.
    assert(parseInput('') === null && parseInput('{bad') === null, 'bad input parses to null');

    process.stdout.write('SELFTEST: PASS\n');
    process.exit(0);
  } catch (e) {
    process.stdout.write(`SELFTEST: FAIL ${e instanceof Error ? e.message : 'unknown'}\n`);
    process.exit(1);
  } finally {
    const dir = testPaths('x').dir;
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
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
