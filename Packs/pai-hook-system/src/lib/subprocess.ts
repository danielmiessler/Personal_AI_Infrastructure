/**
 * subprocess.ts - Subprocess utility with explicit timeout and kill control
 *
 * PURPOSE:
 * Unlike Bun.$`...` which doesn't expose the process handle, this uses
 * Bun.spawn() to enable killing hung subprocesses. This is critical for
 * commands like `kitten @ set-tab-color` that can hang indefinitely when
 * Kitty is unresponsive.
 *
 * PROBLEM SOLVED:
 * Promise.race() timeout abandons the promise but does NOT kill the subprocess.
 * The subprocess continues running in the background, blocking terminal I/O.
 * This utility actually kills the process with SIGTERM → SIGKILL fallback.
 *
 * USAGE:
 * ```typescript
 * const result = await runWithTimeout(
 *   ['kitten', '@', 'set-tab-color', '--self', 'active_bg=#002B80'],
 *   2000 // 2 second timeout
 * );
 * if (!result.success) {
 *   console.error('Command failed or timed out:', result.stderr);
 * }
 * ```
 */

export interface SubprocessResult {
  success: boolean;
  exitCode: number;
  timedOut: boolean;
  stdout?: string;
  stderr?: string;
}

/**
 * Run a command with explicit timeout and subprocess killing.
 *
 * @param cmd - Command and arguments as array (e.g., ['kitten', '@', 'set-tab-color'])
 * @param timeoutMs - Maximum time to wait before killing the process
 * @param options - Optional stdout/stderr handling
 * @returns Result with success status, exit code, and captured output
 */
export async function runWithTimeout(
  cmd: string[],
  timeoutMs: number,
  options?: {
    stdout?: 'inherit' | 'pipe' | 'ignore';
    stderr?: 'inherit' | 'pipe' | 'ignore';
  }
): Promise<SubprocessResult> {
  const proc = Bun.spawn(cmd, {
    stdout: options?.stdout ?? 'ignore',
    stderr: options?.stderr ?? 'pipe',
  });

  let timedOut = false;
  let forceKillTimeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutId = setTimeout(() => {
    console.error(`[subprocess] Killing process after ${timeoutMs}ms timeout: ${cmd.join(' ')}`);
    timedOut = true;
    proc.kill('SIGTERM');

    // Force kill if SIGTERM doesn't work within 1s
    forceKillTimeout = setTimeout(() => {
      try {
        proc.kill('SIGKILL');
        console.error(`[subprocess] Force killed with SIGKILL: ${cmd.join(' ')}`);
      } catch {
        // Process may have already exited
      }
    }, 1000);
  }, timeoutMs);

  try {
    const exitCode = await proc.exited;
    clearTimeout(timeoutId);
    if (forceKillTimeout) clearTimeout(forceKillTimeout);

    // Read stderr if piped
    let stderr: string | undefined;
    if (options?.stderr === 'pipe' && proc.stderr) {
      try {
        stderr = await new Response(proc.stderr).text();
      } catch {
        // Ignore read errors
      }
    }

    // Read stdout if piped
    let stdout: string | undefined;
    if (options?.stdout === 'pipe' && proc.stdout) {
      try {
        stdout = await new Response(proc.stdout).text();
      } catch {
        // Ignore read errors
      }
    }

    return {
      success: !timedOut && exitCode === 0,
      exitCode: timedOut ? -1 : exitCode,
      timedOut,
      stdout,
      stderr,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (forceKillTimeout) clearTimeout(forceKillTimeout);

    return {
      success: false,
      exitCode: -1,
      timedOut,
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}
