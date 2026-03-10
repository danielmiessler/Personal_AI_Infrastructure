/**
 * 26-env-var-expansion.test.ts — Cross-Platform Environment Variable Expansion
 *
 * Tests the expandEnvVars() utility in platform.ts which handles
 * ${VAR} expansion in command strings across all platforms.
 *
 * Coverage:
 *   - Basic ${VAR} expansion from process.env
 *   - Undefined variables left as-is or replaced with empty string
 *   - Multiple variables in one string
 *   - Nested/recursive expansion prevention
 *   - Windows %VAR% expansion
 *   - Real PAI_DIR expansion in hook command patterns
 *   - Edge cases: empty strings, no variables, partial patterns
 *
 * Run: bun test tests/cross-platform/26-env-var-expansion.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import {
  V3_ROOT, IS_NATIVE_WINDOWS, SLOW_TIMEOUT, safeImport,
} from '../windows/helpers';

// ─── Type for the platform module ─────────────────────────────────────────────

type PlatformModule = {
  expandEnvVars: (str: string) => string;
};

let platformMod: PlatformModule | null = null;

async function getPlatform(): Promise<PlatformModule> {
  if (platformMod) return platformMod;
  const result = await safeImport<PlatformModule>('../../lib/platform');
  if (!result.ok) throw new Error(`Failed to import platform.ts: ${result.error}`);
  platformMod = result.module;
  return platformMod;
}

// ─── Section 1: Basic ${VAR} expansion ───────────────────────────────────────

describe('expandEnvVars() — basic expansion', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    // Save and set test env vars
    savedEnv.PAI_TEST_VAR = process.env.PAI_TEST_VAR;
    savedEnv.PAI_DIR = process.env.PAI_DIR;
    process.env.PAI_TEST_VAR = '/test/value';
  });

  afterAll(() => {
    // Restore env vars
    if (savedEnv.PAI_TEST_VAR === undefined) delete process.env.PAI_TEST_VAR;
    else process.env.PAI_TEST_VAR = savedEnv.PAI_TEST_VAR;
    if (savedEnv.PAI_DIR === undefined) delete process.env.PAI_DIR;
    else process.env.PAI_DIR = savedEnv.PAI_DIR;
  });

  test('expands a known env variable', async () => {
    const mod = await getPlatform();
    const result = mod.expandEnvVars('${PAI_TEST_VAR}/hooks/test.ts');
    expect(result).toBe('/test/value/hooks/test.ts');
  }, SLOW_TIMEOUT);

  test('expands HOME or USERPROFILE', async () => {
    const mod = await getPlatform();
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (process.env.HOME) {
      const result = mod.expandEnvVars('${HOME}/.claude');
      expect(result).toBe(`${home}/.claude`);
    } else if (process.env.USERPROFILE) {
      const result = mod.expandEnvVars('${USERPROFILE}/.claude');
      expect(result).toBe(`${home}/.claude`);
    }
  }, SLOW_TIMEOUT);

  test('handles string with no variables', async () => {
    const mod = await getPlatform();
    expect(mod.expandEnvVars('hello world')).toBe('hello world');
    expect(mod.expandEnvVars('')).toBe('');
    expect(mod.expandEnvVars('/usr/bin/bun')).toBe('/usr/bin/bun');
  }, SLOW_TIMEOUT);

  test('expands multiple variables in one string', async () => {
    const mod = await getPlatform();
    process.env.PAI_TEST_A = 'alpha';
    process.env.PAI_TEST_B = 'beta';
    try {
      const result = mod.expandEnvVars('${PAI_TEST_A}/${PAI_TEST_B}/end');
      expect(result).toBe('alpha/beta/end');
    } finally {
      delete process.env.PAI_TEST_A;
      delete process.env.PAI_TEST_B;
    }
  }, SLOW_TIMEOUT);

  test('undefined variables are replaced with empty string', async () => {
    const mod = await getPlatform();
    const result = mod.expandEnvVars('${DEFINITELY_NOT_A_REAL_ENV_VAR_12345}/path');
    expect(result).toBe('/path');
  }, SLOW_TIMEOUT);

  test('handles $VAR without braces (no expansion)', async () => {
    const mod = await getPlatform();
    // Only ${VAR} syntax should expand, not $VAR
    const result = mod.expandEnvVars('$PAI_TEST_VAR/hooks/test.ts');
    expect(result).toBe('$PAI_TEST_VAR/hooks/test.ts');
  }, SLOW_TIMEOUT);
});

// ─── Section 2: PAI hook command patterns ────────────────────────────────────

describe('expandEnvVars() — PAI hook command patterns', () => {
  const savedPaiDir = process.env.PAI_DIR;

  beforeAll(() => {
    process.env.PAI_DIR = IS_NATIVE_WINDOWS
      ? 'C:\\Users\\testuser\\.claude'
      : '/home/testuser/.claude';
  });

  afterAll(() => {
    if (savedPaiDir === undefined) delete process.env.PAI_DIR;
    else process.env.PAI_DIR = savedPaiDir;
  });

  test('expands PAI_DIR in hook command pattern', async () => {
    const mod = await getPlatform();
    const cmd = 'bun ${PAI_DIR}/hooks/VoiceGate.hook.ts';
    const result = mod.expandEnvVars(cmd);
    expect(result).toContain('.claude/hooks/VoiceGate.hook.ts');
    expect(result).not.toContain('${');
  }, SLOW_TIMEOUT);

  test('expands PAI_DIR in statusline command', async () => {
    const mod = await getPlatform();
    const cmd = 'bun $PAI_DIR/statusline-command.ts';
    // $PAI_DIR (no braces) — only ${} is expanded
    const result = mod.expandEnvVars(cmd);
    expect(result).toBe(cmd);
  }, SLOW_TIMEOUT);

  test('expands ${PAI_DIR} in settings.json env block pattern', async () => {
    const mod = await getPlatform();
    const envValue = '${PAI_DIR}/../.config/PAI';
    const result = mod.expandEnvVars(envValue);
    if (IS_NATIVE_WINDOWS) {
      expect(result).toContain('C:\\Users\\testuser\\.claude');
    } else {
      expect(result).toContain('/home/testuser/.claude');
    }
    expect(result).not.toContain('${PAI_DIR}');
  }, SLOW_TIMEOUT);
});

// ─── Section 3: Edge cases ───────────────────────────────────────────────────

describe('expandEnvVars() — edge cases', () => {
  test('handles adjacent variables', async () => {
    const mod = await getPlatform();
    process.env.PAI_TEST_X = 'foo';
    process.env.PAI_TEST_Y = 'bar';
    try {
      expect(mod.expandEnvVars('${PAI_TEST_X}${PAI_TEST_Y}')).toBe('foobar');
    } finally {
      delete process.env.PAI_TEST_X;
      delete process.env.PAI_TEST_Y;
    }
  }, SLOW_TIMEOUT);

  test('handles empty variable value', async () => {
    const mod = await getPlatform();
    process.env.PAI_TEST_EMPTY = '';
    try {
      expect(mod.expandEnvVars('prefix${PAI_TEST_EMPTY}suffix')).toBe('prefixsuffix');
    } finally {
      delete process.env.PAI_TEST_EMPTY;
    }
  }, SLOW_TIMEOUT);

  test('does not recursively expand', async () => {
    const mod = await getPlatform();
    process.env.PAI_TEST_REC = '${HOME}';
    try {
      const result = mod.expandEnvVars('${PAI_TEST_REC}');
      // Should get the literal "${HOME}" string, not the expanded HOME
      expect(result).toBe('${HOME}');
    } finally {
      delete process.env.PAI_TEST_REC;
    }
  }, SLOW_TIMEOUT);

  test('handles malformed patterns gracefully', async () => {
    const mod = await getPlatform();
    // Unclosed brace should be left as-is
    expect(mod.expandEnvVars('${UNCLOSED')).toBe('${UNCLOSED');
    // Empty var name
    expect(mod.expandEnvVars('${}')).toBe('${}');
    // Just dollar and brace
    expect(mod.expandEnvVars('${')).toBe('${');
  }, SLOW_TIMEOUT);

  test('preserves escaped dollar signs', async () => {
    const mod = await getPlatform();
    // Double dollar or backslash-dollar should pass through
    expect(mod.expandEnvVars('$$HOME')).toBe('$$HOME');
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Windows %VAR% expansion ──────────────────────────────────────

describe('expandEnvVars() — Windows %VAR% syntax', () => {
  test.skipIf(!IS_NATIVE_WINDOWS)('expands %USERPROFILE% on Windows', async () => {
    const mod = await getPlatform();
    const result = mod.expandEnvVars('%USERPROFILE%\\.claude');
    const expected = process.env.USERPROFILE || '';
    expect(result).toContain(expected);
    expect(result).not.toContain('%USERPROFILE%');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('expands %APPDATA% on Windows', async () => {
    const mod = await getPlatform();
    if (process.env.APPDATA) {
      const result = mod.expandEnvVars('%APPDATA%\\PAI');
      expect(result).toContain(process.env.APPDATA);
      expect(result).not.toContain('%APPDATA%');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('does NOT expand %VAR% on Unix', async () => {
    const mod = await getPlatform();
    // On Unix, %VAR% should be left as-is (it's not a Unix pattern)
    const result = mod.expandEnvVars('%HOME%/test');
    expect(result).toBe('%HOME%/test');
  }, SLOW_TIMEOUT);
});

// ─── Section 5: Real settings.json validation ────────────────────────────────

describe('settings.json hook commands expansion', () => {
  test('all hook commands in settings.json use ${VAR} pattern', () => {
    const settingsContent = require('fs').readFileSync(
      require('path').join(V3_ROOT, 'settings.json'), 'utf-8'
    );
    const settings = JSON.parse(settingsContent);

    // Collect all hook commands
    const commands: string[] = [];
    for (const [eventName, eventHooks] of Object.entries(settings.hooks || {})) {
      const hookArray = eventHooks as any[];
      for (const hookGroup of hookArray) {
        const hooks = hookGroup.hooks || [hookGroup];
        for (const hook of hooks) {
          if (hook.command) commands.push(hook.command);
        }
      }
    }

    expect(commands.length).toBeGreaterThan(0);

    // Every command with PAI_DIR should use ${PAI_DIR} pattern
    for (const cmd of commands) {
      if (cmd.includes('PAI_DIR')) {
        expect(cmd).toContain('${PAI_DIR}');
        // Should not use %PAI_DIR% (Windows cmd style) — Claude Code handles ${} uniformly
        expect(cmd).not.toContain('%PAI_DIR%');
      }
    }
  }, SLOW_TIMEOUT);

  test('expandEnvVars can process every hook command from settings.json', async () => {
    const mod = await getPlatform();
    const settingsContent = require('fs').readFileSync(
      require('path').join(V3_ROOT, 'settings.json'), 'utf-8'
    );
    const settings = JSON.parse(settingsContent);

    // Set PAI_DIR for testing
    const savedPaiDir = process.env.PAI_DIR;
    process.env.PAI_DIR = '/test/pai';
    try {
      for (const [eventName, eventHooks] of Object.entries(settings.hooks || {})) {
        const hookArray = eventHooks as any[];
        for (const hookGroup of hookArray) {
          const hooks = hookGroup.hooks || [hookGroup];
          for (const hook of hooks) {
            if (hook.command) {
              const expanded = mod.expandEnvVars(hook.command);
              // Should not contain unexpanded ${PAI_DIR}
              expect(expanded).not.toContain('${PAI_DIR}');
              // Should contain the expanded value
              if (hook.command.includes('${PAI_DIR}')) {
                expect(expanded).toContain('/test/pai');
              }
            }
          }
        }
      }
    } finally {
      if (savedPaiDir === undefined) delete process.env.PAI_DIR;
      else process.env.PAI_DIR = savedPaiDir;
    }
  }, SLOW_TIMEOUT);
});
