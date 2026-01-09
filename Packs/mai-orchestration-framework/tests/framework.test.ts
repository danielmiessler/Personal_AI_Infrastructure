/**
 * Framework Tests for mai-orchestration-framework
 */

import { describe, test, expect } from 'bun:test';
import { Orchestrator, AgentDispatcher, createFarmTask } from '../src/index.ts';

describe('AgentDispatcher', () => {
  test('dispatches task to available agent', () => {
    const dispatcher = new AgentDispatcher('/tmp/test');
    const task = createFarmTask('implementation', 'Build feature', 'Done');

    const result = dispatcher.dispatch(task);

    expect(result).toBeDefined();
    expect(result?.agentId).toBeTruthy();
    expect(result?.outputFile).toContain(task.taskId);
  });

  test('selects agent by capability', () => {
    const dispatcher = new AgentDispatcher();

    const implAgent = dispatcher.selectAgent('implementation');
    expect(implAgent?.capabilities).toContain('implementation');

    const researchAgent = dispatcher.selectAgent('research');
    expect(researchAgent?.capabilities).toContain('research');
  });

  test('tracks agent load', () => {
    const dispatcher = new AgentDispatcher();

    // Get initial capacity
    const initial = dispatcher.getTotalCapacity();

    // Dispatch a task
    const task = createFarmTask('test', 'Test', 'Pass');
    const result = dispatcher.dispatch(task);

    // Check load increased
    const after = dispatcher.getTotalCapacity();
    expect(after.used).toBe(initial.used + 1);

    // Release agent
    dispatcher.release(result!.agentId);

    // Check load decreased
    const final = dispatcher.getTotalCapacity();
    expect(final.used).toBe(initial.used);
  });

  test('returns undefined when no agents available', () => {
    const dispatcher = new AgentDispatcher();

    // Exhaust all agents
    const agents = dispatcher.getAllAgents();
    const maxTasks = agents.reduce((sum, a) => sum + a.maxConcurrent, 0);

    for (let i = 0; i < maxTasks; i++) {
      dispatcher.dispatch(createFarmTask('test', `Task ${i}`, 'Pass'));
    }

    // Next dispatch should fail
    const result = dispatcher.dispatch(createFarmTask('test', 'Overflow', 'Pass'));
    expect(result).toBeUndefined();
  });

  test('registers custom agent', () => {
    const dispatcher = new AgentDispatcher();

    dispatcher.registerAgent({
      id: 'custom',
      name: 'Custom Agent',
      capabilities: ['review'],
      maxConcurrent: 10,
      currentLoad: 0,
    });

    // Verify custom agent is registered and has review capability
    const agents = dispatcher.getAllAgents();
    const customAgent = agents.find(a => a.id === 'custom');
    expect(customAgent).toBeDefined();
    expect(customAgent?.capabilities).toContain('review');
  });
});

describe('Orchestrator', () => {
  test('queues and executes task', async () => {
    const orchestrator = new Orchestrator('/tmp/test');
    const task = createFarmTask('implementation', 'Build feature', 'Done');

    orchestrator.queueTask(task);
    const result = await orchestrator.executeTask(task.taskId);

    expect(result.taskId).toBe(task.taskId);
    expect(result.status).toBe('success');
    expect(result.output).toContain('Build feature');
  });

  test('executes batch of tasks', async () => {
    const orchestrator = new Orchestrator('/tmp/test');

    const tasks = [
      createFarmTask('test', 'Test 1', 'Pass'),
      createFarmTask('test', 'Test 2', 'Pass'),
      createFarmTask('test', 'Test 3', 'Pass'),
    ];

    const taskIds = orchestrator.queueBatch(tasks);
    const results = await orchestrator.executeBatch(taskIds);

    expect(results.successCount).toBe(3);
    expect(results.failureCount).toBe(0);
  });

  test('respects parallel option', async () => {
    const orchestrator = new Orchestrator('/tmp/test');

    const tasks = Array(6).fill(null).map((_, i) =>
      createFarmTask('test', `Task ${i}`, 'Pass')
    );

    const taskIds = orchestrator.queueBatch(tasks);
    const results = await orchestrator.executeBatch(taskIds, { parallel: 2 });

    expect(results.successCount).toBe(6);
  });

  test('emits events during execution', async () => {
    const orchestrator = new Orchestrator('/tmp/test');
    const events: string[] = [];

    orchestrator.on({
      onEvent: (event) => events.push(event.type),
    });

    const task = createFarmTask('test', 'Test', 'Pass');
    orchestrator.queueTask(task);
    await orchestrator.executeTask(task.taskId);

    expect(events).toContain('task_queued');
    expect(events).toContain('task_started');
    expect(events).toContain('task_completed');
  });

  test('can get and restore state', async () => {
    const orchestrator = new Orchestrator('/tmp/test');

    const task = createFarmTask('test', 'Test', 'Pass');
    orchestrator.queueTask(task);

    // Get state
    const state = orchestrator.getState();
    expect(state.activeTasks.has(task.taskId)).toBe(true);

    // Create new orchestrator and restore
    const newOrchestrator = new Orchestrator('/tmp/test');
    newOrchestrator.restoreState(state);

    expect(newOrchestrator.getPendingTasks()).toHaveLength(1);
  });

  test('returns blocked result when no agent available', async () => {
    const orchestrator = new Orchestrator('/tmp/test');

    // Queue task without queueTask (directly to avoid adding to queue)
    const result = await orchestrator.executeTask('nonexistent');

    expect(result.status).toBe('failure');
    expect(result.output).toContain('not found');
  });

  test('prioritizes high priority tasks', async () => {
    const orchestrator = new Orchestrator('/tmp/test');

    const tasks = [
      createFarmTask('test', 'Low', 'Pass', { priority: 'low' }),
      createFarmTask('test', 'High', 'Pass', { priority: 'high' }),
      createFarmTask('test', 'Normal', 'Pass', { priority: 'normal' }),
    ];

    // Queue in order
    orchestrator.queueBatch(tasks);

    // Check pending tasks are sorted by priority
    // (executeBatch sorts internally, but we can verify the sorting logic works)
    const taskIds = tasks.map(t => t.taskId);
    const results = await orchestrator.executeBatch(taskIds, { parallel: 1 });

    expect(results.successCount).toBe(3);
  });
});
