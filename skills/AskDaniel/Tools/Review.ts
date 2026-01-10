#!/usr/bin/env bun
/**
 * Review.ts - CLI tool for Daniel-style feature review
 *
 * Usage:
 *   bun run $PAI_DIR/skills/AskDaniel/Tools/Review.ts --feature "add a hook for..."
 *   bun run $PAI_DIR/skills/AskDaniel/Tools/Review.ts --input feature.md --output spec.md
 *   bun run $PAI_DIR/skills/AskDaniel/Tools/Review.ts --validate-only --json
 */

import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// Daniel's 10 Principles
const PRINCIPLES = [
  { id: 'clear_thinking', name: 'Clear thinking -> Clear writing', test: 'Can you explain in one sentence?' },
  { id: 'scaffolding_over_model', name: 'Scaffolding > Model', test: 'Would this work better with a better model? If yes, you\'re leaning on the model.' },
  { id: 'code_before_prompts', name: 'Code before prompts', test: 'Can any part be done deterministically in code?' },
  { id: 'unix_philosophy', name: 'Unix philosophy', test: 'Does this do ONE thing well?' },
  { id: 'cli_first', name: 'CLI-first', test: 'Does this have a clear command-line interface?' },
  { id: 'explicit_routing', name: 'Explicit routing', test: 'Can the system deterministically decide when to use this?' },
  { id: 'specs_tests_evals', name: 'Specs/tests/evals', test: 'How do we know this is working?' },
  { id: 'skills_calling_skills', name: 'Skills calling skills', test: 'Does this compose with existing skills?' },
  { id: 'self_updating', name: 'Self-updating', test: 'Can this improve itself over time?' },
  { id: 'history_capture', name: 'History capture', test: 'Does this capture data for future improvement?' },
] as const;

// Red flags that should cause instant rejection
const RED_FLAGS = [
  { pattern: /the ai will figure/i, message: '"The AI will figure it out" - no explicit routing' },
  { pattern: /like .+ but smarter/i, message: '"Like X but smarter" - relying on model cleverness' },
  { pattern: /and then (it )?also/i, message: 'Scope creep detected - "and then it also..."' },
  { pattern: /vibes?/i, message: 'Vibes-based validation mentioned' },
];

// Feature type detection patterns
const FEATURE_TYPES = {
  skill: /\b(skill|capability)\b/i,
  hook: /\b(hook|event|trigger|lifecycle)\b/i,
  tool: /\b(tool|cli|command|utility)\b/i,
  workflow: /\b(workflow|process|flow)\b/i,
};

interface FeatureRequest {
  raw: string;
  type: 'skill' | 'hook' | 'tool' | 'workflow' | 'unknown';
  summary: string;
}

interface PrincipleScore {
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'UNKNOWN';
  notes: string;
}

interface ReviewResult {
  timestamp: string;
  feature_request: string;
  feature_type: string;
  principle_scores: Record<string, PrincipleScore>;
  red_flags_detected: string[];
  recommendation: 'PROCEED' | 'REVISE' | 'REJECT';
  notes: string;
}

function parseFeatureRequest(input: string): FeatureRequest {
  const raw = input.trim();

  // Detect feature type
  let type: FeatureRequest['type'] = 'unknown';
  for (const [featureType, pattern] of Object.entries(FEATURE_TYPES)) {
    if (pattern.test(raw)) {
      type = featureType as FeatureRequest['type'];
      break;
    }
  }

  // Extract summary (first sentence or up to 100 chars)
  const firstSentence = raw.match(/^[^.!?]+[.!?]?/)?.[0] || raw;
  const summary = firstSentence.length > 100 ? firstSentence.slice(0, 100) + '...' : firstSentence;

  return { raw, type, summary };
}

function detectRedFlags(input: string): string[] {
  const detected: string[] = [];
  for (const { pattern, message } of RED_FLAGS) {
    if (pattern.test(input)) {
      detected.push(message);
    }
  }
  return detected;
}

function scorePrinciples(feature: FeatureRequest): Record<string, PrincipleScore> {
  const scores: Record<string, PrincipleScore> = {};

  for (const principle of PRINCIPLES) {
    // Default to UNKNOWN - AI will need to fill in proper scores
    // This is deterministic structure, but scoring requires judgment
    scores[principle.id] = {
      status: 'UNKNOWN',
      notes: `Needs evaluation: ${principle.test}`,
    };

    // Some basic heuristic checks
    if (principle.id === 'cli_first' && feature.type === 'tool') {
      scores[principle.id] = { status: 'PARTIAL', notes: 'Tool type detected - CLI interface expected' };
    }
    if (principle.id === 'unix_philosophy' && feature.raw.includes(' and ')) {
      scores[principle.id] = { status: 'PARTIAL', notes: 'Multiple concerns detected (contains "and")' };
    }
  }

  return scores;
}

function determineRecommendation(
  scores: Record<string, PrincipleScore>,
  redFlags: string[]
): 'PROCEED' | 'REVISE' | 'REJECT' {
  if (redFlags.length > 0) {
    return 'REJECT';
  }

  const failCount = Object.values(scores).filter(s => s.status === 'FAIL').length;
  const unknownCount = Object.values(scores).filter(s => s.status === 'UNKNOWN').length;

  if (failCount > 2) return 'REJECT';
  if (failCount > 0 || unknownCount > 5) return 'REVISE';
  return 'PROCEED';
}

function getReviewsFilePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const reviewsDir = join(PAI_DIR, 'history', 'reviews', `${year}-${month}`);
  if (!existsSync(reviewsDir)) {
    mkdirSync(reviewsDir, { recursive: true });
  }

  return join(reviewsDir, `${year}-${month}-${day}_reviews.jsonl`);
}

function logReview(review: ReviewResult): void {
  const filePath = getReviewsFilePath();
  appendFileSync(filePath, JSON.stringify(review) + '\n', 'utf-8');
  console.error(`Logged review to: ${filePath}`);
}

function formatMarkdown(review: ReviewResult): string {
  let output = `# AskDaniel: ${review.feature_type.toUpperCase()}\n\n`;
  output += `**Request:** ${review.feature_request}\n\n`;
  output += `**Type:** ${review.feature_type}\n\n`;
  output += `**Timestamp:** ${review.timestamp}\n\n`;

  output += `## Principle Scores\n\n`;
  output += `| # | Principle | Status | Notes |\n`;
  output += `|---|-----------|--------|-------|\n`;

  for (const principle of PRINCIPLES) {
    const score = review.principle_scores[principle.id];
    const emoji = score.status === 'PASS' ? 'PASS' : score.status === 'PARTIAL' ? 'PARTIAL' : score.status === 'FAIL' ? 'FAIL' : '???';
    output += `| ${PRINCIPLES.indexOf(principle) + 1} | ${principle.name} | ${emoji} | ${score.notes} |\n`;
  }

  output += `\n## Red Flags\n\n`;
  if (review.red_flags_detected.length === 0) {
    output += `None detected.\n`;
  } else {
    for (const flag of review.red_flags_detected) {
      output += `- ${flag}\n`;
    }
  }

  output += `\n## Recommendation: **${review.recommendation}**\n\n`;
  output += review.notes + '\n';

  return output;
}

function showHelp(): void {
  console.log(`
AskDaniel CLI - Feature screening against Daniel's principles

Usage:
  bun run Review.ts --feature <text>    Review a feature request
  bun run Review.ts --input <file>      Read feature from file
  bun run Review.ts --validate-only     Just score principles, don't generate full output
  bun run Review.ts --json              Output as JSON instead of markdown
  bun run Review.ts --log               Log review to history/reviews/*.jsonl
  bun run Review.ts --help              Show this help

Options:
  --feature <text>    Feature request to review (required unless --input)
  --input <file>      Read feature request from markdown file
  --output <file>     Write result to file (default: stdout)
  --validate-only     Score principles without generating full spec
  --json              Output as JSON instead of markdown
  --log               Log review to JSONL

Examples:
  bun run Review.ts --feature "add a hook for session tracking" --log
  bun run Review.ts --input feature.md --output spec.md
  bun run Review.ts --feature "new skill for reading" --validate-only --json
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  // Parse arguments
  let featureText = '';
  let outputFile = '';
  let validateOnly = args.includes('--validate-only');
  let outputJson = args.includes('--json');
  let shouldLog = args.includes('--log');

  const featureIndex = args.indexOf('--feature');
  if (featureIndex !== -1 && args[featureIndex + 1]) {
    featureText = args[featureIndex + 1];
  }

  const inputIndex = args.indexOf('--input');
  if (inputIndex !== -1 && args[inputIndex + 1]) {
    const inputFile = args[inputIndex + 1];
    if (existsSync(inputFile)) {
      featureText = readFileSync(inputFile, 'utf-8');
    } else {
      console.error(`Error: Input file not found: ${inputFile}`);
      process.exit(1);
    }
  }

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    outputFile = args[outputIndex + 1];
  }

  if (!featureText) {
    console.error('Error: No feature text provided. Use --feature or --input.');
    process.exit(1);
  }

  // Process the review
  const feature = parseFeatureRequest(featureText);
  const redFlags = detectRedFlags(featureText);
  const scores = scorePrinciples(feature);
  const recommendation = determineRecommendation(scores, redFlags);

  const review: ReviewResult = {
    timestamp: new Date().toISOString(),
    feature_request: feature.raw,
    feature_type: feature.type,
    principle_scores: scores,
    red_flags_detected: redFlags,
    recommendation,
    notes: recommendation === 'REJECT'
      ? 'Feature has critical issues that need addressing before proceeding.'
      : recommendation === 'REVISE'
      ? 'Feature needs refinement. Address UNKNOWN and PARTIAL scores.'
      : 'Feature passes initial screening. Proceed with detailed design.',
  };

  // Log if requested
  if (shouldLog) {
    logReview(review);
  }

  // Output
  let output: string;
  if (outputJson) {
    output = JSON.stringify(review, null, 2);
  } else {
    output = formatMarkdown(review);
  }

  if (outputFile) {
    const { writeFileSync } = await import('fs');
    writeFileSync(outputFile, output, 'utf-8');
    console.error(`Output written to: ${outputFile}`);
  } else {
    console.log(output);
  }
}

main().catch(console.error);
