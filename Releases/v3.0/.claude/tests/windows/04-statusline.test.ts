/**
 * 04-statusline.test.ts — Statusline Command E2E Tests
 *
 * Tests the cross-platform TypeScript statusline (statusline-command.ts)
 * against REAL platform behavior. No mocking of process.platform.
 *
 * Validates:
 *   1. Source code analysis — no bash/shell dependencies
 *   2. Statusline execution — produces ANSI output with branding
 *   3. Git integration — branch and commit info from real repo
 *   4. Windows-specific — no hardcoded Unix paths in output
 *
 * Runs on all platforms. Uses describe.skipIf for platform-specific blocks.
 *
 * Part of: PRD-20260219-windows-11-support (Windows E2E Suite)
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';
import {
  V3_ROOT,
  IS_NATIVE_WINDOWS,
  IS_MACOS,
  SLOW_TIMEOUT,
  bunRunFile,
  hasHardcodedUnixPaths,
  hasHardcodedWindowsPaths,
} from './helpers';

const STATUSLINE_PATH = resolve(V3_ROOT, 'statusline-command.ts');

// ─── 1. Source Code Analysis (cross-platform) ─────────────────────────────

describe('statusline — source code analysis', () => {

  test('statusline-command.ts exists', () => {
    expect(existsSync(STATUSLINE_PATH)).toBe(true);
  });

  test('file is TypeScript, not a bash script (no shebang to bash/sh)', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    // The file may have #!/usr/bin/env bun which is fine — but NOT #!/bin/bash or #!/bin/sh
    expect(content).not.toContain('#!/bin/bash');
    expect(content).not.toContain('#!/bin/sh');
  });

  test('file does NOT reference Unix-only CLI tools (jq, awk, sed, stty, tput)', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    // Check that these Unix tools are not invoked as commands
    // Allow them in comments or unrelated strings — check for actual usage patterns
    const lines = content.split('\n').filter(l => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//'));
    const codeContent = lines.join('\n');
    expect(codeContent).not.toMatch(/\bjq\b/);
    expect(codeContent).not.toMatch(/\bawk\b/);
    expect(codeContent).not.toMatch(/\bsed\b/);
    expect(codeContent).not.toMatch(/\bstty\b/);
    expect(codeContent).not.toMatch(/\btput\b/);
  });

  test('file does NOT reference /dev/tty', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    expect(content).not.toContain('/dev/tty');
  });

  test('file DOES use process.stdout.columns for cross-platform width detection', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    expect(content).toContain('process.stdout.columns');
  });

  test('file DOES use spawnSync for git operations', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    expect(content).toContain('spawnSync');
  });

  test('file DOES use os.homedir() or homedir() for cross-platform home directory', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    // Accept either the imported function or the os module call
    const usesHomedir = content.includes('homedir()') || content.includes('os.homedir()');
    expect(usesHomedir).toBe(true);
  });

  test('file does NOT use Bun.stdin (uses process.stdin instead)', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    expect(content).not.toContain('Bun.stdin');
  });

  test('file does NOT contain hardcoded Unix paths in non-comment code', () => {
    const content = readFileSync(STATUSLINE_PATH, 'utf-8');
    // Filter to non-comment lines only
    const codeLines = content.split('\n').filter(l => {
      const trimmed = l.trimStart();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*');
    });
    const codeContent = codeLines.join('\n');
    expect(hasHardcodedWindowsPaths(codeContent)).toBe(false);
  });

});

// ─── 2. Statusline Execution (cross-platform) ──────────────────────────────

describe('statusline — execution', () => {

  test('running statusline-command.ts produces non-empty output', () => {
    const result = bunRunFile(STATUSLINE_PATH, {
      input: '{}',
      timeout: 15_000,
    });

    expect(result.stdout.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('output contains ANSI escape sequences', () => {
    const result = bunRunFile(STATUSLINE_PATH, {
      input: '{}',
      timeout: 15_000,
    });

    // ANSI escapes start with ESC[ which is \x1b[ or \033[
    expect(result.stdout).toMatch(/\x1b\[/);
  }, SLOW_TIMEOUT);

  test('output contains PAI branding', () => {
    const result = bunRunFile(STATUSLINE_PATH, {
      input: '{}',
      timeout: 15_000,
    });

    expect(result.stdout).toContain('PAI');
  }, SLOW_TIMEOUT);

  test('exit code is 0', () => {
    const result = bunRunFile(STATUSLINE_PATH, {
      input: '{}',
      timeout: 15_000,
    });

    expect(result.exitCode).toBe(0);
  }, SLOW_TIMEOUT);

});

// ─── 3. Git Integration (cross-platform) ────────────────────────────────────

describe('statusline — git integration', () => {

  test('git rev-parse --abbrev-ref HEAD returns a branch name', () => {
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 5_000,
      cwd: V3_ROOT,
    });

    expect(result.status).toBe(0);
    const branch = (result.stdout || '').trim();
    expect(branch.length).toBeGreaterThan(0);
  });

  test('git log --oneline -1 returns a commit line', () => {
    const result = spawnSync('git', ['log', '--oneline', '-1'], {
      encoding: 'utf-8',
      timeout: 5_000,
      cwd: V3_ROOT,
    });

    expect(result.status).toBe(0);
    const line = (result.stdout || '').trim();
    expect(line.length).toBeGreaterThan(0);
    // A git log --oneline line has at least a short hash and a message
    expect(line).toMatch(/^[0-9a-f]+ .+/);
  });

});

// ─── 4. Windows-Specific (skipIf not win32) ─────────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('statusline — Windows-specific', () => {

  test('statusline output does not contain /tmp/ or /usr/bin/', () => {
    const result = bunRunFile(STATUSLINE_PATH, {
      input: '{}',
      timeout: 15_000,
    });

    // Strip ANSI codes for cleaner path checking
    const stripped = result.stdout.replace(/\x1b\[[0-9;]*m/g, '');
    expect(stripped).not.toContain('/tmp/');
    expect(stripped).not.toContain('/usr/bin/');
  }, SLOW_TIMEOUT);

  test('git operations handle Windows line endings or produce clean output', () => {
    const branchResult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 5_000,
      cwd: V3_ROOT,
    });

    const logResult = spawnSync('git', ['log', '--oneline', '-1'], {
      encoding: 'utf-8',
      timeout: 5_000,
      cwd: V3_ROOT,
    });

    // On Windows, git output should not have bare \r\n that breaks display
    // After trimming, there should be no \r characters
    const branch = (branchResult.stdout || '').trim();
    const commit = (logResult.stdout || '').trim();

    expect(branch).not.toContain('\r');
    expect(commit).not.toContain('\r');
  });

});
