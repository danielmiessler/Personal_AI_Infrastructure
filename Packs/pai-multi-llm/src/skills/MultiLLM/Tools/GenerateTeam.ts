#!/usr/bin/env bun

/**
 * GenerateTeam - Generate team.yaml from detected providers
 *
 * Creates a ready-to-use team.yaml configuration based on
 * auto-detected LLM providers. Users can customize roles
 * and use_for fields after generation.
 *
 * Usage:
 *   bun run GenerateTeam.ts
 *   bun run GenerateTeam.ts --dry-run
 *   bun run GenerateTeam.ts --output /path/to/team.yaml
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { stringify as stringifyYaml } from "yaml";
import { $ } from "bun";
import type { ProviderConfig, TeamConfig, DetectionResult } from "../../../types/Provider";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const CONFIG_DIR = `${PAI_DIR}/config`;
const TEAM_FILE = `${CONFIG_DIR}/team.yaml`;
const EXAMPLE_FILE = `${CONFIG_DIR}/team.example.yaml`;

// Default role assignments based on provider characteristics
const DEFAULT_ROLES: Record<string, { role: string; use_for: string[] }> = {
  claude: {
    role: "coordinator",
    use_for: ["Coordination", "Synthesis", "Strategic thinking", "Complex reasoning"]
  },
  codex: {
    role: "code_expert",
    use_for: ["Code generation", "Technical implementation", "Code review", "Debugging"]
  },
  gemini: {
    role: "creative_thinker",
    use_for: ["Creative synthesis", "Cross-domain connections", "Brainstorming", "Multi-modal tasks"]
  },
  opencode: {
    role: "executor",
    use_for: ["Task execution", "Terminal operations", "Quick prototyping"]
  }
};

// Ollama model role mappings
const OLLAMA_MODEL_ROLES: Record<string, { role: string; use_for: string[] }> = {
  "deepseek-r1": {
    role: "deep_reasoner",
    use_for: ["Strategic analysis", "Complex reasoning", "Multi-step problems", "Deep thinking"]
  },
  "qwen3-coder": {
    role: "code_validator",
    use_for: ["Code validation", "Technical review", "Architecture analysis"]
  },
  "qwen3": {
    role: "fast_responder",
    use_for: ["Quick tasks", "Simple queries", "Fast iteration"]
  },
  "gpt-oss": {
    role: "general_assistant",
    use_for: ["General tasks", "Content generation", "Analysis"]
  },
  "llama": {
    role: "general_assistant",
    use_for: ["General tasks", "Balanced reasoning"]
  },
  "mistral": {
    role: "balanced_thinker",
    use_for: ["Balanced analysis", "General reasoning"]
  },
  "phi": {
    role: "lightweight_helper",
    use_for: ["Simple tasks", "Quick responses"]
  }
};

// Session configurations per provider
const SESSION_CONFIGS: Record<string, ProviderConfig["session"]> = {
  claude: {
    supported: true,
    start: 'claude -p "{prompt}" --output-format json',
    continue_last: 'claude -c -p "{prompt}"',
    resume_by_id: 'claude -r {session_id} -p "{prompt}"',
    session_id_extraction: {
      method: "json_field",
      pattern: "session_id"
    }
  },
  codex: {
    supported: true,
    start: 'codex "{prompt}"',
    continue_last: "codex resume --last",
    resume_by_id: "codex resume {session_id}",
    storage_path: "~/.codex/sessions/",
    session_id_extraction: {
      method: "file_based"
    }
  },
  gemini: {
    supported: true,
    start: 'gemini "{prompt}"',
    continue_last: "gemini --resume",
    resume_by_id: "gemini --resume {session_id}",
    session_id_extraction: {
      method: "none"
    }
  },
  opencode: {
    supported: true,
    start: 'opencode "{prompt}"',
    continue_last: 'opencode --continue "{prompt}"',
    session_id_extraction: {
      method: "none"
    }
  },
  ollama: {
    supported: false,
    start: 'ollama run {model} "{prompt}"',
    note: "Use interactive mode with /save and /load for session management"
  }
};

async function detectProviders(): Promise<DetectionResult> {
  // Import and run detection
  const detectModule = await import("./DetectProviders");

  // Run detection command and capture output
  const result = await $`bun run ${__dirname}/DetectProviders.ts --json`.quiet();
  return JSON.parse(result.stdout.toString());
}

function getOllamaModelName(fullName: string): string {
  // Extract base model name (e.g., "deepseek-r1:14b" -> "deepseek-r1")
  return fullName.split(":")[0];
}

function getOllamaModelRole(modelName: string): { role: string; use_for: string[] } {
  const baseName = getOllamaModelName(modelName);

  // Check exact match first
  if (OLLAMA_MODEL_ROLES[baseName]) {
    return OLLAMA_MODEL_ROLES[baseName];
  }

  // Check prefix match
  for (const [key, value] of Object.entries(OLLAMA_MODEL_ROLES)) {
    if (baseName.startsWith(key)) {
      return value;
    }
  }

  // Default
  return {
    role: "local_model",
    use_for: ["Local inference", "Privacy-sensitive tasks"]
  };
}

function buildProviderConfig(
  name: string,
  detected: DetectionResult["providers"][0]
): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (name === "ollama" && detected.models && detected.models.length > 0) {
    // Create separate config for each Ollama model
    for (const model of detected.models) {
      const modelRole = getOllamaModelRole(model);
      const sessionConfig = { ...SESSION_CONFIGS.ollama };
      sessionConfig.start = sessionConfig.start.replace("{model}", model);

      configs.push({
        name: model.replace(":", "-"), // Sanitize for YAML keys
        cli: `ollama run ${model} "{prompt}"`,
        available: true,
        version: detected.version,
        session: sessionConfig,
        role: modelRole.role,
        use_for: modelRole.use_for
      });
    }
  } else {
    // Standard provider
    const defaults = DEFAULT_ROLES[name] || {
      role: name,
      use_for: ["General tasks"]
    };

    configs.push({
      name,
      cli: `${name} "{prompt}"`,
      available: detected.available,
      version: detected.version,
      session: SESSION_CONFIGS[name] || {
        supported: false,
        start: `${name} "{prompt}"`
      },
      role: defaults.role,
      use_for: defaults.use_for
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
# Installation commands:
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
# Detected providers: ${detection.summary.providers_found.join(", ")}
#
# Customize roles and use_for to match YOUR workflow.
# Session management is pre-configured for context efficiency.
#
`;

  const team: TeamConfig = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    auto_detected: !isExample,
    providers: []
  };

  if (isExample) {
    // Generate example with all providers commented
    const exampleProviders: ProviderConfig[] = [];

    for (const name of Object.keys(DEFAULT_ROLES)) {
      const defaults = DEFAULT_ROLES[name];
      exampleProviders.push({
        name,
        cli: `${name} "{prompt}"`,
        available: false,
        session: SESSION_CONFIGS[name] || { supported: false, start: `${name} "{prompt}"` },
        role: defaults.role,
        use_for: defaults.use_for
      });
    }

    // Add example Ollama models
    exampleProviders.push({
      name: "deepseek-r1-14b",
      cli: 'ollama run deepseek-r1:14b "{prompt}"',
      available: false,
      session: SESSION_CONFIGS.ollama,
      role: "deep_reasoner",
      use_for: ["Strategic analysis", "Complex reasoning"]
    });

    team.providers = exampleProviders;
  } else {
    // Generate from detected providers
    for (const detected of detection.providers) {
      if (detected.available) {
        const configs = buildProviderConfig(detected.name, detected);
        team.providers.push(...configs);
      }
    }
  }

  const yamlContent = stringifyYaml(team, {
    lineWidth: 0,
    defaultStringType: "QUOTE_DOUBLE"
  });

  return header + yamlContent;
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: "string", short: "o" },
      "dry-run": { type: "boolean", short: "d" },
      force: { type: "boolean", short: "f" },
      help: { type: "boolean", short: "h" }
    }
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

The tool will:
1. Detect available LLM providers
2. Generate team.yaml with session management configs
3. Assign default roles (customize after generation)
`);
    return;
  }

  console.log("Detecting LLM providers...\n");
  const detection = await detectProviders();

  const outputPath = values.output || TEAM_FILE;
  const hasProviders = detection.summary.total_detected > 0;

  if (hasProviders) {
    console.log(`Detected ${detection.summary.total_detected} provider(s):`);
    for (const p of detection.providers.filter(p => p.available)) {
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

  // Check if file exists
  if (existsSync(targetFile) && !values.force) {
    console.error(`Error: ${targetFile} already exists.`);
    console.error("Use --force to overwrite.");
    process.exit(1);
  }

  // Ensure directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Write file
  writeFileSync(targetFile, content);

  console.log(`✓ Generated: ${targetFile}`);

  if (hasProviders) {
    console.log("");
    console.log("Next steps:");
    console.log("  1. Review and customize roles in team.yaml");
    console.log("  2. Query providers: bun run query -p 'Your prompt'");
    console.log("  3. List providers:  bun run query --list");
  } else {
    console.log("");
    console.log("Next steps:");
    console.log("  1. Install at least one LLM provider");
    console.log("  2. Run: bun run generate-team");
  }
}

main().catch(console.error);
