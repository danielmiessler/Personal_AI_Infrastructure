#!/usr/bin/env bun
/**
 * list.ts - List available secret keys
 *
 * Usage:
 *   bun run list.ts [options]
 *
 * Options:
 *   --pattern <pattern>   Glob pattern to filter (e.g., "API_*")
 *   --limit <n>           Maximum number of results
 *   --offset <n>          Skip first n results
 *   --env <environment>   Environment (default: from config)
 *   --adapter <adapter>   Adapter to use (default: from config)
 *   --json                Output as JSON
 *   --help                Show help
 */

import { parseArgs } from 'util';
import {
  getSecretsProvider,
  getSecretsProviderWithFallback,
  AuthenticationError,
  ProviderError
} from 'mai-secrets-core';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    pattern: { type: 'string' },
    limit: { type: 'string' },
    offset: { type: 'string' },
    env: { type: 'string' },
    adapter: { type: 'string' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false }
  },
  allowPositionals: true
});

if (values.help) {
  console.log(`
Usage: bun run list.ts [options]

List available secret keys.

Options:
  --pattern <pattern>     Glob pattern to filter (e.g., "API_*")
  --limit <n>             Maximum number of results
  --offset <n>            Skip first n results
  --env <environment>     Environment (e.g., development, production)
  --adapter <adapter>     Adapter to use (keychain, infisical, mock)
  --json                  Output as JSON
  --help                  Show this help

Examples:
  bun run list.ts
  bun run list.ts --pattern "API_*"
  bun run list.ts --limit 10 --adapter keychain
`);
  process.exit(0);
}

async function main() {
  try {
    const provider = values.adapter
      ? await getSecretsProvider({ adapter: values.adapter })
      : await getSecretsProviderWithFallback();

    const keys = await provider.list(values.pattern, {
      environment: values.env,
      limit: values.limit ? parseInt(values.limit, 10) : undefined,
      offset: values.offset ? parseInt(values.offset, 10) : undefined
    });

    if (values.json) {
      console.log(JSON.stringify({ keys, count: keys.length }, null, 2));
    } else {
      if (keys.length === 0) {
        console.log('No secrets found');
      } else {
        console.log(`Found ${keys.length} secret(s):\n`);
        for (const key of keys) {
          console.log(`  - ${key}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error(`Error: Authentication failed - ${error.message}`);
      process.exit(2);
    }
    if (error instanceof ProviderError) {
      console.error(`Error: Provider error - ${error.message}`);
      process.exit(3);
    }
    console.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(4);
  }
}

main();
