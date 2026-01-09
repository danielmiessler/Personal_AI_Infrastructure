/**
 * Data Caching Layer
 *
 * Memory cache with optional disk persistence.
 * Supports TTL, invalidation patterns, and LRU eviction.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CacheEntry, CacheConfig } from './types';

/**
 * TTL constants in milliseconds
 */
export const TTL = {
  /** Real-time quotes: 5 minutes */
  QUOTE: 5 * 60 * 1000,
  /** Fundamental data: 24 hours */
  FUNDAMENTALS: 24 * 60 * 60 * 1000,
  /** News articles: 1 hour */
  NEWS: 1 * 60 * 60 * 1000,
  /** Analysis results: 4 hours */
  ANALYSIS: 4 * 60 * 60 * 1000,
  /** Company profiles: 7 days */
  PROFILE: 7 * 24 * 60 * 60 * 1000,
  /** Historical data: 24 hours */
  HISTORICAL: 24 * 60 * 60 * 1000,
  /** SEC filings: 6 hours */
  SEC_FILINGS: 6 * 60 * 60 * 1000,
} as const;

export class DataCache {
  private readonly memoryCache: Map<string, CacheEntry<unknown>>;
  private readonly cacheDir: string;
  private readonly defaultTTL: number;
  private readonly persistToDisk: boolean;
  private readonly maxMemoryEntries: number;
  private accessOrder: string[] = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.cacheDir = config.cacheDir ?? './.cache/jai-finance';
    this.defaultTTL = config.defaultTTL ?? TTL.QUOTE;
    this.persistToDisk = config.persistToDisk ?? true;
    this.maxMemoryEntries = config.maxMemoryEntries ?? 1000;
    this.memoryCache = new Map();

