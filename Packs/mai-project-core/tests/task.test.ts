import { describe, test, expect } from 'bun:test';
import {
  createTask,
  updateTaskStatus,
  calculateProgress,
  isTaskBlocked,
  getReadyTasks,
  sortTasksByPriority,
  type Task,
} from '../src/types/task.ts';

describe('Task', () => {
  describe('createTask', () => {
    test('creates task with required fields', () => {
      const task = createTask({
        title: 'Test task',
        type: 'implementation',
        successCriteria: 'Task is complete',
      });

      expect(task.title).toBe('Test task');
      expect(task.type).toBe('implementation');
      expect(task.successCriteria).toBe('Task is complete');
      expect(task.status).toBe('backlog');
      expect(task.id).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    test('allows overriding status', () => {
      const task = createTask({
        title: 'Ready task',
        type: 'test',
        successCriteria: 'Tests pass',
        status: 'ready',
      });

      expect(task.status).toBe('ready');
    });
  });

  describe('updateTaskStatus', () => {
    test('updates status and timestamp', () => {
      const task = createTask({
        title: 'Test',
        type: 'implementation',
        successCriteria: 'Done',
      });

      const updated = updateTaskStatus(task, 'in_progress');

      expect(updated.status).toBe('in_progress');
      expect(updated.updatedAt).toBeDefined();
      // updatedAt should be a valid ISO timestamp
      expect(new Date(updated.updatedAt).toISOString()).toBe(updated.updatedAt);
    });

    test('sets completedAt when done', () => {
      const task = createTask({
        title: 'Test',
        type: 'implementation',
        successCriteria: 'Done',
      });

      const done = updateTaskStatus(task, 'done');

      expect(done.completedAt).toBeDefined();
    });
  });

  describe('calculateProgress', () => {
    test('returns 0 for empty list', () => {
      expect(calculateProgress([])).toBe(0);
    });

    test('calculates correct percentage', () => {
      const tasks: Task[] = [
        createTask({ title: 'A', type: 'test', successCriteria: 'a', status: 'done' }),
        createTask({ title: 'B', type: 'test', successCriteria: 'b', status: 'done' }),
        createTask({ title: 'C', type: 'test', successCriteria: 'c', status: 'backlog' }),
        createTask({ title: 'D', type: 'test', successCriteria: 'd', status: 'in_progress' }),
      ];

      expect(calculateProgress(tasks)).toBe(50);
    });

    test('returns 100 when all done', () => {
      const tasks: Task[] = [
        createTask({ title: 'A', type: 'test', successCriteria: 'a', status: 'done' }),
        createTask({ title: 'B', type: 'test', successCriteria: 'b', status: 'done' }),
      ];

      expect(calculateProgress(tasks)).toBe(100);
    });
  });

  describe('isTaskBlocked', () => {
    test('returns false when no dependencies', () => {
      const task = createTask({
        title: 'Test',
        type: 'implementation',
        successCriteria: 'Done',
      });

      expect(isTaskBlocked(task, [])).toBe(false);
    });

    test('returns true when dependency not done', () => {
      const dep = createTask({
        title: 'Dependency',
        type: 'implementation',
        successCriteria: 'First',
        status: 'in_progress',
      });

      const task = createTask({
        title: 'Blocked',
        type: 'implementation',
        successCriteria: 'Second',
        blockedBy: [dep.id],
      });

      expect(isTaskBlocked(task, [dep, task])).toBe(true);
    });

    test('returns false when dependency is done', () => {
      const dep = createTask({
        title: 'Dependency',
        type: 'implementation',
        successCriteria: 'First',
        status: 'done',
      });

      const task = createTask({
        title: 'Ready',
        type: 'implementation',
        successCriteria: 'Second',
        blockedBy: [dep.id],
      });

      expect(isTaskBlocked(task, [dep, task])).toBe(false);
    });
  });

  describe('getReadyTasks', () => {
    test('excludes done and blocked tasks', () => {
      const done = createTask({
        title: 'Done',
        type: 'test',
        successCriteria: 'a',
        status: 'done',
      });

      const blocked = createTask({
        title: 'Blocked',
        type: 'test',
        successCriteria: 'b',
        status: 'blocked',
      });

      const ready = createTask({
        title: 'Ready',
        type: 'test',
        successCriteria: 'c',
        status: 'ready',
      });

      const tasks = [done, blocked, ready];
      const result = getReadyTasks(tasks);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Ready');
    });
  });

  describe('sortTasksByPriority', () => {
    test('sorts by status priority', () => {
      const tasks: Task[] = [
        createTask({ title: 'Backlog', type: 'test', successCriteria: 'a', status: 'backlog' }),
        createTask({ title: 'In Progress', type: 'test', successCriteria: 'b', status: 'in_progress' }),
        createTask({ title: 'Done', type: 'test', successCriteria: 'c', status: 'done' }),
        createTask({ title: 'Ready', type: 'test', successCriteria: 'd', status: 'ready' }),
      ];

      const sorted = sortTasksByPriority(tasks);

      expect(sorted[0].title).toBe('In Progress');
      expect(sorted[1].title).toBe('Ready');
      expect(sorted[2].title).toBe('Backlog');
      expect(sorted[3].title).toBe('Done');
    });
  });
});
