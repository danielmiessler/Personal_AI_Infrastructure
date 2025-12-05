# Test Framework Specification

> **Status:** Active
> **Version:** 2.0
> **Date:** 2025-12-04
> **Author:** Andreas (with Claude Code assistance)

## Quick Start Guide

### Prerequisites

1. PAI Ingest pipeline is installed and configured
2. Telegram Test Inbox is configured (see `ingest.ts` config)
3. Obsidian vault path is set in config
4. Bun runtime is available
5. **⚠️ Stop the background watcher before running tests**

### Stopping the Background Watcher

If you run tests on the same machine as your production pipeline, you **must stop the background watcher** to prevent it from picking up test messages and creating duplicate files:

```bash
# Check if watcher is running
ps aux | grep "ingest.ts watch"

# Stop the watcher (find the PID and kill it)
kill <PID>

# Or if using pm2/systemd:
pm2 stop ingest-watcher
# systemctl stop ingest-watcher

# After testing, restart the watcher:
bun run ingest.ts watch &
```

**Why?** The test framework sends messages to a separate Test Inbox channel, but the watcher might still interfere or create timing issues during test execution.

### Running Your First Test

```bash
cd bin/ingest

# Run a single test to verify setup
bun run ingest.ts test integration --id TEST-REG-001

# Run all regression tests
bun run ingest.ts test integration --suite regression

# Run tests in parallel (faster)
bun run ingest.ts test integration --suite regression --parallel
```

### Viewing Results

After running tests, check:
- **Console output:** Pass/fail summary with timing
- **Detailed report:** `test/output/integration-report.md`
- **Run history:** `test/output/test-history.json`

---

## 1. Testing Architecture

### 1.1 Unit Tests vs Integration Tests

This framework provides two types of tests that validate different aspects of the pipeline:

**Unit Tests** (`bun run ingest.ts test unit`)
- Test individual functions in isolation (metadata parsing, tag extraction, etc.)
- Run entirely locally with mock data
- Fast execution (~seconds)
- Don't require Telegram or external services

**Integration Tests** (`bun run ingest.ts test integration`)
- Test the full processing pipeline end-to-end
- Use captured fixtures (real Telegram message payloads)
- Call `processMessage()` directly (bypasses Telegram API)
- Slower execution (~minutes for full suite)
- Validate vault file output, frontmatter, tags, content

### 1.2 How Integration Tests Differ from Production

**⚠️ Important: Integration tests don't test the exact production path.**

| Aspect | Production Pipeline | Integration Tests |
|--------|---------------------|-------------------|
| **Entry Point** | Telegram webhook → `handleUpdate()` | Direct call to `processMessage()` |
| **Message Source** | Live Telegram API | Captured fixture JSON files |
| **Media Downloads** | Telegram file API | Pre-downloaded files in `fixtures/media/` |
| **Polling/Webhooks** | Active Telegram polling | Bypassed entirely |

**What's NOT tested by integration tests:**
- Telegram API connectivity and webhook handling
- Message offset tracking and duplicate prevention
- Rate limiting and retry logic
- Real-time media download from Telegram servers

**What IS tested:**
- Content classification and routing logic
- Pipeline selection (default, archive, etc.)
- AI processing (Vision, Jina, Fabric patterns)
- Frontmatter generation and tag assignment
- Vault file creation and content formatting

This design is intentional: it allows testing the core processing logic without requiring live Telegram interaction, which would be slow, flaky, and difficult to automate.

---

## 2. Overview

This framework provides comprehensive testing for the PAI Ingest pipeline, validating content processing from input (Telegram messages) to output (Obsidian vault files). It supports:

- **46 test cases** across 4 suites
- **Deterministic validation** (tags, pipeline, content)
- **LLM-as-judge semantic validation** for complex outputs
- **Persistent run tracking** across sessions
- **Detailed reasoning** explaining why each check passed/failed

