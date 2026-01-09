#!/usr/bin/env bun

/**
 * AgentFactory - Dynamic Agent Composition from Traits
 *
 * Composes specialized agents on-the-fly by combining traits from Traits.yaml.
 *
 * Usage:
 *   bun run AgentFactory.ts --task "Review this security architecture"
 *   bun run AgentFactory.ts --traits "security,skeptical,thorough"
 *   bun run AgentFactory.ts --list
 *
 * @version 1.1.0
 *
 * Changelog v1.1.0:
 * - Expanded technical keywords (bash, TypeScript, POSIX, error handling, etc.)
 * - Improved error messages showing available traits on invalid input
 * - Fixed: Explicit --traits now override inference (no longer merge)
 */

import { parseArgs } from "util";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";

// Paths - adjust PAI_DIR as needed
const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.config/pai`;
const TRAITS_PATH = `${PAI_DIR}/skills/Agents/Data/Traits.yaml`;
const TEMPLATE_PATH = `${PAI_DIR}/skills/Agents/Templates/DynamicAgent.hbs`;

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

function loadTraits(): TraitsData {
  if (!existsSync(TRAITS_PATH)) {
    console.error(`Error: Traits file not found at ${TRAITS_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TRAITS_PATH, "utf-8");
  return parseYaml(content) as TraitsData;
}

function loadTemplate(): ReturnType<typeof Handlebars.compile> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`Error: Template file not found at ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const content = readFileSync(TEMPLATE_PATH, "utf-8");
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

function composeAgent(
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

  if (values.help) {
    console.log(`
AgentFactory - Compose dynamic agents from traits

USAGE:
  bun run AgentFactory.ts [options]

OPTIONS:
  -t, --task <desc>    Task description (traits will be inferred)
  -r, --traits <list>  Comma-separated trait keys
  -o, --output <fmt>   Output format: prompt (default), json, yaml, summary
  -l, --list           List all available traits
  -h, --help           Show this help

EXAMPLES:
  bun run AgentFactory.ts -t "Review this security architecture"
  bun run AgentFactory.ts -r "security,skeptical,adversarial,thorough"
  bun run AgentFactory.ts --list
`);
    return;
  }

  const traits = loadTraits();
  if (values.list) {
    listTraits(traits);
    return;
  }

  let traitKeys: string[] = [];

  if (values.traits) {
    traitKeys = values.traits.split(",").map((t) => t.trim().toLowerCase());
  } else if (values.task) {
    // Only infer from task if explicit traits NOT provided
    const inferred = inferTraitsFromTask(values.task, traits);
    traitKeys = [...new Set(inferred)];
  }

  if (traitKeys.length === 0) {
    console.error("Error: Provide --task or --traits");
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

  const agent = composeAgent(traitKeys, values.task || "", traits);

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
      console.log(`traits: [${agent.traits.join(", ")}]`);
      break;

    case "summary":
      console.log(`COMPOSED AGENT: ${agent.name}`);
      console.log(`Traits:      ${agent.traits.join(", ")}`);
      console.log(`Voice:       ${agent.voice} [${agent.voiceId}]`);
      break;

    default:
      console.log(agent.prompt);
  }
}

main().catch(console.error);
