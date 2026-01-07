#!/usr/bin/env bun
/**
 * health.ts - Check secrets provider health
 *
 * Usage:
 *   bun run health.ts [options]
 *
 * Options:
 *   --adapter <adapter>   Adapter to check (default: from config)
 *   --json                Output as JSON
 *   --help                Show help
 */

import { parseArgs } from 'util';
import {
  getSecretsProvider,
  getSecretsProviderWithFallback,
  ProviderError
} from 'kai-secrets-core';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    adapter: { type: 'string' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false }
  },
  allowPositionals: true
});

if (values.help) {
  console.log(`
Usage: bun run health.ts [options]

Check secrets provider health.

Options:
  --adapter <adapter>     Adapter to check (keychain, infisical, mock)
  --json                  Output as JSON
  --help                  Show this help

Examples:
  bun run health.ts
  bun run health.ts --adapter keychain
  bun run health.ts --json
`);
  process.exit(0);
}

async function main() {
  try {
    const provider = values.adapter
      ? await getSecretsProvider({ adapter: values.adapter })
      : await getSecretsProviderWithFallback();

    const status = await provider.healthCheck();

    if (values.json) {
      console.log(JSON.stringify({
        provider: provider.name,
        version: provider.version,
        ...status
      }, null, 2));
    } else {
      const icon = status.healthy ? '✓' : '✗';
      const color = status.healthy ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';

      console.log(`${color}${icon} ${provider.name} v${provider.version}${reset}`);
      console.log(`  Status: ${status.message}`);

      if (status.latencyMs !== undefined) {
        console.log(`  Latency: ${status.latencyMs}ms`);
      }

      if (status.details) {
        console.log('  Details:');
        for (const [key, value] of Object.entries(status.details)) {
          console.log(`    ${key}: ${JSON.stringify(value)}`);
        }
      }
    }

    process.exit(status.healthy ? 0 : 1);
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error(`Error: Provider error - ${error.message}`);
      process.exit(3);
    }
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(4);
  }
}

main();
