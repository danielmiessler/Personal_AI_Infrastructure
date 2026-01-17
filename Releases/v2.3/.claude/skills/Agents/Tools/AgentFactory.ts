#!/usr/bin/env bun

/**
 * AgentFactory - Dynamic Agent Composition from Traits
 *
 * Composes specialized agents on-the-fly by combining traits from Traits.yaml.
 * Part of PAI's hybrid agent system (named agents + dynamic composition).
 *
 * Usage:
 *   # Infer traits from task description
 *   bun run AgentFactory.ts --task "Review this security architecture"
 *
 *   # Specify traits explicitly
 *   bun run AgentFactory.ts --traits "security,skeptical,thorough"
 *
 *   # Combine both (explicit traits + inferred from task)
 *   bun run AgentFactory.ts --task "Check this contract" --traits "cautious"
 *
 *   # Output formats
 *   bun run AgentFactory.ts --task "..." --output json
 *   bun run AgentFactory.ts --task "..." --output yaml
 *   bun run AgentFactory.ts --task "..." --output prompt (default)
 *
 *   # List available traits
 *   bun run AgentFactory.ts --list
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";

// Paths
const HOME = process.env.HOME || "~";
const TRAITS_PATH = `${HOME}/.claude/skills/Agents/Data/Traits.yaml`;
const TEMPLATE_PATH = `${HOME}/.claude/skills/Agents/Templates/DynamicAgent.hbs`;

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
}

/**
 * Load traits from YAML file
 */
