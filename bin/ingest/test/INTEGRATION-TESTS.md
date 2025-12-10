# Integration Test Specification

## Overview

Integration tests validate the complete end-to-end flow of the ingest pipeline through real Telegram channels. Unlike unit tests which call `processMessage()` directly, integration tests:

1. Forward real messages through Telegram
2. Wait for the pipeline to process
3. Validate outputs in Events channel, Obsidian vault, and Dropbox

## Architecture

```
┌─────────────────────┐     Forward      ┌─────────────────────┐
│  PAI Test Cases     │ ───────────────► │   PAI Test Inbox    │
│  (fixture storage)  │                  │   (watcher polls)   │
└─────────────────────┘                  └──────────┬──────────┘
                                                    │
                                            Pipeline processes
                                                    │
                    ┌───────────────────────────────┼───────────────────────────────┐
                    ▼                               ▼                               ▼
         ┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
         │  Events Channel  │           │  Obsidian Vault  │           │  Dropbox Archive │
         │  (notification)  │           │  (markdown file) │           │  (for /archive)  │
         └──────────────────┘           └──────────────────┘           └──────────────────┘
```

## Channels Configuration

| Channel | Purpose | Config Key |
|---------|---------|------------|
| PAI Test Cases | Stores fixture messages | `TEST_TELEGRAM_CASES_ID` |
| PAI Test Inbox | Watcher polls for messages | `TELEGRAM_CHANNEL_ID` (test mode) |
| Test Events | Receives processing notifications | `TEST_TELEGRAM_OUTBOX_ID` |

## Test ID Correlation

Each test case includes a unique identifier `[TEST-XXX-NNN]` that allows correlation between input and output.

### Test ID Location by Content Type

| Content Type | Test ID Location | Correlation Method |
|--------------|------------------|-------------------|
| Text | In message text | Direct match in Events title |
| Photo/Document | In caption | Direct match in Events title |
| Voice (with caption) | In caption | Direct match in Events title |
| Voice (no caption) | Spoken in audio | Match in transcript/vault file content |
| Audio file | Spoken in audio | Match in transcript/vault file content |

### Correlation Strategy

1. **Primary**: Match `[TEST-XXX-NNN]` pattern in Events notification title
2. **Secondary**: Match in Events notification output file names
3. **Tertiary**: Match in vault file content (for transcribed audio)
4. **Fallback**: Sequential processing with timestamp correlation

## Test Execution Flow

```
1. Ensure watcher is running on Test Inbox
2. Record current timestamp
3. Get fixture message_id from Test Cases channel
4. Forward fixture to Test Inbox
5. Poll Events channel for notification (timeout: 90s)
   - For voice/audio: allow extra time for transcription
6. Extract outputs from notification:
   - output_paths → vault files
   - dropbox_path → archive location
   - status, pipeline, severity
7. Read vault file(s) and parse frontmatter
8. For archive tests: verify Dropbox file exists
9. Validate all outputs against spec.expected
10. Report pass/fail with detailed checks
```

## Expected Outcomes

Expected outcomes are defined in the spec files (`test/specs/*.ts`) using the `TestExpectations` interface:

### Tag Validation
```typescript
expected: {
  tags: ["scope/private", "source/telegram"],  // MUST be present
  excludeTags: ["scope/work"],                  // MUST NOT be present
}
```

### Frontmatter Validation
```typescript
expected: {
  frontmatter: {
    pipeline: "archive",
    document_type: "RECEIPT",
    document_category: "HOME",
  }
}
```

### Pipeline Selection
```typescript
expected: {
  pipeline: "archive",  // Checked in frontmatter.pipeline
}
```

### Archive File Naming
```typescript
expected: {
  archiveFilenamePattern: "^RECEIPT\\s*-\\s*\\d{8}\\s*-.*HOME",
  dropboxSync: true,
}
```

### Content Checks
```typescript
expected: {
  content: {
    contains: ["Dropbox", "_archive"],
    notContains: ["error", "failed"],
  }
}
```

### Events Notification
```typescript
expected: {
  events: {
    severity: "info",  // info | success | warning | error
    containsFields: ["output_paths", "dropbox_path"],
  }
}
```

