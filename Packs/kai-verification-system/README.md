---
name: Kai Verification System
pack-id: copyleftdev-kai-verification-system-core-v1.0.0
version: 1.0.0
author: copyleftdev
description: Verification-first engineering system with deterministic simulation testing, time compression, exhaustive fault injection, and tiered verification based on system complexity
type: skill
purpose-type: [security, development, automation, analysis]
platform: agnostic
dependencies: []
keywords: [verification, testing, simulation, deterministic, time-compression, assertions, fault-injection, exhaustive, invariants, fuzzing, correctness, safety]
---

<p align="center">
  <img src="../icons/kai-verification-system.png" alt="Kai Verification System" width="256">
</p>

# Kai Verification System (kai-verification-system)

> Verification-first engineering with deterministic simulation testing, time compression, and exhaustive fault injection — proving correctness, not just checking it works

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill definition | `src/skills/VERIFICATION/SKILL.md` | Routing and invocation triggers |
| Tier 1 workflow | `src/skills/VERIFICATION/Workflows/tier-1-universal.md` | All code: assertions, bounds, exhaustive input |
| Tier 2 workflow | `src/skills/VERIFICATION/Workflows/tier-2-stateful.md` | Stateful systems: + time simulation |
| Tier 3 workflow | `src/skills/VERIFICATION/Workflows/tier-3-distributed.md` | Distributed: + network fault injection |
| Tier 4 workflow | `src/skills/VERIFICATION/Workflows/tier-4-storage.md` | Storage systems: + disk fault simulation |
| Principles context | `src/context/verification-principles.md` | Core philosophy reference |
| Assertion patterns | `src/context/assertion-patterns.md` | Language-specific assertion templates |
| Simulation patterns | `src/context/simulation-patterns.md` | DST implementation patterns |
| Checklists | `src/context/checklist-templates.md` | Pre-commit, PR review, design review |
| Assertion density tool | `src/tools/assertion-density.ts` | Analyze assertion count per function |
| Bounds checker tool | `src/tools/bounds-checker.ts` | Find unbounded loops/queues |
| Simulation harness | `src/tools/simulation-harness.ts` | Time compression test runner |
| Simulation library | `src/lib/deterministic-random.ts` | Seeded PRNG for reproducible tests |

**Summary:**
- **Workflows:** 4 (tiered by system complexity)
- **Context files:** 4 (principles, patterns, checklists)
- **Tools:** 3 (analysis and simulation)
- **Dependencies:** None (standalone skill pack)

## The Problem

Most testing approaches verify that code works in the common case. They don't prove correctness:

- **Tests pass, bugs ship** — Happy path coverage misses edge cases
- **Flaky tests** — Non-deterministic failures that can't be reproduced
- **Missing invariants** — No assertions on what should NEVER happen
- **Unbounded resources** — Loops, queues, allocations without limits
- **Time-dependent bugs** — Race conditions, timeouts that only manifest over days/weeks
- **Silent failures** — Errors swallowed, logged but not handled

The result: bugs discovered in production, not in development.

## The Solution

A **verification-first** approach inspired by safety-critical engineering practices:

### Core Philosophy

```
SAFETY > PERFORMANCE > DEVELOPER EXPERIENCE
```

This hierarchy is non-negotiable. We don't ship fast code that might corrupt data.

### The Three Pillars

#### 1. Prove, Don't Just Test

| Traditional Testing | Verification-First |
|---------------------|-------------------|
| "Does it work?" | "Can it ever fail?" |
| Happy path coverage | Exhaustive input space |
| Mock dependencies | Simulate real failures |
| Random test order | Deterministic reproduction |

#### 2. Deterministic Simulation

- **Seeded randomness** — Every random choice uses a seed, printed on failure
- **Simulated time** — Compress hours/days/years into seconds
- **Reproducible failures** — Same seed = exact same execution path
- **Fault injection** — Systematically explore failure modes

#### 3. Assertions as Specification

- **Minimum 2 assertions per function** — Pre-conditions, post-conditions, invariants
- **Positive AND negative space** — Assert what SHOULD happen AND what should NEVER happen
- **Compile-time assertions** — Catch design violations before runtime
- **Paired assertions** — Validate at write AND at read

### Tiered Verification

Not all code needs disk corruption simulation. The system applies appropriate rigor:

| Tier | Applies To | What It Adds |
|------|------------|--------------|
| **Tier 1** | All code | Assertions, bounds, exhaustive input, error handling |
| **Tier 2** | Stateful systems | + Simulated time, state transition testing, invariant checking |
| **Tier 3** | Distributed systems | + Network fault injection, crash simulation, convergence testing |
| **Tier 4** | Storage/databases | + Disk fault injection, linearizability, full DST |

## Architecture

