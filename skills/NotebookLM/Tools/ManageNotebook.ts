#!/usr/bin/env bun
/**
 * ManageNotebook - Manage NotebookLM library
 *
 * Usage:
 *   bun run ManageNotebook.ts <command> [options]
 *
 * Commands:
 *   list                 List all notebooks in library
 *   add                  Add a notebook to library
 *   search               Search notebooks by query
 *   activate             Set active notebook
 *   remove               Remove notebook from library
 *   stats                Show library statistics
 */

import { $ } from "bun";

const skillDir = import.meta.dir.replace("/Tools", "");
const args = Bun.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
ManageNotebook - Manage NotebookLM library

Usage:
  bun run ManageNotebook.ts <command> [options]

Commands:
  list                     List all notebooks in library
  add                      Add a notebook to library
  search --query QUERY     Search notebooks by keyword
  activate --id ID         Set active notebook
  remove --id ID           Remove notebook from library
  stats                    Show library statistics

Add Options:
  --url URL                NotebookLM URL (required)
  --name NAME              Descriptive name (required)
  --description DESC       What the notebook contains (required)
  --topics TOPICS          Comma-separated topics (required)

Examples:
  bun run ManageNotebook.ts list
  bun run ManageNotebook.ts add --url "https://..." --name "React Docs" --description "React documentation" --topics "react,hooks,components"
  bun run ManageNotebook.ts search --query "react"
  bun run ManageNotebook.ts activate --id notebook-123
  bun run ManageNotebook.ts remove --id notebook-123
`);
  process.exit(args[0] === "--help" || args[0] === "-h" ? 0 : 1);
}

try {
  const result = await $`python3 ${skillDir}/Scripts/run.py notebook_manager.py ${args}`.text();
  console.log(result);
} catch (error) {
  console.error("Error managing notebooks:", error);
  process.exit(1);
}
