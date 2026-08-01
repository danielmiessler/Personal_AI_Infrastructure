# PropertyTest Workflow

Voice notification (run first):

```bash
curl -sk -X POST http://localhost:31337/notify -H "Content-Type: application/json" \
  -d '{"message": "Hardening: PropertyTest workflow active", "voice_enabled": true}'
```

## Purpose

Identify candidates for property-based testing, name the properties formally, write them in fast-check, run them, and either land them as `bun-property` ISCs in the ISA's Test Strategy or capture shrunk counterexamples that become new example-based regression tests.

This workflow is the mechanized form of "every detail load-bearing" — fast-check's shrinker strips counterexamples down to the minimal failing input, which is exactly what Deutsch's hard-to-variability looks like in code.

## When to use

- Pure function — no side effects, deterministic output given input.
- Parser ↔ serializer pair — round-trip candidate.
- Data transform — sort, dedup, normalize. Idempotency candidate.
- Math or accumulator — commutativity / associativity candidates.
- Collection operation — conservation invariant candidate (count, sum, set-membership preserved).
- Two implementations of the same thing — model-based oracle candidate.
- State machine with legal-sequence invariants.

If none apply, skip property testing — use `bun-test` example form for the ISC.

## The ten property categories

| # | Category | Form | LifeOS-shaped example |
|---|----------|------|--------------------|
| 1 | **Round-trip** | `decode(encode(x)) === x` | `parseFrontmatter(serializeFrontmatter(x)) ≡ x` |
| 2 | **Idempotency** | `f(f(x)) === f(x)` | `removeTrailingNewline(removeTrailingNewline(s)) ≡ removeTrailingNewline(s)` |
| 3 | **Commutativity** | `f(a, b) === f(b, a)` | `mergeTaskLists(a, b) ≡ mergeTaskLists(b, a)` |
| 4 | **Associativity** | `f(f(a, b), c) === f(a, f(b, c))` | config merge across three layers |
| 5 | **Identity** | `f(x, identity) === x` | `renderTemplate(t, {}) ≡ t` |
| 6 | **Conservation** | invariants preserved | `iscIdsAfter(reconcile(master, eph)) ⊇ iscIdsBefore(master)` |
| 7 | **Model-based** | code matches trivial reference impl | `parseFrontmatter ≡ jsYaml.load + body-split` |
| 8 | **Metamorphic** | "if input grows, output should grow" | density-score is monotone in evidence count |
| 9 | **State-machine** | any legal sequence preserves invariants | ISA phase machine never goes backward except via Resume |
| 10 | **Oracle** | result matches trusted alternative | a classifier vs a deterministic rule table |

## Candidate detection — ten questions

For a function `f: A → B`:

1. **Is `f` pure?** If no, stop. Properties require determinism.
2. **Is there a paired function `g: B → A`?** Round-trip candidate (cat 1).
3. **Does `f` normalize / canonicalize?** Idempotency candidate (cat 2).
4. **Does `f` take ≥2 same-typed args?** Commutativity (cat 3) and associativity (cat 4) candidates.
5. **Does `f` have a no-op-like argument?** Identity candidate (cat 5).
6. **Does `f` preserve a measurable invariant?** Conservation candidate (cat 6).
7. **Is there a simpler reference impl?** Model-based candidate (cat 7).
8. **Does `f` have ordering / monotonicity semantics?** Metamorphic candidate (cat 8).
9. **Is `f` part of a state machine?** State-machine candidate (cat 9).
10. **Does an alternative implementation exist?** Oracle candidate (cat 10).

## Procedure

1. **Identify candidate** — apply the ten questions to the function under test. Often two or three categories apply; pick the strongest.
2. **Name the property** — write the universal claim in prose: "for all X, P(X) holds."
3. **Choose generator** — `fc.integer`, `fc.string`, `fc.array`, `fc.record`, etc., with constraints reflecting the function's actual input domain.
4. **Set numRuns budget** — 1000 default. 10000 for invariant-critical. 100 for slow generators.
5. **Write the test** — `fc.assert(fc.property(gen, pred), { numRuns })`.
6. **Run** — `bun test test/.../foo.property.test.ts`.
7. **If failing** — capture the shrunk counterexample and the seed. Either fix the code (counterexample reveals a bug) or fix the property (counterexample reveals the property was wrong).
8. **Pin the seed** — when a counterexample becomes a regression test, copy it as an example test with `// fc seed: 0x...` in a comment.
9. **Add the ISC row** — in the ISA's `## Test Strategy` table, add a `bun-property` row pointing at the test file.

## Integration with fast-check

```ts
import { test, expect } from "bun:test";
import * as fc from "fast-check";
import { parseFrontmatter, serializeFrontmatter } from "../../../hooks/lib/isa-utils";

test("frontmatter round-trips through parse → serialize", () => {
  fc.assert(
    fc.property(
      fc.record({
        task: fc.string({ minLength: 1, maxLength: 60 }),
        slug: fc.stringMatching(/^[a-z0-9-]+$/),
        effort: fc.constantFrom("standard", "extended", "advanced", "deep", "comprehensive"),
        phase: fc.constantFrom("observe", "think", "plan", "build", "execute", "verify", "learn", "complete"),
      }),
      (fm) => {
        const serialized = serializeFrontmatter(fm);
        const reparsed = parseFrontmatter(serialized);
        expect(reparsed).toEqual(fm);
      },
    ),
    { numRuns: 1000 },
  );
});
```

## ISA `## Test Strategy` row shape

```
| isc      | anchors_to | type          | property                                    | generator                              | runs  | tool |
| ISC-N    | literal    | bun-property  | parse(serialize(x)) ≡ x                     | fc.record({...isa frontmatter schema}) | 1000  | bun test test/hooks/lib/isa-utils.property.test.ts -t "frontmatter round-trips" |
```

## Output format

A successful PropertyTest landing adds:

1. **One new test file** at `test/<surface>/<name>.property.test.ts`.
2. **One new `bun-property` row** in the ISA's `## Test Strategy`.
3. **If counterexamples were found and fixed**: one new entry in `## Changelog` with C/R/L format (`conjectured` = property as written, `refuted by` = shrunk counterexample, `learned` = missing case, `criterion now` = the tightened property).
4. **If counterexamples became regression examples**: one new `bun-test` row paired with the property row, with the seed pinned in a code comment.

## Gotchas

- **Generator over-constraint** hides bugs. Use full domain unless the function explicitly forbids inputs.
- **Generator under-constraint** produces invalid inputs and spurious failures. Constrain to the actual valid domain, no wider.
- **Non-deterministic functions** are unfit for property testing unless side effects are mocked or the pure core is extracted.
- **Shrinker convergence** — fast-check shrinks until removing any byte makes the test pass again. That output is the regression seed.
- **Cherry-picked counterexamples** — when shrinking returns `""` or `0` or `[]`, that's the classic "empty case missed" finding. Always check the empty case.

## Cross-references

- Testing Doctrine Rule #11 — fast-check as approved primitive (`LIFEOS/DOCUMENTATION/Testing/TestingDoctrine.md`)
- ISAFormat.md ISC Type Vocabulary — `bun-property` schema (`LIFEOS/DOCUMENTATION/ISA/ISAFormat.md`)
- Algorithm v6.10.0 candidate — VERIFY hardening gate, PropertyAudit capability (`LIFEOS/ALGORITHM/v6.10.0.md`)
- fast-check documentation — <https://fast-check.dev/>
- John Hughes original QuickCheck paper — <https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf>
