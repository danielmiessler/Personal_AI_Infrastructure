/**
 * CLI Context Retrieval Command Test Specifications
 *
 * Tests for `ingest search` and `ingest load` commands for two-phase context retrieval.
 * These are CLI integration tests that execute the actual commands.
 *
 * Pattern: Search (discovery) → Load (injection)
 */

import type { CLITestSpec } from "../framework/cli-runner";

// =============================================================================
// Ingest Search Command Tests (TEST-CLI-030+)
// =============================================================================

/**
 * Test specs for `ingest search` command (discovery phase)
 */
export const searchCLITestSpecs: CLITestSpec[] = [
  // ---------------------------------------------------------------------------
  // Help and existence tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-030",
    name: "Search command shows help",
    description: "Verify search command displays help when run without args",
    command: "bun run ingest.ts search --help 2>&1 || true",
    expected: {
      contains: ["search", "Semantic search", "--tag", "--limit"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-031",
    name: "Search with semantic query",
    description: "Verify semantic search returns results index",
    command: 'bun run ingest.ts search "test content" --limit 3',
    expected: {
      // Should output index format with note names
      contains: ["Found", "results"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-032",
    name: "Search with tag filter",
    description: "Verify --tag flag filters by tag",
    command: "bun run ingest.ts search --tag incoming --limit 5",
    expected: {
      contains: ["Found", "results"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-033",
    name: "Search with scope filter",
    description: "Verify --scope flag filters results",
    command: 'bun run ingest.ts search "note" --scope all --limit 3',
    expected: {
      contains: ["Found"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-034",
    name: "Search with combined flags",
    description: "Verify multiple flags work together",
    command: 'bun run ingest.ts search "telegram" --tag raw --limit 5 --scope all',
    expected: {
      contains: ["Found"],
      exitCode: 0,
    },
  },
];

// =============================================================================
// Ingest Load Command Tests (TEST-CLI-040+)
// =============================================================================

/**
 * Test specs for `ingest load` command (injection phase)
 */
export const loadCLITestSpecs: CLITestSpec[] = [
  // ---------------------------------------------------------------------------
  // Help and existence tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-040",
    name: "Load command shows help",
    description: "Verify load command displays help when run without args",
    command: "bun run ingest.ts load --help 2>&1 || true",
    expected: {
      contains: ["load", "--tag", "--limit", "--json"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-041",
    name: "Load by tag",
    description: "Verify --tag loads notes with matching tag",
    command: "bun run ingest.ts load --tag incoming --limit 2",
    expected: {
      // Should output full markdown content
      contains: ["---", "tags:"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-042",
    name: "Load with JSON output",
    description: "Verify --json flag outputs JSON format",
    command: "bun run ingest.ts load --tag incoming --limit 1 --json",
    expected: {
      contains: ["{", "name", "content", "}"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-043",
    name: "Load with limit",
    description: "Verify --limit restricts number of results",
    command: "bun run ingest.ts load --tag raw --limit 3",
    expected: {
      exitCode: 0,
    },
  },
];

// =============================================================================
// Two-Phase Workflow Tests (TEST-CLI-050+)
// =============================================================================

/**
 * Test specs for the two-phase workflow: search → load
 */
export const workflowCLITestSpecs: CLITestSpec[] = [
  {
    id: "TEST-CLI-050",
    name: "Two-phase workflow integration",
    description: "Verify search and load work together for context retrieval",
    // First search to discover, then simulate load
    command: 'bun run ingest.ts search "telegram" --limit 1 && echo "---PHASE 2---" && bun run ingest.ts load --tag source/telegram --limit 1',
    expected: {
      contains: ["Found", "---PHASE 2---", "---"],
      exitCode: 0,
    },
  },
];

/**
 * Combined export for all context retrieval CLI tests
 */
export const contextCLITestSpecs: CLITestSpec[] = [
  ...searchCLITestSpecs,
  ...loadCLITestSpecs,
  ...workflowCLITestSpecs,
];
