# Test Pyramid

**The 4-layer testing approach for PAI skills and tools.**

---

## Overview

```
                    ┌─────────────────┐
                    │   ACCEPTANCE    │  Layer 4: User outcomes
                    │   (E2E tests)   │  Slow, few tests
                ┌───┴─────────────────┴───┐
                │         CLI            │  Layer 3: Command contracts
                │   (Command tests)      │  Medium speed
            ┌───┴─────────────────────────┴───┐
            │       INTEGRATION              │  Layer 2: Component interaction
            │   (Component tests)            │  Medium speed
        ┌───┴─────────────────────────────────┴───┐
        │              UNIT                      │  Layer 1: Function behavior
        │       (Function tests)                 │  Fast, many tests
        └─────────────────────────────────────────┘
```

---

## Layer 1: Unit Tests

**What:** Test individual functions in isolation
**Speed:** Fast (milliseconds)
**Quantity:** Many (most tests should be here)

### Characteristics
- No external dependencies (mocked if needed)
- Test one thing per test
- Fast feedback during development

### Example

```typescript
import { describe, it, expect } from "bun:test";
import { extractMetadata } from "../lib/process";

describe("extractMetadata", () => {
  it("extracts name from caption", () => {
    const caption = "[name:Custom] Some content #tag";
    const result = extractMetadata(caption);
    expect(result.name).toBe("Custom");
  });

  it("extracts multiple tags", () => {
    const caption = "#tag1 #tag2 content";
    const result = extractMetadata(caption);
    expect(result.tags).toEqual(["tag1", "tag2"]);
  });
});
```

### When to Write
- Every function with logic
- Edge cases and error conditions
- Before fixing a bug (regression test)

---

## Layer 2: Integration Tests

**What:** Test components working together
**Speed:** Medium (seconds)
**Quantity:** Some (key integration points)

### Characteristics
- Tests real component interaction
- May use test database/fixtures
- Verifies data flows correctly between components

### Example

```typescript
describe("processMessage integration", () => {
  it("creates vault file from Telegram message", async () => {
    const message = loadFixture("text-message.json");
    const result = await processMessage(message, testConfig);

    expect(result.success).toBe(true);
    expect(result.vaultPath).toContain(".md");
    expect(await fileExists(result.vaultPath)).toBe(true);
  });
});
```

### When to Write
- Component boundaries
- Data transformation pipelines
- External service interactions (with mocks)

---

## Layer 3: CLI Tests

**What:** Test command-line interface contracts
**Speed:** Medium (seconds)
**Quantity:** Some (each command and flag)

### Characteristics
- Execute actual CLI commands
- Verify output format and exit codes
- Test flag combinations

### Example

```typescript
export const cliTestSpecs: CLITestSpec[] = [
  {
    id: "TEST-CLI-014",
    name: "Direct with --name flag",
    description: "Verify --name flag adds metadata to caption",
    command: 'echo "test" | bun run ingest.ts direct --name "Custom" --dry-run',
    expected: {
      contains: ["[name:Custom]", "DRY RUN"],
      exitCode: 0,
    },
  },
  {
    id: "TEST-CLI-015",
    name: "Direct with invalid flag",
    command: 'bun run ingest.ts direct --invalid-flag',
    expected: {
      contains: ["Unknown flag"],
      exitCode: 1,
    },
  },
];
```

### When to Write
- Every CLI command
- Every flag/option
- Error conditions and help text

---

## Layer 4: Acceptance Tests

**What:** Test end-to-end user outcomes
**Speed:** Slow (minutes)
**Quantity:** Few (critical user journeys)

### Characteristics
- Full system test (may include external services)
- Tests user-visible outcomes
- May use LLM-judge for quality evaluation

### Example

```typescript
describe("Ingest workflow acceptance", () => {
  it("ingests text and creates searchable note", async () => {
    // 1. Send content via CLI
    const ingestResult = await runCommand(
      'echo "Test content about TypeScript" | bun run ingest.ts direct --tags "test"'
    );
    expect(ingestResult.exitCode).toBe(0);

    // 2. Wait for processing
    await waitForProcessing();

    // 3. Verify searchable
    const searchResult = await runCommand(
      'bun run obs.ts search --text "TypeScript"'
    );
    expect(searchResult.output).toContain("Test content");
  });
});
```

### When to Write
- Critical user journeys
- End-to-end flows
- Before major releases

---

## Test Naming Convention

```
TEST-[LAYER]-[NUMBER]: [Description]
```

| Prefix | Layer | Example |
|--------|-------|---------|
| `TEST-UNIT-` | Unit | TEST-UNIT-001: extractMetadata parses tags |
| `TEST-INT-` | Integration | TEST-INT-005: processMessage creates file |
| `TEST-CLI-` | CLI | TEST-CLI-014: --name flag works |
| `TEST-ACC-` | Acceptance | TEST-ACC-001: Full ingest workflow |

---

## Coverage Guidelines

| Layer | Target Coverage |
|-------|-----------------|
| Unit | 80%+ of functions with logic |
| Integration | Key integration points |
| CLI | Every command and flag |
| Acceptance | Critical user journeys |

**Note:** 100% coverage is not the goal. Focus on:
- Business-critical paths
- Error handling
- Edge cases that have caused bugs

---

## Running Tests

```bash
# Run all tests
bun test all

# Run by layer
bun test unit
bun test integration
bun test cli
bun test acceptance

# Run specific test
bun test --grep "TEST-CLI-014"

# Run with coverage
bun test --coverage
```

---

## Related Docs

- **ValidateSpec.md** - Workflow for running validation
- **ToolingArchitecture.md** - Test framework structure
