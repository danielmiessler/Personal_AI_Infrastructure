# Ingest Pipeline Test Framework

**Document Type:** Architecture Specification
**Version:** 1.0.0
**Date:** 2025-12-03
**Status:** Draft

---

## Overview

Automated test framework for the PAI ingest pipeline using a **capture/replay** architecture. Tests are defined as specifications linked to captured Telegram message fixtures, enabling repeatable regression testing without manual intervention.

### Design Principles

1. **Specification-First** - Test cases defined in structured specs before fixtures
2. **Real Data** - Fixtures captured from actual Telegram messages (not mocked)
3. **Deterministic Replay** - Tests replay fixtures without touching Telegram API
4. **Full Pipeline** - Tests exercise the real processing code path
5. **Regression Ready** - Run entire suite after any code changes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEST FRAMEWORK                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │    Specs     │     │   Fixtures   │     │   Runner     │            │
│  │              │     │              │     │              │            │
│  │ TEST-SCOPE-* │────▶│  .json       │────▶│  bun test    │            │
│  │ TEST-DATE-*  │     │  payloads    │     │              │            │
│  │ TEST-REG-*   │     │              │     │              │            │
│  └──────────────┘     └──────────────┘     └──────────────┘            │
│         │                    ▲                    │                     │
│         │                    │                    ▼                     │
│         │             ┌──────────────┐     ┌──────────────┐            │
│         │             │   Capture    │     │   Validate   │            │
│         │             │              │     │              │            │
│         └────────────▶│  From phone  │     │  Events ch   │            │
│                       │  → fixture   │     │  Vault .md   │            │
│                       └──────────────┘     │  Dropbox     │            │
│                                            └──────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
bin/ingest/
├── ingest.ts                 # Main CLI (existing)
├── lib/                      # Existing lib code
│
└── test/
    ├── framework/
    │   ├── types.ts          # TestSpec, Fixture, ValidationResult types
    │   ├── capture.ts        # Capture mode - save Telegram payloads
    │   ├── replay.ts         # Replay mode - feed fixtures to processor
    │   ├── validate.ts       # Validation helpers
    │   └── runner.ts         # Test orchestration
    │
    ├── specs/                # Test specifications
    │   ├── scope.spec.ts     # TEST-SCOPE-001 to 024
    │   ├── date.spec.ts      # TEST-DATE-001 to 030
    │   ├── archive.spec.ts   # TEST-INGv2-100, 101
    │   └── regression.spec.ts # TEST-REG-001 to 020
    │
    ├── fixtures/             # Captured Telegram payloads
    │   ├── scope/
    │   │   ├── TEST-SCOPE-001.json
    │   │   └── ...
    │   ├── date/
    │   │   ├── TEST-DATE-001.json
    │   │   └── ...
    │   └── archive/
    │       └── TEST-INGv2-101.json
    │
    └── output/               # Test run outputs (gitignored)
        └── .gitkeep
```

---

## Test Specification Format

### TypeScript Interface

```typescript
// test/framework/types.ts

export type TestCategory = "scope" | "date" | "archive" | "regression";
export type ContentType = "text" | "voice" | "photo" | "document" | "url";
export type TestStatus = "pending" | "has_fixture" | "passed" | "failed";

export interface TestSpec {
  /** Unique test identifier (e.g., TEST-SCOPE-001) */
  id: string;

  /** Human-readable test name */
  name: string;

  /** Test category for grouping */
  category: TestCategory;

  /** Path to fixture file relative to fixtures/ */
  fixture: string;

  /** Input description (for capture guidance) */
  input: {
    type: ContentType;
    description: string;
    /** Example content to send during capture */
    example?: string;
    /** For voice: expected transcription keywords */
    spokenKeywords?: string[];
  };

  /** Expected outcomes for validation */
  expected: {
    /** Tags that MUST be present */
    tags?: string[];
    /** Tags that MUST NOT be present */
    excludeTags?: string[];
    /** Frontmatter field values */
    frontmatter?: Record<string, unknown>;
    /** Strings that should appear in verbose output */
    verboseOutput?: string[];
    /** Content checks on output file */
    content?: {
      contains?: string[];
      notContains?: string[];
    };
    /** Pipeline that should be selected */
    pipeline?: string;
    /** For archive: expected filename pattern */
    archiveFilename?: RegExp;
    /** Dropbox sync expected */
    dropboxSync?: boolean;
  };

  /** Test metadata */
  meta?: {
    /** Link to documentation */
    docRef?: string;
    /** Skip this test (with reason) */
    skip?: string;
    /** Test requires specific setup */
    setup?: string;
  };
}
```

### Example Specification

```typescript
// test/specs/scope.spec.ts
import { TestSpec } from "../framework/types";

