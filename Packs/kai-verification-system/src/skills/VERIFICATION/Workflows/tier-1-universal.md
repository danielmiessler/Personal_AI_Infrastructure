# Tier 1: Universal Verification

> Applies to ALL code — the foundation of verification-first engineering

## When to Use

Apply this workflow to **every piece of code**, regardless of type:
- Functions and modules
- Libraries and utilities
- Scripts and CLIs
- Any code that will run in production

This is the baseline. All higher tiers build on Tier 1.

## Steps

### Step 1: Assertion Density Analysis

**Target: Minimum 2 assertions per function**

For each function, identify:

1. **Pre-conditions** — What must be true about inputs?
   ```typescript
   function divide(a: number, b: number): number {
     assert(typeof a === 'number', "a must be a number");
     assert(typeof b === 'number', "b must be a number");
     assert(b !== 0, "divisor cannot be zero");
     // ...
   }
   ```

2. **Post-conditions** — What must be true about outputs?
   ```typescript
   function divide(a: number, b: number): number {
     // ... computation ...
     assert(Number.isFinite(result), "result must be finite");
     return result;
   }
   ```

3. **Invariants** — What relationships must always hold?
   ```typescript
   function transfer(from: Account, to: Account, amount: number): void {
     const totalBefore = from.balance + to.balance;
     // ... transfer logic ...
     assert(from.balance + to.balance === totalBefore, "conservation violated");
   }
   ```

### Step 2: Positive AND Negative Space

For each critical property, assert BOTH:

| Aspect | Example |
|--------|---------|
| **Positive** | `assert(user.role === 'admin', "must be admin")` |
| **Negative** | `assert(user.role !== 'guest', "guest not allowed")` |

**Why both?** Bugs often hide at the boundary between valid and invalid states.

```typescript
// State machine example
function transition(state: State, event: Event): State {
  // Positive: valid transitions
  if (state === 'idle' && event === 'start') {
    return 'running';
  }
  
  // Negative: invalid transitions (assert they don't happen silently)
  assert(
    !(state === 'stopped' && event === 'start'),
    "cannot start from stopped state"
  );
  
  return state;
}
```

### Step 3: Bounds on Everything

Find all loops, queues, and resource allocations. Add explicit bounds:

**Loops:**
```typescript
// BAD
while (hasMore()) {
  process();
}

// GOOD
const MAX_ITERATIONS = 10_000;
let iterations = 0;
while (hasMore()) {
  assert(iterations++ < MAX_ITERATIONS, `loop exceeded ${MAX_ITERATIONS} iterations`);
  process();
}
```

**Queues:**
```typescript
// BAD
queue.push(item);

// GOOD
const MAX_QUEUE_SIZE = 1_000;
assert(queue.length < MAX_QUEUE_SIZE, `queue exceeded ${MAX_QUEUE_SIZE} items`);
queue.push(item);
```

**Recursion:**
```typescript
// BAD
function traverse(node: Node): void {
  traverse(node.left);
  traverse(node.right);
}

// GOOD
function traverse(node: Node, depth = 0): void {
  const MAX_DEPTH = 100;
  assert(depth < MAX_DEPTH, `recursion exceeded ${MAX_DEPTH} levels`);
  traverse(node.left, depth + 1);
  traverse(node.right, depth + 1);
}
```

### Step 4: Exhaustive Error Handling

**Rule: No silent failures**

Every error must be:
1. Handled explicitly, OR
2. Propagated to caller, OR
3. Cause a crash with context

```typescript
// BAD: Silent failure
try {
  riskyOperation();
} catch (e) {
  console.log(e); // Logged but ignored
}

// GOOD: Explicit handling
try {
  riskyOperation();
} catch (e) {
  if (e instanceof RecoverableError) {
    return fallbackValue;
  }
  throw new Error(`riskyOperation failed: ${e.message}`, { cause: e });
}
```

### Step 5: Exhaustive Input Testing

Generate test cases covering:

| Category | Examples |
|----------|----------|
| **Valid** | Typical inputs, happy path |
| **Invalid** | Wrong types, null, undefined |
| **Boundary** | 0, -1, MAX_INT, empty string, empty array |
| **Transition** | Valid→invalid, invalid→valid |

```typescript
describe('divide', () => {
  // Valid
  test('divides positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  // Boundary
  test('handles zero numerator', () => {
    expect(divide(0, 5)).toBe(0);
  });
  
  // Invalid
  test('throws on zero divisor', () => {
    expect(() => divide(10, 0)).toThrow('divisor cannot be zero');
  });
  
  // Boundary edge
  test('handles very large numbers', () => {
    expect(divide(Number.MAX_SAFE_INTEGER, 1)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
```

### Step 6: Deterministic Seeds

Any randomness must be reproducible:

```typescript
// BAD
const id = Math.random().toString(36);

// GOOD
import { createSeededRandom } from '$PAI_DIR/lib/deterministic-random';

const seed = process.env.TEST_SEED ? parseInt(process.env.TEST_SEED) : Date.now();
console.log(`Using seed: ${seed}`);
const rng = createSeededRandom(seed);
const id = rng.nextString(8);
```

## Checklist

Before marking code as verified:

- [ ] Every function has ≥2 assertions
- [ ] Pre-conditions validate all inputs
- [ ] Post-conditions validate outputs
- [ ] Invariants are explicitly checked
- [ ] Both positive and negative space asserted
- [ ] All loops have explicit bounds
- [ ] All queues have size limits
- [ ] All recursion has depth limits
- [ ] No silent error handling
- [ ] All errors propagated or handled explicitly
- [ ] Test cases cover valid, invalid, and boundary inputs
- [ ] All randomness uses deterministic seeds

## Tools

```bash
# Analyze assertion density
bun $PAI_DIR/tools/verification/assertion-density.ts <path>

# Find unbounded constructs
bun $PAI_DIR/tools/verification/bounds-checker.ts <path>
```

## Common Issues

### "This function is too simple for assertions"

No function is too simple. Even getters can have invariants:

```typescript
get balance(): number {
  assert(this._balance >= 0, "balance invariant violated");
  return this._balance;
}
```

### "Assertions slow down production code"

Use environment-based assertion stripping:

```typescript
const assert = process.env.NODE_ENV === 'production'
  ? () => {}  // No-op in production
  : (condition: boolean, msg: string) => {
      if (!condition) throw new Error(`Assertion failed: ${msg}`);
    };
```

Or keep assertions in production — they're your last line of defense against corruption.

### "I can't think of what to assert"

Ask:
1. What must be true before this runs?
2. What must be true after this runs?
3. What relationship between values must always hold?
4. What should NEVER happen here?