### 1.1 Goals

1. **Pre-Release Verification** - Ensure changes don't break existing functionality
2. **Persistence** - Record every test execution with full context
3. **Visibility** - Track quality trends over time
4. **Extensibility** - Easy to add new test cases
5. **Semantic Validation** - Use LLM-as-judge for complex outcomes

### 1.2 Test Suites

| Suite | Tests | Description |
|-------|-------|-------------|
| `scope` | 7 | Scope detection (~private, ~work, natural language) |
| `date` | 10 | Document date extraction (ISO, dictated, relative) |
| `archive` | 8 | Archive pipeline and document classification |
| `regression` | 21 | Core functionality (text, URL, voice, photo, patterns) |

---

## 2. Pre-Release Verification Workflow

Before releasing any changes to the ingest pipeline, follow this verification process:

### 2.1 Quick Verification (5 minutes)

```bash
# Run critical regression tests
bun run ingest.ts test integration --suite regression --parallel
```

Expected: All tests pass (or known skipped tests)

### 2.2 Full Verification (15-30 minutes)

```bash
# Run all test suites
bun run ingest.ts test integration --suite scope --parallel
bun run ingest.ts test integration --suite date --parallel
bun run ingest.ts test integration --suite archive --parallel
bun run ingest.ts test integration --suite regression --parallel
```

### 2.3 LLM-as-Judge Review

After deterministic tests complete, Claude reviews outputs for tests requiring semantic validation:

1. **Identify tests needing review** (marked `semanticRequired: true`)
2. **Read vault output files** to verify content quality
3. **Record confidence scores** with reasoning

```bash
# Record semantic validation (Claude runs this)
bun run test/add-semantic-result.ts run-2025-12-04-001 TEST-PAT-001 true 90 "Meeting notes well-structured"
```

### 2.4 Verification Checklist

- [ ] All scope tests pass (7/7)
- [ ] All date tests pass (10/10)
- [ ] Archive tests pass (except known fixture issues)
- [ ] All regression tests pass (except known skips)
- [ ] Semantic validation complete for pattern tests
- [ ] No new regressions introduced

---

## 3. Test Case Structure

### 3.1 Test Hierarchy

```
Test Suite (category)
  └── Test Group (logical grouping)
       └── Test Case (TEST-XXX-NNN)
```

### 3.2 Test Groups

| Group | Description | Example Tests |
|-------|-------------|---------------|
| `text-processing` | Plain text message handling | REG-001, REG-002, REG-003 |
| `url-processing` | URL extraction via Jina AI | REG-004 |
| `voice-hints` | Caption-based hint extraction | REG-005a |
| `voice-transcription` | Spoken hint extraction | REG-005b |
| `photo-vision` | Vision AI default processing | REG-007, REG-008 |
| `photo-commands` | Photo commands (/ocr, /store, /describe) | PHOTO-001, PHOTO-002, PHOTO-003 |
| `document-archive` | PDF/document archival | REG-009 |
| `document-extraction` | DOCX/document content extraction | REG-010a |
| `pattern-commands` | Fabric pattern execution | PAT-001, PAT-002, PAT-003 |
| `metadata-extraction` | [key:value] and #tag extraction | REG-002, REG-003 |
| `ios-shortcuts` | iOS Shortcut clipboard workflows | REG-020 |

### 3.3 Test Specification Format

```typescript
interface TestSpec {
  id: string;                    // Unique identifier: TEST-XXX-NNN
  name: string;                  // Human-readable name
  category: TestCategory;        // Suite: scope, date, archive, regression
  group?: TestGroup;             // Logical group for focused execution
  description?: string;          // Human-readable expected outcome
  fixture: string;               // Path to fixture file
  input: TestInput;              // Input configuration
  expected: TestExpectations;    // Validation expectations
  meta?: {
    docRef?: string;             // Reference to documentation
    skip?: string;               // Skip reason (if skipped)
  };
}
```

