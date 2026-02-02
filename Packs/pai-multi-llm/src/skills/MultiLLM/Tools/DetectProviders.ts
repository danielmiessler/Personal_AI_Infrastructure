#!/usr/bin/env bun

/**
 * DetectProviders - Auto-detect available LLM CLIs
 *
 * Usage:
 *   bun run DetectProviders.ts
 *   bun run DetectProviders.ts --json
 *   bun run DetectProviders.ts --verbose
 */

import { parseArgs } from "util";
import { $ } from "bun";
import { PROVIDERS_TO_DETECT } from "../lib/config";
import type { DetectedProvider, DetectionResult } from "../../../types/Provider";

async function commandExists(cmd: string): Promise<boolean> {
  try {
    return (await $`which ${cmd}`.quiet()).exitCode === 0;
  } catch {
    return false;
  }
}

async function getVersion(cmd: string): Promise<string | undefined> {
  try {
    const result = await $`${cmd} --version`.quiet();
    if (result.exitCode === 0) {
      const output = result.stdout.toString().trim();
      const match = output.match(/(\d+\.\d+\.?\d*)/);
      return match ? match[1] : output.split("\n")[0];
    }
  } catch {}
  return undefined;
}

async function getOllamaModels(): Promise<string[]> {
  try {
    const result = await $`ollama list`.quiet();
    if (result.exitCode === 0) {
      return result.stdout
        .toString()
        .trim()
        .split("\n")
        .slice(1)
        .map((line) => line.split(/\s+/)[0])
        .filter(Boolean);
    }
  } catch {}
  return [];
}

async function detectProvider(name: string): Promise<DetectedProvider> {
  const detected: DetectedProvider = {
    name,
    cli_command: name,
    available: false,
    detection_method: "which",
  };

  if (await commandExists(name)) {
    detected.available = true;
    detected.version = await getVersion(name);

    if (name === "ollama") {
      detected.models = await getOllamaModels();
    }
  }

  return detected;
}

async function detectAllProviders(): Promise<DetectionResult> {
  const providers = await Promise.all(PROVIDERS_TO_DETECT.map(detectProvider));
  const found = providers.filter((p) => p.available);

  return {
    timestamp: new Date().toISOString(),
    providers,
    summary: {
      total_detected: found.length,
      ready_to_use: found.length > 0,
      providers_found: found.map((p) => p.name),
      providers_missing: providers.filter((p) => !p.available).map((p) => p.name),
    },
  };
}

function formatOutput(result: DetectionResult, verbose: boolean): string {
  const reset = "\x1b[0m";
  const lines = ["═".repeat(60), "                    LLM PROVIDER DETECTION", "═".repeat(60), ""];

  for (const p of result.providers) {
    const color = p.available ? "\x1b[32m" : "\x1b[31m";
    const status = p.available ? "✓" : "✗";
    lines.push(`${color}${status}${reset} ${p.name.padEnd(12)} ${p.available ? "DETECTED" : "NOT FOUND"}`);

    if (p.available && verbose) {
      if (p.version) lines.push(`    Version: ${p.version}`);
      lines.push(`    Command: ${p.cli_command}`);
      if (p.models?.length) {
        lines.push(`    Models (${p.models.length}):`);
        for (const m of p.models.slice(0, 10)) lines.push(`      - ${m}`);
        if (p.models.length > 10) lines.push(`      ... and ${p.models.length - 10} more`);
      }
    }
  }

  lines.push("", "─".repeat(60));
  lines.push(`SUMMARY: ${result.summary.total_detected}/${result.providers.length} providers detected`);

  if (result.summary.ready_to_use) {
    lines.push("", "\x1b[32mReady to generate team.yaml.\x1b[0m", "Run: bun run GenerateTeam.ts");
  } else {
    lines.push("", "\x1b[33mNo LLM providers detected.\x1b[0m", "");
    lines.push("Install one: ollama, claude, codex, gemini, or opencode");
  }

  lines.push("═".repeat(60));
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      json: { type: "boolean", short: "j" },
      verbose: { type: "boolean", short: "v" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
DetectProviders - Auto-detect available LLM CLIs

USAGE:
  bun run DetectProviders.ts [options]

OPTIONS:
  -j, --json     Output as JSON
  -v, --verbose  Show details
  -h, --help     Show this help

DETECTS:
  claude, codex, gemini, ollama, opencode
`);
    return;
  }

  const result = await detectAllProviders();
  console.log(values.json ? JSON.stringify(result, null, 2) : formatOutput(result, values.verbose ?? false));
}

main().catch(console.error);

export { detectAllProviders };
