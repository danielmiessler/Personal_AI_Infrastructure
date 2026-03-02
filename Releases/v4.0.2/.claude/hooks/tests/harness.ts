/**
 * harness.ts — Test harness for PAI hook integration tests
 *
 * Spawns hooks as subprocesses with mock stdin, captures stdout/stderr/exit code.
 * Uses temp dirs for side effects to avoid polluting real state.
 *
 * Requirements: Bun runtime (bun:test)
 *
 * Usage in tests:
 *   import { runHook, createTempDir, cleanupTempDir } from './harness';
 *   const result = await runHook('hooks/MyHook.hook.ts', { prompt: 'hello' });
 *   expect(result.exitCode).toBe(0);
 */

import { mkdirSync, existsSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');

export interface HookResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  /** Parsed stdout as JSON (null if not valid JSON) */
  json: any | null;
}

/**
 * Run a hook as a subprocess with mock stdin data.
 *
 * @param hookPath - Relative path from BASE_DIR (e.g., 'hooks/ModeClassifier.hook.ts')
 * @param stdinData - Object to serialize as JSON and pipe to stdin
 * @param env - Extra environment variables (merged with process.env)
 * @param timeout - Max execution time in ms (default 10s)
 */
export async function runHook(
  hookPath: string,
  stdinData: Record<string, unknown>,
  env?: Record<string, string>,
  timeout: number = 10000,
): Promise<HookResult> {
  const fullPath = join(BASE_DIR, hookPath);
  const start = Date.now();

  const proc = Bun.spawn(['bun', fullPath], {
    stdin: new Blob([JSON.stringify(stdinData)]),
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      // Prevent hooks from sending voice notifications during tests
      CLAUDE_CODE_AGENT_TASK_ID: 'test-harness',
      ...env,
    },
  });

  // Race between process completion and timeout
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => {
      proc.kill();
      reject(new Error(`Hook timed out after ${timeout}ms`));
    }, timeout)
  );

  try {
    const [stdout, stderr] = await Promise.race([
      Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]),
      timeoutPromise,
    ]);

    await proc.exited;
    const duration = Date.now() - start;

    let json: any = null;
    try {
      // Hook stdout may contain multiple lines; parse the last JSON line
      const jsonLines = stdout.trim().split('\n').filter(l => l.startsWith('{'));
      if (jsonLines.length > 0) {
        json = JSON.parse(jsonLines[jsonLines.length - 1]);
      }
    } catch { /* not JSON */ }

    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode ?? 1, duration, json };
  } catch (err) {
    return {
      stdout: '',
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: -1,
      duration: Date.now() - start,
      json: null,
    };
  }
}

/**
 * Create a temporary directory for test side effects.
 * Returns path. Must call cleanupTempDir after test.
 */
export function createTempDir(prefix: string = 'pai-test-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/**
 * Clean up a temporary directory.
 */
export function cleanupTempDir(dir: string): void {
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch { /* silent */ }
}
