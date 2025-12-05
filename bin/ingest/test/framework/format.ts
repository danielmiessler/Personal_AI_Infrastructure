/**
 * Shared Test Output Formatting
 * 
 * Provides consistent visual formatting across all test runners (Unit, Integration, CLI, Acceptance).
 */

// ANSI color codes
export const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
};

const SEPARATOR = "─".repeat(60);

/**
 * Print test header before execution
 */
export function printTestHeader(testId: string, testName: string): void {
  console.log(`\n${SEPARATOR}`);
  console.log(`▶ ${testId}: ${testName}`);
  console.log(SEPARATOR);
}

/**
 * Print test completion status
 */
export function printTestStatus(
  testId: string,
  testName: string,
  passed: boolean,
  durationMs: number,
  options: {
    hasSemanticValidation?: boolean;
    verbose?: boolean;
  } = {}
): void {
  const status = passed ? "✓" : "✗";
  const color = passed ? colors.green : colors.red;
  const durationStr = durationMs > 0 ? `(${(durationMs / 1000).toFixed(1)}s)` : "";
  const llmJudgeIndicator = options.hasSemanticValidation ? ` ${colors.dim}[LLM-JUDGE]${colors.reset}` : "";

  if (options.verbose) {
    // Verbose: show PASSED/FAILED explicitly
    console.log(`${color}${status} ${testId}: ${passed ? "PASSED" : "FAILED"} ${durationStr}${llmJudgeIndicator}${colors.reset}`);
  } else {
    // Compact: show test name
    console.log(`${color}${status}${colors.reset} ${testId}: ${testName} ${durationStr}${llmJudgeIndicator}`);
  }
}

/**
 * Print skipped test status
 */
export function printSkippedTest(testId: string, testName: string, reason: string): void {
  console.log(`${colors.yellow}⊘${colors.reset} ${testId}: ${testName} ${colors.dim}[SKIPPED: ${reason}]${colors.reset}`);
}

/**
 * Print test error
 */
export function printTestError(error: string): void {
  console.log(`  Error: ${error}`);
}

/**
 * Print failed check
 */
export function printFailedCheck(name: string, error?: string): void {
  console.log(`  - ${name}: ${error || "failed"}`);
}

/**
 * Indent output lines for verbose mode (captures log output)
 */
export function indentOutput(line: string): string {
  return `  ${line}`;
}

/**
 * Print layer header (Unit, Integration, CLI, Acceptance)
 */
export function printLayerHeader(
  layerNumber: number,
  layerName: string,
  emoji: string,
  description?: string
): void {
  console.log(`\n${emoji} Layer ${layerNumber}: ${layerName}`);
  console.log("─".repeat(60));
  if (description) {
    console.log(description);
  }
}

/**
 * Print test count summary before running
 */
export function printTestCount(count: number, label: string = "tests"): void {
  console.log(`\nRunning ${count} ${label}...\n`);
}

/**
 * Print final summary for a test layer
 */
export function printLayerSummary(
  passed: number,
  failed: number,
  skipped: number,
  durationMs: number
): void {
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`Passed:   ${passed}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(1)}s`);
  console.log("═".repeat(60));
}

