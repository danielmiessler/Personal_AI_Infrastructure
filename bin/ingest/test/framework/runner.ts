/**
 * Test Runner
 *
 * Orchestrates test execution: loads fixtures, runs processor, validates results.
 */

import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import type {
  TestSpec,
  Fixture,
  ValidationResult,
  TestRunSummary,
  RunnerOptions,
  TestCategory,
} from "./types";
import { validateTestOutput, type TestOutput } from "./validate";
import { fixtureExists, loadFixture, loadFixtureFromPath } from "./capture";
import { allIngestSpecs, getSpecById, getSpecsByCategory } from "../specs";
import { processMessage, saveToVault } from "../../lib/process";
import { getConfig } from "../../lib/config";
import { loadProfile } from "../../lib/profiles";
import {
  generateReport,
  saveJsonReport,
  generateMarkdownReport,
  saveMarkdownReport,
  appendHistory,
} from "./report";
import {
  printTestHeader,
  printTestStatus as printTestResult,
  printSkippedTest,
  printTestError,
  printFailedCheck,
  printLayerHeader,
  printTestCount,
  colors,
} from "./format";
import { seedTestTags } from "./test-vault";
import { clearTagIndexCache } from "../../lib/tag-matcher";

// =============================================================================
// Constants
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");
const OUTPUT_BASE_DIR = join(import.meta.dir, "..", "output");
const MEDIA_DIR = join(FIXTURES_DIR, "media");

// Format date to local timezone string: YYYY-MM-DD-HH-mm-ss
export function formatLocalTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

// Generate timestamped run ID
function getRunId(): string {
  return `run-${formatLocalTimestamp()}`;
}

// Current run directory (set at start of test suite)
let currentRunDir: string = "";

// Full run log buffer (accumulated across all tests)
let runLogBuffer: string[] = [];

// =============================================================================
// Test Trace Storage
// =============================================================================

/**
 * Save test trace (verbose output) to disk
 * Creates a per-test trace file and appends to the run log
 */
function saveTestTrace(
  testId: string,
  testName: string,
  verboseOutput: string,
  result: ValidationResult,
  testOutputDir: string
): void {
  if (!currentRunDir) return;

  const status = result.passed ? "PASSED" : "FAILED";
  const durationStr = `${(result.duration / 1000).toFixed(1)}s`;
  const timestamp = new Date().toISOString();

  // Build formatted trace content
  const traceHeader = [
    "─".repeat(60),
    `▶ ${testId}: ${testName}`,
    "─".repeat(60),
  ].join("\n");

  const traceFooter = result.passed
    ? `✓ ${testId}: ${status} (${durationStr})`
    : `✗ ${testId}: ${status} (${durationStr})${result.error ? `\n  Error: ${result.error}` : ""}`;

  // Include failed checks in footer
  const failedChecks = result.checks.filter(c => !c.passed);
  const checksStr = failedChecks.length > 0
    ? "\n" + failedChecks.slice(0, 5).map(c => `  - ${c.name}: ${c.error || "failed"}`).join("\n")
    : "";

  const fullTrace = [
    traceHeader,
    verboseOutput.split("\n").map(line => `  ${line}`).join("\n"),
    traceFooter + checksStr,
    "", // blank line between tests
  ].join("\n");

  // Append to run log buffer
  runLogBuffer.push(fullTrace);

  // Save individual test trace file
  const testTraceDir = join(currentRunDir, "traces");
  if (!existsSync(testTraceDir)) {
    mkdirSync(testTraceDir, { recursive: true });
  }
  const traceFile = join(testTraceDir, `${testId}.log`);
  
  const traceContent = [
    `# Test Trace: ${testId}`,
    `# Name: ${testName}`,
    `# Status: ${status}`,
    `# Duration: ${durationStr}`,
    `# Timestamp: ${timestamp}`,
    "",
    traceHeader,
    verboseOutput,
    traceFooter + checksStr,
  ].join("\n");
  
  writeFileSync(traceFile, traceContent);
}

