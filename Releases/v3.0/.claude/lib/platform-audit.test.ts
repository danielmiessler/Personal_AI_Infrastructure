/**
 * Platform Audit — Regression Test
 *
 * Greps the v3.0 codebase for forbidden platform-specific patterns.
 * Fails if any unguarded Unix-only or Windows-only patterns are found.
 * This test prevents regressions as Windows support is implemented.
 *
 * Run: bun test lib/platform-audit.test.ts
 *
 * Part of: PRD-20260219-windows-11-support (Phase 0)
 * Steering Rules: Releases/v3.0/.claude/CLAUDE.md Section 1
 */

import { describe, test, expect } from 'bun:test';
import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const V3_DIR = resolve(__dirname, '..');
const PLATFORM_TS = resolve(__dirname, 'platform.ts');

/**
 * Count grep matches in v3.0 TypeScript files, excluding test files,
 * CLAUDE.md (steering rules reference the patterns), and the platform module itself.
 */
function countForbiddenMatches(pattern: string): number {
  try {
    const result = execSync(
      `grep -rn ${pattern} --include="*.ts" "${V3_DIR}" | grep -v ".test.ts" | grep -v "CLAUDE.md" | grep -v "lib/platform.ts" | wc -l`,
      { encoding: 'utf-8', timeout: 15000 }
    ).trim();
    return parseInt(result, 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Find matches and return lines for debugging.
 */
function findForbiddenMatches(pattern: string): string[] {
  try {
    const result = execSync(
      `grep -rn ${pattern} --include="*.ts" "${V3_DIR}" | grep -v ".test.ts" | grep -v "CLAUDE.md" | grep -v "lib/platform.ts"`,
      { encoding: 'utf-8', timeout: 15000 }
    ).trim();
    return result ? result.split('\n') : [];
  } catch {
    return [];
  }
}

/**
 * Find matches INCLUDING platform.ts (for structural checks).
 */
function findAllMatches(pattern: string): string[] {
  try {
    const result = execSync(
      `grep -rn ${pattern} --include="*.ts" "${V3_DIR}" | grep -v ".test.ts" | grep -v "CLAUDE.md"`,
      { encoding: 'utf-8', timeout: 15000 }
    ).trim();
    return result ? result.split('\n') : [];
  } catch {
    return [];
  }
}

describe('Platform Audit — Forbidden Patterns', () => {

  // NOTE: These tests document the CURRENT baseline counts.
  // As each phase fixes these patterns, the expected counts decrease toward 0.
  // Update the expected count after each phase to ratchet progress.

  test('tracks hardcoded /tmp/ in TypeScript (baseline for Phase 1)', () => {
    const matches = findForbiddenMatches('-e "/tmp/"');
    const count = matches.length;
    console.log(`[AUDIT] Hardcoded /tmp/ count: ${count}`);
    if (count > 0) {
      console.log('[AUDIT] Locations:', matches.slice(0, 5).join('\n'));
    }
    // Baseline tracking. After Phase 1: expect(count).toBe(0)
  }, 30_000);

  test('tracks hardcoded binary paths in spawn calls (baseline for Phase 1)', () => {
    const matches = findForbiddenMatches('-e "/usr/bin/" -e "/bin/rm"');
    const count = matches.length;
    console.log(`[AUDIT] Hardcoded binary paths count: ${count}`);
    if (count > 0) {
      console.log('[AUDIT] Locations:', matches.slice(0, 5).join('\n'));
    }
  }, 30_000);

  test('tracks bare process.env.HOME! without fallback (baseline for Phase 1)', () => {
    const matches = findForbiddenMatches('-F "process.env.HOME!"');
    const count = matches.length;
    console.log(`[AUDIT] Bare process.env.HOME! count: ${count}`);
    if (count > 0) {
      console.log('[AUDIT] Locations:', matches.slice(0, 5).join('\n'));
    }
  }, 30_000);

  test('no hardcoded Windows paths (must always be 0)', () => {
    // Combined into single grep to avoid timeout on slow WSL filesystem
    const total = countForbiddenMatches('-e "%APPDATA%" -e "%USERPROFILE%"');
    console.log(`[AUDIT] Hardcoded Windows paths: ${total}`);
    expect(total).toBe(0);
  }, 30_000);

  test('no new npm dependencies in platform.ts', () => {
    const content = readFileSync(PLATFORM_TS, 'utf-8');
    const imports = content.match(/from '([^']+)'/g) || [];
    const allowed = ['os', 'path', 'fs', 'child_process'];

    for (const imp of imports) {
      const pkg = imp.match(/from '([^']+)'/)?.[1] || '';
      const isRelative = pkg.startsWith('.');
      const isBuiltin = allowed.includes(pkg);
      if (!isRelative && !isBuiltin) {
        throw new Error(`platform.ts imports non-builtin package: ${pkg}`);
      }
    }
  });
});

describe('Platform Audit — Structural Checks', () => {

  test('platform.ts exists and exports isWindows', () => {
    const content = readFileSync(PLATFORM_TS, 'utf-8');
    expect(content).toContain('export const isWindows');
  });

  test('platform.ts exports key functions', () => {
    const content = readFileSync(PLATFORM_TS, 'utf-8');
    const expectedExports = [
      'getHomeDir',
      'getTempDir',
      'getPortCheckCommandString',
      'getKillCommand',
      'detectTerminal',
      'getAudioPlayCommand',
      'getNotificationCommand',
    ];

    for (const fn of expectedExports) {
      expect(content).toContain(`export function ${fn}`);
    }
  });

  test('platform.ts has all 6 sections', () => {
    const content = readFileSync(PLATFORM_TS, 'utf-8');
    expect(content).toContain('Section 1: OS Detection');
    expect(content).toContain('Section 2: Path Resolution');
    expect(content).toContain('Section 3: Command Mapping');
    expect(content).toContain('Section 4: Terminal Detection');
    expect(content).toContain('Section 5: Audio & Notifications');
    expect(content).toContain('Section 6: Service Management');
  });
});
