import { describe, test, expect } from 'bun:test';
import { withRetry } from '../src/utils/retry.ts';

describe('withRetry', () => {
  test('should return result on success', async () => {
    const fn = async () => 'success';

    const result = await withRetry(fn);

    expect(result).toBe('success');
  });

  test('should retry on retryable error', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('503');
      }
      return 'success';
    };

    const result = await withRetry(fn, { baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should not retry on non-retryable error', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('Not Found');
    };

    await expect(withRetry(fn, { retryableErrors: ['503'] })).rejects.toThrow('Not Found');
    expect(attempts).toBe(1);
  });

  test('should throw after max retries', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('503');
    };

    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('503');
    expect(attempts).toBe(3); // Initial + 2 retries
  });

  test('should use custom retry options', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('CUSTOM_ERROR');
      }
      return 'success';
    };

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      retryableErrors: ['CUSTOM_ERROR']
    });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should retry on 429 rate limit', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('429 Too Many Requests');
      }
      return 'success';
    };

    const result = await withRetry(fn, { baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should retry on 401 unauthorized', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('401');
      }
      return 'success';
    };

    const result = await withRetry(fn, { baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should retry on ECONNRESET', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 2) {
        const error = new Error('Connection reset') as NodeJS.ErrnoException;
        error.code = 'ECONNRESET';
        throw error;
      }
      return 'success';
    };

    const result = await withRetry(fn, { baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should respect maxDelayMs', async () => {
    let attempts = 0;
    const startTime = Date.now();

    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('503');
      }
      return 'success';
    };

    await withRetry(fn, { baseDelayMs: 10, maxDelayMs: 20, maxRetries: 3 });

    const elapsed = Date.now() - startTime;
    // With maxDelayMs of 20, delays should be capped
    expect(elapsed).toBeLessThan(200); // Should complete quickly
  });
});
