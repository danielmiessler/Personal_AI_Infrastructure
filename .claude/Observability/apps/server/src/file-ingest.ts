#!/usr/bin/env bun
/**
 * File-based Event Streaming (In-Memory Only)
 * Watches JSONL files from capture-all-events.ts hook
 * NO DATABASE - streams directly to WebSocket clients
 * Fresh start each time - no persistence
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

// NEW: Agent session mapping (session_id -> agent_name)
const agentSessions = new Map<string, string>();

// NEW: Todo tracking per session (session_id -> current todos)
const sessionTodos = new Map<string, any[]>();

/**
 * Get the path to today's all-events file
 */
function getTodayEventsFile(): string {
  const paiDir = join(homedir(), '.claude');
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
        let event = JSON.parse(line);
        // Add auto-incrementing ID for UI
        event.id = events.length + newEvents.length + 1;
        // Enrich with agent name
        event = enrichEventWithAgentName(event);
        // Process todo events (returns array of events)
        const processedEvents = processTodoEvent(event);
        // Reassign IDs for any synthetic events
        for (let i = 0; i < processedEvents.length; i++) {
          processedEvents[i].id = events.length + newEvents.length + i + 1;
        }
        newEvents.push(...processedEvents);
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
 * Load agent sessions from agent-sessions.json
 */
function loadAgentSessions(): void {
  const sessionsFile = join(homedir(), '.claude', 'agent-sessions.json');

  if (!existsSync(sessionsFile)) {
    console.log('⚠️  agent-sessions.json not found, agent names will be "unknown"');
    return;
  }

  try {
    const content = readFileSync(sessionsFile, 'utf-8');
    const data = JSON.parse(content);

    agentSessions.clear();
    Object.entries(data).forEach(([sessionId, agentName]) => {
      agentSessions.set(sessionId, agentName as string);
    });

    console.log(`✅ Loaded ${agentSessions.size} agent sessions`);
  } catch (error) {
    console.error('❌ Error loading agent-sessions.json:', error);
  }
}

/**
 * Watch agent-sessions.json for changes
 */
function watchAgentSessions(): void {
  const sessionsFile = join(homedir(), '.claude', 'agent-sessions.json');

  if (!existsSync(sessionsFile)) {
    console.log('⚠️  agent-sessions.json not found, skipping watch');
    return;
  }

  console.log('👀 Watching agent-sessions.json for changes');

  const watcher = watch(sessionsFile, (eventType) => {
    if (eventType === 'change') {
      console.log('🔄 agent-sessions.json changed, reloading...');
      loadAgentSessions();
    }
  });

  watcher.on('error', (error) => {
    console.error('❌ Error watching agent-sessions.json:', error);
  });
}

/**
 * Enrich event with agent name from session mapping
 */
function enrichEventWithAgentName(event: HookEvent): HookEvent {
  // Special case: UserPromptSubmit events are from the user, not the agent
  if (event.hook_event_type === 'UserPromptSubmit') {
    return {
      ...event,
      agent_name: 'User'
    };
  }

  // Default to DA name for main agent sessions (from settings.json env)
  const mainAgentName = process.env.DA || 'main';
  const agentName = agentSessions.get(event.session_id) || mainAgentName;
  return {
    ...event,
    agent_name: agentName
  };
}

/**
 * Process todo events and detect completions
 * Returns array of events: original event + synthetic completion events
 */
function processTodoEvent(event: HookEvent): HookEvent[] {
  // Only process TodoWrite tool events
  if (event.payload.tool_name !== 'TodoWrite') {
    return [event];
  }

  // Extract todos from the event
  const currentTodos = event.payload.tool_input?.todos || [];

  // Get previous todos for this session
  const previousTodos = sessionTodos.get(event.session_id) || [];

  // Find newly completed todos
  const completedTodos = [];

  for (const currentTodo of currentTodos) {
    if (currentTodo.status === 'completed') {
      // Check if this todo was NOT completed in the previous state
      const prevTodo = previousTodos.find((t: any) => t.content === currentTodo.content);
      if (!prevTodo || prevTodo.status !== 'completed') {
        completedTodos.push(currentTodo);
      }
    }
  }

  // Update session todos
  sessionTodos.set(event.session_id, currentTodos);

  // Create synthetic completion events
  const events: HookEvent[] = [event];

  for (const completedTodo of completedTodos) {
    const completionEvent: HookEvent = {
      ...event,
      id: event.id,  // Will be reassigned by caller
      hook_event_type: 'Completed',
      payload: {
        task: completedTodo.content
      },
      summary: undefined, // Don't duplicate - toolInfo.detail shows the task
      timestamp: event.timestamp
    };
    events.push(completionEvent);
  }

  return events;
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

  // Load and watch agent sessions for name enrichment
  loadAgentSessions();
  watchAgentSessions();

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
