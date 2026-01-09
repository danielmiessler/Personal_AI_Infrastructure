#!/usr/bin/env bun

/**
 * CapabilitySelector - Select appropriate capabilities for ISC rows
 *
 * Analyzes ISC row descriptions and matches them to available capabilities.
 * Used by THE ALGORITHM to determine which capabilities to invoke for each row.
 *
 * Usage:
 *   bun run CapabilitySelector.ts --row "Research what makes good encounters" --effort STANDARD
 *   bun run CapabilitySelector.ts --isc-file current-isc.json --effort THOROUGH
 */

import { parseArgs } from "util";
import {
  loadAndFilter,
  type Capability,
  type EffortLevel,
} from "./CapabilityLoader";

interface CapabilityMatch {
  capability: Capability;
  score: number;
  reasoning: string;
}

interface SelectionResult {
  row: string;
  effort: EffortLevel;
  primaryCapability: Capability | null;
  alternativeCapabilities: Capability[];
  icon: string;
  reasoning: string;
}

// Keywords that suggest specific capability categories
const CAPABILITY_INDICATORS = {
  research: {
    keywords: [
      "research",
      "find out",
      "investigate",
      "look up",
      "search",
      "discover",
      "learn about",
      "understand",
      "what is",
      "how does",
      "current",
      "latest",
      "state of",
    ],
    category: "research",
    icon: "🔬",
  },
  thinking: {
    keywords: [
      "creative",
      "novel",
      "innovative",
      "unique",
      "think",
      "brainstorm",
      "generate",
      "ideate",
      "come up with",
      "design",
      "architect",
    ],
    category: "thinking",
    icon: "💡",
  },
  debate: {
    keywords: [
      "perspectives",
      "viewpoints",
      "debate",
      "discuss",
      "pros and cons",
      "trade-offs",
      "compare",
      "evaluate options",
      "council",
      "adversarial",
      "stress test",
      "red team",
    ],
    category: "debate",
    icon: "🗣️",
  },
  analysis: {
    keywords: [
      "first principles",
      "fundamental",
      "root cause",
      "assumptions",
      "deconstruct",
      "break down",
      "analyze deeply",
      "why",
      "underlying",
    ],
    category: "analysis",
    icon: "🔍",
  },
  execution: {
    keywords: [
      "create",
      "build",
      "implement",
      "write",
      "code",
      "develop",
      "make",
      "produce",
      "generate",
      "construct",
    ],
    category: "execution",
    icon: "🤖",
  },
  verification: {
    keywords: [
      "verify",
      "validate",
      "test",
      "check",
      "confirm",
      "ensure",
      "quality",
      "review",
      "audit",
    ],
    category: "verification",
    icon: "✅",
  },
};

// Specific capability selectors
const SPECIFIC_SELECTORS = {
  // Research agents
  perplexity: ["web", "current events", "citations", "sources", "articles"],
  gemini: ["multiple perspectives", "parallel", "comprehensive research"],
  grok: ["contrarian", "fact-check", "unbiased", "critical"],
  claude: ["academic", "scholarly", "papers", "literature"],
  codex: ["code", "technical", "implementation patterns", "architecture"],

  // Thinking modes
  ultrathink: ["creative", "novel", "innovative", "quality thinking"],
  tree_of_thought: ["complex decision", "branching", "multi-factor", "paths"],
  plan_mode: ["multi-step", "implementation", "approval needed"],

  // Debate
  council: ["perspectives", "collaborative", "design decision", "trade-offs"],
  redteam: ["adversarial", "attack", "weaknesses", "stress test", "vulnerabilities"],

  // Analysis
  first_principles: ["assumptions", "fundamental", "root", "deconstruct"],
  science: ["hypothesis", "experiment", "systematic", "test"],

  // Execution
  intern: ["simple", "parallel", "grunt work", "data gathering"],
  architect: ["system design", "architecture", "high-level"],
  engineer: ["implement", "code", "build", "develop"],
  qa_tester: ["test", "quality", "validation"],
  designer: ["ui", "ux", "user experience", "interface"],
  pentester: ["security", "vulnerability", "penetration"],

  // Iterative execution
  ralph_loop: [
    "iterate until",
    "keep trying",
    "until tests pass",
    "until it works",
    "persistent",
    "retry until",
    "loop until",
    "ralph",
    "keep iterating",
    "don't stop until",
    "iterate on",
    "keep at it",
    "until success",
    "until done",
    "until fixed",
  ],
};

