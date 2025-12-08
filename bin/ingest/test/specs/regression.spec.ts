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
    group: "text-processing",
    description: "Validates basic text message processing without any metadata or hints",
    fixture: "regression/TEST-REG-001.json",
    input: {
      type: "text",
      description: "Plain text without hints or metadata",
      example: "Regression test: Simple text message without any metadata or hints",
    },
    expected: {
      tags: ["incoming", "raw", "source/telegram"],
      // Pipeline name is not validated - may vary between "default" and "note"
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-001",
    },
  },

  {
    id: "TEST-REG-002",
    name: "Text with metadata parsing",
    category: "regression",
    group: "metadata-extraction",
    description: "Validates [key:value] metadata extraction from iOS Shortcuts format",
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
    group: "metadata-extraction",
    description: "Validates combined extraction of #tags, @people, and [metadata]",
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
      // LLM-as-judge semantic validation
      semantic: {
        description: "Correct extraction of all hint types from combined input",
        checkpoints: [
          "Tags extracted from hashtags (project/pai and ed_overy)",
          "Metadata extracted from [key:value] format (source_shortcut, source_device)",
          "Content is properly cleaned with hints removed",
        ],
        target: "raw",
        threshold: 85,
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
    group: "url-processing",
    description: "Validates URL content extraction using Jina AI Reader service",
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
      // LLM-as-judge semantic validation
      semantic: {
        description: "URL content extracted and processed through extract_article_wisdom pattern",
        checkpoints: [
          "Article content successfully fetched (not error message)",
          "Content relates to Claude/Anthropic (source URL topic)",
          "Wisdom extraction produced meaningful IDEAS and INSIGHTS sections",
          "Source URL is preserved in the output",
        ],
        target: "wisdom",
        threshold: 80,
      },
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
    group: "voice-hints",
    description: "Validates tag extraction from voice memo captions (Wispr Flow dictation)",
    fixture: "regression/TEST-REG-005a.json",
    input: {
      type: "voice",
      description: "Voice memo with dictated caption containing hints",
      caption: "#project/test extract wisdom",
    },
    expected: {
      tags: ["project/test"],
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
    group: "voice-hints",
    description: "Validates hint extraction from spoken audio transcript",
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
      skip: "Fixture audio doesn't contain expected spoken hints - needs recapture",
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
    group: "photo-vision",
    description: "Validates default Vision AI description when no caption provided",
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
      // LLM-as-judge semantic validation
      semantic: {
        description: "Vision AI produced a meaningful description of the image",
        checkpoints: [
          "Analysis section contains actual descriptive content (not error/placeholder)",
          "Description is coherent and relates to visual content",
        ],
        target: "raw",
        threshold: 75,
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
    group: "photo-vision",
    description: "Validates custom Vision AI prompt from caption",
    fixture: "regression/TEST-REG-008.json",
    input: {
      type: "photo",
      description: "Photo with caption as Vision AI prompt",
      caption: "Extract all text from this screenshot",
    },
    expected: {
      verboseOutput: ["Vision API", "Custom prompt"],
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
    group: "photo-vision",
    description: "Validates /mermaid command triggers diagram extraction with syntax fix",
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
      // LLM-as-judge semantic validation
      semantic: {
        description: "Mermaid diagram extracted from screenshot with valid syntax",
        checkpoints: [
          "Contains valid mermaid code block (```mermaid ... ```)",
          "Mermaid syntax is parseable (flowchart, graph, or other valid type)",
          "Diagram content reflects the visual structure from the screenshot",
        ],
        target: "raw",
        threshold: 80,
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
    group: "photo-vision",
    description: "Validates natural language mermaid extraction request",
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
    name: "PDF archive (default, no OCR)",
    category: "regression",
    group: "document-archive",
    description: "Validates PDF default to archive mode without OCR extraction",
    fixture: "regression/TEST-REG-009.json",
    input: {
      type: "document",
      description: "PDF document - archives by default without OCR",
      filename: "test-document.pdf",
    },
    expected: {
      pipeline: "archive",
      verboseOutput: ["PDF archive mode"],
      dropboxSync: true,
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-009",
      notes: "PDFs default to archive. Use /ocr to extract text.",
    },
  },

  {
    id: "TEST-REG-010a",
    name: "DOCX plain extraction (no wisdom)",
    category: "regression",
    group: "document-extraction",
    description: "Validates DOCX text extraction without Fabric pattern processing",
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
    group: "ios-shortcuts",
    description: "Validates iOS Shortcut clipboard sharing with metadata extraction",
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
      // LLM-as-judge semantic validation
      semantic: {
        description: "iOS Shortcut clipboard sharing correctly processed with metadata extraction",
        checkpoints: [
          "Metadata extracted from caption ([source:clipboard], [device:iphone], [user:andreas])",
          "HTML content converted to readable markdown or plain text",
          "Original content preserved (DeepSeek article reference intact)",
        ],
        target: "raw",
        threshold: 85,
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-REG-020",
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
    group: "pattern-commands",
    description: "Validates Fabric meeting_minutes pattern creates structured meeting summary",
    fixture: "regression/TEST-PAT-001.json",
    input: {
      type: "text",
      description: "Meeting transcript with /meeting-notes command",
      example: `#project/pai @ed_overy /meeting-notes
Today we discussed the new feature roadmap. Sarah presented the Q1 priorities including user authentication improvements and the new dashboard.
John raised concerns about timeline - we agreed to extend the deadline by two weeks.
Action items: Sarah to create Jira tickets by Friday, John to review architecture doc, Team to estimate stories next sprint.
Next meeting scheduled for Monday 10am.`,
    },
    expected: {
      // Note: Tags from input may not be preserved when content goes through Fabric pattern
      // The key validation is that the Fabric pattern runs successfully
      verboseOutput: ["meeting_minutes", "Fabric"],
      // Should create both Raw and Wisdom files
      content: {
        contains: ["action", "meeting"],
      },
      // LLM-as-judge semantic validation
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
    meta: {
      docRef: "test-scripts.md#TEST-PAT-001",
    },
  },

  {
    id: "TEST-PAT-002",
    name: "/summarize pattern command",
    category: "regression",
    group: "pattern-commands",
    description: "Validates Fabric summarize pattern extracts key points from content",
    fixture: "regression/TEST-PAT-002.json",
    input: {
      type: "text",
      description: "Article text with /summarize command",
      example: `/summarize
Machine learning is transforming healthcare in remarkable ways. From early disease detection using medical imaging to personalized treatment recommendations, AI systems are becoming invaluable tools for clinicians.
Recent studies show that ML algorithms can detect certain cancers with accuracy matching or exceeding human radiologists. Drug discovery timelines are being shortened from years to months.
However, challenges remain around data privacy, algorithmic bias, and the need for explainable AI in clinical settings. The future likely involves human-AI collaboration rather than replacement.`,
    },
    expected: {
      verboseOutput: ["summarize", "Fabric"],
      // Fabric summarize pattern outputs these headings
      content: {
        contains: ["ONE SENTENCE SUMMARY", "MAIN POINTS"],
      },
      // LLM-as-judge semantic validation
      semantic: {
        description: "Accurate summary with key points extracted from the source content",
        checkpoints: [
          "Has a ONE SENTENCE SUMMARY that captures the essence",
          "Has MAIN POINTS section with relevant bullet points",
          "Has TAKEAWAYS section with actionable insights",
          "Content accurately reflects the original (ML in healthcare)",
        ],
        target: "wisdom",
        threshold: 80,
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
    group: "pattern-commands",
    description: "Validates Fabric extract_wisdom pattern extracts insights and ideas",
    fixture: "regression/TEST-PAT-003.json",
    input: {
      type: "text",
      description: "Insightful content with /wisdom command",
      example: `/wisdom
The most successful people I've studied share common traits that transcend their specific domains. First, they embrace failure as learning - Thomas Edison famously said he found 10,000 ways that won't work.
Second, they maintain deep focus while staying curious about adjacent fields. Charlie Munger calls this building a latticework of mental models.
Third, they compound small improvements daily. James Clear notes that getting 1% better each day means you're 37 times better after a year.
The meta-insight is that excellence is a habit, not an act. Consistency beats intensity every time.`,
    },
    expected: {
      verboseOutput: ["extract_wisdom", "Fabric"],
      content: {
        contains: ["SUMMARY", "IDEAS"],
      },
      // LLM-as-judge semantic validation
      semantic: {
        description: "Comprehensive wisdom extraction with ideas, insights, and actionable takeaways",
        checkpoints: [
          "Has required wisdom sections (SUMMARY, IDEAS, INSIGHTS)",
          "Content is semantically relevant to success and learning themes",
          "Sufficient depth of extraction (multiple ideas and insights)",
          "Quotes or references from source are preserved if applicable",
        ],
        target: "wisdom",
        threshold: 80,
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
    group: "photo-commands",
    description: "Validates /describe command triggers Vision AI description",
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
      // LLM-as-judge semantic validation
      semantic: {
        description: "Vision AI description is detailed and accurate",
        checkpoints: [
          "Contains both Prompt and Analysis sections",
          "Analysis provides meaningful description of image content",
          "Tags from caption (#project/pai) are preserved in frontmatter",
        ],
        target: "raw",
        threshold: 80,
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PHOTO-001",
    },
  },

  {
    id: "TEST-PHOTO-002",
    name: "/ocr photo command (Tesseract)",
    category: "regression",
    group: "photo-commands",
    description: "Validates /ocr command triggers Tesseract OCR text extraction",
    fixture: "regression/TEST-PHOTO-002.json",
    input: {
      type: "photo",
      description: "Photo with /ocr command for text extraction via Tesseract",
      caption: "/ocr",
    },
    expected: {
      // /ocr uses Tesseract OCR, not Vision API
      // Output format: "[Image with text]\n\n{extracted text}" or "[Image: /ocr]"
      content: {
        contains: ["[Image"],
      },
    },
    meta: {
      docRef: "test-scripts.md#TEST-PHOTO-002",
      notes: "/ocr uses Tesseract OCR for text extraction, not Vision API",
    },
  },

  {
    id: "TEST-PHOTO-003",
    name: "/store photo command (no processing)",
    category: "regression",
    group: "photo-commands",
    description: "Validates /store command saves photo without Vision AI processing",
    fixture: "regression/TEST-PHOTO-003.json",
    input: {
      type: "photo",
      description: "Photo with /store command - just save, no Vision",
      caption: "/store Reference image",
    },
    expected: {
      verboseOutput: ["Storing image without processing"],
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
