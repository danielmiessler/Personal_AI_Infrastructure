# Test Framework Specification

> **Status:** Draft
> **Version:** 1.0
> **Date:** 2025-12-04
> **Author:** Andreas (with Claude Code assistance)

## 1. Overview

This specification defines the test execution framework for the PAI Ingest pipeline. It introduces structured test run tracking, group-based execution, and quality metrics over time.

### 1.1 Goals

1. **Persistence** - Record every test execution with full context
2. **Continuity** - Continue incomplete runs across multiple sessions
3. **Visibility** - Track quality trends over time
4. **Efficiency** - Focus on failing tests, skip stable ones
5. **Semantic Validation** - Use LLM-as-judge for complex outcomes

### 1.2 Terminology

| Term | Definition |
|------|------------|
| **Test Suite** | Top-level category (e.g., `regression`, `integration`) |
| **Test Group** | Logical grouping within a suite (e.g., `voice-processing`, `patterns`) |
| **Test Case** | Individual test with unique ID (e.g., `TEST-REG-005a`) |
| **Test Condition** | Optional sub-variations of a test case (future) |
| **Test Run** | A single execution session with unique run ID |
| **Test History** | Aggregated results for a test case across all runs |

---

## 2. Test Hierarchy

### 2.1 Structure

```
Test Suite (category)
  └── Test Group (logical grouping)
       └── Test Case (TEST-XXX-NNN)
            └── Test Condition (optional: edge cases, variations)
```

### 2.2 Test Groups

Groups provide finer control than suites. Default groups derived from test type:

| Group | Description | Example Tests |
|-------|-------------|---------------|
| `text-processing` | Plain text message handling | REG-001, REG-002, REG-003 |
| `url-processing` | URL extraction via Jina AI | REG-004 |
| `voice-processing` | Audio transcription and hints | REG-005a, REG-005b |
| `photo-processing` | Vision AI, OCR, Mermaid | REG-007, REG-008, REG-011, REG-012 |
| `document-processing` | PDF, DOCX, clipboard files | REG-009, REG-010a, REG-020 |
| `pattern-commands` | Fabric pattern execution | PAT-001, PAT-002, PAT-003 |
| `photo-commands` | Photo-specific commands | PHOTO-001, PHOTO-002, PHOTO-003 |

### 2.3 Test Spec Enhancement

```typescript
interface TestSpec {
  id: string;                    // Unique identifier: TEST-XXX-NNN
  name: string;                  // Human-readable name
  category: TestCategory;        // Suite: regression, integration, etc.
  group?: string;                // NEW: Logical group for focused execution
  description?: string;          // NEW: Human-readable expected outcome
  fixture: string;               // Path to fixture file
  input: TestInput;              // Input configuration
  expected: TestExpected;        // Validation expectations
  meta: {
    docRef?: string;             // Reference to documentation
    notes?: string;              // Implementation notes
    skip?: string;               // Skip reason (if skipped)
    timeout?: number;            // Custom timeout for this test
  };
}
```

---

## 3. Test Run Model

### 3.1 Run Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CREATE    │────▶│   EXECUTE   │────▶│  COMPLETE   │
│  (new run)  │     │  (iterate)  │     │  (all done) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   RESUME    │
                   │ (continue)  │
                   └─────────────┘
```

### 3.2 Run States

| State | Description |
|-------|-------------|
| `in_progress` | Run started, some tests pending |
| `completed` | All tests executed (pass or fail) |
| `abandoned` | Manually marked as abandoned |

### 3.3 Run Data Structure

```typescript
interface TestRun {
  runId: string;              // Format: "run-YYYY-MM-DD-NNN"
  status: "in_progress" | "completed" | "abandoned";
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // Last update timestamp
  completedAt?: string;       // When run completed

  // Execution context
  mode: "full" | "suite" | "group" | "single";
  filters?: {
    suite?: string;
    group?: string;
    ids?: string[];
  };

  // Summary (updated after each test)
  summary: {
    total: number;
    executed: number;
    passed: number;
    failed: number;
    skipped: number;
    pending: number;          // Not yet executed in this run
  };

  // Individual test results
  results: {
    [testId: string]: TestResult;
  };
}

interface TestResult {
  status: "passed" | "failed" | "skipped" | "timeout" | "error" | "pending";
  executedAt?: string;        // When this test was run
  duration?: number;          // Milliseconds
  error?: string;             // Error message if failed

