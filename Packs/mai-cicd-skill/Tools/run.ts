#!/usr/bin/env bun
/**
 * Get Run Details CLI Tool
 *
 * Usage:
 *   bun run run.ts <repo> <run-id>
 *                  [--jobs]
 *                  [--format table|json]
 */

import { getCICDProvider, type Run, type Job } from 'mai-cicd-core';

function parseArgs(args: string[]): {
  repo?: string;
  runId?: string;
  jobs: boolean;
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { jobs: false, format: 'table' };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--jobs':
          result.jobs = true;
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
  result.runId = positional[1];

  return result;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatRun(run: Run): string {
  const lines: string[] = [];

  lines.push(`Run: ${run.id}`);
  lines.push('-'.repeat(60));
  lines.push(`Pipeline:    ${run.pipelineName || run.pipelineId}`);
  lines.push(`Status:      ${run.status}${run.conclusion ? ` (${run.conclusion})` : ''}`);
  lines.push(`Branch:      ${run.branch || '-'}`);
  lines.push(`Commit:      ${run.commit?.slice(0, 8) || '-'}`);
  lines.push(`Triggered:   ${run.triggerEvent || '-'} by ${run.triggeredBy || 'unknown'}`);
  lines.push(`Duration:    ${formatDuration(run.duration)}`);

  if (run.startedAt) {
    lines.push(`Started:     ${run.startedAt.toISOString()}`);
  }
  if (run.completedAt) {
    lines.push(`Completed:   ${run.completedAt.toISOString()}`);
  }
  if (run.url) {
    lines.push(`URL:         ${run.url}`);
  }

  return lines.join('\n');
}

function formatJobs(jobs: Job[]): string {
  if (jobs.length === 0) {
    return '\nNo jobs found.';
  }

  const lines: string[] = ['\nJobs:', '-'.repeat(60)];
  lines.push('ID\t\tStatus\t\tDuration\tName');
  lines.push('-'.repeat(60));

  for (const job of jobs) {
    const id = job.id.slice(0, 8).padEnd(8);
    const status = (job.conclusion || job.status).padEnd(12);
    const duration = formatDuration(job.duration).padEnd(8);
    const name = job.name.slice(0, 30);
    lines.push(`${id}\t${status}\t${duration}\t${name}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.repo || !args.runId) {
    console.error('Usage: bun run run.ts <repo> <run-id> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --jobs              Include job details');
    console.error('  --format <fmt>      Output format (table, json)');
    console.error('');
    console.error('Example: bun run run.ts owner/repo 12345 --jobs');
    process.exit(1);
  }

  try {
    const provider = await getCICDProvider();
    const run = await provider.getRun(args.repo, args.runId);

    let jobs: Job[] = [];
    if (args.jobs) {
      jobs = await provider.listJobs(args.repo, args.runId);
    }

    if (args.format === 'json') {
      console.log(JSON.stringify({ run, jobs: args.jobs ? jobs : undefined }, null, 2));
    } else {
      console.log(formatRun(run));
      if (args.jobs) {
        console.log(formatJobs(jobs));
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
