/**
 * File-based Event Streaming for Observability
 * Watches JSONL files from Claude Code hooks
 * Reads events from: ${HOME}/.claude/history/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl
 */

import { watch, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, unknown>;
  timestamp?: number;
  timestamp_pst?: string;
}

// In-memory event store (last N events only)
const MAX_EVENTS = 500;
const events: HookEvent[] = [];

// Track the last read position for each file
const filePositions = new Map<string, number>();

// Track which files we're currently watching
const watchedFiles = new Set<string>();

// Connected WebSocket clients
const wsClients = new Set<any>();

// Track current file being watched
let currentFile: string | null = null;

/**
 * Get the path to today's all-events file
 */
function getTodayEventsFile(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const now = new Date();
  // Convert to PST
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');

  const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);
  return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

/**
 * Read new events from a JSONL file starting from a given position
 */
function readNewEvents(filePath: string): HookEvent[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const lastPosition = filePositions.get(filePath) || 0;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const newContent = content.slice(lastPosition);

    // Update position to end of file
    filePositions.set(filePath, content.length);

    if (!newContent.trim()) {
      return [];
    }

    // Parse JSONL - one JSON object per line
    const lines = newContent.trim().split('\n');
    const newEvents: HookEvent[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line);
        // Add auto-incrementing ID for UI
        event.id = events.length + newEvents.length + 1;
        newEvents.push(event);
      } catch (error) {
        console.error(`[Observability] Failed to parse line: ${line.slice(0, 100)}...`);
      }
    }

    return newEvents;
  } catch (error) {
    console.error(`[Observability] Error reading file ${filePath}:`, error);
    return [];
  }
}

/**
 * Broadcast events to all connected WebSocket clients
 */
function broadcastEvents(newEvents: HookEvent[]): void {
  wsClients.forEach(client => {
    try {
      for (const event of newEvents) {
        client.send(JSON.stringify({ type: 'event', data: event }));
      }
    } catch (err) {
      // Client disconnected, remove from set
      wsClients.delete(client);
    }
  });
}

/**
 * Add events to in-memory store (keeping last MAX_EVENTS only)
 */
function storeEvents(newEvents: HookEvent[]): void {
  if (newEvents.length === 0) return;

  // Add to in-memory array
  events.push(...newEvents);

  // Keep only last MAX_EVENTS
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  console.log(`[Observability] Received ${newEvents.length} event(s) (${events.length} in memory)`);

  // Broadcast to WebSocket clients
  broadcastEvents(newEvents);
}

/**
 * Watch a file for changes and stream new events
 */
function watchFile(filePath: string): void {
  if (watchedFiles.has(filePath)) {
    return; // Already watching
  }

  console.log(`[Observability] Watching: ${filePath}`);
  watchedFiles.add(filePath);

  // Set file position to END of file - only read NEW events from now on
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    filePositions.set(filePath, content.length);
    console.log(`[Observability] Positioned at end of file - only new events will be captured`);
  }

  // Watch for changes
  const watcher = watch(filePath, (eventType) => {
    if (eventType === 'change') {
      const newEvents = readNewEvents(filePath);
      storeEvents(newEvents);
    }
  });

  watcher.on('error', (error) => {
    console.error(`[Observability] Error watching ${filePath}:`, error);
    watchedFiles.delete(filePath);
  });
}

/**
 * Initialize observability - start watching event files
 */
export function initObservability(): void {
  console.log('[Observability] Starting file-based event streaming');
  console.log('[Observability] Reading from ~/.claude/history/raw-outputs/');

  // Watch today's file
  const todayFile = getTodayEventsFile();
  currentFile = todayFile;

  if (existsSync(todayFile)) {
    watchFile(todayFile);
  } else {
    console.log(`[Observability] Today's file not found: ${todayFile}`);
    console.log('[Observability] Will start capturing when events are generated');

    // Check periodically for the file to appear
    const checkInterval = setInterval(() => {
      const file = getTodayEventsFile();
      if (existsSync(file) && !watchedFiles.has(file)) {
        watchFile(file);
        clearInterval(checkInterval);
      }
    }, 5000);
  }

  // Check for new day's file periodically
  setInterval(() => {
    const newTodayFile = getTodayEventsFile();
    if (newTodayFile !== currentFile) {
      console.log('[Observability] New day detected, watching new file');
      currentFile = newTodayFile;
      if (existsSync(newTodayFile)) {
        watchFile(newTodayFile);
      }
    }
  }, 60 * 60 * 1000); // Check every hour

  console.log('[Observability] File streaming initialized');
}

/**
 * Add a WebSocket client for event streaming
 */
export function addObservabilityClient(ws: any): void {
  wsClients.add(ws);
  console.log(`[Observability] Client connected (${wsClients.size} total)`);

  // Send recent events on connection
  try {
    ws.send(JSON.stringify({ type: 'initial', data: events.slice(-50).reverse() }));
  } catch (err) {
    console.error('[Observability] Failed to send initial events');
  }
}

/**
 * Remove a WebSocket client
 */
export function removeObservabilityClient(ws: any): void {
  wsClients.delete(ws);
  console.log(`[Observability] Client disconnected (${wsClients.size} remaining)`);
}

/**
 * Get recent events
 */
export function getRecentEvents(limit: number = 100): HookEvent[] {
  return events.slice(-limit).reverse();
}
