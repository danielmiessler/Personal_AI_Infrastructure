/**
 * Tag Matcher - Fuzzy matching for transcribed tags
 *
 * Used to match inaccurate transcriptions (from Whisper) against
 * existing vault tags. Only applies to non-deterministic (transcribed) hints,
 * not user-typed hints from captions.
 *
 * Examples:
 *   "ProjectPie" → "project/pai" (fuzzy match)
 *   "edovry_about" → "ed_overy" (fuzzy match)
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";

// =============================================================================
// Configuration
// =============================================================================

const SIMILARITY_THRESHOLD = 0.7; // 70% similarity required for match
const PHONETIC_BOOST = 0.1; // Boost for phonetically similar matches

// =============================================================================
// Tag Index
// =============================================================================

interface TagIndex {
  tags: Set<string>;
  people: Set<string>;
  projects: Set<string>;
  lastUpdated: number;
}

let tagIndex: TagIndex | null = null;
const INDEX_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Load all tags from the vault
 */
export function loadVaultTags(vaultPath: string): TagIndex {
  // Return cached if still valid
  if (tagIndex && Date.now() - tagIndex.lastUpdated < INDEX_TTL) {
    return tagIndex;
  }

  const tags = new Set<string>();
  const people = new Set<string>();
  const projects = new Set<string>();

  function scanDir(dir: string): void {
    if (!existsSync(dir)) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip hidden, _meta, attachments
        if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
          continue;
        }

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            const fileTags = extractTagsFromNote(content);
            for (const tag of fileTags) {
              tags.add(tag);
              // Categorize tags
              if (tag.startsWith("project/") || tag.startsWith("project-")) {
                projects.add(tag);
              } else if (!tag.includes("/") && !tag.includes("-") && tag.match(/^[a-z]+_[a-z]+$/)) {
                // Looks like a person tag (firstname_lastname)
                people.add(tag);
              }
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  scanDir(vaultPath);

  tagIndex = {
    tags,
    people,
    projects,
    lastUpdated: Date.now(),
  };

  console.log(`  Tag index loaded: ${tags.size} tags, ${people.size} people, ${projects.size} projects`);

  return tagIndex;
}

/**
 * Extract tags from a note's frontmatter
 */
function extractTagsFromNote(content: string): string[] {
  if (!content.startsWith("---")) return [];

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) return [];

  const yamlStr = content.slice(3, endIndex).trim();
  try {
    const frontmatter = parseYaml(yamlStr) as Record<string, unknown>;
    const tags = frontmatter.tags;
    if (Array.isArray(tags)) {
      return tags.map(t => String(t).toLowerCase());
    }
    return [];
  } catch {
    return [];
  }
}

// =============================================================================
// Fuzzy Matching
// =============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio (0-1) between two strings
 */
function similarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Simple phonetic normalization (remove vowels, normalize consonants)
 */
function phoneticNormalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[aeiou]/g, "")      // Remove vowels
    .replace(/ph/g, "f")           // Normalize ph -> f
    .replace(/ck/g, "k")           // Normalize ck -> k
    .replace(/ee|ea/g, "i")        // Normalize ee/ea sounds
    .replace(/oo|ou/g, "u")        // Normalize oo/ou sounds
    .replace(/([a-z])\1+/g, "$1"); // Remove double letters
}

/**
 * Check if two strings are phonetically similar
 */
function isPhoneticallySimilar(a: string, b: string): boolean {
  const normA = phoneticNormalize(a);
  const normB = phoneticNormalize(b);
  return similarity(normA, normB) > 0.8;
}

// =============================================================================
// Main Matching Functions
// =============================================================================

export interface MatchResult {
  original: string;
  matched: string | null;
  similarity: number;
  type: "exact" | "fuzzy" | "phonetic" | "none";
}

/**
 * Match a transcribed tag against existing vault tags
 */
