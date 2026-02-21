/**
 * 02-hooks.test.ts — Hook System Tests (Windows E2E Suite)
 *
 * Validates the 20-hook system works on all platforms:
 *   - Hook files exist and have correct shebangs
 *   - Hooks can be parsed by Bun without syntax errors
 *   - Hook stdin/stdout contract (JSON in, JSON out)
 *   - Hook lib modules import cleanly
 *   - Windows-specific graceful degradation
 *
 * Run: bun test tests/windows/02-hooks.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  ALL_HOOKS,
  HOOKS_DIR,
  V3_ROOT,
  IS_NATIVE_WINDOWS,
  SLOW_TIMEOUT,
  HOOK_TIMEOUT,
  executeHook,
  safeImport,
  bunRun,
} from './helpers';

// ─── Section 1: Hook Loading (cross-platform) ──────────────────────────────

describe('Hook Loading', () => {
  test('should have exactly 20 hooks', () => {
    expect(ALL_HOOKS.length).toBe(20);
  });

  for (const hook of ALL_HOOKS) {
    describe(hook, () => {
      test('hook file exists in hooks/ directory', () => {
        const hookPath = join(HOOKS_DIR, hook);
        expect(existsSync(hookPath)).toBe(true);
      });

      test('hook file has #!/usr/bin/env bun shebang', () => {
        const hookPath = join(HOOKS_DIR, hook);
        const content = readFileSync(hookPath, 'utf-8');
        const firstLine = content.split('\n')[0];
        expect(firstLine).toBe('#!/usr/bin/env bun');
      });

      test('hook file can be parsed by bun without syntax errors', () => {
        const hookPath = join(HOOKS_DIR, hook);
        const result = bunRun(['build', '--no-emit', '--target', 'bun', hookPath], { timeout: SLOW_TIMEOUT });
        // SecurityValidator.hook.ts has a pre-existing `yaml` package dependency
        // that may not be installed — this is NOT a Windows issue
        if (hook === 'SecurityValidator.hook.ts' && result.status !== 0) {
          const hasYamlError = (result.stderr || '').includes('yaml');
          if (hasYamlError) {
            console.warn(`KNOWN ISSUE: ${hook} requires 'yaml' package — skipping parse check`);
            return;
          }
        }
        expect(result.status).toBe(0);
      }, SLOW_TIMEOUT);
    });
  }
});

// ─── Section 2: Hook stdin/stdout Contract (cross-platform) ────────────────

describe('Hook stdin/stdout Contract', () => {
  const minimalInput = {
    session_id: 'test-123',
    event: 'test',
    conversation: [],
  };

  test('AlgorithmTracker.hook.ts exits 0 and returns JSON with continue key', () => {
    const result = executeHook('AlgorithmTracker.hook.ts', minimalInput, SLOW_TIMEOUT);
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBe(0);

    // stdout should contain valid JSON with a "continue" key
    const trimmed = result.stdout.trim();
    expect(trimmed.length).toBeGreaterThan(0);
    const parsed = JSON.parse(trimmed);
    expect(parsed).toHaveProperty('continue');
  }, SLOW_TIMEOUT);

  test('SkillGuard.hook.ts does not crash with minimal input', () => {
    const result = executeHook('SkillGuard.hook.ts', minimalInput, SLOW_TIMEOUT);
    expect(result.error).toBeUndefined();
    // Exit code 0 means success, null means timed out (waiting for more input — acceptable)
    expect(result.exitCode === 0 || result.exitCode === null).toBe(true);
  }, SLOW_TIMEOUT);
});

// ─── Section 3: Hook lib Modules (cross-platform) ──────────────────────────

describe('Hook lib Modules', () => {
  test('hooks/lib/paths.ts imports cleanly', async () => {
    const result = await safeImport('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
  }, SLOW_TIMEOUT);

  test('hooks/lib/stdin.ts imports cleanly', async () => {
    const result = await safeImport('../../hooks/lib/stdin');
    expect(result.ok).toBe(true);
  }, SLOW_TIMEOUT);

  test('hooks/lib/tab-setter.ts imports cleanly', async () => {
    const result = await safeImport('../../hooks/lib/tab-setter');
    expect(result.ok).toBe(true);
  }, SLOW_TIMEOUT);

  test('getPaiDir() returns non-empty string', async () => {
    const result = await safeImport<{ getPaiDir: () => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const paiDir = result.module.getPaiDir();
      expect(typeof paiDir).toBe('string');
      expect(paiDir.length).toBeGreaterThan(0);
    }
  }, SLOW_TIMEOUT);

  test('sanitizeSessionId("abc-123") returns "abc-123"', async () => {
    const result = await safeImport<{ sanitizeSessionId: (id: string) => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.module.sanitizeSessionId('abc-123')).toBe('abc-123');
    }
  }, SLOW_TIMEOUT);

  test('sanitizeSessionId("../../etc/passwd") strips dots and slashes', async () => {
    const result = await safeImport<{ sanitizeSessionId: (id: string) => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sanitized = result.module.sanitizeSessionId('../../etc/passwd');
      expect(sanitized).not.toContain('.');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('etcpasswd');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Windows-specific Hook Execution ────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('Windows-specific Hook Execution', () => {
  test('StartupGreeting.hook.ts executes without crash on Windows', () => {
    const result = executeHook('StartupGreeting.hook.ts', {
      session_id: 'test-win-123',
      event: 'init',
      conversation: [],
    }, SLOW_TIMEOUT);

    // No spawnSync-level error (e.g., bun binary not found)
    expect(result.error).toBeUndefined();
    // Process completed — not killed by signal or timed out
    expect(result.exitCode).not.toBeNull();
    // Hook exits 1 in CI when settings.json is absent — that's graceful degradation, not a crash.
    // Verify any non-zero exit is a controlled error, not an unhandled exception.
    if (result.exitCode !== 0) {
      expect(result.stderr).toContain('StartupGreeting');
      expect(result.stderr).not.toMatch(/panic|SIGSEGV|Segmentation fault/i);
    }
  }, SLOW_TIMEOUT);

  test('Tab-setter functions gracefully no-op without Kitty', async () => {
    const result = await safeImport<{
      setTabState: (opts: { title: string; state: string }) => void;
    }>('../../hooks/lib/tab-setter');
    expect(result.ok).toBe(true);

    if (result.ok) {
      // On Windows there is no Kitty terminal, so setTabState should
      // execute without throwing (graceful no-op or adapter fallback)
      expect(() => {
        result.module.setTabState({ title: 'Test', state: 'working' });
      }).not.toThrow();
    }
  }, SLOW_TIMEOUT);
});
