/**
 * Inference Module - Tag Inference from Content
 *
 * Provides tag inference based on source, content, and hints.
 * CRITICAL: Caption tags ALWAYS override AI inference (REQ-INFER-001)
 *
 * REQ-INFER-001 through REQ-INFER-012
 */

import { TaxonomySchema, findDimension } from "./taxonomy";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

// SourceType = WHERE content came from (input channel)
export type SourceType = "telegram" | "clipboard" | "web" | "cli";

// ContentType = WHAT type of content it is (matches existing contentType variable)
// - voice/audio → format/transcript (both are audio content, transcribed)
export type ContentType = "voice" | "audio" | "photo" | "document" | "text" | "url" | "screenshot";

export type TagPrecedence = "explicit" | "hint" | "inferred" | "default";

export interface InferenceResult {
  tags: string[];
  precedence: TagPrecedence;
  confidence?: number;
}

export interface HintParseResult {
  tags: string[];
  cleanText: string;
}

export interface MergeInput {
  explicit: string[];
  inferred: string[];
  defaults: string[];
}

export interface MergeResult {
  tags: string[];
  conflicts: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// REQ-INFER-008: Hint Parsing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse hint syntax from caption/content
 * - #tag → topic/tag or direct tag
 * - @person → person/name
 * - ~scope → scope/value
 */
export function parseHints(text: string): HintParseResult {
  const tags: string[] = [];
  let cleanText = text;

  // Parse #tag hints
  const tagPattern = /#([a-zA-Z0-9_/-]+)/g;
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1]);
    cleanText = cleanText.replace(match[0], "").trim();
  }

  // Parse @person hints → person/name
  const personPattern = /@([a-z_]+)/g;
  while ((match = personPattern.exec(text)) !== null) {
    tags.push(`person/${match[1]}`);
    cleanText = cleanText.replace(match[0], "").trim();
  }

  // Parse ~scope hints → scope/value
  const scopePattern = /~(work|personal)/g;
  while ((match = scopePattern.exec(text)) !== null) {
    tags.push(`scope/${match[1]}`);
    cleanText = cleanText.replace(match[0], "").trim();
  }

  // Clean up multiple spaces
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  return { tags, cleanText };
}

// ═══════════════════════════════════════════════════════════════════════════
// REQ-INFER-002: Source-Based Inference
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Infer tags based on capture source (WHERE content came from)
 * Only adds source/ tags - use inferFromContentFormat for format/ tags
 */
export function inferFromSource(source: SourceType): InferenceResult {
  const tags: string[] = [];

  switch (source) {
    case "telegram":
      tags.push("source/telegram");
      break;
    case "clipboard":
      tags.push("source/clipboard");
      break;
    case "web":
      tags.push("source/web");
      break;
    case "cli":
      tags.push("source/cli");
      break;
  }

  return { tags, precedence: "inferred", confidence: 1.0 };
}

/**
 * Infer tags based on content type (WHAT type of content it is)
 * Adds format/ tags based on content type
 */
export function inferFromContentType(contentType: ContentType): InferenceResult {
  const tags: string[] = [];

  switch (contentType) {
    case "voice":
    case "audio":
      // Both voice and audio are transcribed content
      tags.push("format/transcript");
      break;
    case "screenshot":
      tags.push("format/screenshot");
      break;
    case "photo":
      tags.push("format/image");
      break;
    case "document":
      // Documents don't get a default format - could be reference, technical, etc.
      // Content inference will add format/technical if code blocks, etc.
      break;
    case "text":
    case "url":
      // No default format for text/url - content inference handles this
      break;
  }

  return { tags, precedence: "inferred", confidence: 1.0 };
}

// ═══════════════════════════════════════════════════════════════════════════
// REQ-INFER-003: Content-Based Inference
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Infer tags from content patterns (deterministic rules)
 */
export function inferFromContent(content: string): InferenceResult {
  const tags: string[] = [];

  // Command patterns
  if (content.startsWith("/archive")) {
    tags.push("status/archived");
  }
  if (content.startsWith("/summarize")) {
    tags.push("format/summary");
  }

  // Meeting patterns
  const meetingPatterns = [
    /meeting\s+notes/i,
    /participants:/i,
    /agenda:/i,
    /attendees:/i,
  ];
  if (meetingPatterns.some(p => p.test(content))) {
    tags.push("format/meeting-notes");
  }

  // How-to patterns
  const howtoPatterns = [
    /step\s+\d+[:.]/i,
    /how\s+to\s+/i,
    /tutorial:/i,
  ];
  if (howtoPatterns.some(p => p.test(content))) {
    tags.push("format/howto");
  }

  // Technical patterns (code blocks)
  if (/```[\s\S]*```/.test(content)) {
    tags.push("format/technical");
  }

  // Interview/Q&A patterns
  if (/^Q:/m.test(content) && /^A:/m.test(content)) {
    tags.push("format/interview");
  }

  return { tags, precedence: "inferred", confidence: 0.9 };
}

