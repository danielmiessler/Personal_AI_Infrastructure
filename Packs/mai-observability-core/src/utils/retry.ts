/**
 * RetryOptions - Configuration for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
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
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
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

      // Don't retry non-retryable errors
      if (!isRetryable(error, opts.retryableErrors)) {
        throw error;
      }

      // Don't retry after max attempts
      if (attempt >= opts.maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelayMs
      );

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Check if an error should trigger a retry
 */
function isRetryable(error: unknown, codes: string[]): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  const name = error.name;

  return codes.some(code =>
    message.includes(code) ||
    name.includes(code) ||
    (error as NodeJS.ErrnoException).code === code
  );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
