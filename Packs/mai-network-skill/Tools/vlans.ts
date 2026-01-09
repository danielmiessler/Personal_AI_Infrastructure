#!/usr/bin/env bun
/**
 * VLANs CLI
 * List and inspect network VLANs
 *
 * Usage:
 *   bun run vlans.ts       # List all VLANs
 *   bun run vlans.ts <id>  # Get specific VLAN
 */

import { parseArgs } from 'util';
import { getNetworkProvider, type VLAN } from 'mai-network-core';

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    json: { type: 'boolean', short: 'j' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
});

if (values.help) {
  console.log(`
VLANs CLI

Usage:
  vlans.ts         List all VLANs
  vlans.ts <id>    Get specific VLAN by ID
  vlans.ts --json  Output as JSON

Examples:
  vlans.ts
  vlans.ts 10
`);
  process.exit(0);
}

async function main() {
  const provider = await getNetworkProvider();

  if (positionals.length > 0) {
    // Get specific VLAN
    const vlanId = parseInt(positionals[0], 10);
    const vlan = await provider.getVLAN(vlanId);
    outputVLAN(vlan);
    return;
  }

  // List all VLANs
  const vlans = await provider.getVLANs();

  if (values.json) {
    console.log(JSON.stringify(vlans, null, 2));
    return;
  }

  if (vlans.length === 0) {
    console.log('No VLANs found');
    return;
  }

  // Table output
  console.log('');
  console.log('NETWORK VLANs');
  console.log('═'.repeat(70));
  console.log(
    'ID'.padEnd(8) +
    'NAME'.padEnd(20) +
    'SUBNET'.padEnd(20) +
    'DESCRIPTION'.padEnd(22)
  );
  console.log('─'.repeat(70));

  for (const vlan of vlans) {
    console.log(
      vlan.id.toString().padEnd(8) +
      (vlan.name || '-').slice(0, 18).padEnd(20) +
      (vlan.subnet || '-').padEnd(20) +
      (vlan.description || '-').slice(0, 20).padEnd(22)
    );
  }

  console.log('─'.repeat(70));
  console.log(`Total: ${vlans.length} VLAN(s)`);
  console.log('');
}

function outputVLAN(vlan: VLAN) {
  if (values.json) {
    console.log(JSON.stringify(vlan, null, 2));
    return;
  }

  console.log('');
  console.log('VLAN DETAILS');
  console.log('═'.repeat(50));
  console.log(`ID:          ${vlan.id}`);
  console.log(`Name:        ${vlan.name || '-'}`);
  console.log(`Description: ${vlan.description || '-'}`);
  console.log(`Subnet:      ${vlan.subnet || '-'}`);
  if (vlan.metadata) {
    console.log(`Metadata:    ${JSON.stringify(vlan.metadata)}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
