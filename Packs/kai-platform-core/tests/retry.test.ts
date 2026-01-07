import { describe, test, expect } from 'bun:test';
import { withRetry } from '../src/index.ts';

describe('withRetry', () => {
  test('should return result on success', async () => {
    const result = await withRetry(async () => 'success');
    expect(result).toBe('success');
  });

  test('should not retry on non-retryable error', async () => {
    let attempts = 0;

    await expect(
      withRetry(async () => {
        attempts++;
        throw new Error('Non-retryable error');
      })
    ).rejects.toThrow('Non-retryable error');

    expect(attempts).toBe(1);
  });

  test('should retry on retryable error', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('ECONNRESET');
        },
        { maxRetries: 2, baseDelayMs: 10 }
      )
    ).rejects.toThrow('ECONNRESET');

    expect(attempts).toBe(3); // Initial + 2 retries
  });

  test('should succeed after retry', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('503 Service Unavailable');
        }
        return 'success';
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should respect maxRetries', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('ETIMEDOUT');
        },
        { maxRetries: 1, baseDelayMs: 10 }
      )
    ).rejects.toThrow('ETIMEDOUT');

    expect(attempts).toBe(2); // Initial + 1 retry
  });

  test('should use custom retryableErrors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('CUSTOM_ERROR');
        },
        { maxRetries: 2, baseDelayMs: 10, retryableErrors: ['CUSTOM_ERROR'] }
      )
    ).rejects.toThrow('CUSTOM_ERROR');

    expect(attempts).toBe(3);
  });

  test('should not retry non-matching custom errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('OTHER_ERROR');
        },
        { maxRetries: 2, baseDelayMs: 10, retryableErrors: ['CUSTOM_ERROR'] }
      )
    ).rejects.toThrow('OTHER_ERROR');

    expect(attempts).toBe(1);
  });

  test('should handle 429 rate limit errors', async () => {
    let attempts = 0;

    await expect(
      withRetry(
        async () => {
          attempts++;
          throw new Error('429 Too Many Requests');
        },
        { maxRetries: 2, baseDelayMs: 10 }
      )
    ).rejects.toThrow('429');

    expect(attempts).toBe(3);
  });

  test('should handle 500 server errors', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('500 Internal Server Error');
        }
        return 'recovered';
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );

    expect(result).toBe('recovered');
    expect(attempts).toBe(2);
  });

  test('should handle async operations', async () => {
    let attempts = 0;

    const result = await withRetry(
      async () => {
        attempts++;
        await new Promise(r => setTimeout(r, 5));
        if (attempts < 2) {
          throw new Error('502 Bad Gateway');
        }
        return { data: 'async result' };
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );

    expect(result).toEqual({ data: 'async result' });
  });
});