---

## 4. Validation System

### 4.1 Deterministic Checks

Each test performs deterministic validation with detailed reasoning:

| Check Type | What It Validates | Example Reasoning |
|------------|-------------------|-------------------|
| `vault_file_created` | Markdown file exists | "Verified vault file created: 2025-12-04-Title.md (1500 chars)" |
| `pipeline:X` | Correct pipeline selected | "Checked frontmatter 'pipeline': 'archive' matches expected" |
| `tag_present:X` | Required tag exists | "Examined frontmatter tags [a,b,c] - found expected tag 'scope/work'" |
| `frontmatter:key` | Frontmatter field value | "Field 'source_device' = 'iphone' matches expected" |
| `content_contains:X` | Text in output content | "Searched vault content (1500 chars) - found 'SUMMARY'" |
| `archive_filename_pattern` | Archive filename format | "Verified filename matches pattern /RECEIPT-\d{8}/" |

### 4.2 Report Format

After tests complete, a detailed report is generated at `test/output/integration-report.md`:

```markdown
## Failed Tests

### TEST-ARC-001: Dictated archive intent

- **Category:** archive
- **Input Type:** document
- **Duration:** 3049ms

**Expected:**
- Pipeline: archive

**Actual:**
- Pipeline: archive
- Tags: incoming, raw, source/telegram

**Failed Checks:**
- frontmatter:document_type: Frontmatter "document_type" mismatch
  - Expected: "LEASE"
  - Actual: undefined
  - Reasoning: Examined vault file frontmatter: field "document_type" is missing

## Validation Details (Passed Tests)

Evidence examined for each passing test:

### TEST-SCOPE-001: Explicit ~private sigil

- **vault_file_created**: Verified vault file created: 2025-12-04-Title.md (150 chars)
- **tag_present:scope/private**: Examined frontmatter tags [scope/private, incoming] - found expected tag "scope/private"
```

---

## 5. LLM-as-Judge Semantic Validation

### 5.1 Overview

For complex outputs (pattern commands, vision AI), deterministic checks aren't sufficient. Claude acts as an LLM judge to verify semantic quality.

**Automated Approach:**
LLM-as-judge runs **by default** after tests complete. Claude (`claude -p`) automatically evaluates outputs for tests with semantic validation specs:

```bash
# Full run with LLM-as-judge (default)
bun run ingest.ts test run --verbose

# Skip LLM-as-judge for faster development iteration
bun run ingest.ts test run --skip-llm-judge
```

### 5.2 Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Run Tests with --llm-judge Flag                                │
│                                                                 │
│  bun run ingest.ts test run --llm-judge --verbose               │
│                                                                 │
│  1. Execute all tests (deterministic validation)                │
│  2. For tests with `semantic` spec:                             │
│     → Build evaluation prompt from checkpoints                  │
│     → Run `claude -p` to evaluate vault output                  │
│     → Record confidence scores and reasoning                    │
│  3. Save results to semantic-validation.json                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Output Display

Tests with semantic validation are marked with `[LLM-JUDGE]` in the output:

```
✓ TEST-REG-003: PASSED (5.3s) [LLM-JUDGE]    # Has semantic validation
✓ TEST-PAT-001: PASSED (12.4s) [LLM-JUDGE]   # Has semantic validation  
✓ TEST-SCOPE-001: PASSED (4.1s)               # No semantic (deterministic only)
```

After tests complete, LLM-as-judge results appear:

```
🤖 LLM-as-Judge Semantic Validation
══════════════════════════════════════════════════
Evaluating 9 tests from run: run-2025-12-05-001

  Evaluating TEST-PAT-001: /meeting-notes pattern command
    Running Claude evaluation...
    ✓ TEST-PAT-001: 85% confidence
      Meeting notes are well-structured with clear action items...

══════════════════════════════════════════════════
LLM-AS-JUDGE SUMMARY
══════════════════════════════════════════════════
Total:      9
Passed:     8
Failed:     1
Avg Conf:   82%
══════════════════════════════════════════════════
Results saved: test/output/run-2025-12-05-001/semantic-validation.json
```

