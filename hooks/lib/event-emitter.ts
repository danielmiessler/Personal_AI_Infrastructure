#!/usr/bin/env bun
/**
 * event-emitter.ts — appendEvent() utility for the Unified Event System
 *
 * Writes typed events to MEMORY/STATE/events.jsonl (append-only).
 * Auto-injects timestamp and session_id. Graceful failure — write errors
 * are silently swallowed so events never block or crash a hook.
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME || '', '.claude');
const EVENTS_PATH = join(BASE_DIR, 'MEMORY', 'STATE', 'events.jsonl');

export function getEventsPath(): string {
  return EVENTS_PATH;
}

export interface BaseEvent {
  timestamp: string;
  session_id: string;
  source: string;
  type: string;
  [key: string]: unknown;
}

export type EventInput = Omit<BaseEvent, 'timestamp' | 'session_id'>;

export function appendEvent(input: EventInput): void {
  try {
    const event: BaseEvent = {
      ...input,
      timestamp: new Date().toISOString(),
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
    };

    const dir = dirname(EVENTS_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    appendFileSync(EVENTS_PATH, JSON.stringify(event) + '\n', 'utf-8');
  } catch {
    // Graceful failure — events are observability, not critical path
  }
}
