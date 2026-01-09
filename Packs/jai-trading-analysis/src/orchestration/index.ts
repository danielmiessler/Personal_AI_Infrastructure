/**
 * Orchestration Module
 *
 * Provides Claude Code integration, context building, and event
 * queue management for automated trading decisions.
 */

// Types
export type {
  ClaudeRequest,
  ClaudeResponse,
  EventType,
  EventPriority,
  QueuedEvent,
  EventData,
  PortfolioContext,
  MarketContext,
  AlertContext,
  PolicyContext,
  ContextData,
} from './types';

export { PRIORITY_SCORES, DEFAULT_EVENT_PRIORITY } from './types';

// Claude Orchestrator
export { ClaudeOrchestrator, ClaudeError } from './claude';
export type { ClaudeOrchestratorOptions } from './claude';

// Context Builder
export { ContextBuilder } from './context';

// Event Queue
export { EventQueue } from './queue';
export type { QueueStats } from './queue';
