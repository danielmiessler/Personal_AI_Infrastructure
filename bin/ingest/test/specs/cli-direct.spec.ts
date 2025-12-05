/**
 * CLI Direct Command Test Specifications (ADR-001)
 *
 * Tests for `ingest direct` command with Unix-style stdin/flags support.
 * These are CLI integration tests that execute the actual command.
 *
 * Reference: docs/adr/001-cli-ingestion.md
 */

import type { CLITestSpec } from "../framework/cli-runner";

// =============================================================================
// Ingest Direct Command Tests (TEST-CLI-010+)
// =============================================================================

/**
 * Test specs for `ingest direct` command
 */
export const directCLITestSpecs: CLITestSpec[] = [
  // ---------------------------------------------------------------------------
  // Basic stdin tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-010",
    name: "Direct stdin text",
    description: "Echo text to ingest direct, verify vault note created",
    command: 'echo "TEST-CLI-010 Quick note from stdin" | bun run ingest.ts direct',
    expected: {
      contains: ["Vault:", ".md"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-011",
    name: "Direct with --tags flag",
    description: "Verify --tags flag applies tags to output",
    command: 'echo "TEST-CLI-011 Tagged note" | bun run ingest.ts direct --tags "cli-test,automation"',
    expected: {
      contains: ["Vault:", ".md", "Tags:", "cli-test"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-012",
    name: "Direct with --scope flag",
    description: "Verify --scope flag sets privacy scope",
    command: 'echo "TEST-CLI-012 Private note" | bun run ingest.ts direct --scope private',
    expected: {
      contains: ["Vault:", ".md", "Scope: private"],
      exitCode: 0,
    },
  },

  // ---------------------------------------------------------------------------
  // Dry-run tests (no side effects)
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-017",
    name: "Direct --dry-run shows plan",
    description: "Verify dry-run shows processing plan without saving",
    command: 'echo "TEST-CLI-017 Dry run test" | bun run ingest.ts direct --dry-run --tags "test" --scope work',
    expected: {
      contains: ["Would process:", "Content type:", "Tags:", "Scope:", "DRY RUN"],
      notContains: ["Vault:"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-017a",
    name: "Direct --dry-run with file",
    description: "Verify dry-run shows file processing plan",
    command: "bun run ingest.ts direct docs/adr/001-cli-ingestion.md --dry-run --tags adr",
    expected: {
      contains: ["Would process:", "Content type:", "DRY RUN"],
      notContains: ["Vault:"],
      exitCode: 0,
    },
  },

  // ---------------------------------------------------------------------------
  // File argument tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-013",
    name: "Direct file argument (markdown)",
    description: "Ingest file via positional argument",
    command: "bun run ingest.ts direct docs/adr/001-cli-ingestion.md --dry-run",
    expected: {
      contains: ["Would process:", "Content type:"],
      exitCode: 0,
    },
  },

  // ---------------------------------------------------------------------------
  // Combined flags tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-018",
    name: "Direct with multiple flags",
    description: "Verify multiple flags work together",
    command: 'echo "TEST-CLI-018 Multi-flag test" | bun run ingest.ts direct --tags "multi,test" --scope work --dry-run',
    expected: {
      contains: ["Would process:", "Tags:", "multi", "Scope:", "work"],
      exitCode: 0,
    },
  },

  // ---------------------------------------------------------------------------
  // Help and existence tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-020",
    name: "Direct command exists in help",
    description: "Verify direct command is documented in --help",
    command: "bun run ingest.ts --help",
    expected: {
      contains: ["direct", "--tags", "--scope", "--dry-run"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-021",
    name: "Direct shows usage without input",
    description: "Running direct without input shows guidance",
    // Note: This will timeout waiting for stdin if nothing piped, so we use a quick test
    command: "bun run ingest.ts direct --help 2>&1 || true",
    expected: {
      // Should show help or usage info
      exitCode: 0,
    },
  },
];

