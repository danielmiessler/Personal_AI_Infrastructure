# Verification-First Engineering Principles

> Core philosophy for building systems that are proven correct, not just tested

## The Hierarchy

```
┌─────────────────────────────────────┐
│            SAFETY                   │  ← Non-negotiable
│     (Correctness, Integrity)        │
├─────────────────────────────────────┤
│          PERFORMANCE                │  ← Only after safety
│      (Speed, Efficiency)            │
├─────────────────────────────────────┤
│     DEVELOPER EXPERIENCE            │  ← Only after both
│    (Readability, Ergonomics)        │
└─────────────────────────────────────┘
```

**This hierarchy is absolute.** We never sacrifice safety for performance or convenience.

## Zero Technical Debt

> "You shall not pass!" — Gandalf

Problems are solved when discovered:

- **No TODOs in production code** — Fix it now or file an issue with a timeline
- **No "we'll handle that later"** — Handle it now or prove it can't happen
- **No silent failures** — Every error is handled explicitly or crashes with context
- **No "good enough"** — It either meets the specification or it doesn't ship

## The Two Questions

For every piece of code, ask:

1. **"What could go wrong?"** — Asked during design (proactive)
2. **"What's wrong?"** — Asked during debugging (reactive)

We prefer the first. Code is cheaper to change while it's hot.

## Simplicity and Elegance

> "Simplicity and elegance are unpopular because they require hard work and discipline to achieve" — Edsger Dijkstra

- Simplicity is not the first attempt but the **hardest revision**
- Simplicity is not a compromise — it's how we achieve all goals simultaneously
- The "super idea" solves safety, performance, AND experience together
- An hour of design is worth weeks in production

## NASA Power of Ten

