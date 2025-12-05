/**
 * Acceptance Test Runner (Layer 4)
 *
 * Uses `claude -p` (Claude Code non-interactive mode) as the test executor.
 * Tests end-to-end user scenarios by giving Claude natural language tasks
 * and validating the results.
 *
 * This layer tests:
 * - Whether Claude can understand and execute ingest workflows
 * - Full pipeline from user intent → vault output
 * - Real-world usage patterns
 */

import { execSync, spawn } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { appendHistory, type TestReport, type TestLayer } from "./report";
import {
  printTestHeader,
  printTestStatus,
  printTestError,
  printFailedCheck,
  printLayerHeader,
  printLayerSummary,
} from "./format";

// =============================================================================
// Types
// =============================================================================

export interface AcceptanceTestSpec {
  id: string;
  name: string;
  description?: string;
  /** The natural language prompt given to Claude */
  prompt: string;
  /** Working directory for Claude (defaults to ingest dir) */
  cwd?: string;
  /** Timeout in ms (default: 120000) */
  timeout?: number;
  /** Expected outcomes to validate */
  expected: AcceptanceExpected;
  /** Cleanup: files to delete after test */
  cleanup?: string[];
}

export interface AcceptanceExpected {
  /** Claude's output should contain these strings */
  outputContains?: string[];
  /** Claude's output should NOT contain these strings */
  outputNotContains?: string[];
  /** Files that should exist after the test */
  filesExist?: string[];
  /** File contents should contain these strings */
  fileContains?: Array<{ path: string; contains: string[] }>;
  /** Exit code (default: 0) */
  exitCode?: number;
  /** Custom validator function */
  validator?: (result: AcceptanceTestResult) => { passed: boolean; error?: string };
}

export interface AcceptanceTestResult {
  testId: string;
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
  checks: Array<{ name: string; passed: boolean; error?: string }>;
}

export interface AcceptanceTestSummary {
  startedAt: string;
  completedAt: string;
  duration: number;
  counts: { total: number; passed: number; failed: number; skipped: number };
  results: AcceptanceTestResult[];
}

// =============================================================================
// Test Specifications
// =============================================================================

const INGEST_DIR = join(import.meta.dir, "..", "..");
const VAULT_DIR = process.env.OBSIDIAN_VAULT || join(process.env.HOME!, "Documents", "Obsidian", "Zettelkasten");

export const acceptanceTestSpecs: AcceptanceTestSpec[] = [
  {
    id: "ACC-001",
    name: "Ingest text note via direct command",
    description: "Claude ingests a text note and confirms vault file creation",
    prompt: `Run this exact command and report if it succeeded:

bun run ingest.ts direct --text "[ACC-001] Acceptance test note about quantum computing basics" --caption "#test-acceptance ~work"

Report SUCCESS if the command completed and created a vault file, or FAILURE if there was an error.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE", "error", "Error"],
      exitCode: 0,
    },
    timeout: 90000,
  },
  {
    id: "ACC-002",
    name: "Search for ingested content",
    description: "Claude searches vault for previously ingested test content",
    prompt: `Run this command and report if it found ACC-001:

cd ../obs && bun run obs.ts search --text "ACC-001" --recent 10

Report SUCCESS if search results contain "ACC-001", or FAILURE if not found.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE"],
      exitCode: 0,
    },
    timeout: 60000,
  },
  {
    id: "ACC-003",
    name: "Check test history command",
    description: "Claude runs test history and verifies layer filtering works",
    prompt: `Run the test history command:

bun run ingest.ts test history --layer unit --limit 3

Report SUCCESS if the output shows test run history with pass rates, or FAILURE if there was an error.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE"],
      exitCode: 0,
    },
    timeout: 60000,
  },
  {
    id: "ACC-004",
    name: "Multi-step workflow: ingest and retrieve",
    description: "Claude performs a complete ingest → search workflow",
    prompt: `Perform this two-step test:

Step 1 - Ingest:
bun run ingest.ts direct --text "[ACC-004] Meeting notes about quarterly planning and budget" --caption "#meeting #planning ~work"

Step 2 - Search:
cd ../obs && bun run obs.ts search --text "ACC-004" --recent 5

Report SUCCESS if BOTH steps completed and the search found ACC-004, or FAILURE if any step failed.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE"],
      exitCode: 0,
    },
    timeout: 120000,
  },
  {
    id: "ACC-005",
    name: "Tag search after ingest",
    description: "Claude ingests with tag and verifies tag search works",
    prompt: `Test tag-based retrieval:

Step 1 - Ingest with unique tag:
bun run ingest.ts direct --text "[ACC-005] Research notes on transformers" --caption "#acc-test-ml ~work"

Step 2 - Search by tag:
cd ../obs && bun run obs.ts search --tag acc-test-ml --recent 5

Report SUCCESS if the tag search found ACC-005, or FAILURE if not found.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE"],
      exitCode: 0,
    },
    timeout: 120000,
  },
  {
    id: "ACC-006",
    name: "Context loading workflow: search → read",
    description: "Claude searches by tag, then loads note content using obs read",
    prompt: `Test context loading workflow (search → select → load):

Step 1 - Ingest a note with product tag:
bun run ingest.ts direct --text "[ACC-006] Product roadmap: Q1 priorities include user authentication, API v2, and dashboard redesign" --caption "#product #roadmap ~work"

Step 2 - Search by product tag:
cd ../obs && bun run obs.ts search --tag product --recent 5

Step 3 - Load note content:
cd ../obs && bun run obs.ts read "ACC-006"

Report SUCCESS if:
- Step 2 search found notes with #product tag
- Step 3 loaded content containing "Q1 priorities" or "roadmap"
Report FAILURE if any step failed or content wasn't loaded.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE"],
      exitCode: 0,
    },
    timeout: 120000,
  },
  {
    id: "ACC-007",
    name: "Semantic search context loading",
    description: "Claude uses semantic search to find related notes and loads them",
    prompt: `Test semantic context retrieval:

Step 1 - Ingest a note about machine learning:
bun run ingest.ts direct --text "[ACC-007] Deep learning architecture notes: transformers use attention mechanisms for sequence modeling" --caption "#ml #architecture ~work"

Step 2 - Semantic search for related content:
cd ../obs && bun run obs.ts semantic "neural network architectures" --limit 5

Step 3 - Verify semantic match:
cd ../obs && bun run obs.ts read "ACC-007"

Report SUCCESS if:
- Semantic search returned results related to ML/transformers
- obs read loaded the ACC-007 note content
Report FAILURE if semantic search found nothing or read failed.`,
    expected: {
      outputContains: ["SUCCESS"],
      outputNotContains: ["FAILURE"],
      exitCode: 0,
    },
    timeout: 180000,
  },
];

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Run Claude with a prompt and capture output
 */