### 5.3 Which Tests Have Semantic Validation?

Only tests where **deterministic checks can't fully validate quality** have semantic validation:

| Test ID | Type | Target | Why Semantic Validation? |
|---------|------|--------|-------------------------|
| TEST-PAT-001 | text | wisdom | Fabric `meeting_minutes` - structure & quality matters |
| TEST-PAT-002 | text | wisdom | Fabric `summarize` - summary accuracy matters |
| TEST-PAT-003 | text | wisdom | Fabric `extract_wisdom` - insight extraction quality |
| TEST-REG-003 | text | raw | Mixed metadata - verify all hints extracted correctly |
| TEST-REG-004 | url | wisdom | Jina AI + wisdom - verify relevant content extracted |
| TEST-REG-007 | photo | raw | Vision AI default - verify description is meaningful |
| TEST-REG-011 | photo | raw | Mermaid extraction - verify valid diagram syntax |
| TEST-REG-020 | document | raw | iOS clipboard - verify HTML→markdown conversion |
| TEST-PHOTO-001 | photo | raw | Vision `/describe` - verify description quality |

**Tests WITHOUT semantic validation (~40 tests):**

| Category | Why No Semantic? | Example |
|----------|------------------|---------|
| Scope detection | Deterministic: tag in frontmatter | TEST-SCOPE-001 |
| Date parsing | Deterministic: date in filename | TEST-DATE-001 |
| Pipeline routing | Deterministic: pipeline field | TEST-ARC-001 |
| Tag extraction | Deterministic: exact tag match | TEST-REG-002 |

### 5.4 Semantic Spec Structure

```typescript
interface SemanticValidation {
  description: string;       // What the output should achieve
  checkpoints?: string[];    // Specific things to verify
  target: "raw" | "wisdom";  // Which vault file to evaluate
  threshold?: number;        // Min confidence % for pass (default: 80)
}

// Example in test spec:
{
  id: "TEST-PAT-001",
  expected: {
    verboseOutput: ["meeting_minutes", "Fabric"],
    semantic: {
      description: "Well-structured meeting summary with key sections",
      checkpoints: [
        "Contains meeting structure sections (agenda, decisions, action items)",
        "Action items are identified with owners or placeholders",
        "Handles incomplete input gracefully (marks missing data as 'Not specified')",
      ],
      target: "wisdom",
      threshold: 80,
    },
  },
}
```

### 5.5 Confidence Thresholds

| Confidence | Interpretation |
|------------|----------------|
| 90-100% | Strong pass - output meets expectations clearly |
| 80-89% | Pass - output acceptable with minor observations |
| 70-79% | Marginal - may need review or spec adjustment |
| <70% | Fail - output does not meet expectations |

### 5.6 Adding Semantic Validation to a Test

**When to add:**
- ✅ Output is **generated by AI** (Fabric patterns, Vision AI, Jina)
- ✅ Output **quality matters** beyond keyword presence
- ✅ Deterministic checks **can't fully validate** correctness

**When NOT to add:**
- ❌ Output is **deterministic** (tag extraction, date parsing, pipeline routing)
- ❌ Simple **keyword/structure checks** are sufficient
- ❌ Test validates **routing logic** not content quality

**How to add:**

1. Add `semantic` field to test spec in `test/specs/*.spec.ts`:

```typescript
{
  id: "TEST-NEW-001",
  expected: {
    // Keep deterministic checks for basic validation
    tags: ["expected-tag"],
    verboseOutput: ["expected-log"],
    
    // Add semantic for quality evaluation
    semantic: {
      description: "What the AI output should achieve",
      checkpoints: [
        "Checkpoint 1: specific thing to verify",
        "Checkpoint 2: another thing to verify",
      ],
      target: "wisdom",  // or "raw"
      threshold: 80,
    },
  },
}
```

