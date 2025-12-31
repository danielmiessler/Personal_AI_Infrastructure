/**
 * Tag Taxonomy System v2.0
 *
 * Single source of truth for dimensional taxonomy with keyword detection.
 * Loads from taxonomy.yaml bundled with the ingest tool.
 *
 * Features:
 * - 13-dimension taxonomy validation
 * - Keyword-based auto-tagging (replaces old tags.json)
 * - Title pattern extraction
 * - Project keyword detection
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";

// Path to bundled taxonomy.yaml (same directory as this file)
const BUNDLED_TAXONOMY_PATH = join(__dirname, "taxonomy.yaml");

// =============================================================================
// INTERFACES
// =============================================================================

export interface TitlePattern {
  name: string;
  description?: string;
  regex: string;
  group: number;
  minLength?: number;
  maxLength?: number;
  tags?: string[];
}

export interface Dimension {
  name: string;
  prefix: string;
  type: "closed" | "open";
  values?: string[];
  pattern?: string;
  required?: boolean;
  default?: string;
  freeform?: boolean;
}

export interface TaxonomyData {
  version: string;
  name: string;
  description: string;
  dimensions: Dimension[];
  keyword_detection: Record<string, { keywords: string[] }>;
  project_keywords: Record<string, { keywords: string[] }>;
  title_patterns: TitlePattern[];
  validation: {
    required_dimensions: string[];
    warn_if_missing: string[];
    forbidden_patterns: string[];
  };
}

// Legacy interface for compatibility
export interface TagDefinition {
  tag: string;
  category: string;
  description: string;
  auto_detect_keywords?: string[];
}

export interface ProjectKeywords {
  [project: string]: string[];
}

export interface Taxonomy {
  // Core data
  data: TaxonomyData;
  dimensions: Dimension[];
  titlePatterns: TitlePattern[];

  // Computed maps for keyword matching
  keywordMap: Map<string, string>;       // keyword → dimensional tag
  projectMap: Map<string, string>;       // keyword → project tag
  allTagNames: string[];                 // All valid tags for prompts

  // Legacy compatibility
  tags: TagDefinition[];
  projectKeywords: ProjectKeywords;

  // Metadata
  lastLoaded: number;
  fileModTime: number;
}

let taxonomy: Taxonomy | null = null;

// =============================================================================
// LOADING
// =============================================================================

/**
 * Load taxonomy from bundled YAML file
 * Caches result and reloads if file has changed
 */
export function loadTaxonomy(): Taxonomy | null {
  if (!existsSync(BUNDLED_TAXONOMY_PATH)) {
    console.warn(`  Taxonomy file not found: ${BUNDLED_TAXONOMY_PATH}`);
    return null;
  }

  // Check if we need to reload (file modified)
  const stat = statSync(BUNDLED_TAXONOMY_PATH);
  const modTime = stat.mtimeMs;

  if (taxonomy && taxonomy.fileModTime === modTime) {
    return taxonomy;
  }

  try {
    const content = readFileSync(BUNDLED_TAXONOMY_PATH, "utf-8");
    const data = parseYaml(content) as TaxonomyData;

    // Build keyword → tag map from keyword_detection section
    const keywordMap = new Map<string, string>();
    if (data.keyword_detection) {
      for (const [tag, config] of Object.entries(data.keyword_detection)) {
        if (config.keywords) {
          for (const keyword of config.keywords) {
            keywordMap.set(keyword.toLowerCase(), tag);
          }
        }
      }
    }

    // Build project keyword → tag map
    const projectMap = new Map<string, string>();
    const projectKeywords: ProjectKeywords = {};
    if (data.project_keywords) {
      for (const [project, config] of Object.entries(data.project_keywords)) {
        projectKeywords[project] = config.keywords || [];
        for (const keyword of config.keywords || []) {
          projectMap.set(keyword.toLowerCase(), project);
        }
      }
    }

    // Extract all valid tags from dimensions
    const allTagNames: string[] = [];
    for (const dim of data.dimensions || []) {
      if (dim.values) {
        for (const value of dim.values) {
          allTagNames.push(`${dim.prefix.replace(/\|/g, "")}${value}`);
        }
      }
    }

    // Legacy compatibility: convert keyword_detection to old TagDefinition format
    const tags: TagDefinition[] = [];
    if (data.keyword_detection) {
      for (const [tag, config] of Object.entries(data.keyword_detection)) {
        tags.push({
          tag,
          category: tag.split("/")[0] || "unknown",
          description: "",
          auto_detect_keywords: config.keywords,
        });
      }
    }

    taxonomy = {
      data,
      dimensions: data.dimensions || [],
      titlePatterns: data.title_patterns || [],
      keywordMap,
      projectMap,
      allTagNames,
      tags,
      projectKeywords,
      lastLoaded: Date.now(),
      fileModTime: modTime,
    };

    const patternInfo = taxonomy.titlePatterns.length > 0
      ? `, ${taxonomy.titlePatterns.length} title patterns`
      : "";
    console.log(
      `  Taxonomy loaded: ${keywordMap.size} keywords → ${Object.keys(data.keyword_detection || {}).length} tags, ` +
      `${projectMap.size} project keywords${patternInfo}`
    );
    return taxonomy;
  } catch (err) {
    console.warn(`  Failed to load taxonomy: ${err}`);
    return null;
  }
}

