# Verification Checklists

> Ready-to-use checklists for design review, code review, and pre-commit

## Design Review Checklist

Use before writing any code:

### Problem Definition
- [ ] Problem is clearly stated
- [ ] Success criteria are defined and measurable
- [ ] Failure modes are identified

### Architecture
- [ ] System type identified (stateless/stateful/distributed/storage)
- [ ] Appropriate verification tier selected
- [ ] All components have defined interfaces
- [ ] Data flow is documented
- [ ] State transitions are documented (if stateful)

### Safety Analysis
- [ ] All failure modes listed
- [ ] Recovery strategy for each failure mode
- [ ] No single points of failure (or explicitly accepted)
- [ ] Resource limits defined (memory, CPU, connections, queue sizes)

### Invariants
- [ ] All invariants identified and documented
- [ ] Invariants can be checked programmatically
- [ ] Conservation properties identified (what must be preserved)
- [ ] Mutual exclusion properties identified (what cannot coexist)

### Testing Strategy
- [ ] Test categories defined (unit, integration, simulation)
- [ ] Failure injection points identified
- [ ] Time-dependent behavior testing planned
- [ ] Randomized testing approach defined

### Dependencies
- [ ] All external dependencies listed
- [ ] Failure modes of dependencies analyzed
- [ ] Fallback strategies for dependency failures
- [ ] No unnecessary dependencies

---

## Code Review Checklist

### Assertion Density
- [ ] Every function has ≥2 assertions
- [ ] Pre-conditions validate all inputs
- [ ] Post-conditions validate outputs
- [ ] Invariants are checked after mutations

### Positive and Negative Space
- [ ] Positive assertions: what SHOULD happen
- [ ] Negative assertions: what should NEVER happen
- [ ] Boundary conditions covered

### Bounds and Limits
- [ ] All loops have explicit upper bounds
- [ ] All queues have size limits
- [ ] All recursion has depth limits
- [ ] All allocations have limits
- [ ] Bounds are asserted, not just documented

### Error Handling
- [ ] No silent failures (empty catch blocks)
- [ ] All errors are handled or propagated
- [ ] Error messages include context
- [ ] Error types are specific, not generic

### Determinism
- [ ] All randomness uses seeded PRNG
- [ ] Seeds are printed/logged for reproduction
- [ ] No hidden sources of non-determinism
- [ ] Time-dependent code uses injectable clock

### Control Flow
- [ ] No complex nested conditionals
- [ ] Switch/match is exhaustive
- [ ] Early returns for error cases
- [ ] Happy path is clear

### Data Validation
- [ ] External input is validated at boundary
- [ ] Type assertions for runtime type safety
- [ ] Range checks for numeric values
- [ ] Length checks for strings/arrays

### Resource Management
- [ ] Resources are released in all paths
- [ ] Cleanup happens in finally/defer
- [ ] Timeouts on all external calls
- [ ] Connection pooling where appropriate

---

## Pre-Commit Checklist

Quick checks before every commit:

### Code Quality
- [ ] Code compiles without warnings
- [ ] Linter passes
- [ ] Type checker passes
- [ ] Formatter applied

### Tests
- [ ] All tests pass
- [ ] New code has tests
- [ ] Test coverage maintained or improved
- [ ] No skipped/disabled tests without issue reference

### Assertions
- [ ] New functions have ≥2 assertions
- [ ] No assertions removed without justification
- [ ] Assertion messages are descriptive

### Documentation
- [ ] Public APIs documented
- [ ] Non-obvious code commented
- [ ] README updated if needed

### Security
- [ ] No secrets in code
- [ ] No hardcoded credentials
- [ ] Input validation present
- [ ] No SQL/command injection vectors

---

## Pull Request Checklist

### Description
- [ ] PR description explains what and why
- [ ] Related issues linked
- [ ] Breaking changes documented
- [ ] Migration steps documented (if needed)

### Code Review
- [ ] Self-reviewed the diff
- [ ] All code review checklist items pass
- [ ] Complex changes have explanatory comments

### Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] Manual testing performed
- [ ] Edge cases tested

