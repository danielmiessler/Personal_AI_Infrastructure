/**
 * Scope Test Specifications
 *
 * Context separation with ~private/~work sigils.
 * Tests the scope hint detection in the ingest pipeline.
 *
 * Reference: docs/architecture/test-scripts.md - Part 12
 */

import type { TestSpec } from "../framework/types";

// =============================================================================
// Ingestion Tests - Scope Hint Detection
// =============================================================================

export const scopeIngestionSpecs: TestSpec[] = [
  {
    id: "TEST-SCOPE-001",
    name: "Explicit ~private sigil",
    category: "scope",
    fixture: "scope/TEST-SCOPE-001.json",
    input: {
      type: "text",
      description: "Text message with ~private prefix",
      example: "~private This is a personal health note",
    },
    expected: {
      tags: ["scope/private", "incoming", "source/telegram"],
      excludeTags: ["scope/work"],
      verboseOutput: ["Extracted scope hint: private"],
      // Pipeline not specified - may vary based on AI intent (not relevant to scope test)
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-001",
    },
  },

  {
    id: "TEST-SCOPE-002",
    name: "Explicit ~work sigil",
    category: "scope",
    fixture: "scope/TEST-SCOPE-002.json",
    input: {
      type: "text",
      description: "Text message with ~work prefix",
      example: "~work Meeting notes from the product team",
    },
    expected: {
      tags: ["scope/work", "incoming", "source/telegram"],
      excludeTags: ["scope/private"],
      verboseOutput: ["Extracted scope hint: work"],
      // Pipeline not specified - may vary based on AI intent (not relevant to scope test)
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-002",
    },
  },

  {
    id: "TEST-SCOPE-003",
    name: "Dictated scope - spoken 'scope private'",
    category: "scope",
    fixture: "scope/TEST-SCOPE-003.json",
    input: {
      type: "voice",
      description: "Voice memo with spoken 'Scope private' at the beginning",
      spokenKeywords: ["scope private", "doctor", "appointment"],
    },
    expected: {
      tags: ["scope/private"],
      verboseOutput: ["Extracted scope hint: private"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-003",
    },
  },

  {
    id: "TEST-SCOPE-004",
    name: "Dictated scope - 'this is personal'",
    category: "scope",
    fixture: "scope/TEST-SCOPE-004.json",
    input: {
      type: "text",
      description: "Text with natural language privacy indicator",
      example: "This is personal. Blood pressure reading 120/80",
    },
    expected: {
      tags: ["scope/private"],
      verboseOutput: ["Detected dictated scope intent: private from natural language"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-004",
    },
  },

  {
    id: "TEST-SCOPE-005",
    name: "Dictated scope - 'for work'",
    category: "scope",
    fixture: "scope/TEST-SCOPE-005.json",
    input: {
      type: "text",
      description: "Text with natural language work indicator",
      example: "For work. Architecture decision on data pipeline",
    },
    expected: {
      tags: ["scope/work"],
      verboseOutput: ["Detected dictated scope intent: work from natural language"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-005",
    },
  },

  {
    id: "TEST-SCOPE-006",
    name: "Archive pipeline auto-private",
    category: "scope",
    fixture: "scope/TEST-SCOPE-006.json",
    input: {
      type: "photo",
      description: "Photo with /archive command (no explicit scope)",
      caption: "/archive Personal receipt from pharmacy",
    },
    expected: {
      tags: ["scope/private"],
      verboseOutput: ["Auto-set scope to private for archive pipeline"],
      pipeline: "archive",
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-006",
    },
  },

  {
    id: "TEST-SCOPE-007",
    name: "Receipt pipeline auto-private",
    category: "scope",
    fixture: "scope/TEST-SCOPE-007.json",
    input: {
      type: "photo",
      description: "Photo with /archive command for invoice (no explicit scope)",
      caption: "/archive Home insurance invoice",
    },
    expected: {
      tags: ["scope/private"],
      verboseOutput: ["Auto-set scope to private for archive pipeline"],
      pipeline: "archive",
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-007",
    },
  },
];

// =============================================================================
// Retrieval Tests - Scope Filtering
// These test the obs CLI, not the ingest pipeline.
// Defined here for completeness but run differently (no Telegram fixtures).
// =============================================================================

export const scopeRetrievalSpecs: TestSpec[] = [
  {
    id: "TEST-SCOPE-010",
    name: "Default query excludes private",
    category: "scope",
    fixture: "scope/TEST-SCOPE-010.json",
    input: {
      type: "text",
      description: "obs search without --scope flag should exclude scope/private",
    },
    expected: {
      // This is a retrieval test - different validation
    },
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-010",
      setup: "Requires pre-existing notes with scope/private and scope/work tags",
    },
  },

  {
    id: "TEST-SCOPE-011",
    name: "Explicit --scope all",
    category: "scope",
    fixture: "scope/TEST-SCOPE-011.json",
    input: {
      type: "text",
      description: "obs search --scope all should return both private and work",
    },
    expected: {},
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-011",
      setup: "Requires pre-existing notes with different scopes",
    },
  },

  {
    id: "TEST-SCOPE-012",
    name: "Explicit --scope private",
    category: "scope",
    fixture: "scope/TEST-SCOPE-012.json",
    input: {
      type: "text",
      description: "obs search --scope private should only return private notes",
    },
    expected: {},
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-012",
    },
  },

  {
    id: "TEST-SCOPE-013",
    name: "Semantic search respects scope",
    category: "scope",
    fixture: "scope/TEST-SCOPE-013.json",
    input: {
      type: "text",
      description: "obs semantic with --scope should filter results",
    },
    expected: {},
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-013",
    },
  },

  {
    id: "TEST-SCOPE-014",
    name: "Context command respects scope",
    category: "scope",
    fixture: "scope/TEST-SCOPE-014.json",
    input: {
      type: "text",
      description: "obs context with --scope all should show all project notes",
    },
    expected: {},
    meta: {
      docRef: "test-scripts.md#TEST-SCOPE-014",
    },
  },
];

// =============================================================================
// Export all scope specs
// =============================================================================

export const scopeSpecs: TestSpec[] = [
  ...scopeIngestionSpecs,
  ...scopeRetrievalSpecs,
];

// Convenience: Just the ingest-testable specs
export const scopeIngestSpecs = scopeIngestionSpecs;
