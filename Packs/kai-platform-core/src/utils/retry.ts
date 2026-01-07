/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;

  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;

  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;

  /** Error codes/messages that should trigger a retry */
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '503', '429', '500', '502', '504']
};

/**
 * Check if an error is retryable
 */
function isRetryable(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof Error) {
    const errorString = `${error.name} ${error.message}`;
    return retryableErrors.some(code => errorString.includes(code));
  }
  return false;
}

/**
 * Execute a function with automatic retry on failure
 *
 * Uses exponential backoff with jitter to avoid thundering herd.
 *
 * @example
 * ```typescript
 * const result = await withRetry(async () => {
 *   return await fetch('https://api.example.com/data');
 * }, { maxRetries: 3 });
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      if (attempt >= opts.maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelayMs
      );
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}