// =============================================================================
// KEYWORD MATCHING
// =============================================================================

/**
 * Match content against taxonomy keywords
 * Returns matched dimensional tags (deterministic, zero tokens)
 */
export function matchKeywordTags(content: string, taxonomy: Taxonomy): string[] {
  const matched = new Set<string>();
  const contentLower = content.toLowerCase();

  // Match tag keywords (exact word boundary)
  for (const [keyword, tag] of taxonomy.keywordMap) {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
    if (pattern.test(contentLower)) {
      matched.add(tag);
    }
  }

  // Match project keywords
  for (const [keyword, project] of taxonomy.projectMap) {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
    if (pattern.test(contentLower)) {
      matched.add(project);
    }
  }

  // Fuzzy matching for transcription errors
  const words = contentLower.match(/\b[a-z]{4,}\b/g) || [];
  for (const word of words) {
    for (const [keyword, tag] of taxonomy.keywordMap) {
      if (keyword.length >= 4 && fuzzyMatch(word, keyword)) {
        matched.add(tag);
      }
    }
  }

  return [...matched];
}

/**
 * Simple fuzzy match for transcription errors
 * Returns true if strings are similar (Levenshtein distance <= 2)
 */
function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;

  const maxDist = 2;
  const m = a.length;
  const n = b.length;

  if (m === 0) return n <= maxDist;
  if (n === 0) return m <= maxDist;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let minInRow = i;

    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      minInRow = Math.min(minInRow, curr[j]);
    }

    if (minInRow > maxDist) return false;
    [prev, curr] = [curr, prev];
  }

  return prev[n] <= maxDist;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get taxonomy tag names for AI prompt context
 */
export function getTaxonomyTagList(taxonomy: Taxonomy): string {
  return taxonomy.allTagNames.slice(0, 50).join(", ");
}

/**
 * Check if taxonomy has sufficient keyword coverage
 */
export function hasGoodKeywordCoverage(matchedTags: string[]): boolean {
  const semanticTags = matchedTags.filter(t =>
    !["status/inbox", "status/processing", "type/fleeting"].includes(t) &&
    !t.startsWith("source/")
  );
  return semanticTags.length >= 3;
}

// =============================================================================
// TITLE PATTERN EXTRACTION
// =============================================================================