/**
 * Save the complete run log to disk
 */
function saveRunLog(runId: string): string {
  if (!currentRunDir) return "";

  const runLogFile = join(currentRunDir, "run.log");
  const header = [
    "═".repeat(60),
    `TEST RUN: ${runId}`,
    `Started: ${new Date().toISOString()}`,
    "═".repeat(60),
    "",
  ].join("\n");

  const content = header + runLogBuffer.join("\n");
  writeFileSync(runLogFile, content);
  
  // Reset buffer for next run
  runLogBuffer = [];
  
  return runLogFile;
}

// =============================================================================
// Main Runner Functions
// =============================================================================

/**
 * Run a single test by ID
 */
export async function runTest(
  testId: string,
  options: { verbose?: boolean; keepOutput?: boolean; skipMedia?: boolean } = {}
): Promise<ValidationResult> {
  const spec = getSpecById(testId);
  if (!spec) {
    return {
      testId,
      passed: false,
      duration: 0,
      checks: [],
      error: `Test spec not found: ${testId}`,
    };
  }

  // Check fixture exists
  if (!fixtureExists(testId)) {
    return {
      testId,
      passed: false,
      duration: 0,
      checks: [],
      error: `Fixture not found. Run: ingest test capture ${testId}`,
    };
  }

  // Check if test should be skipped (explicit skip in spec)
  if (spec.meta?.skip) {
    return {
      testId,
      passed: false, // Skipped is a distinct status, not passed
      duration: 0,
      checks: [{ name: "skipped", passed: true, expected: spec.meta.skip }],
    };
  }

  // Skip media tests (voice, photo, document) only if --skip-media flag is set
  // Media tests require downloading from Telegram but are important for full coverage
  const mediaTypes = ["voice", "audio", "photo", "document"];
  if (mediaTypes.includes(spec.input.type) && options.skipMedia) {
    return {
      testId,
      passed: false, // Skipped is a distinct status, not passed
      duration: 0,
      checks: [{ name: "skipped", passed: true, expected: `Media test (${spec.input.type}) - skipped via --skip-media` }],
    };
  }

  return runTestWithSpec(spec, options);
}

/**
 * Run test with a spec (internal)
 */
