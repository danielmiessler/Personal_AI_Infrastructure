/**
 * sweep-auto.ts - Bulk Auto Mode for Sweep
 *
 * Processes inbox notes automatically with intelligent tag deduplication
 * and name suggestions based on confidence thresholds.
 *
 * REQ-AUTO-001 through REQ-AUTO-008 from interactive-sweep OpenSpec
 */

import { readFileSync, writeFileSync } from "fs";
import { basename, dirname, join } from "path";
import { rename } from "fs/promises";
import { IndexedResult } from "./index";
import { findSimilarExisting, TagWithCount } from "./tag-similarity";
import { renameNote, extractDatePrefix, buildSuggestedName } from "./sweep-enhancements";

// ============================================================================
// Types
// ============================================================================

export interface AutoModeOptions {
  confidence: "high" | "medium" | "all";
  dryRun: boolean;
  limit?: number;
  vaultPath: string;
}

export interface AutoModeResult {
  totalProcessed: number;
  renamed: number;
  tagsUpdated: number;
  tagsDeduped: number;
  skipped: number;
  needsReview: number[];  // IDs of notes that need manual review
}

export interface NoteProcessingResult {
  id: number;
  path: string;
  renamed: boolean;
  oldName?: string;
  newName?: string;
  tagsAdded: string[];
  tagsDeduped: { from: string; to: string; score: number }[];
  skipped: boolean;
  skipReason?: string;
  confidence: number;
}

export type ConfidenceLevel = "high" | "medium" | "low" | "none";

// ============================================================================
// Confidence Thresholds
// ============================================================================

const CONFIDENCE_THRESHOLDS = {
  high: 0.85,
  medium: 0.70,
  low: 0.0,
};

// ============================================================================
// Main Auto Mode Function
// ============================================================================

/**
 * Process notes in auto mode
 */
// Taxonomy functions type
interface TaxonomyFunctions {
  matchTitlePatterns: (content: string, taxonomy: any) => { title: string; pattern: string; tags: string[] } | null;
  suggestTagsFromPatterns: (content: string, taxonomy: any, existingTags?: string[]) => string[];
}

export async function processAutoMode(
  notes: IndexedResult[],
  options: AutoModeOptions,
  onProgress?: (current: number, total: number, note: NoteProcessingResult) => void
): Promise<AutoModeResult> {
  // Lazy load dimensional taxonomy to avoid circular dependencies
  const { getDefaultTaxonomy, matchTitlePatterns, suggestTagsFromPatterns } = await import(
    "./taxonomy"
  );

  let taxonomy;
  try {
    taxonomy = await getDefaultTaxonomy();
  } catch (e) {
    taxonomy = null;
  }
  const threshold = CONFIDENCE_THRESHOLDS[options.confidence];
  const taxonomyFns: TaxonomyFunctions = { matchTitlePatterns, suggestTagsFromPatterns };

  const result: AutoModeResult = {
    totalProcessed: 0,
    renamed: 0,
    tagsUpdated: 0,
    tagsDeduped: 0,
    skipped: 0,
    needsReview: [],
  };

  // Get all existing tags in vault for deduplication
  const existingTags = await getAllVaultTags(options.vaultPath);

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    result.totalProcessed++;

    const noteResult = await processNote(note, taxonomy, taxonomyFns, existingTags, options, threshold);

    // Aggregate results
    if (noteResult.renamed) result.renamed++;
    if (noteResult.tagsAdded.length > 0 || noteResult.tagsDeduped.length > 0) result.tagsUpdated++;
    result.tagsDeduped += noteResult.tagsDeduped.length;
    if (noteResult.skipped) {
      result.skipped++;
      // Queue medium-confidence notes for review when running with high confidence
      if (options.confidence === "high" && noteResult.confidence >= CONFIDENCE_THRESHOLDS.medium) {
        result.needsReview.push(note.index);
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, notes.length, noteResult);
    }
  }

  return result;
}

// ============================================================================
// Single Note Processing
// ============================================================================

