#!/usr/bin/env bun
/**
 * List alert rules from the configured observability provider
 */

import { getObservabilityProvider, type AlertRule, type AlertState } from 'mai-observability-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    group?: string;
    state?: AlertState;
    format: 'table' | 'json';
  } = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--group') {
      options.group = args[++i];
    } else if (arg === '--state') {
      options.state = args[++i] as AlertState;
    } else if (arg === '--format') {
      options.format = args[++i] as 'table' | 'json';
    }
  }

  return options;
}

function formatRules(rules: AlertRule[], format: 'table' | 'json') {
  if (format === 'json') {
    console.log(JSON.stringify(rules, null, 2));
    return;
  }

  if (rules.length === 0) {
    console.log('No alert rules found.');
    return;
  }

  console.log('NAME\t\t\t\tGROUP\t\t\tSTATE\t\tALERTS');
  console.log('-'.repeat(80));

  for (const rule of rules) {
    const name = rule.name.substring(0, 24).padEnd(24);
    const group = rule.group.substring(0, 16).padEnd(16);
    const state = rule.state.padEnd(12);
    const alerts = rule.alerts.length.toString();
    console.log(`${name}\t${group}\t${state}\t${alerts}`);
  }

  const firing = rules.filter(r => r.state === 'firing').length;
  console.log(`\nTotal: ${rules.length} rule(s) - ${firing} firing`);
}

async function main() {
  const options = parseArgs();

  try {
    const provider = await getObservabilityProvider();
    const rules = await provider.listAlertRules({
      group: options.group,
      state: options.state,
    });

    formatRules(rules, options.format);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
