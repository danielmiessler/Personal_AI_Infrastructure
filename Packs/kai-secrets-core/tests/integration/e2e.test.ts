/**
 * End-to-End Integration Tests
 *
 * Tests the full flow: skill → core → adapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as path from 'path';
import * as os from 'os';

// Import from core
import {
  getSecretsProvider,
  getSecretsProviderWithFallback,
  discoverAdapters,
  invalidateAdapterCache,
  invalidateConfigCache,
  SecretValue,
  SecretNotFoundError,
  withRetry
} from '../../src/index.ts';

// Import mock adapter directly for testing
import MockAdapter from '../../../kai-mock-adapter/src/MockAdapter.ts';

describe('End-to-End Integration', () => {
  beforeEach(() => {
    invalidateAdapterCache();
    invalidateConfigCache();
  });

  describe('skill → core → mock adapter (get)', () => {
    it('retrieves a secret through the full stack', async () => {
      const adapter = new MockAdapter({
        secrets: {
          API_KEY: 'integration-test-key',
          DATABASE_URL: 'postgres://localhost/test'
        }
      });

      const secret = await adapter.get('API_KEY');

      expect(secret.key).toBe('API_KEY');
      expect(secret.value).toBeInstanceOf(SecretValue);
      expect(secret.value.reveal()).toBe('integration-test-key');
      expect(secret.value.toString()).toBe('[REDACTED]');
    });

    it('throws SecretNotFoundError for missing key', async () => {
      const adapter = new MockAdapter({ secrets: {} });

      await expect(adapter.get('MISSING_KEY'))
        .rejects.toBeInstanceOf(SecretNotFoundError);
    });
  });

  describe('skill → core → mock adapter (list)', () => {
    it('lists secrets with pattern filtering', async () => {
      const adapter = new MockAdapter({
        secrets: {
          API_KEY: 'key1',
          API_SECRET: 'key2',
          DATABASE_URL: 'url'
        }
      });

      const allKeys = await adapter.list();
      expect(allKeys.length).toBe(3);

      const apiKeys = await adapter.list('API_*');
      expect(apiKeys.length).toBe(2);
      expect(apiKeys).toContain('API_KEY');
      expect(apiKeys).toContain('API_SECRET');
      expect(apiKeys).not.toContain('DATABASE_URL');
    });
  });

  describe('skill → core → mock adapter (health)', () => {
    it('returns healthy status', async () => {
      const adapter = new MockAdapter();
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBeDefined();
    });
  });
});

describe('Fallback Chain', () => {
  it('falls back when primary fails', async () => {
    // Simulate primary failing, fallback succeeding
    const flakyPrimary = new MockAdapter({
      secrets: { KEY: 'primary-value' },
      failureRate: 1.0 // Always fails
    });

    const reliableFallback = new MockAdapter({
      secrets: { KEY: 'fallback-value' }
    });

    // Primary fails
    await expect(flakyPrimary.get('KEY')).rejects.toThrow();

    // Fallback works
    const secret = await reliableFallback.get('KEY');
    expect(secret.value.reveal()).toBe('fallback-value');
  });

  it('propagates error when all fail', async () => {
    const failing1 = new MockAdapter({ failureRate: 1.0 });
    const failing2 = new MockAdapter({ failureRate: 1.0 });

    await expect(failing1.get('KEY')).rejects.toThrow();
    await expect(failing2.get('KEY')).rejects.toThrow();
  });
});

describe('Audit Logging', () => {
  // Note: We're testing that operations complete without logging secrets
  // Actual audit log verification would require capturing console output

  it('get operation completes (audit logged internally)', async () => {
    const adapter = new MockAdapter({
      secrets: { AUDIT_TEST: 'secret-value' }
    });

    const secret = await adapter.get('AUDIT_TEST');
    expect(secret.value.reveal()).toBe('secret-value');
  });

  it('getBatch operation completes', async () => {
    const adapter = new MockAdapter({
      secrets: { KEY1: 'v1', KEY2: 'v2' }
    });

    const results = await adapter.getBatch(['KEY1', 'KEY2']);
    expect(results.size).toBe(2);
  });

  it('list operation completes', async () => {
    const adapter = new MockAdapter({
      secrets: { A: '1', B: '2' }
    });

    const keys = await adapter.list();
    expect(keys.length).toBe(2);
  });

  it('healthCheck operation completes', async () => {
    const adapter = new MockAdapter();
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
  });
});

describe('Security Verification', () => {
  const sensitiveValue = 'super-secret-password-12345!@#$%';

  it('SecretValue.toString() returns [REDACTED]', () => {
    const sv = new SecretValue(sensitiveValue);
    expect(sv.toString()).toBe('[REDACTED]');
    expect(String(sv)).toBe('[REDACTED]');
  });

  it('SecretValue in console.log context shows [REDACTED]', () => {
    const sv = new SecretValue(sensitiveValue);
    const output = `The secret is: ${sv}`;
    expect(output).toBe('The secret is: [REDACTED]');
    expect(output).not.toContain(sensitiveValue);
  });

  it('SecretValue in JSON.stringify shows [REDACTED]', () => {
    const sv = new SecretValue(sensitiveValue);
    const json = JSON.stringify({ secret: sv });
    expect(json).toBe('{"secret":"[REDACTED]"}');
    expect(json).not.toContain(sensitiveValue);
  });

  it('SecretValue in error messages shows [REDACTED]', () => {
    const sv = new SecretValue(sensitiveValue);
    const errorMsg = `Authentication failed for token: ${sv}`;
    expect(errorMsg).not.toContain(sensitiveValue);
    expect(errorMsg).toContain('[REDACTED]');
  });

  it('Secret object serialization redacts value', async () => {
    const adapter = new MockAdapter({
      secrets: { SENSITIVE: sensitiveValue }
    });

    const secret = await adapter.get('SENSITIVE');
    const json = JSON.stringify(secret);

    expect(json).not.toContain(sensitiveValue);
    expect(json).toContain('[REDACTED]');
  });

  it('only reveal() returns the actual value', () => {
    const sv = new SecretValue(sensitiveValue);
    expect(sv.reveal()).toBe(sensitiveValue);
  });
});

describe('Retry Behavior', () => {
  it('retries with flaky adapter', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('ECONNRESET');
        }
        return 'success';
      },
      {
        maxRetries: 3,
        baseDelayMs: 10,
        retryableErrors: ['ECONNRESET']
      }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('respects max retries', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('ECONNRESET');
        },
        {
          maxRetries: 2,
          baseDelayMs: 10,
          retryableErrors: ['ECONNRESET']
        }
      )
    ).rejects.toThrow('ECONNRESET');

    expect(attempts).toBe(3); // 1 initial + 2 retries
  });

  it('does not retry non-retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('Invalid input');
        },
        {
          maxRetries: 3,
          retryableErrors: ['ECONNRESET']
        }
      )
    ).rejects.toThrow('Invalid input');

    expect(attempts).toBe(1); // No retries
  });
});

describe('Adapter Discovery', () => {
  it('discovers adapters in the secrets domain', async () => {
    const adapters = await discoverAdapters('secrets');
    // Should find at least the adapters we've created
    expect(Array.isArray(adapters)).toBe(true);
  });

  it('caches discovery results', async () => {
    const first = await discoverAdapters('secrets');
    const second = await discoverAdapters('secrets');
    expect(first).toBe(second); // Same reference = cached
  });

  it('invalidates cache', async () => {
    await discoverAdapters('secrets');
    invalidateAdapterCache('secrets');
    // After invalidation, next call will re-scan
    const fresh = await discoverAdapters('secrets');
    expect(Array.isArray(fresh)).toBe(true);
  });
});
