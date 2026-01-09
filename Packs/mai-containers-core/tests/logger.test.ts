import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import {
  ConsoleAuditLogger,
  NoopAuditLogger,
  createLogEntry,
  type AuditLogEntry,
} from '../src/index.ts';

describe('Logger', () => {
  describe('createLogEntry', () => {
    test('should create basic log entry', () => {
      const entry = createLogEntry('listDeployments', 'kubernetes', true, 50);

      expect(entry.operation).toBe('listDeployments');
      expect(entry.provider).toBe('kubernetes');
      expect(entry.success).toBe(true);
      expect(entry.latencyMs).toBe(50);
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    test('should create log entry with options', () => {
      const entry = createLogEntry('scaleDeployment', 'docker', false, 100, {
        target: 'my-app',
        errorCode: 'SCALE_ERROR',
        metadata: { replicas: 3 }
      });

      expect(entry.target).toBe('my-app');
      expect(entry.errorCode).toBe('SCALE_ERROR');
      expect(entry.metadata).toEqual({ replicas: 3 });
    });

    test('should create success entry without error code', () => {
      const entry = createLogEntry('getContainer', 'kubernetes', true, 25, {
        target: 'my-pod'
      });

      expect(entry.success).toBe(true);
      expect(entry.errorCode).toBeUndefined();
    });
  });

  describe('ConsoleAuditLogger', () => {
    let originalLog: typeof console.log;
    let logCalls: string[];

    beforeEach(() => {
      logCalls = [];
      originalLog = console.log;
      console.log = mock((...args: unknown[]) => {
        logCalls.push(args.map(String).join(' '));
      });
    });

    afterEach(() => {
      console.log = originalLog;
    });

    test('should log success entry', () => {
      const logger = new ConsoleAuditLogger();
      const entry: AuditLogEntry = {
        timestamp: new Date('2026-01-07T12:00:00Z'),
        operation: 'listDeployments',
        provider: 'kubernetes',
        target: 'default',
        success: true,
        latencyMs: 50
      };

      logger.log(entry);

      expect(logCalls.length).toBe(1);
      expect(logCalls[0]).toContain('[PLATFORM]');
      expect(logCalls[0]).toContain('LISTDEPLOYMENTS');
      expect(logCalls[0]).toContain('provider=kubernetes');
      expect(logCalls[0]).toContain('target=default');
      expect(logCalls[0]).toContain('status=SUCCESS');
      expect(logCalls[0]).toContain('latency=50ms');
    });

    test('should log failure entry', () => {
      const logger = new ConsoleAuditLogger();
      const entry: AuditLogEntry = {
        timestamp: new Date('2026-01-07T12:00:00Z'),
        operation: 'scaleDeployment',
        provider: 'docker',
        target: 'my-app',
        success: false,
        errorCode: 'SCALE_ERROR',
        latencyMs: 100
      };

      logger.log(entry);

      expect(logCalls.length).toBe(1);
      expect(logCalls[0]).toContain('status=FAILED(SCALE_ERROR)');
    });

    test('should handle missing target', () => {
      const logger = new ConsoleAuditLogger();
      const entry: AuditLogEntry = {
        timestamp: new Date('2026-01-07T12:00:00Z'),
        operation: 'healthCheck',
        provider: 'kubernetes',
        success: true,
        latencyMs: 25
      };

      logger.log(entry);

      expect(logCalls.length).toBe(1);
      expect(logCalls[0]).toContain('target=-');
    });
  });

  describe('NoopAuditLogger', () => {
    test('should not log anything', () => {
      const logger = new NoopAuditLogger();
      const entry: AuditLogEntry = {
        timestamp: new Date(),
        operation: 'listDeployments',
        provider: 'kubernetes',
        success: true,
        latencyMs: 50
      };

      // Should not throw
      logger.log(entry);
    });
  });
});
