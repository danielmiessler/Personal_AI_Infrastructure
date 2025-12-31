/**
 * sweep-enhancements.ts - Enhanced Sweep Practice Utilities
 *
 * Large file detection, time-based filtering, and rename capability.
 *
 * REQ-SWEEP-ENH-001 to REQ-SWEEP-ENH-004 from cultivation-practices-v1.2
 */

import { readdir, stat, readFile, writeFile, rename } from "fs/promises";
import { existsSync } from "fs";
import { join, basename, dirname, extname } from "path";
import { loadPracticeState, PracticeType } from "./practices";

// ============================================================================
// Types
// ============================================================================

export interface LargeFile {
  path: string;
  name: string;
  sizeKB: number;
  mtime: Date;
}

export interface FindLargeFilesOptions {
  thresholdKB?: number; // Default: 100KB
  excludeDirs?: string[]; // Directories to skip
}

export interface RenameResult {
  oldPath: string;
  newPath: string;
  updatedLinks: string[]; // Paths of files where links were updated
  wouldRename?: boolean; // For dry-run
}

export interface RenameOptions {
  dryRun?: boolean;
}

// ============================================================================
// Content Source Detection
// ============================================================================

/**
 * Known content sources registry
 * Maps URL patterns to human-readable source names
 */
const KNOWN_SOURCES: Array<{ pattern: RegExp; name: string; icon: string }> = [
  { pattern: /tldrnewsletter\.com|tracking\.tldrnewsletter\.com/i, name: "TLDR Newsletter", icon: "📰" },
  { pattern: /hackernews\.com|news\.ycombinator\.com/i, name: "Hacker News", icon: "🟧" },
  { pattern: /twitter\.com|x\.com/i, name: "Twitter/X", icon: "🐦" },
  { pattern: /reddit\.com/i, name: "Reddit", icon: "🤖" },
  { pattern: /medium\.com/i, name: "Medium", icon: "📝" },
  { pattern: /substack\.com/i, name: "Substack", icon: "📬" },
  { pattern: /github\.com/i, name: "GitHub", icon: "🐙" },
  { pattern: /youtube\.com|youtu\.be/i, name: "YouTube", icon: "▶️" },
  { pattern: /arxiv\.org/i, name: "arXiv", icon: "📄" },
];

export interface ContentSource {
  name: string;
  icon: string;
  url?: string;
}

/**
 * Detect content source from note content by analyzing URLs
 * Returns the first matching known source, or null if none found
 */
export function detectContentSource(content: string): ContentSource | null {
  // Extract all URLs from content
  const urlPattern = /https?:\/\/[^\s\)\]\>]+/gi;
  const urls = content.match(urlPattern) || [];

  for (const url of urls) {
    for (const source of KNOWN_SOURCES) {
      if (source.pattern.test(url)) {
        return {
          name: source.name,
          icon: source.icon,
          url,
        };
      }
    }
  }

  return null;
}

// ============================================================================
// Large File Detection
// ============================================================================

const DEFAULT_THRESHOLD_KB = 100;
const DEFAULT_EXCLUDE_DIRS = [".obsidian", "_meta", "attachments", ".git", "node_modules"];

/**
 * Find markdown files larger than threshold
 */
export async function findLargeFiles(
  vaultPath: string,
  options: FindLargeFilesOptions = {}
): Promise<LargeFile[]> {
  const thresholdKB = options.thresholdKB ?? DEFAULT_THRESHOLD_KB;
  const excludeDirs = options.excludeDirs ?? DEFAULT_EXCLUDE_DIRS;
  const thresholdBytes = thresholdKB * 1024;

  const largeFiles: LargeFile[] = [];

  async function scanDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip excluded directories
      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name) || entry.name.startsWith(".")) {
          continue;
        }
        await scanDir(fullPath);
        continue;
      }

      // Only check markdown files
      if (!entry.name.endsWith(".md")) {
        continue;
      }

      const stats = await stat(fullPath);
      if (stats.size > thresholdBytes) {
        largeFiles.push({
          path: fullPath,
          name: basename(fullPath, ".md"),
          sizeKB: Math.round(stats.size / 1024),
          mtime: stats.mtime,
        });
      }
    }
  }

  await scanDir(vaultPath);

  // Sort by size descending
  return largeFiles.sort((a, b) => b.sizeKB - a.sizeKB);
}

// ============================================================================
// Time-Based Filtering
// ============================================================================

/**
 * Parse a time filter string into a Date
 *
 * Supports:
 * - "yesterday" - 24 hours ago
 * - "last" - last completion of specified practice
 * - "2025-12-20" - ISO date
 * - "20251220" - YYYYMMDD format
 */
