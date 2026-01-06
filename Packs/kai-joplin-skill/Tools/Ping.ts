#!/usr/bin/env bun
/**
 * Joplin Ping Tool
 * Test connection to Joplin server
 *
 * Usage: bun run Ping.ts
 *
 * Returns:
 *   { "status": "ok", "message": "Joplin is running and accessible" }
 *   { "error": "..." } on failure
 */

import { joplinApiRaw, outputJson, outputError } from './Client.ts';

async function main() {
  try {
    // The /ping endpoint returns "JoplinClipperServer" as plain text
    const response = await joplinApiRaw('/ping');

    outputJson({
      status: 'ok',
      message: 'Joplin is running and accessible',
      server: response.trim() || 'JoplinClipperServer',
    });
  } catch (error) {
    outputError(error);
  }
}

main();
