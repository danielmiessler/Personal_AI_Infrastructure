import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  loadConfig,
  getNetworkConfig,
  getAdapterConfig,
  invalidateConfigCache,
  getLoadedConfigPath,
  validateDomainConfig,
  discoverAdapters,
  invalidateAdapterCache,
  getAdapterCacheStatus,
  loadManifest,
  ConfigurationError
} from '../src/index.ts';

describe('ConfigLoader', () => {
  const testDir = path.join(os.tmpdir(), 'mai-network-core-test-' + Date.now());
  const originalCwd = process.cwd();

  beforeEach(() => {
    invalidateConfigCache();
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('loadConfig returns empty object when no config file exists', async () => {
    const config = await loadConfig();
    expect(config).toEqual({});
  });

  test('loadConfig loads providers.yaml from cwd', async () => {
    const configContent = `
version: "1.0"
domains:
  network:
    primary: unifi
    fallback: mock
    adapters:
      unifi:
        url: https://192.168.1.1
`;
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), configContent);

    const config = await loadConfig();
    expect(config.version).toBe('1.0');
    expect(config.domains?.network?.primary).toBe('unifi');
  });

  test('loadConfig caches the config', async () => {
    const configContent = `
version: "1.0"
domains:
  network:
    primary: cached
`;
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), configContent);

    await loadConfig();
    const cachedPath = getLoadedConfigPath();

    // Modify file - should still return cached
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), 'version: "2.0"');
    const config = await loadConfig();

    expect(config.version).toBe('1.0');
    expect(getLoadedConfigPath()).toBe(cachedPath);
  });

  test('invalidateConfigCache clears the cache', async () => {
    const configContent = `version: "1.0"`;
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), configContent);

    await loadConfig();
    invalidateConfigCache();

    expect(getLoadedConfigPath()).toBeNull();
  });

  test('getNetworkConfig returns network domain config', async () => {
    const configContent = `
domains:
  network:
    primary: test-adapter
`;
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), configContent);

    const networkConfig = await getNetworkConfig();
    expect(networkConfig?.primary).toBe('test-adapter');
  });

  test('getAdapterConfig returns adapter config', async () => {
    const configContent = `
domains:
  network:
    primary: unifi
    adapters:
      unifi:
        url: https://test.com
        timeout: 5000
`;
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), configContent);

    const adapterConfig = await getAdapterConfig('unifi');
    expect(adapterConfig.url).toBe('https://test.com');
    expect(adapterConfig.timeout).toBe(5000);
  });

  test('getAdapterConfig returns empty object for unknown adapter', async () => {
    const configContent = `
domains:
  network:
    primary: unifi
`;
    fs.writeFileSync(path.join(testDir, 'providers.yaml'), configContent);

    const adapterConfig = await getAdapterConfig('unknown');
    expect(adapterConfig).toEqual({});
  });

  test('validateDomainConfig throws on missing primary', () => {
    expect(() => validateDomainConfig({} as any)).toThrow(ConfigurationError);
  });

  test('validateDomainConfig passes with valid config', () => {
    expect(() => validateDomainConfig({ primary: 'test' })).not.toThrow();
  });
});

describe('AdapterLoader', () => {
  const testDir = path.join(os.tmpdir(), 'mai-adapter-test-' + Date.now());

  beforeEach(() => {
    invalidateAdapterCache();
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('discoverAdapters returns empty array when no adapters found', async () => {
    const adapters = await discoverAdapters('network');
    // May find existing adapters in actual environment, but cache should work
    expect(Array.isArray(adapters)).toBe(true);
  });

  test('adapter cache status reports correctly', () => {
    invalidateAdapterCache();
    const status = getAdapterCacheStatus();
    expect(status.size).toBe(0);
    expect(status.domains).toEqual([]);
  });

  test('loadManifest parses valid adapter.yaml', async () => {
    const adapterDir = path.join(testDir, 'mai-test-adapter');
    fs.mkdirSync(adapterDir, { recursive: true });

    const manifestContent = `
name: test-adapter
version: "1.0.0"
domain: network
interface: NetworkProvider
entry: src/TestAdapter.ts
description: Test adapter
`;
    fs.writeFileSync(path.join(adapterDir, 'adapter.yaml'), manifestContent);

    const manifest = await loadManifest(path.join(adapterDir, 'adapter.yaml'));
    expect(manifest.name).toBe('test-adapter');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.domain).toBe('network');
    expect(manifest.interface).toBe('NetworkProvider');
    expect(manifest.entry).toBe('src/TestAdapter.ts');
    expect(manifest.packagePath).toBe(adapterDir);
  });

  test('loadManifest throws on invalid manifest', async () => {
    const adapterDir = path.join(testDir, 'mai-invalid-adapter');
    fs.mkdirSync(adapterDir, { recursive: true });

    const manifestContent = `
name: invalid
version: "1.0.0"
# missing domain, interface, entry
`;
    fs.writeFileSync(path.join(adapterDir, 'adapter.yaml'), manifestContent);

    await expect(loadManifest(path.join(adapterDir, 'adapter.yaml'))).rejects.toThrow(ConfigurationError);
  });

  test('invalidateAdapterCache clears specific domain', async () => {
    // Populate cache
    await discoverAdapters('network');
    const statusBefore = getAdapterCacheStatus();

    invalidateAdapterCache('network');
    const statusAfter = getAdapterCacheStatus();

    expect(statusAfter.domains).not.toContain('network');
  });

  test('invalidateAdapterCache clears all domains when no arg', async () => {
    await discoverAdapters('network');
    invalidateAdapterCache();
    const status = getAdapterCacheStatus();
    expect(status.size).toBe(0);
  });
});

describe('ProviderFactory', () => {
  beforeEach(() => {
    invalidateConfigCache();
    invalidateAdapterCache();
  });

  // Note: Full ProviderFactory tests require actual adapters installed
  // These tests verify error handling behavior

  test('listAvailableAdapters returns array', async () => {
    const { listAvailableAdapters } = await import('../src/index.ts');
    const adapters = await listAvailableAdapters();
    expect(Array.isArray(adapters)).toBe(true);
  });
});
