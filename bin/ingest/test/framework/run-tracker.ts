/**
 * Run Tracker Module
 *
 * Manages persistent test runs with support for:
 * - Run creation, continuation, and completion
 * - LLM-as-judge semantic validation storage
 * - Test history aggregation
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import type { TestSpec, TestCategory, TestGroup } from "./types";

// =============================================================================
// Types
// =============================================================================

export type RunStatus = "in_progress" | "completed" | "abandoned";
export type TestResultStatus = "passed" | "failed" | "skipped" | "timeout" | "error" | "pending";

/** LLM-as-judge semantic validation result */
export interface SemanticResult {
  passed: boolean;
  confidence: number;  // 0-100
  reasoning: string;
  checkpoints?: Array<{
    checkpoint: string;
    passed: boolean;
    reason: string;
  }>;
}

/** Individual validation check */
export interface ValidationCheck {
  name: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
}

/** Captured actual values from test execution */
export interface TestActuals {
  pipeline?: string;
  tags?: string[];
  frontmatter?: Record<string, unknown>;
  vaultPath?: string;
  wisdomPath?: string;
  archivePath?: string;
  content?: string;  // Truncated for storage (first 2000 chars)
  wisdomContent?: string;  // Truncated wisdom file content
}

/** Result for a single test within a run */
export interface TestResult {
  status: TestResultStatus;
  executedAt?: string;
  duration?: number;
  error?: string;

  /** Captured actuals from test execution */
  actual?: TestActuals;

  /** Individual validation checks */
  checks?: ValidationCheck[];

  /** Whether this test requires LLM-as-judge semantic validation */
  semanticRequired?: boolean;

  /** LLM-as-judge semantic validation (added after deterministic run) */
  semantic?: SemanticResult;

  /** Skip reason if skipped */
  skipReason?: string;
}

/** Run summary statistics */
export interface RunSummary {
  total: number;
  executed: number;
  passed: number;
  failed: number;
  skipped: number;
  pending: number;

  /** LLM-as-judge semantic validation tracking */
  semanticRequired: number;   // Tests that need LLM-judge review
  semanticCompleted: number;  // Tests with completed LLM-judge review
}

/** Complete test run record */
export interface TestRun {
  runId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  /** Execution mode */
  mode: "full" | "suite" | "group" | "single";

  /** Filters applied to this run */
  filters?: {
    suite?: TestCategory;
    group?: TestGroup;
    ids?: string[];
  };

  /** Summary statistics */
  summary: RunSummary;

  /** Individual test results keyed by test ID */
  results: Record<string, TestResult>;
}

/** Aggregated history for a single test */
export interface TestHistory {
  runs: Array<{
    runId: string;
    status: TestResultStatus;
    duration?: number;
    executedAt?: string;
  }>;
  trend: "stable" | "improving" | "degrading" | "flaky";
  lastStatus: TestResultStatus;
  passRate: number;  // 0-100
  avgDuration: number;
}

// =============================================================================
// Paths
// =============================================================================

const OUTPUT_DIR = join(__dirname, "../output");
const RUNS_DIR = join(OUTPUT_DIR, "runs");
const HISTORY_FILE = join(OUTPUT_DIR, "test-history.json");

// =============================================================================
// Helper Functions
// =============================================================================

function ensureDirs(): void {
  if (!existsSync(RUNS_DIR)) {
    mkdirSync(RUNS_DIR, { recursive: true });
  }
}

