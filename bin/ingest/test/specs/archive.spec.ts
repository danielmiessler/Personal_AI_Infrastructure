/**
 * Archive Test Specifications
 *
 * Archive pipeline with naming conventions, pre-named file preservation,
 * and Dropbox sync.
 *
 * Reference: docs/architecture/test-scripts.md - Part 10
 * Reference: docs/architecture/ingest-pipeline-v2.md - Archive Naming Convention
 */

import type { TestSpec } from "../framework/types";

// =============================================================================
// Archive Naming Tests
// =============================================================================

export const archiveNamingSpecs: TestSpec[] = [
  {
    id: "TEST-INGv2-100",
    name: "Archive with auto-naming",
    category: "archive",
    fixture: "archive/TEST-INGv2-100.json",
    input: {
      type: "document",
      description: "Document with /archive command - should generate structured name",
      caption: "/archive [type:RECEIPT][category:CABIN] Bunnings Timber, Polystyrene, Concrete $470.36",
      filename: "receipt.pdf",
    },
    expected: {
      archiveFilenamePattern: "^RECEIPT\\s*-\\s*\\d{8}\\s*-.*CABIN",
      frontmatter: {
        document_type: "RECEIPT",
        document_category: "CABIN",
      },
      pipeline: "archive",
      dropboxSync: true,
      verboseOutput: ["Generated archive name"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-INGv2-100",
    },
  },

  {
    id: "TEST-INGv2-101",
    name: "Pre-named file preserved",
    category: "archive",
    fixture: "archive/TEST-INGv2-101.json",
    input: {
      type: "document",
      description: "Document already following naming convention - should NOT be renamed",
      caption: "/archive",
      filename: "CONTRACT - 20220601 - Southern Cross Travel Insurance.pdf",
    },
    expected: {
      // Filename should be preserved exactly (dash format)
      archiveFilenamePattern: "^CONTRACT - 20220601 - Southern Cross Travel Insurance\\.pdf$",
      pipeline: "archive",
      dropboxSync: true,
      verboseOutput: ["Preserving archive name"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-INGv2-101",
    },
  },
];

// =============================================================================
// Archive Intent Detection Tests
// =============================================================================

export const archiveIntentSpecs: TestSpec[] = [
  {
    id: "TEST-ARC-001",
    name: "Dictated archive intent",
    category: "archive",
    fixture: "archive/TEST-ARC-001.json",
    input: {
      type: "document",
      description: "Document with dictated archive intent (no /command)",
      caption: "archive this lease agreement for the house",
      filename: "lease.pdf",
    },
    expected: {
      pipeline: "archive",
      frontmatter: {
        document_type: "LEASE",
        document_category: "HOME",
      },
      verboseOutput: ["Detected dictated pipeline intent: archive"],
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-ARC-001",
    },
  },

  {
    id: "TEST-ARC-002",
    name: "Dictated receipt intent",
    category: "archive",
    fixture: "archive/TEST-ARC-002.json",
    input: {
      type: "photo",
      description: "Photo with dictated receipt intent",
      caption: "Archive this invoice",
    },
    expected: {
      pipeline: "archive",
      frontmatter: {
        document_type: "INVOICE",
      },
      verboseOutput: ["Detected dictated pipeline intent: archive"],
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-ARC-002",
    },
  },

  {
    id: "TEST-ARC-003",
    name: "Dictated archive with contract detection",
    category: "archive",
    fixture: "archive/TEST-ARC-003.json",
    input: {
      type: "document",
      description: "Document with contract keyword in caption",
      caption: "this is my work contract",
      filename: "document.pdf",
    },
    expected: {
      pipeline: "archive",
      frontmatter: {
        document_type: "CONTRACT",
        document_category: "WORK",
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-ARC-003",
    },
  },

  {
    id: "TEST-ARC-004",
    name: "Dictated archive with certificate detection",
    category: "archive",
    fixture: "archive/TEST-ARC-004.json",
    input: {
      type: "document",
      description: "Document with medical certificate keywords",
      caption: "my medical certificate from the doctor",
      filename: "cert.pdf",
    },
    expected: {
      pipeline: "archive",
      frontmatter: {
        document_type: "CERTIFICATE",
        document_category: "HEALTH",
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-ARC-004",
    },
  },

  {
    id: "TEST-ARC-005",
    name: "Vision AI document type detection",
    category: "archive",
    fixture: "archive/TEST-ARC-005.json",
    input: {
      type: "photo",
      description: "Photo of invoice with /archive but no type specified",
      caption: "/archive",
    },
    expected: {
      pipeline: "archive",
      // Vision AI should detect INVOICE from image content
      verboseOutput: ["Detected document type from content"],
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-ARC-005",
      setup: "Requires photo of a document with visible type indicators (e.g., 'Tax Invoice')",
    },
  },
];

// =============================================================================
// Archive Markdown Metadata Tests
// =============================================================================

export const archiveMetadataSpecs: TestSpec[] = [
  {
    id: "TEST-ARC-010",
    name: "Archive creates markdown with Dropbox link",
    category: "archive",
    fixture: "archive/TEST-ARC-010.json",
    input: {
      type: "document",
      description: "Archived document should have markdown with clickable Dropbox path",
      caption: "/archive Work document",
      filename: "report.pdf",
    },
    expected: {
      pipeline: "archive",
      frontmatter: {
        archive_path: "string", // Should contain Dropbox path
      },
      content: {
        contains: ["Dropbox", "_archive"],
      },
      dropboxSync: true,
    },
    meta: {
      docRef: "ingest-pipeline-v2.md",
    },
  },
];

// =============================================================================
// Attach Pipeline Tests (default for documents)
// =============================================================================

export const attachPipelineSpecs: TestSpec[] = [
  {
    id: "TEST-ATTACH-001",
    name: "Default document pipeline is /attach",
    category: "archive",
    fixture: "archive/TEST-ATTACH-001.json",
    input: {
      type: "document",
      description: "Document without explicit command - should default to attach",
      caption: "#project/pai Meeting transcript",
      filename: "meeting-notes.docx",
    },
    expected: {
      pipeline: "attach",
      frontmatter: {
        original_filename: "meeting-notes.docx",
        attachment: "string",  // Should have attachments/ path
      },
      content: {
        contains: ["Attachment", "attachments/"],
      },
    },
    meta: {
      docRef: "ingest-pipeline-v2.md",
    },
  },

  {
    id: "TEST-ATTACH-002",
    name: "Metadata tags don't trigger archive pipeline",
    category: "archive",
    fixture: "archive/TEST-ATTACH-002.json",
    input: {
      type: "document",
      description: "Document with [source:file] metadata - should NOT trigger archive",
      caption: "[source:file][device:mac][user:andreas] #project/test",
      filename: "CONTRACT_20220601_Southern_Cross_Certificate_of_Insurance,_Travel.pdf",
    },
    expected: {
      pipeline: "attach",  // NOT archive (source:file shouldn't match - despite filename)
      frontmatter: {
        source_shortcut: "file",
        source_device: "mac",
        original_filename: "CONTRACT_20220601_Southern_Cross_Certificate_of_Insurance,_Travel.pdf",
      },
    },
    meta: {
      docRef: "Bug fix: metadata tags like [source:file] shouldn't trigger archive intent",
    },
  },
];

// =============================================================================
// Export all archive specs
// =============================================================================

export const archiveSpecs: TestSpec[] = [
  ...archiveNamingSpecs,
  ...archiveIntentSpecs,
  ...archiveMetadataSpecs,
  ...attachPipelineSpecs,
];

// Convenience: All archive specs that can be tested via ingest
export const archiveIngestSpecs = archiveSpecs;