export function parseTimeFilter(
  filter: string,
  practice?: PracticeType,
  now: Date = new Date()
): Date {
  const filterLower = filter.toLowerCase();

  // "yesterday" - 24 hours ago
  if (filterLower === "yesterday") {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // "last" - since last practice completion
  if (filterLower === "last") {
    if (!practice) {
      throw new Error("Practice type required for 'last' filter");
    }

    const state = loadPracticeState();
    const practiceState = state.practices[practice];

    if (!practiceState?.lastCompleted) {
      throw new Error(`No previous ${practice} recorded`);
    }

    return new Date(practiceState.lastCompleted);
  }

  // Try ISO date format (2025-12-20)
  if (/^\d{4}-\d{2}-\d{2}$/.test(filter)) {
    const date = new Date(filter + "T00:00:00");
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try YYYYMMDD format
  if (/^\d{8}$/.test(filter)) {
    const year = filter.slice(0, 4);
    const month = filter.slice(4, 6);
    const day = filter.slice(6, 8);
    const date = new Date(`${year}-${month}-${day}T00:00:00`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(`Invalid time filter: ${filter}. Use 'yesterday', 'last', 'YYYY-MM-DD', or 'YYYYMMDD'`);
}

/**
 * Filter items by modification time
 */
export function filterByTime<T extends { mtime: Date }>(items: T[], since: Date): T[] {
  return items.filter((item) => item.mtime >= since);
}

// ============================================================================
// Rename Capability
// ============================================================================

/**
 * Sanitize filename for cross-platform compatibility (Windows, Mac, Linux)
 * Removes: < > : " / \ | ? * ' ` # and smart quotes ' ' " "
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*'`#''""]/g, "")  // Remove forbidden chars including smart quotes
    .replace(/\s+/g, " ")                   // Normalize whitespace
    .trim();
}

/**
 * Rename a note and update all wiki-links pointing to it
 */
export async function renameNote(
  oldPath: string,
  newName: string,
  vaultPath: string,
  options: RenameOptions = {}
): Promise<RenameResult> {
  const { dryRun = false } = options;

  // Sanitize the new name for filesystem safety
  const sanitizedName = sanitizeFilename(newName);

  // Validate old path exists
  if (!existsSync(oldPath)) {
    throw new Error(`Note not found: ${oldPath}`);
  }

  // Build new path
  const dir = dirname(oldPath);
  const newPath = join(dir, `${sanitizedName}.md`);

  // Check new path doesn't exist
  if (existsSync(newPath) && oldPath !== newPath) {
    throw new Error(`A note with name "${sanitizedName}" already exists`);
  }

  const oldName = basename(oldPath, ".md");
  const updatedLinks: string[] = [];

  // Find and update wiki-links in all vault notes
  const wikiLinkPattern = new RegExp(
    `\\[\\[${escapeRegex(oldName)}(\\|[^\\]]*)?\\]\\]`,
    "g"
  );

  async function scanAndUpdate(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }
        await scanAndUpdate(fullPath);
        continue;
      }

      if (!entry.name.endsWith(".md")) {
        continue;
      }

      // Skip the file being renamed
      if (fullPath === oldPath) {
        continue;
      }

      const content = await readFile(fullPath, "utf-8");

      if (wikiLinkPattern.test(content)) {
        // Reset regex state
        wikiLinkPattern.lastIndex = 0;

        const newContent = content.replace(wikiLinkPattern, (match, displayText) => {
          return `[[${newName}${displayText || ""}]]`;
        });

        if (!dryRun) {
          await writeFile(fullPath, newContent);
        }

        updatedLinks.push(fullPath);
      }
    }
  }

  await scanAndUpdate(vaultPath);

  // Rename the file itself
  if (!dryRun) {
    await rename(oldPath, newPath);
  }

  return {
    oldPath,
    newPath,
    updatedLinks,
    wouldRename: dryRun ? true : undefined,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Poorly Named Note Detection
// ============================================================================

export interface PoorlyNamedNote {
  path: string;
  name: string;
  reason: string; // Why it's considered poorly named
  mtime: Date;
}

/**
 * Patterns that indicate a note needs renaming
 */
const POOR_NAME_PATTERNS = [
  { pattern: /^Photo[-_]?\d{4}[-_]?\d{2}[-_]?\d{2}/i, reason: "Generic photo name" },
  { pattern: /^Clipboard[-_]?\d+/i, reason: "Clipboard paste name" },
  { pattern: /^Screenshot[-_]?\d+/i, reason: "Screenshot auto-name" },
  { pattern: /^Untitled[-_]?\d*/i, reason: "Untitled note" },
  { pattern: /^IMG[-_]\d+/i, reason: "Camera auto-name" },
  { pattern: /^Document[-_]?\d*/i, reason: "Generic document name" },
  { pattern: /^Note[-_]?\d+$/i, reason: "Generic note name" },
  { pattern: /^\d{4}[-_]\d{2}[-_]\d{2}[-_]\d{4,6}$/, reason: "Timestamp-only name" },
  { pattern: /^[a-f0-9]{8,}$/i, reason: "Hash/ID-only name" },
];

/**
 * Find notes with generic/poor names that should be renamed
 */
export async function findPoorlyNamedNotes(
  vaultPath: string,
  excludeDirs: string[] = DEFAULT_EXCLUDE_DIRS
): Promise<PoorlyNamedNote[]> {
  const poorlyNamed: PoorlyNamedNote[] = [];

  async function scanDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name) || entry.name.startsWith(".")) {
          continue;
        }
        await scanDir(fullPath);
        continue;
      }

      if (!entry.name.endsWith(".md")) {
        continue;
      }

      const noteName = basename(fullPath, ".md");

      // Check against poor name patterns
      for (const { pattern, reason } of POOR_NAME_PATTERNS) {
        if (pattern.test(noteName)) {
          const stats = await stat(fullPath);
          poorlyNamed.push({
            path: fullPath,
            name: noteName,
            reason,
            mtime: stats.mtime,
          });
          break; // Only report first matching reason
        }
      }
    }
  }

  await scanDir(vaultPath);

  // Sort by mtime descending (newest first)
  return poorlyNamed.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

