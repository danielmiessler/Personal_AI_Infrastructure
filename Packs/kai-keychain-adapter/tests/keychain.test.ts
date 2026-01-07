import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { $ } from 'bun';
import KeychainAdapter from '../src/KeychainAdapter.ts';
import { SecretNotFoundError } from 'kai-secrets-core';

describe('KeychainAdapter', () => {
  const adapter = new KeychainAdapter({
    servicePrefix: 'kai-test',
    defaultAccount: 'test-account'
  });

  // Test secret that we'll create and clean up
  const testKey = 'TEST_SECRET_' + Date.now();
  const testValue = 'test-value-12345';
  const testService = `kai-test:${testKey}`;

  beforeAll(async () => {
    // Create a test secret in the keychain
    try {
      await $`security add-generic-password -s ${testService} -a test-account -w ${testValue}`.quiet();
    } catch {
      // Secret might already exist, try to update
      await $`security add-generic-password -U -s ${testService} -a test-account -w ${testValue}`.quiet();
    }
  });

  afterAll(async () => {
    // Clean up test secret
    try {
      await $`security delete-generic-password -s ${testService} -a test-account`.quiet();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('uses default values when no config provided', () => {
      const defaultAdapter = new KeychainAdapter();
      expect(defaultAdapter.name).toBe('keychain');
      expect(defaultAdapter.version).toBe('1.0.0');
    });

    it('accepts custom config', () => {
      const customAdapter = new KeychainAdapter({
        servicePrefix: 'custom',
        defaultAccount: 'custom-account'
      });
      expect(customAdapter.name).toBe('keychain');
    });
  });

  describe('get', () => {
    it('retrieves existing secret', async () => {
      const secret = await adapter.get(testKey);

      expect(secret.key).toBe(testKey);
      expect(secret.value.reveal()).toBe(testValue);
      expect(secret.metadata?.createdAt).toBeInstanceOf(Date);
    });

    it('wraps value in SecretValue', async () => {
      const secret = await adapter.get(testKey);

      // Verify SecretValue redaction
      expect(secret.value.toString()).toBe('[REDACTED]');
      expect(JSON.stringify({ v: secret.value })).toBe('{"v":"[REDACTED]"}');
      expect(secret.value.reveal()).toBe(testValue);
    });

    it('throws SecretNotFoundError for missing secret', async () => {
      await expect(adapter.get('NONEXISTENT_KEY_' + Date.now()))
        .rejects.toBeInstanceOf(SecretNotFoundError);
    });
  });

  describe('getBatch', () => {
    it('retrieves multiple secrets', async () => {
      const results = await adapter.getBatch([testKey, 'NONEXISTENT']);

      expect(results.size).toBe(1);
      expect(results.has(testKey)).toBe(true);
      expect(results.get(testKey)?.value.reveal()).toBe(testValue);
    });

    it('returns empty map for all missing keys', async () => {
      const results = await adapter.getBatch(['MISSING_1', 'MISSING_2']);
      expect(results.size).toBe(0);
    });
  });

  describe('list', () => {
    it('lists available keys', async () => {
      const keys = await adapter.list();

      // Should include our test key
      expect(Array.isArray(keys)).toBe(true);
    });

    it('filters by pattern', async () => {
      const keys = await adapter.list('TEST_*');

      // Should only include keys matching the pattern
      for (const key of keys) {
        expect(key.startsWith('TEST_')).toBe(true);
      }
    });

    it('respects limit option', async () => {
      const keys = await adapter.list(undefined, { limit: 1 });
      expect(keys.length).toBeLessThanOrEqual(1);
    });

    it('respects offset option', async () => {
      const allKeys = await adapter.list();
      if (allKeys.length > 1) {
        const offsetKeys = await adapter.list(undefined, { offset: 1 });
        expect(offsetKeys.length).toBe(allKeys.length - 1);
      }
    });
  });

  describe('healthCheck', () => {
    it('returns healthy status on macOS', async () => {
      const status = await adapter.healthCheck();

      expect(status.healthy).toBe(true);
      expect(status.message).toBe('Keychain accessible');
      expect(status.details?.servicePrefix).toBe('kai-test');
    });
  });

  describe('pattern matching', () => {
    it('matches * wildcard', async () => {
      // Private method test via list()
      const keys = await adapter.list('*SECRET*');
      // Should match keys containing SECRET
      for (const key of keys) {
        expect(key.includes('SECRET')).toBe(true);
      }
    });
  });
});

describe('KeychainAdapter - SecretValue redaction', () => {
  const adapter = new KeychainAdapter({ servicePrefix: 'kai-test' });

  it('never exposes secret value accidentally', async () => {
    // Create a temporary secret
    const key = 'REDACTION_TEST_' + Date.now();
    const secretValue = 'super-secret-password-123';
    const service = `kai-test:${key}`;

    try {
      await $`security add-generic-password -s ${service} -a claude-code -w ${secretValue}`.quiet();

      const secret = await adapter.get(key);

      // These should all be redacted
      const stringified = JSON.stringify(secret);
      expect(stringified).not.toContain(secretValue);
      expect(stringified).toContain('[REDACTED]');

      const toString = String(secret.value);
      expect(toString).toBe('[REDACTED]');

      // Only reveal() should return the actual value
      expect(secret.value.reveal()).toBe(secretValue);
    } finally {
      // Cleanup
      await $`security delete-generic-password -s ${service} -a claude-code`.quiet();
    }
  });
});
