#!/usr/bin/env bun

/**
 * Query - Unified interface to query any configured LLM provider
 *
 * Loads team.yaml, finds the appropriate provider, and queries
 * with automatic session management.
 *
 * Usage:
 *   bun run Query.ts -p "What is the meaning of life?"
 *   bun run Query.ts -p "Review this code" --provider codex
 *   bun run Query.ts -p "Creative ideas" --role creative_thinker
 *   bun run Query.ts -p "Continue..." --continue
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { existsSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { SessionManager } from "./SessionManager";
import type { ProviderConfig, TeamConfig, QueryOptions } from "../../../types/Provider";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const TEAM_FILE = `${PAI_DIR}/config/team.yaml`;

function loadTeam(): TeamConfig | null {
  if (!existsSync(TEAM_FILE)) {
    return null;
  }
  const content = readFileSync(TEAM_FILE, "utf-8");
  return parseYaml(content) as TeamConfig;
}

function findProvider(
  team: TeamConfig,
  options: QueryOptions
): ProviderConfig | null {
  // Find by specific provider name
  if (options.provider) {
    return team.providers.find(p => p.name === options.provider) || null;
  }

  // Find by role
  if (options.role) {
    return team.providers.find(p => p.role === options.role) || null;
  }

  // Find first available provider
  return team.providers.find(p => p.available) || team.providers[0] || null;
}

async function query(
  prompt: string,
  options: QueryOptions = {}
): Promise<void> {
  const team = loadTeam();

  if (!team) {
    console.error("Error: No team.yaml found.");
    console.error(`Expected at: ${TEAM_FILE}`);
    console.error("");
    console.error("Run the installer first:");
    console.error("  bun run install-pack");
    process.exit(1);
  }

  const provider = findProvider(team, options);

  if (!provider) {
    console.error("Error: No matching provider found.");
    if (options.provider) {
      console.error(`Provider '${options.provider}' not in team.yaml`);
    }
    if (options.role) {
      console.error(`Role '${options.role}' not assigned to any provider`);
    }
    console.error("");
    console.error("Available providers:");
    for (const p of team.providers) {
      console.error(`  - ${p.name} (role: ${p.role})`);
    }
    process.exit(1);
  }

  if (!provider.available) {
    console.error(`Warning: Provider '${provider.name}' is not available.`);
    console.error("Run 'bun run detect' to check provider status.");
  }

  const sm = new SessionManager();

  try {
    const result = await sm.query(provider, prompt, {
      continue_session: options.continue_session,
      session_id: options.session_id
    });

    if (options.output_format === "json") {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Clean output
      console.log(result.response);

      // Show session info in stderr (doesn't pollute piped output)
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
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
Query - Unified LLM query interface

USAGE:
  bun run Query.ts -p "prompt" [options]

OPTIONS:
  -p, --prompt <text>     The prompt to send
  -P, --provider <name>   Query specific provider
  -r, --role <role>       Query by role (e.g., creative_thinker)
  -c, --continue          Continue last session with provider
  -s, --session <id>      Resume specific session
  -j, --json              Output as JSON
  -l, --list              List available providers
  -h, --help              Show this help

EXAMPLES:
  bun run Query.ts -p "Explain quantum computing"
  bun run Query.ts -p "Review this code" --provider codex
  bun run Query.ts -p "Creative story ideas" --role creative_thinker
  bun run Query.ts -p "Continue the analysis" --continue --provider claude
`);
    return;
  }

  if (values.list) {
    const team = loadTeam();
    if (!team) {
      console.log("No team.yaml found. Run installer first.");
      return;
    }
    console.log("Available Providers:");
    console.log("─".repeat(50));
    for (const p of team.providers) {
      const status = p.available ? "✓" : "✗";
      console.log(`${status} ${p.name.padEnd(15)} role: ${p.role}`);
      if (p.use_for && p.use_for.length > 0) {
        console.log(`   Use for: ${p.use_for.join(", ")}`);
      }
    }
    return;
  }

  if (!values.prompt) {
    console.error("Error: --prompt is required");
    console.error("Run with --help for usage");
    process.exit(1);
  }

  await query(values.prompt, {
    provider: values.provider,
    role: values.role,
    continue_session: values.continue,
    session_id: values.session,
    output_format: values.json ? "json" : "text"
  });
}

main().catch(console.error);