### Note Filename Date
```typescript
expected: {
  noteFilenameDate: "2023-03-15",  // For date hint tests
}
```

## Voice Test Considerations

Voice tests require special handling because:

1. **Transcription time**: Allow 30-60s extra for Whisper transcription
2. **Test ID in audio**: Some voice tests have test ID spoken, not in caption
3. **Transcript correlation**: Must search vault file content for test ID

### Voice Test Categories

| Test Type | Caption | Spoken Content | Correlation |
|-----------|---------|----------------|-------------|
| TEST-VOICE-001 | `[TEST-VOICE-001]` | General content | Caption match |
| TEST-VOICE-002 | None | "Test voice 002..." | Vault content search |
| TEST-INGv2-130 | None | "hashtag project pai" | Vault content search |
| TEST-SCOPE-003 | None | "scope private..." | Vault content search |

## Running Integration Tests

### Prerequisites

1. Watcher running on Test Inbox:
   ```bash
   TELEGRAM_CHANNEL_ID=$TEST_INBOX_ID bun run ingest.ts watch --verbose
   ```

2. Events channel configured:
   ```bash
   export TELEGRAM_OUTBOX_ID=$TEST_EVENTS_ID
   ```

### CLI Commands

```bash
# Run single integration test
bun run ingest.ts test integration TEST-SCOPE-001

# Run all tests in a suite
bun run ingest.ts test integration --suite archive

# Run all integration tests
bun run ingest.ts test integration --all

# Verbose output
bun run ingest.ts test integration TEST-REG-001 --verbose

# Extended timeout for voice tests
bun run ingest.ts test integration TEST-VOICE-001 --timeout 120000
```

## Test Result Format

```typescript
interface IntegrationResult {
  testId: string;
  passed: boolean;
  duration: number;         // Total time from forward to validation
  processingTime: number;   // Time until Events notification received

  // Captured outputs
  eventsNotification?: {
    status: "success" | "failed";
    pipeline: string;
    severity: string;
    outputPaths: string[];
    dropboxPath?: string;
    messageId: number;
  };

  vaultFile?: {
    path: string;
    frontmatter: Record<string, unknown>;
    content: string;
  };

  dropboxFile?: {
    path: string;
    exists: boolean;
    filename: string;
  };

  // Validation checks
  checks: ValidationCheck[];
  error?: string;
}
```

## Failure Modes

| Failure | Cause | Resolution |
|---------|-------|------------|
| Timeout waiting for Events | Watcher not running | Start watcher |
| No vault file found | Processing failed silently | Check watcher logs |
| Dropbox file missing | Archive sync failed | Check Dropbox connection |
| Wrong pipeline selected | Intent detection failed | Review test input |
| Missing tags | Tag extraction logic bug | Debug tag extraction |
| Test ID not found | Voice transcription issue | Check Whisper output |

## Test Data Requirements

### Fixture Files

Each test requires a fixture in `test/fixtures/{category}/TEST-XXX.json`:

```json
{
  "_meta": {
    "testId": "TEST-SCOPE-001",
    "capturedAt": "2025-12-03T06:00:00.000Z",
    "capturedBy": "populate-channel",
    "description": "Explicit ~private sigil"
  },
  "message": {
    "message_id": 123,
    "chat": { "id": "$TEST_CASES_CHANNEL_ID", ... },
    "date": 1733123456,
    "text": "[TEST-SCOPE-001] ~private This is a personal health note"
  }
}
```

### Channel ID Sanitization

Fixtures use `$TEST_CASES_CHANNEL_ID` placeholder for channel IDs. The integration runner hydrates these with real values from environment at runtime.

## Cleanup

Integration tests create real files in the vault. Cleanup options:

1. **Test isolation**: Use separate test vault path
2. **Post-test cleanup**: Delete files matching test ID pattern
3. **Manual cleanup**: Review and delete test files periodically

## CI/CD Considerations

Integration tests require:
- Active Telegram bot with valid token
- Access to test channels
- Network connectivity
- Whisper API access (for voice tests)

For CI, consider:
1. Run unit tests always
2. Run integration tests on demand or nightly
3. Skip voice tests in quick CI (use `--exclude voice`)
