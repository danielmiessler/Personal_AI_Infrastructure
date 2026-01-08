#!/usr/bin/env bun
/**
 * Get label values from the configured observability provider
 */

import { getObservabilityProvider } from 'kai-observability-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    label?: string;
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
    } else if (!arg.startsWith('-')) {
      options.label = arg;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  if (!options.label) {
    console.error('Usage: bun run Tools/labels.ts <label-name> [--match <matcher>] [--limit <num>]');
    process.exit(1);
  }

  try {
    const provider = await getObservabilityProvider();
    const values = await provider.getLabelValues(options.label, {
      match: options.match,
      limit: options.limit,
    });

    console.log(`Values for label "${options.label}":\n`);
    for (const value of values) {
      console.log(value);
    }
    console.log(`\nTotal: ${values.length} value(s)`);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
