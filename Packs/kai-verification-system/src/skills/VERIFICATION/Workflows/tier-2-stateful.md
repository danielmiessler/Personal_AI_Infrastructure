# Tier 2: Stateful Systems Verification

> Applies to APIs, caches, state machines, and any system that maintains state across operations

## When to Use

Apply this workflow when the system:
- Maintains state between requests (sessions, caches, databases)
- Implements a state machine with defined transitions
- Has time-dependent behavior (TTLs, expirations, timeouts)
- Accumulates data over time (logs, metrics, queues)

**Includes all Tier 1 requirements plus additional stateful verification.**

## Steps

### Step 1: Complete Tier 1

First, apply all Tier 1 checks:
- Assertion density (≥2 per function)
- Positive and negative space
- Bounds on loops/queues/recursion
- Exhaustive error handling
- Exhaustive input testing
- Deterministic seeds

### Step 2: State Transition Testing

Map all valid state transitions and test each:

```typescript
// Define state machine
type State = 'idle' | 'loading' | 'ready' | 'error';
type Event = 'start' | 'success' | 'failure' | 'reset';

const transitions: Record<State, Partial<Record<Event, State>>> = {
  idle:    { start: 'loading' },
  loading: { success: 'ready', failure: 'error' },
  ready:   { reset: 'idle' },
  error:   { reset: 'idle' },
};

// Test ALL valid transitions
describe('state machine', () => {
  test.each([
    ['idle', 'start', 'loading'],
    ['loading', 'success', 'ready'],
    ['loading', 'failure', 'error'],
    ['ready', 'reset', 'idle'],
    ['error', 'reset', 'idle'],
  ])('%s + %s → %s', (from, event, to) => {
    expect(transition(from, event)).toBe(to);
  });
});

// Test INVALID transitions (negative space)
describe('invalid transitions', () => {
  test.each([
    ['idle', 'success'],
    ['idle', 'failure'],
    ['ready', 'start'],
    ['error', 'success'],
  ])('%s + %s → rejected', (from, event) => {
    expect(() => transition(from, event)).toThrow();
  });
});
```

### Step 3: Invariant Checking

Define invariants that must hold after EVERY operation:

```typescript
interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  delete(key: K): void;
  
  // Invariants - call after every operation
  checkInvariants(): void;
}

class LRUCache<K, V> implements Cache<K, V> {
  private map = new Map<K, V>();
  private order: K[] = [];
  private maxSize: number;
  
  checkInvariants(): void {
    // Invariant 1: size matches
    assert(this.map.size === this.order.length, 
      `size mismatch: map=${this.map.size}, order=${this.order.length}`);
    
    // Invariant 2: capacity not exceeded
    assert(this.map.size <= this.maxSize,
      `capacity exceeded: ${this.map.size} > ${this.maxSize}`);
    
    // Invariant 3: all keys in order exist in map
    for (const key of this.order) {
      assert(this.map.has(key),
        `key in order but not in map: ${key}`);
    }
    
    // Invariant 4: no duplicates in order
    const unique = new Set(this.order);
    assert(unique.size === this.order.length,
      `duplicate keys in order list`);
  }
  
  set(key: K, value: V): void {
    // ... implementation ...
    this.checkInvariants(); // Check after every mutation
  }
}
```

### Step 4: Time Simulation

Use simulated time for testing time-dependent behavior:

