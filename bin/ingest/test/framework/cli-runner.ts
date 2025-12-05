/**
 * CLI Integration Test Runner (Layer 3)
 *
 * Tests CLI commands:
 * 1. `ingest direct` command with stdin, files, and flags (TEST-CLI-010+)
 * 2. `obs` CLI commands for vault retrieval (CLI-001+)
 *
 * Reference: docs/adr/001-cli-ingestion.md
 */

import { execSync, spawn } from "child_process";
import { join } from "path";
import { existsSync, unlinkSync, readFileSync } from "fs";
import { appendTestFilesRegistry, appendHistory, type TestFileEntry, type TestReport } from "./report";
import { directCLITestSpecs } from "../specs/cli-direct.spec";
import { contextCLITestSpecs } from "../specs/cli-context.spec";
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

export interface CLITestSpec {
  id: string;
  name: string;
  description?: string;
  /** Setup: content to ingest before test */
  setup?: CLITestSetup;
  /** The CLI command to test */
  command: string;
  /** Expected results */
  expected: CLITestExpected;
}

export interface CLITestSetup {
  /** Text content to ingest */
  text?: string;
  /** Caption with hints */
  caption?: string;
  /** File to ingest (path) */
  file?: string;
}

export interface CLITestExpected {
  /** Output should contain these strings */
  contains?: string[];
  /** Output should NOT contain these strings */
  notContains?: string[];
  /** Exit code (default: 0) */
  exitCode?: number;
  /** Minimum number of results */
  minResults?: number;
}

export interface CLITestResult {
  testId: string;
  name: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
  checks: Array<{ name: string; passed: boolean; error?: string }>;
  /** Vault files created during setup */
  createdFiles?: string[];
}

export interface CLITestSummary {
  startedAt: string;
  completedAt: string;
  duration: number;
  counts: { total: number; passed: number; failed: number; skipped: number };
  results: CLITestResult[];
}

// =============================================================================
// Test Specifications
// =============================================================================

export const cliTestSpecs: CLITestSpec[] = [
  {
    id: "CLI-001",
    name: "Tag search finds ingested note",
    description: "Ingest note with tag, verify obs search --tag finds it",
    setup: {
      text: "[CLI-001] Test note for tag search validation",
      caption: "#cli-test-tag ~work",
    },
    command: "obs search --tag cli-test-tag --recent 5",
    expected: {
      contains: ["CLI-001"],
      exitCode: 0,
      minResults: 1,
    },
  },
  {
    id: "CLI-002",
    name: "Text search finds content",
    description: "Ingest note with unique text, verify obs search --text finds it",
    setup: {
      text: "[CLI-002] Unique content about quantum flux capacitors for testing",
      caption: "~work",
    },
    command: 'obs search --text "quantum flux capacitors" --recent 5',
    expected: {
      contains: ["CLI-002"],
      exitCode: 0,
    },
  },
  {
    id: "CLI-003",
    name: "Semantic search finds related content",
    description: "Ingest note about a topic, verify semantic search finds it",
    setup: {
      text: "[CLI-003] Notes from the quarterly planning meeting about product roadmap and feature priorities for next quarter",
      caption: "#meeting ~work",
    },
    command: 'obs semantic "product planning roadmap" --limit 5',
    expected: {
      contains: ["CLI-003"],
      exitCode: 0,
    },
  },
  {
    id: "CLI-004",
    name: "Scope filter excludes private notes from work search",
    description: "Private note should not appear in default (work) scope search",
    setup: {
      text: "[CLI-004] Private health information - blood pressure reading",
      caption: "~private #health",
    },
    command: "obs search --tag health --scope work",
    expected: {
      notContains: ["CLI-004"],
      exitCode: 0,
    },
  },
  {
    id: "CLI-005",
    name: "Scope filter includes private notes with --scope private",
    setup: {
      text: "[CLI-005] Private financial data for tax purposes",
      caption: "~private #finance-test",
    },
    command: "obs search --tag finance-test --scope private --recent 5",
    expected: {
      contains: ["CLI-005"],
      exitCode: 0,
    },
  },
  {
    id: "CLI-006",
    name: "obs tags lists vault tags",
    command: "obs tags --limit 50",
    expected: {
      exitCode: 0,
      // Should have some tags in the vault
    },
  },
  {
    id: "CLI-007",
    name: "obs read retrieves note content",
    description: "Read a specific note by partial name match",
    setup: {
      text: "[CLI-007] Specific content that should be readable via obs read command",
      caption: "#readable-test ~work",
    },
    command: 'obs read "CLI-007"',
    expected: {
      contains: ["CLI-007", "readable"],
      exitCode: 0,
    },
  },
];

