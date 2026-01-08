#!/usr/bin/env bun
/**
 * Namespaces - List and manage Kubernetes namespaces or Docker namespace equivalents
 *
 * Usage:
 *   bun run Tools/Namespaces.ts list
 *   bun run Tools/Namespaces.ts get <name>
 *   bun run Tools/Namespaces.ts create <name> [--label key=value]
 *   bun run Tools/Namespaces.ts delete <name>
 *
 * Options:
 *   --provider <name>   Use specific provider (docker, kubernetes)
 *   --json              Output as JSON
 */

import { parseArgs } from 'util';
import {
  getPlatformProvider,
  type Namespace,
} from 'kai-containers-core';

interface NamespacesArgs {
  provider?: string;
  json?: boolean;
  label?: string[];
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      provider: { type: 'string' },
      json: { type: 'boolean', default: false },
      label: { type: 'string', multiple: true },
    },
    allowPositionals: true,
  });

  const args = values as NamespacesArgs;
  const [command, ...rest] = positionals;

  const provider = await getPlatformProvider(args.provider);

  switch (command) {
    case 'list':
    case undefined: {
      const namespaces = await provider.listNamespaces();
      outputNamespaces(namespaces, args.json);
      break;
    }

    case 'get': {
      const name = rest[0];
      if (!name) {
        console.error('Error: Namespace name required');
        process.exit(1);
      }
      const namespace = await provider.getNamespace(name);
      outputNamespace(namespace, args.json);
      break;
    }

    case 'create': {
      const name = rest[0];
      if (!name) {
        console.error('Error: Namespace name required');
        process.exit(1);
      }
      if (!provider.createNamespace) {
        console.error('Error: Provider does not support creating namespaces');
        process.exit(1);
      }
      const labels = parseLabels(args.label || []);
      const namespace = await provider.createNamespace(name, labels);
      console.log(`Created namespace: ${namespace.name}`);
      outputNamespace(namespace, args.json);
      break;
    }

    case 'delete': {
      const name = rest[0];
      if (!name) {
        console.error('Error: Namespace name required');
        process.exit(1);
      }
      if (!provider.deleteNamespace) {
        console.error('Error: Provider does not support deleting namespaces');
        process.exit(1);
      }
      await provider.deleteNamespace(name);
      console.log(`Deleted namespace: ${name}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: Namespaces.ts [list|get|create|delete] [options]');
      process.exit(1);
  }
}

function parseLabels(labels: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const label of labels) {
    const [key, value] = label.split('=');
    if (key && value) {
      result[key] = value;
    }
  }
  return result;
}

function outputNamespaces(namespaces: Namespace[], json?: boolean) {
  if (json) {
    console.log(JSON.stringify(namespaces, null, 2));
    return;
  }

  if (namespaces.length === 0) {
    console.log('No namespaces found');
    return;
  }

  console.log('NAMESPACE\tSTATUS\t\tCREATED');
  console.log('---------\t------\t\t-------');
  for (const ns of namespaces) {
    const created = ns.createdAt.toISOString().split('T')[0];
    console.log(`${ns.name}\t\t${ns.status}\t\t${created}`);
  }
}

function outputNamespace(namespace: Namespace, json?: boolean) {
  if (json) {
    console.log(JSON.stringify(namespace, null, 2));
    return;
  }

  console.log(`Name:    ${namespace.name}`);
  console.log(`Status:  ${namespace.status}`);
  console.log(`Created: ${namespace.createdAt.toISOString()}`);
  if (Object.keys(namespace.labels).length > 0) {
    console.log('Labels:');
    for (const [key, value] of Object.entries(namespace.labels)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
