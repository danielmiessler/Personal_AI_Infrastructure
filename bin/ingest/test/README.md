# Ingest Test Framework

A 4-layer automated testing pyramid for the ingest pipeline, from fast unit tests to full end-to-end acceptance workflows.

## Quick Reference

```bash
# Run ALL test layers (recommended for pre-release validation)
bun run ingest.ts test all

# Individual layers
bun run ingest.ts test run                    # Layer 1: Unit tests (~4 min)
bun run ingest.ts test integration --parallel  # Layer 2: Integration tests (~2 min)
bun run ingest.ts test cli                     # Layer 3: CLI tests (~3 min)
bun run ingest.ts test acceptance              # Layer 4: Acceptance tests (~8 min)

# Skip specific layers
bun run ingest.ts test all --skip-cli --skip-acceptance

# View test history
bun run ingest.ts test history
bun run ingest.ts test history --layer unit
```

## 4-Layer Test Pyramid

| Layer | Command | Duration | What It Tests |
|-------|---------|----------|---------------|
| **1. Unit** | `test run` | ~4 min | processMessage() with fixtures |
| **2. Integration** | `test integration` | ~2 min | Full Telegram → vault pipeline |
| **3. CLI** | `test cli` | ~3 min | obs search/semantic commands |
| **4. Acceptance** | `test acceptance` | ~8 min | End-to-end workflows via `claude -p` |

### Unified Test Runs

The `test all` command runs all layers in sequence and creates a **single unified history entry**:

```bash
bun run ingest.ts test all

# Output shows all layers with status:
# ════════════════════════════════════════════════════════════
# COMBINED TEST SUMMARY
# ════════════════════════════════════════════════════════════
#  Layer         Status   Passed  Failed   Total   Time
# ────────────────────────────────────────────────────────────
#  ✓ unit         run        30       0      30    45.2s
#  ✓ integration  run        15       0      15    62.1s
#  - cli          skipped
#  ✓ acceptance   run         5       0       5    48.3s
# ────────────────────────────────────────────────────────────
#  ✓ TOTAL                   50       0      50   155.6s
# ════════════════════════════════════════════════════════════
# Run ID: all-2025-12-04-18-45-30
```

Each layer can be:
- **executed** - ran with pass/fail results
- **skipped** - excluded via `--skip-*` flag

### Test History

Test results are tracked in `test/output/test-history.json`:

```bash
# View recent runs across all layers
bun run ingest.ts test history

# Filter by layer
bun run ingest.ts test history --layer unit
bun run ingest.ts test history --layer integration
bun run ingest.ts test history --layer all  # Unified runs only
```

Unified runs (layer="all") include a breakdown of each layer's results for detailed tracking.

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

## CLI Tests (Layer 3)

Tests two areas: `obs` CLI commands for vault retrieval, and `ingest direct` for Unix-style stdin ingestion.

### How It Works

1. **Ingest** test content via `ingest direct`
2. **Build** embeddings via `obs embed --incremental`
3. **Execute** obs/direct commands
4. **Validate** output contains expected results

### Commands

```bash
# Run all CLI tests (obs + direct)
bun run ingest.ts test cli

# Run specific test
bun run ingest.ts test cli CLI-001
bun run ingest.ts test cli TEST-CLI-010

# Skip embedding rebuild (if recently updated)
bun run ingest.ts test cli --skip-embeddings
```

### Available Tests

**obs CLI Tests:**

| Test ID | Description |
|---------|-------------|
| CLI-001 | Tag search finds ingested note |
| CLI-002 | Text search finds content |
| CLI-003 | Semantic search finds related content |
| CLI-004 | Scope filter excludes private from work |
| CLI-005 | Scope filter includes private with --scope |
| CLI-006 | obs tags lists vault tags |
| CLI-007 | obs read retrieves note content |

**ingest direct Tests (ADR-001):**

| Test ID | Description |
|---------|-------------|
| TEST-CLI-010 | Direct stdin text ingestion |
| TEST-CLI-011 | Direct with --tags flag |
| TEST-CLI-012 | Direct with --scope flag |
| TEST-CLI-013 | Direct file argument (markdown) |
| TEST-CLI-017 | Direct --dry-run shows plan |
| TEST-CLI-017a | Direct --dry-run with file |
| TEST-CLI-018 | Direct with multiple flags |
| TEST-CLI-020 | Direct command exists in help |
| TEST-CLI-021 | Direct shows usage without input |

See `docs/adr/001-cli-ingestion.md` for design details.

## Acceptance Tests (Layer 4)

End-to-end workflow tests using `claude -p` (Claude Code non-interactive mode).

### How It Works

1. **Send** natural language prompt to Claude via `claude -p`
2. **Claude** executes commands (ingest, obs, etc.)
3. **Validate** output and side effects
4. **Report** pass/fail based on Claude's response

### Commands

```bash
# Run all acceptance tests
bun run ingest.ts test acceptance

# Run specific test
bun run ingest.ts test acceptance ACC-001
```

### Available Tests

| Test ID | Description |
|---------|-------------|
| ACC-001 | Ingest text note via direct command |
| ACC-002 | Search for ingested content |
| ACC-003 | Check test history command |
| ACC-004 | Multi-step workflow: ingest and retrieve |
| ACC-005 | Tag search after ingest |
| ACC-006 | Context loading workflow: search → read |
| ACC-007 | Semantic search context loading |

### Writing Acceptance Tests

Acceptance tests use natural language prompts that ask Claude to:
1. Execute commands
2. Report SUCCESS or FAILURE based on results

```typescript
{
  id: "ACC-001",
  name: "Ingest text note via direct command",
  prompt: `Run this exact command and report if it succeeded:
    bun run ingest.ts direct --text "Test note" --caption "#test"
    Report SUCCESS if completed, or FAILURE if error.`,
  expected: {
    outputContains: ["SUCCESS"],
    outputNotContains: ["FAILURE"],
  },
}
```

## Daemon Deployment Test

Self-contained test that verifies the watch daemon is working correctly. Run this before deploying to production or to diagnose daemon issues.

**Note:** This test runs separately from `test all` since it requires starting an actual daemon process.

### How It Works

1. **Start** watch daemon in background
2. **Send** a test message via Telegram API
3. **Wait** for Events notification (polls outbox)
4. **Validate** vault file was created
5. **Report** pass/fail
6. **Cleanup** daemon process and test file

### Commands

```bash
# Test with production channels
bun run ingest.ts test daemon

# Test with test channels (safer)
bun run ingest.ts test daemon --test

# Custom timeout (default 90s)
bun run ingest.ts test daemon --timeout 60

# Keep test file in vault for debugging
bun run ingest.ts test daemon --no-cleanup
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--test` | Use test channels instead of production | Off (production) |
| `--timeout N` | Timeout in seconds | 90 |
| `--verbose` | Show detailed output | On |
| `--no-cleanup` | Keep test file in vault | Off |

### When to Use

- Pre-deployment verification
- Diagnosing daemon issues
- Verifying Telegram connectivity
- Testing after configuration changes

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
    ├── runner.ts              # Layer 1: Unit test runner
    ├── integration-runner.ts  # Layer 2: Integration test runner
    ├── cli-runner.ts          # Layer 3: CLI test runner
    ├── acceptance-runner.ts   # Layer 4: Acceptance test runner
    ├── capture.ts             # Fixture capture
    ├── validate.ts            # Validation logic
    ├── report.ts              # Report generation & history tracking
    └── types.ts               # TypeScript types
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
