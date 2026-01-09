#!/usr/bin/env bun
/**
 * List Runs CLI Tool
 *
 * Usage:
 *   bun run runs.ts <repo>
 *                   [--status pending|queued|running|completed]
 *                   [--branch <name>]
 *                   [--limit <num>]
 *                   [--format table|json]
 */

import { getCICDProvider, type Run, type RunQuery, type RunStatus } from 'mai-cicd-core';

function parseArgs(args: string[]): {
  repo?: string;
  status?: RunStatus;
  branch?: string;
  limit?: number;
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--status':
          result.status = next as RunStatus;
          i++;
          break;
        case '--branch':
          result.branch = next;
          i++;
          break;
        case '--limit':
          result.limit = parseInt(next, 10);
          i++;
          break;
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

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatStatus(run: Run): string {
  if (run.status === 'completed') {
    return run.conclusion || 'completed';
  }
  return run.status;
}

function formatTable(runs: Run[]): string {
  if (runs.length === 0) {
    return 'No runs found.';
  }

  const lines = ['ID\t\tStatus\t\tBranch\t\tDuration\tPipeline'];
  lines.push('-'.repeat(90));

  for (const run of runs) {
    const id = run.id.slice(0, 8).padEnd(8);
    const status = formatStatus(run).padEnd(12);
    const branch = (run.branch || '-').slice(0, 12).padEnd(12);
    const duration = formatDuration(run.duration).padEnd(8);
    const pipeline = run.pipelineName?.slice(0, 20) || '-';
    lines.push(`${id}\t${status}\t${branch}\t${duration}\t${pipeline}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.repo) {
    console.error('Usage: bun run runs.ts <repo> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --status <status>   Filter by status (pending, queued, running, completed)');
    console.error('  --branch <name>     Filter by branch');
    console.error('  --limit <num>       Limit results (default: 20)');
    console.error('  --format <fmt>      Output format (table, json)');
    console.error('');
    console.error('Example: bun run runs.ts owner/repo --status running');
    process.exit(1);
  }

  try {
    const provider = await getCICDProvider();

    const query: RunQuery = {};
    if (args.status) query.status = args.status;
    if (args.branch) query.branch = args.branch;
    if (args.limit) query.limit = args.limit;

    const runs = await provider.listRuns(args.repo, query);

    if (args.format === 'json') {
      console.log(JSON.stringify(runs, null, 2));
    } else {
      console.log(formatTable(runs));
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
