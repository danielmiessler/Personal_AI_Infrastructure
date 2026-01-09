/**
 * mai-orchestration-framework
 *
 * Execution engine for multi-agent task orchestration.
 * Complements kai-council-framework for decisions/reviews by handling task execution.
 *
 * @packageDocumentation
 */

export { Orchestrator, type BatchOptions, type OrchestrationState } from './orchestrator.ts';
export { AgentDispatcher, type DispatchResult } from './dispatcher.ts';

// Re-export core types for convenience
export type {
  FarmTask,
  FarmResult,
  AgentStatus,
  AgentConfig,
  AggregatedResults,
  OrchestrationEvent,
  OrchestrationEventHandler,
} from 'mai-orchestration-core';

export {
  createFarmTask,
  createFarmResult,
  AgentRegistry,
  ResultAggregator,
  aggregateResults,
  isOverallSuccess,
  formatResultsMarkdown,
  LoggingEventHandler,
} from 'mai-orchestration-core';
