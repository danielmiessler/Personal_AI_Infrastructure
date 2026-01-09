/**
 * AuditLogEntry - Record of a secrets operation
 *
 * IMPORTANT: Never log secret values. Only log keys/identifiers.
 */
export interface AuditLogEntry {
  /** When the operation occurred */
  timestamp: Date;
  /** Type of operation */
  operation: 'get' | 'getBatch' | 'list' | 'healthCheck';
  /** Provider that handled the operation */
  provider: string;
  /** Secret key (for 'get' operations) - NEVER log the value */
  key?: string;
  /** Secret keys (for 'getBatch' operations) - NEVER log values */
  keys?: string[];
  /** Pattern (for 'list' operations) */
  pattern?: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Error code if operation failed */
  errorCode?: string;
  /** Operation latency in milliseconds */
  latencyMs: number;
  /** Additional metadata (no sensitive data) */
  metadata?: Record<string, unknown>;
}

/**
 * AuditLogger - Interface for audit logging implementations
 */
export interface AuditLogger {
  log(entry: AuditLogEntry): void;
}

/**
 * ConsoleAuditLogger - Default logger that outputs to console
 */
export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditLogEntry): void {
    const {
      timestamp,
      operation,
      provider,
      key,
      keys,
      pattern,
      success,
      errorCode,
      latencyMs
    } = entry;

    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    const target = key || (keys ? `[${keys.length} keys]` : pattern) || '-';

    console.log(
      `[SECRETS] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider} target=${target} status=${status} latency=${latencyMs}ms`
    );
  }
}

/**
 * NoOpLogger - Logger that does nothing (for testing)
 */
export class NoOpLogger implements AuditLogger {
  log(_entry: AuditLogEntry): void {
    // Intentionally empty
  }
}

// Global logger instance
let auditLogger: AuditLogger = new ConsoleAuditLogger();

/**
 * Set the global audit logger
 */
export function setAuditLogger(logger: AuditLogger): void {
  auditLogger = logger;
}

/**
 * Get the current audit logger
 */
export function getAuditLogger(): AuditLogger {
  return auditLogger;
}

/**
 * Log an audit entry using the global logger
 */
export function logAudit(entry: AuditLogEntry): void {
  auditLogger.log(entry);
}
