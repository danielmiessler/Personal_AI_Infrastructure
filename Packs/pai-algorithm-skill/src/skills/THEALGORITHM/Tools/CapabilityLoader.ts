#!/usr/bin/env bun

/**
 * CapabilityLoader - Load and filter capabilities by effort level
 *
 * Loads the Capabilities.yaml registry and filters available capabilities
 * based on the current effort level.
 *
 * Usage:
 *   bun run CapabilityLoader.ts --effort STANDARD
 *   bun run CapabilityLoader.ts --effort THOROUGH --output json
 *   bun run CapabilityLoader.ts --list-all
 */

import { parseArgs } from "util";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join, dirname } from "path";

type EffortLevel = "TRIVIAL" | "QUICK" | "STANDARD" | "THOROUGH" | "DETERMINED";

interface Capability {
  name: string;
  category: string;
  skill?: string;
  workflow?: string;
  tool?: string;
  subagent_type?: string;
  model?: string;
  effort_min: EffortLevel;
  use_when: string;
  agents?: number;
  traits?: string[];
  icon?: string;
  type?: string;  // For special types like "iterative_loop"
  keywords?: string[];
  max_iterations_default?: number;
  completion_detection?: string;
  plugin_source?: string;
}

interface CapabilityRegistry {
  version: string;
  models: Record<string, any>;
  thinking: Record<string, any>;
  debate: Record<string, any>;
  analysis: Record<string, any>;
  research: Record<string, any>;
  execution: Record<string, any>;
  agent_composition: any;
  parallel: any;
  verification: any;
  effort_unlocks: Record<string, any>;
}

interface LoadResult {
  effort: EffortLevel;
  available: Capability[];
  unavailable: Capability[];
  parallelConfig: {
    maxConcurrent: number;
    backgroundEnabled: boolean;
    spotcheckRequired: boolean;
  };
  models: string[];
}

const EFFORT_ORDER: EffortLevel[] = [
  "TRIVIAL",
  "QUICK",
  "STANDARD",
  "THOROUGH",
  "DETERMINED",
];

function effortMeetsMinimum(
  current: EffortLevel,
  minimum: EffortLevel
): boolean {
  return EFFORT_ORDER.indexOf(current) >= EFFORT_ORDER.indexOf(minimum);
}

function loadCapabilities(): CapabilityRegistry {
  const scriptDir = dirname(import.meta.path);
  const yamlPath = join(scriptDir, "..", "Data", "Capabilities.yaml");

  if (!existsSync(yamlPath)) {
    throw new Error(`Capabilities.yaml not found at ${yamlPath}`);
  }

  const content = readFileSync(yamlPath, "utf-8");
  return parseYaml(content) as CapabilityRegistry;
}