Adapted from [Gerard J. Holzmann's rules](https://spinroot.com/gerard/pdf/P10.pdf):

### 1. Simple Control Flow

- Use only very simple, explicit control flow
- No recursion (or bounded with explicit depth limit)
- Minimal abstractions — every abstraction is a potential leak

### 2. Limits on Everything

- All loops have fixed upper bounds
- All queues have maximum sizes
- All allocations have limits
- If a loop cannot terminate (event loop), assert this explicitly

### 3. No Dynamic Allocation After Init

- Allocate all memory at startup
- No malloc/free in hot paths
- Predictable memory = predictable performance

### 4. Assertions Are Mandatory

- Minimum 2 assertions per function
- Assert pre-conditions (inputs)
- Assert post-conditions (outputs)
- Assert invariants (relationships)
- **Assertion density is a quality metric**

### 5. Declare at Smallest Scope

- Variables exist only where needed
- Fewer variables in scope = fewer mistakes
- Each variable has one purpose

### 6. Check All Return Values

- Every function call that can fail must be checked
- No ignored return values
- No silent error swallowing

### 7. Limit Pointer/Reference Use

- Minimize indirection
- Prefer values over references where possible
- Every reference is a potential null/undefined

### 8. Use Static Analysis

- Enable all compiler warnings
- Treat warnings as errors
- Use linters and type checkers

### 9. Limit Function Size

- 70 lines maximum per function
- If it doesn't fit on a screen, split it
- Art is born of constraints

### 10. Compiler Warnings at Maximum

- `-Wall -Werror` or equivalent
- No pragma to disable warnings
- Warnings exist for a reason

## Assertions: The Complete Guide

### Density Requirements

**Minimum: 2 assertions per function**

| Function Type | Required Assertions |
|---------------|---------------------|
| Pure function | Pre-condition + Post-condition |
| Mutation | Pre-condition + Invariant |
| Constructor | Invariant after construction |
| Getter | Invariant before return |

### Positive AND Negative Space

```typescript
// Positive space: what SHOULD happen
assert(balance >= 0, "balance must be non-negative");

// Negative space: what should NEVER happen
assert(!(role === 'admin' && !mfaEnabled), "admin without MFA forbidden");
```

**Why both?** Bugs hide at the boundary between valid and invalid states.

### Paired Assertions

Validate at both ends of data flow:

```typescript
// At write time
function save(data: Data): void {
  const checksum = computeChecksum(data);
  assert(verifyChecksum(data, checksum), "checksum invalid at write");
  storage.write(data, checksum);
}

// At read time
function load(): Data {
  const { data, checksum } = storage.read();
  assert(verifyChecksum(data, checksum), "checksum invalid at read");
  return data;
}
```

### Compile-Time Assertions

Check design invariants before runtime:

```typescript
// TypeScript
const _: never = null as never; // Exhaustiveness check

// Assert array length at compile time
type AssertLength<T extends any[], N extends number> = 
  T['length'] extends N ? T : never;
```

### The Golden Rule

> Assert the positive space you DO expect AND the negative space you DON'T expect

This catches bugs at the boundary where data moves between valid and invalid states.

## Deterministic Execution

### Everything Uses Seeds

```typescript
// BAD: Non-reproducible
const id = Math.random().toString(36);

// GOOD: Reproducible
const seed = parseInt(process.env.TEST_SEED || String(Date.now()));
console.log(`Seed: ${seed}`);
const rng = createSeededRandom(seed);
const id = rng.nextString(8);
```

### Print Seeds on Failure

Every test that uses randomness must print its seed:

```typescript
test('fuzz test', () => {
  const seed = getSeed();
  console.log(`Test seed: ${seed}`); // ALWAYS print
  
  try {
    runFuzzTest(seed);
  } catch (e) {
    console.error(`FAILED with seed: ${seed}`); // Print again on failure
    throw e;
  }
});
```

### Same Seed = Same Execution

```typescript
const rng1 = createSeededRandom(12345);
const rng2 = createSeededRandom(12345);

// These must be identical
rng1.next() === rng2.next(); // true
rng1.next() === rng2.next(); // true
```

## Error Handling Philosophy

### No Silent Failures

```typescript
// BAD: Silent
try {
  riskyOperation();
} catch (e) {
  console.log(e);
}

// GOOD: Explicit
try {
  riskyOperation();
} catch (e) {
  if (isRecoverable(e)) {
    return fallback();
  }
  throw new Error(`Operation failed: ${e.message}`, { cause: e });
}
```

### Fail Fast

Detect errors as early as possible:

```typescript
function process(input: unknown): Result {
  // Validate immediately
  assert(input !== null, "input cannot be null");
  assert(typeof input === 'object', "input must be object");
  assert('id' in input, "input must have id");
  
  // Now we know input is valid
  return doProcessing(input);
}
```

### Crash > Corruption

When in doubt, crash:

```typescript
if (invariantViolated) {
  // BAD: Try to continue
  console.error("Invariant violated, attempting recovery...");
  
  // GOOD: Crash immediately
  throw new Error("FATAL: Invariant violated - data may be corrupted");
}
```

## Time and Scheduling

### Don't React to External Events Directly

```typescript
// BAD: React to each event
socket.on('message', (msg) => {
  processImmediately(msg);
});

// GOOD: Batch at your own pace
socket.on('message', (msg) => {
  queue.push(msg);
});

setInterval(() => {
  const batch = queue.drain();
  processBatch(batch);
}, 100);
```

**Why?** You control the pace. You can batch. You can bound work per time period.

### Simulated Time for Testing

```typescript
interface Clock {
  now(): number;
  advance(ms: number): void; // Only in tests
}

// Production
const realClock: Clock = { now: () => Date.now(), advance: () => {} };

// Testing
class SimulatedClock implements Clock {
  private time = 0;
  now() { return this.time; }
  advance(ms: number) { this.time += ms; this.fireTimers(); }
}
```

## Summary: The Verification Mindset

1. **Prove, don't just test** — Tests show presence of bugs, not absence
2. **Determinism enables reproduction** — Same seed = same execution
3. **Assertions are specifications** — They document AND enforce
4. **Bounds prevent catastrophe** — Unbounded = unpredictable
5. **Fail fast, fail loud** — Silent failures become silent corruption
6. **Simplicity is the goal** — Not the starting point, the destination
7. **Safety first, always** — Never compromise for performance or convenience