export const scopeSpecs: TestSpec[] = [
  {
    id: "TEST-SCOPE-001",
    name: "Explicit ~private sigil",
    category: "scope",
    fixture: "scope/TEST-SCOPE-001.json",
    input: {
      type: "text",
      description: "Text message with ~private prefix",
      example: "~private This is a personal health note",
    },
    expected: {
      tags: ["scope/private", "incoming", "source/telegram"],
      excludeTags: ["scope/work"],
      verboseOutput: ["Extracted scope hint: private"],
      pipeline: "note",
    },
  },
  {
    id: "TEST-SCOPE-003",
    name: "Dictated scope - spoken 'scope private'",
    category: "scope",
    fixture: "scope/TEST-SCOPE-003.json",
    input: {
      type: "voice",
      description: "Voice memo with spoken scope hint",
      spokenKeywords: ["scope private", "doctor", "appointment"],
    },
    expected: {
      tags: ["scope/private"],
      verboseOutput: ["Extracted scope hint: private"],
    },
  },
  {
    id: "TEST-SCOPE-006",
    name: "Archive pipeline auto-private",
    category: "scope",
    fixture: "scope/TEST-SCOPE-006.json",
    input: {
      type: "photo",
      description: "Photo with /archive command",
      example: "/archive Personal receipt from pharmacy",
    },
    expected: {
      tags: ["scope/private"],
      verboseOutput: ["Auto-set scope to private for archive pipeline"],
      pipeline: "archive",
      dropboxSync: true,
    },
  },
];
```

---

## Fixture Format

### Captured Telegram Message

Fixtures are raw Telegram message payloads as returned by `getUpdates`, with metadata:

```json
{
  "_meta": {
    "testId": "TEST-SCOPE-001",
    "capturedAt": "2025-12-03T10:30:00Z",
    "capturedBy": "andreas",
    "description": "Text message with ~private prefix"
  },
  "message": {
    "message_id": 12345,
    "from": {
      "id": 123456789,
      "first_name": "Andreas"
    },
    "chat": {
      "id": -1001234567890,
      "type": "channel"
    },
    "date": 1733225400,
    "text": "~private This is a personal health note"
  }
}
```

### Media Fixtures

For voice/photo/document, the fixture includes:
- The Telegram message payload
- Reference to downloaded media file (stored in `fixtures/media/`)

```json
{
  "_meta": {
    "testId": "TEST-SCOPE-003",
    "capturedAt": "2025-12-03T10:35:00Z",
    "mediaFile": "media/TEST-SCOPE-003.ogg"
  },
  "message": {
    "message_id": 12346,
    "voice": {
      "file_id": "AwACAgEAAxk...",
      "file_unique_id": "AgADdQAD...",
      "duration": 8
    }
  }
}
```

---

## Capture Mode

### Usage

```bash
# Capture fixture for a specific test
ingest test capture TEST-SCOPE-001

# Output:
# Waiting for message matching TEST-SCOPE-001...
# Expected input: Text message with ~private prefix
# Example: "~private This is a personal health note"
#
# Send message to Telegram now, then press Enter...
#
# ✓ Message captured: message_id=12345
# ✓ Fixture saved: fixtures/scope/TEST-SCOPE-001.json
```

### Capture Process

1. Load test spec to show expected input
2. Poll Telegram for new message
3. Download any media files
4. Save fixture JSON with metadata
5. Validate fixture matches spec input type

### Capture All Missing

```bash
# List tests missing fixtures
ingest test status

# Capture all missing fixtures interactively
ingest test capture --missing
```

---

## Replay Mode

### How Replay Works

1. Load fixture JSON
2. Create mock Telegram message from fixture
3. Feed directly to `processMessage()` (bypasses Telegram API)
4. Capture outputs:
   - Verbose console output
   - Created vault files
   - Events channel notification
5. Validate against spec expectations

### Test Isolation

Each test run:
- Uses a unique output directory
- Creates vault files in `test/output/{testId}/`
- Does NOT affect real vault
- Cleans up after validation (optional)

---

## Validation

### Validation Points

| Check | Source | Description |
|-------|--------|-------------|
| Tags | Vault frontmatter | Expected tags present/absent |
| Frontmatter | Vault file | Specific field values |
| Verbose output | Console capture | Expected log messages |
| Pipeline | Process result | Correct pipeline selected |
| Content | Vault file body | Text contains/excludes |
| Archive name | Dropbox path | Filename matches pattern |
| Events | Events channel | Notification sent correctly |

### Validation Result

```typescript
interface ValidationResult {
  testId: string;
  passed: boolean;
  duration: number;
  checks: {
    name: string;
    passed: boolean;
    expected?: unknown;
    actual?: unknown;
    error?: string;
  }[];
}
```

---

## CLI Commands

```bash
# Run all tests
ingest test run

