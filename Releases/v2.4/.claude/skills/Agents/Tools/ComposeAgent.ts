#!/usr/bin/env bun

/**
 * ComposeAgent - Dynamic Agent Composition from Traits
 *
 * Composes specialized agents on-the-fly by combining traits.
 * Merges base traits (ships with PAI) with user customizations.
 *
 * Configuration files:
 *   Base:  ~/.claude/skills/Agents/Data/Traits.yaml
 *   User:  ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml
 *
 * Usage:
 *   # Infer traits from task description
 *   bun run ComposeAgent.ts --task "Review this security architecture"
 *
 *   # Specify traits explicitly
 *   bun run ComposeAgent.ts --traits "security,skeptical,thorough"
 *
 *   # Output formats
 *   bun run ComposeAgent.ts --task "..." --output json
 *   bun run ComposeAgent.ts --task "..." --output prompt (default)
 *
 *   # List available traits
 *   bun run ComposeAgent.ts --list
 *
 * @version 2.0.0
 */

import { parseArgs } from "util";
import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import Handlebars from "handlebars";

// Paths
const HOME = process.env.HOME || "~";
const BASE_TRAITS_PATH = `${HOME}/.claude/skills/Agents/Data/Traits.yaml`;
const USER_TRAITS_PATH = `${HOME}/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml`;
const TEMPLATE_PATH = `${HOME}/.claude/skills/Agents/Templates/DynamicAgent.hbs`;

// Types
interface ProsodySettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
  use_speaker_boost: boolean;
  volume: number;
}

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
  prosody?: ProsodySettings;
  // Legacy flat fields (for backwards compatibility)
  stability?: number;
  similarity_boost?: number;
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
  voiceSettings: ProsodySettings;
  color: string;
  prompt: string;
}

// Color palette for custom agents - vibrant, distinguishable colors
const AGENT_COLOR_PALETTE = [
  "#FF6B35", // Coral Orange
  "#4ECDC4", // Teal
  "#9B59B6", // Purple
  "#2ECC71", // Emerald
  "#E74C3C", // Red
  "#3498DB", // Blue
  "#F39C12", // Orange
  "#1ABC9C", // Turquoise
  "#E91E63", // Pink
  "#00BCD4", // Cyan
  "#8BC34A", // Light Green
  "#FF5722", // Deep Orange
  "#673AB7", // Deep Purple
  "#009688", // Teal Dark
  "#FFC107", // Amber
];

// Default prosody settings
const DEFAULT_PROSODY: ProsodySettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  speed: 1.0,
  use_speaker_boost: true,
  volume: 0.8,
};

/**
 * Deep merge two objects (user overrides base)
 */
function deepMerge<T extends Record<string, unknown>>(base: T, user: Partial<T>): T {
  const result = { ...base };

  for (const key of Object.keys(user) as (keyof T)[]) {
    const userVal = user[key];
    const baseVal = base[key];

    if (
      userVal !== undefined &&
      typeof userVal === "object" &&
      userVal !== null &&
      !Array.isArray(userVal) &&
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        userVal as Record<string, unknown>
      ) as T[keyof T];
    } else if (userVal !== undefined) {
      // User value overrides base
      result[key] = userVal as T[keyof T];
    }
  }

  return result;
}

/**
 * Merge arrays by concatenating (for mappings)
 */
function mergeArrays<T>(base: T[], user: T[]): T[] {
  return [...base, ...user];
}

/**
 * Load and merge traits from base + user YAML files
 */
