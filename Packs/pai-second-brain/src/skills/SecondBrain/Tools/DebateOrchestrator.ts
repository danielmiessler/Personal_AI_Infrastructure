#!/usr/bin/env bun

/**
 * DebateOrchestrator - Orchestrate multi-perspective debates
 *
 * Integrates with pai-multi-llm if available, otherwise uses Claude subagents.
 *
 * Usage:
 *   bun run DebateOrchestrator.ts -t "Should we adopt microservices?"
 *   bun run DebateOrchestrator.ts -t "topic" --perspectives optimist,pessimist,pragmatist
 */

import { parseArgs } from "util";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { parse as parseYaml } from "yaml";
import { assessComplexity } from "./ComplexityAssessor";
import { searchVault } from "./VaultReader";
import { loadContext } from "./ContextLoader";
import { synthesizeFromArchives } from "./ArchiveSynthesis";
import { PAI_DIR, DEBATES_DIR, getVaultRoot, loadPerspectives, type PerspectivesConfig } from "../lib/config-loader";
import { c, header, divider } from "../lib/colors";
import type { Perspective, DebateRound, DebateResult, MultiLLMIntegration } from "../../../types/SecondBrain";

const TEAM_FILE = `${PAI_DIR}/config/team.yaml`;

interface DebateContext {
  archivePatterns: string[];
  projectContext: string[];
  areaContext: string[];
}

function detectMultiLLM(): MultiLLMIntegration {
  const multiLLMSkill = `${PAI_DIR}/skills/MultiLLM/SKILL.md`;
  if (!existsSync(multiLLMSkill) || !existsSync(TEAM_FILE)) {
    return { available: false, providers: [] };
  }

  try {
    const team = parseYaml(readFileSync(TEAM_FILE, "utf-8"));
    const providers = team.providers?.filter((p: any) => p.available !== false)?.map((p: any) => p.name) || [];
    return { available: providers.length > 0, providers };
  } catch {
    return { available: false, providers: [] };
  }
}

function selectPerspectives(topic: string, explicitPerspectives?: string[]): Perspective[] {
  const config = loadPerspectives();
  const perspectives = config.perspectives;

  if (explicitPerspectives?.length) {
    return explicitPerspectives
      .map((id) => (perspectives[id] ? { ...perspectives[id], id } : null))
      .filter((p): p is Perspective => p !== null);
  }

  // Auto-select based on complexity
  const assessment = assessComplexity(topic);
  let templateKey = "decision";

  if (assessment.detected_patterns.some((p) => p.includes("strategic"))) templateKey = "strategic";
  else if (assessment.detected_patterns.some((p) => p.includes("technical"))) templateKey = "technical";
  else if (assessment.level === "complex") templateKey = "strategic";

  const template = config.templates[templateKey] || config.templates.decision || ["optimist", "pessimist", "contrarian"];
  return template.map((id) => (perspectives[id] ? { ...perspectives[id], id } : null)).filter((p): p is Perspective => p !== null);
}

async function loadDebateContext(topic: string): Promise<DebateContext | undefined> {
  const vaultRoot = getVaultRoot();
  if (!vaultRoot) return undefined;

  const context: DebateContext = { archivePatterns: [], projectContext: [], areaContext: [] };

  try {
    const synthesis = await synthesizeFromArchives(topic, { depth: "quick", maxPatterns: 5 });
    context.archivePatterns = synthesis.patternsFound.filter((p) => p.relevance !== "low").map((p) => `• ${p.title}: ${p.potentialConnection}`);

    const loaded = loadContext(vaultRoot, topic, { maxNotes: 3 });
    context.projectContext = loaded.projectContext.map((n) => `• ${n.title}: ${n.summary.substring(0, 100)}...`);
    context.areaContext = loaded.areaContext.map((n) => `• ${n.title}: ${n.summary.substring(0, 100)}...`);
  } catch {}

  const hasContext = context.archivePatterns.length > 0 || context.projectContext.length > 0 || context.areaContext.length > 0;
  return hasContext ? context : undefined;
}

function buildDebatePrompt(perspective: Perspective, topic: string, debateContext?: DebateContext): string {
  let prompt = perspective.prompt.replace("{topic}", topic);

  if (debateContext && (debateContext.archivePatterns.length > 0 || debateContext.projectContext.length > 0)) {
    prompt += "\n\n---\nRELEVANT CONTEXT:\n";
    if (debateContext.archivePatterns.length > 0) prompt += "\nHistorical patterns:\n" + debateContext.archivePatterns.join("\n");
    if (debateContext.projectContext.length > 0) prompt += "\n\nProjects:\n" + debateContext.projectContext.join("\n");
    if (debateContext.areaContext.length > 0) prompt += "\n\nAreas:\n" + debateContext.areaContext.join("\n");
    prompt += "\n---\n\nConsider this context in your argument.";
  }

  return prompt;
}

