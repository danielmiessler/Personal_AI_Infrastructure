#!/usr/bin/env bun
/**
 * Health - Check platform provider health and connectivity
 *
 * Usage:
 *   bun run Tools/Health.ts [--provider name]
 *   bun run Tools/Health.ts resources <namespace> [container]
 *
 * Options:
 *   --provider <name>   Use specific provider (docker, kubernetes)
 *   --json              Output as JSON
 */

import { parseArgs } from 'util';
import { getPlatformProvider } from 'kai-containers-core';

interface HealthArgs {
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

  const args = values as HealthArgs;
  const [command, ...rest] = positionals;

  const provider = await getPlatformProvider(args.provider);

  switch (command) {
    case 'resources': {
      const namespace = rest[0] || 'default';
      const containerName = rest[1];
      const usage = await provider.getResourceUsage(namespace, containerName);

      if (args.json) {
        console.log(JSON.stringify(usage, null, 2));
        return;
      }

      const target = containerName || `namespace ${namespace}`;
      console.log(`Resource usage for ${target}:`);
      console.log('');
      console.log(`CPU:    ${usage.cpu.used.toFixed(1)}m used`);
      if (usage.cpu.limit > 0) {
        console.log(`        ${usage.cpu.limit}m limit (${usage.cpu.percentage.toFixed(1)}%)`);
      }
      console.log('');
      console.log(`Memory: ${usage.memory.used.toFixed(1)} MB used`);
      if (usage.memory.limit > 0) {
        console.log(`        ${usage.memory.limit} MB limit (${usage.memory.percentage.toFixed(1)}%)`);
      }
      break;
    }

    case undefined:
    case 'check': {
      const health = await provider.healthCheck();

      if (args.json) {
        console.log(JSON.stringify(health, null, 2));
        return;
      }

      const status = health.healthy ? '✓ Healthy' : '✗ Unhealthy';
      console.log(`Provider: ${provider.name} v${provider.version}`);
      console.log(`Status:   ${status}`);
      console.log(`Message:  ${health.message}`);

      if (health.details) {
        console.log('');
        console.log('Details:');
        for (const [key, value] of Object.entries(health.details)) {
          console.log(`  ${key}: ${value}`);
        }
      }

      if (!health.healthy) {
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: Health.ts [check|resources] [options]');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