function flattenCapabilities(registry: CapabilityRegistry): Capability[] {
  const capabilities: Capability[] = [];

  // Models
  for (const [name, config] of Object.entries(registry.models || {})) {
    capabilities.push({
      name,
      category: "models",
      effort_min: config.effort_min,
      use_when: config.use_for || config.description,
    });
  }

  // Thinking modes
  for (const [name, config] of Object.entries(registry.thinking || {})) {
    capabilities.push({
      name,
      category: "thinking",
      skill: config.skill,
      workflow: config.workflow,
      tool: config.tool,
      effort_min: config.effort_min,
      use_when: config.use_when,
    });
  }

  // Debate systems
  for (const [name, config] of Object.entries(registry.debate || {})) {
    capabilities.push({
      name,
      category: "debate",
      skill: config.skill,
      workflow: config.workflow,
      effort_min: config.effort_min,
      use_when: config.use_when,
      agents: config.agents,
    });
  }

  // Analysis modes
  for (const [name, config] of Object.entries(registry.analysis || {})) {
    capabilities.push({
      name,
      category: "analysis",
      skill: config.skill,
      effort_min: config.effort_min,
      use_when: config.use_when,
    });
  }

  // Research agents
  for (const [name, config] of Object.entries(registry.research || {})) {
    capabilities.push({
      name,
      category: "research",
      subagent_type: config.subagent_type,
      model: config.model,
      effort_min: config.effort_min,
      use_when: config.use_when,
    });
  }

  // Execution agents
  for (const [name, config] of Object.entries(registry.execution || {})) {
    capabilities.push({
      name,
      category: "execution",
      subagent_type: config.subagent_type,
      model: config.model,
      effort_min: config.effort_min,
      use_when: config.use_when,
      // Ralph loop and other special execution types
      icon: config.icon,
      type: config.type,
      keywords: config.keywords,
      max_iterations_default: config.max_iterations_default,
      completion_detection: config.completion_detection,
      plugin_source: config.plugin_source,
    });
  }

  // Agent composition
  if (registry.agent_composition?.factory) {
    capabilities.push({
      name: "agent_factory",
      category: "composition",
      tool: "AgentFactory",
      effort_min: registry.agent_composition.factory.effort_min || "STANDARD",
      use_when: registry.agent_composition.use_when || "Custom agent composition",
    });
  }

  // Verification
  for (const [name, config] of Object.entries(registry.verification || {})) {
    capabilities.push({
      name,
      category: "verification",
      skill: config.skill,
      traits: config.traits,
      model: config.model,
      effort_min: config.effort_min || "STANDARD",
      use_when: config.use_when,
    });
  }

  return capabilities;
}

function filterByEffort(
  capabilities: Capability[],
  effort: EffortLevel
): { available: Capability[]; unavailable: Capability[] } {
  const available: Capability[] = [];
  const unavailable: Capability[] = [];

  for (const cap of capabilities) {
    if (effortMeetsMinimum(effort, cap.effort_min)) {
      available.push(cap);
    } else {
      unavailable.push(cap);
    }
  }

  return { available, unavailable };
}

function getParallelConfig(
  registry: CapabilityRegistry,
  effort: EffortLevel
): LoadResult["parallelConfig"] {
  const parallel = registry.parallel || {};
  const maxConcurrent = parallel.max_concurrent?.[effort] || 1;

  return {
    maxConcurrent,
    backgroundEnabled: parallel.background_enabled ?? true,
    spotcheckRequired: parallel.spotcheck_required ?? true,
  };
}

function getAvailableModels(
  registry: CapabilityRegistry,
  effort: EffortLevel
): string[] {
  const models: string[] = [];
  for (const [name, config] of Object.entries(registry.models || {})) {
    if (effortMeetsMinimum(effort, config.effort_min)) {
      models.push(name);
    }
  }
  return models;
}

