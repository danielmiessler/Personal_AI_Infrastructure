#!/usr/bin/env bun

/**
 * ComplexityAssessor - Deterministic complexity assessment
 *
 * Analyzes prompts to determine complexity level and agent requirements.
 *
 * Usage:
 *   bun run ComplexityAssessor.ts -p "Should I use microservices?"
 *   bun run ComplexityAssessor.ts -p "What is TypeScript?" --json
 */

import { parseArgs } from "util";
import { colors, c, header } from "../lib/colors";
import { loadComplexityRules, type ComplexityConfig } from "../lib/config-loader";
import type { ComplexityLevel, ComplexityAssessment } from "../../../types/SecondBrain";

// Perspective suggestions by complexity level
const PERSPECTIVES: Record<ComplexityLevel, string[]> = {
  simple: ["analyst"],
  medium: ["analyst", "critic"],
  complex: ["optimist", "pessimist", "pragmatist", "contrarian"],
};

function assessComplexity(prompt: string, config: ComplexityConfig): ComplexityAssessment {
  let totalScore = 0;
  const detectedPatterns: string[] = [];
  const matchedCategories = new Set<string>();

  // Evaluate rules by complexity level
  for (const [level, rules] of Object.entries(config.rules)) {
    const multiplier = config.multipliers[level as keyof typeof config.multipliers] ?? 1;

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, "i");
      if (regex.test(prompt)) {
        totalScore += rule.weight * multiplier;
        detectedPatterns.push(`${rule.category}: "${rule.pattern}"`);
        matchedCategories.add(rule.category);
      }
    }
  }

  // Multi-category bonus
  if (matchedCategories.size > 2) {
    totalScore *= 1.5;
  }

  // Length heuristic
  const words = prompt.split(/\s+/).length;
  if (words > 50) totalScore += 2;
  else if (words > 20) totalScore += 1;

  // Determine level from thresholds
  let level: ComplexityLevel;
  let minimumAgents: number;

  if (totalScore <= config.thresholds.simple.max_score) {
    level = "simple";
    minimumAgents = config.thresholds.simple.agents;
  } else if (totalScore <= config.thresholds.medium.max_score) {
    level = "medium";
    minimumAgents = config.thresholds.medium.agents;
  } else {
    level = "complex";
    minimumAgents = config.thresholds.complex.agents;
  }

  // Handle no patterns case
  if (detectedPatterns.length === 0) {
    return {
      level: "simple",
      confidence: 0.3,
      minimum_agents: 1,
      reasoning: "No complexity patterns detected. Defaulting to simple.",
      detected_patterns: [],
      suggested_perspectives: PERSPECTIVES.simple,
    };
  }

  return {
    level,
    confidence: Math.min(1, totalScore / 10),
    minimum_agents: minimumAgents,
    reasoning: `Detected ${detectedPatterns.length} indicator(s) across ${matchedCategories.size} category(s). Score: ${totalScore.toFixed(1)}.`,
    detected_patterns: detectedPatterns,
    suggested_perspectives: PERSPECTIVES[level],
  };
}

function formatOutput(assessment: ComplexityAssessment): string {
  const levelColor = {
    simple: "green" as const,
    medium: "yellow" as const,
    complex: "red" as const,
  }[assessment.level];

  const lines = [
    header("COMPLEXITY ASSESSMENT"),
    "",
    `Level:           ${c(levelColor, assessment.level.toUpperCase())}`,
    `Confidence:      ${(assessment.confidence * 100).toFixed(0)}%`,
    `Minimum Agents:  ${assessment.minimum_agents}`,
    "",
    `Reasoning: ${assessment.reasoning}`,
  ];

  if (assessment.detected_patterns.length > 0) {
    lines.push("", "Detected Patterns:");
    for (const p of assessment.detected_patterns) {
      lines.push(`  • ${p}`);
    }
  }

  if (assessment.suggested_perspectives) {
    lines.push("", "Suggested Perspectives:");
    lines.push(`  ${assessment.suggested_perspectives.join(", ")}`);
  }

  lines.push(header(""));
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      prompt: { type: "string", short: "p" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
ComplexityAssessor - Assess task complexity for delegation

USAGE:
  bun run ComplexityAssessor.ts -p "prompt" [options]

OPTIONS:
  -p, --prompt <text>  The prompt to assess
  -j, --json           Output as JSON
  -h, --help           Show this help

LEVELS:
  simple  → 1 agent  (lookups, single-step)
  medium  → 2 agents (analysis, research)
  complex → 3+ agents (decisions, strategy)
`);
    return;
  }

  if (!values.prompt) {
    console.error("Error: --prompt is required");
    process.exit(1);
  }

  const config = loadComplexityRules();
  const assessment = assessComplexity(values.prompt, config);

  console.log(values.json ? JSON.stringify(assessment, null, 2) : formatOutput(assessment));
}

if (import.meta.main) {
  main().catch(console.error);
}

export { assessComplexity };