function loadTraits(): TraitsData {
  if (!existsSync(TRAITS_PATH)) {
    console.error(`Error: Traits file not found at ${TRAITS_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TRAITS_PATH, "utf-8");
  return parseYaml(content) as TraitsData;
}

/**
 * Load and compile the agent template
 */
function loadTemplate(): HandlebarsTemplateDelegate {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TEMPLATE_PATH, "utf-8");
  return Handlebars.compile(content);
}

/**
 * Infer appropriate traits from a task description
 */
function inferTraitsFromTask(task: string, traits: TraitsData): string[] {
  const inferred: string[] = [];
  const taskLower = task.toLowerCase();

  // Check expertise keywords
  for (const [key, def] of Object.entries(traits.expertise)) {
    if (def.keywords?.some((kw) => taskLower.includes(kw.toLowerCase()))) {
      inferred.push(key);
    }
  }

  // Check personality keywords (less common, but possible)
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

  // Apply smart defaults if categories are missing
  const hasExpertise = inferred.some((t) => traits.expertise[t]);
  const hasPersonality = inferred.some((t) => traits.personality[t]);
  const hasApproach = inferred.some((t) => traits.approach[t]);

  // Default personality: analytical (balanced, professional)
  if (!hasPersonality) {
    inferred.push("analytical");
  }

  // Default approach: thorough (comprehensive coverage)
  if (!hasApproach) {
    inferred.push("thorough");
  }

  // If no expertise was inferred, add 'research' as general-purpose
  if (!hasExpertise) {
    inferred.push("research");
  }

  return [...new Set(inferred)]; // Deduplicate
}

/**
 * Resolve voice based on trait combination
 */
function resolveVoice(
  traitKeys: string[],
  traits: TraitsData
): { voice: string; voiceId: string; reason: string } {
  const mappings = traits.voice_mappings;
  const registry = mappings.voice_registry || {};

  // Helper to get voice_id from registry or fallback
  const getVoiceId = (voiceName: string, fallbackId?: string): string => {
    if (registry[voiceName]?.voice_id) {
      return registry[voiceName].voice_id;
    }
    return fallbackId || mappings.default_voice_id || "";
  };

  // Check explicit combination mappings first (more specific = higher priority)
  // Sort by number of matching traits (descending) for best match
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

  // Check fallbacks by primary trait (first personality trait found)
  for (const trait of traitKeys) {
    if (mappings.fallbacks[trait]) {
      const voiceName = mappings.fallbacks[trait];
      // Look for corresponding voice_id key (e.g., skeptical_voice_id)
      const voiceIdKey = `${trait}_voice_id`;
      const fallbackVoiceId = mappings.fallbacks[voiceIdKey] as string | undefined;
      return {
        voice: voiceName,
        voiceId: fallbackVoiceId || getVoiceId(voiceName),
        reason: `Fallback for trait: ${trait}`,
      };
    }
  }

  // Default
  return {
    voice: mappings.default,
    voiceId: mappings.default_voice_id || "",
    reason: "Default voice (no specific mapping matched)",
  };
}

/**
 * Compose an agent from traits
 */
function composeAgent(
  traitKeys: string[],
  task: string,
  traits: TraitsData
): ComposedAgent {
  const expertise: TraitDefinition[] = [];
  const personality: TraitDefinition[] = [];
  const approach: TraitDefinition[] = [];

  // Categorize traits
  for (const key of traitKeys) {
    if (traits.expertise[key]) {
      expertise.push(traits.expertise[key]);
    }
    if (traits.personality[key]) {
      personality.push(traits.personality[key]);
    }
    if (traits.approach[key]) {
      approach.push(traits.approach[key]);
    }
  }

  // Generate name from traits
  const nameParts: string[] = [];
  if (expertise.length) nameParts.push(expertise[0].name);
  if (personality.length) nameParts.push(personality[0].name);
  if (approach.length) nameParts.push(approach[0].name);
  const name = nameParts.length > 0 ? nameParts.join(" ") : "Dynamic Agent";

  // Resolve voice
  const { voice, voiceId, reason: voiceReason } = resolveVoice(traitKeys, traits);

  // Render prompt from template
  const template = loadTemplate();
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
  };
}

/**
 * List all available traits
 */
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

/**
 * Main entry point
 */
async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      task: { type: "string", short: "t" },
      traits: { type: "string", short: "r" },
      output: { type: "string", short: "o", default: "prompt" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
  });

  // Help
  if (values.help) {
    console.log(`
AgentFactory - Compose dynamic agents from traits

USAGE:
  bun run AgentFactory.ts [options]

OPTIONS:
  -t, --task <desc>    Task description (traits will be inferred)
  -r, --traits <list>  Comma-separated trait keys (security,skeptical,thorough)
  -o, --output <fmt>   Output format: prompt (default), json, yaml, summary
  -l, --list           List all available traits
  -h, --help           Show this help

EXAMPLES:
  # Infer traits from task
  bun run AgentFactory.ts -t "Review this security architecture"

  # Specify traits explicitly
  bun run AgentFactory.ts -r "security,skeptical,adversarial,thorough"

  # Combine explicit and inferred
  bun run AgentFactory.ts -t "Check this contract" -r "cautious,meticulous"

  # Get JSON output for programmatic use
  bun run AgentFactory.ts -t "Analyze competitors" -o json

  # See what's available
  bun run AgentFactory.ts --list

TRAIT CATEGORIES:
  - expertise:    Domain knowledge (security, legal, finance, technical, etc.)
  - personality:  Behavior style (skeptical, enthusiastic, cautious, etc.)
  - approach:     Work style (thorough, rapid, systematic, exploratory, etc.)

The factory automatically:
  - Infers relevant traits from task keywords
  - Applies sensible defaults for missing categories
  - Maps traits to appropriate voice output
  - Generates a complete agent prompt
`);
    return;
  }

  // List traits
  const traits = loadTraits();
  if (values.list) {
    listTraits(traits);
    return;
  }

  // Collect trait keys
  let traitKeys: string[] = [];

  if (values.traits) {
    traitKeys = values.traits.split(",").map((t) => t.trim().toLowerCase());
  }

  if (values.task) {
    const inferred = inferTraitsFromTask(values.task, traits);
    traitKeys = [...new Set([...traitKeys, ...inferred])];
  }

  if (traitKeys.length === 0) {
    console.error("Error: Provide --task or --traits to compose an agent");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  // Validate trait keys
  const allTraitKeys = [
    ...Object.keys(traits.expertise),
    ...Object.keys(traits.personality),
    ...Object.keys(traits.approach),
  ];
  const invalidTraits = traitKeys.filter((t) => !allTraitKeys.includes(t));
  if (invalidTraits.length > 0) {
    console.error(`Error: Unknown traits: ${invalidTraits.join(", ")}`);
    console.error("Use --list to see available traits");
    process.exit(1);
  }

  // Compose the agent
  const agent = composeAgent(traitKeys, values.task || "", traits);

  // Output
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
      console.log(`voice_reason: "${agent.voiceReason}"`);
      console.log(`traits: [${agent.traits.join(", ")}]`);
      console.log(`expertise: [${agent.expertise.map((e) => e.name).join(", ")}]`);
      console.log(`personality: [${agent.personality.map((p) => p.name).join(", ")}]`);
      console.log(`approach: [${agent.approach.map((a) => a.name).join(", ")}]`);
      break;

    case "summary":
      console.log(`COMPOSED AGENT: ${agent.name}`);
      console.log(`─────────────────────────────────────`);
      console.log(`Traits:      ${agent.traits.join(", ")}`);
      console.log(`Expertise:   ${agent.expertise.map((e) => e.name).join(", ") || "General"}`);
      console.log(`Personality: ${agent.personality.map((p) => p.name).join(", ")}`);
      console.log(`Approach:    ${agent.approach.map((a) => a.name).join(", ")}`);
      console.log(`Voice:       ${agent.voice} [${agent.voiceId}]`);
      console.log(`             (${agent.voiceReason})`);
      break;

    default:
      // Full prompt output
      console.log(agent.prompt);
  }
}

main().catch(console.error);
