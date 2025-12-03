/**
 * Test Framework Types
 *
 * Defines interfaces for test specifications, fixtures, and validation results.
 */

// =============================================================================
// Test Categories & Content Types
// =============================================================================

export type TestCategory = "scope" | "date" | "archive" | "regression" | "tag-matching";

export type ContentType = "text" | "voice" | "photo" | "document" | "url";

export type TestStatus = "no_fixture" | "has_fixture" | "passed" | "failed" | "skipped";

/** Logical groupings for focused test execution */
export type TestGroup =
  | "text-processing"
  | "url-processing"
  | "voice-hints"
  | "voice-transcription"
  | "photo-vision"
  | "photo-commands"
  | "document-archive"
  | "document-extraction"
  | "pattern-commands"
  | "metadata-extraction"
  | "ios-shortcuts";

// =============================================================================
// Test Specification
// =============================================================================

export interface TestSpec {
  /** Unique test identifier (e.g., TEST-SCOPE-001) */
  id: string;

  /** Human-readable test name */
  name: string;

  /** Test category for grouping */
  category: TestCategory;

  /** Logical group for focused execution (e.g., "voice-hints", "pattern-commands") */
  group?: TestGroup;

  /** Human-readable description of what this test validates */
  description?: string;

  /** Path to fixture file relative to fixtures/ */
  fixture: string;

  /** Input description (for capture guidance) */
  input: TestInput;

  /** Expected outcomes for validation */
  expected: TestExpectations;

  /** Test metadata */
  meta?: TestMeta;
}

export interface TestInput {
  /** Content type to send */
  type: ContentType;

  /** Human-readable description for capture mode */
  description: string;

  /** Example content to send during capture */
  example?: string;

  /** For voice: expected transcription keywords */
  spokenKeywords?: string[];

  /** For document: expected filename */
  filename?: string;

  /** Caption to include (for photo/document) */
  caption?: string;
}

export interface TestExpectations {
  /** Tags that MUST be present in output */
  tags?: string[];

  /** Tags that MUST NOT be present in output */
  excludeTags?: string[];

  /** Frontmatter field values to check */
  frontmatter?: Record<string, unknown>;

  /** Strings that should appear in verbose output */
  verboseOutput?: string[];

  /** Content checks on output file body */
  content?: {
    contains?: string[];
    notContains?: string[];
  };

  /** Pipeline that should be selected */
  pipeline?: string;

  /** For archive: expected filename pattern */
  archiveFilenamePattern?: string;

  /** Dropbox sync expected */
  dropboxSync?: boolean;

  /** Note filename should contain this date (YYYY-MM-DD) */
  noteFilenameDate?: string;

  /** Events channel notification checks */
  events?: {
    severity?: "info" | "success" | "warning" | "error";
    containsFields?: string[];
  };

  /** LLM-as-judge semantic validation */
  semantic?: SemanticValidation;
}

/** Configuration for LLM-based semantic validation */
export interface SemanticValidation {
  /** Description of what the output should achieve */
  description: string;

  /** Specific aspects to verify (passed as checkpoints to LLM) */
  checkpoints?: string[];

  /** Confidence threshold (0-100, default 80) */
  threshold?: number;

  /** Which file to validate: "raw", "wisdom", "any" (default: "wisdom") */
  target?: "raw" | "wisdom" | "any";
}

export interface TestMeta {
  /** Link to documentation section */
  docRef?: string;

  /** Skip this test (with reason) */
  skip?: string;

  /** Test requires specific setup */
  setup?: string;

  /** Dependencies on other tests */
  dependsOn?: string[];
}

// =============================================================================
// Fixture Format
// =============================================================================

export interface FixtureMeta {
  /** Test ID this fixture belongs to */
  testId: string;

  /** When fixture was captured */
  capturedAt: string;

  /** Who captured it */
  capturedBy?: string;

  /** Description of what was captured */
  description: string;

  /** For media: relative path to media file */
  mediaFile?: string;

  /** True if fixture was auto-sent via API (not manually captured) */
  autoSent?: boolean;
}

export interface Fixture {
  /** Fixture metadata */
  _meta: FixtureMeta;

  /** Raw Telegram message payload */
  message: TelegramMessage;
}

// Simplified Telegram message type (subset of full API)
export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  audio?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  document?: {
    file_id: string;
    file_unique_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
}

// =============================================================================
// Validation Results
// =============================================================================

export interface ValidationCheck {
  /** Name of the check */
  name: string;

  /** Whether check passed */
  passed: boolean;

  /** Expected value (for reporting) */
  expected?: unknown;

  /** Actual value found */
  actual?: unknown;

  /** Error message if failed */
  error?: string;

  /** Human-readable explanation of how validation was performed and why it passed/failed */
  reasoning?: string;
}

export interface ValidationResult {
  /** Test ID */
  testId: string;

  /** Overall pass/fail */
  passed: boolean;

  /** Test duration in ms */
  duration: number;

  /** Individual checks */
  checks: ValidationCheck[];

  /** Output file paths created */
  outputFiles?: string[];

  /** Captured verbose output */
  verboseOutput?: string;

  /** Error if test crashed */
  error?: string;
}

// =============================================================================
// Test Run Results
// =============================================================================

export interface TestRunSummary {
  /** When test run started */
  startedAt: string;

  /** When test run completed */
  completedAt: string;

  /** Total duration in ms */
  duration: number;

  /** Tests by status */
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };

  /** Individual test results */
  results: ValidationResult[];
}

// =============================================================================
// Capture State
// =============================================================================

export interface CaptureState {
  /** Test ID being captured */
  testId: string;

  /** Test spec for reference */
  spec: TestSpec;

  /** Telegram message offset to start from */
  startOffset: number;

  /** Timeout for capture (ms) */
  timeout: number;
}

// =============================================================================
// Runner Options
// =============================================================================

export interface RunnerOptions {
  /** Run specific test by ID */
  testId?: string;

  /** Run tests in category */
  suite?: TestCategory;

  /** Run all tests */
  all?: boolean;

  /** Verbose output */
  verbose?: boolean;

  /** Output format */
  format?: "console" | "json";

  /** Don't clean up test output files */
  keepOutput?: boolean;

  /** Include media tests (voice, photo, document) - slower, requires downloads */
  includeMedia?: boolean;
}

export interface CaptureOptions {
  /** Test ID to capture */
  testId?: string;

  /** Capture all missing fixtures */
  missing?: boolean;

  /** Timeout per capture (ms) */
  timeout?: number;
}
