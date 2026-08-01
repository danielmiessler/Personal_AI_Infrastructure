---
name: Hardening
version: 1.0.6
description: "Hardens LifeOS tests via property/mutation testing. USE WHEN harden, hardening, property test, property based testing, PBT, fast-check, mutation test, mutation testing, Stryker, CRAP score, CRAP analysis, DRY scan, jscpd, acceptance test mutation, strengthen tests, sharpen ISCs, find bugs example tests miss, universal quantified claim, shrink counterexample, what bugs am I missing, test the tests, test of the test. NOT FOR writing new feature tests (use bun test directly), grading agent output quality (use Evals), UI verification with real Chrome (use Interceptor), finding security vulnerabilities, or building new functionality."
---

# Hardening Skill

## What It Does

Hardening sharpens what already exists — tests, ISCs, and code — without adding new functionality. Five workflows target test-surface and code-surface robustness: property-based testing via fast-check, mutation testing via Stryker, CRAP-complexity scoring, DRY duplication detection, and acceptance-test mutation that perturbs ISC text to catch fluff.

## The Problem

Example-based tests check a handful of inputs the author thought of, so the bugs that survive are the inputs the author didn't think of. A test suite can be green and still be weak. ISCs can read as crisp pass/fail and still be fluff that anything would satisfy. You can't see any of this by reading the tests — you need to test the tests. This skill mechanizes that: property tests express the universal claim and shrink failures to the minimal counterexample, mutation testing proves the suite catches injected bugs, and acceptance-test mutation proves each ISC actually constrains the work.

## How It Works

Hardening techniques sharpen what already exists — tests, ISCs, code. They don't add new functionality. Five workflows, all targeting test-surface and code-surface robustness.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| PropertyTest | property test, property based testing, PBT, fast-check, universal quantified claim, shrink counterexample — pure functions, parsers, serializers, data transforms, invariants | `Workflows/PropertyTest.md` |
| MutationTest | mutation test, mutation testing, Stryker, test the tests | — planned, not yet built (stub; see Status) |
| CrapAnalysis | CRAP score, CRAP analysis, risky undertested code | — planned, not yet built (stub; see Status) |
| DryAnalysis | DRY scan, jscpd, duplication rot | — planned, not yet built (stub; see Status) |
| AcceptanceTestMutation | acceptance test mutation, sharpen ISCs, detect fluff ISCs | — planned, not yet built (stub; see Status) |

## Doctrine

These workflows operate against the **existing** test surface. PropertyTest doesn't replace bun-test examples — properties express the universal claim, examples are sampled instances of it. MutationTest doesn't replace test authoring — it grades existing tests' robustness. CRAP and DRY don't add tests — they prioritize where to add them. Acceptance-test mutation doesn't add ISCs — it mechanizes the Fluff vs Load-bearing distinction from `ISAFormat.md`.

All five satisfy the same intent: **strengthen the test of the test, the test of the ISC, the test of the code.** The unifying frame is meta-test — testing the things that test the system.

## Status

| Workflow | State | Blocker |
|----------|-------|---------|
| **PropertyTest** | Fully scaffolded (v1.0) | None — ready to use |
| **MutationTest** | Stub | Stryker integration; deferred to v6.11.0 |
| **CrapAnalysis** | Stub | AST walker (oxc or `bun build --print-ir`) |
| **DryAnalysis** | Stub | jscpd wrapper |
| **AcceptanceTestMutation** | Stub | ISC text perturbation generator |

## Integration Points

- **Testing Doctrine Rule #11** — names fast-check as the property-testing primitive (`LIFEOS/DOCUMENTATION/Testing/TestingDoctrine.md`).
- **ISA format** — new `bun-property` ISC type with `property | generator | runs` columns (`LIFEOS/DOCUMENTATION/ISA/ISAFormat.md` § ISC Type Vocabulary).
- **Algorithm** — hardening is elected during VERIFY when a run's claims warrant property/mutation depth; spend is discovered from the work (the v6.10.0-era tier-gated proposal predates the 2026-07-11 tier retirement).
- **System prompt** — Verification Is the Mechanism section at top (`LIFEOS/LIFEOS_SYSTEM_PROMPT.md`).
- **BitterPillEngineering skill** — `AcceptanceTestMutation` is the mechanized form of BPE's "would a smarter model render this rule unnecessary" applied to ISCs.

## Gotchas

- fast-check shrinking is deterministic only when the seed is captured. **Always pin the seed in a comment when a property fails:** `// fc seed: 0xdeadbeef`.
- `numRuns: 1000` is the default budget. Increase to 10000 for invariant-critical properties; lower to 100 for slow generators (custom record types with large constraints).
- Property tests spuriously fail with poorly-constrained generators. Constrain integer ranges, string lengths, and record nesting depth explicitly.
- Properties on impure functions (functions that touch disk, network, clock) are wrong — fast-check generates random inputs but the property must be deterministic given the input. Either mock side effects or extract the pure core.
- Generator over-constraint hides bugs (`fc.integer({min: 0, max: 100})` for code that handles all integers). Constrain only what the function actually demands.
- Generator under-constraint produces invalid inputs (`fc.string()` when the function only accepts ASCII). The property must hold across the function's actual valid input domain, no wider.

## Examples

- "Property-test the slug parser" → PropertyTest: express round-trip/idempotence claims as fast-check properties, run 1000 random inputs, pin the seed on any failure.
- "What bugs are my example tests missing?" → PropertyTest candidate detection: scan for pure functions (parsers, serializers, transforms) with only example coverage.
- "Mutation-test the hooks suite" → MutationTest is a stub (see Status) — not runnable yet; don't promise kill-rate numbers.
