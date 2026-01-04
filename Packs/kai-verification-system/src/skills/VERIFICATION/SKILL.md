# VERIFICATION Skill

> Verification-first engineering with deterministic simulation testing, exhaustive fault injection, and tiered verification based on system complexity

## Triggers

Activate this skill when the user:

- Asks to **review code** for correctness, safety, or quality
- Asks to **write tests** or **create test cases**
- Asks to **audit** code for bugs, vulnerabilities, or issues
- Mentions **assertions**, **invariants**, **pre-conditions**, or **post-conditions**
- Asks about **bounds**, **limits**, or **unbounded** resources
- Asks to **simulate** failures, **fuzz** inputs, or **inject faults**
- Mentions **deterministic testing** or **reproducibility**
- Asks about **time compression** or **simulation testing**
- Uses words like **verify**, **prove**, **correctness**, **safety-critical**
- Asks "what could go wrong" or "how can this fail"

## Workflows

### Tier Selection

First, determine the appropriate verification tier based on the system:

| System Type | Tier | Workflow |
|-------------|------|----------|
| Any code (functions, modules, libraries) | 1 | `tier-1-universal.md` |
| Stateful systems (APIs, caches, state machines) | 2 | `tier-2-stateful.md` |
| Distributed systems (microservices, queues, multi-node) | 3 | `tier-3-distributed.md` |
| Storage/database systems (persistence, replication) | 4 | `tier-4-storage.md` |

**Ask the user if unclear:** "What type of system is this? I'll apply the appropriate verification tier."

### Available Workflows

| Workflow | When to Use |
|----------|-------------|
| [tier-1-universal.md](Workflows/tier-1-universal.md) | All code — assertions, bounds, exhaustive input, error handling |
| [tier-2-stateful.md](Workflows/tier-2-stateful.md) | Stateful systems — adds time simulation, state transitions, invariants |
| [tier-3-distributed.md](Workflows/tier-3-distributed.md) | Distributed systems — adds network faults, crash recovery, convergence |
| [tier-4-storage.md](Workflows/tier-4-storage.md) | Storage systems — adds disk faults, corruption, linearizability |

## Core Principles

### Hierarchy (Non-Negotiable)

```
SAFETY > PERFORMANCE > DEVELOPER EXPERIENCE
```

### Zero Technical Debt

Problems are solved when discovered. No "we'll fix it later."

### Assertion Density

**Minimum 2 assertions per function:**
- Pre-conditions (validate inputs)
- Post-conditions (validate outputs)
- Invariants (validate relationships)

### Positive AND Negative Space

Assert what SHOULD happen AND what should NEVER happen:

```typescript
// Positive space
assert(balance >= 0, "balance must be non-negative");

// Negative space  
assert(!(isAdmin && !hasMFA), "admin without MFA is forbidden");
```

### Deterministic Seeds

All randomness must be seeded and reproducible:

```typescript
const seed = process.env.TEST_SEED || Date.now();
console.log(`Seed: ${seed}`);  // Always print for reproduction
const rng = createSeededRandom(seed);
```

### Bounds on Everything

All loops, queues, and resources have explicit limits:

```typescript
const MAX_ITERATIONS = 10_000;
let i = 0;
while (condition) {
  assert(i++ < MAX_ITERATIONS, "iteration bound exceeded");
  // ...
}
```

## Context Files

Load these for detailed guidance:

- `context/verification/verification-principles.md` — Core philosophy
- `context/verification/assertion-patterns.md` — Language-specific patterns
- `context/verification/simulation-patterns.md` — DST implementation
- `context/verification/checklist-templates.md` — Review checklists

## Tools

Available analysis tools:

```bash
# Check assertion density
bun $PAI_DIR/tools/verification/assertion-density.ts <file-or-directory>

# Find unbounded loops/queues
bun $PAI_DIR/tools/verification/bounds-checker.ts <file-or-directory>

# Run time-compressed simulation
bun $PAI_DIR/tools/verification/simulation-harness.ts <test-file>
```

## Example Interactions

### Code Review Request

**User:** "Review this function for correctness"

**Response pattern:**
1. Identify system type → select tier
2. Apply tier-appropriate workflow
3. Check assertion density
4. Check bounds on all loops/queues
5. Verify error handling (no silent failures)
6. Identify missing invariants
7. Suggest specific improvements with code

### Test Writing Request

**User:** "Write tests for this module"

**Response pattern:**
1. Identify system type → select tier
2. Generate exhaustive input test cases:
   - Valid inputs (happy path)
   - Invalid inputs (rejection verification)
   - Boundary inputs (edge cases)
3. Add deterministic seeds for any randomness
4. Include invariant checks after each operation
5. Add negative space assertions

### Audit Request

**User:** "Audit this codebase for issues"

**Response pattern:**
1. Run assertion density analysis
2. Run bounds checker
3. Identify silent error handling
4. Check for non-deterministic code
5. Report findings with severity and fixes
