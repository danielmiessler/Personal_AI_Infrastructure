import { describe, it, expect } from 'bun:test';
import { SecretValue } from '../src/types/SecretValue.ts';

describe('SecretValue', () => {
  const testSecret = 'super-secret-api-key-12345';

  describe('constructor and reveal()', () => {
    it('stores and reveals the secret value', () => {
      const secret = new SecretValue(testSecret);
      expect(secret.reveal()).toBe(testSecret);
    });

    it('handles empty string', () => {
      const secret = new SecretValue('');
      expect(secret.reveal()).toBe('');
    });

    it('handles special characters', () => {
      const specialSecret = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./`~\n\t';
      const secret = new SecretValue(specialSecret);
      expect(secret.reveal()).toBe(specialSecret);
    });

    it('handles unicode characters', () => {
      const unicodeSecret = '密码🔐パスワード';
      const secret = new SecretValue(unicodeSecret);
      expect(secret.reveal()).toBe(unicodeSecret);
    });
  });

  describe('toString()', () => {
    it('returns [REDACTED] instead of the actual value', () => {
      const secret = new SecretValue(testSecret);
      expect(secret.toString()).toBe('[REDACTED]');
    });

    it('redacts when used in string concatenation', () => {
      const secret = new SecretValue(testSecret);
      const result = `The secret is: ${secret}`;
      expect(result).toBe('The secret is: [REDACTED]');
      expect(result).not.toContain(testSecret);
    });

    it('redacts when coerced to string', () => {
      const secret = new SecretValue(testSecret);
      const result = String(secret);
      expect(result).toBe('[REDACTED]');
    });
  });

  describe('toJSON()', () => {
    it('returns [REDACTED] when serialized to JSON', () => {
      const secret = new SecretValue(testSecret);
      expect(secret.toJSON()).toBe('[REDACTED]');
    });

    it('redacts when JSON.stringify is called directly', () => {
      const secret = new SecretValue(testSecret);
      const json = JSON.stringify(secret);
      expect(json).toBe('"[REDACTED]"');
      expect(json).not.toContain(testSecret);
    });

    it('redacts when part of an object', () => {
      const secret = new SecretValue(testSecret);
      const obj = { apiKey: secret, name: 'test' };
      const json = JSON.stringify(obj);
      expect(json).toBe('{"apiKey":"[REDACTED]","name":"test"}');
      expect(json).not.toContain(testSecret);
    });

    it('redacts when part of an array', () => {
      const secret = new SecretValue(testSecret);
      const arr = [secret, 'other'];
      const json = JSON.stringify(arr);
      expect(json).toBe('["[REDACTED]","other"]');
      expect(json).not.toContain(testSecret);
    });
  });

  describe('inspect symbol', () => {
    it('returns [REDACTED] for custom inspect', () => {
      const secret = new SecretValue(testSecret);
      const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');
      const inspectFn = (secret as unknown as Record<symbol, () => string>)[inspectSymbol];
      expect(typeof inspectFn).toBe('function');
      expect(inspectFn.call(secret)).toBe('[REDACTED]');
    });
  });

  describe('length property', () => {
    it('returns the length of the secret without revealing it', () => {
      const secret = new SecretValue(testSecret);
      expect(secret.length).toBe(testSecret.length);
    });

    it('returns 0 for empty secret', () => {
      const secret = new SecretValue('');
      expect(secret.length).toBe(0);
    });

    it('correctly counts unicode characters', () => {
      const unicodeSecret = '🔐';
      const secret = new SecretValue(unicodeSecret);
      expect(secret.length).toBe(2); // emoji is 2 UTF-16 code units
    });
  });

  describe('isEmpty property', () => {
    it('returns true for empty secret', () => {
      const secret = new SecretValue('');
      expect(secret.isEmpty).toBe(true);
    });

    it('returns false for non-empty secret', () => {
      const secret = new SecretValue(testSecret);
      expect(secret.isEmpty).toBe(false);
    });

    it('returns false for single character', () => {
      const secret = new SecretValue('x');
      expect(secret.isEmpty).toBe(false);
    });
  });

  describe('security guarantees', () => {
    it('reveal() is required to get the actual value', () => {
      const secret = new SecretValue(testSecret);
      // These common operations all redact:
      expect(String(secret)).toBe('[REDACTED]');
      expect(`${secret}`).toBe('[REDACTED]');
      expect(JSON.stringify({ key: secret })).not.toContain(testSecret);

      // Only reveal() returns the actual value
      expect(secret.reveal()).toBe(testSecret);
    });

    it('accidental exposure is prevented', () => {
      const secret = new SecretValue('super-secret-password');

      // Simulating common accidental exposure scenarios
      const logOutput = `User logged in with token ${secret}`;
      expect(logOutput).not.toContain('super-secret-password');
      expect(logOutput).toContain('[REDACTED]');

      const errorMessage = `Auth failed for token: ${secret}`;
      expect(errorMessage).not.toContain('super-secret-password');
    });

    it('TypeScript private prevents compile-time access', () => {
      const secret = new SecretValue(testSecret);
      // Note: TypeScript's private is compile-time only
      // Runtime access is technically possible but flagged by TypeScript
      // @ts-expect-error - TypeScript blocks this at compile time
      const _value = secret.value;
      // The security comes from toString/toJSON redaction, not hiding
    });
  });
});
