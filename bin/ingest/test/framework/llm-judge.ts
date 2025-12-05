/**
 * LLM-as-Judge Semantic Validation
 *
 * Automates semantic validation using Claude Code (`claude -p`) to evaluate
 * test outputs that require qualitative assessment beyond deterministic checks.
 *
 * Usage:
 *   - Called after deterministic tests complete
 *   - Reviews vault output files (raw/wisdom)
 *   - Records confidence scores with reasoning
 */

import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join, basename } from "path";
import type { TestSpec, SemanticValidation } from "./types";
import type { SemanticResult } from "./run-tracker";
import { getConfig } from "../../lib/config";

// =============================================================================
// Types
// =============================================================================

export interface LLMJudgeOptions {
  /** Test IDs to evaluate (default: all tests with semantic validation spec) */
  testIds?: string[];
  /** Run ID to load results from */
  runId: string;
  /** Timeout per evaluation in ms (default: 120000) */
  timeout?: number;
  /** Verbose output */
  verbose?: boolean;
  /** Dry run - show prompts without executing */
  dryRun?: boolean;
}

export interface LLMJudgeResult {
  testId: string;
  semantic: SemanticResult;
  vaultFilePath?: string;
  wisdomFilePath?: string;
  promptUsed: string;
}

// =============================================================================
// Constants
// =============================================================================

const OUTPUT_DIR = join(import.meta.dir, "..", "output");
const DEFAULT_TIMEOUT = 120000;

// =============================================================================
// LLM Judge Implementation
// =============================================================================

/**
 * Build the evaluation prompt for Claude
 */
function buildEvaluationPrompt(
  spec: TestSpec,
  vaultContent: string,
  wisdomContent: string | null,
  verboseOutput: string
): string {
  const semantic = spec.expected.semantic;
  if (!semantic) {
    throw new Error(`Test ${spec.id} has no semantic validation spec`);
  }

  const targetContent = semantic.target === "raw" ? vaultContent
    : semantic.target === "wisdom" && wisdomContent ? wisdomContent
    : vaultContent;

  const checkpointsStr = semantic.checkpoints?.length
    ? `\n\nSpecific checkpoints to verify:\n${semantic.checkpoints.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    : "";

  return `You are evaluating the output of a content processing pipeline test.

## Test Information
- **Test ID:** ${spec.id}
- **Test Name:** ${spec.name}
- **Description:** ${spec.description || "N/A"}
- **Input Type:** ${spec.input.type}
- **Expected Outcome:** ${semantic.description}
${checkpointsStr}

## Processing Log (verbose output)
\`\`\`
${verboseOutput.slice(0, 3000)}${verboseOutput.length > 3000 ? "\n... (truncated)" : ""}
\`\`\`

## Output Content to Evaluate
\`\`\`markdown
${targetContent.slice(0, 8000)}${targetContent.length > 8000 ? "\n... (truncated)" : ""}
\`\`\`

## Your Task

Evaluate whether the output meets the expected outcome. Consider:
1. Does the content fulfill the described purpose?
2. Is the structure appropriate for the content type?
3. Are there any obvious errors or omissions?
${semantic.checkpoints?.length ? "4. Do all specified checkpoints pass?" : ""}

Respond with ONLY a JSON object in this exact format:
{
  "passed": true/false,
  "confidence": 0-100,
  "reasoning": "Brief explanation of your judgment",
  "checkpoints": [
    {"checkpoint": "description", "passed": true/false, "reason": "why"}
  ]
}

Be strict but fair. A confidence of 80+ means clear pass, 70-79 is marginal, below 70 is fail.`;
}

/**
 * Run Claude evaluation and parse response
 */
