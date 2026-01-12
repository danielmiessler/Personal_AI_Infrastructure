#!/usr/bin/env bun

/**
 * DelegationRouter - Route tasks to appropriate delegation patterns
 *
 * Determines delegation strategy based on complexity assessment:
 * - Simple → Single agent
 * - Medium → Parallel agents
 * - Complex → Debate with multiple perspectives
 *
 * Usage:
 *   bun run DelegationRouter.ts -p "prompt"
 *   bun run DelegationRouter.ts -p "prompt" --execute
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { assessComplexity } from "./ComplexityAssessor";
import { selectPerspectives, detectMultiLLM, DEFAULT_PERSPECTIVES } from "./DebateOrchestrator";
import { getVaultConfig, searchVault } from "./VaultReader";
import { loadContext, type LoadedContext } from "./ContextLoader";
import { synthesizeFromArchives, type SynthesisResult } from "./ArchiveSynthesis";
import type { ComplexityAssessment, Perspective } from "../../../types/SecondBrain";

interface VaultContext {
  projectContext: string[];
  areaContext: string[];
  archivePatterns: string[];
  relatedNotes: string[];
}

interface DelegationPlan {
  prompt: string;
  assessment: ComplexityAssessment;
  strategy: "single_agent" | "parallel_agents" | "debate_synthesis";
  agents: AgentPlan[];
  multi_llm_available: boolean;
  execution_notes: string[];
  vault_context?: VaultContext;
}

interface AgentPlan {
  id: string;
  role: string;
  perspective?: Perspective;
  provider_preference?: string;
  prompt_template: string;
}

async function loadVaultContext(prompt: string): Promise<VaultContext | undefined> {
  const config = getVaultConfig();
  if (!config.vault_root) return undefined;

  const context: VaultContext = {
    projectContext: [],
    areaContext: [],
    archivePatterns: [],
    relatedNotes: []
  };

  try {
    // Load project/area context
    const loaded = loadContext(config.vault_root, prompt, { maxNotes: 5 });
    context.projectContext = loaded.projectContext.map(n => `${n.title} (${n.path})`);
    context.areaContext = loaded.areaContext.map(n => `${n.title} (${n.path})`);

    // Load archive patterns
    const synthesis = await synthesizeFromArchives(prompt, { depth: "quick", maxPatterns: 5 });
    context.archivePatterns = synthesis.patternsFound
      .filter(p => p.relevance !== "low")
      .map(p => `${p.title}: ${p.potentialConnection}`);

    // Get related notes
    const related = searchVault(config.vault_root, prompt, { maxResults: 5 });
    context.relatedNotes = related.map(r => r.file);

  } catch (err) {
    // Vault operations failed, continue without context
  }

  // Only return if we found something
  const hasContext = context.projectContext.length > 0 ||
                    context.areaContext.length > 0 ||
                    context.archivePatterns.length > 0;

  return hasContext ? context : undefined;
}

async function createDelegationPlan(prompt: string, options: { includeVaultContext?: boolean } = {}): Promise<DelegationPlan> {
  const assessment = assessComplexity(prompt);
  const multiLLM = detectMultiLLM();

  const plan: DelegationPlan = {
    prompt,
    assessment,
    strategy: "single_agent",
    agents: [],
    multi_llm_available: multiLLM.available,
    execution_notes: []
  };

  // Load vault context if requested
  if (options.includeVaultContext) {
    plan.vault_context = await loadVaultContext(prompt);
    if (plan.vault_context) {
      plan.execution_notes.push(`Vault context loaded: ${plan.vault_context.projectContext.length} projects, ${plan.vault_context.areaContext.length} areas, ${plan.vault_context.archivePatterns.length} archive patterns`);
    }
  }

  // Determine strategy based on complexity
  switch (assessment.level) {
    case "simple":
      plan.strategy = "single_agent";
      plan.agents.push({
        id: "agent-1",
        role: "executor",
        prompt_template: `Execute this task:\n\n${prompt}`
      });
      plan.execution_notes.push("Single agent sufficient for simple task");
      break;

    case "medium":
      plan.strategy = "parallel_agents";
      // Create multiple parallel agents
      plan.agents.push({
        id: "agent-1",
        role: "primary_analyst",
        prompt_template: `Analyze the following request thoroughly:\n\n${prompt}\n\nProvide your analysis with key findings.`
      });
      plan.agents.push({
        id: "agent-2",
        role: "validator",
        prompt_template: `Review and validate this request:\n\n${prompt}\n\nIdentify potential issues, gaps, or improvements.`
      });
      plan.execution_notes.push("Parallel execution for medium complexity");
      plan.execution_notes.push("Agent 2 validates Agent 1's work");
      break;

    case "complex":
      plan.strategy = "debate_synthesis";
      const perspectives = selectPerspectives(prompt);

      for (let i = 0; i < perspectives.length; i++) {
        const p = perspectives[i];
        plan.agents.push({
          id: `agent-${i + 1}`,
          role: p.stance || "debater",
          perspective: p,
          provider_preference: multiLLM.available ? multiLLM.providers[i % multiLLM.providers.length] : undefined,
          prompt_template: p.prompt_template.replace("{topic}", prompt)
        });
      }

      // Add synthesizer
      plan.agents.push({
        id: `agent-${perspectives.length + 1}`,
        role: "synthesizer",
        perspective: DEFAULT_PERSPECTIVES.synthesizer,
        prompt_template: DEFAULT_PERSPECTIVES.synthesizer.prompt_template.replace("{topic}", prompt)
      });

      plan.execution_notes.push("Debate pattern for complex decision");
      plan.execution_notes.push(`${perspectives.length} perspectives + 1 synthesizer`);
      if (multiLLM.available) {
        plan.execution_notes.push(`Using external LLMs: ${multiLLM.providers.join(", ")}`);
      } else {
        plan.execution_notes.push("Using Claude subagents (pai-multi-llm not installed)");
      }
      break;
  }

  return plan;
}

function formatPlan(plan: DelegationPlan): string {
  const lines: string[] = [];

  const strategyColors: Record<string, string> = {
    single_agent: "\x1b[32m",      // Green
    parallel_agents: "\x1b[33m",   // Yellow
    debate_synthesis: "\x1b[35m"   // Magenta
  };
  const reset = "\x1b[0m";
  const color = strategyColors[plan.strategy];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                      DELEGATION PLAN                           ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Complexity:    ${plan.assessment.level.toUpperCase()} (${(plan.assessment.confidence * 100).toFixed(0)}% confidence)`);
  lines.push(`Strategy:      ${color}${plan.strategy.replace(/_/g, " ").toUpperCase()}${reset}`);
  lines.push(`Agents:        ${plan.agents.length}`);
  lines.push(`Multi-LLM:     ${plan.multi_llm_available ? "Available" : "Not available"}`);
  lines.push("");

  lines.push("─── AGENTS ───");
  lines.push("");

  for (const agent of plan.agents) {
    lines.push(`[${agent.id}] ${agent.role.toUpperCase()}`);
    if (agent.perspective) {
      lines.push(`  Perspective: ${agent.perspective.name}`);
    }
    if (agent.provider_preference) {
      lines.push(`  Provider: ${agent.provider_preference}`);
    }
    lines.push("");
  }

  if (plan.execution_notes.length > 0) {
    lines.push("─── NOTES ───");
    for (const note of plan.execution_notes) {
      lines.push(`  • ${note}`);
    }
  }

  // Show vault context if present
  if (plan.vault_context) {
    lines.push("");
    lines.push("─── VAULT CONTEXT ───");

    if (plan.vault_context.projectContext.length > 0) {
      lines.push("");
      lines.push("  Projects:");
      for (const p of plan.vault_context.projectContext) {
        lines.push(`    • ${p}`);
      }
    }

    if (plan.vault_context.areaContext.length > 0) {
      lines.push("");
      lines.push("  Areas:");
      for (const a of plan.vault_context.areaContext) {
        lines.push(`    • ${a}`);
      }
    }

    if (plan.vault_context.archivePatterns.length > 0) {
      lines.push("");
      lines.push("  Archive Patterns:");
      for (const ap of plan.vault_context.archivePatterns) {
        lines.push(`    • ${ap}`);
      }
    }
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

function generateExecutionScript(plan: DelegationPlan): string {
  const lines: string[] = [];

  lines.push("# Delegation Execution Script");
  lines.push(`# Strategy: ${plan.strategy}`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push("");

  if (plan.strategy === "single_agent") {
    lines.push("# Single agent execution");
    lines.push(`# Agent: ${plan.agents[0].role}`);
    lines.push("");
    lines.push("# Execute via Claude subagent or external LLM");

  } else if (plan.strategy === "parallel_agents") {
    lines.push("# Parallel agent execution");
    lines.push("# Run these agents concurrently:");
    lines.push("");
    for (const agent of plan.agents) {
      lines.push(`# --- ${agent.id}: ${agent.role} ---`);
    }

  } else if (plan.strategy === "debate_synthesis") {
    lines.push("# Debate execution flow:");
    lines.push("");
    lines.push("# Phase 1: Initial arguments (parallel)");
    const debaters = plan.agents.filter(a => a.role !== "synthesizer");
    for (const agent of debaters) {
      lines.push(`#   ${agent.id}: ${agent.perspective?.name || agent.role}`);
    }
    lines.push("");
    lines.push("# Phase 2: Synthesis (after all arguments)");
    lines.push("#   synthesizer: Combine perspectives");
  }

  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      prompt: { type: "string", short: "p" },
      context: { type: "boolean", short: "c" },
      execute: { type: "boolean", short: "e" },
      script: { type: "boolean", short: "s" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
DelegationRouter - Route tasks to delegation patterns

USAGE:
  bun run DelegationRouter.ts -p "prompt" [options]

OPTIONS:
  -p, --prompt <text>  The task/prompt to delegate
  -c, --context        Load vault context (projects, areas, archives)
  -e, --execute        Execute the delegation plan
  -s, --script         Output execution script
  -j, --json           Output as JSON
  -h, --help           Show this help

STRATEGIES:
  single_agent      → Simple tasks (1 agent)
  parallel_agents   → Medium tasks (2 agents)
  debate_synthesis  → Complex tasks (3+ agents + synthesizer)

VAULT CONTEXT:
  When --context is used, the router loads:
  - Related projects from _01_Projects
  - Related areas from _02_Areas
  - Breakthrough patterns from _04_Archives

EXAMPLES:
  bun run DelegationRouter.ts -p "What is TypeScript?"
  bun run DelegationRouter.ts -p "Should we migrate to microservices?" --context
  bun run DelegationRouter.ts -p "Review our architecture" --context --json
`);
    return;
  }

  if (!values.prompt) {
    console.error("Error: --prompt is required");
    console.error("Run with --help for usage");
    process.exit(1);
  }

  const plan = await createDelegationPlan(values.prompt, {
    includeVaultContext: values.context
  });

  if (values.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else if (values.script) {
    console.log(generateExecutionScript(plan));
  } else {
    console.log(formatPlan(plan));
  }

  if (values.execute) {
    console.log("\n⚡ Execution mode not yet implemented.");
    console.log("   Use --script to generate execution commands.");
  }
}

// Only run main() if this file is the entry point
if (import.meta.main) {
  main().catch(console.error);
}

// Export for use as module
export { createDelegationPlan, loadVaultContext, DelegationPlan, AgentPlan, VaultContext };
