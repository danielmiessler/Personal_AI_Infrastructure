#!/usr/bin/env bun

/**
 * DetectProviders - Auto-detect available LLM CLIs
 *
 * Scans the system for installed LLM command-line tools:
 * - Claude CLI
 * - Codex CLI (OpenAI)
 * - Gemini CLI (Google)
 * - Ollama (local models)
 * - OpenCode
 *
 * Usage:
 *   bun run DetectProviders.ts
 *   bun run DetectProviders.ts --json
 *   bun run DetectProviders.ts --verbose
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { $ } from "bun";
import type { DetectedProvider, DetectionResult } from "../../../types/Provider";

// Provider detection configurations
const PROVIDERS_TO_DETECT = [
  {
    name: "claude",
    commands: ["claude"],
    version_flag: "--version",
    detection_method: "which + version"
  },
  {
    name: "codex",
    commands: ["codex"],
    version_flag: "--version",
    detection_method: "which + version"
  },
  {
    name: "gemini",
    commands: ["gemini"],
    version_flag: "--version",
    detection_method: "which + version"
  },
  {
    name: "ollama",
    commands: ["ollama"],
    version_flag: "--version",
    list_models_cmd: "ollama list",
    detection_method: "which + version + model list"
  },
  {
    name: "opencode",
    commands: ["opencode"],
    version_flag: "--version",
    detection_method: "which + version"
  }
];

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const result = await $`which ${cmd}`.quiet();
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

async function getVersion(cmd: string, flag: string): Promise<string | undefined> {
  try {
    const result = await $`${cmd} ${flag}`.quiet();
    if (result.exitCode === 0) {
      // Extract version from output (usually first line)
      const output = result.stdout.toString().trim();
      // Try to extract version number
      const match = output.match(/(\d+\.\d+\.?\d*)/);
      return match ? match[1] : output.split('\n')[0];
    }
  } catch {
    // Version check failed, but command might still exist
  }
  return undefined;
}

async function getOllamaModels(): Promise<string[]> {
  try {
    const result = await $`ollama list`.quiet();
    if (result.exitCode === 0) {
      const lines = result.stdout.toString().trim().split('\n');
      // Skip header line, extract model names
      return lines.slice(1)
        .map(line => line.split(/\s+/)[0])
        .filter(name => name && name.length > 0);
    }
  } catch {
    // Failed to list models
  }
  return [];
}

async function detectProvider(config: typeof PROVIDERS_TO_DETECT[0]): Promise<DetectedProvider> {
  const detected: DetectedProvider = {
    name: config.name,
    cli_command: config.commands[0],
    available: false,
    detection_method: config.detection_method
  };

  // Check if command exists
  for (const cmd of config.commands) {
    if (await commandExists(cmd)) {
      detected.available = true;
      detected.cli_command = cmd;

      // Get version
      detected.version = await getVersion(cmd, config.version_flag);

      // Special handling for Ollama - get model list
      if (config.name === "ollama" && config.list_models_cmd) {
        detected.models = await getOllamaModels();
      }

      break;
    }
  }

  return detected;
}

async function detectAllProviders(): Promise<DetectionResult> {
  const providers: DetectedProvider[] = [];

  // Detect all providers in parallel
  const detectionPromises = PROVIDERS_TO_DETECT.map(config => detectProvider(config));
  const results = await Promise.all(detectionPromises);

  providers.push(...results);

  const found = providers.filter(p => p.available);
  const missing = providers.filter(p => !p.available);

  return {
    timestamp: new Date().toISOString(),
    providers,
    summary: {
      total_detected: found.length,
      ready_to_use: found.length > 0,
      providers_found: found.map(p => p.name),
      providers_missing: missing.map(p => p.name)
    }
  };
}

function formatOutput(result: DetectionResult, verbose: boolean): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    LLM PROVIDER DETECTION                      ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  for (const provider of result.providers) {
    const status = provider.available ? "✓" : "✗";
    const color = provider.available ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";

    lines.push(`${color}${status}${reset} ${provider.name.padEnd(12)} ${provider.available ? "DETECTED" : "NOT FOUND"}`);

    if (provider.available && verbose) {
      if (provider.version) {
        lines.push(`    Version: ${provider.version}`);
      }
      lines.push(`    Command: ${provider.cli_command}`);

      if (provider.models && provider.models.length > 0) {
        lines.push(`    Models (${provider.models.length}):`);
        for (const model of provider.models.slice(0, 10)) {
          lines.push(`      - ${model}`);
        }
        if (provider.models.length > 10) {
          lines.push(`      ... and ${provider.models.length - 10} more`);
        }
      }
    }
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`SUMMARY: ${result.summary.total_detected}/${result.providers.length} providers detected`);

  if (result.summary.ready_to_use) {
    lines.push("");
    lines.push("\x1b[32mReady to generate team.yaml with detected providers.\x1b[0m");
    lines.push("Run: bun run generate-team");
  } else {
    lines.push("");
    lines.push("\x1b[33mNo LLM providers detected.\x1b[0m");
    lines.push("");
    lines.push("Install at least one:");
    lines.push("  • Claude:   npm install -g @anthropic-ai/claude-code");
    lines.push("  • Codex:    npm install -g @openai/codex");
    lines.push("  • Gemini:   pip install google-generativeai");
    lines.push("  • Ollama:   brew install ollama && ollama pull deepseek-r1:14b");
    lines.push("  • OpenCode: go install github.com/sst/opencode@latest");
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join('\n');
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      json: { type: "boolean", short: "j" },
      verbose: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
DetectProviders - Auto-detect available LLM CLIs

USAGE:
  bun run DetectProviders.ts [options]

OPTIONS:
  -j, --json     Output as JSON
  -v, --verbose  Show detailed information
  -h, --help     Show this help

DETECTS:
  • Claude CLI (Anthropic)
  • Codex CLI (OpenAI)
  • Gemini CLI (Google)
  • Ollama (Local models)
  • OpenCode
`);
    return;
  }

  const result = await detectAllProviders();

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatOutput(result, values.verbose ?? false));
  }
}

main().catch(console.error);
