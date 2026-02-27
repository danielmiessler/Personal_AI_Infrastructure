#!/usr/bin/env bun
/**
 * ComplexityRouter.hook.test.ts — Unit tests for ComplexityRouter
 *
 * Tests all three routing tiers (HAIKU, SONNET, OPUS) plus edge cases
 * and v1.1 accuracy improvements (negation, simplicity prefix, structural anchor).
 *
 * Run: bun test Releases/v3.0/.claude/hooks/ComplexityRouter.hook.test.ts
 */

import { describe, test, expect } from 'bun:test';
import path from 'path';

const HOOK_PATH = path.join(import.meta.dir, 'ComplexityRouter.hook.ts');

function runHook(prompt: string): { stdout: string; stderr: string; exitCode: number } {
  const input = JSON.stringify({ session_id: 'test', prompt });

  const proc = Bun.spawnSync(['bun', HOOK_PATH], {
    stdin: Buffer.from(input),
    stdout: 'pipe',
    stderr: 'pipe',
  });

  return {
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
    exitCode: proc.exitCode ?? 0,
  };
}

// ── HAIKU Tier ──

describe('HAIKU tier — simple prompts', () => {
  test('greeting "hi" routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('hi');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
    expect(stdout).toContain('model="haiku"');
  });

  test('greeting "hello there" routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('hello there');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('acknowledgment "ok" routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('ok');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('acknowledgment "thanks" routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('thanks');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('rating "8" routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('8');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('rating "10" routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('10');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('single word routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('continue');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('short prompt under 40 chars routes to HAIKU', () => {
    const { stdout, exitCode } = runHook('fix the button'); // 14 chars
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });
});

// ── SONNET Tier ──

describe('SONNET tier — default (silent stdout)', () => {
  test('medium prompt routes to SONNET silently', () => {
    const { stdout, stderr, exitCode } = runHook(
      'Can you help me understand how the authentication middleware works in this codebase?'
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(''); // SONNET is silent on stdout
    expect(stderr).toContain('SONNET tier');
  });

  test('code review request routes to SONNET', () => {
    const { stdout, stderr, exitCode } = runHook(
      'Please review this function and let me know if there are any obvious issues with the logic.'
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
    expect(stderr).toContain('SONNET tier');
  });

  test('one Opus signal is not enough for OPUS — stays SONNET', () => {
    const { stdout, stderr, exitCode } = runHook(
      'Can you help me design a simple login form with proper validation and error messages?'
    );
    expect(exitCode).toBe(0);
    // Only 1 signal (design) — should still route to SONNET
    expect(stdout.trim()).toBe('');
    expect(stderr).toContain('SONNET tier');
  });

  test('bug fix request with context routes to SONNET', () => {
    const { stdout, exitCode } = runHook(
      'The user login is failing when the email has uppercase letters in it, can you find and fix this bug?'
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
  });
});

// ── OPUS Tier ──

describe('OPUS tier — high complexity (≥2 signals)', () => {
  test('architecture + comprehensive routes to OPUS', () => {
    const { stdout, exitCode } = runHook(
      'design a comprehensive architecture for the platform refactor'
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: HIGH complexity detected');
    expect(stdout).toContain('MODEL ROUTING ACTIVE');
    expect(stdout).toContain('Signals:');
  });

  test('infrastructure + strategy routes to OPUS', () => {
    const { stdout, exitCode } = runHook(
      'Create a deployment infrastructure strategy and implementation plan for the new platform'
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: HIGH complexity detected');
    expect(stdout).toContain('infrastructure');
  });

  test('refactor + comprehensive routes to OPUS', () => {
    const { stdout, exitCode } = runHook(
      'I need a comprehensive refactor of the authentication module with a new schema design'
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: HIGH complexity detected');
  });

  test('long prompt with domain keywords triggers OPUS', () => {
    const longPrompt =
      'Please analyze the current state of our codebase and provide detailed recommendations. ' +
      'I want you to look at the authentication system, the database layer, the API design, ' +
      'and the frontend architecture. For each area, identify potential improvements, ' +
      'security considerations, and performance bottlenecks. Also consider how these systems ' +
      'interact with each other and whether there are any integration issues we should address.';
    expect(longPrompt.length).toBeGreaterThan(400);

    const { stdout, exitCode } = runHook(longPrompt);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: HIGH complexity detected');
  });

  test('multiple questions with domain keywords triggers OPUS', () => {
    const { stdout, exitCode } = runHook(
      'What is the current state of the auth system? How should we redesign the architecture? ' +
      'What are the performance implications of switching to JWT? Would a comprehensive migration be worth it?'
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: HIGH complexity detected');
  });

  test('OPUS hint contains Sonnet/Opus routing guidance', () => {
    const { stdout, exitCode } = runHook(
      'design a comprehensive architecture for the platform refactor'
    );
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Sonnet orchestrates');
    expect(stdout).toContain('Task(model="opus")');
  });
});

// ── v1.1 Accuracy Improvements ──

describe('v1.1 — Negation suppression', () => {
  test('"not a comprehensive refactor" routes to SONNET', () => {
    const { stdout, stderr, exitCode } = runHook(
      'not a comprehensive refactor, just fix the null check'
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(''); // negation suppresses both signals
    expect(stderr).toContain('SONNET tier');
  });

  test('"without a comprehensive design" routes to SONNET', () => {
    const { stdout, stderr, exitCode } = runHook(
      'without a comprehensive design, just add the missing field'
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
    expect(stderr).toContain('SONNET tier');
  });
});

describe('v1.1 — Simplicity prefix suppression', () => {
  test('"quick architecture refactor" routes to SONNET', () => {
    const { stdout, stderr, exitCode } = runHook('quick architecture refactor');
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(''); // simplicity prefix suppresses both signals
    expect(stderr).toContain('SONNET tier');
  });

  test('"just a simple refactor" routes to SONNET', () => {
    const { stdout, stderr, exitCode } = runHook('just a simple refactor of the login handler');
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
    expect(stderr).toContain('SONNET tier');
  });
});

describe('v1.1 — Structural signals require domain anchor', () => {
  test('long code paste with trivial question routes to SONNET', () => {
    // >400 chars, no domain keywords
    const longPaste =
      'function processItems(items) {\n' +
      '  const results = [];\n' +
      '  for (let i = 0; i < items.length; i++) {\n' +
      '    const item = items[i];\n' +
      '    if (item.active) {\n' +
      '      results.push(item.value * 2);\n' +
      '    } else {\n' +
      '      results.push(null);\n' +
      '    }\n' +
      '  }\n' +
      '  return results.filter(x => x !== null);\n' +
      '}\n' +
      'function bar(x) {\n' +
      '  return x > 0 ? x * 3 : 0;\n' +
      '}\n' +
      'function foo() {\n' +
      '  const data = processItems([{active:true,value:5},{active:false,value:3},{active:true,value:2}]);\n' +
      '  return bar(data[0]);\n' +
      '}\n' +
      'What does foo() return?';
    expect(longPaste.length).toBeGreaterThan(400);

    const { stdout, stderr, exitCode } = runHook(longPaste);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(''); // structural signal alone not enough
    expect(stderr).toContain('SONNET tier');
  });
});

// ── Edge Cases ──

describe('Edge cases — graceful error handling', () => {
  test('empty prompt exits 0 with no stdout', () => {
    const input = JSON.stringify({ session_id: 'test', prompt: '' });
    const proc = Bun.spawnSync(['bun', HOOK_PATH], {
      stdin: Buffer.from(input),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stdout = new TextDecoder().decode(proc.stdout);
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(proc.exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
    expect(stderr).toContain('Empty prompt');
  });

  test('invalid JSON exits 0 with no stdout', () => {
    const proc = Bun.spawnSync(['bun', HOOK_PATH], {
      stdin: Buffer.from('not valid json {{{'),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stdout = new TextDecoder().decode(proc.stdout);
    const stderr = new TextDecoder().decode(proc.stderr);
    expect(proc.exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
    expect(stderr).toContain('Failed to parse');
  });

  test('user_prompt field is accepted as fallback', () => {
    const input = JSON.stringify({ session_id: 'test', user_prompt: 'hi' });
    const proc = Bun.spawnSync(['bun', HOOK_PATH], {
      stdin: Buffer.from(input),
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const stdout = new TextDecoder().decode(proc.stdout);
    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: SIMPLE task detected');
  });

  test('short prompt with complexity keywords routes to OPUS not HAIKU', () => {
    const { stdout, exitCode } = runHook('architect the platform infrastructure framework');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('COMPLEXITY ROUTER: HIGH complexity detected');
    expect(stdout).not.toContain('SIMPLE task detected');
  });
});
