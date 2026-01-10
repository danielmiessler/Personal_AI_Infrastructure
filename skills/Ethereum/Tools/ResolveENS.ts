#!/usr/bin/env bun
/**
 * ResolveENS - ENS name resolution tool
 *
 * Usage:
 *   bun run ResolveENS.ts --name vitalik.eth
 *   bun run ResolveENS.ts --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
 *   bun run ResolveENS.ts --name vitalik.eth --records
 *   bun run ResolveENS.ts --name vitalik.eth --json
 */

import { parseArgs } from 'util';
import { normalize } from 'viem/ens';
import { executeWithFallback, type PublicClient } from './lib/rpc';

interface ResolveOptions {
  name?: string;
  address?: string;
  records: boolean;
  json: boolean;
}

function parseArguments(): ResolveOptions {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      name: { type: 'string', short: 'n' },
      address: { type: 'string', short: 'a' },
      records: { type: 'boolean', short: 'r', default: false },
      json: { type: 'boolean', short: 'j', default: false },
    },
  });

  return {
    name: values.name,
    address: values.address,
    records: values.records ?? false,
    json: values.json ?? false,
  };
}

async function resolveName(client: PublicClient, name: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name);
    const address = await client.getEnsAddress({ name: normalizedName });
    return address;
  } catch (error) {
    console.error(`Error resolving ${name}:`, (error as Error).message);
    return null;
  }
}

async function reverseResolve(client: PublicClient, address: `0x${string}`): Promise<string | null> {
  try {
    const name = await client.getEnsName({ address });
    return name;
  } catch (error) {
    console.error(`Error reverse resolving ${address}:`, (error as Error).message);
    return null;
  }
}

async function getRecords(
  client: PublicClient,
  name: string
): Promise<Record<string, string | null>> {
  const normalizedName = normalize(name);
  const recordKeys = ['avatar', 'description', 'url', 'com.twitter', 'com.github', 'email'];

  const records: Record<string, string | null> = {};

  for (const key of recordKeys) {
    try {
      const value = await client.getEnsText({ name: normalizedName, key });
      if (value) {
        records[key] = value;
      }
    } catch {
      // Skip failed record lookups
    }
  }

  // Also get the avatar URL if available
  try {
    const avatar = await client.getEnsAvatar({ name: normalizedName });
    if (avatar) {
      records['avatarUrl'] = avatar;
    }
  } catch {
    // Skip if avatar lookup fails
  }

  return records;
}

async function main() {
  const opts = parseArguments();

  if (!opts.name && !opts.address) {
    console.error('Error: Must provide either --name or --address');
    console.error('Usage:');
    console.error('  bun run ResolveENS.ts --name vitalik.eth');
    console.error('  bun run ResolveENS.ts --address 0x...');
    console.error('  bun run ResolveENS.ts --name vitalik.eth --records');
    process.exit(1);
  }

  try {
    if (opts.name) {
      // Forward resolution: name → address
      const address = await executeWithFallback((client) => resolveName(client, opts.name!));

      if (!address) {
        console.error(`No address found for ${opts.name}`);
        process.exit(1);
      }

      if (opts.records) {
        // Get full records
        const records = await executeWithFallback((client) => getRecords(client, opts.name!));

        const result = {
          name: opts.name,
          address,
          records,
        };

        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(`Name: ${opts.name}`);
          console.log(`Address: ${address}`);
          console.log('\nRecords:');
          for (const [key, value] of Object.entries(records)) {
            console.log(`  ${key}: ${value}`);
          }
        }
      } else {
        // Just address
        if (opts.json) {
          console.log(JSON.stringify({ name: opts.name, address }));
        } else {
          console.log(address);
        }
      }
    } else if (opts.address) {
      // Reverse resolution: address → name
      const address = opts.address as `0x${string}`;
      const name = await executeWithFallback((client) => reverseResolve(client, address));

      if (!name) {
        console.error(`No ENS name found for ${opts.address}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify({ address: opts.address, name }));
      } else {
        console.log(name);
      }
    }
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
