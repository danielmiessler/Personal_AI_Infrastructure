#!/usr/bin/env bun

/**
 * ComplexityAssessor - Deterministic complexity assessment
 *
 * Analyzes user requests to determine complexity level and
 * minimum number of agents required for delegation.
 *
 * Usage:
 *   bun run ComplexityAssessor.ts -p "Should I use microservices or monolith?"
 *   bun run ComplexityAssessor.ts -p "What is the weather?" --json
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import type {
  ComplexityLevel,
  ComplexityAssessment,
  DelegationRule
} from "../../../types/SecondBrain";

// Pattern-based rules for complexity detection
const COMPLEXITY_RULES: DelegationRule[] = [
  // COMPLEX patterns (strategic, decisions, multi-perspective)
  { pattern: /should\s+i/i, complexity: "complex", weight: 3, category: "decision" },
  { pattern: /should\s+we/i, complexity: "complex", weight: 3, category: "decision" },
  { pattern: /which\s+(is\s+)?better/i, complexity: "complex", weight: 3, category: "comparison" },
  { pattern: /pros?\s+(and|&)\s+cons?/i, complexity: "complex", weight: 3, category: "analysis" },
  { pattern: /trade-?offs?/i, complexity: "complex", weight: 3, category: "analysis" },
  { pattern: /strategy/i, complexity: "complex", weight: 2, category: "strategic" },
  { pattern: /architect(ure)?/i, complexity: "complex", weight: 2, category: "technical" },
  { pattern: /long-?term/i, complexity: "complex", weight: 2, category: "strategic" },
  { pattern: /road-?map/i, complexity: "complex", weight: 2, category: "strategic" },
  { pattern: /recommend/i, complexity: "complex", weight: 2, category: "decision" },
  { pattern: /approach/i, complexity: "medium", weight: 1.5, category: "decision" },
  { pattern: /vs\.?|versus/i, complexity: "medium", weight: 2, category: "comparison" },
  { pattern: /compare/i, complexity: "medium", weight: 2, category: "comparison" },
  { pattern: /difference\s+between/i, complexity: "medium", weight: 2, category: "comparison" },

  // MEDIUM patterns (analysis, research, multi-step)
  { pattern: /analyze/i, complexity: "medium", weight: 2, category: "analysis" },
  { pattern: /research/i, complexity: "medium", weight: 2, category: "research" },
  { pattern: /investigate/i, complexity: "medium", weight: 2, category: "research" },
  { pattern: /review/i, complexity: "medium", weight: 1.5, category: "analysis" },
  { pattern: /implement/i, complexity: "medium", weight: 1.5, category: "technical" },
  { pattern: /refactor/i, complexity: "medium", weight: 1.5, category: "technical" },
  { pattern: /debug/i, complexity: "medium", weight: 1.5, category: "technical" },
  { pattern: /optimize/i, complexity: "medium", weight: 1.5, category: "technical" },
  { pattern: /how\s+(do|can|should)/i, complexity: "medium", weight: 1, category: "how-to" },

  // SIMPLE patterns (lookup, single-step)
  { pattern: /what\s+is/i, complexity: "simple", weight: 1, category: "lookup" },
  { pattern: /where\s+is/i, complexity: "simple", weight: 1, category: "lookup" },
  { pattern: /show\s+me/i, complexity: "simple", weight: 1, category: "lookup" },
  { pattern: /list/i, complexity: "simple", weight: 1, category: "lookup" },
  { pattern: /find/i, complexity: "simple", weight: 1, category: "lookup" },
  { pattern: /check/i, complexity: "simple", weight: 1, category: "lookup" },
  { pattern: /read/i, complexity: "simple", weight: 1, category: "lookup" }
];

// Thresholds for complexity determination
const THRESHOLDS = {
  simple: { max_score: 2, agents: 1 },
  medium: { max_score: 5, agents: 2 },
  complex: { max_score: Infinity, agents: 3 }
};

// Perspective suggestions based on complexity
const PERSPECTIVE_SUGGESTIONS: Record<ComplexityLevel, string[]> = {
  simple: ["analyst"],
  medium: ["analyst", "critic"],
  complex: ["optimist", "pessimist", "pragmatist", "contrarian"]
};

function assessComplexity(prompt: string): ComplexityAssessment {
  let totalScore = 0;
  const detectedPatterns: string[] = [];
  const matchedCategories = new Set<string>();

  // Evaluate against all rules
  for (const rule of COMPLEXITY_RULES) {
    const regex = typeof rule.pattern === "string"
      ? new RegExp(rule.pattern, "i")
      : rule.pattern;

    if (regex.test(prompt)) {
      // Weight complex patterns higher
      const multiplier = rule.complexity === "complex" ? 2 :
                         rule.complexity === "medium" ? 1.5 : 1;

      totalScore += rule.weight * multiplier;
      detectedPatterns.push(`${rule.category}: "${rule.pattern}"`);
      matchedCategories.add(rule.category);
    }
  }

  // Boost for multiple categories (indicates broader scope)
  if (matchedCategories.size > 2) {
    totalScore *= 1.5;
  }

  // Length heuristic - longer prompts often more complex
  const words = prompt.split(/\s+/).length;
  if (words > 50) {
    totalScore += 2;
  } else if (words > 20) {
    totalScore += 1;
  }

  // Determine complexity level
  let level: ComplexityLevel;
  let minimumAgents: number;

  if (totalScore <= THRESHOLDS.simple.max_score) {
    level = "simple";
    minimumAgents = THRESHOLDS.simple.agents;
  } else if (totalScore <= THRESHOLDS.medium.max_score) {
    level = "medium";
    minimumAgents = THRESHOLDS.medium.agents;
  } else {
    level = "complex";
    minimumAgents = THRESHOLDS.complex.agents;
  }

  // Calculate confidence
  const confidence = Math.min(1, totalScore / 10);

  // Generate reasoning
  let reasoning: string;
  if (detectedPatterns.length === 0) {
    reasoning = "No specific complexity patterns detected. Defaulting to simple.";
    level = "simple";
    minimumAgents = 1;
  } else {
    reasoning = `Detected ${detectedPatterns.length} complexity indicator(s) ` +
                `across ${matchedCategories.size} categorie(s). ` +
                `Total score: ${totalScore.toFixed(1)}.`;
  }

  return {
    level,
    confidence,
    minimum_agents: minimumAgents,
    reasoning,
    detected_patterns: detectedPatterns,
    suggested_perspectives: PERSPECTIVE_SUGGESTIONS[level]
  };
}

function formatOutput(assessment: ComplexityAssessment): string {
  const levelColors: Record<ComplexityLevel, string> = {
    simple: "\x1b[32m",   // Green
    medium: "\x1b[33m",   // Yellow
    complex: "\x1b[31m"   // Red
  };
  const reset = "\x1b[0m";
  const color = levelColors[assessment.level];

  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    COMPLEXITY ASSESSMENT                       ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Level:           ${color}${assessment.level.toUpperCase()}${reset}`);
  lines.push(`Confidence:      ${(assessment.confidence * 100).toFixed(0)}%`);
  lines.push(`Minimum Agents:  ${assessment.minimum_agents}`);
  lines.push("");
  lines.push(`Reasoning: ${assessment.reasoning}`);
  lines.push("");

  if (assessment.detected_patterns.length > 0) {
    lines.push("Detected Patterns:");
    for (const pattern of assessment.detected_patterns) {
      lines.push(`  • ${pattern}`);
    }
    lines.push("");
  }

  if (assessment.suggested_perspectives) {
    lines.push("Suggested Perspectives:");
    lines.push(`  ${assessment.suggested_perspectives.join(", ")}`);
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      prompt: { type: "string", short: "p" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" }
    }
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

COMPLEXITY LEVELS:
  simple   → 1 agent  (lookups, single-step tasks)
  medium   → 2 agents (analysis, research, implementation)
  complex  → 3+ agents (decisions, strategy, architecture)

EXAMPLES:
  bun run ComplexityAssessor.ts -p "What is TypeScript?"
  bun run ComplexityAssessor.ts -p "Should I use microservices or monolith?"
  bun run ComplexityAssessor.ts -p "Analyze our sales funnel" --json
`);
    return;
  }

  if (!values.prompt) {
    console.error("Error: --prompt is required");
    console.error("Run with --help for usage");
    process.exit(1);
  }

  const assessment = assessComplexity(values.prompt);

  if (values.json) {
    console.log(JSON.stringify(assessment, null, 2));
  } else {
    console.log(formatOutput(assessment));
  }
}

// Only run main() if this file is the entry point
if (import.meta.main) {
  main().catch(console.error);
}

// Export for use as module
export { assessComplexity, COMPLEXITY_RULES, THRESHOLDS };
