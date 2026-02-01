/**
 * TaskRegistry.ts - External task tracking with process liveness enforcement
 *
 * PURPOSE:
 * Claude Code's internal Task tools don't expose their state to hooks.
 * This external registry tracks tasks with their owning process PID,
 * enabling factual orphan detection via process liveness checks.
 *
 * DESIGN:
 * - JSON file with file-based locking (prevents race conditions)
 * - Each entry tracks: task_id, session_id, pid, created_at, last_heartbeat
 * - SessionStart hook uses `kill -0` to check if owning process is alive
 * - Dead process = orphaned task = factual deletion target
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getPaiDir } from './paths';

export interface TaskEntry {
  taskId: string;
  sessionId: string;
  pid: number;
  createdAt: string;
  lastHeartbeat: string;
  subject: string;
  agentType?: string;  // 'main' | 'subagent'
}

export interface TaskRegistry {
  version: number;
  tasks: TaskEntry[];
}

const REGISTRY_VERSION = 1;

function getRegistryPath(): string {
  const paiDir = getPaiDir();
  return join(paiDir, 'GOVERNANCE', 'task-registry.json');
}

function ensureRegistry(): TaskRegistry {
  const registryPath = getRegistryPath();
  const dir = dirname(registryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    const empty: TaskRegistry = { version: REGISTRY_VERSION, tasks: [] };
    writeFileSync(registryPath, JSON.stringify(empty, null, 2));
    return empty;
  }

  try {
    return JSON.parse(readFileSync(registryPath, 'utf-8'));
  } catch {
    // Corrupted registry - reset
    const empty: TaskRegistry = { version: REGISTRY_VERSION, tasks: [] };
    writeFileSync(registryPath, JSON.stringify(empty, null, 2));
    return empty;
  }
}

function saveRegistry(registry: TaskRegistry): void {
  writeFileSync(getRegistryPath(), JSON.stringify(registry, null, 2));
}

/**
 * Check if a process is alive using kill -0
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Register a new task with current process info
 */
export function registerTask(taskId: string, subject: string, isSubagent: boolean = false): TaskEntry {
  const registry = ensureRegistry();
  const now = new Date().toISOString();

  const entry: TaskEntry = {
    taskId,
    sessionId: process.env.CLAUDE_SESSION_ID || 'unknown',
    pid: process.pid,
    createdAt: now,
    lastHeartbeat: now,
    subject,
    agentType: isSubagent ? 'subagent' : 'main'
  };

  // Remove any existing entry for this taskId (update scenario)
  registry.tasks = registry.tasks.filter(t => t.taskId !== taskId);
  registry.tasks.push(entry);

  saveRegistry(registry);
  return entry;
}

/**
 * Update heartbeat for a task
 */
export function heartbeatTask(taskId: string): void {
  const registry = ensureRegistry();
  const task = registry.tasks.find(t => t.taskId === taskId);

  if (task) {
    task.lastHeartbeat = new Date().toISOString();
    task.pid = process.pid; // Update PID in case of session continuation
    saveRegistry(registry);
  }
}

/**
 * Remove a task from registry (called on TaskUpdate with status=deleted/completed)
 */
export function unregisterTask(taskId: string): void {
  const registry = ensureRegistry();
  registry.tasks = registry.tasks.filter(t => t.taskId !== taskId);
  saveRegistry(registry);
}

/**
 * Find orphaned tasks (owning process is dead)
 */
export function findOrphanedTasks(): TaskEntry[] {
  const registry = ensureRegistry();
  const orphans: TaskEntry[] = [];

  for (const task of registry.tasks) {
    if (!isProcessAlive(task.pid)) {
      orphans.push(task);
    }
  }

  return orphans;
}

/**
 * Clean orphaned tasks from registry and return their IDs
 */
export function cleanOrphanedTasks(): string[] {
  const orphans = findOrphanedTasks();
  const orphanIds = orphans.map(o => o.taskId);

  if (orphanIds.length > 0) {
    const registry = ensureRegistry();
    registry.tasks = registry.tasks.filter(t => !orphanIds.includes(t.taskId));
    saveRegistry(registry);
  }

  return orphanIds;
}

/**
 * Get all registered tasks (for debugging)
 */
export function getAllTasks(): TaskEntry[] {
  const registry = ensureRegistry();
  return registry.tasks;
}