async function runTestWithSpec(
  spec: TestSpec,
  options: { verbose?: boolean; keepOutput?: boolean } = {}
): Promise<ValidationResult> {
  const startTime = Date.now();
  const TEST_TIMEOUT = 300000; // 5 minute timeout per test (audio transcription, document analysis can be slow)

  // Load fixture (with channel ID hydration)
  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  const fixture = loadFixtureFromPath(fixturePath);
  if (!fixture) {
    return {
      testId: spec.id,
      passed: false,
      duration: Date.now() - startTime,
      checks: [],
      error: `Failed to load fixture: ${fixturePath}`,
    };
  }

  // Create isolated output directory
  // Use current run directory if set, otherwise create one for single test
  if (!currentRunDir) {
    currentRunDir = join(OUTPUT_BASE_DIR, getRunId());
    mkdirSync(currentRunDir, { recursive: true });
  }
  const testOutputDir = join(currentRunDir, spec.id);
  if (existsSync(testOutputDir)) {
    rmSync(testOutputDir, { recursive: true });
  }
  mkdirSync(testOutputDir, { recursive: true });

  // Seed mock tags for tag-matching tests
  // These tests need known tags to exist in the vault for fuzzy matching
  if (spec.category === "tag-matching") {
    const mockTags = ["projectpie", "ed_overy"]; // Known tags from test specs
    seedTestTags(testOutputDir, mockTags);
    clearTagIndexCache(); // Ensure fresh load from seeded vault
  }

  // Capture verbose output
  let verboseOutput = "";
  const originalLog = console.log;
  const originalError = console.error;

  // Always print test header BEFORE processing starts (not after like status line)
  if (options.verbose) {
    printTestHeader(spec.id, spec.name);
  }

  // Redirect console to capture (and optionally display with prefix)
  console.log = (...args) => {
    const line = args.map(a => String(a)).join(" ");
    verboseOutput += line + "\n";
    if (options.verbose) {
      // Indent verbose output to clearly scope it under the test header
      originalLog(`  ${line}`);
    }
  };
  console.error = (...args) => {
    const line = args.map(a => String(a)).join(" ");
    verboseOutput += "[ERROR] " + line + "\n";
    if (options.verbose) {
      originalError(`  [ERROR] ${line}`);
    }
  };

  try {
    // Get config and profile
    const config = getConfig();
    const profile = loadProfile(config.ingestProfile || "zettelkasten");

    // Prepare message for processing
    const message = fixture.message;

    // If fixture has media, get the local path
    let mediaPath: string | undefined;
    if (fixture._meta.mediaFile) {
      mediaPath = join(FIXTURES_DIR, fixture._meta.mediaFile);
    }

    // Process the message with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Test timed out after ${TEST_TIMEOUT/1000}s`)), TEST_TIMEOUT);
    });

    const result = await Promise.race([
      processMessageForTest(message, mediaPath, profile, config, testOutputDir),
      timeoutPromise,
    ]);

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    // Build test output
    const testOutput: TestOutput = {
      vaultFiles: result.vaultFiles,
      verboseOutput,
      dropboxPath: result.dropboxPath,
    };

    // Validate
    const validationResult = validateTestOutput(spec, testOutput);
    validationResult.duration = Date.now() - startTime;
    validationResult.verboseOutput = verboseOutput;

    // Save verbose output to disk (always, for debugging/audit)
    saveTestTrace(spec.id, spec.name, verboseOutput, validationResult, testOutputDir);

    // Cleanup test output dir if not keeping output (but trace is already saved to run dir)
    if (!options.keepOutput && existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true });
    }

    return validationResult;
  } catch (err) {
    // Restore console
    console.log = originalLog;
    console.error = originalError;

    const errorResult: ValidationResult = {
      testId: spec.id,
      passed: false,
      duration: Date.now() - startTime,
      checks: [],
      verboseOutput,
      error: String(err),
    };

    // Save trace even for errors
    saveTestTrace(spec.id, spec.name, verboseOutput, errorResult, testOutputDir);

    return errorResult;
  }
}

/**
 * Run all tests matching criteria
 */
