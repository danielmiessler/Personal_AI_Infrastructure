/**
 * AlertState - Current state of an alert
 */
export type AlertState = 'inactive' | 'pending' | 'firing';

/**
 * AlertSeverity - Severity level of an alert
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert - An active or pending alert instance
 */
export interface Alert {
  /** Alert name (from alerting rule) */
  name: string;
  /** Current alert state */
  state: AlertState;
  /** Alert severity (from labels, if present) */
  severity?: AlertSeverity;
  /** Alert labels */
  labels: Record<string, string>;
  /** Alert annotations (summary, description, etc.) */
  annotations: Record<string, string>;
  /** When the alert became active */
  activeAt?: Date;
  /** Current value that triggered the alert */
  value?: number;
  /** Unique identifier for deduplication */
  fingerprint: string;
}

/**
 * AlertRule - An alerting rule definition
 */
export interface AlertRule {
  /** Rule name */
  name: string;
  /** Rule group */
  group: string;
  /** PromQL query expression */
  query: string;
  /** For duration in seconds */
  duration: number;
  /** Rule labels */
  labels: Record<string, string>;
  /** Rule annotations */
  annotations: Record<string, string>;
  /** Current rule state (based on active alerts) */
  state: AlertState;
  /** Active alerts from this rule */
  alerts: Alert[];
  /** Last evaluation timestamp */
  lastEvaluation?: Date;
  /** Last evaluation duration in milliseconds */
  evaluationTime?: number;
}

/**
 * AlertQuery - Query options for listing alerts
 */
export interface AlertQuery {
  /** Filter by state */
  state?: AlertState | AlertState[];
  /** Filter by severity */
  severity?: AlertSeverity | AlertSeverity[];
  /** Filter by labels */
  labels?: Record<string, string>;
  /** Maximum results */
  limit?: number;
}

/**
 * AlertRuleQuery - Query options for listing alert rules
 */
export interface AlertRuleQuery {
  /** Filter by group */
  group?: string;
  /** Filter by state */
  state?: AlertState | AlertState[];
  /** Maximum results */
  limit?: number;
}
