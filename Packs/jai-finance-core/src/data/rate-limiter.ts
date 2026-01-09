/**
 * Rate Limiter for API calls
 *
 * Simple token bucket algorithm to prevent exceeding API rate limits.
 */

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private readonly waitQueue: Array<() => void> = [];
  private processing = false;

  /**
   * Create a new rate limiter
   * @param callsPerMinute Maximum calls allowed per minute
   */
  constructor(callsPerMinute: number) {
    if (callsPerMinute <= 0) {
      throw new Error('callsPerMinute must be positive');
    }

    this.maxTokens = callsPerMinute;
    this.tokens = callsPerMinute;
    this.lastRefill = Date.now();
    this.refillRate = callsPerMinute / 60000; // tokens per millisecond
  }

  /**
   * Acquire a token, waiting if necessary
   * @returns Promise that resolves when a token is acquired
   */
  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Need to wait for a token
    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Try to acquire a token without waiting
   * @returns true if token acquired, false otherwise
   */
  tryAcquire(): boolean {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get the number of available tokens
   */
  getAvailableTokens(): number {
    this.refillTokens();
    return Math.floor(this.tokens);
  }

  /**
   * Get estimated wait time in milliseconds for next token
   * @returns Milliseconds until next token available, 0 if available now
   */
  getWaitTime(): number {
    this.refillTokens();

    if (this.tokens >= 1) {
      return 0;
    }

    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }

  /**
   * Reset the limiter to full capacity
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Process the wait queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.waitQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.waitQueue.length > 0) {
      const waitTime = this.getWaitTime();

      if (waitTime > 0) {
        await this.sleep(waitTime);
      }

      this.refillTokens();

      if (this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.waitQueue.shift();
        if (resolve) {
          resolve();
        }
      }
    }

    this.processing = false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
