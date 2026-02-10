#!/usr/bin/env bun

/**
 * Query - Unified interface to query any configured LLM provider
 *
 * Usage:
 *   bun run Query.ts -p "What is the meaning of life?"
 *   bun run Query.ts -p "Review this code" --provider codex
 *   bun run Query.ts -p "Creative ideas" --role creative_thinker
 */

import { parseArgs } from "util";
import { SessionManager } from "./SessionManager";
import { loadTeam, findProviderByName, findProviderByRole, getProviderNames } from "../lib/team";
import { noTeamError, noProviderError } from "../lib/errors";
import type { ProviderConfig, QueryOptions } from "../../../types/Provider";

function findProvider(options: QueryOptions): ProviderConfig | null {
  const team = loadTeam();
  if (!team) return null;

  if (options.provider) {
    return findProviderByName(team, options.provider) ?? null;
  }
  if (options.role) {
    return findProviderByRole(team, options.role) ?? null;
  }
  // Default to first available
  return team.providers.find((p) => p.available) ?? team.providers[0] ?? null;
}

async function query(prompt: string, options: QueryOptions = {}): Promise<void> {
  const team = loadTeam();
  if (!team) noTeamError();

  const provider = findProvider(options);
  if (!provider) {
    noProviderError(options, getProviderNames(team));
  }

  if (!provider.available) {
    console.error(`Warning: Provider '${provider.name}' is not available.`);
  }

  const sm = new SessionManager();

  try {
    const result = await sm.query(provider, prompt, {
      continue_session: options.continue_session,
      session_id: options.session_id,
    });

    if (options.output_format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result.response);
      if (result.session_id) {
        console.error(`\n[Session: ${result.session_id} | ${result.duration_ms}ms]`);
      }
    }
  } catch (error: any) {
    console.error(`Error querying ${provider.name}: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      prompt: { type: "string", short: "p" },
      provider: { type: "string", short: "P" },
      role: { type: "string", short: "r" },
      continue: { type: "boolean", short: "c" },
      session: { type: "string", short: "s" },
      json: { type: "boolean", short: "j" },
      list: { type: "boolean", short: "l" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
Query - Unified LLM query interface

USAGE:
  bun run Query.ts -p "prompt" [options]

OPTIONS:
  -p, --prompt <text>     The prompt to send
  -P, --provider <name>   Query specific provider
  -r, --role <role>       Query by role
  -c, --continue          Continue last session
  -s, --session <id>      Resume specific session
  -j, --json              Output as JSON
  -l, --list              List available providers
  -h, --help              Show this help
`);
    return;
  }

  if (values.list) {
    const team = loadTeam();
    if (!team) {
      console.log("No team.yaml found. Run installer first.");
      return;
    }
    console.log("Available Providers:\n" + "─".repeat(50));
    for (const p of team.providers) {
      const status = p.available ? "✓" : "✗";
      console.log(`${status} ${p.name.padEnd(15)} role: ${p.role}`);
      if (p.use_for?.length) {
        console.log(`   Use for: ${p.use_for.join(", ")}`);
      }
    }
    return;
  }

  if (!values.prompt) {
    console.error("Error: --prompt is required");
    process.exit(1);
  }

  await query(values.prompt, {
    provider: values.provider,
    role: values.role,
    continue_session: values.continue,
    session_id: values.session,
    output_format: values.json ? "json" : "text",
  });
}

main().catch(console.error);
