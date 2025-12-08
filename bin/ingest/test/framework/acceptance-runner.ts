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
import {
  appendHistory,
  saveJsonReport,
  saveMarkdownReport,
  generateMarkdownReport,
  type TestReport,
  type TestLayer,
} from "./report";
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
  /** Skills to inject via --append-system-prompt (paths relative to .claude/skills/) */
  skillInjection?: string[];
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
  /** LLM-as-judge semantic validation for skill behavior */
  semantic?: {
    description: string;
    checkpoints: string[];
  };
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
    prompt: `Run this command to ingest a test note:

bun run ingest.ts direct --text "[ACC-001] Acceptance test note about quantum computing basics" --caption "#test-acceptance ~work"

Tell me if the command completed successfully.`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should run the ingest command and confirm completion",
        checkpoints: [
          "Ran the ingest command",
          "Command completed without errors",
        ],
      },
    },
    timeout: 90000,
  },
  {
    id: "ACC-002",
    name: "Search for ingested content",
    description: "Claude searches vault for previously ingested test content",
    prompt: `Search the vault for ACC-001 content:

cd ../obs && bun run obs.ts search --text "ACC-001" --recent 10

Tell me if you found any results containing ACC-001.`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should run the search command and find ACC-001 content",
        checkpoints: [
          "Ran obs search command",
          "Found results or reported search completed",
        ],
      },
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
    prompt: `Perform this two-step workflow:

Step 1 - Ingest:
bun run ingest.ts direct --text "[ACC-004] Meeting notes about quarterly planning and budget" --caption "#meeting #planning ~work"

Step 2 - Search:
cd ../obs && bun run obs.ts search --text "ACC-004" --recent 5

Tell me if both steps completed and what you found.`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should complete both ingest and search steps",
        checkpoints: [
          "Executed the ingest command",
          "Executed the search command",
          "Reported results from the search",
        ],
      },
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

Tell me what you found.`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should complete both ingest and tag search",
        checkpoints: [
          "Executed the ingest command",
          "Executed the tag search command",
          "Reported results from search",
        ],
      },
    },
    timeout: 120000,
  },
  {
    id: "ACC-006",
    name: "Context loading workflow: search → read",
    description: "Claude searches by tag, then loads note content using obs read",
    prompt: `Test context loading workflow:

Step 1 - Ingest a note with product tag:
bun run ingest.ts direct --text "[ACC-006] Product roadmap: Q1 priorities include user authentication, API v2, and dashboard redesign" --caption "#product #roadmap ~work"

Step 2 - Search by product tag:
cd ../obs && bun run obs.ts search --tag product --recent 5

Step 3 - Load note content (look for ACC-006 in search results):
cd ../obs && bun run obs.ts read "ACC-006"

