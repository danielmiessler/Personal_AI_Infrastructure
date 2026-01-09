import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import {
  ConsoleAuditLogger,
  NoopAuditLogger,
  createLogEntry,
  type AuditLogEntry,
} from '../src/utils/logger.ts';

describe('ConsoleAuditLogger', () => {
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should log successful operations', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date('2026-01-07T10:00:00Z'),
      operation: 'list_runs',
      provider: 'github',
      repo: 'owner/repo',
      success: true,
      latencyMs: 150
    };

    logger.log(entry);

    expect(consoleSpy).toHaveBeenCalled();
    const logMessage = consoleSpy.mock.calls[0][0];
    expect(logMessage).toContain('[CICD]');
    expect(logMessage).toContain('LIST_RUNS');
    expect(logMessage).toContain('provider=github');
    expect(logMessage).toContain('repo=owner/repo');
    expect(logMessage).toContain('SUCCESS');
    expect(logMessage).toContain('150ms');
  });

  test('should log failed operations', () => {
    const logger = new ConsoleAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date('2026-01-07T10:00:00Z'),
      operation: 'trigger',
      provider: 'gitlab',
      repo: 'group/project',
      target: 'ci-pipeline',
      success: false,
      errorCode: 'TRIGGER_ERROR',
      latencyMs: 50
    };

    logger.log(entry);

    expect(consoleSpy).toHaveBeenCalled();
    const logMessage = consoleSpy.mock.calls[0][0];
    expect(logMessage).toContain('TRIGGER');
    expect(logMessage).toContain('FAILED(TRIGGER_ERROR)');
    expect(logMessage).toContain('target=ci-pipeline');
  });

  test('should not log when silent', () => {
    const logger = new ConsoleAuditLogger(true);
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'health',
      provider: 'github',
      success: true,
      latencyMs: 10
    };

    logger.log(entry);

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('NoopAuditLogger', () => {
  test('should not throw on log', () => {
    const logger = new NoopAuditLogger();
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      operation: 'list_pipelines',
      provider: 'github',
      success: true,
      latencyMs: 100
    };

    expect(() => logger.log(entry)).not.toThrow();
  });
});

describe('createLogEntry', () => {
  test('should create success entry', () => {
    const startTime = Date.now() - 100;
    const entry = createLogEntry('get_run', 'github', startTime, {
      repo: 'owner/repo',
      target: 'run-123',
      success: true
    });

    expect(entry.operation).toBe('get_run');
    expect(entry.provider).toBe('github');
    expect(entry.repo).toBe('owner/repo');
    expect(entry.target).toBe('run-123');
    expect(entry.success).toBe(true);
    expect(entry.latencyMs).toBeGreaterThanOrEqual(100);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  test('should create failure entry', () => {
    const startTime = Date.now();
    const entry = createLogEntry('download', 'gitlab', startTime, {
      repo: 'group/project',
      target: 'artifact-456',
      success: false,
      errorCode: 'ARTIFACT_NOT_FOUND'
    });

    expect(entry.success).toBe(false);
    expect(entry.errorCode).toBe('ARTIFACT_NOT_FOUND');
  });

  test('should default success to true', () => {
    const entry = createLogEntry('health', 'mock', Date.now());

    expect(entry.success).toBe(true);
  });

  test('should include metadata', () => {
    const entry = createLogEntry('trigger', 'github', Date.now(), {
      repo: 'owner/repo',
      metadata: { branch: 'main', inputs: { deploy: 'true' } }
    });

    expect(entry.metadata).toEqual({ branch: 'main', inputs: { deploy: 'true' } });
  });
});
