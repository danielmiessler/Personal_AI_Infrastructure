import { describe, test, expect } from 'bun:test';
import { withRetry } from '../src/index.ts';

describe('withRetry', () => {
  test('should return result on success', async () => {
    const result = await withRetry(async () => 'success');
    expect(result).toBe('success');
  });

  test('should retry on retryable error', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('503');
      }
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should throw after max retries', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('503');
        },
        { maxRetries: 2 }
      )
    ).rejects.toThrow('503');

    expect(attempts).toBe(3); // Initial + 2 retries
  });

  test('should not retry non-retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(async () => {
        attempts++;
        throw new Error('Invalid query syntax');
      })
    ).rejects.toThrow('Invalid query syntax');

    expect(attempts).toBe(1);
  });

  test('should respect custom retryable errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('CUSTOM_ERROR');
        },
        { maxRetries: 2, retryableErrors: ['CUSTOM_ERROR'] }
      )
    ).rejects.toThrow('CUSTOM_ERROR');

    expect(attempts).toBe(3);
  });

  test('should apply exponential backoff', async () => {
    const startTime = Date.now();
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('503');
        },
        { maxRetries: 2, baseDelayMs: 50, maxDelayMs: 200 }
      )
    ).rejects.toThrow();

    const elapsed = Date.now() - startTime;
    // Should have delays: ~50ms + ~100ms = ~150ms minimum
    expect(elapsed).toBeGreaterThan(100);
  });

  test('should handle ECONNRESET', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) {
        const error = new Error('Connection reset');
        (error as NodeJS.ErrnoException).code = 'ECONNRESET';
        throw error;
      }
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should handle 429 rate limit', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('429 Too Many Requests');
      }
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});
