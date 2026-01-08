/**
 * Audit log entry for platform operations
 */
export interface AuditLogEntry {
  /** When the operation occurred */
  timestamp: Date;

  /** Operation type (e.g., 'listDeployments', 'scaleDeployment') */
  operation: string;

  /** Provider that handled the operation */
  provider: string;

  /** Target resource identifier */
  target?: string;

  /** Whether the operation succeeded */
  success: boolean;

  /** Error code if failed */
  errorCode?: string;

  /** Operation latency in milliseconds */
  latencyMs: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Audit logger interface
 */
export interface AuditLogger {
  log(entry: AuditLogEntry): void;
}

/**
 * Console-based audit logger
 */
export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditLogEntry): void {
    const { timestamp, operation, provider, target, success, errorCode, latencyMs } = entry;
    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    console.log(
      `[PLATFORM] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider} target=${target || '-'} status=${status} latency=${latencyMs}ms`
    );
  }
}

/**
 * No-op audit logger (for testing or when logging is disabled)
 */
export class NoopAuditLogger implements AuditLogger {
  log(_entry: AuditLogEntry): void {
    // Intentionally empty
  }
}

/**
 * Create an audit log entry
 */
export function createLogEntry(
  operation: string,
  provider: string,
  success: boolean,
  latencyMs: number,
  options?: {
    target?: string;
    errorCode?: string;
    metadata?: Record<string, unknown>;
  }
): AuditLogEntry {
  return {
    timestamp: new Date(),
    operation,
    provider,
    target: options?.target,
    success,
    errorCode: options?.errorCode,
    latencyMs,
    metadata: options?.metadata
  };
}
