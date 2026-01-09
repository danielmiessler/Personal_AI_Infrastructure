import { describe, test, expect, beforeEach } from 'bun:test';
import {
  invalidateAdapterCache,
  getAdapterCacheStatus,
  invalidateConfigCache,
  validateDomainConfig,
  ConfigurationError,
  type DomainConfig,
} from '../src/index.ts';

describe('Discovery', () => {
  beforeEach(() => {
    invalidateAdapterCache();
    invalidateConfigCache();
  });

  describe('Adapter Cache', () => {
    test('should start with empty cache', () => {
      const status = getAdapterCacheStatus();
      expect(status.cached).toBe(false);
    });

    test('should invalidate cache', () => {
      invalidateAdapterCache();
      const status = getAdapterCacheStatus();
      expect(status.cached).toBe(false);
    });
  });

  describe('Config Validation', () => {
    test('should validate valid config', () => {
      const config: DomainConfig = {
        primary: 'kubernetes',
        adapters: {
          kubernetes: { context: 'home' }
        }
      };

      expect(() => validateDomainConfig(config)).not.toThrow();
    });

    test('should reject config without primary', () => {
      const config = {
        adapters: { kubernetes: {} }
      } as DomainConfig;

      expect(() => validateDomainConfig(config)).toThrow(ConfigurationError);
    });

    test('should reject config without adapters', () => {
      const config = {
        primary: 'kubernetes'
      } as DomainConfig;

      expect(() => validateDomainConfig(config)).toThrow(ConfigurationError);
    });

    test('should accept config with fallback', () => {
      const config: DomainConfig = {
        primary: 'kubernetes',
        fallback: 'docker',
        adapters: {
          kubernetes: {},
          docker: {}
        }
      };

      expect(() => validateDomainConfig(config)).not.toThrow();
    });
  });
});