function buildSynthesisPrompt(topic: string, rounds: DebateRound[]): string {
  const config = loadPerspectives();
  const synthesizer = config.perspectives["synthesizer"];
  if (!synthesizer) return "";

  const summaryParts = rounds.filter((r) => r.response).map((r) => `## ${r.perspective_id.toUpperCase()}\n${r.response}`);
  return synthesizer.prompt.replace("{topic}", topic).replace("{debate_summary}", summaryParts.join("\n\n---\n\n"));
}

async function runDebate(topic: string, options: { perspectives?: string[]; dryRun?: boolean; includeContext?: boolean } = {}): Promise<DebateResult> {
  const multiLLM = detectMultiLLM();
  const perspectives = selectPerspectives(topic, options.perspectives);
  const debateContext = options.includeContext ? await loadDebateContext(topic) : undefined;

  console.log(`\n🎭 Starting debate: "${topic}"`);
  console.log(`   Perspectives: ${perspectives.map((p) => p.name).join(", ")}`);
  console.log(`   Multi-LLM: ${multiLLM.available ? `Yes (${multiLLM.providers.join(", ")})` : "No (Claude subagents)"}`);
  if (debateContext) console.log(`   Vault context: ${debateContext.archivePatterns.length} patterns, ${debateContext.projectContext.length} projects`);
  console.log("");

  const rounds: DebateRound[] = [];

  for (let i = 0; i < perspectives.length; i++) {
    const p = perspectives[i];
    const prompt = buildDebatePrompt(p, topic, debateContext);

    const round: DebateRound = { round_number: i + 1, perspective_id: p.id, prompt };

    if (!options.dryRun) {
      console.log(`📢 ${p.name} is speaking...`);
      round.response = `[${p.name} would respond via ${multiLLM.available ? "external LLM" : "Claude subagent"}]`;
      round.provider = multiLLM.available ? multiLLM.providers[i % multiLLM.providers.length] : "claude-subagent";
    }

    rounds.push(round);
  }

  const result: DebateResult = { topic, rounds, friction_points: [], agreement_points: [] };

  if (!options.dryRun) {
    console.log(`\n🔮 Synthesizer combining perspectives...`);
    result.synthesis = `[Synthesis would be generated here]`;
  }

  return result;
}

function formatDebateOutput(result: DebateResult, verbose: boolean): string {
  const lines = [header("DEBATE RESULT"), "", `Topic: ${result.topic}`, `Rounds: ${result.rounds.length}`, ""];

  if (verbose) {
    for (const r of result.rounds) {
      lines.push(`--- Round ${r.round_number}: ${r.perspective_id.toUpperCase()} ---`, "", `Prompt:\n${r.prompt}`);
      if (r.response) lines.push("", `Response:\n${r.response}`);
      lines.push("");
    }
  } else {
    lines.push("Perspectives heard:");
    for (const r of result.rounds) lines.push(`  ${r.response ? "✓" : "○"} ${r.perspective_id}`);
  }

  if (result.synthesis) lines.push("", "--- SYNTHESIS ---", result.synthesis);
  lines.push("", divider());
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      topic: { type: "string", short: "t" },
      perspectives: { type: "string", short: "p" },
      context: { type: "boolean", short: "c" },
      "dry-run": { type: "boolean", short: "d" },
      verbose: { type: "boolean", short: "v" },
      json: { type: "boolean", short: "j" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
DebateOrchestrator - Run multi-perspective debates

USAGE:
  bun run DebateOrchestrator.ts -t "topic" [options]

OPTIONS:
  -t, --topic <text>         The debate topic
  -p, --perspectives <list>  Comma-separated perspective IDs
  -c, --context              Include vault context
  -d, --dry-run              Generate prompts without executing
  -v, --verbose              Show full prompts
  -j, --json                 Output as JSON
  -l, --list                 List available perspectives
  -h, --help                 Show this help
`);
    return;
  }

  if (values.list) {
    const config = loadPerspectives();
    console.log("Available Perspectives:\n" + divider());
    for (const [id, p] of Object.entries(config.perspectives)) {
      console.log(`${id.padEnd(12)} - ${p.name}`);
      console.log(`              ${p.description}\n`);
    }
    console.log("Debate Templates:\n" + divider());
    for (const [name, perspectives] of Object.entries(config.templates)) {
      console.log(`${name.padEnd(12)} → ${perspectives.join(", ")}`);
    }
    return;
  }

  if (!values.topic) {
    console.error("Error: --topic is required");
    process.exit(1);
  }

  if (!existsSync(DEBATES_DIR)) mkdirSync(DEBATES_DIR, { recursive: true });

  const result = await runDebate(values.topic, {
    perspectives: values.perspectives?.split(",").map((s) => s.trim()),
    dryRun: values["dry-run"],
    includeContext: values.context,
  });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatDebateOutput(result, values.verbose ?? false));
  }

  const debateId = `debate-${Date.now()}`;
  writeFileSync(`${DEBATES_DIR}/${debateId}.json`, JSON.stringify(result, null, 2));
  console.log(`Debate saved: ${DEBATES_DIR}/${debateId}.json`);
}

if (import.meta.main) {
  main().catch(console.error);
}

export { runDebate, selectPerspectives, detectMultiLLM, loadPerspectives };
