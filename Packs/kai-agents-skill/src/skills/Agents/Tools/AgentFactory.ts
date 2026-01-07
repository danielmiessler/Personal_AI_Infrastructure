#!/usr/bin/env bun

/**
 * AgentFactory - Dynamic Agent Composition from Traits
 *
 * Composes specialized agents on-the-fly by combining traits from Traits.yaml,
 * or retrieves named agent personalities from NamedAgents.yaml.
 *
 * Usage:
 *   bun run AgentFactory.ts --task "Review this security architecture"
 *   bun run AgentFactory.ts --traits "security,skeptical,thorough"
 *   bun run AgentFactory.ts --named "engineer" --task "Implement feature X"
 *   bun run AgentFactory.ts --named "architect" --task "Review the design"
 *   bun run AgentFactory.ts --list
 *   bun run AgentFactory.ts --list-named
 *
 * @version 1.2.0
 *
 * Changelog v1.2.0:
 * - Added --named parameter for named agent support (The Engineer, The Architect, The Intern)
 * - Added --list-named to show available named agents
 * - Added --role parameter to map roles to named agents
 * - Named agents use NamedAgent.hbs template
 * - Unified output format for both dynamic and named agents
 */

import { parseArgs } from "util";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";

// Register Handlebars helpers
Handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase() || '');

// Paths - adjust PAI_DIR as needed
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;
const TRAITS_PATH = `${PAI_DIR}/skills/Agents/Data/Traits.yaml`;
const NAMED_AGENTS_PATH = `${PAI_DIR}/skills/Agents/Data/NamedAgents.yaml`;
const DYNAMIC_TEMPLATE_PATH = `${PAI_DIR}/skills/Agents/Templates/DynamicAgent.hbs`;
const NAMED_TEMPLATE_PATH = `${PAI_DIR}/skills/Agents/Templates/NamedAgent.hbs`;

// Types
interface TraitDefinition {
  name: string;
  description: string;
  prompt_fragment?: string;
  keywords?: string[];
}

interface VoiceMapping {
  traits: string[];
  voice: string;
  voice_id?: string;
  reason?: string;
}

interface VoiceRegistryEntry {
  voice_id: string;
  characteristics: string[];
  description: string;
  stability: number;
  similarity_boost: number;
}

interface TraitsData {
  expertise: Record<string, TraitDefinition>;
  personality: Record<string, TraitDefinition>;
  approach: Record<string, TraitDefinition>;
  voice_mappings: {
    default: string;
    default_voice_id: string;
    voice_registry: Record<string, VoiceRegistryEntry>;
    mappings: VoiceMapping[];
    fallbacks: Record<string, string>;
  };
  examples: Record<string, { description: string; traits: string[] }>;
}

interface NamedAgentDefinition {
  agent_key: string;
  name: string;
  title: string;
  voice: string;
  voice_id: string;
  model: string;
  backstory: string;
  traits: string[];
  communication_style: {
    examples: string[];
    tone: string;
  };
}

interface NamedAgentsData {
  agents: Record<string, NamedAgentDefinition>;
  role_mappings: Record<string, string>;
}

interface ComposedAgent {
  name: string;
  traits: string[];
  expertise: TraitDefinition[];
  personality: TraitDefinition[];
  approach: TraitDefinition[];
  voice: string;
  voiceId: string;
  voiceReason: string;
  prompt: string;
  model?: string;
  isNamed?: boolean;
}

