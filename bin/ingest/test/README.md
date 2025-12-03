# Ingest Test Framework

Automated testing for the ingest pipeline, supporting unit tests (fixture-based) and integration tests (manual Telegram workflow).

## Quick Reference

```bash
# Daily CI/development tests (~3 min)
ingest test run

# Pre-release validation (~5-10 min)
ingest test run --include-media
# Then run manual integration tests (see below)
```

## Testing Strategy

| Test Type | Command | Duration | When to Use |
|-----------|---------|----------|-------------|
| **Unit tests** | `ingest test run` | ~3 min | Daily development, CI/CD |
| **Unit + media** | `ingest test run --include-media` | ~5 min | When testing media processing |
| **Integration** | Manual workflow | ~2 min/test | Pre-release, validating full pipeline |

### Daily Development / CI

Fast fixture-based tests that validate core processing logic:

```bash
ingest test run
```

This runs all 45 unit tests using pre-captured fixtures. Output is isolated to `test/output/` - no production vault pollution.

## Integration Testing

Integration tests validate the full Telegram pipeline using a manual workflow.

### Why Manual?

Telegram's Bot API does NOT generate updates when a bot sends messages via the API. Only when a **user** sends messages (including via iOS shortcuts) does the bot receive updates. This means automated send-and-receive testing doesn't work.

### The Solution: PAI Test Cases Channel

We use a three-channel approach:

1. **PAI Test Cases** (-1003383520667): Library of test messages, populated via bot API
2. **PAI Test Inbox** (-1003492308192): Test inbox, where you forward messages to trigger processing
3. **PAI Test Events** (-1003438850052): Test notifications channel

### Integration Test Workflow

1. **Populate Test Cases** (one-time setup):
   ```bash
   TEST_TELEGRAM_CASES_ID=-1003383520667 ingest test send --all
   ```
   This sends all test cases to PAI Test Cases, each prefixed with `[TEST-ID]`.

2. **Run an Integration Test**:
   - Open Telegram
   - Go to PAI Test Cases channel
   - Forward a test message to PAI Test Inbox
   - The watch daemon processes it (check PAI Test Events for notification)
   - Validate the vault output

3. **Identify Results by Test ID**:
   Each message is prefixed with `[TEST-SCOPE-001]`, `[TEST-REG-002]`, etc.
   This lets you validate results against the correct test spec.

### Configuration

Add to `~/.claude/.env`:

```bash
# Test channels (required for integration testing)
TEST_TELEGRAM_CHANNEL_ID=-1003492308192   # PAI Test Inbox
TEST_TELEGRAM_OUTBOX_ID=-1003438850052    # PAI Test Events
TEST_TELEGRAM_CASES_ID=-1003383520667     # PAI Test Cases
```

## Quick Start

```bash
# Run all unit tests (with fixtures)
ingest test run

# Run specific test
ingest test run TEST-SCOPE-001

# Run tests by category
ingest test run --suite scope
ingest test run --suite date
ingest test run --suite archive
ingest test run --suite regression

# Include media tests (requires Telegram download)
ingest test run --include-media

# Show test status
ingest test status
```

## Test Types

### Unit Tests (`ingest test run`)

Fast, fixture-based tests that replay captured Telegram messages:

- Uses pre-captured fixtures from `test/fixtures/`
- Writes output to isolated `test/output/` directory (not production vault)
- Does NOT send events to Telegram
- Best for CI/CD and rapid iteration

### Integration Tests (Manual Workflow)

Full end-to-end Telegram pipeline tests:

1. Forward message from PAI Test Cases → PAI Test Inbox
2. Watch daemon processes it
3. Check vault for output, PAI Test Events for notification
4. Validate against test spec

## Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| `scope` | TEST-SCOPE-* | Context separation (~private, ~work sigils) |
| `date` | TEST-DATE-* | Document date hints and filename dating |
| `archive` | TEST-ARC-*, TEST-INGv2-* | Archive/receipt pipeline |
| `regression` | TEST-REG-*, TEST-PAT-*, TEST-PHOTO-*, TEST-EMB-* | Core functionality |

