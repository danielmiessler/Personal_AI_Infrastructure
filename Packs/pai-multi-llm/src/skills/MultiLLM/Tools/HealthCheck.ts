#!/usr/bin/env bun

/**
 * HealthCheck - Check availability of configured LLM providers
 *
 * Verifies that providers in team.yaml are actually reachable
 * and working. Useful for debugging and status monitoring.
 *
 * Usage:
 *   bun run HealthCheck.ts
 *   bun run HealthCheck.ts --provider claude
 *   bun run HealthCheck.ts --json
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { existsSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { $ } from "bun";
import type { ProviderConfig, TeamConfig } from "../../../types/Provider";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const TEAM_FILE = `${PAI_DIR}/config/team.yaml`;

interface HealthResult {
  provider: string;
  status: "healthy" | "degraded" | "unavailable";
  response_time_ms?: number;
  error?: string;
  details?: Record<string, any>;
}

function loadTeam(): TeamConfig | null {
  if (!existsSync(TEAM_FILE)) {
    return null;
  }
  const content = readFileSync(TEAM_FILE, "utf-8");
  return parseYaml(content) as TeamConfig;
}

async function checkProvider(provider: ProviderConfig): Promise<HealthResult> {
  const result: HealthResult = {
    provider: provider.name,
    status: "unavailable"
  };

  const startTime = Date.now();

  try {
    // Extract base command
    const baseCmd = provider.cli.split(" ")[0];

    // Check if command exists
    const whichResult = await $`which ${baseCmd}`.quiet();
    if (whichResult.exitCode !== 0) {
      result.error = `Command '${baseCmd}' not found in PATH`;
      return result;
    }

    // For Ollama, check if server is running
    if (baseCmd === "ollama") {
      try {
        const listResult = await $`ollama list`.quiet();
        if (listResult.exitCode === 0) {
          result.status = "healthy";
          result.response_time_ms = Date.now() - startTime;
          const models = listResult.stdout
            .toString()
            .trim()
            .split("\n")
            .slice(1);
          result.details = { models_available: models.length };
        } else {
          result.status = "degraded";
          result.error = "Ollama installed but server may not be running";
        }
      } catch {
        result.status = "degraded";
        result.error = "Could not connect to Ollama server";
      }
      return result;
    }

    // For other providers, just check version
    try {
      const versionResult = await $`${baseCmd} --version`.quiet();
      if (versionResult.exitCode === 0) {
        result.status = "healthy";
        result.response_time_ms = Date.now() - startTime;
        result.details = {
          version: versionResult.stdout.toString().trim().split("\n")[0]
        };
      } else {
        result.status = "degraded";
        result.error = "Command exists but --version check failed";
      }
    } catch {
      result.status = "degraded";
      result.error = "Command exists but health check failed";
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function checkAllProviders(
  team: TeamConfig,
  specificProvider?: string
): Promise<HealthResult[]> {
  const results: HealthResult[] = [];

  const providersToCheck = specificProvider
    ? team.providers.filter((p) => p.name === specificProvider)
    : team.providers;

  if (providersToCheck.length === 0 && specificProvider) {
    return [
      {
        provider: specificProvider,
        status: "unavailable",
        error: `Provider '${specificProvider}' not found in team.yaml`
      }
    ];
  }

  // Check all providers in parallel
  const checks = providersToCheck.map((p) => checkProvider(p));
  results.push(...(await Promise.all(checks)));

  return results;
}

function formatResults(results: HealthResult[]): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    PROVIDER HEALTH CHECK                       ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  for (const result of results) {
    let statusIcon: string;
    let statusColor: string;

    switch (result.status) {
      case "healthy":
        statusIcon = "●";
        statusColor = "\x1b[32m"; // Green
        break;
      case "degraded":
        statusIcon = "◐";
        statusColor = "\x1b[33m"; // Yellow
        break;
      default:
        statusIcon = "○";
        statusColor = "\x1b[31m"; // Red
    }

    const reset = "\x1b[0m";
    lines.push(
      `${statusColor}${statusIcon}${reset} ${result.provider.padEnd(20)} ${statusColor}${result.status.toUpperCase()}${reset}`
    );

    if (result.response_time_ms) {
      lines.push(`    Response time: ${result.response_time_ms}ms`);
    }

    if (result.error) {
      lines.push(`    Error: ${result.error}`);
    }

    if (result.details) {
      for (const [key, value] of Object.entries(result.details)) {
        lines.push(`    ${key}: ${value}`);
      }
    }

    lines.push("");
  }

  const healthy = results.filter((r) => r.status === "healthy").length;
  const total = results.length;

  lines.push("───────────────────────────────────────────────────────────────");
  lines.push(`SUMMARY: ${healthy}/${total} providers healthy`);
  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      provider: { type: "string", short: "p" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
HealthCheck - Check availability of LLM providers

USAGE:
  bun run HealthCheck.ts [options]

OPTIONS:
  -p, --provider <name>  Check specific provider only
  -j, --json             Output as JSON
  -h, --help             Show this help

EXAMPLES:
  bun run HealthCheck.ts
  bun run HealthCheck.ts --provider claude
  bun run HealthCheck.ts --json
`);
    return;
  }

  const team = loadTeam();

  if (!team) {
    console.error("Error: No team.yaml found.");
    console.error(`Expected at: ${TEAM_FILE}`);
    console.error("");
    console.error("Run the installer first:");
    console.error("  bun run generate-team");
    process.exit(1);
  }

  const results = await checkAllProviders(team, values.provider);

  if (values.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(formatResults(results));
  }

  // Exit with error if any providers are unavailable
  const hasUnavailable = results.some((r) => r.status === "unavailable");
  if (hasUnavailable) {
    process.exit(1);
  }
}

main().catch(console.error);
