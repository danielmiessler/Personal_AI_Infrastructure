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

// =============================================================================
// CLI Status Display (New Run Tracker Integration)
// =============================================================================

import { runTracker, type TestRun as TrackerRun, type TestHistory as TrackerHistory } from "./run-tracker";
import type { TestSpec, TestGroup } from "./types";

// ANSI Colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function statusIcon(status: string): string {
  switch (status) {
    case "passed":
    case "clean":
      return c("green", "✅");
    case "failed":
    case "error":
    case "timeout":
    case "failing":
      return c("red", "❌");
    case "skipped":
      return c("yellow", "⏭️");
    case "pending":
      return c("gray", "⏳");
    case "partial":
      return c("yellow", "🔄");
    default:
      return "❓";
  }
}

function trendIcon(trend: string): string {
  switch (trend) {
    case "stable":
      return c("green", "→");
    case "improving":
      return c("green", "↑");
    case "degrading":
      return c("red", "↓");
    case "flaky":
      return c("yellow", "⚡");
    default:
      return "?";
  }
}

function padRight(str: string, len: number): string {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, len - stripped.length);
  return str + " ".repeat(padding);
}

function padLeft(str: string, len: number): string {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, len - stripped.length);
  return " ".repeat(padding) + str;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Generate a run status report grouped by test group
 */
