/**
 * Config Module - Type Definitions
 *
 * All types for JAI configuration and investment policy.
 */

// ============================================================================
// Policy Metadata
// ============================================================================

export interface PolicyMeta {
  /** Policy name */
  name: string;
  /** Policy version (semver) */
  version: string;
  /** Last review date (ISO 8601) */
  last_review: string;
  /** Next scheduled review date (ISO 8601) */
  next_review: string;
}

// ============================================================================
// Policy Objectives
// ============================================================================

export interface PolicyObjectives {
  /** Primary investment objective */
  primary: string;
  /** Secondary objectives */
  secondary: string[];
  /** Tactical/short-term objectives */
  tactical: string[];
  /** Target annual return percentage (optional) */
  target_return?: number;
  /** Investment time horizon in years (optional) */
  time_horizon?: number;
}

// ============================================================================
// Policy Constraints
// ============================================================================

export interface PolicyConstraints {
  /** Maximum percentage of portfolio in any single position */
  max_single_position: number;
  /** Maximum percentage allocated to penny stocks (< $5) */
  penny_stock_max: number;
  /** Maximum percentage in any single sector */
  max_sector_concentration: number;
  /** Minimum cash reserve percentage */
  cash_reserve: number;
  /** Emergency reserve amount in dollars (optional) */
  emergency_reserve?: number;
  /** Maximum trades per day (optional) */
  max_daily_trades?: number;
  /** Minimum position size in dollars (optional) */
  min_position_size?: number;
  /** Maximum portfolio drawdown before action required (optional) */
  max_portfolio_drawdown?: number;
  /** Stop loss percentage for individual stocks (optional) */
  single_stock_stop_loss?: number;
}

// ============================================================================
// Policy Rules
// ============================================================================

export interface PolicyRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule definition/criteria */
  rule: string;
  /** Rationale for the rule (optional) */
  rationale?: string;
  /** Exception conditions (optional) */
  exception?: string;
}

export interface PolicyRules {
  /** Rules for entering positions */
  entry: PolicyRule[];
  /** Rules for exiting positions */
  exit: PolicyRule[];
  /** Rules for holding positions */
  hold: PolicyRule[];
}

// ============================================================================
// Policy Schedule
// ============================================================================

export interface PolicySchedule {
  /** Daily tasks/checks */
  daily: string[];
  /** Weekly tasks/reviews */
  weekly: string[];
  /** Monthly tasks/reviews */
  monthly: string[];
  /** Quarterly tasks/reviews */
  quarterly: string[];
}

// ============================================================================
// Policy Escalation
// ============================================================================

export interface PolicyEscalation {
  /** Actions that can be auto-approved */
  auto_approve: string[];
  /** Actions that notify and wait for timeout */
  notify_and_wait: string[];
  /** Actions that require explicit discussion */
  requires_discussion: string[];
}

// ============================================================================
// Policy Notifications
// ============================================================================

export interface NotificationPreferences {
  /** Notification types that are enabled */
  enabled: string[];
  /** Quiet hours (e.g., "22:00-07:00") */
  quiet_hours?: string;
  /** Urgency levels that bypass quiet hours */
  bypass_quiet?: string[];
}

export interface PolicyNotifications {
  /** Notification channels (e.g., ["discord", "email"]) */
  channels: string[];
  /** Notification preferences */
  preferences: NotificationPreferences;
}

// ============================================================================
// Full Policy
// ============================================================================

export interface Policy {
  /** Policy metadata */
  meta: PolicyMeta;
  /** Investment objectives */
  objectives: PolicyObjectives;
  /** Investment constraints */
  constraints: PolicyConstraints;
  /** Trading rules */
  rules: PolicyRules;
  /** Scheduled tasks/reviews */
  schedule: PolicySchedule;
  /** Escalation definitions */
  escalation: PolicyEscalation;
  /** Notification settings */
  notifications: PolicyNotifications;
}

// ============================================================================
// JAI Configuration
// ============================================================================

export interface ApiKeys {
  /** Finnhub API key */
  finnhub?: string;
  /** Alpaca API key */
  alpaca_key?: string;
  /** Alpaca API secret */
  alpaca_secret?: string;
  /** Discord webhook URL */
  discord_webhook?: string;
  /** Additional API keys */
  [key: string]: string | undefined;
}

export interface JAIConfig {
  /** Path to policy YAML file */
  policyPath: string;
  /** Directory for data storage */
  dataDir: string;
  /** Directory for cache files */
  cacheDir: string;
  /** Environment/API keys */
  env: ApiKeys;
}

// ============================================================================
// Constraint Check Result
// ============================================================================

export interface ConstraintCheckResult {
  /** Whether the constraint passed */
  passed: boolean;
  /** The constraint limit */
  limit: number;
  /** The current value being checked */
  current: number;
  /** The constraint name */
  constraint: string;
}

// ============================================================================
// Event Types for Rule Matching
// ============================================================================

export type RuleEventType = 'entry' | 'exit' | 'hold';
