import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';
import {
  ConsoleAuditLogger,
  NoopAuditLogger,
  createLogEntry,
  type AuditLogEntry
} from '../src/utils/logger.ts';

describe('ConsoleAuditLogger', () => {
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs successful operations', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date('2026-01-07T12:00:00Z'),
      operation: 'create',
      provider: 'joplin',
      target: 'issue-123',
      success: true,
      latencyMs: 42
    };

    logger.log(entry);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logMessage = consoleSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('[ISSUES]');
    expect(logMessage).toContain('CREATE');
    expect(logMessage).toContain('provider=joplin');
    expect(logMessage).toContain('target=issue-123');
    expect(logMessage).toContain('status=SUCCESS');
    expect(logMessage).toContain('latency=42ms');
  });

  it('logs failed operations with error code', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date('2026-01-07T12:00:00Z'),
      operation: 'read',
      provider: 'linear',
      target: 'issue-456',
      success: false,
      errorCode: 'ISSUE_NOT_FOUND',
      latencyMs: 15
    };

    logger.log(entry);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logMessage = consoleSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('status=FAILED(ISSUE_NOT_FOUND)');
  });

  it('handles missing target', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date('2026-01-07T12:00:00Z'),
      operation: 'list',
      provider: 'joplin',
      success: true,
      latencyMs: 100
    };

    logger.log(entry);

    const logMessage = consoleSpy.mock.calls[0][0] as string;
    expect(logMessage).toContain('target=-');
  });

  it('silences output when silent mode is enabled', () => {
    const logger = new ConsoleAuditLogger(true);
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'create',
      provider: 'joplin',
      success: true,
      latencyMs: 10
    };

    logger.log(entry);

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('NoopAuditLogger', () => {
  it('does not log anything', () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
    const logger = new NoopAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'create',
      provider: 'joplin',
      success: true,
      latencyMs: 10
    };

    logger.log(entry);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('createLogEntry', () => {
  it('creates a log entry with defaults', () => {
    const startTime = Date.now() - 50;
    const entry = createLogEntry('create', 'joplin', startTime);

    expect(entry.operation).toBe('create');
    expect(entry.provider).toBe('joplin');
    expect(entry.success).toBe(true);
    expect(entry.latencyMs).toBeGreaterThanOrEqual(50);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('creates a log entry with custom options', () => {
    const startTime = Date.now() - 100;
    const entry = createLogEntry('update', 'linear', startTime, {
      target: 'issue-789',
      success: false,
      errorCode: 'RATE_LIMIT',
      metadata: { retries: 3 }
    });

    expect(entry.operation).toBe('update');
    expect(entry.provider).toBe('linear');
    expect(entry.target).toBe('issue-789');
    expect(entry.success).toBe(false);
    expect(entry.errorCode).toBe('RATE_LIMIT');
    expect(entry.metadata).toEqual({ retries: 3 });
  });

  it('calculates latency correctly', () => {
    const startTime = Date.now() - 200;
    const entry = createLogEntry('read', 'joplin', startTime);

    expect(entry.latencyMs).toBeGreaterThanOrEqual(200);
    expect(entry.latencyMs).toBeLessThan(300);
  });
});
