# Ingest Test Framework

Automated testing for the ingest pipeline, supporting unit tests (fixture-based) and integration tests (automated Telegram workflow).

## Quick Reference

```bash
# Unit tests - fast, fixture-based (~3 min)
bun run ingest.ts test run

# Integration tests - full Telegram pipeline (single process, no watcher)
bun run ingest.ts test integration --ids TEST-REG-020 --verbose

# View latest test report
cat test/output/latest-report.md
```

## Testing Strategy

| Test Type | Command | Duration | When to Use |
|-----------|---------|----------|-------------|
| **Unit tests** | `bun run ingest.ts test run` | ~3 min | Daily development, CI/CD |
| **Integration** | `bun run ingest.ts test integration --ids TEST-XX` | ~30s/test | Full Telegram pipeline |

### Daily Development / CI

Fast fixture-based tests that validate core processing logic:

```bash
bun run ingest.ts test run
```

This runs all unit tests using pre-captured fixtures. Output is isolated to `test/output/` - no production vault pollution.

## Integration Testing

Integration tests validate the full Telegram pipeline using **automated single-process execution**.

### How It Works

The integration runner handles everything in one process:
1. **Forward** fixture message from Test Cases → Test Inbox
2. **Process** via `processMessage()` directly (no watcher needed)
3. **Validate** vault output against test spec

### Why Single-Process?

Telegram's limitation: one bot can't poll multiple channels simultaneously. The old approach required a separate watcher process. The new approach calls `processMessage()` directly after forwarding, avoiding the polling limitation.

### The Three-Channel Architecture

1. **PAI Test Cases**: Library of test messages, populated via bot API (configured via `TEST_TELEGRAM_CASES_ID`)
2. **PAI Test Inbox**: Test inbox, where messages are forwarded for processing (configured via `TEST_TELEGRAM_CHANNEL_ID`)
3. **PAI Test Events**: Test notifications channel (configured via `TEST_TELEGRAM_OUTBOX_ID`)

### Integration Test Commands

```bash
# Run specific test
bun run ingest.ts test integration --ids TEST-REG-020 --verbose

# Run multiple tests
bun run ingest.ts test integration --ids TEST-REG-001,TEST-REG-002 --verbose

# Run all tests with fixtures
bun run ingest.ts test integration --verbose

# Dry run (show what would happen without forwarding)
bun run ingest.ts test integration --ids TEST-REG-020 --dry-run
```

### Setup Test Cases (one-time)

```bash
# Send specific test to Test Cases channel
bun run ingest.ts test send TEST-REG-020

# Send all tests
bun run ingest.ts test send --all
```

### Configuration

Add to `~/.claude/.env`:

```bash
# Test channels (required for integration testing)
# Add these to ~/.claude/.env (do not commit to git)
TEST_TELEGRAM_CHANNEL_ID=<your-test-inbox-channel-id>   # PAI Test Inbox
TEST_TELEGRAM_OUTBOX_ID=<your-test-events-channel-id>    # PAI Test Events
TEST_TELEGRAM_CASES_ID=<your-test-cases-channel-id>      # PAI Test Cases
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
ingest test send TEST-REG-001

# Send all tests to PAI Test Cases
ingest test send --all
```
(Requires `TEST_TELEGRAM_CASES_ID` in `~/.claude/.env`)

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
2. Send to PAI Test Cases: `ingest test send TEST-NEW-001` (requires `TEST_TELEGRAM_CASES_ID` in `~/.claude/.env`)
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
