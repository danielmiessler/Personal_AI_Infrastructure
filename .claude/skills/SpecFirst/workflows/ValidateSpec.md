# ValidateSpec Workflow

**Purpose:** Validate that implementation matches specifications. Run tests, check compliance, ensure quality gates pass.

---

## The 4-Layer Test Pyramid

```
                    ┌─────────────────┐
                    │   ACCEPTANCE    │  ← User outcomes (slow, few)
                    │    (Layer 4)    │
                ┌───┴─────────────────┴───┐
                │         CLI            │  ← Command contracts (medium)
                │       (Layer 3)        │
            ┌───┴─────────────────────────┴───┐
            │         INTEGRATION            │  ← Component interaction
            │           (Layer 2)            │
        ┌───┴─────────────────────────────────┴───┐
        │              UNIT                      │  ← Function behavior (fast, many)
        │            (Layer 1)                   │
        └─────────────────────────────────────────┘
```

| Layer | What It Tests | Speed | Quantity |
|-------|---------------|-------|----------|
| **Unit** | Individual functions | Fast | Many |
| **Integration** | Components working together | Medium | Some |
| **CLI** | Command-line contracts | Medium | Some |
| **Acceptance** | End-to-end user outcomes | Slow | Few |

---

## Running Validation

### Quick Validation (Development)

```bash
# Run unit tests only (fast feedback)
bun test unit

# Run specific test
bun test --grep "TEST-CLI-014"
```

### Full Validation (Pre-Release)

```bash
# Run all test layers
bun test all

# Or layer by layer
bun test unit        # ~seconds
bun test integration # ~minutes
bun test cli         # ~minutes
bun test acceptance  # ~minutes
```

---

## Spec → Test Traceability

Every requirement should map to a test:

```
SPECIFICATION                         TEST
────────────────────────────────────────────────────────────────
### Requirement: --name flag    →    TEST-CLI-014
  #### Scenario: CLI usage      →    command: ingest direct --name "X"
  - THEN filename SHALL use     →    expected.contains: ["[name:X]"]
```

### Test Naming Convention

```
TEST-[LAYER]-[NUMBER]: [Description]

Examples:
- TEST-UNIT-001: extractMetadata parses tags
- TEST-INT-005: processMessage creates vault file
- TEST-CLI-014: --name flag overrides filename
- TEST-ACC-001: Full ingest workflow creates note
```

---

## Validation Checklist

### Before Marking Complete

- [ ] All tests pass
- [ ] New features have tests
- [ ] Test coverage adequate for the change
- [ ] No skipped tests without reason

### Spec Compliance

For each requirement in the proposal:

| Requirement | Test | Status |
|-------------|------|--------|
| Filename override | TEST-CLI-014 | PASS |
| Short flag -n | TEST-CLI-014a | PASS |
| Combined flags | TEST-CLI-022 | PASS |

---

## Test File Structure

### Separating Framework from Specs

```
pai-tooling/                      ← Test infrastructure repo
├── framework/                    ← PUBLIC: Reusable runners
│   ├── cli-runner.ts
│   ├── integration-runner.ts
│   └── types.ts
├── [skill]-test/
│   ├── specs/                    ← PUBLIC: Test definitions
│   │   ├── cli-direct.spec.ts
│   │   └── scope.spec.ts
│   ├── fixtures/                 ← PRIVATE: Test data (gitignored)
│   └── output/                   ← Test results
└── config/                       ← PRIVATE: Personal config (gitignored)
```

### What's Sensitive?

| Component | Sensitive? | Recommendation |
|-----------|------------|----------------|
| `framework/` | No | Public npm package |
| `specs/` | No | Part of contribution |
| `fixtures/` | Should be No | Use synthetic data |
| `config/` | Yes | `.env` file only |

---

## Writing Test Specs

### CLI Test Example

```typescript
// specs/cli-direct.spec.ts
export const directCLITestSpecs: CLITestSpec[] = [
  {
    id: "TEST-CLI-014",
    name: "Direct with --name flag",
    description: "Verify --name flag adds [name:...] metadata",
    command: 'echo "test" | bun run ingest.ts direct --name "Custom" --dry-run',
    expected: {
      contains: ["[name:Custom]", "DRY RUN"],
      exitCode: 0,
    },
  },
];
```

### Unit Test Example

```typescript
// unit/extractMetadata.test.ts
import { describe, it, expect } from "bun:test";
import { extractMetadata } from "../lib/process";

describe("extractMetadata", () => {
  it("extracts name from caption", () => {
    const result = extractMetadata("[name:Custom] Some content");
    expect(result.name).toBe("Custom");
  });
});
```

---

## Handling Test Failures

### Failure During Development

1. Read the failure message
2. Check if spec changed (update test) or bug (fix code)
3. Fix and re-run

### Failure Pre-Release

**DO NOT release with failing tests.**

Options:
- Fix the issue
- Remove the feature (and its test)
- Document known issue and skip test (last resort)

---

## LLM-Judge Evaluation (Advanced)

For subjective quality checks, use LLM evaluation:

```typescript
// framework/llm-judge.ts
export async function evaluateOutput(
  output: string,
  criteria: string[]
): Promise<JudgeResult> {
  // Use Claude to evaluate output against criteria
  // Returns: pass/fail with reasoning
}
```

**Use cases:**
- "Does this note have good formatting?"
- "Is the title descriptive?"
- "Does the content match the intent?"

---

## Related Workflows

- **ProposeChange.md** - Define specs before testing
- **Release.md** - Run validation before release
- **DevelopSkill.md** - Set up test infrastructure
