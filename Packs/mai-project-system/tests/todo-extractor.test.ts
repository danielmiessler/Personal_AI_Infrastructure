/**
 * Todo Extractor Tests
 */

import { describe, test, expect } from 'bun:test';
import { parseTranscript } from '../src/parsers/transcript.ts';
import {
  extractTodoState,
  getCurrentTask,
  getPendingTasks,
  getCompletedTasks,
  calculateTodoProgress,
  formatTodosAsMarkdown,
} from '../src/parsers/todo-extractor.ts';

describe('extractTodoState', () => {
  test('returns empty array when no TodoWrite calls', () => {
    const transcript = parseTranscript('');
    const todos = extractTodoState(transcript);
    expect(todos).toEqual([]);
  });

  test('extracts todos from TodoWrite call', () => {
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'TodoWrite',
      params: {
        todos: [
          { content: 'Task 1', status: 'completed', activeForm: 'Doing task 1' },
          { content: 'Task 2', status: 'in_progress', activeForm: 'Doing task 2' },
          { content: 'Task 3', status: 'pending', activeForm: 'Doing task 3' },
        ]
      }
    });

    const transcript = parseTranscript(content);
    const todos = extractTodoState(transcript);

    expect(todos).toHaveLength(3);
    expect(todos[0].content).toBe('Task 1');
    expect(todos[0].status).toBe('completed');
    expect(todos[1].status).toBe('in_progress');
    expect(todos[2].status).toBe('pending');
  });

  test('uses most recent TodoWrite call', () => {
    const content = [
      JSON.stringify({
        type: 'tool_use',
        tool: 'TodoWrite',
        params: { todos: [{ content: 'Old task', status: 'pending', activeForm: 'Old' }] }
      }),
      JSON.stringify({
        type: 'tool_use',
        tool: 'TodoWrite',
        params: { todos: [{ content: 'New task', status: 'in_progress', activeForm: 'New' }] }
      }),
    ].join('\n');

    const transcript = parseTranscript(content);
    const todos = extractTodoState(transcript);

    expect(todos).toHaveLength(1);
    expect(todos[0].content).toBe('New task');
  });

  test('normalizes invalid status to pending', () => {
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'TodoWrite',
      params: {
        todos: [{ content: 'Task', status: 'invalid', activeForm: 'Doing' }]
      }
    });

    const transcript = parseTranscript(content);
    const todos = extractTodoState(transcript);

    expect(todos[0].status).toBe('pending');
  });

  test('handles missing activeForm', () => {
    const content = JSON.stringify({
      type: 'tool_use',
      tool: 'TodoWrite',
      params: {
        todos: [{ content: 'Task', status: 'pending' }]
      }
    });

    const transcript = parseTranscript(content);
    const todos = extractTodoState(transcript);

    expect(todos[0].activeForm).toBe('Task');
  });
});

describe('getCurrentTask', () => {
  test('returns in_progress task', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done' },
      { content: 'Task 2', status: 'in_progress' as const, activeForm: 'Doing' },
      { content: 'Task 3', status: 'pending' as const, activeForm: 'Todo' },
    ];

    const current = getCurrentTask(todos);
    expect(current?.content).toBe('Task 2');
  });

  test('returns undefined when no in_progress task', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done' },
      { content: 'Task 2', status: 'pending' as const, activeForm: 'Todo' },
    ];

    const current = getCurrentTask(todos);
    expect(current).toBeUndefined();
  });
});

describe('getPendingTasks', () => {
  test('returns pending tasks', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done' },
      { content: 'Task 2', status: 'pending' as const, activeForm: 'Todo 2' },
      { content: 'Task 3', status: 'pending' as const, activeForm: 'Todo 3' },
    ];

    const pending = getPendingTasks(todos);
    expect(pending).toHaveLength(2);
    expect(pending[0].content).toBe('Task 2');
  });
});

describe('getCompletedTasks', () => {
  test('returns completed tasks', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done 1' },
      { content: 'Task 2', status: 'completed' as const, activeForm: 'Done 2' },
      { content: 'Task 3', status: 'pending' as const, activeForm: 'Todo' },
    ];

    const completed = getCompletedTasks(todos);
    expect(completed).toHaveLength(2);
  });
});

describe('calculateTodoProgress', () => {
  test('returns 0 for empty list', () => {
    expect(calculateTodoProgress([])).toBe(0);
  });

  test('returns 0 when none completed', () => {
    const todos = [
      { content: 'Task 1', status: 'pending' as const, activeForm: 'Todo' },
      { content: 'Task 2', status: 'in_progress' as const, activeForm: 'Doing' },
    ];
    expect(calculateTodoProgress(todos)).toBe(0);
  });

  test('returns 100 when all completed', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done' },
      { content: 'Task 2', status: 'completed' as const, activeForm: 'Done' },
    ];
    expect(calculateTodoProgress(todos)).toBe(100);
  });

  test('calculates percentage correctly', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done' },
      { content: 'Task 2', status: 'pending' as const, activeForm: 'Todo' },
      { content: 'Task 3', status: 'pending' as const, activeForm: 'Todo' },
      { content: 'Task 4', status: 'pending' as const, activeForm: 'Todo' },
    ];
    expect(calculateTodoProgress(todos)).toBe(25);
  });
});

describe('formatTodosAsMarkdown', () => {
  test('formats completed as [x]', () => {
    const todos = [{ content: 'Done task', status: 'completed' as const, activeForm: 'Done' }];
    expect(formatTodosAsMarkdown(todos)).toBe('- [x] Done task');
  });

  test('formats in_progress as [-]', () => {
    const todos = [{ content: 'Active task', status: 'in_progress' as const, activeForm: 'Doing' }];
    expect(formatTodosAsMarkdown(todos)).toBe('- [-] Active task');
  });

  test('formats pending as [ ]', () => {
    const todos = [{ content: 'Pending task', status: 'pending' as const, activeForm: 'Todo' }];
    expect(formatTodosAsMarkdown(todos)).toBe('- [ ] Pending task');
  });

  test('formats multiple todos', () => {
    const todos = [
      { content: 'Task 1', status: 'completed' as const, activeForm: 'Done' },
      { content: 'Task 2', status: 'in_progress' as const, activeForm: 'Doing' },
      { content: 'Task 3', status: 'pending' as const, activeForm: 'Todo' },
    ];

    const result = formatTodosAsMarkdown(todos);
    expect(result).toBe('- [x] Task 1\n- [-] Task 2\n- [ ] Task 3');
  });
});
