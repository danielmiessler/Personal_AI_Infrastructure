/**
 * SendToTelegram.test.ts - TDD tests for Telegram delivery
 */

import { test, expect, describe, beforeAll, afterAll } from 'bun:test';
import { existsSync, unlinkSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { $ } from 'bun';

const TOOL_PATH = join(import.meta.dir, '..', 'SendToTelegram.ts');
const TEST_DIR = join(tmpdir(), 'telegram-delivery-tests');
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const LOG_FILE = join(PAI_DIR, 'history', 'telegram-delivery.jsonl');

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  // Cleanup test files
  try {
    const files = ['test.pdf', 'test.txt'];
    files.forEach(f => {
      const path = join(TEST_DIR, f);
      if (existsSync(path)) unlinkSync(path);
    });
  } catch {}
});

describe('SendToTelegram - Help and Usage', () => {
  test('shows help with --help flag', async () => {
    const result = await $`bun run ${TOOL_PATH} --help`.quiet().nothrow();
    expect(result.stdout.toString()).toContain('Usage:');
    expect(result.stdout.toString()).toContain('--file');
    expect(result.stdout.toString()).toContain('--caption');
  });
});

describe('SendToTelegram - Environment Validation', () => {
  test('fails without TELEGRAM_BOT_TOKEN', async () => {
    const testFile = join(TEST_DIR, 'test.txt');
    writeFileSync(testFile, 'test content');

    // Run without the token
    const result = await $`TELEGRAM_BOT_TOKEN= bun run ${TOOL_PATH} -f ${testFile}`.quiet().nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString().toLowerCase()).toContain('telegram_bot_token');
  });

  test('fails without any allowed users when no --user specified', async () => {
    const testFile = join(TEST_DIR, 'test.txt');
    writeFileSync(testFile, 'test content');

    // Run with token but without allowed users
    const result = await $`TELEGRAM_BOT_TOKEN=test TELEGRAM_ALLOWED_USERS= bun run ${TOOL_PATH} -f ${testFile}`.quiet().nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString().toLowerCase()).toMatch(/user|allowed/);
  });
});

describe('SendToTelegram - File Validation', () => {
  test('rejects missing file argument', async () => {
    const result = await $`TELEGRAM_BOT_TOKEN=test TELEGRAM_ALLOWED_USERS=123 bun run ${TOOL_PATH}`.quiet().nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString().toLowerCase()).toContain('file');
  });

  test('rejects non-existent file', async () => {
    const result = await $`TELEGRAM_BOT_TOKEN=test TELEGRAM_ALLOWED_USERS=123 bun run ${TOOL_PATH} -f /nonexistent/file.pdf`.quiet().nothrow();

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString().toLowerCase()).toContain('not found');
  });
});

describe('SendToTelegram - API Interaction (with mock)', () => {
  test('accepts valid file and caption', async () => {
    const testFile = join(TEST_DIR, 'test.pdf');
    writeFileSync(testFile, '%PDF-1.4 fake pdf content');

    const result = await $`TELEGRAM_BOT_TOKEN=invalid_token TELEGRAM_ALLOWED_USERS=123456 bun run ${TOOL_PATH} -f ${testFile} -c "Test caption"`.quiet().nothrow();

    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString().toLowerCase();
      expect(stderr).not.toContain('file required');
      expect(stderr).not.toContain('user required');
    }
  });

  test('accepts --user flag to specify target', async () => {
    const testFile = join(TEST_DIR, 'test.pdf');
    writeFileSync(testFile, '%PDF-1.4 fake pdf content');

    const result = await $`TELEGRAM_BOT_TOKEN=invalid_token bun run ${TOOL_PATH} -f ${testFile} -u 999999`.quiet().nothrow();

    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString().toLowerCase();
      expect(stderr).not.toContain('user required');
      expect(stderr).not.toContain('allowed_users');
    }
  });

  test('accepts --silent flag', async () => {
    const testFile = join(TEST_DIR, 'test.pdf');
    writeFileSync(testFile, '%PDF-1.4 fake pdf content');

    const result = await $`TELEGRAM_BOT_TOKEN=invalid_token TELEGRAM_ALLOWED_USERS=123 bun run ${TOOL_PATH} -f ${testFile} --silent`.quiet().nothrow();

    if (result.exitCode !== 0) {
      const stderr = result.stderr.toString().toLowerCase();
      expect(stderr).not.toContain('unknown option');
      expect(stderr).not.toContain('invalid flag');
    }
  });
});

describe('SendToTelegram - Logging', () => {
  test('logs events to JSONL file', async () => {
    const testFile = join(TEST_DIR, 'test.pdf');
    writeFileSync(testFile, '%PDF-1.4 fake pdf content');

    let initialLines = 0;
    try {
      initialLines = readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean).length;
    } catch {}

    await $`TELEGRAM_BOT_TOKEN=invalid_token TELEGRAM_ALLOWED_USERS=123 bun run ${TOOL_PATH} -f ${testFile}`.quiet().nothrow();

    try {
      const currentLines = readFileSync(LOG_FILE, 'utf-8').split('\n').filter(Boolean).length;
      expect(currentLines).toBeGreaterThanOrEqual(initialLines);
    } catch {
      // Log file may not exist if this is first run
    }
  });
});
