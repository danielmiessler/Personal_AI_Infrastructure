// @ts-nocheck
/**
 * Deterministic Random Library
 * 
 * Provides seeded pseudo-random number generation for reproducible testing.
 * Every random value is derived from a seed, enabling exact reproduction
 * of any test run by using the same seed.
 * 
 * Usage:
 *   import { createSeededRandom, SimulatedClock } from './deterministic-random';
 *   
 *   const seed = parseInt(process.env.TEST_SEED || String(Date.now()));
 *   console.log(`Seed: ${seed}`);
 *   const rng = createSeededRandom(seed);
 */

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Mulberry32 - Fast, high-quality 32-bit PRNG
 * Period: 2^32, passes BigCrush
 */
function mulberry32(seed: number): () => number {
  return function(): number {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Seeded random number generator with utility methods
 */
export class SeededRandom {
  private rng: () => number;
  private _seed: number;
  
  constructor(seed: number) {
    this._seed = seed;
    this.rng = mulberry32(seed);
  }
  
  /** Get the original seed */
  get seed(): number {
    return this._seed;
  }
  
  /** Generate random float in [0, 1) */
  next(): number {
    return this.rng();
  }
  
  /** Generate random float in [min, max) */
  nextFloat(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }
  
  /** Generate random integer in [min, max) */
  nextInt(min: number, max: number): number {
    return Math.floor(min + this.rng() * (max - min));
  }
  
  /** Generate random boolean */
  nextBool(): boolean {
    return this.rng() < 0.5;
  }
  
  /** Return true with given probability */
  chance(probability: number): boolean {
    return this.rng() < probability;
  }
  
  /** Pick random element from array */
  choice<T>(arr: readonly T[]): T {
    if (arr.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return arr[this.nextInt(0, arr.length)];
  }
  
  /** Pick random element, or undefined if empty */
  choiceOrUndefined<T>(arr: readonly T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[this.nextInt(0, arr.length)];
  }
  
  /** Sample n elements from array (without replacement) */
  sample<T>(arr: readonly T[], n: number): T[] {
    if (n > arr.length) {
      throw new Error(`Cannot sample ${n} elements from array of length ${arr.length}`);
    }
    
    const copy = [...arr];
    const result: T[] = [];
    
    for (let i = 0; i < n; i++) {
      const idx = this.nextInt(0, copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    
    return result;
  }
  
  /** Sample n elements (with replacement) */
  sampleWithReplacement<T>(arr: readonly T[], n: number): T[] {
    if (arr.length === 0) {
      throw new Error('Cannot sample from empty array');
    }
    
    const result: T[] = [];
    for (let i = 0; i < n; i++) {
      result.push(this.choice(arr));
    }
    return result;
  }
  
  /** Shuffle array in place using Fisher-Yates */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  /** Return shuffled copy (doesn't modify original) */
  shuffled<T>(arr: readonly T[]): T[] {
    return this.shuffle([...arr]);
  }
  
  /** Generate random string */
  nextString(
    length: number,
    charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  ): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[this.nextInt(0, charset.length)];
    }
    return result;
  }
  
  /** Generate random hex string */
  nextHex(length: number): string {
    return this.nextString(length, '0123456789abcdef');
  }
  
  /** Generate UUID-like string (not cryptographically secure) */
  nextUuid(): string {
    const hex = this.nextHex(32);
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      '4' + hex.slice(13, 16),  // Version 4
      ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
      hex.slice(20, 32),
    ].join('-');
  }
  
  /** Generate random bytes */
  nextBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = this.nextInt(0, 256);
    }
    return bytes;
  }
  
  /** Weighted random selection */
  weightedChoice<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights must have same length');
    }
    if (items.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.rng() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }
  
  /** Normal distribution using Box-Muller transform */
  nextGaussian(mean = 0, stdDev = 1): number {
    const u1 = this.rng();
    const u2 = this.rng();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
  
  /** Exponential distribution */
  nextExponential(lambda = 1): number {
    return -Math.log(1 - this.rng()) / lambda;
  }
}

/** Factory function */
export function createSeededRandom(seed: number): SeededRandom {
  return new SeededRandom(seed);
}