```typescript
import { SimulatedClock } from '$PAI_DIR/lib/deterministic-random';

describe('cache expiration', () => {
  test('entries expire after TTL', () => {
    const clock = new SimulatedClock();
    const cache = new TTLCache({ ttl: 60_000, clock });
    
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
    
    // Advance time by 30 seconds - still valid
    clock.advance(30_000);
    expect(cache.get('key')).toBe('value');
    
    // Advance past TTL - expired
    clock.advance(31_000);
    expect(cache.get('key')).toBeUndefined();
  });
  
  test('time compression: 1 year of operations', () => {
    const clock = new SimulatedClock();
    const cache = new TTLCache({ ttl: 3600_000, clock }); // 1 hour TTL
    
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const STEP_MS = 60_000; // 1 minute steps
    
    let operations = 0;
    for (let t = 0; t < ONE_YEAR_MS; t += STEP_MS) {
      clock.advance(STEP_MS);
      
      // Simulate realistic operations
      cache.set(`key-${operations % 100}`, `value-${operations}`);
      cache.get(`key-${(operations + 50) % 100}`);
      
      // Check invariants every step
      cache.checkInvariants();
      operations++;
    }
    
    console.log(`Simulated ${operations} operations over 1 year`);
  });
});
```

### Step 5: Sequence Testing

Test sequences of operations, not just individual operations:

```typescript
describe('operation sequences', () => {
  test('rapid set/get/delete cycles', () => {
    const cache = new Cache();
    
    for (let i = 0; i < 1000; i++) {
      cache.set('key', i);
      expect(cache.get('key')).toBe(i);
      cache.delete('key');
      expect(cache.get('key')).toBeUndefined();
      cache.checkInvariants();
    }
  });
  
  test('interleaved operations with seeded randomness', () => {
    const seed = parseInt(process.env.TEST_SEED || '12345');
    console.log(`Seed: ${seed}`);
    const rng = createSeededRandom(seed);
    const cache = new Cache({ maxSize: 10 });
    
    for (let i = 0; i < 10_000; i++) {
      const op = rng.choice(['set', 'get', 'delete']);
      const key = `key-${rng.nextInt(0, 20)}`;
      
      switch (op) {
        case 'set':
          cache.set(key, rng.nextInt(0, 1000));
          break;
        case 'get':
          cache.get(key);
          break;
        case 'delete':
          cache.delete(key);
          break;
      }
      
      cache.checkInvariants();
    }
  });
});
```

### Step 6: Snapshot Testing

Verify state can be serialized and restored:

```typescript
test('snapshot and restore', () => {
  const original = new StatefulSystem();
  
  // Perform operations
  original.doSomething();
  original.doSomethingElse();
  
  // Snapshot
  const snapshot = original.serialize();
  
  // Restore to new instance
  const restored = StatefulSystem.deserialize(snapshot);
  
  // Verify equivalence
  expect(restored.serialize()).toEqual(snapshot);
  
  // Verify behavior equivalence
  original.doMore();
  restored.doMore();
  expect(original.serialize()).toEqual(restored.serialize());
});
```

## Checklist

Before marking stateful code as verified:

**Tier 1 (all required):**
- [ ] Assertion density ≥2 per function
- [ ] Positive and negative space coverage
- [ ] All bounds explicit
- [ ] No silent errors
- [ ] Exhaustive input testing
- [ ] Deterministic seeds

**Tier 2 additions:**
- [ ] All valid state transitions tested
- [ ] All invalid state transitions rejected
- [ ] Invariants defined and checked after every mutation
- [ ] Time-dependent behavior tested with simulated clock
- [ ] Time compression tests (simulate long durations)
- [ ] Operation sequence testing
- [ ] Snapshot/restore verification (if applicable)

## Tools

```bash
# Run time-compressed simulation
bun $PAI_DIR/tools/verification/simulation-harness.ts <test-file> --time-compression 1000x
```

## Common Issues

### "How do I inject a simulated clock?"

Design for testability from the start:

```typescript
// BAD: Hard to test
class Cache {
  private getTime = () => Date.now();
}

// GOOD: Injectable clock
interface Clock {
  now(): number;
}

class Cache {
  constructor(private clock: Clock = { now: () => Date.now() }) {}
}
```

### "Invariants are expensive to check"

Check invariants in tests, optionally in production:

```typescript
checkInvariants(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_INVARIANTS) {
    return; // Skip in production unless explicitly enabled
  }
  // ... checks ...
}
```
