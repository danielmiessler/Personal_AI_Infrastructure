#!/usr/bin/env bun
/**
 * Add LLM-as-Judge Semantic Result
 *
 * Simple CLI to record Claude's semantic validation for a test.
 * Called by Claude after reviewing test outputs.
 *
 * Usage: bun run test/add-semantic-result.ts <runId> <testId> <passed> <confidence> <reasoning> [checkpoints...]
 *
 * Example:
 *   bun run test/add-semantic-result.ts run-2025-12-04-001 TEST-PAT-001 true 90 "Meeting notes well structured"
 */

import { runTracker, type SemanticResult } from "./framework/run-tracker";

const args = process.argv.slice(2);

if (args.length < 5) {
  console.error("Usage: add-semantic-result.ts <runId> <testId> <passed> <confidence> <reasoning>");
  console.error("Example: add-semantic-result.ts run-2025-12-04-001 TEST-PAT-001 true 90 'Meeting notes well structured'");
  process.exit(1);
}

const [runId, testId, passedStr, confidenceStr, reasoning] = args;
const passed = passedStr === "true";
const confidence = parseInt(confidenceStr, 10);

// Load the run
const run = runTracker.loadRun(runId);
if (!run) {
  console.error(`Run not found: ${runId}`);
  process.exit(1);
}

// Build semantic result
const semantic: SemanticResult = {
  passed,
  confidence,
  reasoning,
};

// Record it
try {
  runTracker.recordSemanticResult(testId, semantic);
  console.log(`✅ Recorded semantic result for ${testId}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Confidence: ${confidence}%`);
  console.log(`   Reasoning: ${reasoning}`);
} catch (err) {
  console.error(`❌ Failed to record: ${err}`);
  process.exit(1);
}
