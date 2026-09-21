/**
 * Static Analysis Grader
 * Run linters, type checkers, security scanners
 */

import { BaseGrader, registerGrader, type GraderContext } from '../Base.ts';
import type { GraderConfig, GraderResult, StaticAnalysisParams } from '../../Types/index.ts';

// Windows has no /bin/sh; cmd takes /c where POSIX shells take -c.
const SHELL_PREFIX = process.platform === 'win32' ? ['cmd', '/c'] : ['/bin/sh', '-c'];

export class StaticAnalysisGrader extends BaseGrader {
  type = 'static_analysis' as const;
  category = 'code_based' as const;

  async grade(context: GraderContext): Promise<GraderResult> {
    const start = performance.now();
    const params = this.config.params as StaticAnalysisParams;

    if (!params?.commands?.length) {
      return this.createResult(0, false, performance.now() - start, {
        reasoning: 'No analysis commands configured',
      });
    }

    const workingDir = context.working_dir ?? process.cwd();
    const results: { command: string; passed: boolean; output: string; warnings: number; errors: number }[] = [];

    for (const command of params.commands) {
      try {
        // Run through a shell: the command is a user-authored string ("bun test",
        // "eslint . --max-warnings 0"), and a tagged-template interpolation would
        // escape the whole string into a single argv token, so nothing would run.
        const proc = Bun.spawn([...SHELL_PREFIX, command], {
          cwd: workingDir,
          stdout: 'pipe',
          stderr: 'pipe',
        });
        const [stdout, stderr, exitCode] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited,
        ]);

        const output = stdout + stderr;
        const warnings = this.countIssues(output, 'warning');
        const errors = this.countIssues(output, 'error');

        // A non-zero exit is a failure on its own: a tool that reports its verdict
        // only through its exit status (tsc, most test runners) prints nothing the
        // keyword scan below would ever count.
        const passed = exitCode === 0 && errors === 0 && (!params.fail_on_warning || warnings === 0);

        results.push({
          command,
          passed,
          output: output.slice(-1000),  // Last 1000 chars
          warnings,
          errors,
        });
      } catch (e) {
        results.push({
          command,
          passed: false,
          output: String(e),
          warnings: 0,
          errors: 1,
        });
      }
    }

    const passCount = results.filter(r => r.passed).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);

    const score = passCount / params.commands.length;
    const passed = passCount === params.commands.length;

    return this.createResult(score, passed, performance.now() - start, {
      reasoning: `${passCount}/${params.commands.length} checks passed (${totalErrors} errors, ${totalWarnings} warnings)`,
      details: {
        results,
        total_errors: totalErrors,
        total_warnings: totalWarnings,
        fail_on_warning: params.fail_on_warning ?? false,
      },
    });
  }

  private countIssues(output: string, type: 'warning' | 'error'): number {
    const patterns = type === 'error'
      ? [/error:/gi, /\berror\b/gi, /failed/gi, /\[E\d+\]/g]
      : [/warning:/gi, /\bwarn\b/gi, /\[W\d+\]/g];

    let count = 0;
    for (const pattern of patterns) {
      const matches = output.match(pattern);
      count += matches?.length ?? 0;
    }
    return Math.min(count, 100);  // Cap at 100
  }
}

registerGrader('static_analysis', StaticAnalysisGrader);
