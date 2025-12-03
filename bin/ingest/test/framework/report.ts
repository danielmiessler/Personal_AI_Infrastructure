/**
 * Test Report Generation
 *
 * Generates JSON and markdown reports per run, plus historical tracking.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { TestRunSummary, ValidationResult } from "./types";

// =============================================================================
// Types
// =============================================================================

export interface TestReport {
  runId: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  passRate: number;
  tests: TestResult[];
  comparison?: {
    previousRunId: string;
    delta: {
      passed: number;
      failed: number;
    };
    newFailures: string[];
    fixed: string[];
  };
}

export interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  failedChecks?: string[];
}

export interface HistoryEntry {
  runId: string;
  startedAt: string;
  duration: number;
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  passRate: number;
  failedTests: string[];
}

// =============================================================================
// Constants
// =============================================================================

const OUTPUT_BASE_DIR = join(import.meta.dir, "..", "output");
const HISTORY_FILE = join(OUTPUT_BASE_DIR, "test-history.json");

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate a full test report from run summary
 */
export function generateReport(
  runId: string,
  summary: TestRunSummary,
  specs: Map<string, { name: string; category: string }>
): TestReport {
  const passRate = summary.counts.total > 0
    ? Math.round((summary.counts.passed / summary.counts.total) * 100)
    : 0;

  const tests: TestResult[] = summary.results.map(result => {
    const spec = specs.get(result.testId);
    const failedChecks = result.checks
      .filter(c => !c.passed && c.name !== "skipped")
      .map(c => c.name);

    return {
      id: result.testId,
      name: spec?.name || result.testId,
      category: spec?.category || "unknown",
      passed: result.passed,
      duration: result.duration,
      error: result.error,
      failedChecks: failedChecks.length > 0 ? failedChecks : undefined,
    };
  });

  const report: TestReport = {
    runId,
    startedAt: summary.startedAt,
    completedAt: summary.completedAt,
    duration: summary.duration,
    counts: summary.counts,
    passRate,
    tests,
  };

  // Add comparison with previous run if available
  const history = loadHistory();
  if (history.length > 0) {
    const previous = history[history.length - 1];
    const currentFailed = new Set(tests.filter(t => !t.passed).map(t => t.id));
    const previousFailed = new Set(previous.failedTests);

    const newFailures = [...currentFailed].filter(id => !previousFailed.has(id));
    const fixed = [...previousFailed].filter(id => !currentFailed.has(id));

    report.comparison = {
      previousRunId: previous.runId,
      delta: {
        passed: summary.counts.passed - previous.counts.passed,
        failed: summary.counts.failed - previous.counts.failed,
      },
      newFailures,
      fixed,
    };
  }

  return report;
}

/**
 * Save JSON report to run directory
 */
