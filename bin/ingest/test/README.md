# Ingest Test Framework

Automated testing for the ingest pipeline, supporting unit tests (fixture-based) and integration tests (live Telegram pipeline).

## Quick Reference

```bash
# Unit tests - fast, fixture-based (~4 min)
bun run ingest.ts test run

# Integration tests - parallel execution (~2 min for full suite)
bun run ingest.ts test integration --parallel

# Run single integration test
bun run ingest.ts test integration --ids TEST-REG-001 --verbose

# View latest reports
cat test/output/latest-report.md              # Unit test report
cat test/output/latest-integration-report.md  # Integration test report
```

## Testing Strategy

| Test Type | Command | Duration | When to Use |
|-----------|---------|----------|-------------|
| **Unit tests** | `test run` | ~4 min | Daily development, CI/CD |
| **Integration** | `test integration --parallel` | ~2 min | Full Telegram pipeline validation |

## Unit Tests

Fast fixture-based tests that replay captured Telegram messages without network calls.

```bash
# Run all unit tests
bun run ingest.ts test run

# Run specific test
bun run ingest.ts test run TEST-SCOPE-001

# Run by category
bun run ingest.ts test run --suite scope
bun run ingest.ts test run --suite regression

# Include media tests (requires Telegram download)
bun run ingest.ts test run --include-media

# Keep output files for debugging
bun run ingest.ts test run --keep-output
```

**Features:**
- Uses pre-captured fixtures from `test/fixtures/`
- Writes output to isolated `test/output/` directory (not production vault)
- Does NOT send events to Telegram
- 5 minute per-test timeout (for slow AI/Jina operations)
- Generates markdown report with pass/fail details

## Integration Tests

Full end-to-end Telegram pipeline tests. Messages are sent directly to Test Inbox and processed immediately.

### How It Works

The integration runner handles everything in one process:
1. **Send** test message directly to Test Inbox (no forwarding needed)
2. **Process** via `processMessage()` directly (no watcher required)
3. **Save** to vault via `saveToVault()`
4. **Validate** output against test spec expectations

### Commands

```bash
# Run all integration tests (parallel - fastest)
bun run ingest.ts test integration --parallel

# Run with custom concurrency
bun run ingest.ts test integration --parallel --concurrency 3

# Run specific test
bun run ingest.ts test integration --ids TEST-SCOPE-001 --verbose

# Run by category
bun run ingest.ts test integration --suite scope --parallel

# Run sequentially (slower but easier to debug)
bun run ingest.ts test integration --verbose

# Dry run (show what would happen)
bun run ingest.ts test integration --ids TEST-REG-001 --dry-run

# Custom per-test timeout (ms)
bun run ingest.ts test integration --parallel --timeout 180000
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--parallel` | Run tests concurrently | Off (sequential) |
| `--concurrency N` | Max concurrent tests | 5 |
| `--timeout N` | Per-test timeout (ms) | 120000 (2 min) |
| `--verbose` | Show detailed processing output | Off |
| `--dry-run` | Show plan without sending messages | Off |
| `--suite NAME` | Run specific category (scope/date/archive/regression) | All |
| `--ids TEST-XX` | Run specific test ID | All with fixtures |

### Configuration

Add to `~/.claude/.env`:

```bash
# Test channels (required for integration testing)
TEST_TELEGRAM_CHANNEL_ID=<your-test-inbox-channel-id>   # PAI Test Inbox
TEST_TELEGRAM_OUTBOX_ID=<your-test-events-channel-id>   # PAI Test Events
TEST_TELEGRAM_CASES_ID=<your-test-cases-channel-id>     # PAI Test Cases (optional, for manual testing)
```

## Test Reports

Both unit and integration tests generate detailed markdown reports.

### Unit Test Reports

```bash
# Location after test run
test/output/run-YYYY-MM-DD-HH-MM-SS/REPORT.md
test/output/latest-report.md  # Symlink to latest

# Report includes:
# - Summary (total/passed/failed/skipped)
# - Failed test details with expected vs actual
# - All tests table with duration
```

### Integration Test Reports

```bash
# Location after integration run
test/output/integration-report.md
test/output/latest-integration-report.md

# Report includes:
# - Summary with pass rate
# - Failed tests with input/expected/actual details
# - All tests table with pipeline and duration
```

### Test History

Test results are tracked over time in `test/output/test-history.json` for quality trending.

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
bun run ingest.ts test capture TEST-SCOPE-001

# Capture all missing fixtures
bun run ingest.ts test capture --missing
```

### Populate Test Cases Channel (Optional)

For manual testing, you can populate the Test Cases channel:

```bash
# Send single test to PAI Test Cases
bun run ingest.ts test send TEST-REG-001

# Send all tests to PAI Test Cases
bun run ingest.ts test send --all
```

**Note:** Integration tests no longer require pre-populated Test Cases. They send messages directly.

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
    pipeline: "default",
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

- **Pipeline**: `expected.pipeline` (default, archive, receipt, note)
- **Tags**: `expected.tags`, `expected.excludeTags`
- **Frontmatter**: `expected.frontmatter` (key-value pairs)
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
├── output/             # Test run output
│   ├── run-YYYY-MM-DD-HH-MM-SS/  # Unit test runs
│   ├── latest-report.md          # Latest unit test report
│   ├── integration-report.md     # Latest integration report
│   └── test-history.json         # Quality tracking over time
├── specs/              # Test specifications
│   ├── index.ts
│   ├── scope.spec.ts
│   ├── date.spec.ts
│   ├── archive.spec.ts
│   └── regression.spec.ts
└── framework/          # Test framework code
    ├── runner.ts           # Unit test runner
    ├── integration-runner.ts  # Integration test runner
    ├── capture.ts          # Fixture capture
    ├── validate.ts         # Validation logic
    ├── report.ts           # Report generation
    └── types.ts            # TypeScript types
```

## Adding New Tests

1. Create spec in appropriate `test/specs/*.spec.ts`
2. Add entry to `test/test-case-registry.csv`
3. Send to capture: `bun run ingest.ts test send TEST-NEW-001`
4. Capture fixture: `bun run ingest.ts test capture TEST-NEW-001`
5. Run unit test: `bun run ingest.ts test run TEST-NEW-001`
6. Run integration: `bun run ingest.ts test integration --ids TEST-NEW-001 --verbose`
7. Commit fixture and spec

## CI/CD Integration

```bash
# Run all unit tests, exit with error code on failure
bun run ingest.ts test run

# Run integration tests in parallel
bun run ingest.ts test integration --parallel

# Run specific suite for faster CI
bun run ingest.ts test run --suite regression
```

## Troubleshooting

### Test Skipped (No Fixture)

Run `bun run ingest.ts test capture TEST-ID` to capture from Telegram.

### Media Tests Skipped

Add `--include-media` flag (requires active Telegram connection for downloads).

### Test Timeout

- Unit tests: 5 minute timeout per test (configurable in `runner.ts`)
- Integration tests: Use `--timeout N` flag (default 2 minutes)
- Slow tests (voice transcription, long documents) may need longer timeouts

### Content Validation Failing

- Content is checked against ALL vault files (Raw + Wisdom)
- Case-insensitive substring matching
- Check actual output in `test/output/run-*/TEST-ID/`

### Integration Test Failing

- Check `test/output/integration-report.md` for detailed failure info
- Run with `--verbose` to see processing output
- Verify test channel IDs in `~/.claude/.env`

### One Test Blocking Suite

Use `--parallel` mode - each test has independent timeout protection.