async function runClaudeEvaluation(
  prompt: string,
  timeout: number
): Promise<SemanticResult> {
  try {
    // Escape the prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''");

    // Run claude -p with JSON output
    const result = execSync(
      `claude -p --output-format json --dangerously-skip-permissions '${escapedPrompt}'`,
      {
        timeout,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0" },
      }
    );

    // Parse Claude's response
    const json = JSON.parse(result);
    const responseText = json.result || json.content || result;

    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*"passed"[\s\S]*"confidence"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    return {
      passed: evaluation.passed === true,
      confidence: Math.min(100, Math.max(0, Number(evaluation.confidence) || 0)),
      reasoning: String(evaluation.reasoning || "No reasoning provided"),
      checkpoints: Array.isArray(evaluation.checkpoints) ? evaluation.checkpoints : undefined,
    };
  } catch (error: any) {
    // Handle timeout or execution errors
    if (error.killed || error.signal === "SIGTERM") {
      return {
        passed: false,
        confidence: 0,
        reasoning: `Evaluation timed out after ${timeout / 1000}s`,
      };
    }

    // Try to extract partial response
    const stdout = error.stdout?.toString() || "";
    try {
      const json = JSON.parse(stdout);
      const responseText = json.result || json.content || stdout;
      const jsonMatch = responseText.match(/\{[\s\S]*"passed"[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        return {
          passed: evaluation.passed === true,
          confidence: Math.min(100, Math.max(0, Number(evaluation.confidence) || 0)),
          reasoning: String(evaluation.reasoning || "Partial response"),
          checkpoints: evaluation.checkpoints,
        };
      }
    } catch {}

    return {
      passed: false,
      confidence: 0,
      reasoning: `Evaluation failed: ${error.message}`,
    };
  }
}

/**
 * Find vault files for a test
 */
function findVaultFilesForTest(
  testId: string,
  runDir: string
): { rawPath?: string; wisdomPath?: string } {
  // First check in the run's test output directory (where unit tests write)
  const testOutputDir = join(runDir, testId);
  const result: { rawPath?: string; wisdomPath?: string } = {};

  // Search for files containing the test ID
  function searchDir(dir: string, depth = 0): void {
    if (depth > 3 || !existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && !["node_modules", "_meta"].includes(entry.name)) {
        searchDir(fullPath, depth + 1);
      } else if (entry.name.endsWith(".md") && entry.name.includes(testId)) {
        if (entry.name.includes("-Wisdom") || entry.name.includes("Wisdom")) {
          result.wisdomPath = fullPath;
        } else if (entry.name.includes("-Raw") || entry.name.includes("Raw") || !result.rawPath) {
          result.rawPath = fullPath;
        }
      }
    }
  }

  // Search in test output directory first (for unit tests)
  if (existsSync(testOutputDir)) {
    searchDir(testOutputDir);
  }

  // Then search vault if not found (for integration tests)
  if (!result.rawPath) {
    const config = getConfig();
    const vaultPath = config.obsidianVaultPath;
    if (vaultPath && existsSync(vaultPath)) {
      searchDir(vaultPath);
    }
  }

  return result;
}

/**
 * Load test trace (verbose output) from run
 */
function loadTestTrace(runDir: string, testId: string): string {
  const tracePath = join(runDir, "traces", `${testId}.log`);
  if (existsSync(tracePath)) {
    return readFileSync(tracePath, "utf-8");
  }
  return "";
}

/**
 * Evaluate a single test with LLM-as-judge
 */
export async function evaluateTest(
  spec: TestSpec,
  runDir: string,
  options: { timeout?: number; verbose?: boolean; dryRun?: boolean } = {}
): Promise<LLMJudgeResult | null> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;

  if (!spec.expected.semantic) {
    return null;
  }

  if (options.verbose) {
    console.log(`\n  Evaluating ${spec.id}: ${spec.name}`);
  }

  // Find vault files
  const { rawPath, wisdomPath } = findVaultFilesForTest(spec.id, runDir);
  const vaultContent = rawPath && existsSync(rawPath) ? readFileSync(rawPath, "utf-8") : "";
  const wisdomContent = wisdomPath && existsSync(wisdomPath) ? readFileSync(wisdomPath, "utf-8") : null;

  if (!vaultContent && !wisdomContent) {
    if (options.verbose) {
      console.log(`    ⚠ No vault files found for ${spec.id}`);
    }
    return {
      testId: spec.id,
      semantic: {
        passed: false,
        confidence: 0,
        reasoning: "No vault output files found to evaluate",
      },
      promptUsed: "",
    };
  }

  // Load verbose output from trace
  const verboseOutput = loadTestTrace(runDir, spec.id);

  // Build prompt
  const prompt = buildEvaluationPrompt(spec, vaultContent, wisdomContent, verboseOutput);

  if (options.dryRun) {
    console.log(`\n--- DRY RUN: ${spec.id} ---`);
    console.log(prompt.slice(0, 500) + "...");
    return {
      testId: spec.id,
      semantic: { passed: true, confidence: 100, reasoning: "Dry run - not evaluated" },
      vaultFilePath: rawPath,
      wisdomFilePath: wisdomPath,
      promptUsed: prompt,
    };
  }

  // Run evaluation
  if (options.verbose) {
    console.log(`    Running Claude evaluation...`);
  }

  const semantic = await runClaudeEvaluation(prompt, timeout);

  if (options.verbose) {
    const icon = semantic.passed ? "✓" : "✗";
    console.log(`    ${icon} ${spec.id}: ${semantic.confidence}% confidence`);
    console.log(`      ${semantic.reasoning.slice(0, 100)}${semantic.reasoning.length > 100 ? "..." : ""}`);
  }

  return {
    testId: spec.id,
    semantic,
    vaultFilePath: rawPath,
    wisdomFilePath: wisdomPath,
    promptUsed: prompt,
  };
}

