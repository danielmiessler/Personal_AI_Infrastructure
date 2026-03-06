/**
 * PromptAnalysis.test.ts — Tests for batched prompt analysis hook
 *
 * Tests the readAnalysisResult function and skip conditions.
 * Does NOT test actual inference (requires API call).
 *
 * Run: bun test tests/PromptAnalysis.test.ts
 */

import { test, expect, describe } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test the result reading logic (extracted from PromptAnalysis.hook.ts)
interface PromptAnalysisResult {
  tab_title: string | null;
  session_name: string | null;
  timestamp: string;
}

function readAnalysisResult(dir: string, sessionId: string): PromptAnalysisResult | null {
  try {
    const resultPath = join(dir, `${sessionId}.json`);
    if (!existsSync(resultPath)) return null;

    const { readFileSync } = require('fs');
    const content = readFileSync(resultPath, 'utf-8');
    const result: PromptAnalysisResult = JSON.parse(content);

    const age = Date.now() - new Date(result.timestamp).getTime();
    if (age > 30000) return null;

    return result;
  } catch {
    return null;
  }
}

const TEST_DIR = join(tmpdir(), 'pai-test-prompt-analysis');

describe('PromptAnalysis', () => {
  // Setup
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true });

  test('returns null for missing session', () => {
    const result = readAnalysisResult(TEST_DIR, 'nonexistent-session');
    expect(result).toBeNull();
  });

  test('reads valid fresh result', () => {
    const sessionId = 'test-session-fresh';
    const data: PromptAnalysisResult = {
      tab_title: 'Fixing auth bug.',
      session_name: 'Fix Authentication Module Bug',
      timestamp: new Date().toISOString(),
    };
    writeFileSync(join(TEST_DIR, `${sessionId}.json`), JSON.stringify(data));

    const result = readAnalysisResult(TEST_DIR, sessionId);
    expect(result).not.toBeNull();
    expect(result!.tab_title).toBe('Fixing auth bug.');
    expect(result!.session_name).toBe('Fix Authentication Module Bug');
  });

  test('rejects stale result (>30s old)', () => {
    const sessionId = 'test-session-stale';
    const data: PromptAnalysisResult = {
      tab_title: 'Old title.',
      session_name: 'Old Session Name Here',
      timestamp: new Date(Date.now() - 60000).toISOString(), // 60s ago
    };
    writeFileSync(join(TEST_DIR, `${sessionId}.json`), JSON.stringify(data));

    const result = readAnalysisResult(TEST_DIR, sessionId);
    expect(result).toBeNull();
  });

  test('handles corrupted JSON gracefully', () => {
    const sessionId = 'test-session-corrupt';
    writeFileSync(join(TEST_DIR, `${sessionId}.json`), '{invalid json');

    const result = readAnalysisResult(TEST_DIR, sessionId);
    expect(result).toBeNull();
  });

  test('result has correct shape', () => {
    const sessionId = 'test-session-shape';
    const data: PromptAnalysisResult = {
      tab_title: null,
      session_name: null,
      timestamp: new Date().toISOString(),
    };
    writeFileSync(join(TEST_DIR, `${sessionId}.json`), JSON.stringify(data));

    const result = readAnalysisResult(TEST_DIR, sessionId);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('tab_title');
    expect(result).toHaveProperty('session_name');
    expect(result).toHaveProperty('timestamp');
  });

  // Cleanup
  test('cleanup test dir', () => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
