import { describe, it, expect, mock } from 'bun:test';
import { withRetry } from '../src/utils/retry.ts';

describe('withRetry', () => {
  describe('successful execution', () => {
    it('returns result on first successful attempt', async () => {
      const fn = mock(() => Promise.resolve('success'));
      const result = await withRetry(fn, { maxRetries: 3 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('works with async functions', async () => {
      const fn = mock(async () => {
        await new Promise(r => setTimeout(r, 10));
        return 42;
      });
      const result = await withRetry(fn);
      expect(result).toBe(42);
    });
  });

  describe('retry behavior', () => {
    it('retries on retryable error and eventually succeeds', async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('ECONNRESET');
          throw error;
        }
        return 'success';
      });

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 50
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after exhausting retries', async () => {
      const fn = mock(() => {
        const error = new Error('503 Service Unavailable');
        return Promise.reject(error);
      });

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 50 })
      ).rejects.toThrow('503 Service Unavailable');

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry non-retryable errors', async () => {
      const fn = mock(() => {
        return Promise.reject(new Error('Invalid input'));
      });

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow('Invalid input');
      expect(fn).toHaveBeenCalledTimes(1); // no retries
    });

    it('retries on 429 rate limit', async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('429 Too Many Requests');
        }
        return 'success';
      });

      const result = await withRetry(fn, { baseDelayMs: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 server error', async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('500 Internal Server Error');
        }
        return 'success';
      });

      const result = await withRetry(fn, { baseDelayMs: 10 });
      expect(result).toBe('success');
    });

    it('retries on 401 for token refresh', async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('401 Unauthorized');
        }
        return 'success';
      });

      const result = await withRetry(fn, { baseDelayMs: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries on ETIMEDOUT', async () => {
      let attempts = 0;
      const fn = mock(async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Connection timed out') as NodeJS.ErrnoException;
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      });

      const result = await withRetry(fn, { baseDelayMs: 10 });
      expect(result).toBe('success');
    });
  });

  describe('custom options', () => {
    it('respects maxRetries option', async () => {
      const fn = mock(() => Promise.reject(new Error('ECONNRESET')));

      await expect(
        withRetry(fn, { maxRetries: 1, baseDelayMs: 10 })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(2); // initial + 1 retry
    });

    it('respects custom retryableErrors', async () => {
      const fn = mock(() => Promise.reject(new Error('CUSTOM_ERROR')));

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          baseDelayMs: 10,
          retryableErrors: ['CUSTOM_ERROR']
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(3); // retried because CUSTOM_ERROR is in list
    });

    it('does not retry errors not in custom list', async () => {
      const fn = mock(() => Promise.reject(new Error('UNKNOWN_ERROR')));

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          retryableErrors: ['SPECIFIC_ERROR']
        })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1); // not retried
    });
  });

  describe('zero retries', () => {
    it('does not retry when maxRetries is 0', async () => {
      const fn = mock(() => Promise.reject(new Error('ECONNRESET')));

      await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
