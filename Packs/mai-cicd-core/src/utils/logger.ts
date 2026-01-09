/**
 * Audit log entry for CI/CD operations
 */
export interface AuditLogEntry {
  timestamp: Date;
  operation: 'list_pipelines' | 'get_pipeline' | 'list_runs' | 'get_run' | 'trigger' | 'cancel' | 'retry' | 'list_jobs' | 'get_logs' | 'list_artifacts' | 'download' | 'health';
  provider: string;
  repo?: string;
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

    const { timestamp, operation, provider, repo, target, success, errorCode, latencyMs } = entry;
    const status = success ? 'SUCCESS' : `FAILED(${errorCode})`;
    const repoStr = repo ? ` repo=${repo}` : '';
    const targetStr = target ? ` target=${target}` : '';
    console.log(
      `[CICD] ${timestamp.toISOString()} ${operation.toUpperCase()} ` +
      `provider=${provider}${repoStr}${targetStr} status=${status} latency=${latencyMs}ms`
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
    repo?: string;
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
    repo: options.repo,
    target: options.target,
    success: options.success ?? true,
    errorCode: options.errorCode,
    latencyMs: Date.now() - startTime,
    metadata: options.metadata,
  };
}
