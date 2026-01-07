#!/usr/bin/env bun
/**
 * Network Devices CLI
 * List and inspect network devices
 *
 * Usage:
 *   bun run devices.ts              # List all devices
 *   bun run devices.ts <id>         # Get specific device
 *   bun run devices.ts --type switch
 *   bun run devices.ts --status online
 */

import { parseArgs } from 'util';
import { getNetworkProvider, type Device } from 'kai-network-core';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    type: { type: 'string', short: 't' },
    status: { type: 'string', short: 's' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
});

if (values.help) {
  console.log(`
Network Devices CLI

Usage:
  devices.ts              List all devices
  devices.ts <id>         Get specific device
  devices.ts --type <t>   Filter by type (switch, router, access_point, gateway)
  devices.ts --status <s> Filter by status (online, offline, pending)
  devices.ts --json       Output as JSON

Examples:
  devices.ts --type switch
  devices.ts --status online
  devices.ts device-123
`);
  process.exit(0);
}

async function main() {
  const provider = await getNetworkProvider();

  if (positionals.length > 0) {
    // Get specific device
    const device = await provider.getDevice(positionals[0]);
    outputDevice(device);
    return;
  }

  // List all devices
  let devices = await provider.getDevices();

  // Apply filters
  if (values.type) {
    devices = devices.filter(d => d.type === values.type);
  }

  if (values.status) {
    devices = devices.filter(d => d.status === values.status);
  }

  if (values.json) {
    console.log(JSON.stringify(devices, null, 2));
    return;
  }

  if (devices.length === 0) {
    console.log('No devices found');
    return;
  }

  // Table output
  console.log('');
  console.log('NETWORK DEVICES');
  console.log('═'.repeat(80));
  console.log(
    'ID'.padEnd(20) +
    'NAME'.padEnd(20) +
    'TYPE'.padEnd(15) +
    'STATUS'.padEnd(10) +
    'IP'.padEnd(15)
  );
  console.log('─'.repeat(80));

  for (const device of devices) {
    const statusIcon = device.status === 'online' ? '●' : '○';
    console.log(
      device.id.slice(0, 18).padEnd(20) +
      (device.name || '-').slice(0, 18).padEnd(20) +
      device.type.padEnd(15) +
      `${statusIcon} ${device.status}`.padEnd(10) +
      (device.ip || '-').padEnd(15)
    );
  }

  console.log('─'.repeat(80));
  console.log(`Total: ${devices.length} device(s)`);
  console.log('');
}

function outputDevice(device: Device) {
  if (values.json) {
    console.log(JSON.stringify(device, null, 2));
    return;
  }

  console.log('');
  console.log('DEVICE DETAILS');
  console.log('═'.repeat(50));
  console.log(`ID:       ${device.id}`);
  console.log(`Name:     ${device.name || '-'}`);
  console.log(`Model:    ${device.model}`);
  console.log(`Type:     ${device.type}`);
  console.log(`Status:   ${device.status}`);
  console.log(`MAC:      ${device.mac}`);
  console.log(`IP:       ${device.ip || '-'}`);
  console.log(`Firmware: ${device.firmware || '-'}`);
  console.log(`Uptime:   ${formatUptime(device.uptime)}`);
  console.log(`Ports:    ${device.ports ?? '-'}`);
  console.log(`Clients:  ${device.clients ?? '-'}`);
  console.log('');
}

function formatUptime(seconds?: number): string {
  if (!seconds) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
