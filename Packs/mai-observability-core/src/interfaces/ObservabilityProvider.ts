import type {
  QueryResult,
  InstantQueryOptions,
  RangeQueryOptions,
  MetricNamesOptions,
  LabelValuesOptions,
  Alert,
  AlertRule,
  AlertQuery,
  AlertRuleQuery,
  Target,
  TargetQuery,
  HealthStatus,
} from '../types/index.ts';

/**
 * Provider interface for observability systems.
 * Implemented by adapters for Prometheus, Datadog, etc.
 */
export interface ObservabilityProvider {
  /** Provider identifier (e.g., 'prometheus', 'datadog') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Metric operations

  /**
   * Execute an instant (point-in-time) query
   * @param query - PromQL or provider-specific query
   * @param options - Query options
   */
  instantQuery(query: string, options?: InstantQueryOptions): Promise<QueryResult>;

  /**
   * Execute a range query over a time window
   * @param query - PromQL or provider-specific query
   * @param options - Range and resolution options
   */
  rangeQuery(query: string, options: RangeQueryOptions): Promise<QueryResult>;

  /**
   * List available metric names
   * @param options - Filtering options
   */
  getMetricNames(options?: MetricNamesOptions): Promise<string[]>;

  /**
   * Get values for a specific label
   * @param labelName - The label to query
   * @param options - Filtering options
   */
  getLabelValues(labelName: string, options?: LabelValuesOptions): Promise<string[]>;

  // Alert operations

  /**
   * List alerts with optional filtering
   * @param options - Filter options
   */
  listAlerts(options?: AlertQuery): Promise<Alert[]>;

  /**
   * Get a specific alert by name
   * @param alertName - Alert name to retrieve
   */
  getAlert(alertName: string): Promise<Alert>;

  /**
   * List alert rules with optional filtering
   * @param options - Filter options
   */
  listAlertRules(options?: AlertRuleQuery): Promise<AlertRule[]>;

  // Target operations

  /**
   * List monitored targets/endpoints
   * @param options - Filter options
   */
  listTargets(options?: TargetQuery): Promise<Target[]>;

  // Health check

  /**
   * Check if provider is available and healthy
   */
  healthCheck(): Promise<HealthStatus>;
}
