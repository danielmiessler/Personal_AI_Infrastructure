/**
 * DataCache Tests
 *
 * Tests for the memory cache with TTL, LRU eviction, tags, and pattern invalidation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DataCache, TTL } from '../../src/data/cache';
import { existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Test cache directory - unique per test run to avoid conflicts
const TEST_CACHE_DIR = './.cache/test-jai-finance-' + Date.now();

describe('DataCache', () => {
  let cache: DataCache;

  // Clean up test cache directory after each test
  afterEach(() => {
    try {
      if (existsSync(TEST_CACHE_DIR)) {
        rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('TTL Constants', () => {
    it('should define correct TTL values', () => {
      expect(TTL.QUOTE).toBe(5 * 60 * 1000); // 5 minutes
      expect(TTL.FUNDAMENTALS).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(TTL.NEWS).toBe(1 * 60 * 60 * 1000); // 1 hour
      expect(TTL.ANALYSIS).toBe(4 * 60 * 60 * 1000); // 4 hours
      expect(TTL.PROFILE).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
      expect(TTL.HISTORICAL).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(TTL.SEC_FILINGS).toBe(6 * 60 * 60 * 1000); // 6 hours
    });
  });

  describe('Basic Operations (Memory Only)', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000, // 1 minute
      });
    });

    it('should set and get a value', () => {
      cache.set('key1', { value: 'test' });
      const result = cache.get<{ value: string }>('key1');
      expect(result).toEqual({ value: 'test' });
    });

    it('should return undefined for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing value', () => {
      cache.set('key1', 'first');
      cache.set('key1', 'second');
      expect(cache.get('key1')).toBe('second');
    });

    it('should handle various data types', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('boolean', true);
      cache.set('array', [1, 2, 3]);
      cache.set('object', { nested: { value: 'deep' } });
      cache.set('null', null);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('boolean')).toBe(true);
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('object')).toEqual({ nested: { value: 'deep' } });
      expect(cache.get('null')).toBeNull();
    });

    it('should check if key exists with has()', () => {
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
      expect(cache.has('does-not-exist')).toBe(false);
    });
  });

  describe('TTL Expiration', () => {
    it('should return undefined for expired entries', async () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 50, // 50ms TTL
      });

      cache.set('expiring', 'value');
      expect(cache.get('expiring')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('expiring')).toBeUndefined();
    });

    it('should respect custom TTL per entry', async () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 1000, // 1 second default
      });

      cache.set('short-ttl', 'expires fast', 50);
      cache.set('long-ttl', 'expires slow', 10000);

      // Wait past short TTL but not long TTL
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('short-ttl')).toBeUndefined();
      expect(cache.get('long-ttl')).toBe('expires slow');
    });

    it('should not return expired entries via has()', async () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 50,
      });

      cache.set('expiring', 'value');
      expect(cache.has('expiring')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.has('expiring')).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        maxMemoryEntries: 3,
        defaultTTL: 60000,
      });
    });

    it('should evict least recently used entry when at capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // All three should exist
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);

      // Add fourth entry - 'a' was accessed most recently due to get() above
      // but 'b' was the least recently accessed before we got all three
      // Actually after getting all three, order is a, b, c
      // So 'a' is LRU and should be evicted
      cache.set('d', 4);

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update access order on get()', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to move it to most recently used
      cache.get('a');

      // Now 'b' is LRU
      cache.set('d', 4);

      expect(cache.get('a')).toBe(1); // Still exists - was recently accessed
      expect(cache.get('b')).toBeUndefined(); // Evicted as LRU
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update access order on set() for existing key', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Update 'a' to move it to most recently used
      cache.set('a', 10);

      // Now 'b' is LRU
      cache.set('d', 4);

      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('Invalidation', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
      });
    });

    it('should invalidate a specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const existed = cache.invalidate('key1');

      expect(existed).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should return false when invalidating non-existent key', () => {
      const existed = cache.invalidate('non-existent');
      expect(existed).toBe(false);
    });

    it('should invalidate by string prefix pattern', () => {
      cache.set('quote:AAPL', 100);
      cache.set('quote:MSFT', 200);
      cache.set('profile:AAPL', { name: 'Apple' });

      const count = cache.invalidatePattern('quote:');

      expect(count).toBe(2);
      expect(cache.get('quote:AAPL')).toBeUndefined();
      expect(cache.get('quote:MSFT')).toBeUndefined();
      expect(cache.get('profile:AAPL')).toEqual({ name: 'Apple' });
    });

    it('should invalidate by regex pattern', () => {
      cache.set('quote:AAPL', 100);
      cache.set('profile:AAPL', { name: 'Apple' });
      cache.set('quote:MSFT', 200);
      cache.set('profile:MSFT', { name: 'Microsoft' });

      const count = cache.invalidatePattern(/.*:AAPL$/);

      expect(count).toBe(2);
      expect(cache.get('quote:AAPL')).toBeUndefined();
      expect(cache.get('profile:AAPL')).toBeUndefined();
      expect(cache.get('quote:MSFT')).toBe(200);
      expect(cache.get('profile:MSFT')).toEqual({ name: 'Microsoft' });
    });
  });

  describe('Tag-based Invalidation', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
      });
    });

    it('should store and invalidate by tag', () => {
      cache.set('quote:AAPL', 100, undefined, ['stock', 'realtime']);
      cache.set('quote:MSFT', 200, undefined, ['stock', 'realtime']);
      cache.set('profile:AAPL', { name: 'Apple' }, undefined, ['stock']);

      const count = cache.invalidateByTag('realtime');

      expect(count).toBe(2);
      expect(cache.get('quote:AAPL')).toBeUndefined();
      expect(cache.get('quote:MSFT')).toBeUndefined();
      expect(cache.get('profile:AAPL')).toEqual({ name: 'Apple' });
    });

    it('should return 0 when no entries have the tag', () => {
      cache.set('key1', 'value1', undefined, ['tag1']);
      const count = cache.invalidateByTag('non-existent-tag');
      expect(count).toBe(0);
    });

    it('should handle entries without tags', () => {
      cache.set('no-tags', 'value');
      cache.set('with-tags', 'value', undefined, ['mytag']);

      const count = cache.invalidateByTag('mytag');

      expect(count).toBe(1);
      expect(cache.get('no-tags')).toBe('value');
      expect(cache.get('with-tags')).toBeUndefined();
    });
  });

  describe('Clear', () => {
    it('should clear all entries from memory cache', () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
      });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
      expect(cache.getStats().memoryEntries).toBe(0);
    });
  });

  describe('Stats', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
        maxMemoryEntries: 100,
      });
    });

    it('should return accurate stats', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const stats = cache.getStats();

      expect(stats.memoryEntries).toBe(3);
      expect(stats.validEntries).toBe(3);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.maxEntries).toBe(100);
      expect(stats.persistToDisk).toBe(false);
    });

    it('should count expired entries in stats', async () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 50,
        maxMemoryEntries: 100,
      });

      cache.set('expiring1', 'value1');
      cache.set('expiring2', 'value2');
      cache.set('long-lived', 'value3', 10000);

      await new Promise((resolve) => setTimeout(resolve, 60));

      const stats = cache.getStats();

      expect(stats.memoryEntries).toBe(3);
      expect(stats.validEntries).toBe(1);
      expect(stats.expiredEntries).toBe(2);
    });
  });

  describe('Prune', () => {
    it('should remove expired entries', async () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 50,
      });

      cache.set('expiring1', 'value1');
      cache.set('expiring2', 'value2');
      cache.set('long-lived', 'value3', 10000);

      await new Promise((resolve) => setTimeout(resolve, 60));

      const prunedCount = cache.prune();

      expect(prunedCount).toBe(2);
      expect(cache.getStats().memoryEntries).toBe(1);
      expect(cache.get('long-lived')).toBe('value3');
    });

    it('should return 0 when nothing to prune', () => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
      });

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const prunedCount = cache.prune();

      expect(prunedCount).toBe(0);
      expect(cache.getStats().memoryEntries).toBe(2);
    });
  });

  describe('getOrSet', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
      });
    });

    it('should return cached value without calling factory', async () => {
      cache.set('key', 'cached-value');

      let factoryCalled = false;
      const result = await cache.getOrSet('key', async () => {
        factoryCalled = true;
        return 'new-value';
      });

      expect(result).toBe('cached-value');
      expect(factoryCalled).toBe(false);
    });

    it('should call factory and cache result when key not found', async () => {
      let factoryCalled = false;
      const result = await cache.getOrSet('key', async () => {
        factoryCalled = true;
        return 'factory-value';
      });

      expect(result).toBe('factory-value');
      expect(factoryCalled).toBe(true);
      expect(cache.get('key')).toBe('factory-value');
    });

    it('should respect custom TTL in getOrSet', async () => {
      await cache.getOrSet(
        'key',
        async () => 'value',
        50 // 50ms TTL
      );

      expect(cache.get('key')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('key')).toBeUndefined();
    });

    it('should store tags from getOrSet', async () => {
      await cache.getOrSet('key', async () => 'value', undefined, ['tag1', 'tag2']);

      const count = cache.invalidateByTag('tag1');
      expect(count).toBe(1);
      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('Disk Persistence', () => {
    beforeEach(() => {
      // Clean up before test
      if (existsSync(TEST_CACHE_DIR)) {
        rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
      }

      cache = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });
    });

    it('should create cache directory', () => {
      expect(existsSync(TEST_CACHE_DIR)).toBe(true);
    });

    it('should persist data to disk and reload', () => {
      cache.set('persisted-key', { data: 'persisted-value' });

      // Create new cache instance - should load from disk
      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get('persisted-key')).toEqual({ data: 'persisted-value' });
    });

    it('should not load expired entries from disk', async () => {
      const shortTTLCache = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 50,
      });

      shortTTLCache.set('expiring', 'value');

      await new Promise((resolve) => setTimeout(resolve, 60));

      // Create new cache - should not load expired entry
      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get('expiring')).toBeUndefined();
    });

    it('should delete from disk on invalidation', () => {
      cache.set('to-delete', 'value');

      // Verify it exists
      expect(cache.get('to-delete')).toBe('value');

      cache.invalidate('to-delete');

      // Create new cache - should not find the key
      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get('to-delete')).toBeUndefined();
    });

    it('should clear disk cache on clear()', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get('key1')).toBeUndefined();
      expect(cache2.get('key2')).toBeUndefined();
      expect(cache2.getStats().memoryEntries).toBe(0);
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'quote:AAPL/USD@NYSE?date=2024-01-01';
      cache.set(specialKey, 'value');

      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get(specialKey)).toBe('value');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(200);
      cache.set(longKey, 'value');

      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get(longKey)).toBe('value');
    });

    it('should invalidate disk entries by pattern', () => {
      cache.set('quote:AAPL', 100);
      cache.set('quote:MSFT', 200);
      cache.set('profile:AAPL', { name: 'Apple' });

      cache.invalidatePattern('quote:');

      const cache2 = new DataCache({
        persistToDisk: true,
        cacheDir: TEST_CACHE_DIR,
        defaultTTL: 60000,
      });

      expect(cache2.get('quote:AAPL')).toBeUndefined();
      expect(cache2.get('quote:MSFT')).toBeUndefined();
      expect(cache2.get('profile:AAPL')).toEqual({ name: 'Apple' });
    });
  });

  describe('Default Configuration', () => {
    it('should use default values when no config provided', () => {
      // Note: This test may create files in ./.cache/jai-finance
      const defaultCache = new DataCache();
      const stats = defaultCache.getStats();

      expect(stats.maxEntries).toBe(1000);
      expect(stats.persistToDisk).toBe(true);
      expect(stats.cacheDir).toBe('./.cache/jai-finance');

      // Clean up
      defaultCache.clear();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      cache = new DataCache({
        persistToDisk: false,
        defaultTTL: 60000,
      });
    });

    it('should handle undefined value (treated as cache miss)', () => {
      // Explicitly setting undefined should work
      cache.set('key', undefined as unknown);
      // But get returns undefined which looks like a miss
      // This is expected behavior - don't cache undefined
      expect(cache.get('key')).toBeUndefined();
    });

    it('should handle empty string key', () => {
      cache.set('', 'empty-key-value');
      expect(cache.get('')).toBe('empty-key-value');
    });

    it('should handle concurrent access patterns', async () => {
      // Simulate concurrent getOrSet calls
      const promises = Array.from({ length: 10 }, (_, i) =>
        cache.getOrSet(`concurrent-${i % 3}`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `value-${i % 3}`;
        })
      );

      const results = await Promise.all(promises);

      // All calls with same key should get same value
      expect(results.filter((r) => r === 'value-0').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero TTL (immediate expiration)', async () => {
      cache.set('zero-ttl', 'value', 0);

      // Immediate check might still work due to timing
      // But after a tick, it should be gone
      await new Promise((resolve) => setTimeout(resolve, 1));
      expect(cache.get('zero-ttl')).toBeUndefined();
    });
  });
});