### Performance
- [ ] No obvious performance regressions
- [ ] Benchmarks run (if applicable)
- [ ] Resource usage acceptable

### Rollback
- [ ] Rollback plan exists
- [ ] Feature flag available (if risky change)
- [ ] Database migrations are reversible

---

## Incident Response Checklist

When a bug is found in production:

### Immediate
- [ ] Issue documented with reproduction steps
- [ ] Severity assessed
- [ ] Stakeholders notified

### Investigation
- [ ] Root cause identified
- [ ] Failing assertion identified (or added)
- [ ] Timeline of events reconstructed

### Fix
- [ ] Fix addresses root cause, not symptoms
- [ ] Test added that would have caught this
- [ ] Assertion added at failure point
- [ ] Similar code reviewed for same issue

### Prevention
- [ ] Why wasn't this caught in testing?
- [ ] Can we add simulation testing for this?
- [ ] Are there similar failure modes to test?
- [ ] Documentation updated

---

## Tier-Specific Checklists

### Tier 1: All Code

```markdown
## Tier 1 Verification Complete

- [ ] Assertion density ≥2 per function
- [ ] Pre-conditions validate inputs
- [ ] Post-conditions validate outputs
- [ ] Positive space asserted
- [ ] Negative space asserted
- [ ] All loops bounded
- [ ] All queues bounded
- [ ] All recursion bounded
- [ ] No silent errors
- [ ] All errors handled explicitly
- [ ] Valid input tests
- [ ] Invalid input tests
- [ ] Boundary input tests
- [ ] All randomness seeded
```

### Tier 2: Stateful Systems

```markdown
## Tier 2 Verification Complete

- [ ] All Tier 1 items ✓
- [ ] All valid state transitions tested
- [ ] All invalid state transitions rejected
- [ ] Invariants defined
- [ ] Invariants checked after every mutation
- [ ] Time-dependent behavior uses simulated clock
- [ ] TTL/expiration tested with time compression
- [ ] Operation sequences tested
- [ ] Interleaved operations tested
- [ ] Snapshot/restore tested (if applicable)
```

### Tier 3: Distributed Systems

```markdown
## Tier 3 Verification Complete

- [ ] All Tier 1 + Tier 2 items ✓
- [ ] Network latency injection tested
- [ ] Packet loss tested
- [ ] Packet reordering tested
- [ ] Network partition tested
- [ ] Asymmetric partition tested
- [ ] Single node crash tested
- [ ] Multiple node crash tested
- [ ] Crash/restart cycles tested
- [ ] Eventual consistency verified
- [ ] Causal ordering verified (if applicable)
- [ ] Combined fault chaos testing
- [ ] All tests use deterministic seeds
```

### Tier 4: Storage Systems

```markdown
## Tier 4 Verification Complete

- [ ] All Tier 1 + Tier 2 + Tier 3 items ✓
- [ ] Read errors handled
- [ ] Write errors handled
- [ ] Partial/torn writes handled
- [ ] Power loss recovery tested
- [ ] Bit rot detected (checksums)
- [ ] Checksums at write AND read
- [ ] WAL replay tested (if applicable)
- [ ] WAL idempotency verified
- [ ] Linearizability verified
- [ ] Full simulation passing
- [ ] Time compression targets met
```

---

## Quick Reference Card

### Assertion Minimums
| Element | Minimum |
|---------|---------|
| Function | 2 assertions |
| Loop | 1 bound assertion |
| Queue | 1 size assertion |
| State mutation | 1 invariant check |

### Test Coverage
| Input Type | Coverage |
|------------|----------|
| Valid | Happy path |
| Invalid | Rejection |
| Boundary | Edge cases |
| Sequence | Operations in order |
| Random | Seeded fuzzing |

### Time Compression
| Real Time | Simulated |
|-----------|-----------|
| 1 second | 1 hour |
| 1 minute | 1 month |
| 1 hour | 2 years |

### Fault Injection
| Tier | Faults |
|------|--------|
| 1 | None |
| 2 | Time |
| 3 | + Network, Process |
| 4 | + Disk |
