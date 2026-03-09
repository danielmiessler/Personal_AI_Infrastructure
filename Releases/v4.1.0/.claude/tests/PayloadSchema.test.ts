/**
 * PayloadSchema.test.ts — Validation tests for Claude Code hook payloads
 *
 * Run: bun test ./.claude/tests/PayloadSchema.test.ts
 */

import { test, expect, describe } from 'bun:test';
import { validatePayload } from '../hooks/lib/payload-schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

function base(event: string) {
  return { session_id: 'sess-abc', hook_event_name: event };
}

// ── Non-object payloads ───────────────────────────────────────────────────────

describe('invalid payload shape', () => {
  test('null payload is invalid', () => {
    const r = validatePayload(null);
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('(payload)');
  });

  test('string payload is invalid', () => {
    const r = validatePayload('hello');
    expect(r.valid).toBe(false);
  });

  test('array payload is invalid', () => {
    const r = validatePayload([1, 2, 3]);
    expect(r.valid).toBe(false);
  });
});

// ── Missing hook_event_name ───────────────────────────────────────────────────

describe('missing hook_event_name', () => {
  test('empty object is invalid', () => {
    const r = validatePayload({});
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('hook_event_name');
  });

  test('missing hook_event_name with other fields is invalid', () => {
    const r = validatePayload({ session_id: 'abc', prompt: 'hi' });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('hook_event_name');
  });
});

// ── Unknown event ─────────────────────────────────────────────────────────────

describe('unknown event', () => {
  test('unknown event is valid (fail-open)', () => {
    const r = validatePayload({ ...base('FutureEvent'), extra: 'data' });
    expect(r.valid).toBe(true);
  });

  test('unknown event produces a warning', () => {
    const r = validatePayload({ ...base('FutureEvent') });
    expect(r.warnings.some(w => w.includes('Unknown'))).toBe(true);
  });
});

// ── UserPromptSubmit ──────────────────────────────────────────────────────────

describe('UserPromptSubmit', () => {
  test('valid minimal payload', () => {
    const r = validatePayload({ ...base('UserPromptSubmit'), prompt: 'hello' });
    expect(r.valid).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  test('valid payload with optional cwd', () => {
    const r = validatePayload({ ...base('UserPromptSubmit'), prompt: 'hi', cwd: '/home/user' });
    expect(r.valid).toBe(true);
  });

  test('missing prompt is invalid', () => {
    const r = validatePayload({ ...base('UserPromptSubmit') });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('prompt');
  });

  test('missing session_id is invalid', () => {
    const r = validatePayload({ hook_event_name: 'UserPromptSubmit', prompt: 'hi' });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('session_id');
  });

  test('wrong type for prompt produces warning but stays valid', () => {
    const r = validatePayload({ ...base('UserPromptSubmit'), prompt: 42 });
    expect(r.warnings.some(w => w.includes('prompt'))).toBe(true);
  });
});

// ── Stop ─────────────────────────────────────────────────────────────────────

describe('Stop', () => {
  test('valid minimal payload', () => {
    const r = validatePayload({ ...base('Stop'), transcript_path: '/tmp/t.jsonl' });
    expect(r.valid).toBe(true);
  });

  test('valid payload with all optional fields', () => {
    const r = validatePayload({
      ...base('Stop'),
      transcript_path: '/tmp/t.jsonl',
      stop_hook_active: true,
      last_assistant_message: 'Done.',
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  test('missing transcript_path is invalid', () => {
    const r = validatePayload({ ...base('Stop') });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('transcript_path');
  });

  test('missing optional fields does not affect validity', () => {
    const r = validatePayload({ ...base('Stop'), transcript_path: '/tmp/t.jsonl' });
    expect(r.valid).toBe(true);
    expect(r.missing).toHaveLength(0);
  });
});

// ── SessionStart ──────────────────────────────────────────────────────────────

describe('SessionStart', () => {
  test('valid minimal payload', () => {
    const r = validatePayload({ ...base('SessionStart') });
    expect(r.valid).toBe(true);
  });

  test('extra fields are ignored', () => {
    const r = validatePayload({ ...base('SessionStart'), extra_field: 'ok' });
    expect(r.valid).toBe(true);
  });
});

// ── SessionEnd ────────────────────────────────────────────────────────────────

describe('SessionEnd', () => {
  test('valid payload', () => {
    const r = validatePayload({ ...base('SessionEnd'), transcript_path: '/tmp/t.jsonl' });
    expect(r.valid).toBe(true);
  });

  test('missing transcript_path is invalid', () => {
    const r = validatePayload({ ...base('SessionEnd') });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('transcript_path');
  });
});

// ── PreToolUse ────────────────────────────────────────────────────────────────

describe('PreToolUse', () => {
  test('valid payload', () => {
    const r = validatePayload({
      ...base('PreToolUse'),
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    });
    expect(r.valid).toBe(true);
  });

  test('missing tool_name is invalid', () => {
    const r = validatePayload({ ...base('PreToolUse'), tool_input: {} });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('tool_name');
  });

  test('missing tool_input is invalid', () => {
    const r = validatePayload({ ...base('PreToolUse'), tool_name: 'Bash' });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('tool_input');
  });

  test('missing both required fields lists both', () => {
    const r = validatePayload({ ...base('PreToolUse') });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('tool_name');
    expect(r.missing).toContain('tool_input');
  });
});

// ── PostToolUse ───────────────────────────────────────────────────────────────

describe('PostToolUse', () => {
  test('valid payload without optional tool_response', () => {
    const r = validatePayload({
      ...base('PostToolUse'),
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/x', content: 'hi' },
    });
    expect(r.valid).toBe(true);
  });

  test('valid payload with tool_response', () => {
    const r = validatePayload({
      ...base('PostToolUse'),
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/x', content: 'hi' },
      tool_response: { success: true },
    });
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  test('missing tool_name is invalid', () => {
    const r = validatePayload({
      ...base('PostToolUse'),
      tool_input: {},
    });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('tool_name');
  });
});

// ── ValidationResult shape ────────────────────────────────────────────────────

describe('result shape', () => {
  test('valid result has empty missing and warnings arrays', () => {
    const r = validatePayload({ ...base('SessionStart') });
    expect(Array.isArray(r.missing)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.missing).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  test('multiple missing fields all appear in missing array', () => {
    const r = validatePayload({ hook_event_name: 'UserPromptSubmit' });
    expect(r.valid).toBe(false);
    expect(r.missing).toContain('session_id');
    expect(r.missing).toContain('prompt');
  });
});
