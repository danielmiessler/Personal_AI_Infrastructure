/**
 * Orchestration Module - Type Definitions
 *
 * Types for Claude Code integration, event queuing, and context building.
 */

// ============================================================================
// Claude Request/Response Types
// ============================================================================

/**
 * Request to Claude Code.
 */
export interface ClaudeRequest {
  /** The prompt to send to Claude */
  prompt: string;
  /** System prompt to set context/personality (optional) */
  systemPrompt?: string;
  /** Additional context to include (optional) */
  context?: string;
  /** Whether to parse response as JSON (optional) */
  jsonMode?: boolean;
}

/**
 * Response from Claude Code.
 */
export interface ClaudeResponse {
  /** Raw text content of the response */
  content: string;
  /** Parsed JSON if jsonMode was true and parsing succeeded */
  parsed?: unknown;
}

// ============================================================================
// Event Queue Types
// ============================================================================

/**
 * Types of events that can be queued.
 */
export type EventType =
  | 'STOP_LOSS'     // Position hit stop loss
  | 'PRICE_TARGET'  // Position hit price target
  | 'BUY_SIGNAL'    // Analysis suggests buying opportunity
  | 'ALERT';        // General alert/notification

/**
 * Priority levels for queued events.
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * An event waiting to be processed.
 */
export interface QueuedEvent {
  /** Type of event */
  type: EventType;
  /** Stock ticker symbol */
  ticker: string;
  /** Event-specific data */
  data: EventData;
  /** Priority level */
  priority: EventPriority;
  /** When the event was created */
  createdAt: string;
  /** Optional event ID for deduplication */
  id?: string;
}

/**
 * Event-specific data payload.
 */
export interface EventData {
  /** Current price when event was triggered */
  currentPrice?: number;
  /** Target/trigger price */
  triggerPrice?: number;
  /** Percentage change that triggered event */
  changePercent?: number;
  /** Description of what triggered the event */
  trigger?: string;
  /** Recommended action */
  suggestedAction?: string;
  /** Additional context */
  [key: string]: unknown;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Portfolio summary for context building.
 */
export interface PortfolioContext {
  /** Total portfolio value */
  totalValue: number;
  /** Available cash */
  cashAvailable: number;
  /** Number of positions */
  positionCount: number;
  /** Top positions by value */
  topPositions?: Array<{
    ticker: string;
    value: number;
    percent: number;
  }>;
}

/**
 * Market conditions for context building.
 */
export interface MarketContext {
  /** Current market status (open/closed) */
  status: 'open' | 'closed' | 'pre-market' | 'after-hours';
  /** Current date/time */
  timestamp: string;
  /** Major index movements if available */
  indices?: {
    sp500?: number;
    nasdaq?: number;
    dow?: number;
  };
}

/**
 * Alert summary for context building.
 */
export interface AlertContext {
  /** Number of pending alerts by type */
  counts: Record<EventType, number>;
  /** Most urgent pending alert if any */
  mostUrgent?: QueuedEvent;
}

/**
 * Policy summary for context building.
 */
export interface PolicyContext {
  /** Maximum position size allowed */
  maxPositionPercent: number;
  /** Maximum sector concentration */
  maxSectorPercent: number;
  /** Minimum cash reserve */
  minCashReserve: number;
  /** Key rules summary */
  keyRules?: string[];
}

/**
 * Combined context data for Claude prompts.
 */
export interface ContextData {
  /** Portfolio state summary */
  portfolio?: PortfolioContext;
  /** Market conditions */
  market?: MarketContext;
  /** Pending alerts */
  alerts?: AlertContext;
  /** Policy constraints summary */
  policy?: PolicyContext;
}

// ============================================================================
// Priority Configuration
// ============================================================================

/**
 * Priority scores for sorting events.
 */
export const PRIORITY_SCORES: Record<EventPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * Default priority by event type.
 */
export const DEFAULT_EVENT_PRIORITY: Record<EventType, EventPriority> = {
  STOP_LOSS: 'critical',
  PRICE_TARGET: 'high',
  BUY_SIGNAL: 'normal',
  ALERT: 'normal',
};