```
$PAI_DIR/
└── skills/
    └── VERIFICATION/
        ├── SKILL.md                           # Skill routing
        └── Workflows/
            ├── tier-1-universal.md            # All code
            ├── tier-2-stateful.md             # + time simulation
            ├── tier-3-distributed.md          # + network faults
            └── tier-4-storage.md              # + disk faults

$PAI_DIR/
└── context/
    └── verification/
        ├── verification-principles.md         # Core philosophy
        ├── assertion-patterns.md              # By language
        ├── simulation-patterns.md             # DST patterns
        └── checklist-templates.md             # Review checklists

$PAI_DIR/
└── tools/
    └── verification/
        ├── assertion-density.ts               # Analysis tool
        ├── bounds-checker.ts                  # Unbounded detection
        └── simulation-harness.ts              # Time compression runner

$PAI_DIR/
└── lib/
    └── deterministic-random.ts                # Seeded PRNG
```

## Invocation

The verification skill activates when you:

- Ask to **review code for correctness**
- Ask to **write tests** for any system
- Ask to **audit** code quality
- Ask about **assertions**, **invariants**, or **bounds**
- Ask to **simulate** failures or **fuzz** inputs
- Mention **deterministic testing** or **reproducibility**

### Example Prompts

```
"Review this function for correctness — use verification-first principles"

"Write exhaustive tests for this state machine"

"Audit this codebase for unbounded loops and missing error handling"

"Set up deterministic simulation testing for this API"

"What tier of verification does this distributed cache need?"
```

## Key Concepts

### Assertion Density

**Minimum: 2 assertions per function**

```typescript
function transfer(from: Account, to: Account, amount: number): void {
  // Pre-conditions (assert inputs)
  assert(amount > 0, "amount must be positive");
  assert(from.balance >= amount, "insufficient funds");
  
  // Invariant (assert relationships)
  const totalBefore = from.balance + to.balance;
  
  // Operation
  from.balance -= amount;
  to.balance += amount;
  
  // Post-condition (assert results)
  assert(from.balance >= 0, "balance cannot go negative");
  
  // Invariant preserved
  assert(from.balance + to.balance === totalBefore, "money conservation violated");
}
```

### Positive AND Negative Space

```typescript
// Positive: what SHOULD happen
assert(user.isAuthenticated === true, "user should be authenticated");

// Negative: what should NEVER happen  
assert(user.role !== "admin" || user.mfaVerified, "admin without MFA is forbidden");
```

### Deterministic Seeds

```typescript
// BAD: Non-reproducible
const value = Math.random();

// GOOD: Reproducible
const seed = process.env.TEST_SEED || Date.now();
console.log(`Using seed: ${seed}`); // Always print on failure
const rng = createSeededRandom(seed);
const value = rng.next();
```

### Bounds on Everything

```typescript
// BAD: Unbounded
while (queue.hasItems()) {
  process(queue.pop());
}

// GOOD: Bounded with assertion
const MAX_ITERATIONS = 10_000;
let iterations = 0;
while (queue.hasItems()) {
  assert(iterations++ < MAX_ITERATIONS, "loop bound exceeded");
  process(queue.pop());
}
```

### Time Compression

```typescript
// Simulated clock for testing timeouts
class SimulatedClock {
  private currentTime = 0;
  
  now(): number { return this.currentTime; }
  
  advance(ms: number): void {
    this.currentTime += ms;
    this.fireTimers();
  }
  
  // Compress 1 year into 1 second
  advanceYears(years: number): void {
    this.advance(years * 365 * 24 * 60 * 60 * 1000);
  }
}
```

## Design Goals Hierarchy

Borrowed from safety-critical systems engineering:

### 1. Safety (Correctness)
- Code does what it claims
- Invariants are never violated
- Errors are never silent
- Data is never corrupted

### 2. Performance
- Only after safety is proven
- Measured, not assumed
- Bounds are explicit

### 3. Developer Experience
- Only after safety and performance
- Clarity over cleverness
- Explicit over implicit

## Zero Technical Debt Policy

> "You shall not pass!" — Gandalf

Problems are solved when discovered:
- **No TODOs in production code** — Fix it or file an issue
- **No "we'll handle that later"** — Handle it now or assert it can't happen
- **No silent failures** — Every error is handled or crashes explicitly

## Credits

Inspired by:
- **FoundationDB** — Pioneered deterministic simulation testing
- **TigerBeetle** — Demonstrated DST at scale with VOPR
- **NASA Power of Ten** — Safety-critical coding rules
- **Jepsen** — Distributed systems correctness testing

## Related Work

- [Deterministic Simulation Testing](https://www.youtube.com/watch?v=4fFDFbi3toc) — FoundationDB talk
- [NASA Power of Ten Rules](https://spinroot.com/gerard/pdf/P10.pdf) — Gerard J. Holzmann
- [Simple Testing Can Prevent Most Critical Failures](https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-yuan.pdf) — Yuan et al.

## Works Well With

- **kai-core-install** — Foundation skill system
- **kai-history-system** — Capture verification decisions and learnings
- **kai-prompting-skill** — Generate verification-focused prompts

## Changelog

### 1.0.0 - 2026-01-04
- Initial release
- Four-tier verification system
- Deterministic simulation patterns
- Assertion density tooling
- Time compression harness
