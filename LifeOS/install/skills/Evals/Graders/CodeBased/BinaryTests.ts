/**
 * Binary Tests Grader
 * Run actual test files and check pass/fail
 */

import { BaseGrader, registerGrader, type GraderContext } from '../Base.ts';
import type { GraderConfig, GraderResult, BinaryTestsParams } from '../../Types/index.ts';

// Windows has no /bin/sh; cmd takes /c where POSIX shells take -c.
const SHELL_PREFIX = process.platform === 'win32' ? ['cmd', '/c'] : ['/bin/sh', '-c'];

async function drainStream(stream: ReadableStream<Uint8Array> | null, ms = 2000): Promise<string> {
  if (!stream) return '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      new Response(stream).text(),
      new Promise<string>((resolve) => { timer = setTimeout(() => resolve(''), ms); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export class BinaryTestsGrader extends BaseGrader {
  type = 'binary_tests' as const;
  category = 'code_based' as const;

  async grade(context: GraderContext): Promise<GraderResult> {
    const start = performance.now();
    const params = this.config.params as BinaryTestsParams;

    if (!params?.test_files?.length) {
      return this.createResult(0, false, performance.now() - start, {
        reasoning: 'No test files configured',
      });
    }

    const workingDir = context.working_dir ?? process.cwd();
    const timeout = params.timeout_ms ?? 60000;
    const results: { file: string; passed: boolean; output: string; error?: string }[] = [];

    for (const testFile of params.test_files) {
      try {
        // Detect test command based on file extension
        const command = params.test_command ?? this.detectTestCommand(testFile);

        // Run through a shell rather than a tagged template: the interpolation
        // would escape a multi-word test command into one argv token. The old
        // form also shelled out to `timeout`, which is GNU coreutils and absent
        // on a stock macOS box, so every file was graded failed there.
        const proc = Bun.spawn([...SHELL_PREFIX, `${command} ${testFile}`], {
          cwd: workingDir,
          stdout: 'pipe',
          stderr: 'pipe',
          timeout,
          killSignal: 'SIGKILL',
        });
        const exitCode = await proc.exited;
        // A killed shell can leave an orphan child holding the pipe open, so the
        // drain is capped rather than awaited outright — otherwise the timeout
        // above buys nothing.
        const [stdout, stderr] = await Promise.all([drainStream(proc.stdout), drainStream(proc.stderr)]);

        const passed = exitCode === 0;
        results.push({
          file: testFile,
          passed,
          output: stdout.slice(-500),  // Last 500 chars
          error: passed ? undefined : stderr.slice(-500),
        });
      } catch (e) {
        results.push({
          file: testFile,
          passed: false,
          output: '',
          error: String(e),
        });
      }
    }

    const passCount = results.filter(r => r.passed).length;
    const score = passCount / params.test_files.length;
    const passed = passCount === params.test_files.length;

    return this.createResult(score, passed, performance.now() - start, {
      reasoning: `${passCount}/${params.test_files.length} tests passed`,
      details: {
        results,
        working_dir: workingDir,
      },
    });
  }

  private detectTestCommand(file: string): string {
    if (file.endsWith('.py')) return 'python -m pytest';
    if (file.endsWith('.ts')) return 'bun test';
    // ported from public PR #1742, @elhoim — ESM/CJS test files are still node --test
    if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) return 'node --test';
    if (file.endsWith('.go')) return 'go test';
    if (file.endsWith('.rs')) return 'cargo test --';
    return 'bun test';  // Default
  }
}

registerGrader('binary_tests', BinaryTestsGrader);
