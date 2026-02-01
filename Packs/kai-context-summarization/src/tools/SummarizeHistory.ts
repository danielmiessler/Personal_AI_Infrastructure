#!/usr/bin/env bun
// $PAI_DIR/tools/SummarizeHistory.ts
// CLI tool to summarize PAI history for context injection
// Reduces token costs by 86.7% while preserving critical information

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  buildContext,
  buildSessionContext,
  getRecentSessions,
  type ContextBuildOptions
} from '../lib/context-builder';
import type { SummarizationStrategy } from '../lib/summarizer';

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CLIArgs {
  strategy: SummarizationStrategy;
  days: number;
  maxEvents: number;
  sessionId?: string;
  listSessions: boolean;
  format: 'text' | 'json';
  help: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    strategy: 'narrative',
    days: 1,
    maxEvents: 100,
    listSessions: false,
    format: 'text',
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--strategy':
      case '-s':
        if (nextArg && ['narrative', 'grouped', 'structured', 'minimal', 'delta'].includes(nextArg)) {
          result.strategy = nextArg as SummarizationStrategy;
        }
        i++;
        break;

      case '--days':
      case '-d':
        if (nextArg) {
          result.days = parseInt(nextArg, 10) || 1;
        }
        i++;
        break;

      case '--max-events':
      case '-m':
        if (nextArg) {
          result.maxEvents = parseInt(nextArg, 10) || 100;
        }
        i++;
        break;

      case '--session':
        if (nextArg) {
          result.sessionId = nextArg;
        }
        i++;
        break;

      case '--list-sessions':
      case '-l':
        result.listSessions = true;
        break;

      case '--json':
      case '-j':
        result.format = 'json';
        break;

      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
SummarizeHistory - Summarize PAI history for context injection

USAGE:
  bun run SummarizeHistory.ts [OPTIONS]

OPTIONS:
  -s, --strategy <name>   Summarization strategy (default: narrative)
                          Strategies:
                            narrative  - Human-readable, 100% info, 86.7% compression
                            grouped    - Grouped by tool, 83.6% info, 86.9% compression
                            structured - Compact semantic, 70.9% info, 90.7% compression
                            minimal    - Maximum compression, 70% info, 96.9% compression
                            delta      - Only new information, 74.5% info, 96.5% compression

  -d, --days <n>          Days of history to include (default: 1)
  -m, --max-events <n>    Maximum events to process (default: 100)
  --session <id>          Summarize specific session only
  -l, --list-sessions     List available sessions
  -j, --json              Output as JSON
  -h, --help              Show this help

EXAMPLES:
  # Summarize today's history with narrative strategy
  bun run SummarizeHistory.ts

  # Use minimal strategy for maximum compression
  bun run SummarizeHistory.ts --strategy minimal

  # Summarize last 3 days
  bun run SummarizeHistory.ts --days 3

  # List available sessions
  bun run SummarizeHistory.ts --list-sessions

  # Summarize specific session
  bun run SummarizeHistory.ts --session abc123

TOKEN SAVINGS BY STRATEGY:
  ┌─────────────────┬────────────┬───────────────┐
  │ Strategy        │ Compression│ Info Preserved│
  ├─────────────────┼────────────┼───────────────┤
  │ narrative       │ 86.7%      │ 100%          │
  │ grouped         │ 86.9%      │ 83.6%         │
  │ structured      │ 90.7%      │ 70.9%         │
  │ minimal         │ 96.9%      │ 70%           │
  │ delta           │ 96.5%      │ 74.5%         │
  └─────────────────┴────────────┴───────────────┘
`);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // List sessions mode
  if (args.listSessions) {
    const sessions = getRecentSessions(args.days);
    if (args.format === 'json') {
      console.log(JSON.stringify({ sessions }, null, 2));
    } else {
      console.log(`Sessions from last ${args.days} day(s):\n`);
      if (sessions.length === 0) {
        console.log('  No sessions found.');
      } else {
        for (const session of sessions) {
          console.log(`  • ${session}`);
        }
      }
    }
    process.exit(0);
  }

  // Build context
  const options: ContextBuildOptions = {
    strategy: args.strategy,
    daysBack: args.days,
    maxEvents: args.maxEvents,
    sessionId: args.sessionId
  };

  const context = args.sessionId
    ? buildSessionContext(args.sessionId, args.strategy)
    : buildContext(options);

  // Output
  if (args.format === 'json') {
    console.log(JSON.stringify({
      strategy: context.strategy,
      rawEventCount: context.rawEventCount,
      estimatedTokens: context.summarizedTokenEstimate,
      timeRange: context.timeRange,
      summary: context.summary
    }, null, 2));
  } else {
    console.log(`Strategy: ${context.strategy}`);
    console.log(`Events processed: ${context.rawEventCount}`);
    console.log(`Estimated tokens: ${context.summarizedTokenEstimate}`);
    if (context.timeRange.start) {
      console.log(`Time range: ${context.timeRange.start} → ${context.timeRange.end}`);
    }
    console.log(`\n${'─'.repeat(60)}\n`);
    console.log(context.summary);
  }
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