// ═══════════════════════════════════════════════════════════════════════════
// REQ-INFER-001: Caption Override + REQ-INFER-009: Merge with Precedence
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the dimension name from a tag
 */
function getDimensionFromTag(tag: string, taxonomy: TaxonomySchema): string | undefined {
  const dim = findDimension(tag, taxonomy);
  return dim?.name;
}

/**
 * Check if a dimension allows multiple tags (open dimensions typically do)
 */
function dimensionAllowsMultiple(dimName: string, taxonomy: TaxonomySchema): boolean {
  const dim = taxonomy.dimensions.find(d => d.name === dimName);
  // Open dimensions (topic, person, session) allow multiple tags
  // Closed dimensions (type, status, source, scope, para) typically don't
  return dim?.type === "open";
}

/**
 * Merge tags respecting precedence: explicit > inferred > defaults
 * CRITICAL: Explicit tags ALWAYS win for same dimension
 */
export function mergeTagsWithPrecedence(
  input: MergeInput,
  taxonomy: TaxonomySchema
): MergeResult {
  const result: string[] = [];
  const conflicts: string[] = [];
  const dimensionsCovered = new Map<string, string>(); // dimension → tag that covers it

  // 1. Process explicit tags first (highest priority)
  for (const tag of input.explicit) {
    result.push(tag);
    const dim = getDimensionFromTag(tag, taxonomy);
    if (dim && !dimensionAllowsMultiple(dim, taxonomy)) {
      dimensionsCovered.set(dim, tag);
    }
  }

  // 2. Process inferred tags (only if no conflict with explicit)
  for (const tag of input.inferred) {
    const dim = getDimensionFromTag(tag, taxonomy);

    if (dim && !dimensionAllowsMultiple(dim, taxonomy)) {
      // Closed dimension - check for conflict
      if (dimensionsCovered.has(dim)) {
        conflicts.push(dim);
        continue; // Skip - explicit wins
      }
      dimensionsCovered.set(dim, tag);
    }

    result.push(tag);
  }

  // 3. Process defaults (only if dimension not covered)
  for (const tag of input.defaults) {
    const dim = getDimensionFromTag(tag, taxonomy);

    if (dim && !dimensionAllowsMultiple(dim, taxonomy)) {
      if (dimensionsCovered.has(dim)) {
        continue; // Skip - already covered
      }
      dimensionsCovered.set(dim, tag);
    }

    result.push(tag);
  }

  // Deduplicate
  const unique = [...new Set(result)];

  return { tags: unique, conflicts };
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Tag Application
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply default tags for missing required dimensions
 */
export function applyDefaults(existingTags: string[], taxonomy: TaxonomySchema): string[] {
  const result = [...existingTags];

  // Find which dimensions are already covered
  const coveredDimensions = new Set<string>();
  for (const tag of existingTags) {
    const dim = findDimension(tag, taxonomy);
    if (dim) {
      coveredDimensions.add(dim.name);
    }
  }

  // Add defaults for required dimensions that aren't covered
  for (const dim of taxonomy.dimensions) {
    if (dim.required && dim.default && !coveredDimensions.has(dim.name)) {
      const prefix = dim.prefix.split("|")[0]; // Use first prefix
      result.push(`${prefix}${dim.default}`);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Full Inference Pipeline
// ═══════════════════════════════════════════════════════════════════════════

export interface InferenceInput {
  caption?: string;
  content: string;
  source: SourceType;
  existingTags?: string[];
}

export interface InferenceOutput {
  tags: string[];
  conflicts: string[];
  sources: {
    explicit: string[];
    hint: string[];
    sourceInferred: string[];
    contentInferred: string[];
    defaults: string[];
  };
}

/**
 * Run full inference pipeline on content
 * Applies REQ-INFER-001 through REQ-INFER-012
 */
export function inferTags(input: InferenceInput, taxonomy: TaxonomySchema): InferenceOutput {
  // 1. Parse hints from caption (highest priority after explicit)
  const captionHints = input.caption ? parseHints(input.caption) : { tags: [], cleanText: "" };

  // 2. Infer from source
  const sourceInferred = inferFromSource(input.source);

  // 3. Infer from content patterns
  const contentInferred = inferFromContent(input.content);

  // 4. Combine explicit (from existingTags) + hints as "explicit"
  const explicit = [...(input.existingTags || []), ...captionHints.tags];

  // 5. Combine source + content inference
  const inferred = [...sourceInferred.tags, ...contentInferred.tags];

  // 6. Get defaults from taxonomy
  const defaultTags = taxonomy.dimensions
    .filter(d => d.required && d.default)
    .map(d => `${d.prefix.split("|")[0]}${d.default}`);

  // 7. Merge with precedence
  const merged = mergeTagsWithPrecedence({ explicit, inferred, defaults: defaultTags }, taxonomy);

  return {
    tags: merged.tags,
    conflicts: merged.conflicts,
    sources: {
      explicit: input.existingTags || [],
      hint: captionHints.tags,
      sourceInferred: sourceInferred.tags,
      contentInferred: contentInferred.tags,
      defaults: defaultTags,
    },
  };
}
