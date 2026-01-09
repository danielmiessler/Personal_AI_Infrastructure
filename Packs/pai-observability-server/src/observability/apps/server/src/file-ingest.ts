// $PAI_DIR/observability/apps/server/src/file-ingest.ts
// File-based event streaming - watches JSONL files

import { watch, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { HookEvent } from './types';

const MAX_EVENTS = 1000;
const events: HookEvent[] = [];
const filePositions = new Map<string, number>();
const watchedFiles = new Set<string>();
let onEventsReceived: ((events: HookEvent[]) => void) | null = null;
const agentSessions = new Map<string, string>();
const sessionTodos = new Map<string, any[]>();

function getTodayEventsFile(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const now = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');

    const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);
    return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
  } catch {
    // Fallback to UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return join(paiDir, 'history', 'raw-outputs', `${year}-${month}`, `${year}-${month}-${day}_all-events.jsonl`);
  }
}

function enrichEventWithAgentName(event: HookEvent): HookEvent {
  if (event.hook_event_type === 'UserPromptSubmit') {
    return { ...event, agent_name: 'User' };
  }

  const mainAgentName = process.env.DA || 'main';
  const subAgentTypes = ['artist', 'intern', 'engineer', 'pentester', 'architect', 'designer', 'qatester', 'researcher'];

  if (event.source_app && subAgentTypes.includes(event.source_app.toLowerCase())) {
    const capitalizedName = event.source_app.charAt(0).toUpperCase() + event.source_app.slice(1);
    return { ...event, agent_name: capitalizedName };
  }

  const agentName = agentSessions.get(event.session_id) || mainAgentName;
  return { ...event, agent_name: agentName };
}

function processTodoEvent(event: HookEvent): HookEvent[] {
  if (event.payload.tool_name !== 'TodoWrite') {
    return [event];
  }

  const currentTodos = event.payload.tool_input?.todos || [];
  const previousTodos = sessionTodos.get(event.session_id) || [];
  const completedTodos = [];

  for (const currentTodo of currentTodos) {
    if (currentTodo.status === 'completed') {
      const prevTodo = previousTodos.find((t: any) => t.content === currentTodo.content);
      if (!prevTodo || prevTodo.status !== 'completed') {
        completedTodos.push(currentTodo);
      }
    }
  }

  sessionTodos.set(event.session_id, currentTodos);
  const events: HookEvent[] = [event];

  for (const completedTodo of completedTodos) {
    const completionEvent: HookEvent = {
      ...event,
      id: event.id,
      hook_event_type: 'Completed',
      payload: { task: completedTodo.content },
      summary: undefined,
      timestamp: event.timestamp
    };
    events.push(completionEvent);
  }

  return events;
}

function readNewEvents(filePath: string): HookEvent[] {
  if (!existsSync(filePath)) return [];

  const lastPosition = filePositions.get(filePath) || 0;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const newContent = content.slice(lastPosition);
    filePositions.set(filePath, content.length);

    if (!newContent.trim()) return [];

    const lines = newContent.trim().split('\n');
    const newEvents: HookEvent[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        let event = JSON.parse(line);
        event.id = events.length + newEvents.length + 1;
        event = enrichEventWithAgentName(event);
        const processedEvents = processTodoEvent(event);

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

function storeEvents(newEvents: HookEvent[]): void {
  if (newEvents.length === 0) return;

  events.push(...newEvents);

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  console.log(`✅ Received ${newEvents.length} event(s) (${events.length} in memory)`);

  if (onEventsReceived) {
    onEventsReceived(newEvents);
  }
}

function loadAgentSessions(): void {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const sessionsFile = join(paiDir, 'agent-sessions.json');

  if (!existsSync(sessionsFile)) {
    console.log('⚠️  agent-sessions.json not found, agent names will use defaults');
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

function watchAgentSessions(): void {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const sessionsFile = join(paiDir, 'agent-sessions.json');

  if (!existsSync(sessionsFile)) return;

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

function watchFile(filePath: string): void {
  if (watchedFiles.has(filePath)) return;

  console.log(`👀 Watching: ${filePath}`);
  watchedFiles.add(filePath);

  // Position at END of file - only read NEW events
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    filePositions.set(filePath, content.length);
    console.log(`📍 Positioned at end of file - only new events will be captured`);
  }

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

export function startFileIngestion(callback?: (events: HookEvent[]) => void): void {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');

  console.log('🚀 Starting file-based event streaming (in-memory only)');
  console.log(`📂 Reading from ${paiDir}/history/raw-outputs/`);

  if (callback) {
    onEventsReceived = callback;
  }

  loadAgentSessions();
  watchAgentSessions();

  const todayFile = getTodayEventsFile();
  watchFile(todayFile);

  // Check for new day's file every hour
  setInterval(() => {
    const newTodayFile = getTodayEventsFile();
    if (!watchedFiles.has(newTodayFile)) {
      console.log('📅 New day detected, watching new file');
      watchFile(newTodayFile);
    }
  }, 60 * 60 * 1000);

  console.log('✅ File streaming started');
}

export function getRecentEvents(limit: number = 100): HookEvent[] {
  return events.slice(-limit).reverse();
}

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