function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  // Find existing runs for today to determine sequence number
  ensureDirs();
  const existingRuns = readdirSync(RUNS_DIR)
    .filter((f) => f.startsWith(`run-${date}-`) && f.endsWith(".json"))
    .map((f) => {
      const match = f.match(/run-\d{4}-\d{2}-\d{2}-(\d+)\.json/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = existingRuns.length > 0 ? Math.max(...existingRuns) + 1 : 1;
  return `run-${date}-${String(nextSeq).padStart(3, "0")}`;
}

function getRunPath(runId: string): string {
  return join(RUNS_DIR, `${runId}.json`);
}

function loadRun(runId: string): TestRun | null {
  const path = getRunPath(runId);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveRun(run: TestRun): void {
  ensureDirs();
  const path = getRunPath(run.runId);
  writeFileSync(path, JSON.stringify(run, null, 2));
}

function loadHistory(): Record<string, TestHistory> {
  if (!existsSync(HISTORY_FILE)) return {};
  return JSON.parse(readFileSync(HISTORY_FILE, "utf-8"));
}

function saveHistory(history: Record<string, TestHistory>): void {
  ensureDirs();
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function updateSummary(run: TestRun): void {
  const results = Object.values(run.results);
  run.summary = {
    total: results.length,
    executed: results.filter((r) => r.status !== "pending").length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed" || r.status === "error" || r.status === "timeout").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    pending: results.filter((r) => r.status === "pending").length,
    semanticRequired: results.filter((r) => r.semanticRequired).length,
    semanticCompleted: results.filter((r) => r.semanticRequired && r.semantic).length,
  };
}

function calculateTrend(runs: Array<{ status: TestResultStatus }>): "stable" | "improving" | "degrading" | "flaky" {
  if (runs.length < 2) return "stable";

  const recent = runs.slice(-5);  // Last 5 runs
  const passedCount = recent.filter((r) => r.status === "passed").length;
  const failedCount = recent.filter((r) => r.status === "failed" || r.status === "error").length;

  // Check for flakiness (alternating pass/fail)
  let alternations = 0;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].status === "passed";
    const curr = recent[i].status === "passed";
    if (prev !== curr) alternations++;
  }
  if (alternations >= 2 && recent.length >= 3) return "flaky";

  // Check trend direction
  if (recent.length >= 2) {
    const lastTwo = recent.slice(-2);
    const wasPass = lastTwo[0].status === "passed";
    const isPass = lastTwo[1].status === "passed";

    if (!wasPass && isPass) return "improving";
    if (wasPass && !isPass) return "degrading";
  }

  return "stable";
}

// =============================================================================
// Public API
// =============================================================================

export class RunTracker {
  private currentRun: TestRun | null = null;

  /**
   * Create a new test run
   */
  createRun(
    specs: TestSpec[],
    options?: {
      suite?: TestCategory;
      group?: TestGroup;
      ids?: string[];
    }
  ): TestRun {
    const runId = generateRunId();
    const now = new Date().toISOString();

    // Determine mode based on filters
    let mode: TestRun["mode"] = "full";
    if (options?.ids?.length) mode = "single";
    else if (options?.group) mode = "group";
    else if (options?.suite) mode = "suite";

    // Initialize results with pending status
    const results: Record<string, TestResult> = {};
    for (const spec of specs) {
      // Check if spec should be skipped
      if (spec.meta?.skip) {
        results[spec.id] = {
          status: "skipped",
          skipReason: spec.meta.skip,
        };
      } else {
        results[spec.id] = { status: "pending" };
      }
    }

    const run: TestRun = {
      runId,
      status: "in_progress",
      createdAt: now,
      updatedAt: now,
      mode,
      filters: options
        ? {
            suite: options.suite,
            group: options.group,
            ids: options.ids,
          }
        : undefined,
      summary: {
        total: specs.length,
        executed: 0,
        passed: 0,
        failed: 0,
        skipped: Object.values(results).filter((r) => r.status === "skipped").length,
        pending: Object.values(results).filter((r) => r.status === "pending").length,
        semanticRequired: 0,
        semanticCompleted: 0,
      },
      results,
    };

    saveRun(run);
    this.currentRun = run;
    return run;
  }

  /**
   * Load an existing run to continue
   */
  loadRun(runId: string): TestRun | null {
    const run = loadRun(runId);
    if (run) {
      this.currentRun = run;
    }
    return run;
  }

  /**
   * Get the most recent in-progress run
   */
  getLatestInProgressRun(): TestRun | null {
    ensureDirs();
    const runs = readdirSync(RUNS_DIR)
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of runs) {
      const runId = file.replace(".json", "");
      const run = loadRun(runId);
      if (run && run.status === "in_progress") {
        this.currentRun = run;
        return run;
      }
    }
    return null;
  }

  /**
   * Record a test result
   */
  recordResult(testId: string, result: TestResult): void {
    if (!this.currentRun) {
      throw new Error("No active run. Call createRun or loadRun first.");
    }

    this.currentRun.results[testId] = {
      ...result,
      executedAt: result.executedAt || new Date().toISOString(),
    };
    this.currentRun.updatedAt = new Date().toISOString();

    updateSummary(this.currentRun);
    saveRun(this.currentRun);

    // Update history
    this.updateTestHistory(testId, result);
  }

  /**
   * Record LLM-as-judge semantic validation for a test
   */
  recordSemanticResult(testId: string, semantic: SemanticResult): void {
    if (!this.currentRun) {
      throw new Error("No active run. Call createRun or loadRun first.");
    }

    const existing = this.currentRun.results[testId];
    if (!existing) {
      throw new Error(`No result found for test ${testId}`);
    }

    existing.semantic = semantic;
    existing.semanticRequired = true;  // Ensure this is set when we add semantic result
    this.currentRun.updatedAt = new Date().toISOString();
    updateSummary(this.currentRun);  // Update counters including semanticCompleted
    saveRun(this.currentRun);
  }

  /**
   * Mark run as completed
   */
  completeRun(): void {
    if (!this.currentRun) return;

    this.currentRun.status = "completed";
    this.currentRun.completedAt = new Date().toISOString();
    this.currentRun.updatedAt = new Date().toISOString();
    saveRun(this.currentRun);
  }

  /**
   * Mark run as abandoned
   */
  abandonRun(): void {
    if (!this.currentRun) return;

    this.currentRun.status = "abandoned";
    this.currentRun.updatedAt = new Date().toISOString();
    saveRun(this.currentRun);
  }

  /**
   * Get current run
   */
  getCurrentRun(): TestRun | null {
    return this.currentRun;
  }

  /**
   * Get pending tests in current run
   */
  getPendingTests(): string[] {
    if (!this.currentRun) return [];
    return Object.entries(this.currentRun.results)
      .filter(([, result]) => result.status === "pending")
      .map(([testId]) => testId);
  }

  /**
   * Get failed tests in current run
   */
  getFailedTests(): string[] {
    if (!this.currentRun) return [];
    return Object.entries(this.currentRun.results)
      .filter(([, result]) =>
        result.status === "failed" ||
        result.status === "error" ||
        result.status === "timeout"
      )
      .map(([testId]) => testId);
  }

  /**
   * Get tests that need LLM-judge semantic review
   */
  getTestsNeedingSemanticReview(): string[] {
    if (!this.currentRun) return [];
    return Object.entries(this.currentRun.results)
      .filter(([, result]) => result.semanticRequired && !result.semantic)
      .map(([testId]) => testId);
  }

  /**
   * Mark a test as requiring semantic validation (during test execution)
   */
  markSemanticRequired(testId: string): void {
    if (!this.currentRun) {
      throw new Error("No active run. Call createRun or loadRun first.");
    }

    const existing = this.currentRun.results[testId];
    if (existing) {
      existing.semanticRequired = true;
      this.currentRun.updatedAt = new Date().toISOString();
      updateSummary(this.currentRun);
      saveRun(this.currentRun);
    }
  }

  /**
   * List all runs
   */
  listRuns(): Array<{ runId: string; status: RunStatus; createdAt: string; summary: RunSummary }> {
    ensureDirs();
    return readdirSync(RUNS_DIR)
      .filter((f) => f.startsWith("run-") && f.endsWith(".json"))
      .sort()
      .reverse()
      .map((file) => {
        const run = loadRun(file.replace(".json", ""))!;
        return {
          runId: run.runId,
          status: run.status,
          createdAt: run.createdAt,
          summary: run.summary,
        };
      });
  }

  /**
   * Get test history for a specific test
   */
  getTestHistory(testId: string): TestHistory | null {
    const history = loadHistory();
    return history[testId] || null;
  }

  /**
   * Get all test histories
   */
  getAllHistory(): Record<string, TestHistory> {
    return loadHistory();
  }

  /**
   * Update history after recording a result
   */
  private updateTestHistory(testId: string, result: TestResult): void {
    const history = loadHistory();

    if (!history[testId]) {
      history[testId] = {
        runs: [],
        trend: "stable",
        lastStatus: result.status,
        passRate: 0,
        avgDuration: 0,
      };
    }

    // Add this run's result
    history[testId].runs.push({
      runId: this.currentRun!.runId,
      status: result.status,
      duration: result.duration,
      executedAt: result.executedAt,
    });

    // Keep only last 20 runs
    if (history[testId].runs.length > 20) {
      history[testId].runs = history[testId].runs.slice(-20);
    }

    // Update aggregates
    const runs = history[testId].runs;
    history[testId].lastStatus = result.status;
    history[testId].trend = calculateTrend(runs);

    const executedRuns = runs.filter((r) => r.status !== "pending" && r.status !== "skipped");
    const passedRuns = executedRuns.filter((r) => r.status === "passed");
    history[testId].passRate = executedRuns.length > 0
      ? Math.round((passedRuns.length / executedRuns.length) * 100)
      : 0;

    const durations = runs.filter((r) => r.duration).map((r) => r.duration!);
    history[testId].avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    saveHistory(history);
  }

  /**
   * Generate a run status report by group
   */
  getRunStatusByGroup(specs: TestSpec[]): Record<string, {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;
    status: "clean" | "failing" | "partial" | "pending";
  }> {
    if (!this.currentRun) return {};

    const groupStats: Record<string, {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      pending: number;
      status: "clean" | "failing" | "partial" | "pending";
    }> = {};

    for (const spec of specs) {
      const group = spec.group || "ungrouped";
      if (!groupStats[group]) {
        groupStats[group] = { total: 0, passed: 0, failed: 0, skipped: 0, pending: 0, status: "pending" };
      }

      const result = this.currentRun.results[spec.id];
      groupStats[group].total++;

      if (!result || result.status === "pending") {
        groupStats[group].pending++;
      } else if (result.status === "passed") {
        groupStats[group].passed++;
      } else if (result.status === "skipped") {
        groupStats[group].skipped++;
      } else {
        groupStats[group].failed++;
      }
    }

    // Calculate group status
    for (const group of Object.keys(groupStats)) {
      const g = groupStats[group];
      if (g.pending === g.total) {
        g.status = "pending";
      } else if (g.failed > 0) {
        g.status = "failing";
      } else if (g.passed + g.skipped === g.total) {
        g.status = "clean";
      } else {
        g.status = "partial";
      }
    }

    return groupStats;
  }
}

// Singleton instance
export const runTracker = new RunTracker();
