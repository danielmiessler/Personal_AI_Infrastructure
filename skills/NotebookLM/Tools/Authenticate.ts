#!/usr/bin/env bun
/**
 * Authenticate - Manage NotebookLM authentication
 *
 * Usage:
 *   bun run Authenticate.ts <command>
 *
 * Commands:
 *   status    Check authentication status
 *   setup     Initial setup (browser visible for Google login)
 *   reauth    Re-authenticate (browser visible)
 *   clear     Clear authentication data
 */

import { $ } from "bun";

const skillDir = import.meta.dir.replace("/Tools", "");
const args = Bun.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log(`
Authenticate - Manage NotebookLM authentication

Usage:
  bun run Authenticate.ts <command>

Commands:
  status    Check current authentication status
  setup     Initial setup - opens browser for Google login
  reauth    Re-authenticate - opens browser for new login
  clear     Clear all authentication data

Note: The 'setup' and 'reauth' commands open a VISIBLE browser window.
      User must manually complete Google login in the browser.

Examples:
  bun run Authenticate.ts status
  bun run Authenticate.ts setup
  bun run Authenticate.ts reauth
  bun run Authenticate.ts clear
`);
  process.exit(args[0] === "--help" || args[0] === "-h" ? 0 : 1);
}

try {
  const result = await $`python3 ${skillDir}/Scripts/run.py auth_manager.py ${args}`.text();
  console.log(result);
} catch (error) {
  console.error("Error with authentication:", error);
  process.exit(1);
}