function loadTraits(): TraitsData {
  // Load base traits (required)
  if (!existsSync(BASE_TRAITS_PATH)) {
    console.error(`Error: Base traits file not found at ${BASE_TRAITS_PATH}`);
    process.exit(1);
  }
  const baseContent = readFileSync(BASE_TRAITS_PATH, "utf-8");
  const base = parseYaml(baseContent) as TraitsData;

  // Load user traits (optional)
  if (existsSync(USER_TRAITS_PATH)) {
    const userContent = readFileSync(USER_TRAITS_PATH, "utf-8");
    const user = parseYaml(userContent) as Partial<TraitsData>;

    // Merge each section
    const merged: TraitsData = {
      expertise: deepMerge(base.expertise || {}, user.expertise || {}),
      personality: deepMerge(base.personality || {}, user.personality || {}),
      approach: deepMerge(base.approach || {}, user.approach || {}),
      voice_mappings: {
        default: user.voice_mappings?.default || base.voice_mappings?.default || "Daniel",
        default_voice_id:
          user.voice_mappings?.default_voice_id ||
          base.voice_mappings?.default_voice_id ||
          "",
        voice_registry: deepMerge(
          base.voice_mappings?.voice_registry || {},
          user.voice_mappings?.voice_registry || {}
        ),
        mappings: mergeArrays(
          base.voice_mappings?.mappings || [],
          user.voice_mappings?.mappings || []
        ),
        fallbacks: deepMerge(
          base.voice_mappings?.fallbacks || {},
          user.voice_mappings?.fallbacks || {}
        ),
      },
      examples: deepMerge(base.examples || {}, user.examples || {}),
    };

    return merged;
  }

  return base;
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

  // Apply smart defaults if categories are missing
  const hasExpertise = inferred.some((t) => traits.expertise[t]);
  const hasPersonality = inferred.some((t) => traits.personality[t]);
  const hasApproach = inferred.some((t) => traits.approach[t]);

  if (!hasPersonality) inferred.push("analytical");
  if (!hasApproach) inferred.push("thorough");
  if (!hasExpertise) inferred.push("research");

  return [...new Set(inferred)];
}

/**
 * Get prosody settings from voice registry entry
 */
function getProsody(entry: VoiceRegistryEntry | undefined): ProsodySettings {
  if (!entry) return DEFAULT_PROSODY;

  // Check for new prosody object first
  if (entry.prosody) {
    return {
      stability: entry.prosody.stability ?? DEFAULT_PROSODY.stability,
      similarity_boost: entry.prosody.similarity_boost ?? DEFAULT_PROSODY.similarity_boost,
      style: entry.prosody.style ?? DEFAULT_PROSODY.style,
      speed: entry.prosody.speed ?? DEFAULT_PROSODY.speed,
      use_speaker_boost: entry.prosody.use_speaker_boost ?? DEFAULT_PROSODY.use_speaker_boost,
      volume: (entry.prosody as any).volume ?? DEFAULT_PROSODY.volume,
    };
  }

  // Fall back to legacy flat fields
  return {
    stability: entry.stability ?? DEFAULT_PROSODY.stability,
    similarity_boost: entry.similarity_boost ?? DEFAULT_PROSODY.similarity_boost,
    style: DEFAULT_PROSODY.style,
    speed: DEFAULT_PROSODY.speed,
    use_speaker_boost: DEFAULT_PROSODY.use_speaker_boost,
    volume: DEFAULT_PROSODY.volume,
  };
}

/**
 * Resolve voice based on trait combination
 */
function resolveVoice(
  traitKeys: string[],
  traits: TraitsData
): { voice: string; voiceId: string; reason: string; voiceSettings: ProsodySettings } {
  const mappings = traits.voice_mappings;
  const registry = mappings.voice_registry || {};

  const getVoiceId = (voiceName: string, fallbackId?: string): string => {
    if (registry[voiceName]?.voice_id) {
      return registry[voiceName].voice_id;
    }
    return fallbackId || mappings.default_voice_id || "";
  };

  // Check explicit combination mappings first
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
    const voiceName = best.voice;
    return {
      voice: voiceName,
      voiceId: best.voice_id || getVoiceId(voiceName),
      reason: best.reason || `Matched traits: ${best.traits.join(", ")}`,
      voiceSettings: getProsody(registry[voiceName]),
    };
  }

  // Check fallbacks
  for (const trait of traitKeys) {
    if (mappings.fallbacks[trait]) {
      const voiceName = mappings.fallbacks[trait];
      const voiceIdKey = `${trait}_voice_id`;
      const fallbackVoiceId = mappings.fallbacks[voiceIdKey] as string | undefined;
      return {
        voice: voiceName,
        voiceId: fallbackVoiceId || getVoiceId(voiceName),
        reason: `Fallback for trait: ${trait}`,
        voiceSettings: getProsody(registry[voiceName]),
      };
    }
  }

  // Default
  return {
    voice: mappings.default,
    voiceId: mappings.default_voice_id || "",
    reason: "Default voice (no specific mapping matched)",
    voiceSettings: getProsody(registry[mappings.default]),
  };
}

