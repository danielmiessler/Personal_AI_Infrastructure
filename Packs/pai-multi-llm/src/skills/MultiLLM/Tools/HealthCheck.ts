#!/usr/bin/env bun

/**
 * HealthCheck - Check availability of configured LLM providers
 *
 * Usage:
 *   bun run HealthCheck.ts
 *   bun run HealthCheck.ts --provider claude
 *   bun run HealthCheck.ts --json
 */

import { parseArgs } from "util";
import { $ } from "bun";
import { loadTeam } from "../lib/team";
import { noTeamError } from "../lib/errors";
import type { ProviderConfig, TeamConfig } from "../../../types/Provider";

interface HealthResult {
  provider: string;
  status: "healthy" | "degraded" | "unavailable";
  response_time_ms?: number;
  error?: string;
  details?: Record<string, any>;
}

const STATUS_DISPLAY = {
  healthy: { icon: "●", color: "\x1b[32m" },
  degraded: { icon: "◐", color: "\x1b[33m" },
  unavailable: { icon: "○", color: "\x1b[31m" },
} as const;

async function checkProvider(provider: ProviderConfig): Promise<HealthResult> {
  const result: HealthResult = { provider: provider.name, status: "unavailable" };
  const startTime = Date.now();

  try {
    const baseCmd = provider.cli.split(" ")[0];

    // Check if command exists
    const whichResult = await $`which ${baseCmd}`.quiet();
    if (whichResult.exitCode !== 0) {
      result.error = `Command '${baseCmd}' not found`;
      return result;
    }

    // Ollama: check server
    if (baseCmd === "ollama") {
      try {
        const listResult = await $`ollama list`.quiet();
        if (listResult.exitCode === 0) {
          result.status = "healthy";
          result.response_time_ms = Date.now() - startTime;
          const models = listResult.stdout.toString().trim().split("\n").slice(1);
          result.details = { models_available: models.length };
        } else {
          result.status = "degraded";
          result.error = "Server may not be running";
        }
      } catch {
        result.status = "degraded";
        result.error = "Could not connect to server";
      }
      return result;
    }

    // Other providers: check version
    try {
      const versionResult = await $`${baseCmd} --version`.quiet();
      if (versionResult.exitCode === 0) {
        result.status = "healthy";
        result.response_time_ms = Date.now() - startTime;
        result.details = { version: versionResult.stdout.toString().trim().split("\n")[0] };
      } else {
        result.status = "degraded";
        result.error = "Version check failed";
      }
    } catch {
      result.status = "degraded";
      result.error = "Health check failed";
    }
  } catch (error: any) {
    result.error = error.message;
  }

  return result;
}

async function checkAllProviders(team: TeamConfig, specificProvider?: string): Promise<HealthResult[]> {
  const providers = specificProvider
    ? team.providers.filter((p) => p.name === specificProvider)
    : team.providers;

  if (providers.length === 0 && specificProvider) {
    return [{ provider: specificProvider, status: "unavailable", error: "Not found in team.yaml" }];
  }

  return Promise.all(providers.map(checkProvider));
}

function formatResults(results: HealthResult[]): string {
  const reset = "\x1b[0m";
  const lines = [
    "═".repeat(60),
    "                    PROVIDER HEALTH CHECK",
    "═".repeat(60),
    "",
  ];

  for (const r of results) {
    const { icon, color } = STATUS_DISPLAY[r.status];
    lines.push(`${color}${icon}${reset} ${r.provider.padEnd(20)} ${color}${r.status.toUpperCase()}${reset}`);
    if (r.response_time_ms) lines.push(`    Response time: ${r.response_time_ms}ms`);
    if (r.error) lines.push(`    Error: ${r.error}`);
    if (r.details) {
      for (const [k, v] of Object.entries(r.details)) {
        lines.push(`    ${k}: ${v}`);
      }
    }
    lines.push("");
  }

  const healthy = results.filter((r) => r.status === "healthy").length;
  lines.push("─".repeat(60), `SUMMARY: ${healthy}/${results.length} providers healthy`, "═".repeat(60));

  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      provider: { type: "string", short: "p" },
      json: { type: "boolean", short: "j" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
HealthCheck - Check availability of LLM providers

USAGE:
  bun run HealthCheck.ts [options]

OPTIONS:
  -p, --provider <name>  Check specific provider
  -j, --json             Output as JSON
  -h, --help             Show this help
`);
    return;
  }

  const team = loadTeam();
  if (!team) noTeamError();

  const results = await checkAllProviders(team, values.provider);

  console.log(values.json ? JSON.stringify(results, null, 2) : formatResults(results));

  if (results.some((r) => r.status === "unavailable")) {
    process.exit(1);
  }
}

main().catch(console.error);