/** All CLI test specs (obs tests + ingest direct + context retrieval tests) */
export const allCLITestSpecs: CLITestSpec[] = [
  ...cliTestSpecs,
  ...directCLITestSpecs,
  ...contextCLITestSpecs,
];

// =============================================================================
// Test Runner
// =============================================================================

const INGEST_DIR = join(import.meta.dir, "..", "..");
const OBS_DIR = join(INGEST_DIR, "..", "obs");

/**
 * Run a shell command and capture output
 */
function runCommand(command: string, cwd: string, timeout = 60000): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(command, {
      cwd,
      timeout,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.toString() || "",
      stderr: error.stderr?.toString() || "",
      exitCode: error.status || 1,
    };
  }
}

/**
 * Shell-escape a string for safe command line usage
 */
function shellEscape(str: string): string {
  // Wrap in single quotes and escape any existing single quotes
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Ingest test content and return the vault file path
 */
async function ingestTestContent(setup: CLITestSetup, testId: string): Promise<string | null> {
  const args: string[] = ["run", "ingest.ts", "direct"];

  if (setup.text) {
    args.push("--text", shellEscape(setup.text));
  }
  if (setup.caption) {
    args.push("--caption", shellEscape(setup.caption));
  }
  if (setup.file) {
    args.push("--file", shellEscape(setup.file));
  }

  console.log(`  Setting up: Ingesting test content for ${testId}...`);
  const result = runCommand(`bun ${args.join(" ")}`, INGEST_DIR, 120000);

  if (result.exitCode !== 0) {
    console.log(`  Setup failed: ${result.stderr || result.stdout}`);
    return null;
  }

  // Extract vault path from output
  const vaultMatch = result.stdout.match(/Vault:\s+(.+\.md)/);
  return vaultMatch?.[1] || null;
}

/**
 * Run embeddings to index new content
 */
async function runEmbeddings(): Promise<boolean> {
  console.log("  Building embeddings index...");
  const result = runCommand("bun run obs.ts embed --incremental", OBS_DIR, 300000);

  if (result.exitCode !== 0) {
    console.log(`  Embedding failed: ${result.stderr}`);
    return false;
  }

  console.log("  Embeddings updated");
  return true;
}

/**
 * Run setup phase for a test (ingest content, no command execution)
 */
async function runTestSetup(spec: CLITestSpec, createdFiles: string[]): Promise<void> {
  if (!spec.setup) return;

  console.log(`  Setting up ${spec.id}...`);
  const vaultPath = await ingestTestContent(spec.setup, spec.id);
  if (vaultPath) {
    createdFiles.push(vaultPath);
    console.log(`  ✓ ${spec.id} content ingested`);
  }
}

/**
 * Execute a single CLI test (command only, assumes setup already done)
 */
async function executeTest(spec: CLITestSpec, createdFiles: string[]): Promise<CLITestResult> {
  const startTime = Date.now();
  const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
  let output = "";

  console.log(`\n  Testing ${spec.id}: ${spec.name}`);

  try {
    // Determine command and working directory
    let command = spec.command;
    let cwd = INGEST_DIR;

    if (spec.command.startsWith("obs ")) {
      // obs CLI command - run from obs directory
      command = `bun run obs.ts ${spec.command.slice(4)}`;
      cwd = OBS_DIR;
    } else if (spec.command.includes("ingest.ts") || spec.command.includes("|")) {
      // ingest direct or piped command - run from ingest directory via shell
      command = spec.command;
      cwd = INGEST_DIR;
    }

    console.log(`  Command: ${spec.command}`);
    const result = runCommand(command, cwd, 60000);
    output = result.stdout + result.stderr;

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

    // Check contains
    if (spec.expected.contains) {
      for (const needle of spec.expected.contains) {
        const found = output.includes(needle);
        checks.push({
          name: `contains:${needle.slice(0, 30)}`,
          passed: found,
          error: found ? undefined : `Output does not contain "${needle}"`,
        });
      }
    }

    // Check notContains
    if (spec.expected.notContains) {
      for (const needle of spec.expected.notContains) {
        const found = output.includes(needle);
        checks.push({
          name: `not_contains:${needle.slice(0, 30)}`,
          passed: !found,
          error: found ? `Output should not contain "${needle}"` : undefined,
        });
      }
    }

    // Check minimum results (count lines with note paths)
    if (spec.expected.minResults !== undefined) {
      const lines = output.split("\n").filter((l) => l.includes(".md") || l.includes("2025-"));
      const hasMinResults = lines.length >= spec.expected.minResults;
      checks.push({
        name: `min_results:${spec.expected.minResults}`,
        passed: hasMinResults,
        error: hasMinResults ? undefined : `Expected at least ${spec.expected.minResults} results, got ${lines.length}`,
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
      createdFiles: [...createdFiles],
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
      createdFiles: [...createdFiles],
    };
  }
}

/**
 * Run all CLI integration tests
 */
export async function runCLITests(options: {
  testIds?: string[];
  verbose?: boolean;
  skipEmbeddings?: boolean;
  runId?: string;
  skipHistory?: boolean;
}): Promise<CLITestSummary> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const results: CLITestResult[] = [];
  const allCreatedFiles: string[] = [];

  printLayerHeader(3, "CLI Tests", "🔧", "Tests obs CLI commands: search, semantic, read, tags");

  // Filter tests if specific IDs provided
  // Use allCLITestSpecs to include both obs tests (CLI-001+) and direct tests (TEST-CLI-010+)
  let specs = allCLITestSpecs;
  if (options.testIds?.length) {
    specs = allCLITestSpecs.filter((s) => options.testIds!.includes(s.id));
  }

  console.log(`\nRunning ${specs.length} CLI tests...`);

  // Phase 1: Setup - ingest all test content
  const testsWithSetup = specs.filter((s) => s.setup);
  if (testsWithSetup.length > 0) {
    console.log("\n📥 Phase 1: Ingesting test content...");
    for (const spec of testsWithSetup) {
      await runTestSetup(spec, allCreatedFiles);
    }
  }

  // Phase 2: Build embeddings once (after all content is ingested)
  if (testsWithSetup.length > 0 && !options.skipEmbeddings) {
    console.log("\n🔍 Phase 2: Building embeddings index...");
    await runEmbeddings();
  }

  // Phase 3: Execute all test commands
  console.log("\n🧪 Phase 3: Executing tests...\n");
  for (const spec of specs) {
    if (options.verbose) {
      printTestHeader(spec.id, spec.name);
    }
    const result = await executeTest(spec, allCreatedFiles);
    results.push(result);
  }

  const completedAt = new Date().toISOString();
  const duration = Date.now() - startTime;

  const summary: CLITestSummary = {
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
  const runId = options.runId || `cli-${new Date(startedAt).toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
  const report: TestReport = {
    runId,
    layer: "cli",
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
      category: "cli",
      passed: r.passed,
      duration: r.duration,
      error: r.error,
      failedChecks: r.checks.filter((c) => !c.passed).map((c) => c.name),
    })),
  };

  if (!options.skipHistory) {
    appendHistory(report);
  }

  // Record files for cleanup
  if (allCreatedFiles.length > 0) {
    const testFiles: TestFileEntry[] = allCreatedFiles.map((f) => ({
      testId: "cli-tests",
      vaultPath: f,
      createdAt: new Date().toISOString(),
    }));
    appendTestFilesRegistry(runId, startedAt, completedAt, testFiles);
  }

  return summary;
}

/**
 * Print CLI test help
 */
export function printCLITestHelp(): void {
  console.log(`
CLI Integration Tests (Layer 3)

Tests obs CLI commands for vault retrieval:
  - Tag search (obs search --tag)
  - Text search (obs search --text)
  - Semantic search (obs semantic)
  - Note reading (obs read)
  - Scope filtering (--scope work/private)

Usage:
  bun run ingest.ts test cli                    # Run all CLI tests
  bun run ingest.ts test cli CLI-001            # Run specific test
  bun run ingest.ts test cli --skip-embeddings  # Skip embedding rebuild

Test Flow:
  1. Ingest test content via 'ingest direct'
  2. Build embeddings via 'obs embed --incremental'
  3. Run obs search/semantic commands
  4. Validate output contains expected results
  5. Record results to test-history.json
`);
}
