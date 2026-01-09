/**
 * Type exports for mai-orchestration-core
 */

export type {
  TaskType,
  TaskPriority,
  ResultStatus,
  FarmTask,
  FarmResult,
} from './task.ts';

export {
  createFarmTask,
  createFarmResult,
  isSuccessResult,
  getPriorityOrder,
  sortByPriority,
} from './task.ts';

export type {
  AgentStatusType,
  AgentStatus,
  AgentConfig,
} from './agent.ts';

export {
  AgentRegistry,
  createAgentStatus,
  markAgentRunning,
  markAgentComplete,
  markAgentFailed,
  calculateAgentDuration,
} from './agent.ts';

export type {
  AggregatedResults,
} from './results.ts';

export {
  ResultAggregator,
  aggregateResults,
  isOverallSuccess,
  formatResultsMarkdown,
} from './results.ts';

export type {
  OrchestrationEvent,
  OrchestrationEventHandler,
} from './events.ts';

export {
  OrchestrationEventEmitter,
  LoggingEventHandler,
  createTaskQueuedEvent,
  createTaskStartedEvent,
  createTaskProgressEvent,
  createTaskCompletedEvent,
  createTaskFailedEvent,
  createBatchCompletedEvent,
} from './events.ts';
