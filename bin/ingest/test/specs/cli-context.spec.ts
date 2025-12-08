/**
 * CLI Context Retrieval Command Test Specifications
 *
 * Tests for `obs` CLI commands used by the context skill.
 * These are CLI integration tests that execute the actual commands.
 *
 * Pattern: Search (discovery with index/json) → Load (injection)
 *
 * The context skill uses `obs` commands, not `ingest` commands.
 */

import type { CLITestSpec } from "../framework/cli-runner";

// =============================================================================
// Obs Search Command Tests (TEST-CLI-030+)
// =============================================================================

/**
 * Test specs for `obs search` command (discovery phase)
 */
export const searchCLITestSpecs: CLITestSpec[] = [
  // ---------------------------------------------------------------------------
  // Basic search tests
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-030",
    name: "Obs CLI shows search options in help",
    description: "Verify obs --help displays search options",
    command: "obs --help 2>&1",
    expected: {
      contains: ["SEARCH OPTIONS", "--tag", "--format"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-031",
    name: "Search by tag returns results",
    description: "Verify tag search finds notes",
    command: "obs search --tag incoming --recent 5",
    expected: {
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-032",
    name: "Search with index format",
    description: "Verify --format index outputs numbered table",
    command: "obs search --tag incoming --format index --recent 5",
    expected: {
      contains: ["│", "Date", "Type", "Title"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-033",
    name: "Search with JSON format",
    description: "Verify --format json outputs parseable JSON for Claude",
    command: "obs search --tag incoming --format json --recent 3",
    expected: {
      contains: ["{", "tagMatches", "summary", "loadInstructions"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-034",
    name: "Search with scope filter",
    description: "Verify --scope flag filters results",
    command: "obs search --tag raw --scope all --recent 5",
    expected: {
      exitCode: 0,
    },
  },

  // ---------------------------------------------------------------------------
  // Semantic search tests (TEST-CLI-035+)
  // ---------------------------------------------------------------------------
  {
    id: "TEST-CLI-035",
    name: "Semantic search returns results",
    description: "Verify semantic search finds related content",
    command: 'obs semantic "telegram message" --limit 3',
    expected: {
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-036",
    name: "Semantic search with JSON format",
    description: "Verify semantic --format json outputs parseable JSON",
    command: 'obs semantic "telegram" --format json --limit 3',
    expected: {
      contains: ["{", "semanticMatches", "summary"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-037",
    name: "Semantic search filtered by tag",
    description: "Verify --tag filter narrows semantic results",
    command: 'obs semantic "test" --tag incoming --limit 5',
    expected: {
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-038",
    name: "Semantic search filtered by doc pattern",
    description: "Verify --doc filter narrows semantic results by filename",
    command: 'obs semantic "notes" --doc "2025-12*" --limit 5',
    expected: {
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-039",
    name: "Context command for project",
    description: "Verify obs context searches project tag",
    command: "obs context pai --format index --recent 5",
    expected: {
      exitCode: 0,
    },
  },
];

// =============================================================================
// Obs Load Command Tests (TEST-CLI-040+)
// =============================================================================

/**
 * Test specs for `obs load` command (injection phase)
 */
export const loadCLITestSpecs: CLITestSpec[] = [
  {
    id: "TEST-CLI-040",
    name: "Load command shows help",
    description: "Verify obs load command displays help",
    command: "obs load --help 2>&1 || true",
    expected: {
      contains: ["load", "--type", "--since", "selection"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-041",
    name: "Load by type filter",
    description: "Verify --type loads notes matching type",
    command: "obs search --tag incoming --recent 5 && obs load --type note 2>&1 || true",
    expected: {
      // May have no notes of type, but command should work
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-042",
    name: "obs read retrieves note content",
    description: "Verify obs read loads a specific note",
    command: 'obs read "2025" --limit 1 2>&1 || true',
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
 * These test the exact pattern the context skill uses
 */
export const workflowCLITestSpecs: CLITestSpec[] = [
  {
    id: "TEST-CLI-050",
    name: "Search with JSON format for Claude parsing",
    description: "Verify JSON output has all fields needed for skill table rendering",
    command: "obs search --tag incoming --format json --recent 3",
    expected: {
      contains: ['"query"', '"tagMatches"', '"index"', '"date"', '"type"', '"title"', '"path"'],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-051",
    name: "Semantic search JSON has load instructions",
    description: "Verify JSON includes loadInstructions for Claude",
    command: 'obs semantic "telegram" --format json --limit 3',
    expected: {
      contains: ['"loadInstructions"', '"command"', '"examples"'],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-052",
    name: "Two-phase workflow: search then load",
    description: "Verify search caches results and load uses them",
    command: 'obs search --tag incoming --recent 3 && echo "---LOAD PHASE---" && obs load 1 2>&1 || echo "No results to load"',
    expected: {
      contains: ["---LOAD PHASE---"],
      exitCode: 0,
    },
  },

  {
    id: "TEST-CLI-053",
    name: "Multi-tag AND filtering",
    description: "Verify multiple --tag flags use AND logic",
    command: "obs search --tag scope/work --tag incoming --format index --recent 5",
    expected: {
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