2. Run with `--llm-judge` to verify:

```bash
bun run ingest.ts test run TEST-NEW-001 --llm-judge --verbose
```

---

## 6. Media Test Configuration

### 6.1 Default Behavior

Media tests (voice, photo, document) **run by default** because they test core pipeline functionality:

```bash
# Full run including media (default)
bun run ingest.ts test run

# Skip media for faster development iteration
bun run ingest.ts test run --skip-media
```

### 6.2 Media Test Types

| Type | What It Tests | Typical Duration |
|------|---------------|------------------|
| `voice` | Deepgram transcription, spoken hint extraction | 10-30s |
| `photo` | Vision AI, mermaid extraction, OCR | 5-15s |
| `document` | PDF/DOCX processing, archive pipeline | 3-10s |

### 6.3 Why Media Tests Run by Default

**Rationale:** Media processing is critical functionality that should be validated on every test run:

1. **Voice transcription** - Deepgram API integration, spoken hint extraction
2. **Vision AI** - Image description, custom prompts, mermaid diagrams
3. **Document processing** - Archive naming, PDF handling, DOCX extraction

**The `--skip-media` flag exists for:**
- Fast development iteration (text-only changes)
- CI environments where media tests are run separately
- Debugging specific non-media test failures

### 6.4 Test Performance

| Run Type | Duration | Flags |
|----------|----------|-------|
| **Full validation** (default) | ~20-30 min | (none) |
| Skip LLM-as-judge | ~15-25 min | `--skip-llm-judge` |
| Skip media | ~8-15 min | `--skip-media` |
| **Quick smoke test** | ~5-8 min | `--skip-media --skip-llm-judge` |

```bash
# Full validation before release (default - includes media + LLM-as-judge)
bun run ingest.ts test run --verbose

# Quick smoke test during development
bun run ingest.ts test run --skip-media --skip-llm-judge --suite regression
```

---

## 7. Capturing Test Fixtures

Fixtures are captured Telegram messages used as test inputs. Each test case has a corresponding fixture file containing the raw Telegram message payload.

### 7.1 Fixture Types

| Content Type | Fixture Contains | Asset File |
|--------------|------------------|------------|
| `text` | Text message JSON | None |
| `url` | URL message JSON | None |
| `photo` | Photo message JSON | `media/TEST-XXX-photo.jpg` |
| `voice` | Voice message JSON | `media/TEST-XXX-voice.oga` |
| `document` | Document message JSON | `assets/filename.pdf` |

### 7.2 Fixture Data Sources

Fixtures contain two parts:

**1. Message JSON (always captured from Telegram)**
- The `message` object is a real Telegram message payload
- Contains message_id, chat, date, file_id references, etc.
- Captured via `test capture` or `test forward` commands

**2. Media Assets (can be local OR Telegram)**

| Source | When Used | Example |
|--------|-----------|---------|
| **Local file** | Documents, photos you prepare | `test/fixtures/assets/test-receipt.pdf` |
| **Telegram download** | Voice memos, shared photos | `test/fixtures/media/TEST-REG-005a-voice.oga` |

**Local files:** Place files in `test/fixtures/assets/`. The forward command uploads them to Telegram and captures the resulting fixture.

**Telegram downloads:** For voice messages (you must record them), the capture command downloads the audio from Telegram and saves to `fixtures/media/`.

### 7.3 Auto-Send Fixtures (Recommended for text/url/photo/document)

For text, URL, photo, and document tests, use the forward command to auto-create fixtures:

