#!/usr/bin/env bun
/**
 * Containers - Manage containers (Docker) or pods (Kubernetes)
 *
 * Usage:
 *   bun run Tools/Containers.ts list [namespace] [--deployment name]
 *   bun run Tools/Containers.ts get <namespace> <name>
 *   bun run Tools/Containers.ts logs <namespace> <name> [--tail n] [--since ms]
 *   bun run Tools/Containers.ts exec <namespace> <name> -- <command...>
 *   bun run Tools/Containers.ts delete <namespace> <name>
 *
 * Options:
 *   --provider <name>   Use specific provider (docker, kubernetes)
 *   --deployment <name> Filter by deployment
 *   --status <status>   Filter by status (running, pending, failed, succeeded)
 *   --tail <n>          Number of log lines to show (default: 100)
 *   --since <ms>        Show logs since (milliseconds ago)
 *   --timestamps        Include timestamps in logs
 *   --json              Output as JSON
 */

import { parseArgs } from 'util';
import {
  getPlatformProvider,
  type Container,
} from 'kai-containers-core';

interface ContainersArgs {
  provider?: string;
  deployment?: string;
  status?: string;
  tail?: string;
  since?: string;
  timestamps?: boolean;
  json?: boolean;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      provider: { type: 'string' },
      deployment: { type: 'string' },
      status: { type: 'string' },
      tail: { type: 'string' },
      since: { type: 'string' },
      timestamps: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const args = values as ContainersArgs;
  const [command, ...rest] = positionals;

  const provider = await getPlatformProvider(args.provider);

  switch (command) {
    case 'list':
    case undefined: {
      const namespace = rest[0] || 'default';
      const containers = await provider.listContainers(namespace, {
        deploymentName: args.deployment,
        status: args.status as Container['status'],
      });
      outputContainers(containers, args.json);
      break;
    }

    case 'get': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and container name required');
        process.exit(1);
      }
      const container = await provider.getContainer(namespace, name);
      outputContainer(container, args.json);
      break;
    }

    case 'logs': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and container name required');
        process.exit(1);
      }
      const logs = await provider.getContainerLogs(namespace, name, {
        tail: args.tail ? parseInt(args.tail, 10) : 100,
        since: args.since ? parseInt(args.since, 10) : undefined,
        timestamps: args.timestamps,
      });
      console.log(logs);
      break;
    }

    case 'exec': {
      const [namespace, name, ...commandArgs] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and container name required');
        process.exit(1);
      }
      // Filter out '--' separator
      const cmd = commandArgs.filter(arg => arg !== '--');
      if (cmd.length === 0) {
        console.error('Error: Command required');
        process.exit(1);
      }
      if (!provider.execInContainer) {
        console.error('Error: Provider does not support exec');
        process.exit(1);
      }
      const result = await provider.execInContainer(namespace, name, cmd);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
      process.exit(result.exitCode);
    }

    case 'delete': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and container name required');
        process.exit(1);
      }
      if (!provider.deleteContainer) {
        console.error('Error: Provider does not support deleting containers');
        process.exit(1);
      }
      await provider.deleteContainer(namespace, name);
      console.log(`Deleted container: ${name}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: Containers.ts [list|get|logs|exec|delete] [options]');
      process.exit(1);
  }
}

function outputContainers(containers: Container[], json?: boolean) {
  if (json) {
    console.log(JSON.stringify(containers, null, 2));
    return;
  }

  if (containers.length === 0) {
    console.log('No containers found');
    return;
  }

  console.log('NAME\t\t\t\tSTATUS\t\tRESTARTS\tIMAGE');
  console.log('----\t\t\t\t------\t\t--------\t-----');
  for (const c of containers) {
    const image = c.image.split('/').pop()?.split(':')[0] || c.image;
    const restarts = c.restartCount || 0;
    console.log(`${c.name}\t\t${c.status}\t\t${restarts}\t\t${image}`);
  }
}

function outputContainer(container: Container, json?: boolean) {
  if (json) {
    console.log(JSON.stringify(container, null, 2));
    return;
  }

  console.log(`Name:      ${container.name}`);
  console.log(`ID:        ${container.id}`);
  console.log(`Namespace: ${container.namespace}`);
  console.log(`Status:    ${container.status}`);
  console.log(`Image:     ${container.image}`);
  if (container.node) {
    console.log(`Node:      ${container.node}`);
  }
  console.log(`Restarts:  ${container.restartCount || 0}`);
  console.log(`Created:   ${container.createdAt.toISOString()}`);
  if (container.ports.length > 0) {
    console.log('Ports:');
    for (const port of container.ports) {
      const host = port.host ? `${port.host}:` : '';
      console.log(`  ${host}${port.container}/${port.protocol}`);
    }
  }
  if (Object.keys(container.labels).length > 0) {
    console.log('Labels:');
    for (const [key, value] of Object.entries(container.labels)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