async function runClaude(
  prompt: string,
  options: { cwd?: string; timeout?: number } = {}
): Promise<{ output: string; exitCode: number; error?: string }> {
  const cwd = options.cwd || INGEST_DIR;
  const timeout = options.timeout || 120000;

  try {
    // Escape the prompt for shell - use single quotes and escape internal single quotes
    const escapedPrompt = prompt.replace(/'/g, "'\\''");

    // Use claude -p with JSON output for structured results
    const result = execSync(
      `claude -p --output-format json --dangerously-skip-permissions '${escapedPrompt}'`,
      {
        cwd,
        timeout,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0" },
      }
    );

    // Parse JSON output
    try {
      const json = JSON.parse(result);
      // Check if Claude reported an error
      if (json.is_error) {
        return {
          output: json.result || "",
          exitCode: 1,
          error: json.result || "Claude reported an error",
        };
      }
      return {
        output: json.result || json.content || result,
        exitCode: 0,
      };
    } catch {
      // If not JSON, return raw output
      return { output: result, exitCode: 0 };
    }
  } catch (error: any) {
    // execSync throws on non-zero exit, but claude -p still outputs valid JSON
    const stdout = error.stdout?.toString() || "";
    try {
      const json = JSON.parse(stdout);
      if (json.is_error) {
        return {
          output: json.result || "",
          exitCode: 1,
          error: json.result,
        };
      }
      return {
        output: json.result || json.content || stdout,
        exitCode: 0,
      };
    } catch {
      return {
        output: stdout,
        exitCode: error.status || 1,
        error: error.stderr?.toString() || error.message,
      };
    }
  }
}

/**
 * Execute a single acceptance test
 */
async function executeAcceptanceTest(spec: AcceptanceTestSpec): Promise<AcceptanceTestResult> {
  const startTime = Date.now();
  const checks: Array<{ name: string; passed: boolean; error?: string }> = [];

  console.log(`\n  Testing ${spec.id}: ${spec.name}`);
  console.log(`  Prompt: ${spec.prompt.slice(0, 80)}...`);

  try {
    const result = await runClaude(spec.prompt, {
      cwd: spec.cwd || INGEST_DIR,
      timeout: spec.timeout,
    });

    const output = result.output + (result.error || "");

    // Check exit code
    const expectedExit = spec.expected.exitCode ?? 0;
    if (result.exitCode !== expectedExit) {
      checks.push({
        name: `exit_code:${expectedExit}`,
        passed: false,
        error: `Expected exit ${expectedExit}, got ${result.exitCode}`,
      });
    } else {
      checks.push({ name: `exit_code:${expectedExit}`, passed: true });
    }

    // Check output contains
    if (spec.expected.outputContains) {
      for (const needle of spec.expected.outputContains) {
        const found = output.includes(needle);
        checks.push({
          name: `output_contains:${needle.slice(0, 30)}`,
          passed: found,
          error: found ? undefined : `Output does not contain "${needle}"`,
        });
      }
    }

    // Check output not contains
    if (spec.expected.outputNotContains) {
      for (const needle of spec.expected.outputNotContains) {
        const found = output.includes(needle);
        checks.push({
          name: `output_not_contains:${needle.slice(0, 30)}`,
          passed: !found,
          error: found ? `Output should not contain "${needle}"` : undefined,
        });
      }
    }

    // Check files exist
    if (spec.expected.filesExist) {
      for (const filePath of spec.expected.filesExist) {
        const exists = existsSync(filePath);
        checks.push({
          name: `file_exists:${filePath.split("/").pop()}`,
          passed: exists,
          error: exists ? undefined : `File does not exist: ${filePath}`,
        });
      }
    }

    // Check file contains
    if (spec.expected.fileContains) {
      for (const check of spec.expected.fileContains) {
        if (existsSync(check.path)) {
          const content = readFileSync(check.path, "utf-8");
          for (const needle of check.contains) {
            const found = content.includes(needle);
            checks.push({
              name: `file_contains:${needle.slice(0, 20)}`,
              passed: found,
              error: found ? undefined : `File ${check.path} does not contain "${needle}"`,
            });
          }
        } else {
          checks.push({
            name: `file_contains:${check.path.split("/").pop()}`,
            passed: false,
            error: `File does not exist: ${check.path}`,
          });
        }
      }
    }

    // Custom validator
    if (spec.expected.validator) {
      const validatorResult = spec.expected.validator({
        testId: spec.id,
        name: spec.name,
        passed: true,
        duration: Date.now() - startTime,
        output,
        checks: [],
      });
      checks.push({
        name: "custom_validator",
        passed: validatorResult.passed,
        error: validatorResult.error,
      });
    }

    const passed = checks.every((c) => c.passed);
    const duration = Date.now() - startTime;
    
    // Print status using shared format
    printTestStatus(spec.id, spec.name, passed, duration, { verbose: false });
    
    if (!passed) {
      const failed = checks.filter(c => !c.passed);
      for (const check of failed.slice(0, 3)) {
        printFailedCheck(check.name, check.error);
      }
    }

    return {
      testId: spec.id,
      name: spec.name,
      passed,
      duration,
      output: output.slice(0, 2000),
      checks,
    };
  } catch (error) {
    printTestStatus(spec.id, spec.name, false, Date.now() - startTime, { verbose: false });
    printTestError(error instanceof Error ? error.message : String(error));
    return {
      testId: spec.id,
      name: spec.name,
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      checks,
    };
  }
}

/**
 * Run all acceptance tests
 */
export async function runAcceptanceTests(options: {
  testIds?: string[];
  verbose?: boolean;
  runId?: string;
  skipHistory?: boolean;
}): Promise<AcceptanceTestSummary> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const results: AcceptanceTestResult[] = [];

  printLayerHeader(4, "Acceptance Tests", "🎯", "Uses claude -p to test end-to-end user workflows");

  // Filter tests if specific IDs provided
  let specs = acceptanceTestSpecs;
  if (options.testIds?.length) {
    specs = acceptanceTestSpecs.filter((s) => options.testIds!.includes(s.id));
  }

  console.log(`\nRunning ${specs.length} acceptance tests...\n`);

  for (const spec of specs) {
    if (options.verbose) {
      printTestHeader(spec.id, spec.name);
    }
    const result = await executeAcceptanceTest(spec);
    results.push(result);
  }

  const completedAt = new Date().toISOString();
  const duration = Date.now() - startTime;

  const summary: AcceptanceTestSummary = {
    startedAt,
    completedAt,
    duration,
    counts: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      skipped: 0,
    },
    results,
  };

  // Print summary
  // Print summary using shared format
  printLayerSummary(
    summary.counts.passed,
    summary.counts.failed,
    summary.counts.skipped,
    duration
  );

  if (summary.counts.failed > 0) {
    console.log("\nFailed tests:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.testId}: ${r.error || r.checks.filter((c) => !c.passed).map((c) => c.error).join(", ")}`);
    }
  }

  // Record to test history (unless caller will record unified entry)
  const runId = options.runId || `acceptance-${new Date(startedAt).toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
  const report: TestReport = {
    runId,
    layer: "acceptance" as TestLayer,
    startedAt,
    completedAt,
    duration,
    counts: summary.counts,
    passRate: summary.counts.total > 0
      ? Math.round((summary.counts.passed / summary.counts.total) * 100)
      : 0,
    tests: results.map((r) => ({
      id: r.testId,
      name: r.name,
      category: "acceptance",
      passed: r.passed,
      duration: r.duration,
      error: r.error,
      failedChecks: r.checks.filter((c) => !c.passed).map((c) => c.name),
    })),
  };

  if (!options.skipHistory) {
    appendHistory(report);
  }

  return summary;
}

/**
 * Print acceptance test help
 */
export function printAcceptanceTestHelp(): void {
  console.log(`
Acceptance Tests (Layer 4)

Uses claude -p to test end-to-end user workflows:
  - Natural language task prompts
  - Full pipeline execution
  - Real-world usage patterns

Usage:
  bun run ingest.ts test acceptance                # Run all acceptance tests
  bun run ingest.ts test acceptance ACC-001        # Run specific test

Test Flow:
  1. Send natural language prompt to Claude via 'claude -p'
  2. Claude executes commands (ingest, obs, etc.)
  3. Validate output and side effects
  4. Report pass/fail

Available Tests:
${acceptanceTestSpecs.map((s) => `  ${s.id}: ${s.name}`).join("\n")}
`);
}
