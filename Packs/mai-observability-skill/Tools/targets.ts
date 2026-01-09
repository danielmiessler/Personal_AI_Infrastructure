#!/usr/bin/env bun
/**
 * List targets from the configured observability provider
 */

import { getObservabilityProvider, type Target, type TargetHealth } from 'mai-observability-core';

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    job?: string;
    health?: TargetHealth;
    format: 'table' | 'json';
  } = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--job') {
      options.job = args[++i];
    } else if (arg === '--health') {
      options.health = args[++i] as TargetHealth;
    } else if (arg === '--format') {
      options.format = args[++i] as 'table' | 'json';
    }
  }

  return options;
}

function formatTargets(targets: Target[], format: 'table' | 'json') {
  if (format === 'json') {
    console.log(JSON.stringify(targets, null, 2));
    return;
  }

  if (targets.length === 0) {
    console.log('No targets found.');
    return;
  }

  console.log('JOB\t\t\tINSTANCE\t\t\tHEALTH\tLAST SCRAPE');
  console.log('-'.repeat(90));

  for (const target of targets) {
    const job = target.job.substring(0, 16).padEnd(16);
    const instance = target.instance.substring(0, 24).padEnd(24);
    const health = target.health.padEnd(8);
    const lastScrape = target.lastScrape ? target.lastScrape.toISOString() : '-';
    const error = target.lastError ? ` [${target.lastError}]` : '';
    console.log(`${job}\t${instance}\t${health}\t${lastScrape}${error}`);
  }

  const up = targets.filter(t => t.health === 'up').length;
  const down = targets.filter(t => t.health === 'down').length;
  console.log(`\nTotal: ${targets.length} target(s) - ${up} up, ${down} down`);
}

async function main() {
  const options = parseArgs();

  try {
    const provider = await getObservabilityProvider();
    const targets = await provider.listTargets({
      job: options.job,
      health: options.health,
    });

    formatTargets(targets, options.format);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