export function generateRunStatusReport(run: TrackerRun, specs: TestSpec[]): string {
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(c("bold", `Run: ${run.runId}`) + ` (${run.status})`);
  lines.push(`Started: ${formatDate(run.createdAt)}`);
  if (run.completedAt) {
    lines.push(`Completed: ${formatDate(run.completedAt)}`);
  } else {
    lines.push(`Updated: ${formatDate(run.updatedAt)}`);
  }
  lines.push("═".repeat(70));

  // Group stats
  const groupStats = runTracker.getRunStatusByGroup(specs);
  const groupOrder: TestGroup[] = [
    "text-processing",
    "url-processing",
    "voice-hints",
    "voice-transcription",
    "photo-vision",
    "photo-commands",
    "document-archive",
    "document-extraction",
    "pattern-commands",
    "metadata-extraction",
    "ios-shortcuts",
  ];

  // Table header
  lines.push(
    padRight(c("bold", "Group"), 24) +
    padLeft("Total", 7) +
    padLeft("Pass", 7) +
    padLeft("Fail", 7) +
    padLeft("Skip", 7) +
    padLeft("Pend", 7) +
    "  Status"
  );
  lines.push("─".repeat(70));

  // Group rows
  for (const group of groupOrder) {
    const stats = groupStats[group];
    if (!stats) continue;

    lines.push(
      padRight(group, 24) +
      padLeft(String(stats.total), 7) +
      padLeft(stats.passed > 0 ? c("green", String(stats.passed)) : "0", 7) +
      padLeft(stats.failed > 0 ? c("red", String(stats.failed)) : "0", 7) +
      padLeft(stats.skipped > 0 ? c("yellow", String(stats.skipped)) : "0", 7) +
      padLeft(stats.pending > 0 ? c("gray", String(stats.pending)) : "0", 7) +
      "  " + statusIcon(stats.status)
    );
  }

  // Check for ungrouped tests
  if (groupStats["ungrouped"]) {
    const stats = groupStats["ungrouped"];
    lines.push(
      padRight(c("dim", "(ungrouped)"), 24) +
      padLeft(String(stats.total), 7) +
      padLeft(stats.passed > 0 ? c("green", String(stats.passed)) : "0", 7) +
      padLeft(stats.failed > 0 ? c("red", String(stats.failed)) : "0", 7) +
      padLeft(stats.skipped > 0 ? c("yellow", String(stats.skipped)) : "0", 7) +
      padLeft(stats.pending > 0 ? c("gray", String(stats.pending)) : "0", 7) +
      "  " + statusIcon(stats.status)
    );
  }

  // Totals
  lines.push("─".repeat(70));
  const s = run.summary;
  lines.push(
    padRight(c("bold", "TOTAL"), 24) +
    padLeft(String(s.total), 7) +
    padLeft(c("green", String(s.passed)), 7) +
    padLeft(s.failed > 0 ? c("red", String(s.failed)) : "0", 7) +
    padLeft(s.skipped > 0 ? c("yellow", String(s.skipped)) : "0", 7) +
    padLeft(s.pending > 0 ? c("gray", String(s.pending)) : "0", 7)
  );
  lines.push("═".repeat(70));

  // Progress
  const progress = Math.round((s.executed / s.total) * 100);
  lines.push(`Progress: ${progress}% (${s.executed}/${s.total} executed)`);

  // Failed tests details
  const failedTests = Object.entries(run.results)
    .filter(([, r]) => r.status === "failed" || r.status === "error" || r.status === "timeout");

  if (failedTests.length > 0) {
    lines.push("");
    lines.push(c("red", c("bold", "Failed Tests:")));
    for (const [testId, result] of failedTests) {
      const spec = specs.find((s) => s.id === testId);
      lines.push(`  ${c("red", "✗")} ${testId}: ${spec?.name || "Unknown"}`);
      if (result.error) {
        lines.push(`    ${c("dim", result.error)}`);
      }
    }
  }

  // Semantic validation results
  const semanticResults = Object.entries(run.results)
    .filter(([, r]) => r.semantic);

  if (semanticResults.length > 0) {
    lines.push("");
    lines.push(c("blue", c("bold", "LLM-as-Judge Results:")));
    for (const [testId, result] of semanticResults) {
      const sem = result.semantic!;
      const icon = sem.passed ? c("green", "✓") : c("red", "✗");
      lines.push(`  ${icon} ${testId}: ${sem.confidence}% confidence`);
      if (sem.checkpoints?.length) {
        for (const cp of sem.checkpoints) {
          const cpIcon = cp.passed ? c("green", "✓") : c("red", "✗");
          lines.push(`    ${cpIcon} ${cp.checkpoint}`);
        }
      }
      if (!sem.passed) {
        lines.push(`    ${c("dim", sem.reasoning)}`);
      }
    }
  }

  // Next steps
  if (run.status === "in_progress" && s.pending > 0) {
    lines.push("");
    lines.push(c("cyan", `Next: Run \`test run --continue\` to execute ${s.pending} pending tests`));
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Generate a test history report for a specific test
 */
export function generateTestHistoryReport(testId: string, history: TrackerHistory, spec?: TestSpec): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(c("bold", `${testId}: ${spec?.name || "Unknown"}`));
  if (spec?.group) {
    lines.push(`Group: ${spec.group}`);
  }
  if (spec?.description) {
    lines.push(`Description: ${spec.description}`);
  }
  lines.push("═".repeat(75));

  // Run history table
  lines.push(
    padRight("Run", 24) +
    padRight("Date", 20) +
    padRight("Status", 10) +
    padRight("Duration", 12)
  );
  lines.push("─".repeat(75));

  for (const run of history.runs.slice(-10)) {
    const statusStr = run.status === "passed" ? c("green", "PASS") :
      run.status === "failed" || run.status === "error" ? c("red", "FAIL") :
        c("yellow", run.status.toUpperCase());

    lines.push(
      padRight(run.runId, 24) +
      padRight(run.executedAt ? formatDate(run.executedAt) : "-", 20) +
      padRight(statusStr, 10) +
      padRight(run.duration ? formatDuration(run.duration) : "-", 12)
    );
  }

  lines.push("═".repeat(75));
  lines.push(`Trend: ${trendIcon(history.trend)} ${history.trend}`);
  lines.push(`Pass Rate: ${history.passRate}%`);
  lines.push(`Avg Duration: ${formatDuration(history.avgDuration)}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a list of all runs
 */
export function generateRunsListReport(): string {
  const lines: string[] = [];
  const runs = runTracker.listRuns();

  lines.push("");
  lines.push(c("bold", "Test Runs"));
  lines.push("═".repeat(80));

  lines.push(
    padRight("Run ID", 26) +
    padRight("Date", 22) +
    padRight("Status", 14) +
    padLeft("Pass", 6) +
    padLeft("Fail", 6) +
    padLeft("Skip", 6) +
    padLeft("Pend", 6)
  );
  lines.push("─".repeat(80));

  for (const run of runs.slice(0, 20)) {
    const statusStr = run.status === "completed" ? c("green", run.status) :
      run.status === "in_progress" ? c("cyan", run.status) :
        c("gray", run.status);

    lines.push(
      padRight(run.runId, 26) +
      padRight(formatDate(run.createdAt), 22) +
      padRight(statusStr, 14) +
      padLeft(c("green", String(run.summary.passed)), 6) +
      padLeft(run.summary.failed > 0 ? c("red", String(run.summary.failed)) : "0", 6) +
      padLeft(run.summary.skipped > 0 ? c("yellow", String(run.summary.skipped)) : "0", 6) +
      padLeft(run.summary.pending > 0 ? c("gray", String(run.summary.pending)) : "0", 6)
    );
  }

  lines.push("═".repeat(80));
  lines.push(`Total runs: ${runs.length}`);
  lines.push("");

  return lines.join("\n");
}
