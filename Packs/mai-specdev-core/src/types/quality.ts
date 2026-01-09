/**
 * Quality Gate Types
 *
 * Types for configuring and running quality gates in development.
 */

export interface LintingConfig {
  tool: string;
  config: string;
  failOn: 'error' | 'warning';
  paths?: string[];
}

export interface TypeCheckConfig {
  tool: string;
  config: string;
  strict: boolean;
}

export interface FormattingConfig {
  tool: string;
  config: string;
  checkOnly?: boolean;
}

export interface CoverageConfig {
  tool: string;
  threshold: number;
  excludePatterns?: string[];
}

export interface QualityGateConfig {
  linting: LintingConfig;
  typeChecking: TypeCheckConfig;
  formatting: FormattingConfig;
  coverage: CoverageConfig;
}

export type QualityCheckStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface QualityCheckResult {
  gate: string;
  status: QualityCheckStatus;
  message?: string;
  duration?: number;
  output?: string;
}

export interface QualityReport {
  timestamp: string;
  projectName: string;
  results: QualityCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

/**
 * Create default quality gate config for TypeScript projects
 */
export function createDefaultQualityConfig(): QualityGateConfig {
  return {
    linting: {
      tool: 'eslint',
      config: '.eslintrc.js',
      failOn: 'error',
    },
    typeChecking: {
      tool: 'tsc',
      config: 'tsconfig.json',
      strict: true,
    },
    formatting: {
      tool: 'prettier',
      config: '.prettierrc',
      checkOnly: true,
    },
    coverage: {
      tool: 'bun:test',
      threshold: 80,
    },
  };
}

/**
 * Create Bun-specific quality gate config
 */
export function createBunQualityConfig(): QualityGateConfig {
  return {
    linting: {
      tool: 'biome',
      config: 'biome.json',
      failOn: 'error',
    },
    typeChecking: {
      tool: 'tsc',
      config: 'tsconfig.json',
      strict: true,
    },
    formatting: {
      tool: 'biome',
      config: 'biome.json',
      checkOnly: true,
    },
    coverage: {
      tool: 'bun:test',
      threshold: 80,
    },
  };
}

/**
 * Create a quality report from results
 */
export function createQualityReport(
  projectName: string,
  results: QualityCheckResult[]
): QualityReport {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  return {
    timestamp: new Date().toISOString(),
    projectName,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      skipped,
    },
  };
}

/**
 * Check if all quality gates passed
 */
export function allQualityGatesPassed(report: QualityReport): boolean {
  return report.summary.failed === 0;
}

/**
 * Get failed quality gates
 */
export function getFailedGates(report: QualityReport): QualityCheckResult[] {
  return report.results.filter(r => r.status === 'failed');
}
