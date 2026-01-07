#!/usr/bin/env bun
/**
 * Deployments - Manage deployments in Kubernetes or Docker Compose services
 *
 * Usage:
 *   bun run Tools/Deployments.ts list [namespace]
 *   bun run Tools/Deployments.ts get <namespace> <name>
 *   bun run Tools/Deployments.ts scale <namespace> <name> <replicas>
 *   bun run Tools/Deployments.ts restart <namespace> <name>
 *   bun run Tools/Deployments.ts delete <namespace> <name>
 *
 * Options:
 *   --provider <name>   Use specific provider (docker, kubernetes)
 *   --json              Output as JSON
 */

import { parseArgs } from 'util';
import {
  getPlatformProvider,
  type Deployment,
} from 'kai-platform-core';

interface DeploymentsArgs {
  provider?: string;
  json?: boolean;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      provider: { type: 'string' },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const args = values as DeploymentsArgs;
  const [command, ...rest] = positionals;

  const provider = await getPlatformProvider(args.provider);

  switch (command) {
    case 'list':
    case undefined: {
      const namespace = rest[0] || 'default';
      const deployments = await provider.listDeployments(namespace);
      outputDeployments(deployments, args.json);
      break;
    }

    case 'get': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and deployment name required');
        process.exit(1);
      }
      const deployment = await provider.getDeployment(namespace, name);
      outputDeployment(deployment, args.json);
      break;
    }

    case 'scale': {
      const [namespace, name, replicasStr] = rest;
      if (!namespace || !name || !replicasStr) {
        console.error('Error: Namespace, name, and replicas required');
        process.exit(1);
      }
      const replicas = parseInt(replicasStr, 10);
      if (isNaN(replicas) || replicas < 0) {
        console.error('Error: Replicas must be a non-negative number');
        process.exit(1);
      }
      const deployment = await provider.scaleDeployment(namespace, name, replicas);
      console.log(`Scaled ${name} to ${replicas} replicas`);
      outputDeployment(deployment, args.json);
      break;
    }

    case 'restart': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and deployment name required');
        process.exit(1);
      }
      await provider.restartDeployment(namespace, name);
      console.log(`Restarted deployment: ${name}`);
      break;
    }

    case 'delete': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and deployment name required');
        process.exit(1);
      }
      if (!provider.deleteDeployment) {
        console.error('Error: Provider does not support deleting deployments');
        process.exit(1);
      }
      await provider.deleteDeployment(namespace, name);
      console.log(`Deleted deployment: ${name}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: Deployments.ts [list|get|scale|restart|delete] [options]');
      process.exit(1);
  }
}

function outputDeployments(deployments: Deployment[], json?: boolean) {
  if (json) {
    console.log(JSON.stringify(deployments, null, 2));
    return;
  }

  if (deployments.length === 0) {
    console.log('No deployments found');
    return;
  }

  console.log('NAME\t\t\tSTATUS\t\tREPLICAS\tIMAGE');
  console.log('----\t\t\t------\t\t--------\t-----');
  for (const dep of deployments) {
    const replicaStr = `${dep.replicas.ready}/${dep.replicas.desired}`;
    const image = dep.image.split('/').pop()?.split(':')[0] || dep.image;
    console.log(`${dep.name}\t\t${dep.status}\t\t${replicaStr}\t\t${image}`);
  }
}

function outputDeployment(deployment: Deployment, json?: boolean) {
  if (json) {
    console.log(JSON.stringify(deployment, null, 2));
    return;
  }

  console.log(`Name:      ${deployment.name}`);
  console.log(`Namespace: ${deployment.namespace}`);
  console.log(`Status:    ${deployment.status}`);
  console.log(`Image:     ${deployment.image}`);
  console.log(`Replicas:  ${deployment.replicas.ready}/${deployment.replicas.desired} ready, ${deployment.replicas.available} available`);
  console.log(`Created:   ${deployment.createdAt.toISOString()}`);
  if (Object.keys(deployment.labels).length > 0) {
    console.log('Labels:');
    for (const [key, value] of Object.entries(deployment.labels)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
