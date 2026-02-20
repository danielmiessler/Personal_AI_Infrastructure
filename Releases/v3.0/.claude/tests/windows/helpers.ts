/**
 * Windows E2E Test Helpers
 *
 * Shared utilities for the Windows 11 test suite.
 * Used by both local development testing and CI.
 *
 * Run all tests: bun test tests/windows/
 */

import { spawnSync, type SpawnSyncReturns } from 'child_process';
import { dirname, resolve, join, sep } from 'path';
import { existsSync, readdirSync } from 'fs';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Root of the v3.0 .claude directory */
export const V3_ROOT = resolve(dirname(import.meta.dir), '..');

/** Hooks directory */
export const HOOKS_DIR = join(V3_ROOT, 'hooks');

/** Lib directory */
export const LIB_DIR = join(V3_ROOT, 'lib');

/** PAI-Install directory */
export const INSTALL_DIR = join(V3_ROOT, 'PAI-Install');

/** Whether we're running on actual Windows */
export const IS_NATIVE_WINDOWS = process.platform === 'win32';

/** Whether we're running on macOS */
export const IS_MACOS = process.platform === 'darwin';

/** Whether we're running on Linux (includes WSL2) */
export const IS_LINUX = process.platform === 'linux';

/** Test timeout for potentially slow operations (WSL2 filesystem, grep) */
export const SLOW_TIMEOUT = 30_000;

/** Test timeout for hook execution */
export const HOOK_TIMEOUT = 15_000;

// ─── Hook Testing ─────────────────────────────────────────────────────────────

/** All 20 hook filenames */
export const ALL_HOOKS = readdirSync(HOOKS_DIR)
  .filter(f => f.endsWith('.hook.ts'))
  .sort();

/**
 * Execute a hook with JSON stdin and capture output.
 * Simulates how Claude Code invokes hooks.
 */
export function executeHook(
  hookFile: string,
  stdinJson: Record<string, unknown>,
  timeoutMs = HOOK_TIMEOUT
): { stdout: string; stderr: string; exitCode: number | null; error?: string } {
  const hookPath = join(HOOKS_DIR, hookFile);
  if (!existsSync(hookPath)) {
    return { stdout: '', stderr: '', exitCode: null, error: `Hook not found: ${hookPath}` };
  }

  const result = spawnSync('bun', ['run', hookPath], {
    input: JSON.stringify(stdinJson),
    encoding: 'utf-8',
    timeout: timeoutMs,
    cwd: V3_ROOT,
    env: {
      ...process.env,
      // Prevent hooks from doing destructive things during tests
      PAI_TEST_MODE: '1',
    },
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status,
    error: result.error?.message,
  };
}

/**
 * Check if a hook can be imported without crashing.
 * Uses `bun -e` with a dynamic import to test module loading.
 */
export function canImportHook(hookFile: string): { ok: boolean; error?: string } {
  const hookPath = join(HOOKS_DIR, hookFile);
  // Use a temp check — import the file and exit immediately
  const result = spawnSync('bun', ['-e', `import("${hookPath.replace(/\\/g, '/')}")`], {
    encoding: 'utf-8',
    timeout: 10_000,
    cwd: V3_ROOT,
    env: {
      ...process.env,
      PAI_TEST_MODE: '1',
    },
  });

  // Exit code 0 = imported fine (even if the hook logic fails, the import succeeded)
  // Some hooks exit(0) after running; that's fine
  const ok = result.status === 0 || result.status === null; // null = timed out (interactive hook waiting for stdin)
  return {
    ok,
    error: ok ? undefined : (result.stderr || result.error?.message || `exit ${result.status}`),
  };
}

// ─── Pattern Counting ─────────────────────────────────────────────────────────

/**
 * Count forbidden pattern matches in v3.0 TypeScript files.
 * Excludes test files, CLAUDE.md, and platform.ts itself.
 * Works on both Windows (findstr) and Unix (grep).
 */
export function countForbiddenPattern(pattern: string): number {
  try {
    if (IS_NATIVE_WINDOWS) {
      // Windows: use bun's grep-like approach via a helper
      return countPatternViaBun(pattern);
    }

    // Unix: use grep
    const result = spawnSync('grep', [
      '-rn', pattern,
      '--include=*.ts',
      V3_ROOT,
    ], { encoding: 'utf-8', timeout: 15_000 });

    const lines = (result.stdout || '').split('\n').filter(line =>
      line.length > 0 &&
      !line.includes('.test.ts') &&
      !line.includes('CLAUDE.md') &&
      !line.includes('lib/platform.ts') &&
      !line.includes('tests/windows/') &&
      !line.includes('smoke-test-windows.ts')
    );
    return lines.length;
  } catch {
    return -1; // Error state
  }
}

/**
 * Cross-platform pattern counting using Bun's file reading.
 * Slower than grep but works identically on Windows and Unix.
 */
function countPatternViaBun(pattern: string): number {
  const regex = new RegExp(pattern);
  let count = 0;

  function scanDir(dir: string): void {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullPath);
          }
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.test.ts') &&
          entry.name !== 'platform.ts' &&
          entry.name !== 'smoke-test-windows.ts' &&
          !fullPath.includes('tests/windows')
        ) {
          try {
            const content = require('fs').readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
              if (regex.test(line) && !line.includes('CLAUDE.md')) {
                count++;
              }
            }
          } catch { /* skip unreadable files */ }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }

  scanDir(V3_ROOT);
  return count;
}

