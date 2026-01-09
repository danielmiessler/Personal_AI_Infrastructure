import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import {
  ConsoleAuditLogger,
  NoopAuditLogger,
  createLogEntry,
  type AuditLogEntry,
} from '../src/index.ts';

describe('ConsoleAuditLogger', () => {
  let originalLog: typeof console.log;
  let logSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    originalLog = console.log;
    logSpy = mock(() => {});
    console.log = logSpy;
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('should log entry to console', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date('2026-01-07T12:00:00Z'),
      operation: 'instant_query',
      provider: 'prometheus',
      query: 'up{job="prometheus"}',
      success: true,
      latencyMs: 15,
    };

    logger.log(entry);

    expect(logSpy).toHaveBeenCalled();
    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toContain('[OBSERVABILITY]');
    expect(logMessage).toContain('INSTANT_QUERY');
    expect(logMessage).toContain('prometheus');
    expect(logMessage).toContain('SUCCESS');
  });

  test('should truncate long queries', () => {
    const logger = new ConsoleAuditLogger();
    const longQuery = 'a'.repeat(100);
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'range_query',
      provider: 'prometheus',
      query: longQuery,
      success: true,
      latencyMs: 50,
    };

    logger.log(entry);

    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toContain('...');
  });

  test('should show error code on failure', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'instant_query',
      provider: 'prometheus',
      query: 'invalid[',
      success: false,
      errorCode: 'QUERY_ERROR',
      latencyMs: 5,
    };

    logger.log(entry);

    const logMessage = logSpy.mock.calls[0][0];
    expect(logMessage).toContain('FAILED(QUERY_ERROR)');
  });

  test('should not log when silent', () => {
    const logger = new ConsoleAuditLogger(true);
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'health',
      provider: 'prometheus',
      success: true,
      latencyMs: 10,
    };

    logger.log(entry);

    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe('NoopAuditLogger', () => {
  test('should not throw', () => {
    const logger = new NoopAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'list_alerts',
      provider: 'prometheus',
      success: true,
      latencyMs: 20,
    };

    expect(() => logger.log(entry)).not.toThrow();
  });
});

describe('createLogEntry', () => {
  test('should create entry with calculated latency', () => {
    const startTime = Date.now() - 100;
    const entry = createLogEntry('instant_query', 'prometheus', startTime, {
      query: 'up',
      success: true,
    });

    expect(entry.operation).toBe('instant_query');
    expect(entry.provider).toBe('prometheus');
    expect(entry.query).toBe('up');
    expect(entry.success).toBe(true);
    expect(entry.latencyMs).toBeGreaterThanOrEqual(100);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  test('should default success to true', () => {
    const entry = createLogEntry('health', 'prometheus', Date.now());

    expect(entry.success).toBe(true);
  });

  test('should include error code on failure', () => {
    const entry = createLogEntry('range_query', 'prometheus', Date.now(), {
      success: false,
      errorCode: 'QUERY_TIMEOUT',
    });

    expect(entry.success).toBe(false);
    expect(entry.errorCode).toBe('QUERY_TIMEOUT');
  });

  test('should include metadata', () => {
    const entry = createLogEntry('list_alerts', 'prometheus', Date.now(), {
      metadata: { state: 'firing', count: 5 },
    });

    expect(entry.metadata?.state).toBe('firing');
    expect(entry.metadata?.count).toBe(5);
  });
});
