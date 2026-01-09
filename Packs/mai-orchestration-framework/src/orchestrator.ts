/**
 * Orchestrator Engine
 *
 * Main orchestration engine for managing multi-agent task execution.
 */

import {
  type FarmTask,
  type FarmResult,
  type AgentStatus,
  type AggregatedResults,
  type OrchestrationEventHandler,
  AgentRegistry,
  ResultAggregator,
  OrchestrationEventEmitter,
  createAgentStatus,
  markAgentRunning,
  markAgentComplete,
  markAgentFailed,
  createTaskQueuedEvent,
  createTaskStartedEvent,
  createTaskCompletedEvent,
  createTaskFailedEvent,
  createBatchCompletedEvent,
  createFarmResult,
  sortByPriority,
} from 'mai-orchestration-core';

import { AgentDispatcher } from './dispatcher.ts';

export interface BatchOptions {
  parallel?: number;
  failFast?: boolean;
  timeout?: number;
}

export interface OrchestrationState {
  activeTasks: Map<string, FarmTask>;
  agentStatus: Map<string, AgentStatus>;
  pendingResults: FarmResult[];
  batchId?: string;
}

export class Orchestrator {
  private taskQueue: Map<string, FarmTask> = new Map();
  private registry: AgentRegistry;
  private dispatcher: AgentDispatcher;
  private emitter: OrchestrationEventEmitter;
  private results: FarmResult[] = [];

  constructor(outputDir?: string) {
    this.registry = new AgentRegistry();
    this.dispatcher = new AgentDispatcher(outputDir);
    this.emitter = new OrchestrationEventEmitter();
  }

  /**
   * Queue a task for execution
   */
  queueTask(task: FarmTask): string {
    this.taskQueue.set(task.taskId, task);
    this.emitter.emit(createTaskQueuedEvent(task));
    return task.taskId;
  }

  /**
   * Queue multiple tasks
   */
  queueBatch(tasks: FarmTask[]): string[] {
    return tasks.map(task => this.queueTask(task));
  }

  /**
   * Execute a single task
   * Note: In a real implementation, this would use Claude Code's Task tool
   */
  async executeTask(taskId: string): Promise<FarmResult> {
    const task = this.taskQueue.get(taskId);

    if (!task) {
      return createFarmResult(taskId, 'unknown', 'failure', 'Task not found');
    }

    // Dispatch to an agent
    const dispatch = this.dispatcher.dispatch(task);

    if (!dispatch) {
      return createFarmResult(taskId, 'unknown', 'blocked', 'No agent available');
    }

    const { agentId, outputFile } = dispatch;

    // Create and register agent status
    const status = createAgentStatus(agentId, taskId, outputFile);
    this.registry.set(agentId, markAgentRunning(status));

    this.emitter.emit(createTaskStartedEvent(taskId, agentId));

    // Simulate task execution
    // In real implementation, this would call the Task tool
    const startTime = Date.now();

    try {
      // Simulated execution - in real use this would be:
      // const result = await TaskTool.execute(task);
      const result = await this.simulateExecution(task, agentId);

      // Update registry
      this.registry.set(agentId, markAgentComplete(this.registry.get(agentId)!));

      // Release agent
      this.dispatcher.release(agentId);

      // Store result
      const farmResult = createFarmResult(
        taskId,
        agentId,
        'success',
        result,
        { duration: Date.now() - startTime }
      );

      this.results.push(farmResult);
      this.taskQueue.delete(taskId);

      this.emitter.emit(createTaskCompletedEvent(farmResult));

      return farmResult;
    } catch (error) {
      // Update registry
      this.registry.set(agentId, markAgentFailed(this.registry.get(agentId)!));

      // Release agent
      this.dispatcher.release(agentId);

      const errorMessage = error instanceof Error ? error.message : String(error);

      this.emitter.emit(createTaskFailedEvent(taskId, errorMessage));

      const failResult = createFarmResult(
        taskId,
        agentId,
        'failure',
        errorMessage,
        {
          duration: Date.now() - startTime,
          issues: [errorMessage],
        }
      );

      this.results.push(failResult);
      return failResult;
    }
  }

  /**
   * Execute multiple tasks
   */
  async executeBatch(
    taskIds: string[],
    options: BatchOptions = {}
  ): Promise<AggregatedResults> {
    const { parallel = 3, failFast = false, timeout } = options;

    const aggregator = new ResultAggregator();
    const sortedTasks = sortByPriority(
      taskIds.map(id => this.taskQueue.get(id)).filter(Boolean) as FarmTask[]
    );

    // Execute in batches of `parallel` size
    for (let i = 0; i < sortedTasks.length; i += parallel) {
      const batch = sortedTasks.slice(i, i + parallel);

      const batchPromises = batch.map(task =>
        timeout
          ? Promise.race([
              this.executeTask(task.taskId),
              new Promise<FarmResult>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), timeout)
              ),
            ])
          : this.executeTask(task.taskId)
      );

      const results = await Promise.allSettled(batchPromises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          aggregator.add(result.value);

          if (failFast && result.value.status === 'failure') {
            break;
          }
        } else {
          // Handle rejected promise
          aggregator.add(
            createFarmResult('unknown', 'unknown', 'failure', result.reason?.message || 'Unknown error')
          );

          if (failFast) {
            break;
          }
        }
      }
    }

    const aggregated = aggregator.aggregate();
    this.emitter.emit(createBatchCompletedEvent(aggregated));

    return aggregated;
  }

  /**
   * Get status of a specific task
   */
  getStatus(taskId: string): AgentStatus | undefined {
    return this.registry.getByTask(taskId);
  }

  /**
   * Get all agent statuses
   */
  getAllStatus(): AgentStatus[] {
    return this.registry.getAll();
  }

  /**
   * Add event handler
   */
  on(handler: OrchestrationEventHandler): void {
    this.emitter.on(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: OrchestrationEventHandler): void {
    this.emitter.off(handler);
  }

  /**
   * Get current state (for persistence)
   */
  getState(): OrchestrationState {
    return {
      activeTasks: new Map(this.taskQueue),
      agentStatus: new Map(
        this.registry.getAll().map(s => [s.agentId, s])
      ),
      pendingResults: [...this.results],
    };
  }

  /**
   * Restore state (after compaction)
   */
  restoreState(state: OrchestrationState): void {
    this.taskQueue = new Map(state.activeTasks);

    for (const [agentId, status] of state.agentStatus) {
      this.registry.set(agentId, status);
    }

    this.results = [...state.pendingResults];
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): FarmTask[] {
    return Array.from(this.taskQueue.values());
  }

  /**
   * Get completed results
   */
  getResults(): FarmResult[] {
    return [...this.results];
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.taskQueue.clear();
    this.registry.clear();
    this.results = [];
  }

  /**
   * Simulate task execution (for testing)
   * In real implementation, this would use Claude Code's Task tool
   */
  private async simulateExecution(task: FarmTask, _agentId: string): Promise<string> {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));

    return `Completed: ${task.description}`;
  }
}
