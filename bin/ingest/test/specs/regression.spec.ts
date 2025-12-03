/**
 * Regression Test Specifications
 *
 * Core functionality tests validated during v2 implementation.
 * These ensure basic pipeline functionality continues to work.
 *
 * Reference: docs/architecture/test-scripts.md - Part 11
 */

import type { TestSpec } from "../framework/types";

// =============================================================================
// Core Text Processing
// =============================================================================

export const regressionTextSpecs: TestSpec[] = [
  {
    id: "TEST-REG-001",
    name: "Simple text message",
    category: "regression",
    fixture: "regression/TEST-REG-001.json",
    input: {
      type: "text",
      description: "Plain text without hints or metadata",
      example: "Regression test: Simple text message without any metadata or hints",
    },
    expected: {
      tags: ["incoming", "raw", "source/telegram"],
      pipeline: "default",
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-001",
    },
  },

  {
    id: "TEST-REG-002",
    name: "Text with metadata parsing",
    category: "regression",
    fixture: "regression/TEST-REG-002.json",
    input: {
      type: "text",
      description: "Text with [key:value] metadata",
      example: "[source:clipboard-share][device:iphone][user:andreas] Testing metadata extraction from iOS shortcut",
    },
    expected: {
      frontmatter: {
        source_shortcut: "clipboard-share",
        source_device: "iphone",
        source_user: "andreas",
      },
      pipeline: "default",
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-002",
    },
  },

  {
    id: "TEST-REG-003",
    name: "Mixed hints and metadata",
    category: "regression",
    fixture: "regression/TEST-REG-003.json",
    input: {
      type: "text",
      description: "Text with tags, people, and metadata combined",
      example: "#project/pai @ed_overy [source:voice-memo][device:mac] Discussion about context retrieval feature",
    },
    expected: {
      tags: ["project/pai", "ed_overy"],
      frontmatter: {
        source_shortcut: "voice-memo",
        source_device: "mac",
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-003",
    },
  },
];

// =============================================================================
// URL Processing
// =============================================================================

export const regressionUrlSpecs: TestSpec[] = [
  {
    id: "TEST-REG-004",
    name: "URL extraction via Jina AI",
    category: "regression",
    fixture: "regression/TEST-REG-004.json",
    input: {
      type: "url",
      description: "URL-only message - should fetch via Jina AI Reader",
      example: "https://www.anthropic.com/news/claude-4",
    },
    expected: {
      pipeline: "default",
      content: {
        contains: ["Claude", "Anthropic"],
      },
      verboseOutput: ["Jina AI Reader"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-004",
    },
  },
];

// =============================================================================
// Voice Processing
// =============================================================================

export const regressionVoiceSpecs: TestSpec[] = [
  {
    id: "TEST-REG-005a",
    name: "Voice memo with caption hints (Wispr Flow)",
    category: "regression",
    fixture: "regression/TEST-REG-005a.json",
    input: {
      type: "voice",
      description: "Voice memo with dictated caption containing hints",
      caption: "#Project-pai @Ed Overy, testing the spoken hints feature",
    },
    expected: {
      tags: ["project-pai", "ed_overy"],
      verboseOutput: ["Transcribed"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-005a",
    },
  },

  {
    id: "TEST-REG-005b",
    name: "Voice memo with spoken hints (no caption)",
    category: "regression",
    fixture: "regression/TEST-REG-005b.json",
    input: {
      type: "voice",
      description: "Voice memo with hints spoken in audio, no caption",
      spokenKeywords: ["hashtag project pai", "at ed overy", "meeting notes"],
    },
    expected: {
      tags: ["project-pai", "ed_overy"],
      verboseOutput: ["Extracted spoken hint"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-005b",
    },
  },
];

// =============================================================================
// Photo Processing
// =============================================================================

export const regressionPhotoSpecs: TestSpec[] = [
  {
    id: "TEST-REG-007",
    name: "Photo with Vision AI (default)",
    category: "regression",
    fixture: "regression/TEST-REG-007.json",
    input: {
      type: "photo",
      description: "Photo without caption - should use Vision AI default description",
    },
    expected: {
      verboseOutput: ["Vision API"],
      content: {
        contains: ["**Analysis:**"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-007",
    },
  },

  {
    id: "TEST-REG-008",
    name: "Photo with custom prompt",
    category: "regression",
    fixture: "regression/TEST-REG-008.json",
    input: {
      type: "photo",
      description: "Photo with caption as Vision AI prompt",
      caption: "Extract all text from this screenshot",
    },
    expected: {
      verboseOutput: ["Vision API", "Extract all text"],
      content: {
        contains: ["**Prompt:**", "**Analysis:**"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-008",
    },
  },

  {
    id: "TEST-REG-011",
    name: "Mermaid extraction with /mermaid command",
    category: "regression",
    fixture: "regression/TEST-REG-011.json",
    input: {
      type: "photo",
      description: "Screenshot of diagram with /mermaid command",
      caption: "/mermaid",
    },
    expected: {
      verboseOutput: ["Vision API", "Mermaid syntax fix"],
      content: {
        contains: ["```mermaid"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-011",
    },
  },

  {
    id: "TEST-REG-012",
    name: "Mermaid extraction with dictated intent",
    category: "regression",
    fixture: "regression/TEST-REG-012.json",
    input: {
      type: "photo",
      description: "Screenshot with dictated request to extract mermaid diagram",
      caption: "Extract the mermaid diagram from this flowchart",
    },
    expected: {
      verboseOutput: ["Vision API"],
      content: {
        contains: ["```mermaid"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-012",
    },
  },
];

// =============================================================================
// Document Processing
// =============================================================================

export const regressionDocSpecs: TestSpec[] = [
  {
    id: "TEST-REG-009",
    name: "PDF document extraction",
    category: "regression",
    fixture: "regression/TEST-REG-009.json",
    input: {
      type: "document",
      description: "PDF document - should extract via marker",
      filename: "test-document.pdf",
    },
    expected: {
      verboseOutput: ["marker", "Extracted"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-009",
    },
  },

  {
    id: "TEST-REG-010a",
    name: "DOCX plain extraction (no wisdom)",
    category: "regression",
    fixture: "regression/TEST-REG-010a.json",
    input: {
      type: "document",
      description: "DOCX without caption - should only create raw note",
      filename: "meeting-notes.docx",
    },
    expected: {
      tags: ["incoming", "raw", "source/telegram"],
      // Should NOT have wisdom note
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-010a",
    },
  },

  {
    id: "TEST-REG-020",
    name: "iPhone clipboard via iOS shortcut",
    category: "regression",
    fixture: "regression/TEST-REG-020.json",
    input: {
      type: "document",
      description: "Text file with HTML content shared from iPhone via iOS Shortcuts",
      filename: "Clipboard 3 Dec 2025 at 22.40.txt",
      caption: "[source:clipboard][device:iphone][user:andreas]\nDeepSeek-V3.2 (5 minute read)",
    },
    expected: {
      frontmatter: {
        source_shortcut: "clipboard",
        source_device: "iphone",
        source_user: "andreas",
      },
      tags: ["incoming", "raw", "source/telegram"],
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-020",
      notes: "iOS Shortcut sends clipboard as text file with metadata caption - captured from real iPhone",
    },
  },
];

// =============================================================================
// Embedding Tests
// =============================================================================

export const regressionEmbedSpecs: TestSpec[] = [
  {
    id: "TEST-EMB-001",
    name: "New note is searchable via semantic",
    category: "regression",
    fixture: "regression/TEST-EMB-001.json",
    input: {
      type: "text",
      description: "Unique text that should be immediately searchable",
      example: "Blood pressure reading from digital monitor showing 121/81",
    },
    expected: {
      // Embedding is called post-ingest, not during processMessage
      // This test requires integration testing via: obs semantic 'blood pressure digital monitor'
    },
    meta: {
      docRef: "test-scripts.md#TEST-EMB-001",
      skip: "Embedding happens post-ingest - requires integration test",
      setup: "Verify with: obs semantic 'blood pressure digital monitor'",
    },
  },
];

// =============================================================================
// Events Channel Tests
// =============================================================================

export const regressionEventsSpecs: TestSpec[] = [
  {
    id: "TEST-REG-014",
    name: "Events notification format",
    category: "regression",
    fixture: "regression/TEST-REG-014.json",
    input: {
      type: "text",
      description: "Any processed message should send proper events notification",
      example: "Test message for events channel verification",
    },
    expected: {
      // Events notification sent via Telegram - requires live Telegram test
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-014",
      skip: "Events validation requires live Telegram integration test",
    },
  },
];

// =============================================================================
// Pattern Command Tests
// =============================================================================

export const regressionPatternSpecs: TestSpec[] = [
  {
    id: "TEST-PAT-001",
    name: "/meeting-notes pattern command",
    category: "regression",
    fixture: "regression/TEST-PAT-001.json",
    input: {
      type: "text",
      description: "Text with /meeting-notes pattern command",
      example: "#project/pai @ed_overy /meeting-notes Testing meeting notes extraction",
    },
    expected: {
      tags: ["project/pai", "ed_overy"],
      verboseOutput: ["meeting_minutes", "Fabric"],
      content: {
        // LLM output varies, just check basic meeting notes structure exists
        contains: ["Meeting", "Title"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PAT-001",
    },
  },

  {
    id: "TEST-PAT-002",
    name: "/summarize pattern command",
    category: "regression",
    fixture: "regression/TEST-PAT-002.json",
    input: {
      type: "text",
      description: "Text with /summarize pattern command",
      example: "/summarize This is a long article about machine learning and its applications in healthcare",
    },
    expected: {
      verboseOutput: ["summarize", "Fabric"],
      content: {
        contains: ["summary", "ONE SENTENCE"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PAT-002",
    },
  },

  {
    id: "TEST-PAT-003",
    name: "/wisdom pattern command",
    category: "regression",
    fixture: "regression/TEST-PAT-003.json",
    input: {
      type: "text",
      description: "Text with /wisdom pattern command",
      example: "/wisdom The key to success is consistent effort and learning from failures",
    },
    expected: {
      verboseOutput: ["extract_wisdom", "Fabric"],
      content: {
        contains: ["## SUMMARY", "## IDEAS"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PAT-003",
    },
  },
];

// =============================================================================
// Photo Command Tests (beyond basic Vision)
// =============================================================================

export const regressionPhotoCmdSpecs: TestSpec[] = [
  {
    id: "TEST-PHOTO-001",
    name: "/describe photo command",
    category: "regression",
    fixture: "regression/TEST-PHOTO-001.json",
    input: {
      type: "photo",
      description: "Photo with /describe command",
      caption: "/describe #project/pai",
    },
    expected: {
      tags: ["project/pai"],
      verboseOutput: ["Vision API", "Describe this image"],
      content: {
        contains: ["**Prompt:**", "**Analysis:**"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PHOTO-001",
    },
  },

  {
    id: "TEST-PHOTO-002",
    name: "/ocr photo command",
    category: "regression",
    fixture: "regression/TEST-PHOTO-002.json",
    input: {
      type: "photo",
      description: "Photo with /ocr command for text extraction",
      caption: "/ocr",
    },
    expected: {
      verboseOutput: ["Vision API", "Extract all text"],
      content: {
        contains: ["**Prompt:**"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PHOTO-002",
    },
  },

  {
    id: "TEST-PHOTO-003",
    name: "/store photo command (no processing)",
    category: "regression",
    fixture: "regression/TEST-PHOTO-003.json",
    input: {
      type: "photo",
      description: "Photo with /store command - just save, no Vision",
      caption: "/store Reference image",
    },
    expected: {
      verboseOutput: ["Storing image"],
      content: {
        notContains: ["**Analysis:**"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PHOTO-003",
    },
  },
];

// =============================================================================
// Export all regression specs
// =============================================================================

export const regressionSpecs: TestSpec[] = [
  ...regressionTextSpecs,
  ...regressionUrlSpecs,
  ...regressionVoiceSpecs,
  ...regressionPhotoSpecs,
  ...regressionDocSpecs,
  ...regressionEmbedSpecs,
  ...regressionEventsSpecs,
  ...regressionPatternSpecs,
  ...regressionPhotoCmdSpecs,
];

// Convenience
export const regressionIngestSpecs = regressionSpecs;
