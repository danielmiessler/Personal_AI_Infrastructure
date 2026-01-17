#!/usr/bin/env bun

/**
 * TraitModifiers - Map effort levels to AgentFactory trait modifiers
 *
 * THE ALGORITHM uses AgentFactory to compose custom agents.
 * This tool provides the trait modifiers that should be added
 * based on effort level.
 *
 * Usage:
 *   bun run TraitModifiers.ts --effort STANDARD
 *   bun run TraitModifiers.ts --effort THOROUGH --phase execute
 *   bun run TraitModifiers.ts --effort STANDARD --phase verify
 */

import { parseArgs } from "util";

type EffortLevel = "TRIVIAL" | "QUICK" | "STANDARD" | "THOROUGH" | "DETERMINED";
type Phase = "execute" | "verify" | "think";

interface TraitConfig {
  traits: string[];
  model: string;
  maxIterations: number;
  parallelAgents: number;
  description: string;
}

// Effort level → base trait modifiers for EXECUTE phase
const EFFORT_TRAITS: Record<EffortLevel, TraitConfig> = {
  TRIVIAL: {
    traits: [],
    model: "none",
    maxIterations: 0,
    parallelAgents: 0,
    description: "No agents - direct response",
  },
  QUICK: {
    traits: ["rapid", "pragmatic"],
    model: "haiku",
    maxIterations: 1,
    parallelAgents: 2,
    description: "Fast execution, minimal depth",
  },
  STANDARD: {
    traits: ["analytical", "systematic"],
    model: "sonnet",
    maxIterations: 2,
    parallelAgents: 4,
    description: "Balanced analysis and execution",
  },
  THOROUGH: {
    traits: ["thorough", "meticulous"],
    model: "sonnet",
    maxIterations: 5,
    parallelAgents: 6,
    description: "Deep analysis, comprehensive coverage",
  },
  DETERMINED: {
    traits: ["thorough", "meticulous", "adversarial"],
    model: "opus",
    maxIterations: Infinity,
    parallelAgents: 10,
    description: "Unlimited iteration until success",
  },
};

// Phase-specific trait overrides
const PHASE_TRAITS: Record<Phase, string[]> = {
  execute: [], // Uses effort level traits
  verify: ["skeptical", "meticulous", "adversarial"], // Always skeptical
  think: ["analytical", "exploratory"], // Deep thinking
};

// Phase-specific model overrides
const PHASE_MODELS: Record<Phase, Record<EffortLevel, string>> = {
  execute: {
    TRIVIAL: "none",
    QUICK: "haiku",
    STANDARD: "sonnet",
    THOROUGH: "sonnet",
    DETERMINED: "opus",
  },
  verify: {
    TRIVIAL: "none",
    QUICK: "haiku",
    STANDARD: "sonnet",
    THOROUGH: "sonnet",
    DETERMINED: "sonnet", // Verify doesn't need opus
  },
  think: {
    TRIVIAL: "none",
    QUICK: "haiku",
    STANDARD: "sonnet",
    THOROUGH: "opus", // Deep thinking benefits from opus
    DETERMINED: "opus",
  },
};

function getTraitsForPhase(
  effort: EffortLevel,
  phase: Phase
): { traits: string[]; model: string; description: string } {
  const baseConfig = EFFORT_TRAITS[effort];

  if (effort === "TRIVIAL") {
    return {
      traits: [],
      model: "none",
      description: "TRIVIAL effort - no agents used",
    };
  }

  // Verify phase always uses skeptical traits
  if (phase === "verify") {
    return {
      traits: PHASE_TRAITS.verify,
      model: PHASE_MODELS.verify[effort],
      description: "Verification agents - always skeptical and meticulous",
    };
  }

  // Think phase combines effort traits with exploratory
  if (phase === "think") {
    const combined = [...new Set([...baseConfig.traits, ...PHASE_TRAITS.think])];
    return {
      traits: combined,
      model: PHASE_MODELS.think[effort],
      description: `Think phase - ${baseConfig.description} with exploration`,
    };
  }

  // Execute phase uses base effort traits
  return {
    traits: baseConfig.traits,
    model: PHASE_MODELS.execute[effort],
    description: baseConfig.description,
  };
}

