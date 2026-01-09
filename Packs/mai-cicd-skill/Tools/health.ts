#!/usr/bin/env bun
/**
 * Health Check CLI Tool
 *
 * Usage:
 *   bun run health.ts [--format table|json]
 */

import { getCICDProvider, type HealthStatus } from 'mai-cicd-core';

function parseArgs(args: string[]): {
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--format') {
      result.format = next as 'table' | 'json';
      i++;
    }
  }

  return result;
}

function formatHealth(health: HealthStatus, providerName: string): string {
  const lines: string[] = [];

  const status = health.healthy ? '✓ Healthy' : '✗ Unhealthy';
  lines.push(`CI/CD Provider: ${providerName}`);
  lines.push('-'.repeat(50));
  lines.push(`Status:    ${status}`);
  lines.push(`Message:   ${health.message}`);

  if (health.latencyMs !== undefined) {
    lines.push(`Latency:   ${health.latencyMs}ms`);
  }

  if (health.details) {
    lines.push(`Details:   ${JSON.stringify(health.details)}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    const provider = await getCICDProvider();
    const health = await provider.healthCheck();

    if (args.format === 'json') {
      console.log(JSON.stringify({
        provider: provider.name,
        version: provider.version,
        ...health
      }, null, 2));
    } else {
      console.log(formatHealth(health, `${provider.name} v${provider.version}`));
    }

    process.exit(health.healthy ? 0 : 1);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
