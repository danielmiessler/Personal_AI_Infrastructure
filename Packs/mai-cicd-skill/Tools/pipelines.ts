#!/usr/bin/env bun
/**
 * List Pipelines CLI Tool
 *
 * Usage:
 *   bun run pipelines.ts <repo>
 *                        [--format table|json]
 */

import { getCICDProvider, type Pipeline } from 'mai-cicd-core';

function parseArgs(args: string[]): {
  repo?: string;
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--format':
          result.format = next as 'table' | 'json';
          i++;
          break;
      }
    } else if (!result.repo) {
      result.repo = arg;
    }
  }

  return result;
}

function formatTable(pipelines: Pipeline[]): string {
  if (pipelines.length === 0) {
    return 'No pipelines found.';
  }

  const lines = ['ID\t\t\tName\t\t\t\tPath'];
  lines.push('-'.repeat(80));

  for (const pipeline of pipelines) {
    const id = pipeline.id.slice(0, 16).padEnd(16);
    const name = pipeline.name.slice(0, 24).padEnd(24);
    const path = pipeline.path || '-';
    lines.push(`${id}\t${name}\t${path}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.repo) {
    console.error('Usage: bun run pipelines.ts <repo> [--format table|json]');
    console.error('');
    console.error('Example: bun run pipelines.ts owner/repo');
    process.exit(1);
  }

  try {
    const provider = await getCICDProvider();
    const pipelines = await provider.listPipelines(args.repo);

    if (args.format === 'json') {
      console.log(JSON.stringify(pipelines, null, 2));
    } else {
      console.log(formatTable(pipelines));
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
