/**
 * Type Tests for mai-orchestration-core
 */

import { describe, test, expect } from 'bun:test';
import {
  // Task types
  createFarmTask,
  createFarmResult,
  isSuccessResult,
  sortByPriority,
  // Agent types
  AgentRegistry,
  createAgentStatus,
  markAgentRunning,
  markAgentComplete,
  markAgentFailed,
  calculateAgentDuration,
  // Result types
  ResultAggregator,
  aggregateResults,
  isOverallSuccess,
  formatResultsMarkdown,
  // Event types
  OrchestrationEventEmitter,
  createTaskQueuedEvent,
  createTaskCompletedEvent,
} from '../src/index.ts';

describe('Task Types', () => {
  test('createFarmTask creates task with generated ID', () => {
    const task = createFarmTask('implementation', 'Build feature', 'Feature works');

    expect(task.taskId).toMatch(/^task-/);
    expect(task.type).toBe('implementation');
    expect(task.description).toBe('Build feature');
    expect(task.successCriteria).toBe('Feature works');
  });

  test('createFarmTask accepts options', () => {
    const task = createFarmTask('test', 'Run tests', 'All pass', {
      context: ['/src/index.ts'],
      constraints: ['No mocking'],
      priority: 'high',
      timeout: 5000,
    });

    expect(task.context).toEqual(['/src/index.ts']);
    expect(task.constraints).toEqual(['No mocking']);
    expect(task.priority).toBe('high');
    expect(task.timeout).toBe(5000);
  });

  test('createFarmResult creates result', () => {
    const result = createFarmResult('task-1', 'agent-1', 'success', 'Done', {
      artifacts: ['/src/new.ts'],
      duration: 1000,
    });

    expect(result.taskId).toBe('task-1');
    expect(result.agentId).toBe('agent-1');
    expect(result.status).toBe('success');
    expect(result.artifacts).toEqual(['/src/new.ts']);
    expect(result.duration).toBe(1000);
  });

  test('isSuccessResult returns true for success', () => {
    const result = createFarmResult('t', 'a', 'success', 'Done');
    expect(isSuccessResult(result)).toBe(true);
  });

  test('isSuccessResult returns false for failure', () => {
    const result = createFarmResult('t', 'a', 'failure', 'Error');
    expect(isSuccessResult(result)).toBe(false);
  });

  test('sortByPriority sorts by priority', () => {
    const tasks = [
      createFarmTask('test', 'Low', 'Done', { priority: 'low' }),
      createFarmTask('test', 'High', 'Done', { priority: 'high' }),
      createFarmTask('test', 'Normal', 'Done', { priority: 'normal' }),
    ];

    const sorted = sortByPriority(tasks);
    expect(sorted[0].description).toBe('High');
    expect(sorted[1].description).toBe('Normal');
    expect(sorted[2].description).toBe('Low');
  });
});