```bash
# Auto-send text fixture
bun run ingest.ts test forward TEST-REG-001
# → Sends example text from spec to Test Inbox
# → Automatically creates fixture JSON

# Auto-send photo with caption
bun run ingest.ts test forward TEST-PHOTO-001
# → Sends test photo with spec-defined caption
# → Creates fixture with photo file_id

# Auto-send document
bun run ingest.ts test forward TEST-ARC-001
# → Sends spec-defined document file
# → Creates fixture with document metadata
```

**Asset Files Required:**
- Photos: Place test image at `test/fixtures/assets/test-image.png`
- Documents: Place specific files in `test/fixtures/assets/` and reference in spec

### 7.4 Manual Capture (Required for voice/audio)

Voice tests require manual recording - send via Telegram, then capture:

```bash
# 1. Record and send voice memo to Test Inbox via Telegram app
# 2. Run capture to grab the most recent matching message:
bun run ingest.ts test capture TEST-REG-005a

# Output:
# ============================================================
# CAPTURE: TEST-REG-005a
# ============================================================
# Test: Voice memo with caption hints (Wispr Flow)
# Type: voice
# Expected input: Voice memo with dictated caption containing hints
# ------------------------------------------------------------
# Send your message to Telegram now...
# Waiting 120s for message...
# ✓ Message captured: message_id=12345
# ✓ Media downloaded: media/TEST-REG-005a-voice.oga
# ✓ Fixture saved: regression/TEST-REG-005a.json
```

### 7.5 Fixture File Structure

**Example: `test/fixtures/regression/TEST-REG-001.json`**
```json
{
  "_meta": {
    "testId": "TEST-REG-001",
    "capturedAt": "2025-12-04T10:30:00.000Z",
    "capturedBy": "andreas",
    "description": "Simple text message without hints",
    "autoSent": true
  },
  "message": {
    "message_id": 12345,
    "from": { "id": 123, "first_name": "Andreas" },
    "chat": { "id": "$TEST_CASES_CHANNEL_ID", "type": "channel" },
    "date": 1733305800,
    "text": "[TEST-REG-001] Regression test: Simple text message"
  }
}
```

**Example with media: `test/fixtures/regression/TEST-REG-005a.json`**
```json
{
  "_meta": {
    "testId": "TEST-REG-005a",
    "capturedAt": "2025-12-04T10:35:00.000Z",
    "description": "Voice memo with caption hints",
    "mediaFile": "media/TEST-REG-005a-voice.oga"
  },
  "message": {
    "message_id": 12346,
    "date": 1733305900,
    "caption": "#project-pai @ed_overy Testing voice hints",
    "voice": {
      "file_id": "AwACAgIAAxkB...",
      "duration": 15,
      "mime_type": "audio/ogg"
    }
  }
}
```

### 7.6 Adding New Document Assets

For document tests, place files in the assets directory:

```bash
# Add a new PDF for testing
cp ~/Downloads/sample-contract.pdf test/fixtures/assets/test-contract.pdf

# Reference in test spec:
{
  id: "TEST-ARC-030",
  input: {
    type: "document",
    filename: "test-contract.pdf",  // Relative to assets/
    caption: "archive this contract"
  }
}
```

### 7.7 Capturing Clipboard Content (iOS Shortcuts)

For iOS Shortcut clipboard tests:

1. Share content to Telegram via iOS Shortcut
2. Shortcut sends as document with metadata caption: `[source:clipboard][device:iphone]...`
3. Capture fixture:
```bash
bun run ingest.ts test capture TEST-REG-020
```

### 7.8 Bulk Fixture Generation

Generate fixtures for all missing tests:

```bash
# List tests missing fixtures
bun run ingest.ts test status

# Auto-send all auto-compatible tests
bun run ingest.ts test forward --missing

# Manually capture remaining (voice tests)
# ... send voice messages manually, then run capture
```

---

## 8. Adding New Test Cases

### 8.1 Step 1: Create Test Specification

Add to `test/specs/regression.spec.ts` (or appropriate category):

