import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import {
  ConsoleAuditLogger,
  NoOpLogger,
  setAuditLogger,
  getAuditLogger,
  logAudit,
  type AuditLogEntry
} from '../src/utils/logger.ts';

describe('AuditLogger', () => {
  const createEntry = (overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
    timestamp: new Date('2026-01-07T12:00:00Z'),
    operation: 'get',
    provider: 'test-provider',
    key: 'TEST_SECRET',
    success: true,
    latencyMs: 42,
    ...overrides
  });

  describe('ConsoleAuditLogger', () => {
    it('logs success entry correctly', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const logger = new ConsoleAuditLogger();
      const entry = createEntry();

      logger.log(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SECRETS] 2026-01-07T12:00:00.000Z GET provider=test-provider target=TEST_SECRET status=SUCCESS latency=42ms'
      );
      consoleSpy.mockRestore();
    });

    it('logs failure entry with error code', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const logger = new ConsoleAuditLogger();
      const entry = createEntry({
        success: false,
        errorCode: 'SECRET_NOT_FOUND'
      });

      logger.log(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('status=FAILED(SECRET_NOT_FOUND)')
      );
      consoleSpy.mockRestore();
    });

    it('logs getBatch with key count', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const logger = new ConsoleAuditLogger();
      const entry = createEntry({
        operation: 'getBatch',
        key: undefined,
        keys: ['KEY1', 'KEY2', 'KEY3']
      });

      logger.log(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('target=[3 keys]')
      );
      consoleSpy.mockRestore();
    });

    it('logs list with pattern', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const logger = new ConsoleAuditLogger();
      const entry = createEntry({
        operation: 'list',
        key: undefined,
        pattern: 'API_*'
      });

      logger.log(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('target=API_*')
      );
      consoleSpy.mockRestore();
    });

    it('logs healthCheck with dash target', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const logger = new ConsoleAuditLogger();
      const entry = createEntry({
        operation: 'healthCheck',
        key: undefined
      });

      logger.log(entry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('HEALTHCHECK')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('target=-')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('NoOpLogger', () => {
    it('does nothing when log is called', () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const logger = new NoOpLogger();
      const entry = createEntry();

      logger.log(entry);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('global logger functions', () => {
    beforeEach(() => {
      // Reset to default logger
      setAuditLogger(new ConsoleAuditLogger());
    });

    it('setAuditLogger changes the global logger', () => {
      const customLogger = new NoOpLogger();
      setAuditLogger(customLogger);
      expect(getAuditLogger()).toBe(customLogger);
    });

    it('getAuditLogger returns current logger', () => {
      const logger = getAuditLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.log).toBe('function');
    });

    it('logAudit uses the global logger', () => {
      const mockLogger = { log: mock(() => {}) };
      setAuditLogger(mockLogger);

      const entry = createEntry();
      logAudit(entry);

      expect(mockLogger.log).toHaveBeenCalledWith(entry);
    });
  });
});
