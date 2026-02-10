#!/usr/bin/env bun

/**
 * DelegationRouter - Route tasks to delegation patterns
 *
 * Determines strategy based on complexity:
 * - Simple → Single agent
 * - Medium → Parallel agents
 * - Complex → Debate with multiple perspectives
 *
 * Usage:
 *   bun run DelegationRouter.ts -p "prompt"
 */

import { parseArgs } from "util";
import { assessComplexity } from "./ComplexityAssessor";
import { selectPerspectives, detectMultiLLM, loadPerspectives } from "./DebateOrchestrator";
import { searchVault } from "./VaultReader";
import { loadContext } from "./ContextLoader";
import { synthesizeFromArchives } from "./ArchiveSynthesis";
import { getVaultRoot } from "../lib/config-loader";
import { c, header, divider } from "../lib/colors";
import type { ComplexityAssessment, Perspective } from "../../../types/SecondBrain";

interface VaultContext {
  projectContext: string[];
  areaContext: string[];
  archivePatterns: string[];
  relatedNotes: string[];
}

interface AgentPlan {
  id: string;
  role: string;
  perspective?: Perspective;
  provider_preference?: string;
  prompt_template: string;
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

async function loadVaultContext(prompt: string): Promise<VaultContext | undefined> {
  const vaultRoot = getVaultRoot();
  if (!vaultRoot) return undefined;

  const context: VaultContext = { projectContext: [], areaContext: [], archivePatterns: [], relatedNotes: [] };

  try {
    const loaded = loadContext(vaultRoot, prompt, { maxNotes: 5 });
    context.projectContext = loaded.projectContext.map((n) => `${n.title} (${n.path})`);
    context.areaContext = loaded.areaContext.map((n) => `${n.title} (${n.path})`);

    const synthesis = await synthesizeFromArchives(prompt, { depth: "quick", maxPatterns: 5 });
    context.archivePatterns = synthesis.patternsFound.filter((p) => p.relevance !== "low").map((p) => `${p.title}: ${p.potentialConnection}`);

    context.relatedNotes = searchVault(vaultRoot, prompt, { maxResults: 5 }).map((r) => r.file);
  } catch {}

  const hasContext = context.projectContext.length > 0 || context.areaContext.length > 0 || context.archivePatterns.length > 0;
  return hasContext ? context : undefined;
}

async function createDelegationPlan(prompt: string, options: { includeVaultContext?: boolean } = {}): Promise<DelegationPlan> {
  const assessment = assessComplexity(prompt);
  const multiLLM = detectMultiLLM();
  const perspectives = loadPerspectives();

  const plan: DelegationPlan = {
    prompt,
    assessment,
    strategy: "single_agent",
    agents: [],
    multi_llm_available: multiLLM.available,
    execution_notes: [],
  };

  if (options.includeVaultContext) {
    plan.vault_context = await loadVaultContext(prompt);
    if (plan.vault_context) {
      plan.execution_notes.push(`Vault context: ${plan.vault_context.projectContext.length} projects, ${plan.vault_context.areaContext.length} areas, ${plan.vault_context.archivePatterns.length} patterns`);
    }
  }

  switch (assessment.level) {
    case "simple":
      plan.strategy = "single_agent";
      plan.agents.push({ id: "agent-1", role: "executor", prompt_template: `Execute:\n\n${prompt}` });
      plan.execution_notes.push("Single agent sufficient");
      break;

    case "medium":
      plan.strategy = "parallel_agents";
      plan.agents.push({ id: "agent-1", role: "primary_analyst", prompt_template: `Analyze:\n\n${prompt}\n\nProvide key findings.` });
      plan.agents.push({ id: "agent-2", role: "validator", prompt_template: `Review:\n\n${prompt}\n\nIdentify issues or improvements.` });
      plan.execution_notes.push("Parallel execution for medium complexity");
      break;

    case "complex":
      plan.strategy = "debate_synthesis";
      const selected = selectPerspectives(prompt);
      const synthesizer = perspectives.perspectives["synthesizer"];

      for (let i = 0; i < selected.length; i++) {
        const p = selected[i];
        plan.agents.push({
          id: `agent-${i + 1}`,
          role: p.stance || "debater",
          perspective: p,
          provider_preference: multiLLM.available ? multiLLM.providers[i % multiLLM.providers.length] : undefined,
          prompt_template: p.prompt.replace("{topic}", prompt),
        });
      }

      if (synthesizer) {
        plan.agents.push({
          id: `agent-${selected.length + 1}`,
          role: "synthesizer",
          perspective: { ...synthesizer, id: "synthesizer" },
          prompt_template: synthesizer.prompt.replace("{topic}", prompt),
        });
      }

      plan.execution_notes.push("Debate pattern for complex decision");
      plan.execution_notes.push(`${selected.length} perspectives + synthesizer`);
      if (multiLLM.available) plan.execution_notes.push(`Using LLMs: ${multiLLM.providers.join(", ")}`);
      break;
  }

  return plan;
}

function formatPlan(plan: DelegationPlan): string {
  const strategyColors = { single_agent: "green", parallel_agents: "yellow", debate_synthesis: "magenta" } as const;
  const color = strategyColors[plan.strategy];

  const lines = [
    header("DELEGATION PLAN"),
    "",
    `Complexity: ${plan.assessment.level.toUpperCase()} (${(plan.assessment.confidence * 100).toFixed(0)}%)`,
    `Strategy:   ${c(color, plan.strategy.replace(/_/g, " ").toUpperCase())}`,
    `Agents:     ${plan.agents.length}`,
    `Multi-LLM:  ${plan.multi_llm_available ? "Available" : "Not available"}`,
    "",
    "--- AGENTS ---",
    "",
  ];

  for (const a of plan.agents) {
    lines.push(`[${a.id}] ${a.role.toUpperCase()}`);
    if (a.perspective) lines.push(`  Perspective: ${a.perspective.name}`);
    if (a.provider_preference) lines.push(`  Provider: ${a.provider_preference}`);
    lines.push("");
  }

  if (plan.execution_notes.length > 0) {
    lines.push("--- NOTES ---");
    for (const n of plan.execution_notes) lines.push(`  • ${n}`);
  }

  if (plan.vault_context) {
    lines.push("", "--- VAULT CONTEXT ---");
    if (plan.vault_context.projectContext.length > 0) {
      lines.push("", "  Projects:");
      for (const p of plan.vault_context.projectContext) lines.push(`    • ${p}`);
    }
    if (plan.vault_context.areaContext.length > 0) {
      lines.push("", "  Areas:");
      for (const a of plan.vault_context.areaContext) lines.push(`    • ${a}`);
    }
    if (plan.vault_context.archivePatterns.length > 0) {
      lines.push("", "  Archive Patterns:");
      for (const ap of plan.vault_context.archivePatterns) lines.push(`    • ${ap}`);
    }
  }

  lines.push("", divider());
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      prompt: { type: "string", short: "p" },
      context: { type: "boolean", short: "c" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
DelegationRouter - Route tasks to delegation patterns

USAGE:
  bun run DelegationRouter.ts -p "prompt" [options]

OPTIONS:
  -p, --prompt <text>  The task/prompt to delegate
  -c, --context        Load vault context
  -j, --json           Output as JSON
  -h, --help           Show this help
`);
    return;
  }

  if (!values.prompt) {
    console.error("Error: --prompt is required");
    process.exit(1);
  }

  const plan = await createDelegationPlan(values.prompt, { includeVaultContext: values.context });

  if (values.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(formatPlan(plan));
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { createDelegationPlan, loadVaultContext, DelegationPlan, AgentPlan, VaultContext };
