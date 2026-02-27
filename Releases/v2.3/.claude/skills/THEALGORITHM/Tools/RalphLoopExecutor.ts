#!/usr/bin/env bun

/**
 * RalphLoopExecutor - Spawn Ralph Loops for ISC rows
 *
 * Interfaces with the Ralph Wiggum plugin to execute ISC rows that require
 * persistent iteration until success criteria are met.
 *
 * Usage:
 *   bun run RalphLoopExecutor.ts --prompt "Fix the auth bug" --completion-promise "All tests pass"
 *   bun run RalphLoopExecutor.ts --isc-row 3 --max-iterations 15
 *   bun run RalphLoopExecutor.ts --status
 *   bun run RalphLoopExecutor.ts --cancel
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";

interface RalphLoopConfig {
  prompt: string;
  completionPromise: string;
  maxIterations: number;
  iscRowId?: number;
}

interface RalphLoopState {
  active: boolean;
  iteration: number;
  max_iterations: number;
  completion_promise: string;
  started_at: string;
  isc_row_id?: number;
  prompt: string;
}

const STATE_FILE = ".claude/ralph-loop.local.md";

function getStatePath(): string {
  // Find project root by looking for .claude directory
  let dir = process.cwd();
  while (dir !== "/") {
    if (existsSync(join(dir, ".claude"))) {
      return join(dir, STATE_FILE);
    }
    dir = dirname(dir);
  }
  // Default to current directory
  return STATE_FILE;
}

function parseState(content: string): RalphLoopState | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];
  const prompt = frontmatterMatch[2].trim();

  // Parse YAML frontmatter manually (simple parsing)
  const getValue = (key: string): string => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    if (!match) return "";
    let value = match[1].trim();
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  };

  return {
    active: getValue("active") === "true",
    iteration: parseInt(getValue("iteration")) || 1,
    max_iterations: parseInt(getValue("max_iterations")) || 0,
    completion_promise: getValue("completion_promise"),
    started_at: getValue("started_at"),
    isc_row_id: parseInt(getValue("isc_row_id")) || undefined,
    prompt,
  };
}

function createStateFile(config: RalphLoopConfig): void {
  const statePath = getStatePath();
  const stateDir = dirname(statePath);

  // Ensure .claude directory exists
  if (!existsSync(stateDir)) {
    mkdirSync(stateDir, { recursive: true });
  }

  // Format completion promise for YAML
  const completionPromiseYaml = config.completionPromise && config.completionPromise !== "null"
    ? `"${config.completionPromise}"`
    : "null";

  // Build state file content
  const content = `---
active: true
iteration: 1
max_iterations: ${config.maxIterations}
completion_promise: ${completionPromiseYaml}
started_at: "${new Date().toISOString()}"
${config.iscRowId !== undefined ? `isc_row_id: ${config.iscRowId}` : ""}
---

${config.prompt}
`;

  writeFileSync(statePath, content);
}

function getStatus(): RalphLoopState | null {
  const statePath = getStatePath();
  if (!existsSync(statePath)) {
    return null;
  }

  const content = readFileSync(statePath, "utf-8");
  return parseState(content);
}

function cancelLoop(): boolean {
  const statePath = getStatePath();
  if (!existsSync(statePath)) {
    return false;
  }

  unlinkSync(statePath);
  return true;
}

function formatStatus(state: RalphLoopState | null): string {
  if (!state) {
    return "No active Ralph loop.";
  }

  const lines = [
    "🔄 RALPH LOOP STATUS",
    "═══════════════════════════════════════",
    "",
    `Active: ${state.active}`,
    `Iteration: ${state.iteration}`,
    `Max iterations: ${state.max_iterations === 0 ? "unlimited" : state.max_iterations}`,
    `Completion promise: ${state.completion_promise === "null" ? "none" : state.completion_promise}`,
    `Started: ${state.started_at}`,
  ];

  if (state.isc_row_id !== undefined) {
    lines.push(`ISC Row: #${state.isc_row_id}`);
  }

  lines.push("", "Prompt:", "───────────────────────────────────────", state.prompt);

  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      prompt: { type: "string", short: "p" },
      "completion-promise": { type: "string", short: "c" },
      "max-iterations": { type: "string", short: "m", default: "10" },
      "isc-row": { type: "string", short: "r" },
      status: { type: "boolean", short: "s" },
      cancel: { type: "boolean" },
      output: { type: "string", short: "o", default: "text" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
RalphLoopExecutor - Spawn Ralph Loops for ISC rows

USAGE:
  bun run RalphLoopExecutor.ts --prompt "Fix the bug" --completion-promise "All tests pass"
  bun run RalphLoopExecutor.ts --status
  bun run RalphLoopExecutor.ts --cancel

OPTIONS:
  -p, --prompt <text>              Task prompt to iterate on
  -c, --completion-promise <text>  Success criteria (required for meaningful loops)
  -m, --max-iterations <n>         Max iterations (default: 10, 0 = unlimited)
  -r, --isc-row <n>                ISC row ID (for tracking)
  -s, --status                     Show current loop status
  --cancel                         Cancel active loop
  -o, --output <fmt>               Output format: text (default), json
  -h, --help                       Show this help

INTEGRATION WITH THEALGORITHM:
  When an ISC row is assigned execution.ralph_loop capability, this tool:
  1. Creates the Ralph loop state file
  2. The existing stop hook handles iteration
  3. Loop continues until completion promise detected or max iterations

EXAMPLES:
  # Start a loop for fixing tests
  bun run RalphLoopExecutor.ts -p "Fix failing tests" -c "All tests pass" -m 15

  # Start a loop for ISC row #3
  bun run RalphLoopExecutor.ts -p "Implement auth feature" -c "Feature complete" -r 3

  # Check status
  bun run RalphLoopExecutor.ts --status

  # Cancel current loop
  bun run RalphLoopExecutor.ts --cancel
`);
    return;
  }

  // Status command
  if (values.status) {
    const state = getStatus();
    if (values.output === "json") {
      console.log(JSON.stringify(state, null, 2));
    } else {
      console.log(formatStatus(state));
    }
    return;
  }

  // Cancel command
  if (values.cancel) {
    const success = cancelLoop();
    if (values.output === "json") {
      console.log(JSON.stringify({ cancelled: success }));
    } else {
      console.log(success ? "✅ Ralph loop cancelled." : "No active Ralph loop to cancel.");
    }
    return;
  }

  // Start a new loop
  if (!values.prompt) {
    console.error("Error: --prompt is required to start a loop");
    console.error("Use --help for usage information");
    process.exit(1);
  }

  // Check if loop already active
  const existingState = getStatus();
  if (existingState?.active) {
    console.error("⚠️  Ralph loop already active!");
    console.error(`   Iteration: ${existingState.iteration}`);
    console.error(`   Prompt: ${existingState.prompt.substring(0, 50)}...`);
    console.error("");
    console.error("Use --cancel to stop the current loop first, or --status to check status.");
    process.exit(1);
  }

  const config: RalphLoopConfig = {
    prompt: values.prompt,
    completionPromise: values["completion-promise"] || "DONE",
    maxIterations: parseInt(values["max-iterations"] || "10"),
    iscRowId: values["isc-row"] ? parseInt(values["isc-row"]) : undefined,
  };

  // Create the state file
  createStateFile(config);

  const result = {
    success: true,
    state_file: getStatePath(),
    config,
    message: `Ralph loop activated. Will iterate until "${config.completionPromise}" or ${config.maxIterations} iterations.`,
  };

  if (values.output === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`
🔄 Ralph Loop Activated for THEALGORITHM
═══════════════════════════════════════════════════════════

Prompt: ${config.prompt}
Completion Promise: ${config.completionPromise}
Max Iterations: ${config.maxIterations === 0 ? "unlimited" : config.maxIterations}
${config.iscRowId !== undefined ? `ISC Row: #${config.iscRowId}` : ""}

The stop hook is now active. When Claude tries to exit, the SAME PROMPT
will be fed back for the next iteration until:
  • <promise>${config.completionPromise}</promise> is output (ONLY when TRUE!)
  • Max iterations (${config.maxIterations}) reached

To monitor: bun run RalphLoopExecutor.ts --status
To cancel: bun run RalphLoopExecutor.ts --cancel

═══════════════════════════════════════════════════════════

${config.prompt}
`);
  }
}

main().catch(console.error);

// Export for programmatic use
export {
  createStateFile,
  getStatus,
  cancelLoop,
  parseState,
  type RalphLoopConfig,
  type RalphLoopState,
};
