#!/usr/bin/env bun

/**
 * GenerateTeam - Generate team.yaml from detected providers
 *
 * Usage:
 *   bun run GenerateTeam.ts
 *   bun run GenerateTeam.ts --dry-run
 *   bun run GenerateTeam.ts --output /path/to/team.yaml
 */

import { parseArgs } from "util";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { stringify as stringifyYaml } from "yaml";
import { $ } from "bun";
import { CONFIG_DIR, TEAM_FILE, EXAMPLE_FILE, loadTeamDefaults } from "../lib/config";
import type { ProviderConfig, TeamConfig, DetectionResult } from "../../../types/Provider";

const defaults = loadTeamDefaults();

async function detectProviders(): Promise<DetectionResult> {
  const result = await $`bun run ${__dirname}/DetectProviders.ts --json`.quiet();
  return JSON.parse(result.stdout.toString());
}

function getOllamaModelRole(modelName: string): { role: string; use_for: string[] } {
  const baseName = modelName.split(":")[0];

  // Check exact match
  if (defaults.ollama_model_roles[baseName]) {
    return defaults.ollama_model_roles[baseName];
  }

  // Check prefix match
  for (const [key, value] of Object.entries(defaults.ollama_model_roles)) {
    if (baseName.startsWith(key)) {
      return value;
    }
  }

  return defaults.ollama_default_role;
}

function buildProviderConfig(
  name: string,
  detected: DetectionResult["providers"][0]
): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (name === "ollama" && detected.models?.length) {
    for (const model of detected.models) {
      const modelRole = getOllamaModelRole(model);
      const sessionConfig = { ...defaults.session_configs.ollama };
      sessionConfig.start = sessionConfig.start.replace("{model}", model);

      configs.push({
        name: model.replace(":", "-"),
        cli: `ollama run ${model} "{prompt}"`,
        available: true,
        version: detected.version,
        session: sessionConfig,
        role: modelRole.role,
        use_for: modelRole.use_for,
      });
    }
  } else {
    const roleConfig = defaults.provider_roles[name] || defaults.provider_default_role;

    configs.push({
      name,
      cli: `${name} "{prompt}"`,
      available: detected.available,
      version: detected.version,
      session: defaults.session_configs[name] || { supported: false, start: `${name} "{prompt}"` },
      role: roleConfig.role,
      use_for: roleConfig.use_for,
    });
  }

  return configs;
}

function generateTeamYaml(detection: DetectionResult, isExample: boolean): string {
  const header = isExample
    ? `# team.example.yaml - Template for LLM team configuration
#
# NO LLM PROVIDERS WERE DETECTED during installation.
#
# To use pai-multi-llm:
# 1. Install at least one LLM CLI (see instructions below)
# 2. Copy this file to team.yaml
# 3. Uncomment and configure your providers
#
# Installation:
#   Claude:   npm install -g @anthropic-ai/claude-code
#   Codex:    npm install -g @openai/codex
#   Gemini:   pip install google-generativeai
#   Ollama:   brew install ollama && ollama pull deepseek-r1:14b
#   OpenCode: go install github.com/sst/opencode@latest
#
`
    : `# team.yaml - Auto-generated LLM team configuration
#
# Generated: ${new Date().toISOString()}
# Detected: ${detection.summary.providers_found.join(", ")}
#
# Customize roles and use_for to match YOUR workflow.
#
`;

  const team: TeamConfig = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    auto_detected: !isExample,
    providers: [],
  };

  if (isExample) {
    // Generate example with all providers
    for (const name of Object.keys(defaults.provider_roles)) {
      const roleConfig = defaults.provider_roles[name];
      team.providers.push({
        name,
        cli: `${name} "{prompt}"`,
        available: false,
        session: defaults.session_configs[name] || { supported: false, start: `${name} "{prompt}"` },
        role: roleConfig.role,
        use_for: roleConfig.use_for,
      });
    }

    // Add example Ollama model
    team.providers.push({
      name: "deepseek-r1-14b",
      cli: 'ollama run deepseek-r1:14b "{prompt}"',
      available: false,
      session: defaults.session_configs.ollama,
      role: "deep_reasoner",
      use_for: ["Strategic analysis", "Complex reasoning"],
    });
  } else {
    for (const detected of detection.providers) {
      if (detected.available) {
        team.providers.push(...buildProviderConfig(detected.name, detected));
      }
    }
  }

  const yamlContent = stringifyYaml(team, { lineWidth: 0, defaultStringType: "QUOTE_DOUBLE" });
  return header + yamlContent;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: "string", short: "o" },
      "dry-run": { type: "boolean", short: "d" },
      force: { type: "boolean", short: "f" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
GenerateTeam - Generate team.yaml from detected providers

USAGE:
  bun run GenerateTeam.ts [options]

OPTIONS:
  -o, --output <path>  Output path (default: ${TEAM_FILE})
  -d, --dry-run        Preview without writing
  -f, --force          Overwrite existing team.yaml
  -h, --help           Show this help
`);
    return;
  }

  console.log("Detecting LLM providers...\n");
  const detection = await detectProviders();

  const outputPath = values.output || TEAM_FILE;
  const hasProviders = detection.summary.total_detected > 0;

  if (hasProviders) {
    console.log(`Detected ${detection.summary.total_detected} provider(s):`);
    for (const p of detection.providers.filter((p) => p.available)) {
      console.log(`  ✓ ${p.name}${p.models ? ` (${p.models.length} models)` : ""}`);
    }
    console.log("");
  } else {
    console.log("No LLM providers detected.");
    console.log("Generating example template instead.\n");
  }

  const content = generateTeamYaml(detection, !hasProviders);
  const targetFile = hasProviders ? outputPath : EXAMPLE_FILE;

  if (values["dry-run"]) {
    console.log("─".repeat(60));
    console.log(`Would write to: ${targetFile}`);
    console.log("─".repeat(60));
    console.log(content);
    return;
  }

  if (existsSync(targetFile) && !values.force) {
    console.error(`Error: ${targetFile} already exists.`);
    console.error("Use --force to overwrite.");
    process.exit(1);
  }

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  writeFileSync(targetFile, content);
  console.log(`✓ Generated: ${targetFile}`);

  if (hasProviders) {
    console.log("\nNext steps:");
    console.log("  1. Review and customize roles in team.yaml");
    console.log("  2. Query providers: bun run query -p 'Your prompt'");
  } else {
    console.log("\nNext steps:");
    console.log("  1. Install at least one LLM provider");
    console.log("  2. Run: bun run generate-team");
  }
}

main().catch(console.error);
