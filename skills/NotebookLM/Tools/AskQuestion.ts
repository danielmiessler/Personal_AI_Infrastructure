#!/usr/bin/env bun
/**
 * AskQuestion - Query NotebookLM notebooks
 *
 * Usage:
 *   bun run AskQuestion.ts --question "Your question" [--notebook-id ID] [--notebook-url URL] [--show-browser]
 */

import { $ } from "bun";
import { parseArgs } from "util";

const skillDir = import.meta.dir.replace("/Tools", "");

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    question: { type: "string", short: "q" },
    "notebook-id": { type: "string" },
    "notebook-url": { type: "string" },
    "show-browser": { type: "boolean", default: false },
    help: { type: "boolean", short: "h" },
  },
  allowPositionals: true,
});

if (values.help || !values.question) {
  console.log(`
AskQuestion - Query NotebookLM notebooks

Usage:
  bun run AskQuestion.ts --question "Your question" [options]

Options:
  -q, --question       The question to ask (required)
  --notebook-id        ID of notebook to query
  --notebook-url       URL of notebook to query directly
  --show-browser       Show browser window for debugging
  -h, --help           Show this help message

Examples:
  bun run AskQuestion.ts --question "Explain React hooks"
  bun run AskQuestion.ts --question "What is covered?" --notebook-url "https://..."
  bun run AskQuestion.ts --question "Debug issue" --show-browser
`);
  process.exit(values.help ? 0 : 1);
}

const args: string[] = ["--question", values.question];

if (values["notebook-id"]) {
  args.push("--notebook-id", values["notebook-id"]);
}
if (values["notebook-url"]) {
  args.push("--notebook-url", values["notebook-url"]);
}
if (values["show-browser"]) {
  args.push("--show-browser");
}

try {
  const result = await $`python3 ${skillDir}/Scripts/run.py ask_question.py ${args}`.text();
  console.log(result);
} catch (error) {
  console.error("Error querying NotebookLM:", error);
  process.exit(1);
}
