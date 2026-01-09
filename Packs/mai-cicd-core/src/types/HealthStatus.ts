/**
 * HealthStatus - Provider health check result
 */
export interface HealthStatus {
  /** Whether the provider is operational */
  healthy: boolean;
  /** Human-readable status message */
  message?: string;
  /** Response latency in milliseconds */
  latencyMs?: number;
  /** Additional diagnostic details */
  details?: Record<string, unknown>;
}
