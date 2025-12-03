/**
 * Date Test Specifications
 *
 * Document date hints for historical content.
 * Tests structured [date:...] metadata and dictated date detection.
 *
 * Reference: docs/architecture/test-scripts.md - Part 13
 */

import type { TestSpec } from "../framework/types";

// =============================================================================
// Structured Date Metadata Tests
// =============================================================================

export const dateStructuredSpecs: TestSpec[] = [
  {
    id: "TEST-DATE-001",
    name: "ISO date format [date:YYYY-MM-DD]",
    category: "date",
    fixture: "date/TEST-DATE-001.json",
    input: {
      type: "text",
      description: "Text with ISO date metadata for archive",
      example: "[date:2024-06-15] /archive Old contract from June",
    },
    expected: {
      frontmatter: {
        document_date: "2024-06-15",
      },
      verboseOutput: ["Extracted document date: 2024-06-15"],
      archiveFilenamePattern: "2024-06-15",
      pipeline: "archive",
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-001",
    },
  },

  {
    id: "TEST-DATE-002",
    name: "Slash date format [date:DD/MM/YYYY]",
    category: "date",
    fixture: "date/TEST-DATE-002.json",
    input: {
      type: "text",
      description: "Text with DD/MM/YYYY date format",
      example: "[date:15/06/2024] /receipt June receipt",
    },
    expected: {
      frontmatter: {
        document_date: "2024-06-15",
      },
      verboseOutput: ["Extracted document date: 2024-06-15"],
      pipeline: "receipt",
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-002",
    },
  },

  {
    id: "TEST-DATE-003",
    name: "Short year format [date:DD/MM/YY]",
    category: "date",
    fixture: "date/TEST-DATE-003.json",
    input: {
      type: "text",
      description: "Text with short year date format",
      example: "[date:15/06/24] /archive Document from June",
    },
    expected: {
      frontmatter: {
        document_date: "2024-06-15",
      },
      pipeline: "archive",
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-003",
    },
  },
];

// =============================================================================
// Dictated Date Detection Tests
// =============================================================================

export const dateDictatedSpecs: TestSpec[] = [
  {
    id: "TEST-DATE-010",
    name: "Dictated 'dated 15th June'",
    category: "date",
    fixture: "date/TEST-DATE-010.json",
    input: {
      type: "text",
      description: "Text with natural language date (ordinal + month)",
      example: "dated 15th June This is an old document",
    },
    expected: {
      frontmatter: {
        document_date: "2025-06-15", // Current year assumed
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-010",
    },
  },

  {
    id: "TEST-DATE-011",
    name: "Dictated 'from last month'",
    category: "date",
    fixture: "date/TEST-DATE-011.json",
    input: {
      type: "text",
      description: "Text with relative date reference",
      example: "from last month Receipt for home supplies",
    },
    expected: {
      // Date should be first day of previous month
      verboseOutput: ["Detected dictated document date"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-011",
    },
  },

  {
    id: "TEST-DATE-012",
    name: "Dictated 'from yesterday'",
    category: "date",
    fixture: "date/TEST-DATE-012.json",
    input: {
      type: "text",
      description: "Text with yesterday reference",
      example: "from yesterday Meeting notes",
    },
    expected: {
      // Date should be yesterday
      verboseOutput: ["Detected dictated document date"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-012",
    },
  },

  {
    id: "TEST-DATE-013",
    name: "Dictated ISO format 'date 2024-06-15'",
    category: "date",
    fixture: "date/TEST-DATE-013.json",
    input: {
      type: "text",
      description: "Spoken ISO date format",
      example: "date 2024-06-15 Contract document",
    },
    expected: {
      frontmatter: {
        document_date: "2024-06-15",
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-013",
    },
  },
];

// =============================================================================
// Note Filename with Document Date Tests
// =============================================================================

export const dateFilenameSpecs: TestSpec[] = [
  {
    id: "TEST-DATE-020",
    name: "Note filename uses document date",
    category: "date",
    fixture: "date/TEST-DATE-020.json",
    input: {
      type: "text",
      description: "Regular note with document date - filename should use that date",
      example: "[date:2023-03-15] Meeting notes from March",
    },
    expected: {
      noteFilenameDate: "2023-03-15",
      frontmatter: {
        document_date: "2023-03-15",
      },
      verboseOutput: ["Using document date for filename: 2023-03-15"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-020",
    },
  },

  {
    id: "TEST-DATE-021",
    name: "Archive uses document date",
    category: "date",
    fixture: "date/TEST-DATE-021.json",
    input: {
      type: "document",
      description: "Document with date hint - archive name should use that date",
      caption: "[date:2023-03-15] /archive Historic contract",
      filename: "contract.pdf",
    },
    expected: {
      archiveFilenamePattern: "20230315",
      noteFilenameDate: "2023-03-15",
      verboseOutput: ["Using document date for filename: 2023-03-15"],
      pipeline: "archive",
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-021",
    },
  },

  {
    id: "TEST-DATE-022",
    name: "Note without date uses today",
    category: "date",
    fixture: "date/TEST-DATE-022.json",
    input: {
      type: "text",
      description: "Regular note without date hint - should use today's date",
      example: "Regular meeting notes without any date hint",
    },
    expected: {
      // Note filename should be today's date (dynamic check)
      frontmatter: {
        // Should NOT have document_date field
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-DATE-022",
    },
  },
];

// =============================================================================
// Export all date specs
// =============================================================================

export const dateSpecs: TestSpec[] = [
  ...dateStructuredSpecs,
  ...dateDictatedSpecs,
  ...dateFilenameSpecs,
];

// Convenience: All date specs that can be tested via ingest
export const dateIngestSpecs = dateSpecs;