```typescript
export const myNewSpecs: TestSpec[] = [
  {
    id: "TEST-REG-030",
    name: "New feature test",
    category: "regression",
    group: "text-processing",
    description: "Validates new feature X works correctly",
    fixture: "regression/TEST-REG-030.json",
    input: {
      type: "text",
      description: "Text message testing feature X",
      example: "Test message for feature X",
    },
    expected: {
      pipeline: "default",
      tags: ["incoming", "raw", "source/telegram"],
      frontmatter: {
        feature_x: "expected_value",
      },
    },
  },
];
```

### 8.2 Step 2: Capture Fixture

Use auto-send for text/photo/document tests, or manual capture for voice:

```bash
# Auto-send (text/url/photo/document):
bun run ingest.ts test forward TEST-REG-030

# Or manual capture (after sending via Telegram):
bun run ingest.ts test capture TEST-REG-030
```

This creates `test/fixtures/regression/TEST-REG-030.json` with the Telegram message payload.

### 8.3 Step 3: Run and Verify

```bash
# Run the new test
bun run ingest.ts test integration --id TEST-REG-030

# Check results
cat test/output/integration-report.md
```

### 8.4 Step 4: Register in Spec Index

Add to `test/specs/index.ts`:

```typescript
import { myNewSpecs } from "./regression.spec";

export const allIngestSpecs: TestSpec[] = [
  ...existingSpecs,
  ...myNewSpecs,
];
```

---

## 9. CLI Commands Reference

### 9.1 Running Tests

```bash
# Run single test
bun run ingest.ts test integration --id TEST-REG-001

# Run test suite
bun run ingest.ts test integration --suite regression

# Run in parallel (faster)
bun run ingest.ts test integration --suite regression --parallel

# Run with longer timeout (for voice tests)
bun run ingest.ts test integration --suite regression --timeout 180000
```

### 9.2 Viewing Results

```bash
# Show run status by group
bun run ingest.ts test status

# Show specific run
bun run ingest.ts test status run-2025-12-04-001

# List all runs
bun run ingest.ts test runs

# Show test history
bun run ingest.ts test history TEST-REG-005a
```

### 9.3 Fixture Management

```bash
# Capture fixture for test
bun run ingest.ts test capture TEST-REG-030

# List fixture status
bun run ingest.ts test status
```

---

## 10. Directory Structure

```
test/
├── specs/                      # Test specifications
│   ├── index.ts                # Exports all specs
│   ├── regression.spec.ts      # Regression tests (21 cases)
│   ├── scope.spec.ts           # Scope detection tests (7 cases)
│   ├── date.spec.ts            # Date extraction tests (10 cases)
│   └── archive.spec.ts         # Archive tests (8 cases)
├── fixtures/                   # Captured test messages
│   ├── regression/
│   │   ├── TEST-REG-001.json
│   │   └── ...
│   └── assets/                 # Binary assets (images, audio, docs)
├── framework/                  # Test framework code
│   ├── runner.ts               # Unit test runner
│   ├── integration-runner.ts   # Integration test runner (main)
│   ├── validate.ts             # Validation logic with reasoning
│   ├── types.ts                # Type definitions
│   ├── run-tracker.ts          # Run tracking and persistence
│   └── report.ts               # Report generation
├── output/                     # Generated outputs
│   ├── runs/                   # Persisted run data
│   │   └── run-2025-12-04-001.json
│   ├── integration-report.md   # Detailed test report
│   └── test-history.json       # Test history tracking
├── add-semantic-result.ts      # CLI for LLM semantic validation
├── README.md                   # Quick reference
└── TEST-FRAMEWORK-SPEC.md      # This specification
```

---

## 11. Troubleshooting

### 11.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Fixture not found" | Test fixture not captured | Run `test capture TEST-XXX-NNN` |
| "Vault file not found" | Processing succeeded but file not saved | Check vault path in config |
| Test timeout | Voice/vision tests are slow | Use `--timeout 180000` |
| "Pipeline mismatch" | AI intent detection changed | Update spec or investigate |
| Vault files accumulating | Integration tests don't auto-cleanup | Manually delete test files |

