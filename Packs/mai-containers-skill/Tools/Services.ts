#!/usr/bin/env bun
/**
 * Services - Manage Kubernetes services or Docker exposed ports
 *
 * Usage:
 *   bun run Tools/Services.ts list [namespace]
 *   bun run Tools/Services.ts get <namespace> <name>
 *   bun run Tools/Services.ts forward <namespace> <name> <local:remote>
 *
 * Options:
 *   --provider <name>   Use specific provider (docker, kubernetes)
 *   --json              Output as JSON
 */

import { parseArgs } from 'util';
import {
  getPlatformProvider,
  type Service,
} from 'mai-containers-core';

interface ServicesArgs {
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

  const args = values as ServicesArgs;
  const [command, ...rest] = positionals;

  const provider = await getPlatformProvider(args.provider);

  switch (command) {
    case 'list':
    case undefined: {
      const namespace = rest[0] || 'default';
      const services = await provider.listServices(namespace);
      outputServices(services, args.json);
      break;
    }

    case 'get': {
      const [namespace, name] = rest;
      if (!namespace || !name) {
        console.error('Error: Namespace and service name required');
        process.exit(1);
      }
      const service = await provider.getService(namespace, name);
      outputService(service, args.json);
      break;
    }

    case 'forward': {
      const [namespace, name, portMapping] = rest;
      if (!namespace || !name || !portMapping) {
        console.error('Error: Namespace, name, and port mapping (local:remote) required');
        process.exit(1);
      }
      if (!provider.portForward) {
        console.error('Error: Provider does not support port forwarding');
        process.exit(1);
      }
      const [localStr, remoteStr] = portMapping.split(':');
      const local = parseInt(localStr, 10);
      const remote = parseInt(remoteStr, 10);
      if (isNaN(local) || isNaN(remote)) {
        console.error('Error: Invalid port mapping format. Use local:remote');
        process.exit(1);
      }

      const handle = await provider.portForward(namespace, name, { local, remote });
      console.log(`Forwarding localhost:${handle.localPort} -> ${name}:${handle.remotePort}`);
      console.log('Press Ctrl+C to stop');

      // Keep running until interrupted
      process.on('SIGINT', async () => {
        await handle.stop();
        console.log('\nStopped port forwarding');
        process.exit(0);
      });

      // Keep the process running
      await new Promise(() => {});
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: Services.ts [list|get|forward] [options]');
      process.exit(1);
  }
}

function outputServices(services: Service[], json?: boolean) {
  if (json) {
    console.log(JSON.stringify(services, null, 2));
    return;
  }

  if (services.length === 0) {
    console.log('No services found');
    return;
  }

  console.log('NAME\t\t\tTYPE\t\t\tCLUSTER-IP\tPORTS');
  console.log('----\t\t\t----\t\t\t----------\t-----');
  for (const svc of services) {
    const ports = svc.ports.map(p =>
      p.nodePort ? `${p.port}:${p.nodePort}/${p.protocol}` : `${p.port}/${p.protocol}`
    ).join(',');
    console.log(`${svc.name}\t\t${svc.type}\t\t${svc.clusterIP || 'None'}\t\t${ports}`);
  }
}

function outputService(service: Service, json?: boolean) {
  if (json) {
    console.log(JSON.stringify(service, null, 2));
    return;
  }

  console.log(`Name:       ${service.name}`);
  console.log(`Namespace:  ${service.namespace}`);
  console.log(`Type:       ${service.type}`);
  if (service.clusterIP) {
    console.log(`Cluster IP: ${service.clusterIP}`);
  }
  if (service.externalIP) {
    console.log(`External:   ${service.externalIP}`);
  }
  console.log(`Created:    ${service.createdAt.toISOString()}`);

  console.log('Ports:');
  for (const port of service.ports) {
    const nodePort = port.nodePort ? ` -> ${port.nodePort}` : '';
    console.log(`  ${port.name || 'unnamed'}: ${port.port} -> ${port.targetPort}${nodePort} (${port.protocol})`);
  }

  if (Object.keys(service.selector).length > 0) {
    console.log('Selector:');
    for (const [key, value] of Object.entries(service.selector)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  if (Object.keys(service.labels).length > 0) {
    console.log('Labels:');
    for (const [key, value] of Object.entries(service.labels)) {
      console.log(`  ${key}: ${value}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
