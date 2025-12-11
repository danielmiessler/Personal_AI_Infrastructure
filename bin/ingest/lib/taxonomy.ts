/**
 * Tag Taxonomy System
 *
 * Loads tag definitions from tags.json and provides keyword-based auto-tagging.
 * This is a lightweight, zero-token alternative to AI-based tagging.
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

// Path to tags.json - relative to repo root
// Falls back to tags.example.json if personalized file doesn't exist
const TAXONOMY_PATH = join(__dirname, "..", "..", "..", ".claude", "skills", "Context", "tags.json");
const TAXONOMY_EXAMPLE_PATH = join(__dirname, "..", "..", "..", ".claude", "skills", "Context", "tags.example.json");

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
  tags: TagDefinition[];
  projectKeywords: ProjectKeywords;
  keywordMap: Map<string, string>;      // keyword → tag
  projectMap: Map<string, string>;      // keyword → project tag
  allTagNames: string[];                // For AI prompt context
  lastLoaded: number;
  fileModTime: number;
}

let taxonomy: Taxonomy | null = null;

/**
 * Load taxonomy from tags.json
 * Caches result and reloads if file has changed
 */
export function loadTaxonomy(): Taxonomy | null {
  // Check which taxonomy file to use (prefer tags.json, fall back to example)
  let taxonomyPath = TAXONOMY_PATH;
  if (!existsSync(TAXONOMY_PATH)) {
    if (existsSync(TAXONOMY_EXAMPLE_PATH)) {
      taxonomyPath = TAXONOMY_EXAMPLE_PATH;
      // Only warn once per session, not on every load
      if (!taxonomy) {
        console.log(`  Using example taxonomy: ${TAXONOMY_EXAMPLE_PATH}`);
      }
    } else {
      console.warn(`  Taxonomy file not found: ${TAXONOMY_PATH}`);
      return null;
    }
  }

  // Check if we need to reload (file modified)
  const stat = statSync(taxonomyPath);
  const modTime = stat.mtimeMs;

  if (taxonomy && taxonomy.fileModTime === modTime) {
    return taxonomy;
  }

  try {
    const content = readFileSync(taxonomyPath, "utf-8");
    const data = JSON.parse(content);

    // Build keyword → tag map
    const keywordMap = new Map<string, string>();
    const tags: TagDefinition[] = data.tags || [];

    for (const tagDef of tags) {
      if (tagDef.auto_detect_keywords) {
        for (const keyword of tagDef.auto_detect_keywords) {
          keywordMap.set(keyword.toLowerCase(), tagDef.tag);
        }
      }
    }

    // Build project keyword → tag map
    const projectMap = new Map<string, string>();
    const projectKeywords: ProjectKeywords = data.project_keywords || {};

    for (const [project, keywords] of Object.entries(projectKeywords)) {
      for (const keyword of keywords as string[]) {
        projectMap.set(keyword.toLowerCase(), project);
      }
    }

    // Extract all tag names for AI context
    const allTagNames = [
      ...tags.map(t => t.tag),
      ...(data.source_tags || []).map((t: { tag: string }) => t.tag),
      ...(data.topic_tags || []).map((t: { tag: string }) => t.tag),
    ];

    taxonomy = {
      tags,
      projectKeywords,
      keywordMap,
      projectMap,
      allTagNames,
      lastLoaded: Date.now(),
      fileModTime: modTime,
    };

    console.log(`  Taxonomy loaded: ${keywordMap.size} keywords → ${tags.length} tags, ${projectMap.size} project keywords`);
    return taxonomy;
  } catch (err) {
    console.warn(`  Failed to load taxonomy: ${err}`);
    return null;
  }
}

/**
 * Match content against taxonomy keywords
 * Returns matched tags (deterministic, zero tokens)
 *
 * Uses both exact keyword matching and fuzzy matching for transcription errors
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

  // Also try fuzzy matching on words for transcription errors
  // Extract words from content and check against keywords
  const words = contentLower.match(/\b[a-z]{4,}\b/g) || [];  // Words 4+ chars
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
 * Returns true if strings are similar enough (Levenshtein distance <= 2)
 */
function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 2) return false;

  // Simple Levenshtein with early exit
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

    // Early exit if minimum in row exceeds threshold
    if (minInRow > maxDist) return false;

    [prev, curr] = [curr, prev];
  }

  return prev[n] <= maxDist;
}

/**
 * Get taxonomy tag names for AI prompt context
 * Returns a compact list suitable for including in prompts
 */
export function getTaxonomyTagList(taxonomy: Taxonomy): string {
  return taxonomy.allTagNames.slice(0, 50).join(", ");
}

/**
 * Check if taxonomy has sufficient keyword coverage
 * Used to decide whether to skip AI tagging
 */
export function hasGoodKeywordCoverage(matchedTags: string[]): boolean {
  // If we matched 3+ semantic tags (excluding status tags), skip AI
  const semanticTags = matchedTags.filter(t =>
    !["incoming", "raw", "wisdom", "main", "fabric-extraction"].includes(t) &&
    !t.startsWith("source/")
  );
  return semanticTags.length >= 3;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