# Run specific test
ingest test run TEST-SCOPE-001

# Run test suite
ingest test run --suite scope
ingest test run --suite date

# Run with verbose output
ingest test run --verbose

# Show test status
ingest test status
# ┌─────────────────┬──────────┬──────────┬────────┐
# │ Test ID         │ Fixture  │ Status   │ Last   │
# ├─────────────────┼──────────┼──────────┼────────┤
# │ TEST-SCOPE-001  │ ✓        │ passed   │ 2h ago │
# │ TEST-SCOPE-002  │ ✓        │ passed   │ 2h ago │
# │ TEST-SCOPE-003  │ ✗        │ pending  │ -      │
# └─────────────────┴──────────┴──────────┴────────┘

# Capture mode
ingest test capture TEST-SCOPE-003
ingest test capture --missing

# Generate report
ingest test report
```

---

## Test Categories

### Scope Tests (TEST-SCOPE-*)

Context separation with ~private/~work sigils.

| ID | Name | Input Type |
|----|------|------------|
| TEST-SCOPE-001 | Explicit ~private sigil | text |
| TEST-SCOPE-002 | Explicit ~work sigil | text |
| TEST-SCOPE-003 | Dictated "scope private" | voice |
| TEST-SCOPE-004 | Dictated "this is personal" | text |
| TEST-SCOPE-005 | Dictated "for work" | text |
| TEST-SCOPE-006 | Archive pipeline auto-private | photo |
| TEST-SCOPE-007 | Receipt pipeline auto-private | photo |

### Date Tests (TEST-DATE-*)

Document date hints for historical content.

| ID | Name | Input Type |
|----|------|------------|
| TEST-DATE-001 | ISO date [date:YYYY-MM-DD] | text |
| TEST-DATE-002 | Slash date [date:DD/MM/YYYY] | text |
| TEST-DATE-003 | Short year [date:DD/MM/YY] | text |
| TEST-DATE-020 | Note filename uses document date | text |
| TEST-DATE-021 | Archive uses document date | document |

### Archive Tests (TEST-INGv2-*)

Archive pipeline with naming conventions.

| ID | Name | Input Type |
|----|------|------------|
| TEST-INGv2-100 | Archive with auto-naming | document |
| TEST-INGv2-101 | Pre-named file preserved | document |

---

## Running Regression Tests

After code changes:

```bash
# Full regression suite
ingest test run --all

# With coverage report
ingest test run --all --report

# CI-friendly output
ingest test run --all --json > test-results.json
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |
| 2 | Test framework error |

---

## Integration with Bun Test

Tests use Bun's built-in test runner:

```typescript
// test/scope.test.ts
import { describe, it, expect } from "bun:test";
import { runTest } from "./framework/runner";
import { scopeSpecs } from "./specs/scope.spec";

describe("Scope Tests", () => {
  for (const spec of scopeSpecs) {
    it(spec.id + ": " + spec.name, async () => {
      const result = await runTest(spec);
      expect(result.passed).toBe(true);
    });
  }
});
```

Run via Bun:

```bash
cd bin/ingest
bun test                      # All tests
bun test test/scope.test.ts   # Scope tests only
bun test --watch              # Watch mode
```

---

## Implementation Phases

### Phase 1: Framework Foundation
- [ ] Create types.ts with interfaces
- [ ] Create spec files with test definitions
- [ ] Set up directory structure

### Phase 2: Capture Mechanism
- [ ] Implement capture.ts
- [ ] Handle text, voice, photo, document captures
- [ ] Media file download and storage

### Phase 3: Replay & Validation
- [ ] Implement replay.ts (mock Telegram, call processor)
- [ ] Implement validate.ts (check all validation points)
- [ ] Test isolation (output directory per test)

### Phase 4: CLI Integration
- [ ] Add `ingest test` subcommand
- [ ] Implement status, run, capture commands
- [ ] Report generation

### Phase 5: Bun Test Integration
- [ ] Create .test.ts files for each category
- [ ] CI integration

---

## Related Documentation

- [Test Scripts (Manual)](./test-scripts.md) - Source of test case definitions
- [Context System](./context-system.md) - System under test
- [Ingest Pipeline v2](./ingest-pipeline-v2.md) - Pipeline architecture

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-03