Tell me what you found at each step.`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should complete all three steps and show content",
        checkpoints: [
          "Executed ingest command",
          "Executed search with --tag product",
          "Executed obs read command",
          "Showed loaded content or explained results",
        ],
      },
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

Step 3 - Load the note:
cd ../obs && bun run obs.ts read "ACC-007"

Tell me what you found at each step.`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should complete semantic search and read steps",
        checkpoints: [
          "Executed ingest command",
          "Executed semantic search command",
          "Executed obs read command",
          "Reported results from the workflow",
        ],
      },
    },
    timeout: 180000,
  },

  // ==========================================================================
  // Skill Behavior Tests (SKILL-001+) - Test skill instructions via injection
  // ==========================================================================
  {
    id: "SKILL-001",
    name: "Context skill trigger: 'what context do we have on X'",
    description: "Tests that context skill triggers search and shows indexed results",
    skillInjection: ["context/SKILL.md"],
    prompt: `What context do we have on kubernetes?`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should run obs search/semantic command and show results. Focus ONLY on whether the context skill instructions were followed (ignore response format requirements from other skills).",
        checkpoints: [
          "Ran an obs command (search, semantic, or context) via Bash tool",
          "Showed search results to user (any format is acceptable)",
          "Did not dump full content of all notes (discovery focused)",
        ],
      },
    },
    timeout: 180000,
  },
  {
    id: "SKILL-002",
    name: "Context skill: tag-based search",
    description: "Tests that context skill uses tag search when tag is mentioned",
    skillInjection: ["context/SKILL.md"],
    prompt: `Find notes tagged #incoming`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should use obs search --tag and show indexed results. Focus ONLY on whether the context skill instructions were followed (ignore response format requirements from other skills like CORE).",
        checkpoints: [
          "Used obs search or obs context command with --tag flag",
          "Showed matching notes (any format: list, table, or summary)",
          "Results include relevant indexed content",
        ],
      },
    },
    timeout: 180000,
  },
  {
    id: "SKILL-003",
    name: "Context skill: presents structured results",
    description: "Tests that skill presents search results in structured format",
    skillInjection: ["context/SKILL.md"],
    prompt: `What do I know about telegram messages?`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should search and present results in organized format. Focus ONLY on whether the context skill instructions were followed (ignore response format requirements from other skills like CORE).",
        checkpoints: [
          "Ran an obs search or semantic command",
          "Presented results in readable/organized format (table, list, or summary)",
          "Included relevant note information (titles, tags, or content snippets)",
        ],
      },
    },
    timeout: 180000,
  },
  {
    id: "SKILL-004",
    name: "Context skill: two-phase workflow",
    description: "Tests the search → wait → load pattern",
    skillInjection: ["context/SKILL.md"],
    prompt: `Context #project/pai - show me what we have`,
    expected: {
      exitCode: 0,
      semantic: {
        description: "Should show search results and wait for user selection. Focus ONLY on whether the context skill instructions were followed (ignore response format requirements from other skills like CORE).",
        checkpoints: [
          "Searched for project/pai using obs command",
          "Displayed indexed results (any format)",
          "Did NOT automatically load all full note content (discovery first)",
        ],
      },
    },
    timeout: 180000,
  },
];

// =============================================================================
// Test Runner
// =============================================================================

// Skills directory (relative to PAI root)
const SKILLS_DIR = join(import.meta.dir, "..", "..", "..", "..", ".claude", "skills");

/**
 * Load and combine skill content for injection
 */
function loadSkillsForInjection(skillPaths: string[]): string {
  const skillContents: string[] = [];

  for (const skillPath of skillPaths) {
    const fullPath = join(SKILLS_DIR, skillPath);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      skillContents.push(`# Skill: ${skillPath}\n\n${content}`);
    } else {
      console.warn(`  Warning: Skill not found: ${fullPath}`);
    }
  }

  return skillContents.join("\n\n---\n\n");
}

/**
 * Semantic validation result from LLM-as-judge
 */
interface SemanticValidationResult {
  passed: boolean;
  confidence: number;
  reasoning: string;
  checkpoints?: Array<{ checkpoint: string; passed: boolean; reason: string }>;
}

/**
 * Run LLM-as-judge semantic validation on Claude's output
 */