export async function runTests(
  options: RunnerOptions = {}
): Promise<TestRunSummary> {
  const startedAt = new Date().toISOString();
  const results: ValidationResult[] = [];

  // Create timestamped run directory (use provided runId or generate new one)
  const runId = options.runId || getRunId();
  currentRunDir = join(OUTPUT_BASE_DIR, runId);
  mkdirSync(currentRunDir, { recursive: true });
  console.log(`Test run: ${runId}`);

  // Determine which tests to run
  let specs: TestSpec[];
  if (options.testId) {
    const spec = getSpecById(options.testId);
    specs = spec ? [spec] : [];
  } else if (options.suite) {
    specs = getSpecsByCategory(options.suite);
  } else if (options.all) {
    specs = allIngestSpecs;
  } else {
    // Default: run tests that have fixtures
    specs = allIngestSpecs.filter(s => fixtureExists(s.id));
  }

  console.log(`\nRunning ${specs.length} tests...\n`);

  for (const spec of specs) {
    const result = await runTest(spec.id, {
      verbose: options.verbose,
      keepOutput: options.keepOutput,
      skipMedia: options.skipMedia,
    });
    results.push(result);

    // Check if this was a skipped test
    const isSkipped = result.checks.some(c => c.name === "skipped");
    const skipReasonRaw = result.checks.find(c => c.name === "skipped")?.expected;
    const skipReason = typeof skipReasonRaw === "string" ? skipReasonRaw : "";

    // Print progress using shared format
    if (isSkipped) {
      printSkippedTest(spec.id, spec.name, skipReason);
    } else {
      printTestResult(spec.id, spec.name, result.passed, result.duration, {
        hasSemanticValidation: !!spec.expected.semantic,
        verbose: options.verbose,
      });
    }

    if (!result.passed && !isSkipped && result.error) {
      printTestError(result.error);
    }
    if (!result.passed && !isSkipped && result.checks.length > 0) {
      const failed = result.checks.filter(c => !c.passed);
      for (const check of failed.slice(0, 3)) {
        printFailedCheck(check.name, check.error);
      }
    }
  }

  const completedAt = new Date().toISOString();
  const skipped = results.filter(r =>
    r.checks.some(c => c.name === "skipped")
  ).length;
  const passed = results.filter(r => r.passed).length;
  // Failed = not passed AND not skipped
  const failed = results.filter(r => 
    !r.passed && !r.checks.some(c => c.name === "skipped")
  ).length;

  const summary: TestRunSummary = {
    runId,
    startedAt,
    completedAt,
    duration: results.reduce((sum, r) => sum + r.duration, 0),
    counts: {
      total: results.length,
      passed,
      failed,
      skipped,
    },
    results,
  };

  // Generate and save reports
  const specMap = new Map(specs.map(s => [s.id, { name: s.name, category: s.category }]));
  const report = generateReport(runId, summary, specMap);

  const jsonPath = saveJsonReport(runId, report);
  const markdown = generateMarkdownReport(report);
  const mdPath = saveMarkdownReport(runId, markdown);

  // Save the complete run log with all test traces
  const runLogPath = saveRunLog(runId);

  // Add to history for tracking across runs (unless caller will record unified entry)
  if (!options.skipHistory) {
    appendHistory(report);
  }

  console.log(`\nReports saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  Markdown: ${mdPath}`);
  console.log(`  Run Log: ${runLogPath}`);

  return summary;
}

/**
 * Print test summary
 */
export function printSummary(summary: TestRunSummary): void {
  console.log("\n" + "═".repeat(50));
  console.log("UNIT TEST SUMMARY");
  console.log("═".repeat(50));
  console.log(`Total:    ${summary.counts.total}`);
  
  // Always show all three statuses for consistency
  const passedColor = summary.counts.passed > 0 ? "\x1b[32m" : "";
  const failedColor = summary.counts.failed > 0 ? "\x1b[31m" : "";
  const skippedColor = summary.counts.skipped > 0 ? "\x1b[33m" : "\x1b[2m";
  
  console.log(`${passedColor}Passed:   ${summary.counts.passed}\x1b[0m`);
  console.log(`${failedColor}Failed:   ${summary.counts.failed}\x1b[0m`);
  console.log(`${skippedColor}Skipped:  ${summary.counts.skipped}\x1b[0m`);
  console.log(`Duration: ${(summary.duration / 1000).toFixed(1)}s`);
  console.log("═".repeat(50));

  if (summary.counts.failed > 0) {
    console.log("\nFailed tests:");
    for (const result of summary.results.filter(r => 
      !r.passed && !r.checks.some(c => c.name === "skipped")
    )) {
      console.log(`  - ${result.testId}: ${result.error || "validation failed"}`);
    }
  }
}

// =============================================================================
// Test Status Functions
// =============================================================================

/**
 * Get status of all tests
 */
export function getTestStatus(): {
  spec: TestSpec;
  hasFixture: boolean;
  lastRun?: string;
  lastResult?: "passed" | "failed";
}[] {
  return allIngestSpecs.map(spec => ({
    spec,
    hasFixture: fixtureExists(spec.id),
    // TODO: Track last run results in a state file
  }));
}

/**
 * Print test status table
 */
