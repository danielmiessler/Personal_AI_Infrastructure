import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  invalidateAdapterCache,
  getAdapterCacheStatus,
  invalidateConfigCache
} from '../src/discovery/index.ts';

describe('AdapterLoader', () => {
  beforeEach(() => {
    invalidateAdapterCache();
  });

  afterEach(() => {
    invalidateAdapterCache();
  });

  describe('getAdapterCacheStatus', () => {
    it('returns empty cache status initially', () => {
      const status = getAdapterCacheStatus();
      expect(status.size).toBe(0);
      expect(status.domains).toEqual([]);
    });
  });

  describe('invalidateAdapterCache', () => {
    it('clears all cache when called without arguments', () => {
      // The cache is empty, but the function should work
      invalidateAdapterCache();
      const status = getAdapterCacheStatus();
      expect(status.size).toBe(0);
    });

    it('clears specific domain when provided', () => {
      invalidateAdapterCache('issues');
      const status = getAdapterCacheStatus();
      expect(status.size).toBe(0);
    });
  });
});

describe('ConfigLoader', () => {
  beforeEach(() => {
    invalidateConfigCache();
  });

  afterEach(() => {
    invalidateConfigCache();
  });

  describe('invalidateConfigCache', () => {
    it('can be called without error', () => {
      expect(() => invalidateConfigCache()).not.toThrow();
    });
  });
});
