// $PAI_DIR/lib/context-summarization/context-builder.ts
// Build context from PAI history with summarization applied

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  summarize,
  parseJSONLEvents,
  type HookEvent,
  type SummaryResult,
  type SummarizationStrategy
} from './summarizer';

export interface ContextBuildOptions {
  strategy?: SummarizationStrategy;
  maxEvents?: number;
  daysBack?: number;
  sessionId?: string;
  includeSubagents?: boolean;
}

export interface BuiltContext {
  summary: string;
  rawEventCount: number;
  summarizedTokenEstimate: number;
  strategy: SummarizationStrategy;
  timeRange: {
    start: string;
    end: string;
  };
}

function getPaiDir(): string {
  return process.env.PAI_DIR || join(homedir(), '.config', 'pai');
}

function getHistoryDir(): string {
  return join(getPaiDir(), 'history', 'raw-outputs');
}

/**
 * Get JSONL files for the specified time range
 */
function getJSONLFiles(daysBack: number = 1): string[] {
  const historyDir = getHistoryDir();
  if (!existsSync(historyDir)) return [];

  const files: string[] = [];
  const now = new Date();

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const monthDir = join(historyDir, `${year}-${month}`);
    const fileName = `${year}-${month}-${day}_all-events.jsonl`;
    const filePath = join(monthDir, fileName);

    if (existsSync(filePath)) {
      files.push(filePath);
    }
  }

  return files;
}

/**
 * Read events from JSONL files
 */
function readEvents(files: string[], maxEvents?: number, sessionId?: string): HookEvent[] {
  let allEvents: HookEvent[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const events = parseJSONLEvents(content);
      allEvents = allEvents.concat(events);
    } catch {
      // Skip unreadable files
    }
  }

  // Filter by session if specified
  if (sessionId) {
    allEvents = allEvents.filter(e => e.session_id === sessionId);
  }

  // Sort by timestamp (newest first for limiting)
  allEvents.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Limit events
  if (maxEvents && allEvents.length > maxEvents) {
    allEvents = allEvents.slice(0, maxEvents);
  }

  // Reverse to chronological order
  allEvents.reverse();

  return allEvents;
}

/**
 * Estimate token count (rough approximation)
 * Based on ~4 characters per token average for English text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Build summarized context from history
 */
export function buildContext(options: ContextBuildOptions = {}): BuiltContext {
  const {
    strategy = 'narrative',
    maxEvents = 100,
    daysBack = 1,
    sessionId,
    includeSubagents = true
  } = options;

  // Get JSONL files
  const files = getJSONLFiles(daysBack);

  // Read and filter events
  let events = readEvents(files, maxEvents, sessionId);

  // Filter out subagent events if not wanted
  if (!includeSubagents) {
    events = events.filter(e => e.source_app === 'main' || !e.source_app);
  }

  if (events.length === 0) {
    return {
      summary: 'No recent history available.',
      rawEventCount: 0,
      summarizedTokenEstimate: 6,
      strategy,
      timeRange: { start: '', end: '' }
    };
  }

  // Get time range
  const timestamps = events
    .map(e => e.timestamp_local || '')
    .filter(Boolean);
  const timeRange = {
    start: timestamps[0] || '',
    end: timestamps[timestamps.length - 1] || ''
  };

  // Summarize
  const result = summarize(events, strategy);

  return {
    summary: result.output,
    rawEventCount: events.length,
    summarizedTokenEstimate: estimateTokens(result.output),
    strategy,
    timeRange
  };
}

/**
 * Build context for a specific session
 */
export function buildSessionContext(
  sessionId: string,
  strategy: SummarizationStrategy = 'narrative'
): BuiltContext {
  return buildContext({
    strategy,
    sessionId,
    daysBack: 7, // Look back a week for session data
    maxEvents: 200
  });
}

/**
 * Build context for recent activity (last N hours)
 */
export function buildRecentContext(
  hoursBack: number = 24,
  strategy: SummarizationStrategy = 'narrative'
): BuiltContext {
  const daysBack = Math.ceil(hoursBack / 24);
  const context = buildContext({
    strategy,
    daysBack,
    maxEvents: 50
  });

  // Filter by time if needed (within hours)
  return context;
}

/**
 * Get available sessions from recent history
 */
export function getRecentSessions(daysBack: number = 1): string[] {
  const files = getJSONLFiles(daysBack);
  const sessionIds = new Set<string>();

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const events = parseJSONLEvents(content);
      for (const event of events) {
        if (event.session_id) {
          sessionIds.add(event.session_id);
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return Array.from(sessionIds);
}