function loadTraits(): TraitsData {
  if (!existsSync(TRAITS_PATH)) {
    console.error(`Error: Traits file not found at ${TRAITS_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TRAITS_PATH, "utf-8");
  return parseYaml(content) as TraitsData;
}

function loadNamedAgents(): NamedAgentsData {
  if (!existsSync(NAMED_AGENTS_PATH)) {
    console.error(`Error: Named agents file not found at ${NAMED_AGENTS_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(NAMED_AGENTS_PATH, "utf-8");
  return parseYaml(content) as NamedAgentsData;
}

function loadTemplate(path: string): ReturnType<typeof Handlebars.compile> {
  if (!existsSync(path)) {
    console.error(`Error: Template file not found at ${path}`);
    process.exit(1);
  }
  const content = readFileSync(path, "utf-8");
  return Handlebars.compile(content);
}

function inferTraitsFromTask(task: string, traits: TraitsData): string[] {
  const inferred: string[] = [];
  const taskLower = task.toLowerCase();

  // Check expertise keywords
  for (const [key, def] of Object.entries(traits.expertise)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check personality keywords
  for (const [key, def] of Object.entries(traits.personality)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check approach keywords
  for (const [key, def] of Object.entries(traits.approach)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Apply smart defaults
  const hasExpertise = inferred.some((t) => traits.expertise[t]);
  const hasPersonality = inferred.some((t) => traits.personality[t]);
  const hasApproach = inferred.some((t) => traits.approach[t]);

  if (!hasPersonality) inferred.push("analytical");
  if (!hasApproach) inferred.push("thorough");
  if (!hasExpertise) inferred.push("research");

  return [...new Set(inferred)];
}

function resolveVoice(
  traitKeys: string[],
  traits: TraitsData
): { voice: string; voiceId: string; reason: string } {
  const mappings = traits.voice_mappings;
  const registry = mappings.voice_registry || {};

  const getVoiceId = (voiceName: string, fallbackId?: string): string => {
    if (registry[voiceName]?.voice_id) {
      return registry[voiceName].voice_id;
    }
    return fallbackId || mappings.default_voice_id || "";
  };

  // Check explicit combination mappings
  const matchedMappings = mappings.mappings
    .map((m) => ({
      ...m,
      matchCount: m.traits.filter((t) => traitKeys.includes(t)).length,
      isFullMatch: m.traits.every((t) => traitKeys.includes(t)),
    }))
    .filter((m) => m.isFullMatch)
    .sort((a, b) => b.matchCount - a.matchCount);

  if (matchedMappings.length > 0) {
    const best = matchedMappings[0];
    return {
      voice: best.voice,
      voiceId: best.voice_id || getVoiceId(best.voice),
      reason: best.reason || `Matched traits: ${best.traits.join(", ")}`,
    };
  }

  // Check fallbacks
  for (const trait of traitKeys) {
    if (mappings.fallbacks[trait]) {
      const voiceName = mappings.fallbacks[trait];
      return {
        voice: voiceName,
        voiceId: getVoiceId(voiceName),
        reason: `Fallback for trait: ${trait}`,
      };
    }
  }

  return {
    voice: mappings.default,
    voiceId: mappings.default_voice_id || "",
    reason: "Default voice",
  };
}

function composeNamedAgent(
  agentKey: string,
  task: string,
  namedAgents: NamedAgentsData
): ComposedAgent {
  const agentDef = namedAgents.agents[agentKey.toLowerCase()];

  if (!agentDef) {
    console.error(`Error: Unknown named agent: ${agentKey}`);
    console.error("\nAvailable named agents:");
    for (const [key, agent] of Object.entries(namedAgents.agents)) {
      console.error(`  ${key.padEnd(12)} - ${agent.name} (${agent.title})`);
    }
    process.exit(1);
  }

  const template = loadTemplate(NAMED_TEMPLATE_PATH);
  const prompt = template({
    ...agentDef,
    task,
  });

  return {
    name: agentDef.name,
    traits: agentDef.traits,
    expertise: [],
    personality: [],
    approach: [],
    voice: agentDef.voice,
    voiceId: agentDef.voice_id,
    voiceReason: `Named agent: ${agentDef.name}`,
    prompt,
    model: agentDef.model,
    isNamed: true,
  };
}

function composeDynamicAgent(
  traitKeys: string[],
  task: string,
  traits: TraitsData
): ComposedAgent {
  const expertise: TraitDefinition[] = [];
  const personality: TraitDefinition[] = [];
  const approach: TraitDefinition[] = [];

  for (const key of traitKeys) {
    if (traits.expertise[key]) expertise.push(traits.expertise[key]);
    if (traits.personality[key]) personality.push(traits.personality[key]);
    if (traits.approach[key]) approach.push(traits.approach[key]);
  }

  const nameParts: string[] = [];
  if (expertise.length) nameParts.push(expertise[0].name);
  if (personality.length) nameParts.push(personality[0].name);
  if (approach.length) nameParts.push(approach[0].name);
  const name = nameParts.length > 0 ? nameParts.join(" ") : "Dynamic Agent";

  const { voice, voiceId, reason: voiceReason } = resolveVoice(traitKeys, traits);

  const template = loadTemplate(DYNAMIC_TEMPLATE_PATH);
  const prompt = template({
    name,
    task,
    expertise,
    personality,
    approach,
    voice,
    voiceId,
  });

  return {
    name,
    traits: traitKeys,
    expertise,
    personality,
    approach,
    voice,
    voiceId,
    voiceReason,
    prompt,
    isNamed: false,
  };
}

function listTraits(traits: TraitsData): void {
  console.log("AVAILABLE TRAITS\n");

  console.log("EXPERTISE (domain knowledge):");
  for (const [key, def] of Object.entries(traits.expertise)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nPERSONALITY (behavior style):");
  for (const [key, def] of Object.entries(traits.personality)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nAPPROACH (work style):");
  for (const [key, def] of Object.entries(traits.approach)) {
    console.log(`  ${key.padEnd(15)} - ${def.name}`);
  }

  console.log("\nEXAMPLE COMPOSITIONS:");
  for (const [key, example] of Object.entries(traits.examples)) {
    console.log(`  ${key.padEnd(18)} - ${example.description}`);
    console.log(`                      traits: ${example.traits.join(", ")}`);
  }
}

function listNamedAgents(namedAgents: NamedAgentsData): void {
  console.log("NAMED AGENTS\n");

  for (const [key, agent] of Object.entries(namedAgents.agents)) {
    console.log(`${key.toUpperCase()}: ${agent.name} - "${agent.title}"`);
    console.log(`  Model: ${agent.model}`);
    console.log(`  Voice: ${agent.voice}`);
    console.log(`  Traits: ${agent.traits.join(", ")}`);
    console.log("");
  }

  console.log("ROLE MAPPINGS:");
  for (const [role, agentKey] of Object.entries(namedAgents.role_mappings)) {
    const agent = namedAgents.agents[agentKey];
    console.log(`  ${role.padEnd(20)} -> ${agent?.name || agentKey}`);
  }
}

function resolveRole(role: string, namedAgents: NamedAgentsData): string {
  const mapping = namedAgents.role_mappings[role.toLowerCase()];
  if (mapping) {
    return mapping;
  }
  // Check if it's already a valid agent key
  if (namedAgents.agents[role.toLowerCase()]) {
    return role.toLowerCase();
  }
  return role;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      task: { type: "string", short: "t" },
      traits: { type: "string", short: "r" },
      named: { type: "string", short: "n" },
      role: { type: "string" },
      output: { type: "string", short: "o", default: "prompt" },
      list: { type: "boolean", short: "l" },
      "list-named": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
AgentFactory - Compose dynamic agents from traits or use named agents

USAGE:
  bun run AgentFactory.ts [options]

OPTIONS:
  -t, --task <desc>    Task description (traits will be inferred for dynamic agents)
  -r, --traits <list>  Comma-separated trait keys (for dynamic agents)
  -n, --named <agent>  Use a named agent: engineer, architect, intern
  --role <role>        Map a role to a named agent: implementer, spec_reviewer, etc.
  -o, --output <fmt>   Output format: prompt (default), json, yaml, summary
  -l, --list           List all available traits (for dynamic agents)
  --list-named         List all named agents and role mappings
  -h, --help           Show this help

EXAMPLES:
  # Dynamic agents (composed from traits)
  bun run AgentFactory.ts -t "Review this security architecture"
  bun run AgentFactory.ts -r "security,skeptical,adversarial,thorough"

  # Named agents (persistent identities)
  bun run AgentFactory.ts --named engineer --task "Implement the auth feature"
  bun run AgentFactory.ts --named architect --task "Review the system design"
  bun run AgentFactory.ts --role implementer --task "Build the API endpoint"

  # List available options
  bun run AgentFactory.ts --list
  bun run AgentFactory.ts --list-named
`);
    return;
  }

  const traits = loadTraits();

  if (values.list) {
    listTraits(traits);
    return;
  }

  if (values["list-named"]) {
    const namedAgents = loadNamedAgents();
    listNamedAgents(namedAgents);
    return;
  }

  let agent: ComposedAgent;

  // Named agent path
  if (values.named || values.role) {
    const namedAgents = loadNamedAgents();
    let agentKey = values.named || "";

    if (values.role) {
      agentKey = resolveRole(values.role, namedAgents);
    }

    agent = composeNamedAgent(agentKey, values.task || "", namedAgents);
  }
  // Dynamic agent path
  else {
    let traitKeys: string[] = [];

    if (values.traits) {
      traitKeys = values.traits.split(",").map((t) => t.trim().toLowerCase());
    } else if (values.task) {
      const inferred = inferTraitsFromTask(values.task, traits);
      traitKeys = [...new Set(inferred)];
    }

    if (traitKeys.length === 0) {
      console.error("Error: Provide --task, --traits, --named, or --role");
      process.exit(1);
    }

    const allTraitKeys = [
      ...Object.keys(traits.expertise),
      ...Object.keys(traits.personality),
      ...Object.keys(traits.approach),
    ];
    const invalidTraits = traitKeys.filter((t) => !allTraitKeys.includes(t));
    if (invalidTraits.length > 0) {
      console.error(`Error: Unknown traits: ${invalidTraits.join(", ")}\n`);
      console.error("Available traits:");
      console.error("  EXPERTISE:   " + Object.keys(traits.expertise).join(", "));
      console.error("  PERSONALITY: " + Object.keys(traits.personality).join(", "));
      console.error("  APPROACH:    " + Object.keys(traits.approach).join(", "));
      console.error('\nRun with --list to see full trait descriptions');
      process.exit(1);
    }

    agent = composeDynamicAgent(traitKeys, values.task || "", traits);
  }

  switch (values.output) {
    case "json":
      console.log(
        JSON.stringify(
          {
            name: agent.name,
            traits: agent.traits,
            voice: agent.voice,
            voice_id: agent.voiceId,
            voiceReason: agent.voiceReason,
            model: agent.model || "sonnet",
            isNamed: agent.isNamed,
            expertise: agent.expertise.map((e) => e.name),
            personality: agent.personality.map((p) => p.name),
            approach: agent.approach.map((a) => a.name),
            prompt: agent.prompt,
          },
          null,
          2
        )
      );
      break;

    case "yaml":
      console.log(`name: "${agent.name}"`);
      console.log(`voice: "${agent.voice}"`);
      console.log(`voice_id: "${agent.voiceId}"`);
      console.log(`model: "${agent.model || "sonnet"}"`);
      console.log(`traits: [${agent.traits.join(", ")}]`);
      break;

    case "summary":
      console.log(`COMPOSED AGENT: ${agent.name}`);
      console.log(`Type:        ${agent.isNamed ? "Named" : "Dynamic"}`);
      console.log(`Traits:      ${agent.traits.join(", ")}`);
      console.log(`Voice:       ${agent.voice} [${agent.voiceId}]`);
      console.log(`Model:       ${agent.model || "sonnet"}`);
      break;

    default:
      console.log(agent.prompt);
  }
}

main().catch(console.error);