async function runSemanticValidation(
  output: string,
  semantic: { description: string; checkpoints: string[] },
  spec: AcceptanceTestSpec
): Promise<SemanticValidationResult> {
  const checkpointsStr = semantic.checkpoints
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");

  const judgePrompt = `You are evaluating whether Claude followed skill instructions correctly.

## Test Information
- **Test ID:** ${spec.id}
- **Test Name:** ${spec.name}
- **Expected Behavior:** ${semantic.description}

## Checkpoints to Verify
${checkpointsStr}

## Claude's Response to Evaluate
\`\`\`
${output.slice(0, 6000)}${output.length > 6000 ? "\n... (truncated)" : ""}
\`\`\`

## Your Task
Evaluate whether Claude's response meets the expected behavior and passes all checkpoints.

Respond with ONLY a JSON object in this exact format:
{
  "passed": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of your judgment",
  "checkpoints": [
    {"checkpoint": "description", "passed": true/false, "reason": "why"}
  ]
}

Be strict but fair. 80+ confidence = clear pass, 70-79 = marginal, below 70 = fail.`;

  try {
    const escapedJudgePrompt = judgePrompt.replace(/'/g, "'\\''");
    const result = execSync(
      `claude -p --output-format json --dangerously-skip-permissions '${escapedJudgePrompt}'`,
      {
        timeout: 120000,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0" },
      }
    );

    // Parse Claude's response
    const json = JSON.parse(result);
    const responseText = json.result || json.content || result;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*"passed"[\s\S]*"confidence"[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        passed: false,
        confidence: 0,
        reasoning: "Could not extract JSON from judge response",
      };
    }

    const evaluation = JSON.parse(jsonMatch[0]);
    return {
      passed: evaluation.passed === true,
      confidence: Math.min(100, Math.max(0, Number(evaluation.confidence) || 0)),
      reasoning: String(evaluation.reasoning || "No reasoning provided"),
      checkpoints: Array.isArray(evaluation.checkpoints) ? evaluation.checkpoints : undefined,
    };
  } catch (error: any) {
    return {
      passed: false,
      confidence: 0,
      reasoning: `Semantic validation failed: ${error.message}`,
    };
  }
}

/**
 * Run Claude with a prompt and capture output
 */
async function runClaude(
  prompt: string,
  options: { cwd?: string; timeout?: number; skillInjection?: string[] } = {}
): Promise<{ output: string; exitCode: number; error?: string }> {
  const cwd = options.cwd || INGEST_DIR;
  const timeout = options.timeout || 120000;

  try {
    // Escape the prompt for shell - use single quotes and escape internal single quotes
    const escapedPrompt = prompt.replace(/'/g, "'\\''");

    // Build command with optional skill injection
    let command = "claude -p --output-format json --dangerously-skip-permissions";

    if (options.skillInjection?.length) {
      const skillContent = loadSkillsForInjection(options.skillInjection);
      const escapedSkillContent = skillContent.replace(/'/g, "'\\''");
      command += ` --append-system-prompt '${escapedSkillContent}'`;
    }

    command += ` '${escapedPrompt}'`;

    // Use claude -p with JSON output for structured results
    const result = execSync(
      command,
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

  // Use shared format for consistent output across all test layers
  printTestHeader(spec.id, spec.name);
  console.log(`  Prompt: ${spec.prompt.slice(0, 80).replace(/\n/g, " ")}...`);
  if (spec.skillInjection?.length) {
    console.log(`  Skills: ${spec.skillInjection.join(", ")}`);
  }

  try {
    const result = await runClaude(spec.prompt, {
      cwd: spec.cwd || INGEST_DIR,
      timeout: spec.timeout,
      skillInjection: spec.skillInjection,
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

    // LLM-as-judge semantic validation for skill behavior
    if (spec.expected.semantic) {
      console.log(`  Running LLM-as-judge evaluation...`);
      const semanticResult = await runSemanticValidation(output, spec.expected.semantic, spec);
      checks.push({
        name: `semantic:${semanticResult.confidence}%`,
        passed: semanticResult.passed,
        error: semanticResult.passed ? undefined : semanticResult.reasoning,
      });

      // Add individual checkpoint results
      if (semanticResult.checkpoints) {
        for (const cp of semanticResult.checkpoints) {
          checks.push({
            name: `checkpoint:${cp.checkpoint.slice(0, 30)}`,
            passed: cp.passed,
            error: cp.passed ? undefined : cp.reason,
          });
        }
      }
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
    // printTestHeader is called inside executeAcceptanceTest for consistent formatting
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

  // Generate and save reports (same as other layers)
  const jsonPath = saveJsonReport(runId, report);
  const markdown = generateMarkdownReport(report);
  const mdPath = saveMarkdownReport(runId, markdown);

  console.log(`\nReports saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  Markdown: ${mdPath}`);

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