export function saveJsonReport(runId: string, report: TestReport): string {
  const runDir = join(OUTPUT_BASE_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  const reportPath = join(runDir, "report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return reportPath;
}

/**
 * Generate markdown summary report
 */
export function generateMarkdownReport(report: TestReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Test Report: ${report.runId}`);
  lines.push("");
  lines.push(`**Date:** ${new Date(report.startedAt).toLocaleString()}`);
  lines.push(`**Duration:** ${(report.duration / 1000).toFixed(1)}s`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total | ${report.counts.total} |`);
  lines.push(`| Passed | ${report.counts.passed} |`);
  lines.push(`| Failed | ${report.counts.failed} |`);
  lines.push(`| Skipped | ${report.counts.skipped} |`);
  lines.push(`| Pass Rate | ${report.passRate}% |`);
  lines.push("");

  // Comparison with previous run
  if (report.comparison) {
    lines.push("## Comparison with Previous Run");
    lines.push("");
    lines.push(`Previous: ${report.comparison.previousRunId}`);
    lines.push("");

    const deltaSign = (n: number) => n > 0 ? `+${n}` : n.toString();
    lines.push(`- Passed: ${deltaSign(report.comparison.delta.passed)}`);
    lines.push(`- Failed: ${deltaSign(report.comparison.delta.failed)}`);

    if (report.comparison.newFailures.length > 0) {
      lines.push("");
      lines.push("### New Failures");
      for (const id of report.comparison.newFailures) {
        lines.push(`- ${id}`);
      }
    }

    if (report.comparison.fixed.length > 0) {
      lines.push("");
      lines.push("### Fixed");
      for (const id of report.comparison.fixed) {
        lines.push(`- ${id}`);
      }
    }
    lines.push("");
  }

  // Failed tests detail
  const failed = report.tests.filter(t => !t.passed && !t.error?.includes("skipped"));
  if (failed.length > 0) {
    lines.push("## Failed Tests");
    lines.push("");
    for (const test of failed) {
      lines.push(`### ${test.id}: ${test.name}`);
      lines.push("");
      lines.push(`- **Category:** ${test.category}`);
      lines.push(`- **Duration:** ${test.duration}ms`);
      if (test.error) {
        lines.push(`- **Error:** ${test.error}`);
      }
      if (test.failedChecks && test.failedChecks.length > 0) {
        lines.push(`- **Failed checks:**`);
        for (const check of test.failedChecks) {
          lines.push(`  - ${check}`);
        }
      }
      lines.push("");
    }
  }

  // All tests table
  lines.push("## All Tests");
  lines.push("");
  lines.push("| ID | Name | Status | Duration |");
  lines.push("|---|---|---|---|");
  for (const test of report.tests) {
    const status = test.passed ? "✅" : "❌";
    const duration = test.duration > 0 ? `${test.duration}ms` : "-";
    lines.push(`| ${test.id} | ${test.name} | ${status} | ${duration} |`);
  }

  return lines.join("\n");
}

/**
 * Save markdown report to run directory
 */
export function saveMarkdownReport(runId: string, markdown: string): string {
  const runDir = join(OUTPUT_BASE_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  const reportPath = join(runDir, "REPORT.md");
  writeFileSync(reportPath, markdown);

  // Also update latest-report.md symlink (as file copy for compatibility)
  const latestPath = join(OUTPUT_BASE_DIR, "latest-report.md");
  writeFileSync(latestPath, markdown);

  return reportPath;
}

// =============================================================================
// History Tracking
// =============================================================================

/**
 * Load test history
 */
export function loadHistory(): HistoryEntry[] {
  if (!existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const content = readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Add run to history
 */
export function appendHistory(report: TestReport): void {
  const history = loadHistory();

  const entry: HistoryEntry = {
    runId: report.runId,
    startedAt: report.startedAt,
    duration: report.duration,
    counts: report.counts,
    passRate: report.passRate,
    failedTests: report.tests.filter(t => !t.passed).map(t => t.id),
  };

  history.push(entry);

  // Keep last 100 runs
  const trimmed = history.slice(-100);

  mkdirSync(OUTPUT_BASE_DIR, { recursive: true });
  writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
}

/**
 * Generate history summary (for console output)
 */
export function getHistorySummary(limit = 10): string {
  const history = loadHistory();
  if (history.length === 0) {
    return "No test history available.";
  }

  const recent = history.slice(-limit);
  const lines: string[] = [];

  lines.push("Recent Test Runs:");
  lines.push("-".repeat(70));
  lines.push(
    "Run ID".padEnd(30) +
    "Passed".padEnd(10) +
    "Failed".padEnd(10) +
    "Rate".padEnd(10) +
    "Duration"
  );
  lines.push("-".repeat(70));

  for (const entry of recent) {
    const rate = `${entry.passRate}%`;
    const duration = `${(entry.duration / 1000).toFixed(1)}s`;
    lines.push(
      entry.runId.padEnd(30) +
      entry.counts.passed.toString().padEnd(10) +
      entry.counts.failed.toString().padEnd(10) +
      rate.padEnd(10) +
      duration
    );
  }

  // Trend
  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const trend = last.passRate - first.passRate;
    const trendStr = trend > 0 ? `+${trend}%` : `${trend}%`;
    lines.push("");
    lines.push(`Trend (last ${recent.length} runs): ${trendStr}`);
  }

  return lines.join("\n");
}

/**
 * Print history summary to console
 */
export function printHistory(limit = 10): void {
  console.log(getHistorySummary(limit));
}