async function processNote(
  note: IndexedResult,
  taxonomy: any,
  taxonomyFns: TaxonomyFunctions,
  existingTags: TagWithCount[],
  options: AutoModeOptions,
  threshold: number
): Promise<NoteProcessingResult> {
  const result: NoteProcessingResult = {
    id: note.index,
    path: note.path,
    renamed: false,
    tagsAdded: [],
    tagsDeduped: [],
    skipped: false,
    confidence: 0,
  };

  try {
    // Read note content
    const content = readFileSync(note.path, "utf-8");
    const currentName = basename(note.path, ".md");

    // Strip frontmatter for clean content analysis
    const contentWithoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, "").trim();

    // Extract current tags from frontmatter
    const currentTags = extractTags(content);

    // ===================
    // 1. Title Processing
    // ===================
    let titleConfidence = 0;
    let suggestedName: string | null = null;

    if (taxonomy) {
      // Try pattern extraction on full content first
      const titleResult = taxonomyFns.matchTitlePatterns(content, taxonomy);
      if (titleResult && titleResult.title) {
        suggestedName = buildSuggestedName(currentName, titleResult.title);
        titleConfidence = 0.95; // Pattern match = high confidence
      } else {
        // Try with clean content
        const cleanTitleResult = taxonomyFns.matchTitlePatterns(contentWithoutFrontmatter, taxonomy);
        if (cleanTitleResult && cleanTitleResult.title) {
          suggestedName = buildSuggestedName(currentName, cleanTitleResult.title);
          titleConfidence = 0.95;
        }
      }
    }

    // Check if rename is needed (only if current name is generic)
    const { rest } = extractDatePrefix(currentName);
    const isGenericName = /^(Document|Photo|Clipboard|Screenshot|Untitled|IMG|Note|Voice)[-_]?/i.test(rest);

    if (isGenericName && suggestedName && titleConfidence >= threshold) {
      result.oldName = currentName;
      result.newName = suggestedName;

      if (!options.dryRun) {
        await renameNote(note.path, basename(suggestedName, ".md"), options.vaultPath, { dryRun: false });
      }
      result.renamed = true;
    }

    // =================
    // 2. Tag Processing
    // =================
    let tagConfidence = 0;

    if (taxonomy) {
      // Get suggested tags from dimensional taxonomy
      const suggestedTags = taxonomyFns.suggestTagsFromPatterns(content, taxonomy, currentTags);
      const newTags = suggestedTags.filter(t => !currentTags.includes(t));

      // Tag deduplication - check each current tag against existing vault tags
      for (const tag of currentTags) {
        const similar = findSimilarExisting(tag, existingTags, { threshold: 0.70 });
        if (similar && similar.score >= threshold && similar.tag !== tag) {
          result.tagsDeduped.push({
            from: tag,
            to: similar.tag,
            score: similar.score,
          });
          tagConfidence = Math.max(tagConfidence, similar.score);
        }
      }

      // Add suggested tags if confidence is high enough
      if (newTags.length > 0) {
        result.tagsAdded = newTags;
        tagConfidence = Math.max(tagConfidence, 0.80); // Taxonomy match = medium-high confidence
      }

      // Apply tag changes if above threshold
      if (!options.dryRun && (result.tagsAdded.length > 0 || result.tagsDeduped.length > 0)) {
        if (tagConfidence >= threshold) {
          await applyTagChanges(note.path, content, result.tagsAdded, result.tagsDeduped);
        }
      }
    }

    // Calculate overall confidence
    result.confidence = Math.max(titleConfidence, tagConfidence);

    // Determine if skipped
    if (result.confidence < threshold) {
      result.skipped = true;
      result.skipReason = `Low confidence (${(result.confidence * 100).toFixed(0)}%)`;
    }

  } catch (error) {
    result.skipped = true;
    result.skipReason = `Error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract tags from note content frontmatter
 */
function extractTags(content: string): string[] {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return [];

  // Try inline format: tags: [tag1, tag2]
  const inlineMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/s);
  if (inlineMatch) {
    return inlineMatch[1].split(",").map(t => t.trim().replace(/['"]/g, "")).filter(Boolean);
  }

  // Try YAML list format
  const yamlMatch = frontmatterMatch[1].match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
  if (yamlMatch) {
    return yamlMatch[1].split("\n").map(t => t.replace(/^\s+-\s+/, "").trim()).filter(Boolean);
  }

  return [];
}

/**
 * Get all tags used in vault with counts
 */
async function getAllVaultTags(vaultPath: string): Promise<TagWithCount[]> {
  // This is a simplified version - in production, we'd cache this
  // For now, return empty array and rely on taxonomy
  return [];
}

/**
 * Apply tag changes to a note
 */
async function applyTagChanges(
  path: string,
  content: string,
  addTags: string[],
  dedupTags: { from: string; to: string; score: number }[]
): Promise<void> {
  let updatedContent = content;

  // Apply deduplication (replace old tags with new)
  for (const { from, to } of dedupTags) {
    // Handle both inline and YAML list formats
    updatedContent = updatedContent.replace(
      new RegExp(`(['"]?)${escapeRegex(from)}\\1`, "g"),
      `$1${to}$1`
    );
    updatedContent = updatedContent.replace(
      new RegExp(`^(\\s*-\\s+)${escapeRegex(from)}$`, "gm"),
      `$1${to}`
    );
  }

  // Add new tags
  if (addTags.length > 0) {
    // Find tags array in frontmatter
    const frontmatterMatch = updatedContent.match(/^(---\n[\s\S]*?)(tags:\s*\[)(.*?)(\][\s\S]*?\n---)/);
    if (frontmatterMatch) {
      const existingTags = frontmatterMatch[3];
      const newTagList = existingTags ? `${existingTags}, ${addTags.join(", ")}` : addTags.join(", ");
      updatedContent = frontmatterMatch[1] + "tags: [" + newTagList + frontmatterMatch[4];
    }
    // TODO: Handle YAML list format
  }

  writeFileSync(path, updatedContent);
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Format progress output for a processed note
 */
export function formatProgressOutput(
  current: number,
  total: number,
  result: NoteProcessingResult
): string {
  const lines: string[] = [];
  const noteName = basename(result.path, ".md");

  lines.push(`Processing [${current}/${total}] ${noteName}`);

  if (result.renamed) {
    lines.push(`  ✓ Renamed → "${result.newName}"`);
  }

  if (result.tagsAdded.length > 0) {
    lines.push(`  ✓ Tags: +${result.tagsAdded.join(", +")}`);
  }

  for (const dedup of result.tagsDeduped) {
    const scorePercent = (dedup.score * 100).toFixed(0);
    lines.push(`  ✓ Dedup: ${dedup.from} → ${dedup.to} (score: ${scorePercent}%)`);
  }

  if (result.skipped) {
    lines.push(`  ⏭ Skipped - ${result.skipReason}`);
  }

  return lines.join("\n");
}

/**
 * Format summary output
 */
export function formatSummaryOutput(result: AutoModeResult, dryRun: boolean): string {
  const lines: string[] = [];
  const mode = dryRun ? "DRY RUN " : "";

  lines.push("────────────────────────────────────────────────────────");
  lines.push(`📊 AUTO MODE ${mode}SUMMARY`);
  lines.push("────────────────────────────────────────────────────────");
  lines.push(`  Total processed:     ${result.totalProcessed}`);
  lines.push(`  Notes renamed:       ${result.renamed} (${Math.round(result.renamed / result.totalProcessed * 100)}%)`);
  lines.push(`  Tags updated:        ${result.tagsUpdated} (${Math.round(result.tagsUpdated / result.totalProcessed * 100)}%)`);
  lines.push(`  Tags deduplicated:   ${result.tagsDeduped}`);
  lines.push(`  Skipped (low conf):  ${result.skipped}`);

  if (result.needsReview.length > 0) {
    lines.push("");
    lines.push(`  🔍 ${result.needsReview.length} notes need manual review:`);
    lines.push(`     ctx sweep ${result.needsReview.join(",")}`);
  }

  lines.push("────────────────────────────────────────────────────────");

  if (dryRun) {
    lines.push("");
    lines.push("  Run without --dry-run to apply changes.");
  }

  return lines.join("\n");
}
