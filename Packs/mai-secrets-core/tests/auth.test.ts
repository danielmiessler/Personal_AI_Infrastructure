import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { resolveAuth } from '../src/auth/resolveAuth.ts';
import type { AuthReference } from '../src/auth/AuthReference.ts';
import { AuthenticationError, ConfigurationError } from '../src/utils/errors.ts';
import * as os from 'os';
import * as path from 'path';

describe('resolveAuth', () => {
  describe('env type', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('resolves value from environment variable', async () => {
      process.env.TEST_SECRET = 'my-secret-value';
      const ref: AuthReference = { type: 'env', var: 'TEST_SECRET' };

      const result = await resolveAuth(ref);

      expect(result).toBe('my-secret-value');
    });

    it('throws AuthenticationError when env var is not set', async () => {
      delete process.env.NONEXISTENT_VAR;
      const ref: AuthReference = { type: 'env', var: 'NONEXISTENT_VAR' };

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(AuthenticationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Environment variable not set');
    });

    it('throws ConfigurationError when var field is missing', async () => {
      const ref = { type: 'env' } as AuthReference;

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(ConfigurationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Env auth requires "var" field');
    });
  });

  describe('file type', () => {
    const testDir = path.join(os.tmpdir(), 'mai-secrets-test');
    const testFile = path.join(testDir, 'test-credential');

    beforeEach(async () => {
      await Bun.write(testFile, 'file-based-secret\n');
    });

    afterEach(async () => {
      try {
        await Bun.file(testFile).exists() && await Bun.write(testFile, '');
      } catch {
        // Ignore cleanup errors
      }
    });

    it('resolves value from file', async () => {
      const ref: AuthReference = { type: 'file', path: testFile };

      const result = await resolveAuth(ref);

      expect(result).toBe('file-based-secret');
    });

    it('trims whitespace from file content', async () => {
      await Bun.write(testFile, '  trimmed-secret  \n\n');
      const ref: AuthReference = { type: 'file', path: testFile };

      const result = await resolveAuth(ref);

      expect(result).toBe('trimmed-secret');
    });

    it('throws AuthenticationError when file does not exist', async () => {
      const ref: AuthReference = { type: 'file', path: '/nonexistent/path/to/file' };

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(AuthenticationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Credential file not found');
    });

    it('throws AuthenticationError when file is empty', async () => {
      await Bun.write(testFile, '   \n\n  ');
      const ref: AuthReference = { type: 'file', path: testFile };

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(AuthenticationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Credential file is empty');
    });

    it('throws ConfigurationError when path field is missing', async () => {
      const ref = { type: 'file' } as AuthReference;

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(ConfigurationError);
      await expect(resolveAuth(ref)).rejects.toThrow('File auth requires "path" field');
    });
  });

  describe('keychain type', () => {
    it('throws ConfigurationError when service field is missing', async () => {
      const ref = { type: 'keychain' } as AuthReference;

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(ConfigurationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Keychain auth requires "service" field');
    });

    // Note: Keychain tests that actually call `security` are integration tests
    // and would require a real keychain entry
  });

  describe('secretsManager type', () => {
    it('throws AuthenticationError (not implemented)', async () => {
      const ref: AuthReference = { type: 'secretsManager', key: 'my-secret' };

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(AuthenticationError);
      await expect(resolveAuth(ref)).rejects.toThrow('not implemented');
    });

    it('throws ConfigurationError when key field is missing', async () => {
      const ref = { type: 'secretsManager' } as AuthReference;

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(ConfigurationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Secrets manager auth requires "key" field');
    });
  });

  describe('unknown type', () => {
    it('throws ConfigurationError for unknown auth type', async () => {
      // Force an invalid type to test the default case
      const ref = { type: 'unknown' } as unknown as AuthReference;

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(ConfigurationError);
      await expect(resolveAuth(ref)).rejects.toThrow('Unknown auth type');
    });
  });

  describe('fallback chain', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('falls back to secondary auth when primary fails', async () => {
      process.env.FALLBACK_SECRET = 'fallback-value';
      delete process.env.PRIMARY_SECRET;

      const ref: AuthReference = {
        type: 'env',
        var: 'PRIMARY_SECRET',
        fallback: {
          type: 'env',
          var: 'FALLBACK_SECRET'
        }
      };

      const result = await resolveAuth(ref);

      expect(result).toBe('fallback-value');
    });

    it('uses primary when available even with fallback defined', async () => {
      process.env.PRIMARY_SECRET = 'primary-value';
      process.env.FALLBACK_SECRET = 'fallback-value';

      const ref: AuthReference = {
        type: 'env',
        var: 'PRIMARY_SECRET',
        fallback: {
          type: 'env',
          var: 'FALLBACK_SECRET'
        }
      };

      const result = await resolveAuth(ref);

      expect(result).toBe('primary-value');
    });

    it('chains multiple fallbacks', async () => {
      delete process.env.FIRST_SECRET;
      delete process.env.SECOND_SECRET;
      process.env.THIRD_SECRET = 'third-value';

      const ref: AuthReference = {
        type: 'env',
        var: 'FIRST_SECRET',
        fallback: {
          type: 'env',
          var: 'SECOND_SECRET',
          fallback: {
            type: 'env',
            var: 'THIRD_SECRET'
          }
        }
      };

      const result = await resolveAuth(ref);

      expect(result).toBe('third-value');
    });

    it('throws when all fallbacks fail', async () => {
      delete process.env.FIRST_SECRET;
      delete process.env.SECOND_SECRET;

      const ref: AuthReference = {
        type: 'env',
        var: 'FIRST_SECRET',
        fallback: {
          type: 'env',
          var: 'SECOND_SECRET'
        }
      };

      await expect(resolveAuth(ref)).rejects.toBeInstanceOf(AuthenticationError);
    });
  });
});