/** Get seed from environment or generate new one */
export function getSeed(): number {
  if (typeof process !== 'undefined' && process.env?.TEST_SEED) {
    return parseInt(process.env.TEST_SEED, 10);
  }
  if (typeof process !== 'undefined' && process.env?.SIMULATION_SEED) {
    return parseInt(process.env.SIMULATION_SEED, 10);
  }
  return Date.now();
}

// ============================================================================
// Simulated Clock
// ============================================================================

interface Timer {
  id: number;
  fireAt: number;
  callback: () => void;
  interval?: number;  // For setInterval
}

/**
 * Simulated clock for time compression testing.
 * Replaces Date.now(), setTimeout, setInterval with controllable time.
 */
export class SimulatedClock {
  private currentTime: number;
  private timers: Map<number, Timer> = new Map();
  private nextTimerId = 1;
  
  constructor(startTime = 0) {
    this.currentTime = startTime;
  }
  
  /** Current simulated time in milliseconds */
  now(): number {
    return this.currentTime;
  }
  
  /** Current simulated time as Date */
  date(): Date {
    return new Date(this.currentTime);
  }
  
  /** Schedule callback after delay */
  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextTimerId++;
    this.timers.set(id, {
      id,
      fireAt: this.currentTime + ms,
      callback,
    });
    return id;
  }
  
  /** Schedule repeating callback */
  setInterval(callback: () => void, ms: number): number {
    const id = this.nextTimerId++;
    this.timers.set(id, {
      id,
      fireAt: this.currentTime + ms,
      callback,
      interval: ms,
    });
    return id;
  }
  
  /** Cancel timer */
  clearTimeout(id: number): void {
    this.timers.delete(id);
  }
  
  /** Alias for clearTimeout */
  clearInterval(id: number): void {
    this.timers.delete(id);
  }
  
  /** Advance time and fire ready timers */
  advance(ms: number): void {
    const targetTime = this.currentTime + ms;
    
    while (this.currentTime < targetTime) {
      // Find next timer to fire
      let nextTimer: Timer | null = null;
      
      for (const timer of this.timers.values()) {
        if (timer.fireAt <= targetTime) {
          if (!nextTimer || timer.fireAt < nextTimer.fireAt) {
            nextTimer = timer;
          }
        }
      }
      
      if (nextTimer && nextTimer.fireAt <= targetTime) {
        // Advance to timer fire time
        this.currentTime = nextTimer.fireAt;
        
        // Fire callback
        try {
          nextTimer.callback();
        } catch (e) {
          console.error('Timer callback error:', e);
        }
        
        // Handle interval
        if (nextTimer.interval) {
          nextTimer.fireAt = this.currentTime + nextTimer.interval;
        } else {
          this.timers.delete(nextTimer.id);
        }
      } else {
        // No more timers before target, jump to target
        this.currentTime = targetTime;
      }
    }
  }
  
  /** Advance to next scheduled timer */
  advanceToNextTimer(): boolean {
    let earliest: Timer | null = null;
    
    for (const timer of this.timers.values()) {
      if (!earliest || timer.fireAt < earliest.fireAt) {
        earliest = timer;
      }
    }
    
    if (earliest) {
      this.advance(earliest.fireAt - this.currentTime);
      return true;
    }
    return false;
  }
  
  /** Advance by duration string (e.g., "1h", "7d", "1y") */
  advanceDuration(duration: string): void {
    const ms = parseDurationToMs(duration);
    this.advance(ms);
  }
  
  /** Number of pending timers */
  get pendingTimers(): number {
    return this.timers.size;
  }
  
  /** Clear all timers */
  clearAllTimers(): void {
    this.timers.clear();
  }
  
  /** Reset clock to initial state */
  reset(startTime = 0): void {
    this.currentTime = startTime;
    this.timers.clear();
    this.nextTimerId = 1;
  }
}

function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d|w|y)$/);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    'ms': 1,
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
    'w': 7 * 24 * 60 * 60 * 1000,
    'y': 365 * 24 * 60 * 60 * 1000,
  };
  
  return value * multipliers[unit];
}

// ============================================================================
// Assertion Helper
// ============================================================================

/**
 * Basic assertion function
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assertion with context
 */
export function assertWithContext(
  condition: boolean,
  message: string,
  context: Record<string, unknown>
): asserts condition {
  if (!condition) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    throw new Error(`Assertion failed: ${message} [${contextStr}]`);
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  mulberry32,
  parseDurationToMs,
};