  // Captured actuals for comparison
  actual?: {
    pipeline?: string;
    tags?: string[];
    frontmatter?: Record<string, unknown>;
    vaultPath?: string;
    content?: string;         // Truncated for storage
  };

  // Validation details
  checks?: Array<{
    name: string;
    passed: boolean;
    expected?: unknown;
    actual?: unknown;
    error?: string;
  }>;
}
```

---

## 4. Test Run Operations

### 4.1 Create New Run

```bash
# Start a new full run
bun run ingest.ts test run --new

# Start a new run for specific group
bun run ingest.ts test run --new --group voice-processing

# Start a new run for specific tests
bun run ingest.ts test run --new --ids TEST-REG-005a,TEST-REG-005b
```

**Behavior:**
- Creates new run record with unique ID
- Sets all matching tests to `pending` status
- Displays run ID for future reference

### 4.2 Continue Existing Run

```bash
# Continue the most recent in-progress run
bun run ingest.ts test run --continue

# Continue a specific run
bun run ingest.ts test run --continue run-2025-12-04-001

# Continue, only executing pending/failed tests
bun run ingest.ts test run --continue --retry-failed
```

**Behavior:**
- Loads existing run state
- Executes only `pending` tests (or failed if `--retry-failed`)
- Updates run record after each test
- Marks run as `completed` when no pending tests remain

### 4.3 View Run Status

```bash
# Show current run status
bun run ingest.ts test status

# Show specific run
bun run ingest.ts test status run-2025-12-04-001

# List all runs
bun run ingest.ts test runs
```

**Output Example:**
```
Run: run-2025-12-04-001 (in_progress)
Started: 2025-12-04 11:30:00
Updated: 2025-12-04 11:45:00
═══════════════════════════════════════════════════════════
Group                │ Total │ Pass │ Fail │ Skip │ Pend │
─────────────────────┼───────┼──────┼──────┼──────┼──────┤
text-processing      │   3   │  3   │  0   │  0   │  0   │ ✅
url-processing       │   1   │  1   │  0   │  0   │  0   │ ✅
voice-processing     │   2   │  1   │  0   │  1   │  0   │ ⚠️
photo-processing     │   6   │  4   │  0   │  0   │  2   │ 🔄
document-processing  │   3   │  0   │  0   │  0   │  3   │ ⏳
pattern-commands     │   3   │  3   │  0   │  0   │  0   │ ✅
─────────────────────┼───────┼──────┼──────┼──────┼──────┤
TOTAL                │  18   │  12  │  0   │  1   │  5   │
═══════════════════════════════════════════════════════════
Progress: 72% (13/18 executed)

Next: Run `test run --continue` to execute 5 pending tests
```

### 4.4 View Test History

```bash
# Show history for a specific test
bun run ingest.ts test history TEST-REG-005a

