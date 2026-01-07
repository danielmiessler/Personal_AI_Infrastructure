#!/usr/bin/env bun
/**
 * Issues Health Check CLI Tool
 *
 * Usage:
 *   bun run health.ts
 */

import { getIssuesProvider } from 'kai-issues-core';

async function main() {
  try {
    const provider = await getIssuesProvider();
    const health = await provider.healthCheck();

    console.log(JSON.stringify(health, null, 2));

    if (!health.healthy) {
      process.exit(1);
    }
  } catch (error) {
    console.log(JSON.stringify({
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    }, null, 2));
    process.exit(1);
  }
}

main();