// ============================================================================
// Sweep Results Type
// ============================================================================

export interface SweepResults {
  inbox: Array<{ path: string; name: string; mtime: Date }>;
  largeFiles: LargeFile[];
  poorlyNamed: PoorlyNamedNote[];
  total: number;
}

// ============================================================================
// Sweep Helpers
// ============================================================================

/**
 * Format file size for display
 */
export function formatSize(sizeKB: number): string {
  if (sizeKB >= 1024) {
    return `${(sizeKB / 1024).toFixed(1)}MB`;
  }
  return `${sizeKB}KB`;
}

/**
 * Format large file for display
 */
export function formatLargeFile(file: LargeFile): string {
  return `  📦 ${file.name} (${formatSize(file.sizeKB)})`;
}

// ============================================================================
// Name Suggestion System (Progressive Naming)
// ============================================================================

export interface NameSuggestion {
  path: string;
  currentName: string;
  suggestedName: string | null;
  method: "pattern" | "first-line" | null;
  pattern?: string;
  sourceTag?: string;
  extractedTags: string[];
  mtime: Date;
  confidence: "high" | "medium" | "low"; // high = pattern match, medium = first-line, low = no suggestion
}

export interface SuggestNamesOptions {
  limit?: number;
  dryRun?: boolean;
}

/**
 * Suggest names for poorly-named notes using taxonomy pattern extraction
 *
 * Loads taxonomy and applies pattern extraction to note content to suggest
 * meaningful names. Also extracts tags from content.
 *
 * Preserves YYYY-MM-DD date prefix in suggested names.
 */
