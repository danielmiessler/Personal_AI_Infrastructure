#!/usr/bin/env bun
/**
 * List metric names from the configured observability provider
 */

import { getObservabilityProvider } from 'kai-observability-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    match?: string[];
    limit?: number;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--match') {
      options.match = options.match || [];
      options.match.push(args[++i]);
    } else if (arg === '--limit') {
      options.limit = parseInt(args[++i], 10);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  try {
    const provider = await getObservabilityProvider();
    const names = await provider.getMetricNames({
      match: options.match,
      limit: options.limit,
    });

    console.log(`Found ${names.length} metric(s):\n`);
    for (const name of names) {
      console.log(name);
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