    if (this.persistToDisk) {
      this.ensureCacheDir();
      this.loadFromDisk();
    }
  }

  /**
   * Get a cached value
   * @param key Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): T | undefined {
    // Try memory cache first
    const entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    if (entry) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
        if (this.persistToDisk) {
          this.deleteFromDisk(key);
        }
        return undefined;
      }

      this.updateAccessOrder(key);
      return entry.data;
    }

    // Try disk cache if not in memory
    if (this.persistToDisk) {
      const diskEntry = this.loadFromDiskEntry<T>(key);
      if (diskEntry) {
        if (this.isExpired(diskEntry)) {
          this.deleteFromDisk(key);
          return undefined;
        }

        // Restore to memory cache
        this.setMemory(key, diskEntry);
        return diskEntry.data;
      }
    }

    return undefined;
  }

  /**
   * Set a cached value
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional)
   * @param tags Optional tags for grouped invalidation
   */
  set<T>(key: string, data: T, ttl?: number, tags?: string[]): void {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttl: ttl ?? this.defaultTTL,
      tags,
    };

    this.setMemory(key, entry);

    if (this.persistToDisk) {
      this.saveToDisk(key, entry);
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Invalidate a specific key
   */
  invalidate(key: string): boolean {
    const existed = this.memoryCache.has(key);
    this.memoryCache.delete(key);
    this.removeFromAccessOrder(key);

    if (this.persistToDisk) {
      this.deleteFromDisk(key);
    }

    return existed;
  }

  /**
   * Invalidate all keys matching a pattern
   * @param pattern Regex pattern or string prefix
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;
    let count = 0;

    // Invalidate from memory
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
        count++;
      }
    }

    // Invalidate from disk
    if (this.persistToDisk) {
      count += this.invalidateDiskPattern(regex);
    }

    return count;
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateByTag(tag: string): number {
    let count = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
        if (this.persistToDisk) {
          this.deleteFromDisk(key);
        }
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.memoryCache.clear();
    this.accessOrder = [];

    if (this.persistToDisk) {
      this.clearDisk();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let expired = 0;
    let valid = 0;

    for (const entry of this.memoryCache.values()) {
      if (this.isExpired(entry)) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      memoryEntries: this.memoryCache.size,
      validEntries: valid,
      expiredEntries: expired,
      maxEntries: this.maxMemoryEntries,
      persistToDisk: this.persistToDisk,
      cacheDir: this.cacheDir,
    };
  }

  /**
   * Prune expired entries from cache
   */
  prune(): number {
    let count = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.removeFromAccessOrder(key);
        if (this.persistToDisk) {
          this.deleteFromDisk(key);
        }
        count++;
      }
    }

    return count;
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl, tags);
    return data;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() > entry.cachedAt + entry.ttl;
  }

  private setMemory(key: string, entry: CacheEntry<unknown>): void {
    // Evict LRU entries if at capacity
    while (this.memoryCache.size >= this.maxMemoryEntries) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      } else {
        break;
      }
    }

    this.memoryCache.set(key, entry);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  // =========================================================================
  // Disk Persistence
  // =========================================================================

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private keyToFilename(key: string): string {
    // Sanitize key for filesystem
    const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    // Use hash for long keys
    if (safe.length > 100) {
      const hash = this.simpleHash(key);
      return `${safe.substring(0, 50)}_${hash}.json`;
    }
    return `${safe}.json`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private saveToDisk(key: string, entry: CacheEntry<unknown>): void {
    try {
      const filename = this.keyToFilename(key);
      const filepath = join(this.cacheDir, filename);
      const data = JSON.stringify({ key, entry });
      writeFileSync(filepath, data, 'utf8');
    } catch {
      // Silently fail disk writes
    }
  }

  private loadFromDiskEntry<T>(key: string): CacheEntry<T> | undefined {
    try {
      const filename = this.keyToFilename(key);
      const filepath = join(this.cacheDir, filename);

      if (!existsSync(filepath)) {
        return undefined;
      }

      const data = readFileSync(filepath, 'utf8');
      const parsed = JSON.parse(data) as { key: string; entry: CacheEntry<T> };

      // Verify key matches (handles hash collisions)
      if (parsed.key !== key) {
        return undefined;
      }

      return parsed.entry;
    } catch {
      return undefined;
    }
  }

  private loadFromDisk(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        return;
      }

      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filepath = join(this.cacheDir, file);
          const data = readFileSync(filepath, 'utf8');
          const parsed = JSON.parse(data) as { key: string; entry: CacheEntry<unknown> };

          if (!this.isExpired(parsed.entry)) {
            this.memoryCache.set(parsed.key, parsed.entry);
            this.accessOrder.push(parsed.key);
          } else {
            // Clean up expired disk entry
            unlinkSync(filepath);
          }
        } catch {
          // Skip invalid cache files
        }
      }
    } catch {
      // Silently fail disk reads
    }
  }

  private deleteFromDisk(key: string): void {
    try {
      const filename = this.keyToFilename(key);
      const filepath = join(this.cacheDir, filename);
      if (existsSync(filepath)) {
        unlinkSync(filepath);
      }
    } catch {
      // Silently fail
    }
  }

  private invalidateDiskPattern(regex: RegExp): number {
    let count = 0;

    try {
      if (!existsSync(this.cacheDir)) {
        return 0;
      }

      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filepath = join(this.cacheDir, file);
          const data = readFileSync(filepath, 'utf8');
          const parsed = JSON.parse(data) as { key: string };

          if (regex.test(parsed.key)) {
            unlinkSync(filepath);
            count++;
          }
        } catch {
          // Skip invalid files
        }
      }
    } catch {
      // Silently fail
    }

    return count;
  }

  private clearDisk(): void {
    try {
      if (!existsSync(this.cacheDir)) {
        return;
      }

      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        try {
          const filepath = join(this.cacheDir, file);
          const stat = statSync(filepath);
          if (stat.isFile()) {
            unlinkSync(filepath);
          }
        } catch {
          // Skip files we can't delete
        }
      }
    } catch {
      // Silently fail
    }
  }
}

export interface CacheStats {
  memoryEntries: number;
  validEntries: number;
  expiredEntries: number;
  maxEntries: number;
  persistToDisk: boolean;
  cacheDir: string;
}
