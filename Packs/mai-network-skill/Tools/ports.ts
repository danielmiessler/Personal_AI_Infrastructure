#!/usr/bin/env bun
/**
 * Ports CLI
 * Show port information for network devices
 *
 * Usage:
 *   bun run ports.ts <device-id>          # List all ports
 *   bun run ports.ts <device-id> --port 1 # Get specific port
 *   bun run ports.ts <device-id> --link up
 */

import { parseArgs } from 'util';
import { getNetworkProvider, type Port } from 'mai-network-core';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    port: { type: 'string', short: 'p' },
    link: { type: 'string', short: 'l' },
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
});

if (values.help || positionals.length === 0) {
  console.log(`
Ports CLI

Usage:
  ports.ts <device-id>           List all ports on device
  ports.ts <device-id> --port <n> Get specific port
  ports.ts <device-id> --link up  Filter by link status (up/down)
  ports.ts <device-id> --json     Output as JSON

Examples:
  ports.ts switch-123
  ports.ts switch-123 --port 1
  ports.ts switch-123 --link up
`);
  process.exit(values.help ? 0 : 1);
}

async function main() {
  const deviceId = positionals[0];
  const provider = await getNetworkProvider();

  if (values.port) {
    // Get specific port
    const port = await provider.getPort(deviceId, values.port);
    outputPort(port);
    return;
  }

  // List all ports
  let ports = await provider.getPorts(deviceId);

  // Apply filters
  if (values.link) {
    const linkUp = values.link === 'up';
    ports = ports.filter(p => p.link === linkUp);
  }

  if (values.json) {
    console.log(JSON.stringify(ports, null, 2));
    return;
  }

  if (ports.length === 0) {
    console.log('No ports found');
    return;
  }

  // Table output
  console.log('');
  console.log(`PORTS ON ${deviceId}`);
  console.log('═'.repeat(90));
  console.log(
    'PORT'.padEnd(6) +
    'NAME'.padEnd(15) +
    'LINK'.padEnd(6) +
    'SPEED'.padEnd(10) +
    'POE'.padEnd(8) +
    'VLAN'.padEnd(6) +
    'RX'.padEnd(12) +
    'TX'.padEnd(12)
  );
  console.log('─'.repeat(90));

  for (const port of ports) {
    const linkIcon = port.link ? '▲' : '▽';
    const poeStatus = port.poe
      ? (port.poe.enabled ? `${port.poe.power?.toFixed(1) || '?'}W` : 'off')
      : '-';

    console.log(
      port.number.toString().padEnd(6) +
      (port.name || '-').slice(0, 13).padEnd(15) +
      `${linkIcon}`.padEnd(6) +
      formatSpeed(port.speed).padEnd(10) +
      poeStatus.padEnd(8) +
      (port.vlan?.toString() || '-').padEnd(6) +
      formatBytes(port.stats?.rxBytes).padEnd(12) +
      formatBytes(port.stats?.txBytes).padEnd(12)
    );
  }

  console.log('─'.repeat(90));

  // Summary
  const upPorts = ports.filter(p => p.link).length;
  const poePorts = ports.filter(p => p.poe?.enabled).length;
  const totalPower = ports
    .filter(p => p.poe?.power)
    .reduce((sum, p) => sum + (p.poe?.power || 0), 0);

  console.log(`Total: ${ports.length} port(s), ${upPorts} up, ${poePorts} PoE active (${totalPower.toFixed(1)}W)`);
  console.log('');
}

function outputPort(port: Port) {
  if (values.json) {
    console.log(JSON.stringify(port, null, 2));
    return;
  }

  console.log('');
  console.log('PORT DETAILS');
  console.log('═'.repeat(50));
  console.log(`Port:    ${port.number}`);
  console.log(`Name:    ${port.name || '-'}`);
  console.log(`Enabled: ${port.enabled ? 'Yes' : 'No'}`);
  console.log(`Link:    ${port.link ? 'Up' : 'Down'}`);
  console.log(`Speed:   ${formatSpeed(port.speed)}`);
  console.log(`Duplex:  ${port.duplex || '-'}`);
  console.log(`VLAN:    ${port.vlan ?? '-'}`);
  console.log(`Trunk:   ${port.trunk ? 'Yes' : 'No'}`);

  if (port.poe) {
    console.log('');
    console.log('PoE:');
    console.log(`  Enabled: ${port.poe.enabled ? 'Yes' : 'No'}`);
    console.log(`  Power:   ${port.poe.power?.toFixed(1) || '-'} W`);
    console.log(`  Mode:    ${port.poe.mode || '-'}`);
  }

  if (port.stats) {
    console.log('');
    console.log('Statistics:');
    console.log(`  RX Bytes:   ${formatBytes(port.stats.rxBytes)}`);
    console.log(`  TX Bytes:   ${formatBytes(port.stats.txBytes)}`);
    console.log(`  RX Packets: ${port.stats.rxPackets?.toLocaleString() || '-'}`);
    console.log(`  TX Packets: ${port.stats.txPackets?.toLocaleString() || '-'}`);
    console.log(`  Errors:     ${port.stats.errors || 0}`);
  }

  console.log('');
}

function formatSpeed(speed?: number): string {
  if (!speed) return '-';
  if (speed >= 1000) return `${speed / 1000}G`;
  return `${speed}M`;
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
