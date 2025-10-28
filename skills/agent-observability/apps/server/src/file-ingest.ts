#!/usr/bin/env bun
/**
 * File-based Event Streaming (In-Memory Only)
 * Watches JSONL files from capture-all-events.ts hook
 * NO DATABASE - streams directly to WebSocket clients
 * Fresh start each time - no persistence
 *
 * ENVIRONMENT VARIABLES:
 * - PAI_DIR: Path to your PAI directory (defaults to ~/.claude/)
 *   Example: export PAI_DIR="/Users/yourname/.claude"
 *
 * Reads events from: ${PAI_DIR}/history/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl
 */

import { watch, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { HookEvent } from './types';

// In-memory event store (last N events only)
const MAX_EVENTS = 1000;
const events: HookEvent[] = [];

// Track the last read position for each file
const filePositions = new Map<string, number>();

// Track which files we're currently watching
const watchedFiles = new Set<string>();

// Callback for when new events arrive (for WebSocket broadcasting)
let onEventsReceived: ((events: HookEvent[]) => void) | null = null;

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
        console.error(`Failed to parse line: ${line.slice(0, 100)}...`, error);
      }
    }

    return newEvents;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
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

  console.log(`✅ Received ${newEvents.length} event(s) (${events.length} in memory)`);

  // Notify subscribers (WebSocket clients)
  if (onEventsReceived) {
    onEventsReceived(newEvents);
  }
}

/**
 * Watch a file for changes and stream new events
 */
function watchFile(filePath: string): void {
  if (watchedFiles.has(filePath)) {
    return; // Already watching
  }

  console.log(`👀 Watching: ${filePath}`);
  watchedFiles.add(filePath);

  // Set file position to END of file - only read NEW events from now on
  // Do NOT load historical events from before server start
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    filePositions.set(filePath, content.length);
    console.log(`📍 Positioned at end of file - only new events will be captured`);
  }

  // Watch for changes
  const watcher = watch(filePath, (eventType) => {
    if (eventType === 'change') {
      const newEvents = readNewEvents(filePath);
      storeEvents(newEvents);
    }
  });

  watcher.on('error', (error) => {
    console.error(`Error watching ${filePath}:`, error);
    watchedFiles.delete(filePath);
  });
}

/**
 * Start watching for events
 * @param callback Optional callback to be notified when new events arrive
 */
export function startFileIngestion(callback?: (events: HookEvent[]) => void): void {
  console.log('🚀 Starting file-based event streaming (in-memory only)');
  console.log('📂 Reading from ~/.claude/history/raw-outputs/');

  // Set the callback for event notifications
  if (callback) {
    onEventsReceived = callback;
  }

  // Watch today's file
  const todayFile = getTodayEventsFile();
  watchFile(todayFile);

  // Check for new day's file every hour
  setInterval(() => {
    const newTodayFile = getTodayEventsFile();
    if (newTodayFile !== todayFile) {
      console.log('📅 New day detected, watching new file');
      watchFile(newTodayFile);
    }
  }, 60 * 60 * 1000); // Check every hour

  console.log('✅ File streaming started');
}

/**
 * Get all events currently in memory
 */
export function getRecentEvents(limit: number = 100): HookEvent[] {
  return events.slice(-limit).reverse();
}

/**
 * Get filter options from in-memory events
 */
export function getFilterOptions() {
  const sourceApps = new Set<string>();
  const sessionIds = new Set<string>();
  const hookEventTypes = new Set<string>();

  for (const event of events) {
    if (event.source_app) sourceApps.add(event.source_app);
    if (event.session_id) sessionIds.add(event.session_id);
    if (event.hook_event_type) hookEventTypes.add(event.hook_event_type);
  }

  return {
    source_apps: Array.from(sourceApps).sort(),
    session_ids: Array.from(sessionIds).slice(0, 100),
    hook_event_types: Array.from(hookEventTypes).sort()
  };
}

// For testing - can be run directly
if (import.meta.main) {
  startFileIngestion();

  console.log('Press Ctrl+C to stop');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
  });
}
