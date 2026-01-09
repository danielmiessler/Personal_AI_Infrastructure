#!/usr/bin/env bun
/**
 * Trigger Pipeline CLI Tool
 *
 * Usage:
 *   bun run trigger.ts <repo> <pipeline-id>
 *                      [--branch <name>]
 *                      [--input KEY=VALUE]...
 *                      [--format table|json]
 */

import { getCICDProvider, type Run, type TriggerOptions } from 'mai-cicd-core';

function parseArgs(args: string[]): {
  repo?: string;
  pipelineId?: string;
  branch?: string;
  inputs: Record<string, string>;
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { inputs: {}, format: 'table' };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--branch':
          result.branch = next;
          i++;
          break;
        case '--input':
          if (next && next.includes('=')) {
            const [key, ...rest] = next.split('=');
            result.inputs[key] = rest.join('=');
          }
          i++;
          break;
        case '--format':
          result.format = next as 'table' | 'json';
          i++;
          break;
      }
    } else {
      positional.push(arg);
    }
  }

  result.repo = positional[0];
  result.pipelineId = positional[1];

  return result;
}

function formatRun(run: Run): string {
  const lines: string[] = [];

  lines.push('Pipeline triggered successfully!');
  lines.push('-'.repeat(50));
  lines.push(`Run ID:      ${run.id}`);
  lines.push(`Pipeline:    ${run.pipelineName || run.pipelineId}`);
  lines.push(`Status:      ${run.status}`);
  lines.push(`Branch:      ${run.branch || '-'}`);
  if (run.url) {
    lines.push(`URL:         ${run.url}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.repo || !args.pipelineId) {
    console.error('Usage: bun run trigger.ts <repo> <pipeline-id> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --branch <name>     Branch to run on (default: main)');
    console.error('  --input KEY=VALUE   Pipeline input (can be repeated)');
    console.error('  --format <fmt>      Output format (table, json)');
    console.error('');
    console.error('Examples:');
    console.error('  bun run trigger.ts owner/repo ci.yml');
    console.error('  bun run trigger.ts owner/repo deploy --branch develop');
    console.error('  bun run trigger.ts owner/repo deploy --input DEPLOY_ENV=staging');
    process.exit(1);
  }

  try {
    const provider = await getCICDProvider();

    const options: TriggerOptions = {};
    if (args.branch) options.branch = args.branch;
    if (Object.keys(args.inputs).length > 0) options.inputs = args.inputs;

    const run = await provider.triggerRun(args.repo, args.pipelineId, options);

    if (args.format === 'json') {
      console.log(JSON.stringify(run, null, 2));
    } else {
      console.log(formatRun(run));
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
