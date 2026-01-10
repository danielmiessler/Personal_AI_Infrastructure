/**
 * Logger.ts - JSONL logging helper
 * Shared utility for all VoiceInterface tools to log sessions
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const LOG_FILE = join(PAI_DIR, 'history', 'voice-sessions.jsonl');

// Ensure history directory exists
const historyDir = join(PAI_DIR, 'history');
if (!existsSync(historyDir)) {
  mkdirSync(historyDir, { recursive: true });
}

export interface VoiceEvent {
  timestamp: string;
  session_id: string;
  event: 'record' | 'transcribe' | 'query' | 'response' | 'speak' | 'complete' | 'error';
  [key: string]: any;
}

export class VoiceLogger {
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  log(event: Partial<VoiceEvent>): void {
    const logEntry: VoiceEvent = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      event: event.event || 'unknown',
      ...event,
    };

    const line = JSON.stringify(logEntry) + '\n';
    appendFileSync(LOG_FILE, line);
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Convenience function for one-off logging
export function logVoiceEvent(event: Partial<VoiceEvent>, sessionId?: string): void {
  const logger = new VoiceLogger(sessionId);
  logger.log(event);
}