/**
 * Run LLM-as-judge evaluation for multiple tests
 */
export async function runLLMJudge(
  specs: TestSpec[],
  options: LLMJudgeOptions
): Promise<{
  results: LLMJudgeResult[];
  summary: { total: number; passed: number; failed: number; avgConfidence: number };
}> {
  const runDir = join(OUTPUT_DIR, options.runId);
  if (!existsSync(runDir)) {
    throw new Error(`Run directory not found: ${runDir}`);
  }

  const results: LLMJudgeResult[] = [];

  // Filter to tests that have semantic validation specs
  let testsToEvaluate = specs.filter(s => s.expected.semantic);
  if (options.testIds?.length) {
    testsToEvaluate = testsToEvaluate.filter(s => options.testIds!.includes(s.id));
  }

  console.log(`\n🤖 LLM-as-Judge Semantic Validation`);
  console.log("═".repeat(50));
  console.log(`Evaluating ${testsToEvaluate.length} tests from run: ${options.runId}`);

  for (const spec of testsToEvaluate) {
    const result = await evaluateTest(spec, runDir, {
      timeout: options.timeout,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });
    if (result) {
      results.push(result);
    }
  }

  // Calculate summary
  const passed = results.filter(r => r.semantic.passed).length;
  const failed = results.filter(r => !r.semantic.passed).length;
  const avgConfidence = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.semantic.confidence, 0) / results.length)
    : 0;

  const summary = { total: results.length, passed, failed, avgConfidence };

  // Save results
  const resultsPath = join(runDir, "semantic-validation.json");
  writeFileSync(resultsPath, JSON.stringify({ results, summary }, null, 2));

  // Print summary
  console.log("\n" + "═".repeat(50));
  console.log("LLM-AS-JUDGE SUMMARY");
  console.log("═".repeat(50));
  console.log(`Total:      ${summary.total}`);
  console.log(`Passed:     ${summary.passed}`);
  console.log(`Failed:     ${summary.failed}`);
  console.log(`Avg Conf:   ${summary.avgConfidence}%`);
  console.log("═".repeat(50));
  console.log(`Results saved: ${resultsPath}`);

  return { results, summary };
}

/**
 * Add semantic validation specs to test specs
 * Call this to mark tests that need LLM evaluation
 */
export function addSemanticValidationToSpecs(
  specs: TestSpec[],
  semanticSpecs: Array<{ testId: string; semantic: SemanticValidation }>
): void {
  for (const { testId, semantic } of semanticSpecs) {
    const spec = specs.find(s => s.id === testId);
    if (spec) {
      spec.expected.semantic = semantic;
    }
  }
}

