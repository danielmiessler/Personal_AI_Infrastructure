#!/usr/bin/env bun
/**
 * PAI Uninstaller v3.0 — Main Entry Point
 * CLI-only uninstaller. Delegates all logic to the engine + CLI frontend.
 *
 * Usage:
 *   bun run main.ts           — interactive (default)
 *   bun run main.ts --force   — skip all confirmations
 */

const args = process.argv.slice(2);
const force = args.includes("--force");

const { runCLI } = await import("./cli/index");
await runCLI({ force });
