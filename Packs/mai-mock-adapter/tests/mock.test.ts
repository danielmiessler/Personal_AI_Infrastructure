import { describe, it, expect, beforeEach } from 'bun:test';
import MockAdapter from '../src/MockAdapter.ts';
import { SecretNotFoundError, ProviderError } from 'mai-secrets-core';
import {
  createTestProvider,
  createSlowProvider,
  createFlakyProvider,
  createStandardTestProvider,
  TEST_SECRETS
} from './fixtures.ts';

describe('MockAdapter', () => {
  describe('constructor', () => {
    it('creates empty adapter with no config', () => {
      const adapter = new MockAdapter();
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.size).toBe(0);
    });

    it('initializes with provided secrets', () => {
      const adapter = new MockAdapter({
        secrets: { KEY1: 'value1', KEY2: 'value2' }
      });
      expect(adapter.size).toBe(2);
    });
  });

  describe('get', () => {
    it('retrieves existing secret', async () => {
      const adapter = new MockAdapter({
        secrets: { API_KEY: 'secret-value' }
      });

      const secret = await adapter.get('API_KEY');

      expect(secret.key).toBe('API_KEY');
      expect(secret.value.reveal()).toBe('secret-value');
    });

    it('wraps value in SecretValue', async () => {
      const adapter = new MockAdapter({
        secrets: { API_KEY: 'secret-value' }
      });

      const secret = await adapter.get('API_KEY');

      expect(secret.value.toString()).toBe('[REDACTED]');
      expect(JSON.stringify({ v: secret.value })).toBe('{"v":"[REDACTED]"}');
    });

    it('throws SecretNotFoundError for missing key', async () => {
      const adapter = new MockAdapter();
      await expect(adapter.get('MISSING')).rejects.toBeInstanceOf(SecretNotFoundError);
    });

    it('includes metadata', async () => {
      const adapter = new MockAdapter({
        secrets: { API_KEY: 'value' }
      });

      const secret = await adapter.get('API_KEY');

      expect(secret.metadata?.createdAt).toBeInstanceOf(Date);
      expect(secret.metadata?.updatedAt).toBeInstanceOf(Date);
      expect(secret.metadata?.version).toBe('1');
    });
  });

  describe('setSecret/deleteSecret', () => {
    it('adds new secret', async () => {
      const adapter = new MockAdapter();
      adapter.setSecret('NEW_KEY', 'new-value');

      const secret = await adapter.get('NEW_KEY');
      expect(secret.value.reveal()).toBe('new-value');
    });

    it('updates existing secret', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY: 'old-value' }
      });

      // Wait a bit to ensure updatedAt differs
      await new Promise(r => setTimeout(r, 5));

      adapter.setSecret('KEY', 'new-value');
      const secret = await adapter.get('KEY');

      expect(secret.value.reveal()).toBe('new-value');
      // createdAt should be preserved, updatedAt should be newer
      expect(secret.metadata?.createdAt).toBeDefined();
      expect(secret.metadata?.updatedAt).toBeDefined();
      expect(secret.metadata!.updatedAt!.getTime()).toBeGreaterThanOrEqual(
        secret.metadata!.createdAt!.getTime()
      );
    });

    it('deletes secret', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY: 'value' }
      });

      const deleted = adapter.deleteSecret('KEY');
      expect(deleted).toBe(true);
      await expect(adapter.get('KEY')).rejects.toBeInstanceOf(SecretNotFoundError);
    });

    it('returns false when deleting non-existent key', () => {
      const adapter = new MockAdapter();
      expect(adapter.deleteSecret('MISSING')).toBe(false);
    });
  });

  describe('clearSecrets', () => {
    it('removes all secrets', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY1: 'v1', KEY2: 'v2', KEY3: 'v3' }
      });

      adapter.clearSecrets();

      expect(adapter.size).toBe(0);
      await expect(adapter.get('KEY1')).rejects.toBeInstanceOf(SecretNotFoundError);
    });
  });

  describe('getBatch', () => {
    it('retrieves multiple secrets', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY1: 'v1', KEY2: 'v2' }
      });

      const results = await adapter.getBatch(['KEY1', 'KEY2']);

      expect(results.size).toBe(2);
      expect(results.get('KEY1')?.value.reveal()).toBe('v1');
      expect(results.get('KEY2')?.value.reveal()).toBe('v2');
    });

    it('skips missing keys', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY1: 'v1' }
      });

      const results = await adapter.getBatch(['KEY1', 'MISSING']);

      expect(results.size).toBe(1);
      expect(results.has('MISSING')).toBe(false);
    });
  });

  describe('list', () => {
    it('lists all keys', async () => {
      const adapter = new MockAdapter({
        secrets: { API_KEY: 'v1', API_SECRET: 'v2', DATABASE_URL: 'v3' }
      });

      const keys = await adapter.list();

      expect(keys).toContain('API_KEY');
      expect(keys).toContain('DATABASE_URL');
      expect(keys.length).toBe(3);
    });

    it('filters by pattern', async () => {
      const adapter = new MockAdapter({
        secrets: { API_KEY: 'v1', API_SECRET: 'v2', DATABASE_URL: 'v3' }
      });

      const keys = await adapter.list('API_*');

      expect(keys).toContain('API_KEY');
      expect(keys).toContain('API_SECRET');
      expect(keys).not.toContain('DATABASE_URL');
    });

    it('respects limit', async () => {
      const adapter = new MockAdapter({
        secrets: { K1: 'v1', K2: 'v2', K3: 'v3' }
      });

      const keys = await adapter.list(undefined, { limit: 2 });
      expect(keys.length).toBe(2);
    });

    it('respects offset', async () => {
      const adapter = new MockAdapter({
        secrets: { K1: 'v1', K2: 'v2', K3: 'v3' }
      });

      const keys = await adapter.list(undefined, { offset: 1 });
      expect(keys.length).toBe(2);
    });
  });

  describe('healthCheck', () => {
    it('returns healthy status', async () => {
      const adapter = new MockAdapter();
      const status = await adapter.healthCheck();

      expect(status.healthy).toBe(true);
      expect(status.message).toBe('Mock adapter is healthy');
      expect(status.details?.secretCount).toBe(0);
    });
  });

  describe('simulated latency', () => {
    it('adds delay when configured', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY: 'value' },
        latencyMs: 50
      });

      const start = Date.now();
      await adapter.get('KEY');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });

  describe('simulated failures', () => {
    it('fails with configured rate', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY: 'value' },
        failureRate: 1.0 // Always fail
      });

      await expect(adapter.get('KEY')).rejects.toBeInstanceOf(ProviderError);
    });

    it('uses configured error message', async () => {
      const adapter = new MockAdapter({
        secrets: { KEY: 'value' },
        failureRate: 1.0,
        failureError: 'ECONNRESET'
      });

      await expect(adapter.get('KEY')).rejects.toThrow('ECONNRESET');
    });

    it('does not fail health check', async () => {
      const adapter = new MockAdapter({
        failureRate: 1.0
      });

      const status = await adapter.healthCheck();
      expect(status.healthy).toBe(true);
    });
  });
});