export async function suggestNamesForNotes(
  notes: PoorlyNamedNote[],
  options: SuggestNamesOptions = {}
): Promise<NameSuggestion[]> {
  const { limit = 20 } = options;

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
  const suggestions: NameSuggestion[] = [];

  const notesToProcess = notes.slice(0, limit);

  for (const note of notesToProcess) {
    try {
      const content = await readFile(note.path, "utf-8");

      // Extract title using taxonomy patterns
      const titleResult = taxonomy
        ? matchTitlePatterns(content, taxonomy)
        : null;

      // Extract tags using dimensional taxonomy
      const extractedTags = taxonomy ? suggestTagsFromPatterns(content, taxonomy) : [];

      // Determine confidence based on method
      let confidence: "high" | "medium" | "low" = "low";
      let suggestedName: string | null = null;
      let method: "pattern" | "first-line" | null = null;
      let patternName: string | undefined;

      if (titleResult && titleResult.title) {
        confidence = "high";
        method = "pattern";
        patternName = titleResult.pattern;
        // Preserve date prefix in suggested name
        suggestedName = buildSuggestedName(note.name, titleResult.title);
      } else {
        // Fallback: first line extraction (truncated)
        // Strip frontmatter first
        const cleanContent = content.replace(/^---[\s\S]*?---\n?/, "").trim();
        const firstLine = cleanContent.split("\n")[0]?.trim() || "";
        // Remove markdown header prefix
        const cleanFirstLine = firstLine.replace(/^#+\s*/, "").trim();

        if (cleanFirstLine && cleanFirstLine.length > 3 && cleanFirstLine !== "Untitled" && cleanFirstLine !== "---") {
          const title = cleanFirstLine.length <= 60 ? cleanFirstLine : cleanFirstLine.slice(0, 57) + "...";
          confidence = "medium";
          method = "first-line";
          suggestedName = buildSuggestedName(note.name, title);
        }
      }

      suggestions.push({
        path: note.path,
        currentName: note.name,
        suggestedName,
        method,
        pattern: patternName,
        sourceTag: undefined,
        extractedTags,
        mtime: note.mtime,
        confidence,
      });
    } catch (err) {
      // Skip files that can't be read
      suggestions.push({
        path: note.path,
        currentName: note.name,
        suggestedName: null,
        method: null,
        extractedTags: [],
        mtime: note.mtime,
        confidence: "low",
      });
    }
  }

  return suggestions;
}

/**
 * Sanitize a title for use as a note name
 */
function sanitizeNoteName(title: string): string {
  return title
    .replace(/[<>:"/\\|?*+]/g, "") // Remove invalid/problematic chars (+ causes issues)
    .replace(/\s+/g, " ")           // Normalize whitespace
    .trim()
    .slice(0, 80);                  // Max length
}

/**
 * Extract YYYY-MM-DD date prefix from a note name
 * Returns the prefix (including trailing dash) and the rest of the name
 */
export function extractDatePrefix(noteName: string): { datePrefix: string; rest: string } {
  // Match YYYY-MM-DD- at the start of the name
  const match = noteName.match(/^(\d{4}-\d{2}-\d{2})-(.*)$/);
  if (match) {
    return { datePrefix: match[1] + "-", rest: match[2] };
  }
  return { datePrefix: "", rest: noteName };
}

/**
 * Build a full suggested name with date prefix preserved
 */
export function buildSuggestedName(currentName: string, suggestedTitle: string): string {
  const { datePrefix } = extractDatePrefix(currentName);
  return datePrefix + sanitizeNoteName(suggestedTitle);
}

/**
 * Check if a single note needs renaming and generate a suggestion
 * Used during sweep flashcard mode for inline name suggestions
 *
 * Preserves YYYY-MM-DD date prefix in suggested names.
 */
export async function checkNoteNameAndSuggest(
  path: string,
  content: string,
  tags: string[]
): Promise<{
  needsRename: boolean;
  reason: string | null;
  suggestedName: string | null;
  method: "pattern" | "tags" | null;
  pattern?: string;      // e.g., "TLDR", "markdown-link"
  sourceTag?: string;    // e.g., "person/john_smith"
}> {
  const noteName = basename(path, ".md");

  // Extract date prefix to check the rest of the name
  const { datePrefix, rest } = extractDatePrefix(noteName);

  // Check the REST of the name against poor name patterns
  // (so "2025-12-24-Document-Telegram-Raw-123" checks "Document-Telegram-Raw-123")
  let needsRename = false;
  let reason: string | null = null;

  for (const { pattern, reason: r } of POOR_NAME_PATTERNS) {
    if (pattern.test(rest)) {
      needsRename = true;
      reason = r;
      break;
    }
  }

  if (!needsRename) {
    return { needsRename: false, reason: null, suggestedName: null, method: null };
  }

  // Lazy load dimensional taxonomy to avoid circular dependencies
  const { getDefaultTaxonomy, matchTitlePatterns } = await import(
    "./taxonomy"
  );

  // Try to generate a suggestion
  // Tier 1: Pattern extraction from content
  let taxonomy;
  try {
    taxonomy = await getDefaultTaxonomy();
  } catch (e) {
    taxonomy = null;
  }
  const titleResult = taxonomy ? matchTitlePatterns(content, taxonomy) : null;

  if (titleResult && titleResult.title) {
    // Preserve date prefix in suggested name
    return {
      needsRename: true,
      reason,
      suggestedName: buildSuggestedName(noteName, titleResult.title),
      method: "pattern",
      pattern: titleResult.pattern,
      sourceTag: undefined,
    };
  }

  // Tier 2: Tag-based title generation - use first person tag if available
  const personTag = tags.find(t => t.startsWith("person/"));
  if (personTag) {
    const personName = personTag.replace("person/", "").replace(/_/g, " ");
    const tagBasedTitle = `Note about ${personName}`;
    // Preserve date prefix in suggested name
    return {
      needsRename: true,
      reason,
      suggestedName: buildSuggestedName(noteName, tagBasedTitle),
      method: "tags",
    };
  }

  // No suggestion available - user needs to provide name
  return {
    needsRename: true,
    reason,
    suggestedName: null,
    method: null,
  };
}

/**
 * Generate a brief content summary to help with naming
 * Used when no automatic name suggestion is available
 */
export async function generateNamingSummary(
  content: string,
  openaiApiKey?: string
): Promise<{
  summary: string;
  keyTopics: string[];
  suggestedTitleHints: string[];
}> {
  // Extract useful signals from content for naming
  const keyTopics: string[] = [];
  const suggestedTitleHints: string[] = [];

  // 1. Extract markdown headings
  const headings = content.match(/^#{1,3}\s+(.+)$/gm) || [];
  for (const h of headings.slice(0, 3)) {
    const text = h.replace(/^#+\s+/, "").trim();
    if (text.length > 3 && text.length < 60) {
      keyTopics.push(text);
    }
  }

  // 2. Extract bold/emphasized phrases (often key concepts)
  const boldPhrases = content.match(/\*\*([^*]+)\*\*/g) || [];
  for (const b of boldPhrases.slice(0, 5)) {
    const text = b.replace(/\*\*/g, "").trim();
    if (text.length > 3 && text.length < 40 && !keyTopics.includes(text)) {
      keyTopics.push(text);
    }
  }

  // 3. Look for "about" or topic indicators
  const aboutMatch = content.match(/(?:about|regarding|re:|topic:|subject:)\s*([^\n.]+)/i);
  if (aboutMatch) {
    suggestedTitleHints.push(aboutMatch[1].trim());
  }

  // 4. Extract first meaningful sentence (skip frontmatter and metadata)
  const cleanContent = content
    .replace(/^---[\s\S]*?---\n?/, "")  // Remove frontmatter
    .replace(/\[[\w_]+:[^\]]+\]/g, "")   // Remove metadata markers
    .replace(/^#+\s+.+$/gm, "")          // Remove headings
    .trim();

  const firstSentence = cleanContent.match(/^[A-Z][^.!?\n]{10,150}[.!?]/)?.[0] || "";

  // Build summary
  let summary = "";
  if (keyTopics.length > 0) {
    summary = `Key topics: ${keyTopics.slice(0, 3).join(", ")}`;
  } else if (firstSentence) {
    summary = firstSentence;
  } else {
    // Extract first 200 chars of meaningful content
    summary = cleanContent.slice(0, 200).trim() + (cleanContent.length > 200 ? "..." : "");
  }

  // If we have an API key and still don't have good hints, use AI
  if (openaiApiKey && suggestedTitleHints.length === 0 && keyTopics.length < 2) {
    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: openaiApiKey });

      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: "Generate a brief 1-sentence summary of this content and suggest 2-3 potential note titles (3-7 words each). Format: SUMMARY: <summary>\\nTITLES: <title1> | <title2> | <title3>",
          },
          {
            role: "user",
            content: content.slice(0, 2000),
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const aiResponse = response.choices[0]?.message?.content || "";
      const summaryMatch = aiResponse.match(/SUMMARY:\s*(.+)/i);
      const titlesMatch = aiResponse.match(/TITLES:\s*(.+)/i);

      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }
      if (titlesMatch) {
        const titles = titlesMatch[1].split("|").map(t => t.trim()).filter(t => t);
        suggestedTitleHints.push(...titles);
      }
    } catch (error) {
      // AI failed, use what we have
      console.log("    (AI summary unavailable)");
    }
  }

  return {
    summary,
    keyTopics: keyTopics.slice(0, 5),
    suggestedTitleHints: suggestedTitleHints.slice(0, 3),
  };
}

/**
 * Format a name suggestion for CLI display
 */
export function formatNameSuggestion(suggestion: NameSuggestion, index: number): string {
  const lines: string[] = [];
  const confidenceEmoji = {
    high: "🎯",
    medium: "💡",
    low: "❓",
  };

  lines.push(`${index + 1}. ${confidenceEmoji[suggestion.confidence]} ${suggestion.currentName}`);

  if (suggestion.suggestedName) {
    lines.push(`   → ${suggestion.suggestedName}`);
    if (suggestion.pattern) {
      lines.push(`     (matched: ${suggestion.pattern})`);
    }
  } else {
    lines.push(`   → [no suggestion - manual review needed]`);
  }

  if (suggestion.extractedTags.length > 0) {
    const tagStr = suggestion.extractedTags.slice(0, 5).map(t => `#${t}`).join(" ");
    lines.push(`     Tags: ${tagStr}`);
  }

  return lines.join("\n");
}
