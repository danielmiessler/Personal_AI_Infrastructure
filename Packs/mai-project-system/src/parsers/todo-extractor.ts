/**
 * Todo Extractor
 *
 * Extracts TodoWrite state from parsed transcript.
 * Finds the most recent TodoWrite call and extracts the todo list.
 *
 * All operations are DETERMINISTIC - no LLM calls.
 */

import type { ParsedTranscript } from './transcript.ts';

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

/**
 * Extract todo state from transcript
 */
export function extractTodoState(transcript: ParsedTranscript): TodoItem[] {
  // Find the most recent TodoWrite call
  const todoWriteCalls = transcript.toolCalls.filter(
    call => call.tool === 'TodoWrite'
  );

  if (todoWriteCalls.length === 0) {
    return [];
  }

  // Get the last TodoWrite call
  const lastTodoWrite = todoWriteCalls[todoWriteCalls.length - 1];
  const todos = lastTodoWrite.params.todos;

  if (!Array.isArray(todos)) {
    return [];
  }

  return todos.map(todo => ({
    content: String(todo.content || ''),
    status: normalizeStatus(todo.status),
    activeForm: String(todo.activeForm || todo.content || ''),
  }));
}

/**
 * Normalize status to valid TodoItem status
 */
function normalizeStatus(status: unknown): TodoItem['status'] {
  if (status === 'pending' || status === 'in_progress' || status === 'completed') {
    return status;
  }
  return 'pending';
}

/**
 * Get current (in_progress) task
 */
export function getCurrentTask(todos: TodoItem[]): TodoItem | undefined {
  return todos.find(todo => todo.status === 'in_progress');
}

/**
 * Get pending tasks
 */
export function getPendingTasks(todos: TodoItem[]): TodoItem[] {
  return todos.filter(todo => todo.status === 'pending');
}

/**
 * Get completed tasks
 */
export function getCompletedTasks(todos: TodoItem[]): TodoItem[] {
  return todos.filter(todo => todo.status === 'completed');
}

/**
 * Calculate todo progress (0-100)
 */
export function calculateTodoProgress(todos: TodoItem[]): number {
  if (todos.length === 0) return 0;
  const completed = todos.filter(t => t.status === 'completed').length;
  return Math.round((completed / todos.length) * 100);
}

/**
 * Format todos as markdown checklist
 */
export function formatTodosAsMarkdown(todos: TodoItem[]): string {
  return todos
    .map(todo => {
      const checkbox = todo.status === 'completed' ? '[x]' :
                       todo.status === 'in_progress' ? '[-]' :
                       '[ ]';
      return `- ${checkbox} ${todo.content}`;
    })
    .join('\n');
}
