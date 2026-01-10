/**
 * Logger.ts - JSONL logging helper for TelegramDelivery
 * Following VoiceInterface pattern
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const LOG_FILE = join(PAI_DIR, 'history', 'telegram-delivery.jsonl');

// Ensure history directory exists
const historyDir = join(PAI_DIR, 'history');
if (!existsSync(historyDir)) {
  mkdirSync(historyDir, { recursive: true });
}

export interface TelegramEvent {
  timestamp: string;
  session_id: string;
  event: 'send' | 'complete' | 'error';
  [key: string]: any;
}

export class TelegramLogger {
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || `tg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  log(event: Partial<TelegramEvent>): void {
    const logEntry: TelegramEvent = {
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      event: event.event || 'send',
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
export function logTelegramEvent(event: Partial<TelegramEvent>, sessionId?: string): void {
  const logger = new TelegramLogger(sessionId);
  logger.log(event);
}
