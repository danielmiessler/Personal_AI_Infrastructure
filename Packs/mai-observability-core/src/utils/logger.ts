/**
 * Audit log entry for Observability operations
 */
export interface AuditLogEntry {
  timestamp: Date;
  operation: 'instant_query' | 'range_query' | 'metric_names' | 'label_values' | 'list_alerts' | 'get_alert' | 'list_rules' | 'list_targets' | 'health';
  provider: string;
  query?: string;
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

    const { timestamp, operation, provider, query, target, success, errorCode, latencyMs } = entry;
    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    const queryStr = query ? ` query="${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"` : '';
    const targetStr = target ? ` target=${target}` : '';
    console.log(
      `[OBSERVABILITY] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider}${queryStr}${targetStr} status=${status} latency=${latencyMs}ms`
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
    query?: string;
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
    query: options.query,
    target: options.target,
    success: options.success ?? true,
    errorCode: options.errorCode,
    latencyMs: Date.now() - startTime,
    metadata: options.metadata,
  };
}