# Show history with details
bun run ingest.ts test history TEST-REG-005a --verbose
```

**Output Example:**
```
TEST-REG-005a: Voice memo with caption hints (Wispr Flow)
Group: voice-processing
Description: Validates hashtag and @mention extraction from voice memo captions
═══════════════════════════════════════════════════════════════════════════
Run                  │ Date       │ Status  │ Duration │ Notes
─────────────────────┼────────────┼─────────┼──────────┼────────────────────
run-2025-12-03-001   │ 2025-12-03 │ ❌ FAIL │ 52.7s    │ Tags not extracted
run-2025-12-03-002   │ 2025-12-03 │ ❌ FAIL │ 51.3s    │ Caption not sent
run-2025-12-04-001   │ 2025-12-04 │ ✅ PASS │ 66.9s    │ -
═══════════════════════════════════════════════════════════════════════════
Trend: IMPROVING (was failing, now passing)
```

---

## 5. File Structure

### 5.1 Directory Layout

```
test/
├── specs/                      # Test specifications
│   ├── regression.spec.ts
│   ├── integration.spec.ts
│   └── ...
├── fixtures/                   # Test fixtures (captured messages)
│   ├── regression/
│   │   ├── TEST-REG-001.json
│   │   └── ...
│   └── assets/                 # Binary assets (images, audio, docs)
├── framework/                  # Test framework code
│   ├── runner.ts               # Unit test runner
│   ├── integration-runner.ts   # Integration test runner
│   ├── validate.ts             # Validation logic
│   ├── types.ts                # Type definitions
│   ├── run-tracker.ts          # NEW: Run tracking logic
│   └── history.ts              # NEW: History aggregation
├── output/                     # Generated outputs
│   ├── runs/                   # NEW: Persisted run data
│   │   ├── run-2025-12-04-001.json
│   │   ├── run-2025-12-04-002.json
│   │   └── current.json        # Symlink to active run
│   ├── history/                # NEW: Aggregated history
│   │   └── test-history.json
│   └── reports/                # Generated reports
│       └── integration-report.md
├── README.md                   # Test documentation
└── TEST-FRAMEWORK-SPEC.md      # This specification
```

### 5.2 Run File Format

**`output/runs/run-2025-12-04-001.json`:**
```json
{
  "runId": "run-2025-12-04-001",
  "status": "in_progress",
  "createdAt": "2025-12-04T11:30:00.000Z",
  "updatedAt": "2025-12-04T11:45:00.000Z",
  "mode": "full",
  "summary": {
    "total": 18,
    "executed": 13,
    "passed": 12,
    "failed": 0,
    "skipped": 1,
    "pending": 5
  },
  "results": {
    "TEST-REG-001": {
      "status": "passed",
      "executedAt": "2025-12-04T11:30:05.000Z",
      "duration": 5143,
      "actual": {
        "pipeline": "default",
        "tags": ["incoming", "raw", "source/telegram", "scope/work"]
      },
      "checks": [
        { "name": "pipeline_match", "passed": true, "expected": "default", "actual": "default" },
        { "name": "tag_present:incoming", "passed": true }
      ]
    },
    "TEST-REG-005b": {
      "status": "skipped",
      "reason": "Fixture audio doesn't contain expected spoken hints"
    },
    "TEST-REG-009": {
      "status": "pending"
    }
  }
}
```

### 5.3 History File Format

**`output/history/test-history.json`:**
```json
{
  "TEST-REG-001": {
    "runs": [
      { "runId": "run-2025-12-03-001", "status": "passed", "duration": 5200 },
      { "runId": "run-2025-12-04-001", "status": "passed", "duration": 5143 }
    ],
    "trend": "stable",
    "lastStatus": "passed",
    "passRate": 100,
    "avgDuration": 5171
  },
  "TEST-REG-005a": {
    "runs": [
      { "runId": "run-2025-12-03-001", "status": "failed", "duration": 52700 },
      { "runId": "run-2025-12-03-002", "status": "failed", "duration": 51300 },
      { "runId": "run-2025-12-04-001", "status": "passed", "duration": 66900 }
    ],
    "trend": "improving",
    "lastStatus": "passed",
    "passRate": 33,
    "avgDuration": 56966
  }
}
```

---

## 6. LLM-as-Judge Validation

### 6.1 Use Cases

For tests where exact matching is impractical:
- Pattern output quality (meeting notes structure, wisdom extraction)
- Vision AI descriptions (semantic correctness, not exact text)
- Content transformation quality

### 6.2 Spec Extension

```typescript
interface TestExpected {
  // Existing exact validations
  pipeline?: string;
  tags?: string[];
  content?: { contains?: string[]; notContains?: string[] };

  // NEW: Semantic validation via LLM
  semantic?: {
    description: string;          // What the output should achieve
    checkpoints?: string[];       // Specific things to verify
    model?: string;               // Optional: specific model to use
    threshold?: number;           // Confidence threshold (0-100, default 80)
  };
}
```

### 6.3 Example

```typescript
{
  id: "TEST-PAT-001",
  name: "/meeting-notes pattern command",
  expected: {
    tags: ["project/pai", "ed_overy"],
    semantic: {
      description: "The Wisdom file should contain a well-structured meeting summary",
      checkpoints: [
        "Contains clearly identified action items with owners",
        "Lists key discussion topics or decisions",
        "Has attendee information preserved",
        "Includes next steps or follow-ups"
      ],
      threshold: 85
    }
  }
}
```

### 6.4 Validation Flow

```
1. Run normal exact validations (tags, pipeline, contains)
2. If semantic validation defined:
   a. Load Wisdom file content
   b. Construct prompt with description + checkpoints + content
   c. Call LLM for evaluation
   d. Parse response for PASS/FAIL + confidence + reasoning
   e. Record result with LLM reasoning in test result