export function printTestStatus(): void {
  const status = getTestStatus();

  console.log("\n" + "=".repeat(70));
  console.log("TEST STATUS");
  console.log("=".repeat(70));
  console.log(
    "ID".padEnd(20) +
    "Name".padEnd(35) +
    "Fixture".padEnd(10) +
    "Status"
  );
  console.log("-".repeat(70));

  for (const { spec, hasFixture, lastResult } of status) {
    const fixtureIcon = hasFixture ? "✓" : "✗";
    const statusStr = lastResult || (hasFixture ? "ready" : "no fixture");
    console.log(
      spec.id.padEnd(20) +
      spec.name.slice(0, 33).padEnd(35) +
      fixtureIcon.padEnd(10) +
      statusStr
    );
  }

  console.log("-".repeat(70));
  const withFixture = status.filter(s => s.hasFixture).length;
  console.log(`Fixtures: ${withFixture}/${status.length}`);
}

// =============================================================================
// Adapted Process Function for Testing
// =============================================================================

interface TestProcessResult {
  vaultFiles: string[];
  dropboxPath?: string;
}

/**
 * Process message in test context
 * Calls real processor with test isolation via environment override
 */
async function processMessageForTest(
  message: Fixture["message"],
  mediaPath: string | undefined,
  profile: ReturnType<typeof loadProfile>,
  config: ReturnType<typeof getConfig>,
  outputDir: string
): Promise<TestProcessResult> {
  const { classifyContent } = await import("../../lib/telegram");
  const { resetConfig } = await import("../../lib/config");
  const { saveToVault } = await import("../../lib/process");

  // Temporarily override vault path for test isolation
  const originalVaultPath = process.env.OBSIDIAN_VAULT_PATH;
  process.env.OBSIDIAN_VAULT_PATH = outputDir;

  // Reset config cache so it picks up the new env var
  resetConfig();

  // Track files before processing
  const filesBefore = new Set<string>();
  try {
    scanDir(outputDir, filesBefore);
  } catch {}

  let dropboxPath: string | undefined;

  try {
    // Classify content type
    const contentType = classifyContent(message as any);
    console.log(`[TEST] Processing ${contentType} message_id=${message.message_id}`);

    // Call real processor - this returns processed content but doesn't save files
    const result = await processMessage(message as any, contentType, profile);

    if (!result.success || !result.content) {
      console.log(`[TEST] Processing failed: ${result.error}`);
      return { vaultFiles: [], dropboxPath: undefined };
    }

    // Save each processed content item to vault
    // (processMessage returns content, saveToVault writes the files)
    for (const processed of result.content) {
      const isWisdom = !!processed.processedContent;
      const saveResult = await saveToVault(processed, profile, isWisdom);
      console.log(`[TEST] Saved: ${saveResult.vaultPath}`);
      if (saveResult.dropboxPath) {
        dropboxPath = saveResult.dropboxPath;
      }
    }

    // Find new files created
    const filesAfter = new Set<string>();
    scanDir(outputDir, filesAfter);

    const newFiles = [...filesAfter].filter(f => !filesBefore.has(f));
    console.log(`[TEST] Created ${newFiles.length} files`);

    return {
      vaultFiles: newFiles,
      dropboxPath,
    };
  } finally {
    // Restore original vault path
    if (originalVaultPath) {
      process.env.OBSIDIAN_VAULT_PATH = originalVaultPath;
    } else {
      delete process.env.OBSIDIAN_VAULT_PATH;
    }
    // Reset config cache again so it picks up the restored path
    const { resetConfig: resetConfigAgain } = await import("../../lib/config");
    resetConfigAgain();
  }
}

/**
 * Recursively scan directory for .md files
 */
function scanDir(dir: string, files: Set<string>): void {
  const { readdirSync, statSync, existsSync } = require("fs");
  const { join } = require("path");

  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory() && !entry.startsWith(".")) {
      scanDir(fullPath, files);
    } else if (entry.endsWith(".md")) {
      files.add(fullPath);
    }
  }
}
