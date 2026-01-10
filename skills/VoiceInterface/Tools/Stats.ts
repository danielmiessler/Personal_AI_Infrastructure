#!/usr/bin/env bun
/**
 * Stats.ts - Voice usage analytics from JSONL logs
 * Does ONE thing: Analyzes voice session history
 *
 * Usage:
 *   bun run Stats.ts [--since "24h"] [--format json|table]
 */

import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface StatsOptions {
  since?: string;
  format: 'json' | 'table';
  logFile?: string;
}

interface SessionEvent {
  timestamp: string;
  session_id: string;
  event: string;
  [key: string]: any;
}

interface SessionStats {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  avgLatency: number;
  avgTranscriptionConfidence: number;
  providers: Record<string, number>;
  errors: Record<string, number>;
  sessions: Array<{
    session_id: string;
    timestamp: string;
    latency_ms: number;
    success: boolean;
    error?: string;
  }>;
}

function parseArgs(): StatsOptions {
  const args = process.argv.slice(2);
  const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

  const opts: StatsOptions = {
    format: 'table',
    logFile: join(PAI_DIR, 'history', 'voice-sessions.jsonl'),
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--since' && args[i + 1]) {
      opts.since = args[i + 1];
      i++;
    } else if (args[i] === '--format' && args[i + 1]) {
      opts.format = args[i + 1] as 'json' | 'table';
      i++;
    } else if (args[i] === '--log-file' && args[i + 1]) {
      opts.logFile = args[i + 1];
      i++;
    } else if (args[i] === '--help') {
      console.log(`Usage: bun run Stats.ts [options]

Options:
  --since TIME     Filter by time (e.g., "24h", "7d", "2026-01-01")
  --format FORMAT  Output format: json|table (default: table)
  --log-file FILE  JSONL log file (default: ~/.claude/history/voice-sessions.jsonl)
  --help          Show this help

Examples:
  bun run Stats.ts --since "24h"
  bun run Stats.ts --format json
  bun run Stats.ts --since "7d" --format table
`);
      process.exit(0);
    }
  }

  return opts;
}

function parseSinceFilter(since?: string): Date | null {
  if (!since) return null;

  const now = new Date();

  // Parse relative time (24h, 7d, etc.)
  const match = since.match(/^(\d+)([hdwm])$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'd': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Parse absolute date
  const date = new Date(since);
  if (!isNaN(date.getTime())) {
    return date;
  }

  return null;
}

function analyzeStats(opts: StatsOptions): SessionStats {
  if (!existsSync(opts.logFile!)) {
    throw new Error(`Log file not found: ${opts.logFile}`);
  }

  const content = readFileSync(opts.logFile!, 'utf-8');
  const lines = content.trim().split('\n').filter(l => l.length > 0);

  const events: SessionEvent[] = lines.map(line => JSON.parse(line));

  // Filter by time
  const sinceDate = parseSinceFilter(opts.since);
  const filteredEvents = sinceDate
    ? events.filter(e => new Date(e.timestamp) >= sinceDate)
    : events;

  // Group by session_id
  const sessions = new Map<string, SessionEvent[]>();
  filteredEvents.forEach(event => {
    if (!sessions.has(event.session_id)) {
      sessions.set(event.session_id, []);
    }
    sessions.get(event.session_id)!.push(event);
  });

  const stats: SessionStats = {
    totalSessions: sessions.size,
    successfulSessions: 0,
    failedSessions: 0,
    avgLatency: 0,
    avgTranscriptionConfidence: 0,
    providers: {},
    errors: {},
    sessions: [],
  };

  let totalLatency = 0;
  let latencyCount = 0;
  let totalConfidence = 0;
  let confidenceCount = 0;

  sessions.forEach((sessionEvents, sessionId) => {
    const completeEvent = sessionEvents.find(e => e.event === 'complete');
    const errorEvent = sessionEvents.find(e => e.event === 'error');
    const transcribeEvent = sessionEvents.find(e => e.event === 'transcribe');

    const success = !!completeEvent && !errorEvent;
    if (success) stats.successfulSessions++;
    else stats.failedSessions++;

    const latency = completeEvent?.total_latency_ms || 0;
    if (latency > 0) {
      totalLatency += latency;
      latencyCount++;
    }

    if (transcribeEvent?.confidence) {
      totalConfidence += transcribeEvent.confidence;
      confidenceCount++;
    }

    if (transcribeEvent?.provider) {
      stats.providers[transcribeEvent.provider] = (stats.providers[transcribeEvent.provider] || 0) + 1;
    }

    if (errorEvent?.error_type) {
      stats.errors[errorEvent.error_type] = (stats.errors[errorEvent.error_type] || 0) + 1;
    }

    stats.sessions.push({
      session_id: sessionId,
      timestamp: sessionEvents[0].timestamp,
      latency_ms: latency,
      success,
      error: errorEvent?.error_type,
    });
  });

  stats.avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
  stats.avgTranscriptionConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

  return stats;
}

function formatTable(stats: SessionStats): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════');
  lines.push('  Voice Interface Statistics');
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Sessions:     ${stats.totalSessions}`);
  lines.push(`Successful:         ${stats.successfulSessions} (${((stats.successfulSessions / stats.totalSessions) * 100).toFixed(1)}%)`);
  lines.push(`Failed:             ${stats.failedSessions}`);
  lines.push(`Avg Latency:        ${(stats.avgLatency / 1000).toFixed(2)}s`);
  lines.push(`Avg Confidence:     ${(stats.avgTranscriptionConfidence * 100).toFixed(1)}%`);
  lines.push('');

  if (Object.keys(stats.providers).length > 0) {
    lines.push('Transcription Providers:');
    Object.entries(stats.providers).forEach(([provider, count]) => {
      lines.push(`  - ${provider}: ${count}`);
    });
    lines.push('');
  }

  if (Object.keys(stats.errors).length > 0) {
    lines.push('Error Types:');
    Object.entries(stats.errors).forEach(([error, count]) => {
      lines.push(`  - ${error}: ${count}`);
    });
    lines.push('');
  }

  lines.push('Recent Sessions:');
  stats.sessions.slice(-10).reverse().forEach((session, i) => {
    const status = session.success ? '✅' : '❌';
    const latency = session.latency_ms > 0 ? `${(session.latency_ms / 1000).toFixed(1)}s` : 'N/A';
    lines.push(`  ${status} ${new Date(session.timestamp).toLocaleString()} | ${latency}`);
  });

  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

// Main
const opts = parseArgs();

try {
  const stats = analyzeStats(opts);

  if (opts.format === 'json') {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(formatTable(stats));
  }
} catch (err: any) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