describe('Test Fixtures', () => {
  describe('createTestProvider', () => {
    it('creates provider with secrets', async () => {
      const provider = createTestProvider({
        API_KEY: 'test-key'
      });

      const secret = await provider.get('API_KEY');
      expect(secret.value.reveal()).toBe('test-key');
    });
  });

  describe('createSlowProvider', () => {
    it('creates provider with latency', async () => {
      const provider = createSlowProvider(50);

      const start = Date.now();
      await provider.healthCheck();
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(45);
    });
  });

  describe('createFlakyProvider', () => {
    it('creates provider that can fail', async () => {
      const provider = createFlakyProvider(1.0, { KEY: 'value' }, 'TEST_ERROR');
      await expect(provider.get('KEY')).rejects.toThrow('TEST_ERROR');
    });
  });

  describe('createStandardTestProvider', () => {
    it('creates provider with standard secrets', async () => {
      const provider = createStandardTestProvider();

      const secret = await provider.get('API_KEY');
      expect(secret.value.reveal()).toBe(TEST_SECRETS.API_KEY);
    });

    it('allows additional secrets', async () => {
      const provider = createStandardTestProvider({
        CUSTOM_KEY: 'custom-value'
      });

      const standard = await provider.get('API_KEY');
      const custom = await provider.get('CUSTOM_KEY');

      expect(standard.value.reveal()).toBe(TEST_SECRETS.API_KEY);
      expect(custom.value.reveal()).toBe('custom-value');
    });
  });
});

describe('MockAdapter - SecretValue redaction', () => {
  it('never exposes secret value accidentally', async () => {
    const adapter = new MockAdapter({
      secrets: { SECRET: 'super-secret-password-123' }
    });

    const secret = await adapter.get('SECRET');

    // These should all be redacted
    const stringified = JSON.stringify(secret);
    expect(stringified).not.toContain('super-secret-password-123');
    expect(stringified).toContain('[REDACTED]');

    const toString = String(secret.value);
    expect(toString).toBe('[REDACTED]');

    // Only reveal() should return the actual value
    expect(secret.value.reveal()).toBe('super-secret-password-123');
  });
});
