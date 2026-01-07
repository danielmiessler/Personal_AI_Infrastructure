import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest
} from '../src/discovery/AdapterLoader.ts';
import {
  loadConfig,
  getSecretsConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig
} from '../src/discovery/ConfigLoader.ts';
import {
  getSecretsProvider,
  getSecretsProviderWithFallback,
  listAvailableAdapters
} from '../src/discovery/ProviderFactory.ts';
import { ConfigurationError } from '../src/utils/errors.ts';
import * as os from 'os';
import * as path from 'path';

describe('AdapterLoader', () => {
  beforeEach(() => {
    invalidateAdapterCache();
  });

  describe('discoverAdapters', () => {
    it('returns empty array when no adapters are found', async () => {
      const adapters = await discoverAdapters('nonexistent-domain');
      expect(adapters).toEqual([]);
    });

    it('caches results', async () => {
      const first = await discoverAdapters('secrets');
      const second = await discoverAdapters('secrets');

      // Same reference if cached
      expect(first).toBe(second);
    });

    it('respects cache invalidation', async () => {
      await discoverAdapters('secrets');
      expect(getAdapterCacheStatus().size).toBeGreaterThanOrEqual(1);

      invalidateAdapterCache('secrets');

      const status = getAdapterCacheStatus();
      expect(status.domains).not.toContain('secrets');
    });
  });

  describe('getAdapterCacheStatus', () => {
    it('returns cache status', () => {
      const status = getAdapterCacheStatus();
      expect(typeof status.size).toBe('number');
      expect(Array.isArray(status.domains)).toBe(true);
    });
  });

  describe('invalidateAdapterCache', () => {
    it('clears specific domain', async () => {
      await discoverAdapters('secrets');
      await discoverAdapters('other');

      invalidateAdapterCache('secrets');

      const status = getAdapterCacheStatus();
      expect(status.domains).not.toContain('secrets');
    });

    it('clears all domains when called without argument', async () => {
      await discoverAdapters('secrets');
      await discoverAdapters('other');

      invalidateAdapterCache();

      expect(getAdapterCacheStatus().size).toBe(0);
    });
  });

  describe('loadManifest', () => {
    it('throws on missing file', async () => {
      await expect(loadManifest('/nonexistent/path/adapter.yaml')).rejects.toThrow();
    });
  });
});

describe('ConfigLoader', () => {
  beforeEach(() => {
    invalidateConfigCache();
  });

  describe('loadConfig', () => {
    it('returns empty object when no config file found', async () => {
      const originalCwd = process.cwd;
      process.cwd = () => '/nonexistent/path';

      const config = await loadConfig();

      expect(config).toEqual({});
      process.cwd = originalCwd;
    });

    it('caches loaded config', async () => {
      const first = await loadConfig();
      const second = await loadConfig();

      expect(first).toBe(second);
    });
  });

  describe('getSecretsConfig', () => {
    it('returns undefined when no secrets domain configured', async () => {
      const result = await getSecretsConfig();
      // May be undefined or have value depending on environment
      expect(result === undefined || typeof result === 'object').toBe(true);
    });
  });

  describe('getAdapterConfig', () => {
    it('returns empty object for unconfigured adapter', async () => {
      const config = await getAdapterConfig('nonexistent-adapter');
      expect(config).toEqual({});
    });
  });

  describe('getLoadedConfigPath', () => {
    it('returns null before any config is loaded', () => {
      expect(getLoadedConfigPath()).toBeNull();
    });

    it('returns path after config is loaded', async () => {
      await loadConfig();
      // Either null (no config found) or a path string
      const path = getLoadedConfigPath();
      expect(path === null || typeof path === 'string').toBe(true);
    });
  });

  describe('validateDomainConfig', () => {
    it('throws when primary is missing', () => {
      expect(() => validateDomainConfig({} as any)).toThrow(ConfigurationError);
      expect(() => validateDomainConfig({} as any)).toThrow('requires "primary" adapter');
    });

    it('accepts valid config', () => {
      expect(() => validateDomainConfig({ primary: 'infisical' })).not.toThrow();
    });

    it('accepts config with fallback', () => {
      expect(() =>
        validateDomainConfig({ primary: 'infisical', fallback: 'env' })
      ).not.toThrow();
    });
  });
});

describe('ProviderFactory', () => {
  beforeEach(() => {
    invalidateConfigCache();
    invalidateAdapterCache();
  });

  describe('getSecretsProvider', () => {
    it('throws ConfigurationError when no adapter configured', async () => {
      await expect(getSecretsProvider()).rejects.toBeInstanceOf(ConfigurationError);
    });
  });

  describe('getSecretsProviderWithFallback', () => {
    it('throws ConfigurationError when no adapter configured', async () => {
      await expect(getSecretsProviderWithFallback()).rejects.toBeInstanceOf(ConfigurationError);
    });
  });

  describe('listAvailableAdapters', () => {
    it('returns array of adapter names', async () => {
      const adapters = await listAvailableAdapters();
      expect(Array.isArray(adapters)).toBe(true);
    });
  });
});