function scoreCapability(
  row: string,
  capability: Capability,
  availableCapabilities: Capability[]
): CapabilityMatch {
  const rowLower = row.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Check category indicators
  for (const [indicatorName, indicator] of Object.entries(CAPABILITY_INDICATORS)) {
    if (indicator.category === capability.category) {
      for (const keyword of indicator.keywords) {
        if (rowLower.includes(keyword)) {
          score += 2;
          reasons.push(`matches "${keyword}"`);
        }
      }
    }
  }

  // Check specific selectors
  const specificKeywords = SPECIFIC_SELECTORS[capability.name as keyof typeof SPECIFIC_SELECTORS];
  if (specificKeywords) {
    for (const keyword of specificKeywords) {
      if (rowLower.includes(keyword)) {
        score += 3;
        reasons.push(`specific match: "${keyword}"`);
      }
    }
  }

  // Check use_when field
  if (capability.use_when) {
    const useWhenLower = capability.use_when.toLowerCase();
    const useWhenWords = useWhenLower.split(/\s+/);
    for (const word of useWhenWords) {
      if (word.length > 3 && rowLower.includes(word)) {
        score += 1;
        reasons.push(`use_when match: "${word}"`);
      }
    }
  }

  return {
    capability,
    score,
    reasoning: reasons.length > 0 ? reasons.join(", ") : "no specific matches",
  };
}

function selectCapabilities(
  row: string,
  effort: EffortLevel
): SelectionResult {
  const { available } = loadAndFilter(effort);

  // Score all available capabilities
  const scores: CapabilityMatch[] = available.map((cap) =>
    scoreCapability(row, cap, available)
  );

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Filter to meaningful matches (score > 0)
  const meaningfulMatches = scores.filter((s) => s.score > 0);

  // Determine primary capability
  const primary = meaningfulMatches.length > 0 ? meaningfulMatches[0] : null;

  // Determine icon based on:
  // 1. Capability's own icon (if defined)
  // 2. Category indicator icon
  // 3. Default
  let icon = "🤖";
  if (primary) {
    // Check if capability has its own icon defined
    if (primary.capability.icon) {
      icon = primary.capability.icon;
    } else {
      const indicator = Object.values(CAPABILITY_INDICATORS).find(
        (ind) => ind.category === primary.capability.category
      );
      if (indicator) {
        icon = indicator.icon;
      }
    }
  }

  // Check for parallel execution indicator
  const rowLower = row.toLowerCase();
  const parallelIndicators = ["each", "all", "multiple", "10", "5", "parallel", "batch"];
  const isParallel = parallelIndicators.some((ind) => rowLower.includes(ind));
  if (isParallel) {
    icon = icon + "×";
  }

  return {
    row,
    effort,
    primaryCapability: primary?.capability || null,
    alternativeCapabilities: meaningfulMatches
      .slice(1, 4)
      .map((m) => m.capability),
    icon,
    reasoning: primary?.reasoning || "No specific capability match - default execution",
  };
}

function selectForMultipleRows(
  rows: string[],
  effort: EffortLevel
): SelectionResult[] {
  return rows.map((row) => selectCapabilities(row, effort));
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      row: { type: "string", short: "r" },
      effort: { type: "string", short: "e", default: "STANDARD" },
      output: { type: "string", short: "o", default: "text" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
CapabilitySelector - Select capabilities for ISC rows

USAGE:
  bun run CapabilitySelector.ts --row "Research what makes good encounters" --effort STANDARD
  bun run CapabilitySelector.ts -r "Create 10 balanced encounters" -e THOROUGH

OPTIONS:
  -r, --row <text>      ISC row description to analyze
  -e, --effort <level>  Effort level (default: STANDARD)
  -o, --output <fmt>    Output format: text (default), json
  -h, --help            Show this help

EXAMPLES:
  bun run CapabilitySelector.ts -r "Research best practices for API design"
  # → Suggests research.perplexity or research.claude

  bun run CapabilitySelector.ts -r "Generate novel solutions creatively" -e THOROUGH
  # → Suggests thinking.ultrathink

  bun run CapabilitySelector.ts -r "Verify implementation against requirements"
  # → Suggests verification.skeptical_verifier
`);
    return;
  }

  if (!values.row) {
    console.error("Error: --row is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  const effort = values.effort?.toUpperCase() as EffortLevel;
  const result = selectCapabilities(values.row, effort);

  if (values.output === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`ROW: ${result.row}`);
    console.log(`EFFORT: ${result.effort}`);
    console.log(`ICON: ${result.icon}`);

    if (result.primaryCapability) {
      console.log(`\nPRIMARY CAPABILITY:`);
      console.log(`  Name: ${result.primaryCapability.name}`);
      console.log(`  Category: ${result.primaryCapability.category}`);
      if (result.primaryCapability.skill) {
        console.log(`  Skill: ${result.primaryCapability.skill}`);
      }
      if (result.primaryCapability.subagent_type) {
        console.log(`  Subagent: ${result.primaryCapability.subagent_type}`);
      }
      console.log(`  Reasoning: ${result.reasoning}`);
    } else {
      console.log(`\nNO SPECIFIC CAPABILITY MATCH`);
      console.log(`Will use default execution agent`);
    }

    if (result.alternativeCapabilities.length > 0) {
      console.log(`\nALTERNATIVES:`);
      for (const alt of result.alternativeCapabilities) {
        console.log(`  - ${alt.name} (${alt.category})`);
      }
    }
  }
}

main().catch(console.error);

// Export for programmatic use
export {
  selectCapabilities,
  selectForMultipleRows,
  scoreCapability,
  type SelectionResult,
  type CapabilityMatch,
};
