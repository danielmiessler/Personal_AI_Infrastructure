/**
 * HealthStatus - Result of a provider health check
 */
export interface HealthStatus {
  /** Whether the provider is healthy */
  healthy: boolean;
  /** Human-readable status message */
  message?: string;
  /** Health check latency in milliseconds */
  latencyMs?: number;
  /** Additional provider-specific details */
  details?: Record<string, unknown>;
}