/**
 * Generate a unique color for an agent based on trait combination
 * Uses a hash of the sorted traits to ensure consistent color per combination
 */
function generateAgentColor(traitKeys: string[]): string {
  // Create a hash from the sorted traits
  const sortedTraits = [...traitKeys].sort().join(",");
  let hash = 0;
  for (let i = 0; i < sortedTraits.length; i++) {
    const char = sortedTraits.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Use absolute value and modulo to get palette index
  const index = Math.abs(hash) % AGENT_COLOR_PALETTE.length;
  return AGENT_COLOR_PALETTE[index];
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

  const { voice, voiceId, reason: voiceReason, voiceSettings } = resolveVoice(traitKeys, traits);
  const color = generateAgentColor(traitKeys);

  const template = loadTemplate();
  const prompt = template({
    name,
    task,
    expertise,
    personality,
    approach,
    voice,
    voiceId,
    voiceSettings,
    color,
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
    voiceSettings,
    color,
    prompt,
  };
}

/**
 * List all available traits
 */
function listTraits(traits: TraitsData): void {
  console.log("AVAILABLE TRAITS (base + user merged)\n");

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

  console.log("\nVOICES AVAILABLE:");
  const registry = traits.voice_mappings?.voice_registry || {};
  for (const [name, entry] of Object.entries(registry)) {
    const prosody = getProsody(entry);
    console.log(`  ${name.padEnd(12)} - ${entry.description}`);
    console.log(`               stability:${prosody.stability} style:${prosody.style} speed:${prosody.speed} volume:${prosody.volume}`);
  }

  if (traits.examples && Object.keys(traits.examples).length > 0) {
    console.log("\nEXAMPLE COMPOSITIONS:");
    for (const [key, example] of Object.entries(traits.examples)) {
      console.log(`  ${key.padEnd(18)} - ${example.description}`);
      console.log(`                      traits: ${example.traits.join(", ")}`);
    }
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

  if (values.help) {
    console.log(`
ComposeAgent - Compose dynamic agents from traits

USAGE:
  bun run ComposeAgent.ts [options]

OPTIONS:
  -t, --task <desc>    Task description (traits will be inferred)
  -r, --traits <list>  Comma-separated trait keys (security,skeptical,thorough)
  -o, --output <fmt>   Output format: prompt (default), json, yaml, summary
  -l, --list           List all available traits
  -h, --help           Show this help

CONFIGURATION:
  Base traits:  ~/.claude/skills/Agents/Data/Traits.yaml
  User traits:  ~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml

  User traits are merged over base (user takes priority).
  Add your custom voices, personalities, and prosody settings in the user file.

EXAMPLES:
  # Infer traits from task
  bun run ComposeAgent.ts -t "Review this security architecture"

  # Specify traits explicitly
  bun run ComposeAgent.ts -r "security,skeptical,adversarial,thorough"

  # Get JSON output with voice settings
  bun run ComposeAgent.ts -t "Analyze competitors" -o json

  # See all available traits (base + user merged)
  bun run ComposeAgent.ts --list

OUTPUT (json format includes):
  - name, traits, voice, voice_id, color
  - voice_settings: { stability, similarity_boost, style, speed, use_speaker_boost }
  - prompt (complete agent prompt)

  Colors are unique per trait combination - same traits always get same color.
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
            voice_reason: agent.voiceReason,
            voice_settings: agent.voiceSettings,
            color: agent.color,
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
      console.log(`color: "${agent.color}"`);
      console.log(`voice_settings:`);
      console.log(`  stability: ${agent.voiceSettings.stability}`);
      console.log(`  similarity_boost: ${agent.voiceSettings.similarity_boost}`);
      console.log(`  style: ${agent.voiceSettings.style}`);
      console.log(`  speed: ${agent.voiceSettings.speed}`);
      console.log(`  use_speaker_boost: ${agent.voiceSettings.use_speaker_boost}`);
      console.log(`  volume: ${agent.voiceSettings.volume}`);
      console.log(`traits: [${agent.traits.join(", ")}]`);
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
      console.log(`Color:       ${agent.color}`);
      console.log(`Prosody:     stability:${agent.voiceSettings.stability} style:${agent.voiceSettings.style} speed:${agent.voiceSettings.speed} volume:${agent.voiceSettings.volume}`);
      break;

    default:
      console.log(agent.prompt);
  }
}

main().catch(console.error);