describe('Agent Registry', () => {
  test('AgentRegistry stores and retrieves agents', () => {
    const registry = new AgentRegistry();
    const status = createAgentStatus('agent-1', 'task-1', '/tmp/output.txt');

    registry.set('agent-1', status);

    expect(registry.get('agent-1')).toBe(status);
    expect(registry.size).toBe(1);
  });

  test('AgentRegistry getActive returns running agents', () => {
    const registry = new AgentRegistry();
    registry.set('a1', { ...createAgentStatus('a1', 't1', '/tmp/1'), status: 'running' });
    registry.set('a2', { ...createAgentStatus('a2', 't2', '/tmp/2'), status: 'complete' });
    registry.set('a3', { ...createAgentStatus('a3', 't3', '/tmp/3'), status: 'queued' });

    const active = registry.getActive();
    expect(active).toHaveLength(2);
  });

  test('AgentRegistry getByTask finds agent by task', () => {
    const registry = new AgentRegistry();
    registry.set('agent-1', createAgentStatus('agent-1', 'task-42', '/tmp/out'));

    const found = registry.getByTask('task-42');
    expect(found?.agentId).toBe('agent-1');
  });

  test('AgentRegistry update modifies agent', () => {
    const registry = new AgentRegistry();
    registry.set('a1', createAgentStatus('a1', 't1', '/tmp/1'));
    registry.update('a1', { progress: 50 });

    const updated = registry.get('a1');
    expect(updated?.progress).toBe(50);
  });

  test('markAgentRunning changes status', () => {
    const status = createAgentStatus('a', 't', '/tmp/o');
    const running = markAgentRunning(status);

    expect(running.status).toBe('running');
  });

  test('markAgentComplete sets end time', () => {
    const status = createAgentStatus('a', 't', '/tmp/o');
    const complete = markAgentComplete(status);

    expect(complete.status).toBe('complete');
    expect(complete.endTime).toBeDefined();
    expect(complete.progress).toBe(100);
  });

  test('calculateAgentDuration returns duration', () => {
    const status = createAgentStatus('a', 't', '/tmp/o');
    const complete = markAgentComplete(status);

    const duration = calculateAgentDuration(complete);
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('Result Aggregator', () => {
  test('ResultAggregator aggregates results', () => {
    const aggregator = new ResultAggregator();
    aggregator.add(createFarmResult('t1', 'a1', 'success', 'OK', { duration: 100 }));
    aggregator.add(createFarmResult('t2', 'a2', 'failure', 'Error', { issues: ['Bug'] }));
    aggregator.add(createFarmResult('t3', 'a3', 'blocked', 'Waiting'));

    const results = aggregator.aggregate();

    expect(results.successCount).toBe(1);
    expect(results.failureCount).toBe(1);
    expect(results.blockedCount).toBe(1);
    expect(results.issues).toContain('Bug');
  });

  test('aggregateResults helper works', () => {
    const results = aggregateResults([
      createFarmResult('t1', 'a1', 'success', 'OK'),
      createFarmResult('t2', 'a2', 'success', 'OK'),
    ]);

    expect(results.successCount).toBe(2);
    expect(results.failureCount).toBe(0);
  });

  test('isOverallSuccess returns true when all succeed', () => {
    const results = aggregateResults([
      createFarmResult('t1', 'a1', 'success', 'OK'),
    ]);

    expect(isOverallSuccess(results)).toBe(true);
  });

  test('isOverallSuccess returns false with failures', () => {
    const results = aggregateResults([
      createFarmResult('t1', 'a1', 'success', 'OK'),
      createFarmResult('t2', 'a2', 'failure', 'Error'),
    ]);

    expect(isOverallSuccess(results)).toBe(false);
  });

  test('formatResultsMarkdown generates markdown', () => {
    const results = aggregateResults([
      createFarmResult('t1', 'a1', 'success', 'OK', { artifacts: ['/src/new.ts'] }),
    ]);

    const md = formatResultsMarkdown(results);

    expect(md).toContain('## Orchestration Results');
    expect(md).toContain('Success | 1');
    expect(md).toContain('/src/new.ts');
  });
});

describe('Events', () => {
  test('OrchestrationEventEmitter emits events', () => {
    const emitter = new OrchestrationEventEmitter();
    let received = '';

    emitter.on({
      onEvent: (event) => {
        if (event.type === 'task_queued') {
          received = event.task.taskId;
        }
      },
    });

    const task = createFarmTask('test', 'Test', 'Pass');
    emitter.emit(createTaskQueuedEvent(task));

    expect(received).toBe(task.taskId);
  });

  test('OrchestrationEventEmitter off removes handler', () => {
    const emitter = new OrchestrationEventEmitter();
    let count = 0;

    const handler = { onEvent: () => { count++; } };

    emitter.on(handler);
    emitter.emit(createTaskCompletedEvent(createFarmResult('t', 'a', 'success', 'OK')));
    expect(count).toBe(1);

    emitter.off(handler);
    emitter.emit(createTaskCompletedEvent(createFarmResult('t', 'a', 'success', 'OK')));
    expect(count).toBe(1); // Still 1, handler removed
  });
});