function getFullConfig(effort: EffortLevel) {
  const base = EFFORT_TRAITS[effort];
  return {
    effort,
    ...base,
    phases: {
      execute: getTraitsForPhase(effort, "execute"),
      verify: getTraitsForPhase(effort, "verify"),
      think: getTraitsForPhase(effort, "think"),
    },
  };
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      effort: { type: "string", short: "e" },
      phase: { type: "string", short: "p" },
      output: { type: "string", short: "o", default: "text" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
TraitModifiers - Get trait modifiers for THE ALGORITHM

USAGE:
  bun run TraitModifiers.ts --effort STANDARD
  bun run TraitModifiers.ts --effort THOROUGH --phase verify
  bun run TraitModifiers.ts --list

OPTIONS:
  -e, --effort <level>   Effort level: TRIVIAL, QUICK, STANDARD, THOROUGH, DETERMINED
  -p, --phase <phase>    Phase: execute (default), verify, think
  -o, --output <fmt>     Output format: text (default), json, traits-only
  -l, --list             List all effort configurations
  -h, --help             Show this help

EFFORT LEVELS:
  TRIVIAL    → No traits (direct response)
  QUICK      → rapid, pragmatic (haiku)
  STANDARD   → analytical, systematic (sonnet)
  THOROUGH   → thorough, meticulous (sonnet/opus)
  DETERMINED → thorough, meticulous, adversarial (opus)

PHASES:
  execute  → Uses effort-level traits
  verify   → Always: skeptical, meticulous, adversarial
  think    → Effort traits + analytical, exploratory

EXAMPLES:
  # Get traits for STANDARD execute phase
  bun run TraitModifiers.ts -e STANDARD

  # Get verification traits
  bun run TraitModifiers.ts -e THOROUGH -p verify

  # Get just the trait string for AgentFactory
  bun run TraitModifiers.ts -e STANDARD -o traits-only
  # Output: analytical,systematic
`);
    return;
  }

  if (values.list) {
    console.log("EFFORT LEVEL CONFIGURATIONS\n");
    for (const effort of Object.keys(EFFORT_TRAITS) as EffortLevel[]) {
      const config = getFullConfig(effort);
      console.log(`${effort}:`);
      console.log(`  Model: ${config.model}`);
      console.log(`  Max Iterations: ${config.maxIterations}`);
      console.log(`  Parallel Agents: ${config.parallelAgents}`);
      console.log(`  Execute Traits: ${config.phases.execute.traits.join(", ") || "none"}`);
      console.log(`  Verify Traits: ${config.phases.verify.traits.join(", ") || "none"}`);
      console.log(`  Think Traits: ${config.phases.think.traits.join(", ") || "none"}`);
      console.log("");
    }
    return;
  }

  if (!values.effort) {
    console.error("Error: --effort is required");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  const effort = values.effort.toUpperCase() as EffortLevel;
  if (!EFFORT_TRAITS[effort]) {
    console.error(`Error: Invalid effort level: ${values.effort}`);
    console.error("Valid levels: TRIVIAL, QUICK, STANDARD, THOROUGH, DETERMINED");
    process.exit(1);
  }

  const phase = (values.phase?.toLowerCase() || "execute") as Phase;
  if (!["execute", "verify", "think"].includes(phase)) {
    console.error(`Error: Invalid phase: ${values.phase}`);
    console.error("Valid phases: execute, verify, think");
    process.exit(1);
  }

  const result = getTraitsForPhase(effort, phase);
  const fullConfig = EFFORT_TRAITS[effort];

  if (values.output === "json") {
    console.log(
      JSON.stringify(
        {
          effort,
          phase,
          ...result,
          maxIterations: fullConfig.maxIterations,
          parallelAgents: fullConfig.parallelAgents,
        },
        null,
        2
      )
    );
  } else if (values.output === "traits-only") {
    console.log(result.traits.join(","));
  } else {
    console.log(`EFFORT: ${effort}`);
    console.log(`PHASE: ${phase}`);
    console.log(`TRAITS: ${result.traits.join(", ") || "none"}`);
    console.log(`MODEL: ${result.model}`);
    console.log(`DESCRIPTION: ${result.description}`);
    console.log(`MAX ITERATIONS: ${fullConfig.maxIterations}`);
    console.log(`PARALLEL AGENTS: ${fullConfig.parallelAgents}`);
  }
}

main().catch(console.error);