### 11.2 Vault File Cleanup

**⚠️ Known Limitation:** Integration tests write files to the actual vault and do **NOT** clean them up automatically.

**Why?** Integration tests call `processMessage()` directly, which writes to the configured vault. Implementing automatic cleanup would risk accidentally deleting non-test files.

**Manual cleanup:**
```bash
# List test files in vault (look for [TEST-] prefix)
ls ~/Documents/andreas_brain/ | grep "\[TEST-"

# Remove test files
rm ~/Documents/andreas_brain/*\[TEST-*

# Or clean up files from a specific test date
rm ~/Documents/andreas_brain/2025-12-04-*\[TEST-*
```

**Recommendation:** Run tests on a dedicated test machine or use a separate vault path for testing.

**Unit tests:** Do have automatic cleanup via `keepOutput` flag - they write to a temporary `testOutputDir` which is deleted after each test.

### 11.3 Test Categories Explained

- **Passed:** Test completed and all checks passed
- **Failed:** Test completed but validation failed
- **Skipped:** Test intentionally skipped (fixture issue, requires specific setup)
- **Timeout:** Test exceeded time limit
- **Error:** Test crashed during execution

### 11.4 Debugging Failed Tests

1. **Read the report:** `test/output/integration-report.md`
2. **Check the reasoning:** Each check includes explanation of what was validated
3. **Examine output file:** Check the vault file path in "Actual" section
4. **Compare expected vs actual:** Tags, pipeline, frontmatter values
5. **Review verbose output:** Run with `--verbose` for console logs

---

## 12. Quality Metrics

### 12.1 Per-Test Metrics

- **Pass Rate:** % of runs where test passed
- **Trend:** `stable`, `improving`, `degrading`, `flaky`
- **Average Duration:** Mean execution time

### 12.2 Per-Suite Metrics

- **Suite Pass Rate:** % of tests passing
- **Coverage:** % of tests with fixtures
- **Semantic Completion:** % of semantic tests reviewed

### 12.3 Pre-Release Health Indicators

| Indicator | Target |
|-----------|--------|
| Regression Pass Rate | 100% (excluding known skips) |
| Scope Pass Rate | 100% |
| Date Pass Rate | 100% |
| Archive Pass Rate | >90% |
| Semantic Validation | Complete for all required tests |

---

## Appendix A: Example Test Session

```bash
# 1. Start test session
$ cd bin/ingest
$ bun run ingest.ts test integration --suite regression --parallel

🧪 Integration Test Runner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Running 18 integration tests (parallel, concurrency: 5)...

✓ TEST-REG-001: Simple text message (5200ms)
✓ TEST-REG-002: Text with metadata parsing (4800ms)
...
✗ TEST-REG-001: Simple text message - pipeline mismatch

==================================================
INTEGRATION TEST SUMMARY
==================================================
Total:   18
Passed:  16
Failed:  2
Duration: 389s

# 2. Review detailed report
$ cat test/output/integration-report.md

# 3. Fix issues and re-run failing tests
$ bun run ingest.ts test integration --id TEST-REG-001

# 4. Perform semantic validation (Claude runs this)
$ bun run test/add-semantic-result.ts run-2025-12-04-001 TEST-PAT-001 true 90 "Meeting notes well-structured"

# 5. Confirm all tests pass
$ bun run ingest.ts test integration --suite regression --parallel
```

---

## Appendix B: Future Enhancements

1. **HTML Dashboard** - Visual test results with charts
2. **CI/CD Integration** - GitHub Actions workflow
3. **Flaky Test Detection** - Automatic identification of unreliable tests
4. **Performance Benchmarks** - Track processing time trends
5. **Coverage Reports** - Code coverage analysis