// ─── Path Validation ──────────────────────────────────────────────────────────

/** Check if a path uses the correct separator for the current platform */
export function hasCorrectSeparator(path: string): boolean {
  if (IS_NATIVE_WINDOWS) {
    // Windows paths should use backslash (from path.join)
    return path.includes('\\');
  }
  // Unix paths should use forward slash
  return path.includes('/');
}

/** Check if a path is absolute */
export function isAbsolutePath(path: string): boolean {
  if (IS_NATIVE_WINDOWS) {
    // C:\... or \\server\...
    return /^[A-Za-z]:\\/.test(path) || path.startsWith('\\\\');
  }
  return path.startsWith('/');
}

/** Check if a string contains hardcoded Unix paths */
export function hasHardcodedUnixPaths(content: string): boolean {
  return /\/usr\/bin\/|\/bin\/(?!ary)|\/tmp\/|\/dev\//.test(content);
}

/** Check if a string contains hardcoded Windows paths */
export function hasHardcodedWindowsPaths(content: string): boolean {
  return /C:\\\\|%APPDATA%|%USERPROFILE%/.test(content);
}

// ─── Module Import Testing ────────────────────────────────────────────────────

/**
 * Dynamically import a module and check it doesn't throw.
 * Returns the module exports or an error.
 */
export async function safeImport<T = Record<string, unknown>>(
  modulePath: string
): Promise<{ ok: true; module: T } | { ok: false; error: string }> {
  try {
    const mod = await import(modulePath) as T;
    return { ok: true, module: mod };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}

// ─── Spawn Helpers ────────────────────────────────────────────────────────────

/** Run a bun command and return the result */
export function bunRun(
  args: string[],
  options?: { cwd?: string; input?: string; timeout?: number }
): SpawnSyncReturns<string> {
  return spawnSync('bun', args, {
    encoding: 'utf-8',
    timeout: options?.timeout ?? 15_000,
    cwd: options?.cwd ?? V3_ROOT,
    input: options?.input,
    env: { ...process.env, PAI_TEST_MODE: '1' },
  });
}

/** Run a bun script file */
export function bunRunFile(
  filePath: string,
  options?: { input?: string; timeout?: number }
): { stdout: string; stderr: string; exitCode: number | null } {
  const result = bunRun(['run', filePath], options);
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status,
  };
}
