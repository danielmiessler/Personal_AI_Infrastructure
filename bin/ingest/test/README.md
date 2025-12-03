# Ingest Test Framework

Automated testing for the ingest pipeline, supporting both unit tests (fixture-based) and integration tests (full Telegram pipeline).

## Quick Reference

```bash
# Daily CI/development tests (~3 min)
ingest test run

# Pre-release validation (~5-10 min)
ingest test run --include-media

# Integration tests (requires user to send message first)
# 1. Send message to PAI Test Inbox manually
# 2. Run: ingest test integration --process-pending --cleanup
```

## Testing Strategy

| Test Type | Command | Duration | When to Use |
|-----------|---------|----------|-------------|
| **Unit tests** | `ingest test run` | ~3 min | Daily development, CI/CD |
| **Unit + media** | `ingest test run --include-media` | ~5 min | When testing media processing |
| **Integration** | `ingest test integration --process-pending` | ~1 min | Pre-release, validating full pipeline |

### Daily Development / CI

Fast fixture-based tests that validate core processing logic:

```bash
ingest test run
```

This runs all 45 unit tests using pre-captured fixtures. Output is isolated to `test/output/` - no production vault pollution.

### Pre-Release Validation

Full pipeline tests through Telegram (uses test channels):

```bash
# 1. Run all unit tests including media
ingest test run --include-media

# 2. Manual integration test
# Send test messages to PAI Test Inbox (via Telegram app or iOS shortcut)
# Then process them:
ingest test integration --process-pending --cleanup --verbose
```

The `--cleanup` flag deletes test notes from vault after validation.

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

### Integration Tests (`ingest test integration`)

Full end-to-end Telegram pipeline tests using isolated test channels.

**Important:** Telegram's Bot API does NOT generate updates when the bot sends messages via the API - only when a USER sends messages (including via iOS shortcuts that share as your user account). For true integration testing:

1. **User sends test message** to PAI Test Inbox (via Telegram app, iOS shortcut, etc.)
2. **Run** `ingest test integration --process-pending --cleanup`
3. **Validate** output in vault and PAI Test Events

```bash
# Process all pending messages from test channel
ingest test integration --process-pending --verbose --cleanup
```

**Workflow Example:**
1. Open Telegram and send "Hello world #project/test" to PAI Test Inbox channel
2. Run: `ingest test integration --process-pending --cleanup --verbose`
3. Check vault for new note and PAI Test Events for notification

**Why separate test channels?**
- Isolates test messages from production PI Inbox/Events
- Allows cleanup without affecting real data
- Test channel IDs configured in `~/.claude/.env`

## Test Configuration

### Test Channels (for Integration Tests)

To avoid polluting production channels, configure test channels in `~/.claude/.env`:

```bash
# Test channels (optional but recommended)
TEST_TELEGRAM_CHANNEL_ID=-1003492308192   # PAI Test Inbox
TEST_TELEGRAM_OUTBOX_ID=-1003438850052    # PAI Test Events
```

If not configured, integration tests will use production channels with a warning.

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

### Auto-Send Fixtures

For text, URL, photo, and document tests, auto-send via API:

```bash
# Send single test message and create fixture
ingest test send TEST-REG-001

# Send all supported fixtures
ingest test send --all
```

**Note:** Voice tests (`TEST-REG-005a/b`) require manual Telegram messages.

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
    ├── integration.ts  # Integration test runner
    ├── capture.ts      # Fixture capture
    ├── validate.ts     # Validation logic
    └── types.ts        # TypeScript types
```

## Adding New Tests

1. Create spec in appropriate `test/specs/*.spec.ts`
2. Run `ingest test send TEST-NEW-001` (for text/photo/doc) or capture manually (voice)
3. Run `ingest test run TEST-NEW-001` to verify
4. Commit fixture and spec

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

Run `ingest test capture TEST-ID` or `ingest test send TEST-ID`

### Media Tests Skipped

Add `--include-media` flag (requires active Telegram connection)

### Test Timeout

Increase timeout in `test/framework/runner.ts` (default: 60s)

### Content Validation Failing

- Content is checked against ALL vault files (Raw + Wisdom)
- Case-insensitive substring matching
- Check actual output in `test/output/run-*/TEST-ID/`
