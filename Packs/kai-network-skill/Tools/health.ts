#!/usr/bin/env bun
/**
 * Network Health CLI
 * Check network infrastructure health
 *
 * Usage:
 *   bun run health.ts
 */

import { parseArgs } from 'util';
import { getNetworkProvider } from 'kai-network-core';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  }
});

if (values.help) {
  console.log(`
Network Health CLI

Usage:
  health.ts        Check network health status
  health.ts --json Output as JSON

Examples:
  health.ts
`);
  process.exit(0);
}

async function main() {
  const provider = await getNetworkProvider();
  const health = await provider.healthCheck();

  if (values.json) {
    console.log(JSON.stringify(health, null, 2));
    return;
  }

  console.log('');
  console.log('NETWORK HEALTH');
  console.log('═'.repeat(50));

  const statusIcon = health.healthy ? '✓' : '✗';
  const statusColor = health.healthy ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`Status:   ${statusColor}${statusIcon} ${health.healthy ? 'Healthy' : 'Unhealthy'}${reset}`);
  console.log(`Message:  ${health.message}`);

  if (health.latencyMs !== undefined) {
    console.log(`Latency:  ${health.latencyMs}ms`);
  }

  if (health.details) {
    console.log('');
    console.log('Details:');
    for (const [key, value] of Object.entries(health.details)) {
      if (typeof value === 'object') {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }
  }

  console.log('');

  // Quick summary if healthy
  if (health.healthy) {
    try {
      const devices = await provider.getDevices();
      const clients = await provider.getClients();
      const vlans = await provider.getVLANs();

      const onlineDevices = devices.filter(d => d.status === 'online').length;
      const offlineDevices = devices.filter(d => d.status === 'offline').length;

      console.log('SUMMARY');
      console.log('─'.repeat(50));
      console.log(`Devices:  ${devices.length} total (${onlineDevices} online, ${offlineDevices} offline)`);
      console.log(`Clients:  ${clients.length} connected`);
      console.log(`VLANs:    ${vlans.length} configured`);
      console.log('');
    } catch (error) {
      // Summary is optional, ignore errors
    }
  }

  process.exit(health.healthy ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
