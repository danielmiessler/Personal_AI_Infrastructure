import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadConfig,
  getObservabilityConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  ConfigurationError,
} from '../src/index.ts';

describe('AdapterLoader', () => {
  beforeEach(() => {
    invalidateAdapterCache();
  });

  test('discoverAdapters should return array', async () => {
    const adapters = await discoverAdapters('observability');
    expect(Array.isArray(adapters)).toBe(true);
  });

  test('discoverAdapters should cache results', async () => {
    await discoverAdapters('observability');
    const status1 = getAdapterCacheStatus();

    await discoverAdapters('observability');
    const status2 = getAdapterCacheStatus();

    expect(status1.domains).toContain('observability');
    expect(status2.size).toBe(status1.size);
  });

  test('invalidateAdapterCache should clear specific domain', async () => {
    await discoverAdapters('observability');
    await discoverAdapters('other');

    invalidateAdapterCache('observability');
    const status = getAdapterCacheStatus();

    expect(status.domains).not.toContain('observability');
    expect(status.domains).toContain('other');
  });

  test('invalidateAdapterCache should clear all when no domain', async () => {
    await discoverAdapters('observability');
    await discoverAdapters('other');

    invalidateAdapterCache();
    const status = getAdapterCacheStatus();

    expect(status.size).toBe(0);
  });

  test('getAdapterCacheStatus should return size and domains', () => {
    const status = getAdapterCacheStatus();

    expect(typeof status.size).toBe('number');
    expect(Array.isArray(status.domains)).toBe(true);
  });
});

describe('ConfigLoader', () => {
  beforeEach(() => {
    invalidateConfigCache();
  });

  afterEach(() => {
    invalidateConfigCache();
  });

  test('loadConfig should return object', async () => {
    const config = await loadConfig();
    expect(typeof config).toBe('object');
  });

  test('loadConfig should cache results', async () => {
    await loadConfig();
    const path1 = getLoadedConfigPath();

    await loadConfig();
    const path2 = getLoadedConfigPath();

    expect(path1).toBe(path2);
  });

  test('invalidateConfigCache should clear cache', async () => {
    await loadConfig();
    invalidateConfigCache();

    expect(getLoadedConfigPath()).toBeNull();
  });

  test('getObservabilityConfig should return domain config', async () => {
    const config = await getObservabilityConfig();
    // May be undefined if no config file exists
    expect(config === undefined || typeof config === 'object').toBe(true);
  });

  test('getAdapterConfig should return adapter config', async () => {
    const config = await getAdapterConfig('prometheus');
    expect(typeof config).toBe('object');
  });

  test('getAdapterConfig should return empty object for missing adapter', async () => {
    const config = await getAdapterConfig('nonexistent');
    expect(config).toEqual({});
  });
});

describe('validateDomainConfig', () => {
  test('should pass for valid config', () => {
    expect(() => {
      validateDomainConfig({ primary: 'prometheus' });
    }).not.toThrow();
  });

  test('should throw for missing primary', () => {
    expect(() => {
      validateDomainConfig({} as { primary: string });
    }).toThrow(ConfigurationError);
  });

  test('should throw with descriptive message', () => {
    expect(() => {
      validateDomainConfig({ primary: '' });
    }).toThrow('Domain config requires "primary" adapter');
  });
});
