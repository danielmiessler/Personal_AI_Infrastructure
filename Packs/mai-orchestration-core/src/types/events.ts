/**
 * Orchestration Event Types
 *
 * Types for event-driven orchestration monitoring.
 */

import type { FarmTask, FarmResult } from './task.ts';
import type { AggregatedResults } from './results.ts';

export type OrchestrationEvent =
  | { type: 'task_queued'; task: FarmTask }
  | { type: 'task_started'; taskId: string; agentId: string }
  | { type: 'task_progress'; taskId: string; progress: number }
  | { type: 'task_completed'; result: FarmResult }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'batch_completed'; results: AggregatedResults };

export interface OrchestrationEventHandler {
  onEvent(event: OrchestrationEvent): void;
}

/**
 * Event emitter for orchestration events
 */
export class OrchestrationEventEmitter {
  private handlers: OrchestrationEventHandler[] = [];

  /**
   * Add an event handler
   */
  on(handler: OrchestrationEventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Remove an event handler
   */
  off(handler: OrchestrationEventHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all handlers
   */
  emit(event: OrchestrationEvent): void {
    for (const handler of this.handlers) {
      try {
        handler.onEvent(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Get handler count
   */
  get handlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers = [];
  }
}

/**
 * Create event helpers
 */
export function createTaskQueuedEvent(task: FarmTask): OrchestrationEvent {
  return { type: 'task_queued', task };
}

export function createTaskStartedEvent(taskId: string, agentId: string): OrchestrationEvent {
  return { type: 'task_started', taskId, agentId };
}

export function createTaskProgressEvent(taskId: string, progress: number): OrchestrationEvent {
  return { type: 'task_progress', taskId, progress };
}

export function createTaskCompletedEvent(result: FarmResult): OrchestrationEvent {
  return { type: 'task_completed', result };
}

export function createTaskFailedEvent(taskId: string, error: string): OrchestrationEvent {
  return { type: 'task_failed', taskId, error };
}

export function createBatchCompletedEvent(results: AggregatedResults): OrchestrationEvent {
  return { type: 'batch_completed', results };
}

/**
 * Simple logging handler
 */
export class LoggingEventHandler implements OrchestrationEventHandler {
  onEvent(event: OrchestrationEvent): void {
    const timestamp = new Date().toISOString();
    switch (event.type) {
      case 'task_queued':
        console.log(`[${timestamp}] Task queued: ${event.task.taskId}`);
        break;
      case 'task_started':
        console.log(`[${timestamp}] Task started: ${event.taskId} (agent: ${event.agentId})`);
        break;
      case 'task_progress':
        console.log(`[${timestamp}] Task progress: ${event.taskId} - ${event.progress}%`);
        break;
      case 'task_completed':
        console.log(`[${timestamp}] Task completed: ${event.result.taskId} - ${event.result.status}`);
        break;
      case 'task_failed':
        console.log(`[${timestamp}] Task failed: ${event.taskId} - ${event.error}`);
        break;
      case 'batch_completed':
        console.log(`[${timestamp}] Batch completed: ${event.results.summary}`);
        break;
    }
  }
}
