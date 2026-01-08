#!/usr/bin/env bun
/**
 * List alerts from the configured observability provider
 */

import { getObservabilityProvider, type Alert, type AlertState, type AlertSeverity } from 'kai-observability-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    state?: AlertState;
    severity?: AlertSeverity;
    format: 'table' | 'json';
  } = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--state') {
      options.state = args[++i] as AlertState;
    } else if (arg === '--severity') {
      options.severity = args[++i] as AlertSeverity;
    } else if (arg === '--format') {
      options.format = args[++i] as 'table' | 'json';
    }
  }

  return options;
}

function formatAlerts(alerts: Alert[], format: 'table' | 'json') {
  if (format === 'json') {
    console.log(JSON.stringify(alerts, null, 2));
    return;
  }

  if (alerts.length === 0) {
    console.log('No alerts found.');
    return;
  }

  console.log('NAME\t\t\t\tSTATE\t\tSEVERITY\tACTIVE SINCE');
  console.log('-'.repeat(80));

  for (const alert of alerts) {
    const name = alert.name.substring(0, 24).padEnd(24);
    const state = alert.state.padEnd(12);
    const severity = (alert.severity || 'unknown').padEnd(12);
    const activeAt = alert.activeAt ? alert.activeAt.toISOString() : '-';
    console.log(`${name}\t${state}\t${severity}\t${activeAt}`);
  }

  console.log(`\nTotal: ${alerts.length} alert(s)`);
}

async function main() {
  const options = parseArgs();

  try {
    const provider = await getObservabilityProvider();
    const alerts = await provider.listAlerts({
      state: options.state,
      severity: options.severity,
    });

    formatAlerts(alerts, options.format);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
