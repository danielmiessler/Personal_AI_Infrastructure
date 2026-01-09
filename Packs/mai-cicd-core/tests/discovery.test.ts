import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
} from '../src/discovery/AdapterLoader.ts';
import {
  loadConfig,
  getCICDConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
} from '../src/discovery/ConfigLoader.ts';
import { ConfigurationError } from '../src/utils/errors.ts';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

describe('AdapterLoader', () => {
  beforeEach(() => {
    invalidateAdapterCache();
  });

  describe('discoverAdapters', () => {
    test('should return empty array when no adapters found', async () => {
      const adapters = await discoverAdapters('nonexistent-domain');
      expect(adapters).toEqual([]);
    });

    test('should cache results', async () => {
      await discoverAdapters('cicd');
      const status1 = getAdapterCacheStatus();

      await discoverAdapters('cicd');
      const status2 = getAdapterCacheStatus();

      expect(status1.size).toBe(1);
      expect(status2.size).toBe(1);
      expect(status1.domains).toContain('cicd');
    });
  });

  describe('invalidateAdapterCache', () => {
    test('should clear specific domain cache', async () => {
      await discoverAdapters('cicd');
      await discoverAdapters('issues');

      const before = getAdapterCacheStatus();
      expect(before.size).toBe(2);

      invalidateAdapterCache('cicd');

      const after = getAdapterCacheStatus();
      expect(after.size).toBe(1);
      expect(after.domains).not.toContain('cicd');
      expect(after.domains).toContain('issues');
    });

    test('should clear all cache when no domain specified', async () => {
      await discoverAdapters('cicd');
      await discoverAdapters('issues');

      invalidateAdapterCache();

      const status = getAdapterCacheStatus();
      expect(status.size).toBe(0);
    });
  });

  describe('getAdapterCacheStatus', () => {
    test('should return empty status initially', () => {
      const status = getAdapterCacheStatus();
      expect(status.size).toBe(0);
      expect(status.domains).toEqual([]);
    });
  });
});

describe('ConfigLoader', () => {
  const testConfigDir = path.join(os.tmpdir(), `mai-cicd-test-${Date.now()}`);
  const testConfigPath = path.join(testConfigDir, 'providers.yaml');

  beforeEach(() => {
    invalidateConfigCache();
    // Clean up test directory
    try {
      fs.rmSync(testConfigDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
    fs.mkdirSync(testConfigDir, { recursive: true });
  });

  afterEach(() => {
    invalidateConfigCache();
    delete process.env.PROVIDERS_CONFIG;
    try {
      fs.rmSync(testConfigDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  describe('loadConfig', () => {
    test('should load config from environment variable path', async () => {
      const config = `
domains:
  cicd:
    primary: github
    adapters:
      github:
        apiUrl: https://api.github.com
`;
      fs.writeFileSync(testConfigPath, config);
      process.env.PROVIDERS_CONFIG = testConfigPath;

      const loaded = await loadConfig();

      expect(loaded.domains?.cicd?.primary).toBe('github');
    });

    test('should return empty config when no file found', async () => {
      process.env.PROVIDERS_CONFIG = '/nonexistent/path.yaml';

      const loaded = await loadConfig();

      expect(loaded).toEqual({});
    });

    test('should cache config', async () => {
      const config = `domains:\n  cicd:\n    primary: github`;
      fs.writeFileSync(testConfigPath, config);
      process.env.PROVIDERS_CONFIG = testConfigPath;

      await loadConfig();
      const path1 = getLoadedConfigPath();

      await loadConfig();
      const path2 = getLoadedConfigPath();

      expect(path1).toBe(path2);
    });
  });

  describe('getCICDConfig', () => {
    test('should return undefined when not configured', async () => {
      const config = await getCICDConfig();
      expect(config).toBeUndefined();
    });

    test('should return CICD domain config', async () => {
      const config = `
domains:
  cicd:
    primary: gitlab
    fallback: github
`;
      fs.writeFileSync(testConfigPath, config);
      process.env.PROVIDERS_CONFIG = testConfigPath;

      const cicdConfig = await getCICDConfig();

      expect(cicdConfig?.primary).toBe('gitlab');
      expect(cicdConfig?.fallback).toBe('github');
    });
  });

  describe('getAdapterConfig', () => {
    test('should return empty object when adapter not configured', async () => {
      const config = await getAdapterConfig('nonexistent');
      expect(config).toEqual({});
    });

    test('should return adapter config', async () => {
      const config = `
domains:
  cicd:
    primary: gitlab
    adapters:
      gitlab:
        host: gitlab.example.com
        timeout: 30000
`;
      fs.writeFileSync(testConfigPath, config);
      process.env.PROVIDERS_CONFIG = testConfigPath;

      const adapterConfig = await getAdapterConfig('gitlab');

      expect(adapterConfig.host).toBe('gitlab.example.com');
      expect(adapterConfig.timeout).toBe(30000);
    });
  });

  describe('invalidateConfigCache', () => {
    test('should clear config cache', async () => {
      const config = `domains:\n  cicd:\n    primary: github`;
      fs.writeFileSync(testConfigPath, config);
      process.env.PROVIDERS_CONFIG = testConfigPath;

      await loadConfig();
      expect(getLoadedConfigPath()).toBe(testConfigPath);

      invalidateConfigCache();
      expect(getLoadedConfigPath()).toBeNull();
    });
  });

  describe('validateDomainConfig', () => {
    test('should pass for valid config', () => {
      expect(() => validateDomainConfig({ primary: 'github' })).not.toThrow();
    });

    test('should throw for missing primary', () => {
      expect(() => validateDomainConfig({} as any)).toThrow(ConfigurationError);
      expect(() => validateDomainConfig({} as any)).toThrow('requires "primary"');
    });
  });
});
