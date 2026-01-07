#!/usr/bin/env bun
/**
 * get.ts - Retrieve a secret by key
 *
 * Usage:
 *   bun run get.ts <key> [options]
 *
 * Options:
 *   --env <environment>   Environment (default: from config)
 *   --project <project>   Project ID (default: from config)
 *   --adapter <adapter>   Adapter to use (default: from config)
 *   --json                Output as JSON
 *   --help                Show help
 */

import { parseArgs } from 'util';
import {
  getSecretsProvider,
  getSecretsProviderWithFallback,
  SecretNotFoundError,
  AuthenticationError,
  ProviderError
} from 'kai-secrets-core';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    env: { type: 'string' },
    project: { type: 'string' },
    adapter: { type: 'string' },
    json: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false }
  },
  allowPositionals: true
});

if (values.help || positionals.length === 0) {
  console.log(`
Usage: bun run get.ts <key> [options]

Retrieve a secret by its key.

Arguments:
  <key>                   The secret key to retrieve

Options:
  --env <environment>     Environment (e.g., development, production)
  --project <project>     Project ID (for Infisical)
  --adapter <adapter>     Adapter to use (keychain, infisical, mock)
  --json                  Output as JSON
  --help                  Show this help

Examples:
  bun run get.ts API_KEY
  bun run get.ts DATABASE_URL --env production
  bun run get.ts API_KEY --adapter keychain --json
`);
  process.exit(0);
}

const key = positionals[0];

async function main() {
  try {
    const provider = values.adapter
      ? await getSecretsProvider({ adapter: values.adapter })
      : await getSecretsProviderWithFallback();

    const secret = await provider.get(key, {
      environment: values.env,
      project: values.project
    });

    if (values.json) {
      console.log(JSON.stringify({
        key: secret.key,
        value: secret.value.reveal(),
        metadata: secret.metadata
      }, null, 2));
    } else {
      console.log(secret.value.reveal());
    }
  } catch (error) {
    if (error instanceof SecretNotFoundError) {
      console.error(`Error: Secret "${key}" not found`);
      process.exit(1);
    }
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