function loadAndFilter(effort: EffortLevel): LoadResult {
  const registry = loadCapabilities();
  const allCapabilities = flattenCapabilities(registry);
  const { available, unavailable } = filterByEffort(allCapabilities, effort);
  const parallelConfig = getParallelConfig(registry, effort);
  const models = getAvailableModels(registry, effort);

  return {
    effort,
    available,
    unavailable,
    parallelConfig,
    models,
  };
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      effort: { type: "string", short: "e" },
      output: { type: "string", short: "o", default: "text" },
      "list-all": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
CapabilityLoader - Load and filter capabilities by effort level

USAGE:
  bun run CapabilityLoader.ts --effort STANDARD
  bun run CapabilityLoader.ts --effort THOROUGH --output json
  bun run CapabilityLoader.ts --list-all

OPTIONS:
  -e, --effort <level>  Effort level: TRIVIAL, QUICK, STANDARD, THOROUGH, DETERMINED
  -o, --output <fmt>    Output format: text (default), json, markdown
  --list-all            List all capabilities regardless of effort
  -h, --help            Show this help

EXAMPLES:
  bun run CapabilityLoader.ts -e STANDARD
  # Shows capabilities available at STANDARD effort

  bun run CapabilityLoader.ts -e THOROUGH -o json
  # JSON output for programmatic use

  bun run CapabilityLoader.ts --list-all
  # Show all capabilities with their effort thresholds
`);
    return;
  }

  if (values["list-all"]) {
    const registry = loadCapabilities();
    const all = flattenCapabilities(registry);

    if (values.output === "json") {
      console.log(JSON.stringify(all, null, 2));
    } else {
      console.log("ALL CAPABILITIES:\n");
      const byCategory = new Map<string, Capability[]>();
      for (const cap of all) {
        const list = byCategory.get(cap.category) || [];
        list.push(cap);
        byCategory.set(cap.category, list);
      }

      for (const [category, caps] of byCategory) {
        console.log(`\n=== ${category.toUpperCase()} ===`);
        for (const cap of caps) {
          console.log(`  ${cap.name} (${cap.effort_min})`);
          console.log(`    → ${cap.use_when}`);
        }
      }
    }
    return;
  }

  if (!values.effort) {
    console.error("Error: --effort is required (or use --list-all)");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  const effort = values.effort.toUpperCase() as EffortLevel;
  if (!EFFORT_ORDER.includes(effort)) {
    console.error(`Error: Invalid effort level: ${values.effort}`);
    console.error(`Valid levels: ${EFFORT_ORDER.join(", ")}`);
    process.exit(1);
  }

  const result = loadAndFilter(effort);

  if (values.output === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else if (values.output === "markdown") {
    console.log(`## Capabilities for ${result.effort}\n`);
    console.log(`**Models:** ${result.models.join(", ")}`);
    console.log(`**Max Parallel:** ${result.parallelConfig.maxConcurrent}`);
    console.log(`**Background:** ${result.parallelConfig.backgroundEnabled}`);
    console.log(`**Spotcheck:** ${result.parallelConfig.spotcheckRequired}\n`);

    console.log("### Available\n");
    const byCategory = new Map<string, Capability[]>();
    for (const cap of result.available) {
      const list = byCategory.get(cap.category) || [];
      list.push(cap);
      byCategory.set(cap.category, list);
    }
    for (const [category, caps] of byCategory) {
      console.log(`**${category}:** ${caps.map((c) => c.name).join(", ")}`);
    }

    if (result.unavailable.length > 0) {
      console.log("\n### Unavailable (higher effort required)\n");
      for (const cap of result.unavailable) {
        console.log(`- ${cap.name} (requires ${cap.effort_min})`);
      }
    }
  } else {
    console.log(`EFFORT LEVEL: ${result.effort}`);
    console.log(`AVAILABLE MODELS: ${result.models.join(", ")}`);
    console.log(`MAX PARALLEL: ${result.parallelConfig.maxConcurrent}`);
    console.log(`BACKGROUND ENABLED: ${result.parallelConfig.backgroundEnabled}`);
    console.log(`SPOTCHECK REQUIRED: ${result.parallelConfig.spotcheckRequired}`);
    console.log(`\nAVAILABLE CAPABILITIES (${result.available.length}):`);

    const byCategory = new Map<string, Capability[]>();
    for (const cap of result.available) {
      const list = byCategory.get(cap.category) || [];
      list.push(cap);
      byCategory.set(cap.category, list);
    }

    for (const [category, caps] of byCategory) {
      console.log(`\n  ${category.toUpperCase()}:`);
      for (const cap of caps) {
        console.log(`    - ${cap.name}`);
      }
    }

    if (result.unavailable.length > 0) {
      console.log(`\nUNAVAILABLE (${result.unavailable.length}):`);
      for (const cap of result.unavailable) {
        console.log(`  - ${cap.name} (requires ${cap.effort_min})`);
      }
    }
  }
}

main().catch(console.error);

// Export for programmatic use
export {
  loadCapabilities,
  flattenCapabilities,
  filterByEffort,
  loadAndFilter,
  effortMeetsMinimum,
  type Capability,
  type CapabilityRegistry,
  type LoadResult,
  type EffortLevel,
};
