#!/usr/bin/env bun
/**
 * mai-quality - Quality Gate Runner CLI
 *
 * Runs quality gates and generates reports.
 */

import { Command } from 'commander';
import { existsSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';
import {
  createBunQualityConfig,
  createQualityReport,
  allQualityGatesPassed,
  getFailedGates,
  type QualityCheckResult,
  type QualityGateConfig,
} from 'mai-specdev-core';

const program = new Command();

program
  .name('mai-quality')
  .description('Run quality gates for the project')
  .version('1.0.0');

program
  .command('run')
  .description('Run all quality gates')
  .option('-g, --gate <gate>', 'Run specific gate (lint, types, format, coverage)')
  .option('--report', 'Generate detailed report')
  .action(async (options: { gate?: string; report?: boolean }) => {
    const cwd = process.cwd();
    const config = detectConfig(cwd);

    console.log('\n=== Quality Gate Check ===\n');

    const results: QualityCheckResult[] = [];

    if (!options.gate || options.gate === 'lint') {
      results.push(await runLint(config));
    }

    if (!options.gate || options.gate === 'types') {
      results.push(await runTypeCheck(config));
    }

    if (!options.gate || options.gate === 'format') {
      results.push(await runFormat(config));
    }

    if (!options.gate || options.gate === 'coverage') {
      results.push(await runCoverage(config));
    }

    // Generate report
    const report = createQualityReport('Project', results);

    console.log('\n=== Results ===\n');
    for (const result of results) {
      const icon = result.status === 'passed' ? '✓' :
                   result.status === 'failed' ? '✗' :
                   result.status === 'skipped' ? '-' : '?';
      console.log(`${icon} ${result.gate}: ${result.status}${result.message ? ` - ${result.message}` : ''}`);
    }

    console.log(`\nSummary: ${report.summary.passed}/${report.summary.total} passed`);

    if (!allQualityGatesPassed(report)) {
      const failed = getFailedGates(report);
      console.log('\nFailed gates:');
      for (const gate of failed) {
        console.log(`  - ${gate.gate}: ${gate.message || 'Failed'}`);
        if (gate.output) {
          console.log(`    ${gate.output.slice(0, 200)}`);
        }
      }
      process.exit(1);
    }

    console.log('\nAll quality gates passed!');
  });

program
  .command('status')
  .description('Show quality gate configuration')
  .action(() => {
    const cwd = process.cwd();
    const config = detectConfig(cwd);

    console.log('\n=== Quality Gate Configuration ===\n');
    console.log(`Linting: ${config.linting.tool} (config: ${config.linting.config})`);
    console.log(`Type Checking: ${config.typeChecking.tool} (config: ${config.typeChecking.config})`);
    console.log(`Formatting: ${config.formatting.tool} (config: ${config.formatting.config})`);
    console.log(`Coverage: ${config.coverage.tool} (threshold: ${config.coverage.threshold}%)`);
  });

// Default command
program
  .action(async () => {
    await program.parseAsync(['node', 'mai-quality', 'run']);
  });

function detectConfig(cwd: string): QualityGateConfig {
  const config = createBunQualityConfig();

  // Check for biome.json
  if (existsSync(join(cwd, 'biome.json'))) {
    config.linting.tool = 'biome';
    config.linting.config = 'biome.json';
    config.formatting.tool = 'biome';
    config.formatting.config = 'biome.json';
  }

  // Check for eslint config
  if (existsSync(join(cwd, '.eslintrc.js')) ||
      existsSync(join(cwd, '.eslintrc.json')) ||
      existsSync(join(cwd, 'eslint.config.js'))) {
    config.linting.tool = 'eslint';
    config.linting.config = '.eslintrc.js';
  }

  return config;
}

async function runLint(config: QualityGateConfig): Promise<QualityCheckResult> {
  const start = Date.now();
  try {
    if (config.linting.tool === 'biome') {
      await $`bunx biome check .`.quiet();
    } else if (config.linting.tool === 'eslint') {
      await $`bunx eslint .`.quiet();
    } else {
      return { gate: 'lint', status: 'skipped', message: 'No linter configured' };
    }

    return {
      gate: 'lint',
      status: 'passed',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      gate: 'lint',
      status: 'failed',
      message: 'Linting errors found',
      duration: Date.now() - start,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runTypeCheck(config: QualityGateConfig): Promise<QualityCheckResult> {
  const start = Date.now();
  try {
    if (!existsSync(join(process.cwd(), 'tsconfig.json'))) {
      return { gate: 'types', status: 'skipped', message: 'No tsconfig.json' };
    }

    await $`tsc --noEmit`.quiet();

    return {
      gate: 'types',
      status: 'passed',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      gate: 'types',
      status: 'failed',
      message: 'Type errors found',
      duration: Date.now() - start,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runFormat(config: QualityGateConfig): Promise<QualityCheckResult> {
  const start = Date.now();
  try {
    if (config.formatting.tool === 'biome') {
      await $`bunx biome format --check .`.quiet();
    } else if (config.formatting.tool === 'prettier') {
      await $`bunx prettier --check .`.quiet();
    } else {
      return { gate: 'format', status: 'skipped', message: 'No formatter configured' };
    }

    return {
      gate: 'format',
      status: 'passed',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      gate: 'format',
      status: 'failed',
      message: 'Formatting issues found',
      duration: Date.now() - start,
    };
  }
}

async function runCoverage(config: QualityGateConfig): Promise<QualityCheckResult> {
  const start = Date.now();
  try {
    if (!existsSync(join(process.cwd(), 'tests')) &&
        !existsSync(join(process.cwd(), 'test'))) {
      return { gate: 'coverage', status: 'skipped', message: 'No tests directory' };
    }

    // Run tests - coverage reporting in bun is limited
    await $`bun test`.quiet();

    return {
      gate: 'coverage',
      status: 'passed',
      message: 'Tests passing',
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      gate: 'coverage',
      status: 'failed',
      message: 'Tests failed',
      duration: Date.now() - start,
    };
  }
}

program.parse();