```

---

## 7. CLI Commands Summary

| Command | Description |
|---------|-------------|
| `test run --new` | Create and start a new test run |
| `test run --continue` | Continue the current in-progress run |
| `test run --continue <runId>` | Continue a specific run |
| `test run --retry-failed` | Re-run only failed tests in current run |
| `test status` | Show current run status by group |
| `test status <runId>` | Show specific run status |
| `test runs` | List all runs with summary |
| `test history <testId>` | Show history for a specific test |
| `test compare <run1> <run2>` | Compare two runs side-by-side |

---

## 8. Quality Metrics

### 8.1 Per-Test Metrics

- **Pass Rate**: % of runs where test passed
- **Trend**: `stable`, `improving`, `degrading`, `flaky`
- **Average Duration**: Mean execution time
- **Reliability**: How often it produces consistent results

### 8.2 Per-Group Metrics

- **Group Pass Rate**: % of tests passing in latest run
- **Group Status**: `clean` (all pass), `failing`, `partial`, `pending`

### 8.3 Per-Run Metrics

- **Coverage**: % of tests executed
- **Pass Rate**: % of executed tests that passed
- **Duration**: Total execution time
- **Regression Count**: Tests that were passing, now failing
- **Fix Count**: Tests that were failing, now passing

---

## 9. Implementation Phases

### Phase 1: Run Tracking (Priority: High)
- [ ] Create `run-tracker.ts` module
- [ ] Implement run creation, update, persistence
- [ ] Update integration-runner to use run tracker
- [ ] Add `--new` and `--continue` flags to CLI

### Phase 2: Status & History (Priority: High)
- [ ] Create `history.ts` module
- [ ] Implement `test status` command
- [ ] Implement `test history <id>` command
- [ ] Implement `test runs` command

### Phase 3: Groups (Priority: Medium)
- [ ] Add `group` field to test specs
- [ ] Implement group filtering in runner
- [ ] Add group-level status display

### Phase 4: LLM-as-Judge (Priority: Low)
- [ ] Add `semantic` field to TestExpected type
- [ ] Implement LLM evaluation in validator
- [ ] Add semantic results to test output

### Phase 5: Reporting (Priority: Low)
- [ ] Run comparison command
- [ ] HTML dashboard (optional)
- [ ] Quality trend charts

---

## 10. Migration Notes

### 10.1 Backward Compatibility

- Existing test specs work unchanged
- New fields (`group`, `description`, `semantic`) are optional
- Existing `--ids` and `--suite` flags continue to work

### 10.2 Recommended Migration

1. Add `group` field to all existing test specs
2. Add `description` field with human-readable expected outcomes
3. Review and update any tests with `meta.skip` for proper handling

---

## Appendix A: Example Workflow

```bash
# Day 1: Start a new full test run
$ bun run ingest.ts test run --new
Created run: run-2025-12-04-001
Executing 18 tests...

# Some tests timeout, need to continue later
^C (interrupt)

# Day 1 (later): Continue the run
$ bun run ingest.ts test status
Run: run-2025-12-04-001 (in_progress)
Progress: 45% (8/18 executed), 2 failed, 6 pending

$ bun run ingest.ts test run --continue
Continuing run-2025-12-04-001...
Executing 6 pending tests...

# Fix a bug, re-run failed tests
$ bun run ingest.ts test run --continue --retry-failed
Re-running 2 failed tests...

# Check final status
$ bun run ingest.ts test status
Run: run-2025-12-04-001 (completed)
Progress: 100% (18/18 executed), 0 failed

# Day 2: New run to verify stability
$ bun run ingest.ts test run --new
Created run: run-2025-12-04-002

# Compare runs
$ bun run ingest.ts test compare run-2025-12-04-001 run-2025-12-04-002
```

---

## Appendix B: Design Decisions

### Why JSON for run storage?
- Human-readable for debugging
- Easy to parse programmatically
- Git-friendly for tracking changes
- Can be converted to other formats as needed

### Why persist to files vs database?
- Zero dependencies
- Works offline
- Easy backup (just copy files)
- Aligns with existing fixture/report approach

### Why group-based execution?
- Reduces context switching during debugging
- Allows parallel work on different areas
- Matches natural workflow of "get this group green, then move on"