## Working with Fixtures

### Capture a Fixture

```bash
# Capture from most recent matching Telegram message
ingest test capture TEST-SCOPE-001

# Capture all missing fixtures
ingest test capture --missing
```

### Populate Test Cases Channel

```bash
# Send single test to PAI Test Cases
TEST_TELEGRAM_CASES_ID=-1003383520667 ingest test send TEST-REG-001

# Send all tests to PAI Test Cases
TEST_TELEGRAM_CASES_ID=-1003383520667 ingest test send --all
```

**Note:** Voice tests (`TEST-REG-005a/b`) require manual recording and sending.

## Test Spec Structure

Test specs are defined in `test/specs/`:

```typescript
{
  id: "TEST-SCOPE-001",
  name: "Explicit ~private sigil",
  category: "scope",
  fixture: "scope/TEST-SCOPE-001.json",
  input: {
    type: "text",
    description: "Text message with explicit ~private sigil",
    example: "~private My personal journal entry",
  },
  expected: {
    tags: ["scope/private"],
    excludeTags: ["scope/work"],
    frontmatter: {
      scope: "private",
    },
  },
}
```

## Validation Checks

Tests can validate:

- **Tags**: `expected.tags`, `expected.excludeTags`
- **Frontmatter**: `expected.frontmatter` (key-value pairs)
- **Pipeline**: `expected.pipeline` (default, archive, receipt, clip)
- **Content**: `expected.content.contains`, `expected.content.notContains`
- **Verbose Output**: `expected.verboseOutput` (console log strings)
- **Dropbox Sync**: `expected.dropboxSync`

## Directory Structure

```
test/
├── fixtures/           # Captured test data
│   ├── scope/          # Scope test fixtures
│   ├── date/           # Date test fixtures
│   ├── archive/        # Archive test fixtures
│   ├── regression/     # Regression test fixtures
│   ├── assets/         # Test files (PDFs, images, etc.)
│   └── media/          # Downloaded Telegram media
├── output/             # Test run output (isolated vault)
│   └── run-YYYY-MM-DD-HH-MM-SS/
├── specs/              # Test specifications
│   ├── index.ts        # All specs export
│   ├── scope.spec.ts
│   ├── date.spec.ts
│   ├── archive.spec.ts
│   └── regression.spec.ts
└── framework/          # Test framework code
    ├── runner.ts       # Unit test runner
    ├── integration.ts  # Integration test support
    ├── capture.ts      # Fixture capture
    ├── validate.ts     # Validation logic
    └── types.ts        # TypeScript types
```

## Adding New Tests

1. Create spec in appropriate `test/specs/*.spec.ts`
2. Send to PAI Test Cases: `TEST_TELEGRAM_CASES_ID=-1003383520667 ingest test send TEST-NEW-001`
3. Capture fixture (if needed): `ingest test capture TEST-NEW-001`
4. Run unit test: `ingest test run TEST-NEW-001`
5. Commit fixture and spec

## CI/CD Integration

```bash
# Run all tests, exit with error code on failure
ingest test run

# Run without media (faster, no Telegram downloads)
ingest test run  # Default behavior

# Run specific suite
ingest test run --suite regression
```

## Troubleshooting

### Test Skipped (No Fixture)

Run `ingest test capture TEST-ID` or send and capture from PAI Test Cases.

### Media Tests Skipped

Add `--include-media` flag (requires active Telegram connection).

### Test Timeout

Increase timeout in `test/framework/runner.ts` (default: 60s).

### Content Validation Failing

- Content is checked against ALL vault files (Raw + Wisdom)
- Case-insensitive substring matching
- Check actual output in `test/output/run-*/TEST-ID/`

### Integration Test Not Processing

- Ensure watch daemon is running
- Check PAI Test Events for notifications
- Messages must be forwarded by a user (not sent by bot API)
