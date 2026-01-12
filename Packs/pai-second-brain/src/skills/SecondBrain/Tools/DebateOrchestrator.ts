#!/usr/bin/env bun

/**
 * DebateOrchestrator - Orchestrate multi-perspective debates
 *
 * Manages the flow of structured debates between multiple agents/perspectives.
 * Integrates with pai-multi-llm if available, otherwise uses Claude subagents.
 *
 * Usage:
 *   bun run DebateOrchestrator.ts -t "Should we adopt microservices?"
 *   bun run DebateOrchestrator.ts -t "topic" --perspectives optimist,pessimist,pragmatist
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { parse as parseYaml } from "yaml";
import { assessComplexity } from "./ComplexityAssessor";
import type {
  Perspective,
  DebateConfig,
  DebateRound,
  DebateResult,
  AgentTask,
  MultiLLMIntegration
} from "../../../types/SecondBrain";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const DEBATES_DIR = `${PAI_DIR}/second-brain/debates`;
const TEAM_FILE = `${PAI_DIR}/config/team.yaml`;

// Built-in perspectives
const DEFAULT_PERSPECTIVES: Record<string, Perspective> = {
  optimist: {
    id: "optimist",
    name: "The Optimist",
    description: "Focuses on opportunities, potential benefits, and best-case scenarios",
    stance: "advocate",
    prompt_template: `You are arguing FROM THE OPTIMIST PERSPECTIVE on: "{topic}"

Your role is to:
- Highlight potential benefits and opportunities
- Identify best-case scenarios
- Focus on what could go right
- Be genuinely enthusiastic but grounded

Present your argument clearly and compellingly. You will be challenged by other perspectives.`
  },

  pessimist: {
    id: "pessimist",
    name: "The Pessimist",
    description: "Focuses on risks, potential problems, and worst-case scenarios",
    stance: "critic",
    prompt_template: `You are arguing FROM THE PESSIMIST PERSPECTIVE on: "{topic}"

Your role is to:
- Identify risks and potential problems
- Highlight worst-case scenarios
- Point out what could go wrong
- Be genuinely cautious but constructive

Present your argument clearly. Your job is to stress-test ideas, not just dismiss them.`
  },

  pragmatist: {
    id: "pragmatist",
    name: "The Pragmatist",
    description: "Balances idealism with practicality, focuses on execution",
    stance: "moderator",
    prompt_template: `You are arguing FROM THE PRAGMATIST PERSPECTIVE on: "{topic}"

Your role is to:
- Balance opportunity with risk
- Focus on practical execution
- Consider resource constraints
- Propose actionable middle ground

Present a balanced, realistic assessment that acknowledges both opportunity and risk.`
  },

  contrarian: {
    id: "contrarian",
    name: "The Contrarian",
    description: "Challenges assumptions, asks uncomfortable questions",
    stance: "devil_advocate",
    prompt_template: `You are THE CONTRARIAN on: "{topic}"

Your role is to:
- Challenge the assumptions everyone else is making
- Ask uncomfortable questions
- Propose alternatives no one is considering
- Break group-think

Be provocative but substantive. Your job is to ensure blind spots are exposed.`
  },

  analyst: {
    id: "analyst",
    name: "The Analyst",
    description: "Focuses on data, evidence, and logical reasoning",
    stance: "analyst",
    prompt_template: `You are THE ANALYST on: "{topic}"

Your role is to:
- Focus on evidence and data
- Apply logical reasoning
- Identify gaps in reasoning
- Quantify where possible

Present a fact-based analysis. Avoid emotional arguments.`
  },

  synthesizer: {
    id: "synthesizer",
    name: "The Synthesizer",
    description: "Combines perspectives into actionable insights",
    stance: "synthesizer",
    prompt_template: `You are THE SYNTHESIZER reviewing the debate on: "{topic}"

The following perspectives were presented:
{debate_summary}

Your role is to:
- Identify points of agreement across perspectives
- Highlight genuine friction points (not just disagreements)
- Extract breakthrough insights that emerge from the collision
- Provide a clear recommendation

Synthesize into actionable insight, don't just summarize.`
  }
};

// Perspective sets for common debate types
const DEBATE_TEMPLATES: Record<string, string[]> = {
  decision: ["optimist", "pessimist", "contrarian"],
  strategic: ["optimist", "pessimist", "pragmatist", "contrarian"],
  technical: ["analyst", "pragmatist", "contrarian"],
  binary: ["optimist", "pessimist", "pragmatist"]
};

function ensureDirectories(): void {
  if (!existsSync(DEBATES_DIR)) {
    mkdirSync(DEBATES_DIR, { recursive: true });
  }
}

function detectMultiLLM(): MultiLLMIntegration {
  // Check if pai-multi-llm is installed
  const multiLLMSkill = `${PAI_DIR}/skills/MultiLLM/SKILL.md`;

  if (!existsSync(multiLLMSkill)) {
    return { available: false, providers: [] };
  }

  // Check for team.yaml
  if (!existsSync(TEAM_FILE)) {
    return { available: false, providers: [] };
  }

  try {
    const teamContent = readFileSync(TEAM_FILE, "utf-8");
    const team = parseYaml(teamContent);
    const providers = team.providers
      ?.filter((p: any) => p.available !== false)
      ?.map((p: any) => p.name) || [];

    return {
      available: providers.length > 0,
      providers
    };
  } catch {
    return { available: false, providers: [] };
  }
}

function selectPerspectives(
  topic: string,
  explicitPerspectives?: string[]
): Perspective[] {
  if (explicitPerspectives && explicitPerspectives.length > 0) {
    return explicitPerspectives
      .map(id => DEFAULT_PERSPECTIVES[id])
      .filter(Boolean);
  }

  // Auto-select based on complexity
  const assessment = assessComplexity(topic);

  let templateKey: string;
  if (assessment.detected_patterns.some(p => p.includes("decision"))) {
    templateKey = "decision";
  } else if (assessment.detected_patterns.some(p => p.includes("strategic"))) {
    templateKey = "strategic";
  } else if (assessment.detected_patterns.some(p => p.includes("technical"))) {
    templateKey = "technical";
  } else {
    templateKey = assessment.level === "complex" ? "strategic" : "decision";
  }

  const perspectiveIds = DEBATE_TEMPLATES[templateKey];
  return perspectiveIds.map(id => DEFAULT_PERSPECTIVES[id]).filter(Boolean);
}

function buildDebatePrompt(perspective: Perspective, topic: string): string {
  return perspective.prompt_template.replace("{topic}", topic);
}

function buildSynthesisPrompt(topic: string, rounds: DebateRound[]): string {
  const template = DEFAULT_PERSPECTIVES.synthesizer.prompt_template;

  // Build summary of debate
  const summaryParts: string[] = [];
  for (const round of rounds) {
    if (round.response) {
      summaryParts.push(`## ${round.perspective_id.toUpperCase()}\n${round.response}`);
    }
  }
  const debateSummary = summaryParts.join("\n\n---\n\n");

  return template
    .replace("{topic}", topic)
    .replace("{debate_summary}", debateSummary);
}

async function runDebate(
  topic: string,
  options: {
    perspectives?: string[];
    providers?: string[];
    dryRun?: boolean;
  } = {}
): Promise<DebateResult> {
  const multiLLM = detectMultiLLM();
  const perspectives = selectPerspectives(topic, options.perspectives);

  console.log(`\n🎭 Starting debate on: "${topic}"`);
  console.log(`   Perspectives: ${perspectives.map(p => p.name).join(", ")}`);
  console.log(`   Multi-LLM: ${multiLLM.available ? `Yes (${multiLLM.providers.join(", ")})` : "No (Claude subagents)"}`);
  console.log("");

  const rounds: DebateRound[] = [];

  // Generate prompts for each perspective
  for (let i = 0; i < perspectives.length; i++) {
    const perspective = perspectives[i];
    const prompt = buildDebatePrompt(perspective, topic);

    const round: DebateRound = {
      round_number: i + 1,
      perspective_id: perspective.id,
      prompt
    };

    if (!options.dryRun) {
      console.log(`📢 ${perspective.name} is speaking...`);

      // In actual use, this would call the LLM
      // For now, we generate the task structure
      round.response = `[${perspective.name} would respond here via ${multiLLM.available ? 'external LLM' : 'Claude subagent'}]`;
      round.provider = multiLLM.available ? multiLLM.providers[i % multiLLM.providers.length] : "claude-subagent";
    }

    rounds.push(round);
  }

  // Generate synthesis prompt
  const synthesisPrompt = buildSynthesisPrompt(topic, rounds);

  const result: DebateResult = {
    topic,
    rounds,
    friction_points: [],
    agreement_points: []
  };

  if (!options.dryRun) {
    console.log(`\n🔮 Synthesizer is combining perspectives...`);
    result.synthesis = `[Synthesis would be generated here]`;
  }

  return result;
}

function formatDebateOutput(result: DebateResult, verbose: boolean): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                         DEBATE RESULT                          ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Topic: ${result.topic}`);
  lines.push(`Rounds: ${result.rounds.length}`);
  lines.push("");

  if (verbose) {
    for (const round of result.rounds) {
      lines.push(`─── Round ${round.round_number}: ${round.perspective_id.toUpperCase()} ───`);
      lines.push("");
      lines.push(`Prompt:\n${round.prompt}`);
      if (round.response) {
        lines.push("");
        lines.push(`Response:\n${round.response}`);
      }
      lines.push("");
    }
  } else {
    lines.push("Perspectives heard:");
    for (const round of result.rounds) {
      const status = round.response ? "✓" : "○";
      lines.push(`  ${status} ${round.perspective_id}`);
    }
  }

  if (result.synthesis) {
    lines.push("");
    lines.push("─── SYNTHESIS ───");
    lines.push(result.synthesis);
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      topic: { type: "string", short: "t" },
      perspectives: { type: "string", short: "p" },
      "dry-run": { type: "boolean", short: "d" },
      verbose: { type: "boolean", short: "v" },
      json: { type: "boolean", short: "j" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
DebateOrchestrator - Run multi-perspective debates

USAGE:
  bun run DebateOrchestrator.ts -t "topic" [options]

OPTIONS:
  -t, --topic <text>         The debate topic
  -p, --perspectives <list>  Comma-separated perspective IDs
  -d, --dry-run              Generate prompts without executing
  -v, --verbose              Show full prompts and responses
  -j, --json                 Output as JSON
  -l, --list                 List available perspectives
  -h, --help                 Show this help

PERSPECTIVES:
  optimist    - Focuses on opportunities and benefits
  pessimist   - Focuses on risks and problems
  pragmatist  - Balances idealism with practicality
  contrarian  - Challenges assumptions
  analyst     - Data and evidence focused
  synthesizer - Combines perspectives (auto-added)

EXAMPLES:
  bun run DebateOrchestrator.ts -t "Should we adopt microservices?"
  bun run DebateOrchestrator.ts -t "Topic" -p optimist,pessimist,contrarian
  bun run DebateOrchestrator.ts -t "Topic" --dry-run --verbose
`);
    return;
  }

  if (values.list) {
    console.log("Available Perspectives:");
    console.log("─".repeat(50));
    for (const [id, perspective] of Object.entries(DEFAULT_PERSPECTIVES)) {
      console.log(`${id.padEnd(12)} - ${perspective.name}`);
      console.log(`              ${perspective.description}`);
      console.log("");
    }
    console.log("Debate Templates:");
    console.log("─".repeat(50));
    for (const [name, perspectives] of Object.entries(DEBATE_TEMPLATES)) {
      console.log(`${name.padEnd(12)} → ${perspectives.join(", ")}`);
    }
    return;
  }

  if (!values.topic) {
    console.error("Error: --topic is required");
    console.error("Run with --help for usage");
    process.exit(1);
  }

  ensureDirectories();

  const perspectiveList = values.perspectives?.split(",").map(s => s.trim());

  const result = await runDebate(values.topic, {
    perspectives: perspectiveList,
    dryRun: values["dry-run"]
  });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatDebateOutput(result, values.verbose ?? false));
  }

  // Save debate to file
  const debateId = `debate-${Date.now()}`;
  const debatePath = `${DEBATES_DIR}/${debateId}.json`;
  writeFileSync(debatePath, JSON.stringify(result, null, 2));
  console.log(`Debate saved to: ${debatePath}`);
}

main().catch(console.error);

// Export for use as module
export {
  runDebate,
  selectPerspectives,
  detectMultiLLM,
  DEFAULT_PERSPECTIVES,
  DEBATE_TEMPLATES
};