export function matchTag(transcribed: string, index: TagIndex): MatchResult {
  const normalized = transcribed.toLowerCase().replace(/[_-]/g, "");

  // Check for exact match first
  if (index.tags.has(transcribed.toLowerCase())) {
    return { original: transcribed, matched: transcribed.toLowerCase(), similarity: 1, type: "exact" };
  }

  // Find best fuzzy match
  let bestMatch: string | null = null;
  let bestSimilarity = 0;
  let matchType: "fuzzy" | "phonetic" | "none" = "none";

  for (const existingTag of index.tags) {
    const existingNormalized = existingTag.replace(/[_\-/]/g, "");

    // Calculate base similarity
    let sim = similarity(normalized, existingNormalized);

    // Boost for phonetic similarity
    if (isPhoneticallySimilar(normalized, existingNormalized)) {
      sim = Math.min(1, sim + PHONETIC_BOOST);
    }

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = existingTag;
      matchType = isPhoneticallySimilar(normalized, existingNormalized) ? "phonetic" : "fuzzy";
    }
  }

  if (bestSimilarity >= SIMILARITY_THRESHOLD) {
    return { original: transcribed, matched: bestMatch, similarity: bestSimilarity, type: matchType };
  }

  return { original: transcribed, matched: null, similarity: bestSimilarity, type: "none" };
}

/**
 * Match a transcribed person tag against existing people tags
 */
export function matchPerson(transcribed: string, index: TagIndex): MatchResult {
  const normalized = transcribed.toLowerCase().replace(/[_-]/g, "");

  // Check for exact match first
  if (index.people.has(transcribed.toLowerCase())) {
    return { original: transcribed, matched: transcribed.toLowerCase(), similarity: 1, type: "exact" };
  }

  // Find best fuzzy match among people tags
  let bestMatch: string | null = null;
  let bestSimilarity = 0;
  let matchType: "fuzzy" | "phonetic" | "none" = "none";

  for (const person of index.people) {
    const personNormalized = person.replace(/[_-]/g, "");

    let sim = similarity(normalized, personNormalized);

    // Boost for phonetic similarity (important for names)
    if (isPhoneticallySimilar(normalized, personNormalized)) {
      sim = Math.min(1, sim + PHONETIC_BOOST);
    }

    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = person;
      matchType = isPhoneticallySimilar(normalized, personNormalized) ? "phonetic" : "fuzzy";
    }
  }

  if (bestSimilarity >= SIMILARITY_THRESHOLD) {
    return { original: transcribed, matched: bestMatch, similarity: bestSimilarity, type: matchType };
  }

  return { original: transcribed, matched: null, similarity: bestSimilarity, type: "none" };
}

/**
 * Match all transcribed hints against vault tags
 *
 * Only matches non-deterministic (transcribed) hints.
 * - Matched tags: uses existing vault tag
 * - Unmatched tags: keeps original but adds "pending-review" flag
 */
export function matchTranscribedHints(
  tags: string[],
  people: string[],
  vaultPath: string
): { tags: string[]; people: string[]; matched: number; unmatched: number; needsReview: boolean } {
  const index = loadVaultTags(vaultPath);

  const matchedTags: string[] = [];
  const matchedPeople: string[] = [];
  let matched = 0;
  let unmatched = 0;

  // Match tags
  for (const tag of tags) {
    const result = matchTag(tag, index);
    if (result.matched) {
      matchedTags.push(result.matched);
      matched++;
      if (result.type !== "exact") {
        console.log(`    Fuzzy matched tag: "${tag}" → "${result.matched}" (${Math.round(result.similarity * 100)}% ${result.type})`);
      }
    } else {
      // Keep unmatched tag but mark for review
      matchedTags.push(tag.toLowerCase());
      unmatched++;
      console.log(`    Unmatched tag kept for review: "${tag}" (best similarity: ${Math.round(result.similarity * 100)}%)`);
    }
  }

  // Match people
  for (const person of people) {
    const result = matchPerson(person, index);
    if (result.matched) {
      matchedPeople.push(result.matched);
      matched++;
      if (result.type !== "exact") {
        console.log(`    Fuzzy matched person: "${person}" → "${result.matched}" (${Math.round(result.similarity * 100)}% ${result.type})`);
      }
    } else {
      // Keep unmatched person but mark for review
      matchedPeople.push(person.toLowerCase());
      unmatched++;
      console.log(`    Unmatched person kept for review: "${person}" (best similarity: ${Math.round(result.similarity * 100)}%)`);
    }
  }

  return {
    tags: matchedTags,
    people: matchedPeople,
    matched,
    unmatched,
    needsReview: unmatched > 0
  };
}

/**
 * Clear the tag index cache (useful for testing)
 */
export function clearTagIndexCache(): void {
  tagIndex = null;
}
