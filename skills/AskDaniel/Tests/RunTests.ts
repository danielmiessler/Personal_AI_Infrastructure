#!/usr/bin/env bun
/**
 * RunTests.ts - Run AskDaniel test cases
 *
 * Usage: bun run $PAI_DIR/skills/AskDaniel/Tests/RunTests.ts
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { spawnSync } from 'child_process';

const TESTS_DIR = dirname(import.meta.path);
const REVIEW_TOOL = join(TESTS_DIR, '..', 'Tools', 'Review.ts');

interface TestCase {
  name: string;
  input: string;
  expectedRecommendation: 'PROCEED' | 'REVISE' | 'REJECT';
  expectedRedFlags: string[];
}

function extractTestCase(content: string, filename: string): TestCase | null {
  // Extract input from code block after "Input Feature Request"
  const inputMatch = content.match(/## Input Feature Request\s+```\s*([\s\S]*?)\s*```/);
  if (!inputMatch) return null;

  // Extract expected recommendation
  const recMatch = content.match(/\*\*Recommendation:\*\*\s*(PROCEED|REVISE|REJECT)/);
  if (!recMatch) return null;

  // Extract expected red flags
  const redFlagsSection = content.match(/\*\*Red Flags:\*\*\s*([\s\S]*?)(?=##|$)/);
  const redFlags: string[] = [];
  if (redFlagsSection && !redFlagsSection[1].includes('None')) {
    const flagMatches = redFlagsSection[1].matchAll(/- "([^"]+)"/g);
    for (const match of flagMatches) {
      redFlags.push(match[1]);
    }
  }

  return {
    name: filename.replace('.md', ''),
    input: inputMatch[1].trim(),
    expectedRecommendation: recMatch[1] as 'PROCEED' | 'REVISE' | 'REJECT',
    expectedRedFlags: redFlags,
  };
}

function runTest(testCase: TestCase): { passed: boolean; details: string } {
  const result = spawnSync('bun', ['run', REVIEW_TOOL, '--feature', testCase.input, '--json'], {
    encoding: 'utf-8',
    timeout: 30000,
  });

  if (result.error || result.status !== 0) {
    return {
      passed: false,
      details: `Tool execution failed: ${result.stderr || result.error}`,
    };
  }

  try {
    const output = JSON.parse(result.stdout);

    // Check recommendation
    const recMatch = output.recommendation === testCase.expectedRecommendation;

    // Check red flags (simplified: just check count matches for now)
    const flagsMatch = output.red_flags_detected.length === testCase.expectedRedFlags.length;

    if (recMatch && flagsMatch) {
      return { passed: true, details: 'All checks passed' };
    }

    let details = '';
    if (!recMatch) {
      details += `Recommendation: expected ${testCase.expectedRecommendation}, got ${output.recommendation}. `;
    }
    if (!flagsMatch) {
      details += `Red flags: expected ${testCase.expectedRedFlags.length}, got ${output.red_flags_detected.length}.`;
    }

    return { passed: false, details };
  } catch (e) {
    return { passed: false, details: `Failed to parse output: ${e}` };
  }
}

async function main(): Promise<void> {
  console.log('\n=== AskDaniel Test Suite ===\n');

  const testFiles = readdirSync(TESTS_DIR).filter(
    f => f.endsWith('.md') && !f.startsWith('README')
  );

  let passed = 0;
  let failed = 0;

  for (const file of testFiles) {
    const content = readFileSync(join(TESTS_DIR, file), 'utf-8');
    const testCase = extractTestCase(content, file);

    if (!testCase) {
      console.log(`[ SKIP ] ${file} - Could not parse test case`);
      continue;
    }

    const result = runTest(testCase);

    if (result.passed) {
      console.log(`[ PASS ] ${testCase.name}`);
      passed++;
    } else {
      console.log(`[ FAIL ] ${testCase.name}`);
      console.log(`         ${result.details}`);
      failed++;
    }
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
