#!/usr/bin/env bun
/**
 * llm-common.ts - Shared utilities for LLM API tools
 * Common code for OpenAI and Gemini API clients
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// ============================================================
// Types
// ============================================================

export interface LLMRequest {
  provider: 'openai' | 'gemini';
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  streaming: boolean;
}

export interface LLMResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  model: string;
}

export interface LLMError {
  code: string;
  message: string;
  provider: 'openai' | 'gemini';
}

export interface APICallLogEntry {
  timestamp: string;           // ISO 8601
  session_id: string;
  provider: 'openai' | 'gemini';
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  success: boolean;
  error_code?: string;
  streaming: boolean;
  temperature?: number;
  max_tokens?: number;
}

// ============================================================
// API Key Loading
// ============================================================

export function getApiKey(envVarName: string): string | null {
  // Check environment first
  if (process.env[envVarName]) return process.env[envVarName];

  // Fall back to .env file
  const envPath = join(PAI_DIR, '.env');
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      const match = content.match(new RegExp(`${envVarName}=(.+)`));
      if (match) return match[1].trim();
    } catch (err) {
      // Ignore read errors, return null
    }
  }

  return null;
}

// ============================================================
// JSONL Logging
// ============================================================

function getLogFilePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const monthDir = join(PAI_DIR, 'history', 'llm-api-calls', `${year}-${month}`);
  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return join(monthDir, `${year}-${month}-${day}_api-calls.jsonl`);
}

export function logAPICall(entry: Omit<APICallLogEntry, 'timestamp' | 'session_id'>): void {
  const logEntry: APICallLogEntry = {
    timestamp: new Date().toISOString(),
    session_id: process.env.CLAUDE_SESSION_ID || 'cli',
    ...entry,
  };

  const logPath = getLogFilePath();
  const line = JSON.stringify(logEntry) + '\n';

  try {
    appendFileSync(logPath, line);
  } catch (err) {
    console.error(`⚠️  Failed to log API call: ${(err as Error).message}`);
  }
}

// ============================================================
// Error Formatting
// ============================================================

export function formatError(error: LLMError): void {
  const errorOutput = {
    error: {
      code: error.code,
      message: error.message,
      provider: error.provider,
    }
  };

  console.log(JSON.stringify(errorOutput, null, 2));

  // Log the error
  logAPICall({
    provider: error.provider,
    model: 'unknown',
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    duration_ms: 0,
    success: false,
    error_code: error.code,
    streaming: false,
  });
}
