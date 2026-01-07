#!/usr/bin/env bun
/**
 * Get Job Logs CLI Tool
 *
 * Usage:
 *   bun run logs.ts <repo> <job-id>
 *                   [--tail <lines>]
 */

import { getCICDProvider } from 'kai-cicd-core';

function parseArgs(args: string[]): {
  repo?: string;
  jobId?: string;
  tail?: number;
} {
  const result: ReturnType<typeof parseArgs> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg.startsWith('--')) {
      switch (arg) {
        case '--tail':
          result.tail = parseInt(next, 10);
          i++;
          break;
      }
    } else {
      positional.push(arg);
    }
  }

  result.repo = positional[0];
  result.jobId = positional[1];

  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.repo || !args.jobId) {
    console.error('Usage: bun run logs.ts <repo> <job-id> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --tail <lines>      Show only last N lines');
    console.error('');
    console.error('Example: bun run logs.ts owner/repo 67890 --tail 100');
    process.exit(1);
  }

  try {
    const provider = await getCICDProvider();
    let logs = await provider.getJobLogs(args.repo, args.jobId);

    if (args.tail) {
      const lines = logs.split('\n');
      logs = lines.slice(-args.tail).join('\n');
    }

    console.log(logs);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
