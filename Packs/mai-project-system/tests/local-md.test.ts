/**
 * Local MD Writer Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  writeLocalMd,
  readLocalMd,
  localMdExists,
  generateResumeInstructions,
  buildLocalMdOptions,
} from '../src/writers/local-md.ts';

const TEST_DIR = join(import.meta.dir, '.test-output');

beforeEach(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
});

describe('writeLocalMd', () => {
  test('writes file to specified path', () => {
    const testPath = join(TEST_DIR, 'CLAUDE.local.md');
    const options = {
      timestamp: '2026-01-08T12:00:00Z',
      sessionId: 'test-session',
      currentTask: 'Build the project',
      currentStep: 'Building the project',
      modifiedFiles: ['/src/index.ts'],
      recentDecisions: ['Use TypeScript'],
      agents: [],
      resumeInstructions: 'Continue building',
    };

    writeLocalMd(testPath, options);

    expect(existsSync(testPath)).toBe(true);
    const content = readFileSync(testPath, 'utf-8');
    expect(content).toContain('test-session');
    expect(content).toContain('Build the project');
  });
});

describe('readLocalMd', () => {
  test('returns null for non-existent file', () => {
    const result = readLocalMd(join(TEST_DIR, 'nonexistent.md'));
    expect(result).toBeNull();
  });

  test('reads existing file content', () => {
    const testPath = join(TEST_DIR, 'test.md');
    writeFileSync(testPath, '# Test Content\n\nSome text.');

    const result = readLocalMd(testPath);
    expect(result).toBe('# Test Content\n\nSome text.');
  });
});

describe('localMdExists', () => {
  test('returns false for non-existent file', () => {
    expect(localMdExists(join(TEST_DIR, 'nonexistent.md'))).toBe(false);
  });

  test('returns true for existing file', () => {
    const testPath = join(TEST_DIR, 'exists.md');
    writeFileSync(testPath, 'content');

    expect(localMdExists(testPath)).toBe(true);
  });
});

describe('generateResumeInstructions', () => {
  test('returns continue message for current task', () => {
    const todos = [
      { content: 'Task 1', status: 'in_progress' },
      { content: 'Task 2', status: 'pending' },
    ];
    const current = { content: 'Task 1' };

    const result = generateResumeInstructions(todos, current);
    expect(result).toBe('Continue with: Task 1');
  });

  test('returns start message for first pending when no current', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' },
      { content: 'Task 2', status: 'pending' },
      { content: 'Task 3', status: 'pending' },
    ];

    const result = generateResumeInstructions(todos);
    expect(result).toBe('Start with: Task 2');
  });

  test('returns completion message when all done', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' },
      { content: 'Task 2', status: 'completed' },
    ];

    const result = generateResumeInstructions(todos);
    expect(result).toBe('All tasks completed or no tasks defined.');
  });

  test('returns completion message for empty list', () => {
    const result = generateResumeInstructions([]);
    expect(result).toBe('All tasks completed or no tasks defined.');
  });
});

describe('buildLocalMdOptions', () => {
  test('builds options from parsed data', () => {
    const sessionId = 'session-123';
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done with task 1' },
      { content: 'Task 2', status: 'in_progress' as const, activeForm: 'Working on task 2' },
    ];
    const modifiedFiles = ['/src/index.ts', '/src/util.ts'];
    const decisions = ['Use TypeScript', 'Use Bun'];
    const agents = [{ id: 'agent-1', task: 'Build', status: 'running' as const }];

    const options = buildLocalMdOptions(sessionId, todos, modifiedFiles, decisions, agents);

    expect(options.sessionId).toBe('session-123');
    expect(options.currentTask).toBe('Task 2');
    expect(options.currentStep).toBe('Working on task 2');
    expect(options.modifiedFiles).toEqual(modifiedFiles);
    expect(options.recentDecisions).toEqual(decisions);
    expect(options.agents).toEqual(agents);
    expect(options.resumeInstructions).toBe('Continue with: Task 2');
  });

  test('handles no current task', () => {
    const options = buildLocalMdOptions(
      'session',
      [{ content: 'Task', status: 'pending' as const, activeForm: 'Pending' }],
      [],
      [],
      []
    );

    expect(options.currentTask).toBe('None');
    expect(options.currentStep).toBe('None');
  });

  test('includes timestamp', () => {
    const options = buildLocalMdOptions('session', [], [], [], []);
    expect(options.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
