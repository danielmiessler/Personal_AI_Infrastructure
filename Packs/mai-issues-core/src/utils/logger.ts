/**
 * Audit log entry for issues operations
 */
export interface AuditLogEntry {
  timestamp: Date;
  operation: 'create' | 'read' | 'update' | 'delete' | 'list' | 'search' | 'health';
  provider: string;
  target?: string;
  success: boolean;
  errorCode?: string;
  latencyMs: number;
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
  constructor(private readonly silent: boolean = false) {}

  log(entry: AuditLogEntry): void {
    if (this.silent) return;

    const { timestamp, operation, provider, target, success, errorCode, latencyMs } = entry;
    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    console.log(
      `[ISSUES] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider} target=${target || '-'} status=${status} latency=${latencyMs}ms`
    );
  }
}

/**
 * No-op logger for testing
 */
export class NoopAuditLogger implements AuditLogger {
  log(_entry: AuditLogEntry): void {
    // Intentionally empty
  }
}

/**
 * Create an audit log entry helper
 */
export function createLogEntry(
  operation: AuditLogEntry['operation'],
  provider: string,
  startTime: number,
  options: {
    target?: string;
    success?: boolean;
    errorCode?: string;
    metadata?: Record<string, unknown>;
  } = {}
): AuditLogEntry {
  return {
    timestamp: new Date(),
    operation,
    provider,
    target: options.target,
    success: options.success ?? true,
    errorCode: options.errorCode,
    latencyMs: Date.now() - startTime,
    metadata: options.metadata,
  };
}
