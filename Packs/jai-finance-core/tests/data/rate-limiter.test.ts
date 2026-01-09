/**
 * RateLimiter Tests
 *
 * Tests for the token bucket rate limiter used to prevent API rate limit violations.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { RateLimiter } from '../../src/data/rate-limiter';

describe('RateLimiter', () => {
  describe('Constructor', () => {
    it('should create a rate limiter with specified calls per minute', () => {
      const limiter = new RateLimiter(60);
      expect(limiter.getAvailableTokens()).toBe(60);
    });

    it('should throw error for zero calls per minute', () => {
      expect(() => new RateLimiter(0)).toThrow('callsPerMinute must be positive');
    });

    it('should throw error for negative calls per minute', () => {
      expect(() => new RateLimiter(-10)).toThrow('callsPerMinute must be positive');
    });

    it('should handle fractional calls per minute', () => {
      const limiter = new RateLimiter(0.5); // One call every 2 minutes
      expect(limiter.getAvailableTokens()).toBe(0); // Floor of 0.5 is 0
    });
  });

  describe('tryAcquire', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
      limiter = new RateLimiter(60); // 60 calls per minute = 1 per second
    });

    it('should acquire token when available', () => {
      const result = limiter.tryAcquire();
      expect(result).toBe(true);
      expect(limiter.getAvailableTokens()).toBe(59);
    });

    it('should acquire multiple tokens up to limit', () => {
      for (let i = 0; i < 60; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }
      expect(limiter.getAvailableTokens()).toBe(0);
    });

    it('should return false when no tokens available', () => {
      // Exhaust all tokens
      for (let i = 0; i < 60; i++) {
        limiter.tryAcquire();
      }

      const result = limiter.tryAcquire();
      expect(result).toBe(false);
    });

    it('should refill tokens over time', async () => {
      // Exhaust all tokens
      for (let i = 0; i < 60; i++) {
        limiter.tryAcquire();
      }

      expect(limiter.getAvailableTokens()).toBe(0);

      // Wait 100ms - should refill ~0.1 tokens (60 tokens per 60000ms = 1 per 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be 0 since we need a full token
      expect(limiter.tryAcquire()).toBe(false);

      // Wait 1 second total - should have 1 token
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(limiter.tryAcquire()).toBe(true);
    });
  });

  describe('acquire (blocking)', () => {
    it('should resolve immediately when tokens available', async () => {
      const limiter = new RateLimiter(60);

      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50); // Should be nearly instant
      expect(limiter.getAvailableTokens()).toBe(59);
    });

    it('should wait when no tokens available', async () => {
      // 60 per minute = 1 per second, so waiting for token should take ~1s
      const limiter = new RateLimiter(60);

      // Exhaust all tokens
      for (let i = 0; i < 60; i++) {
        limiter.tryAcquire();
      }

      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      // Should have waited approximately 1 second (with some tolerance)
      expect(elapsed).toBeGreaterThanOrEqual(900);
      expect(elapsed).toBeLessThan(1500);
    });

    it('should handle multiple waiting acquires in order', async () => {
      // High rate for faster test: 600 per minute = 10 per second = 100ms per token
      const limiter = new RateLimiter(600);

      // Exhaust all tokens
      for (let i = 0; i < 600; i++) {
        limiter.tryAcquire();
      }

      const order: number[] = [];

      // Queue up multiple acquires
      const p1 = limiter.acquire().then(() => order.push(1));
      const p2 = limiter.acquire().then(() => order.push(2));
      const p3 = limiter.acquire().then(() => order.push(3));

      await Promise.all([p1, p2, p3]);

      // Should be processed in order
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('getAvailableTokens', () => {
    it('should return current token count', () => {
      const limiter = new RateLimiter(100);
      expect(limiter.getAvailableTokens()).toBe(100);

      limiter.tryAcquire();
      expect(limiter.getAvailableTokens()).toBe(99);
    });

    it('should refill tokens when checking', async () => {
      const limiter = new RateLimiter(60);

      // Use half the tokens
      for (let i = 0; i < 30; i++) {
        limiter.tryAcquire();
      }

      expect(limiter.getAvailableTokens()).toBe(30);

      // Wait 500ms - should gain ~0.5 tokens
      await new Promise((resolve) => setTimeout(resolve, 500));

      // getAvailableTokens triggers refill but returns floor
      const tokens = limiter.getAvailableTokens();
      expect(tokens).toBeGreaterThanOrEqual(30);
    });

    it('should not exceed max tokens', async () => {
      const limiter = new RateLimiter(10);

      // Wait some time - tokens should cap at 10
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(limiter.getAvailableTokens()).toBe(10);
    });
  });

  describe('getWaitTime', () => {
    it('should return 0 when tokens available', () => {
      const limiter = new RateLimiter(60);
      expect(limiter.getWaitTime()).toBe(0);
    });

    it('should return positive wait time when no tokens', () => {
      const limiter = new RateLimiter(60);

      // Exhaust all tokens
      for (let i = 0; i < 60; i++) {
        limiter.tryAcquire();
      }

      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(1000); // Should be ~1000ms for 60/min
    });

    it('should decrease over time', async () => {
      const limiter = new RateLimiter(60);

      // Exhaust all tokens
      for (let i = 0; i < 60; i++) {
        limiter.tryAcquire();
      }

      const waitTime1 = limiter.getWaitTime();

      // Wait 200ms
      await new Promise((resolve) => setTimeout(resolve, 200));

      const waitTime2 = limiter.getWaitTime();

      expect(waitTime2).toBeLessThan(waitTime1);
    });
  });

  describe('reset', () => {
    it('should restore tokens to maximum', () => {
      const limiter = new RateLimiter(100);

      // Use all tokens
      for (let i = 0; i < 100; i++) {
        limiter.tryAcquire();
      }

      expect(limiter.getAvailableTokens()).toBe(0);

      limiter.reset();

      expect(limiter.getAvailableTokens()).toBe(100);
    });

    it('should work after partial usage', () => {
      const limiter = new RateLimiter(50);

      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();

      expect(limiter.getAvailableTokens()).toBe(47);

      limiter.reset();

      expect(limiter.getAvailableTokens()).toBe(50);
    });
  });

  describe('Token Refill Rate', () => {
    it('should refill at correct rate for 60/minute', async () => {
      const limiter = new RateLimiter(60); // 1 token per second

      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryAcquire();
      }

      const startTokens = limiter.getAvailableTokens();
      expect(startTokens).toBe(55);

      // Wait 2 seconds - should gain ~2 tokens
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const endTokens = limiter.getAvailableTokens();
      expect(endTokens).toBeGreaterThanOrEqual(56);
      expect(endTokens).toBeLessThanOrEqual(58);
    });

    it('should refill at correct rate for 30/minute', async () => {
      const limiter = new RateLimiter(30); // 0.5 tokens per second

      // Use all tokens
      for (let i = 0; i < 30; i++) {
        limiter.tryAcquire();
      }

      // Wait 2 seconds - should gain 1 token (0.5 * 2)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      expect(limiter.getAvailableTokens()).toBe(1);
    });
  });

  describe('Concurrent Request Simulation', () => {
    it('should handle burst of requests', async () => {
      const limiter = new RateLimiter(10); // 10 per minute for faster test

      const results: boolean[] = [];

      // Try 15 requests at once
      for (let i = 0; i < 15; i++) {
        results.push(limiter.tryAcquire());
      }

      // First 10 should succeed, rest should fail
      expect(results.filter((r) => r === true).length).toBe(10);
      expect(results.filter((r) => r === false).length).toBe(5);
    });

    it('should process queued requests over time', async () => {
      // 600 per minute = 10 per second for reasonable test time
      const limiter = new RateLimiter(600);

      // Exhaust tokens
      for (let i = 0; i < 600; i++) {
        limiter.tryAcquire();
      }

      const start = Date.now();
      const completionTimes: number[] = [];

      // Queue 5 requests - should complete over ~500ms (100ms each)
      const promises = Array.from({ length: 5 }, () =>
        limiter.acquire().then(() => {
          completionTimes.push(Date.now() - start);
        })
      );

      await Promise.all(promises);

      // Each request should be ~100ms apart
      expect(completionTimes.length).toBe(5);
      expect(completionTimes[completionTimes.length - 1]).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high rate limit', () => {
      const limiter = new RateLimiter(10000); // 10000 per minute
      expect(limiter.getAvailableTokens()).toBe(10000);

      // Should be able to acquire many quickly
      for (let i = 0; i < 1000; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }
    });

    it('should handle very low rate limit', async () => {
      const limiter = new RateLimiter(1); // 1 per minute

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      // Wait time should be close to 60 seconds
      const waitTime = limiter.getWaitTime();
      expect(waitTime).toBeGreaterThan(50000);
      expect(waitTime).toBeLessThanOrEqual(60000);
    });

    it('should not lose precision over many operations', async () => {
      const limiter = new RateLimiter(600); // 10 per second

      // Rapid acquire/wait cycles
      for (let i = 0; i < 50; i++) {
        if (!limiter.tryAcquire()) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      // Should not have accumulated errors causing more than max tokens
      expect(limiter.getAvailableTokens()).toBeLessThanOrEqual(600);
    });
  });

  describe('Real-world API Rate Limit Scenarios', () => {
    it('should handle Finnhub free tier (60/min)', async () => {
      const finnhubLimiter = new RateLimiter(60);

      // Simulate making API calls
      let successfulCalls = 0;
      const startTime = Date.now();

      // Try 65 calls
      for (let i = 0; i < 65; i++) {
        if (finnhubLimiter.tryAcquire()) {
          successfulCalls++;
        }
      }

      const elapsed = Date.now() - startTime;

      expect(successfulCalls).toBe(60);
      expect(elapsed).toBeLessThan(100); // Should be fast (no blocking)
    });

    it('should pace requests correctly with acquire()', async () => {
      // Use higher rate for faster test: 300/min = 5/second
      const limiter = new RateLimiter(300);

      // Exhaust initial tokens
      for (let i = 0; i < 300; i++) {
        limiter.tryAcquire();
      }

      const start = Date.now();

      // Make 3 more requests - should take ~600ms total
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(500);
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
