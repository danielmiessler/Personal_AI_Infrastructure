#!/usr/bin/env bun
/**
 * Network Clients CLI
 * List and inspect connected network clients
 *
 * Usage:
 *   bun run clients.ts              # List all clients
 *   bun run clients.ts <mac>        # Get specific client
 *   bun run clients.ts --vlan 10
 *   bun run clients.ts --device <device-id>
 */

import { parseArgs } from 'util';
import { getNetworkProvider, type Client } from 'mai-network-core';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    vlan: { type: 'string', short: 'v' },
    device: { type: 'string', short: 'd' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
});

if (values.help) {
  console.log(`
Network Clients CLI

Usage:
  clients.ts              List all connected clients
  clients.ts <mac>        Get specific client by MAC address
  clients.ts --vlan <id>  Filter by VLAN ID
  clients.ts --device <d> Filter by device ID
  clients.ts --json       Output as JSON

Examples:
  clients.ts --vlan 10
  clients.ts --device switch-123
  clients.ts aa:bb:cc:dd:ee:ff
`);
  process.exit(0);
}

async function main() {
  const provider = await getNetworkProvider();

  if (positionals.length > 0) {
    // Get specific client
    const client = await provider.getClient(positionals[0]);
    outputClient(client);
    return;
  }

  // List clients with filters
  const options: { vlan?: number; deviceId?: string; connected?: boolean } = {
    connected: true
  };

  if (values.vlan) {
    options.vlan = parseInt(values.vlan, 10);
  }

  if (values.device) {
    options.deviceId = values.device;
  }

  const clients = await provider.getClients(options);

  if (values.json) {
    console.log(JSON.stringify(clients, null, 2));
    return;
  }

  if (clients.length === 0) {
    console.log('No clients found');
    return;
  }

  // Table output
  console.log('');
  console.log('CONNECTED CLIENTS');
  console.log('═'.repeat(100));
  console.log(
    'MAC'.padEnd(20) +
    'IP'.padEnd(16) +
    'HOSTNAME'.padEnd(20) +
    'VLAN'.padEnd(6) +
    'PORT'.padEnd(6) +
    'RX'.padEnd(12) +
    'TX'.padEnd(12)
  );
  console.log('─'.repeat(100));

  for (const client of clients) {
    console.log(
      client.mac.padEnd(20) +
      (client.ip || '-').padEnd(16) +
      (client.hostname || client.name || '-').slice(0, 18).padEnd(20) +
      (client.vlan?.toString() || '-').padEnd(6) +
      (client.port?.toString() || '-').padEnd(6) +
      formatBytes(client.rxBytes).padEnd(12) +
      formatBytes(client.txBytes).padEnd(12)
    );
  }

  console.log('─'.repeat(100));
  console.log(`Total: ${clients.length} client(s)`);
  console.log('');
}

function outputClient(client: Client) {
  if (values.json) {
    console.log(JSON.stringify(client, null, 2));
    return;
  }

  console.log('');
  console.log('CLIENT DETAILS');
  console.log('═'.repeat(50));
  console.log(`MAC:       ${client.mac}`);
  console.log(`IP:        ${client.ip || '-'}`);
  console.log(`Hostname:  ${client.hostname || '-'}`);
  console.log(`Name:      ${client.name || '-'}`);
  console.log(`VLAN:      ${client.vlan ?? '-'}`);
  console.log(`Device:    ${client.deviceId || '-'}`);
  console.log(`Port:      ${client.port ?? '-'}`);
  console.log(`Connected: ${client.connected ? 'Yes' : 'No'}`);
  console.log(`First Seen: ${client.firstSeen?.toLocaleString() || '-'}`);
  console.log(`Last Seen:  ${client.lastSeen?.toLocaleString() || '-'}`);
  console.log(`RX:        ${formatBytes(client.rxBytes)}`);
  console.log(`TX:        ${formatBytes(client.txBytes)}`);
  if (client.signal) {
    console.log(`Signal:    ${client.signal} dBm`);
  }
  console.log('');
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