export const DEFAULT_TITLE_PATTERNS: TitlePattern[] = [
  {
    name: "tldr-read-time",
    regex: "\\[?\\*{0,2}\\[?\\[?([^\\[\\]\\(\\)]+?)\\s*\\(\\d+\\s*minute\\s*read\\)",
    group: 1,
    minLength: 5,
    maxLength: 120,
  },
  {
    name: "tldr-bold-title",
    regex: "[-•]\\s*\\*\\*([^:*]+):\\*\\*",
    group: 1,
    minLength: 3,
    maxLength: 80,
  },
  {
    name: "markdown-bold-start",
    regex: "^\\*\\*([^*]+)\\*\\*:?\\s",
    group: 1,
    minLength: 3,
    maxLength: 80,
  },
  {
    name: "markdown-heading",
    regex: "^#{1,2}\\s+(.+)$",
    group: 1,
    minLength: 3,
    maxLength: 80,
  },
];

/**
 * Extract title from content using taxonomy patterns
 */
export function extractTitleFromContent(
  content: string,
  taxonomy: Taxonomy | null
): { title: string; pattern: string; sourceTag?: string } | null {
  const patterns = taxonomy?.titlePatterns?.length
    ? taxonomy.titlePatterns
    : DEFAULT_TITLE_PATTERNS;

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern.regex, "im");
      const match = content.match(regex);

      if (match && match[pattern.group]) {
        const title = match[pattern.group].trim();
        const minLen = pattern.minLength ?? 3;
        const maxLen = pattern.maxLength ?? 80;

        if (title.length >= minLen && title.length <= maxLen) {
          return {
            title,
            pattern: pattern.name,
          };
        }
      }
    } catch (err) {
      console.warn(`  Invalid title pattern '${pattern.name}': ${err}`);
    }
  }

  return null;
}

/**
 * Generate a title from content using progressive approach
 */
export function generateTitleFromContent(
  content: string,
  taxonomy: Taxonomy | null
): { title: string; method: "pattern" | "first-line"; pattern?: string } {
  const patternResult = extractTitleFromContent(content, taxonomy);
  if (patternResult) {
    return {
      title: patternResult.title,
      method: "pattern",
      pattern: patternResult.pattern,
    };
  }

  const firstLine = content.split("\n")[0].trim();
  const title = firstLine.length <= 60 ? firstLine : firstLine.slice(0, 57) + "...";

  return {
    title: title || "Untitled",
    method: "first-line",
  };
}

/**
 * Generate a title from tags when content extraction fails
 */
export function generateTitleFromTags(tags: string[]): string | null {
  if (!tags || tags.length === 0) return null;

  const skipPrefixes = ["source/", "status/", "format/", "scope/", "session/", "type/"];
  const skipExact = ["project", "area", "resource", "archive", "fleeting"];

  const projectTags: string[] = [];
  const topicTags: string[] = [];
  const personTags: string[] = [];
  const descriptiveTags: string[] = [];

  for (const tag of tags) {
    if (skipPrefixes.some(p => tag.startsWith(p))) continue;
    if (skipExact.includes(tag)) continue;

    if (tag.startsWith("project/")) {
      projectTags.push(tag.replace("project/", "").toUpperCase().replace(/_/g, " "));
    } else if (tag.startsWith("topic/")) {
      topicTags.push(toTitleCase(tag.replace("topic/", "").replace(/_/g, " ")));
    } else if (tag.startsWith("person/")) {
      personTags.push(toTitleCase(tag.replace("person/", "").replace(/_/g, " ")));
    } else if (!tag.includes("/")) {
      descriptiveTags.push(toTitleCase(tag.replace(/_/g, " ")));
    }
  }

  const parts: string[] = [];
  if (projectTags.length > 0) parts.push(projectTags[0]);
  if (topicTags.length > 0) parts.push(topicTags[0]);
  if (descriptiveTags.length > 0) parts.push(descriptiveTags[0]);

  if (parts.length === 0 && personTags.length === 0) return null;

  let title = parts.join(" ");
  if (personTags.length > 0) {
    title = title ? `${title} with ${personTags[0]}` : `Notes with ${personTags[0]}`;
  }

  return title.length > 60 ? title.slice(0, 57) + "..." : title || null;
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}
