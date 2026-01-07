/**
 * Resource usage information
 */
export interface ResourceUsage {
  /** Namespace */
  namespace: string;

  /** Container name (if specific) */
  container?: string;

  /** CPU usage */
  cpu: ResourceMetric;

  /** Memory usage */
  memory: ResourceMetric;

  /** Measurement timestamp */
  timestamp: Date;
}

/**
 * Single resource metric
 */
export interface ResourceMetric {
  /** Current usage (e.g., "100m", "256Mi") */
  used: string;

  /** Requested amount */
  requested?: string;

  /** Limit amount */
  limit?: string;

  /** Usage percentage (0-100) */
  percentage?: number;
}

/**
 * Health status information
 */
export interface HealthStatus {
  /** Whether the provider is healthy */
  healthy: boolean;

  /** Status message */
  message?: string;

  /** Response latency in milliseconds */
  latencyMs?: number;

  /** Additional details */
  details?: Record<string, unknown>;
}
