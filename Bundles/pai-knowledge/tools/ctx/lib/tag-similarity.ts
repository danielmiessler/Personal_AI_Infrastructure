/**
 * Tag Similarity Module
 *
 * Detects similar/duplicate tags using stem matching, aliases, and Levenshtein distance.
 * Used by inference (prevent duplicates), maintenance (find duplicates), migration (generate rules).
 *
 * REQ-TAG-SIM-001 through REQ-TAG-SIM-007
 */

import { existsSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { join } from "path";
import { homedir } from "os";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SimilaritySignals {
  stem: number;      // 0-1: stem match score
  levenshtein: number; // 0-1: normalized Levenshtein similarity
  alias: number;     // 0 or 1: alias match
  semantic?: number; // 0-1: semantic similarity (optional, requires embeddings)
}

export interface TagSimilarityResult {
  score: number;     // 0-1: weighted composite score
  signals: SimilaritySignals;
}

export interface SimilarTagMatch {
  tag: string;
  score: number;
  reason: string;
}

export interface TagWithCount {
  tag: string;
  count: number;
}

export interface DuplicateCluster {
  canonical: string;
  duplicates: string[];
  avgScore: number;
}

export interface ConsolidationRule {
  sources: string[];
  target: string;
}

export interface FindSimilarOptions {
  threshold?: number;  // Minimum score to include (default: 0.7)
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const ALIASES_PATH = join(homedir(), ".claude", "context", "aliases.yaml");
const DEFAULT_ALIASES_PATH = join(__dirname, "..", "config", "aliases.yaml");

// Signal weights (must sum to 1.0)
const WEIGHTS = {
  stem: 0.4,
  levenshtein: 0.3,
  alias: 0.2,
  semantic: 0.1,
};

// Default thresholds
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;
const AUTO_USE_THRESHOLD = 0.85;

// ═══════════════════════════════════════════════════════════════════════════
// Alias Registry (REQ-TAG-SIM-003)
// ═══════════════════════════════════════════════════════════════════════════

let aliasCache: Record<string, string[]> | null = null;

/**
 * Load alias registry from YAML
 */
export async function loadAliases(): Promise<Record<string, string[]>> {
  if (aliasCache) return aliasCache;

  // Try user config first, fall back to default
  const path = existsSync(ALIASES_PATH) ? ALIASES_PATH : DEFAULT_ALIASES_PATH;

  if (!existsSync(path)) {
    // Return default aliases if no file exists
    aliasCache = getDefaultAliases();
    return aliasCache;
  }

  try {
    const content = readFileSync(path, "utf-8");
    const parsed = parseYaml(content);
    aliasCache = parsed.aliases || getDefaultAliases();
    return aliasCache;
  } catch {
    aliasCache = getDefaultAliases();
    return aliasCache;
  }
}

/**
 * Default aliases when no config file exists
 */
function getDefaultAliases(): Record<string, string[]> {
  return {
    kubernetes: ["k8s", "kube"],
    "machine-learning": ["ml", "machinelearning"],
    "artificial-intelligence": ["ai", "artificialintelligence"],
    javascript: ["js"],
    typescript: ["ts"],
    python: ["py"],
    "continuous-integration": ["ci"],
    "continuous-deployment": ["cd"],
    "devops": ["dev-ops"],
    "api": ["apis"],
  };
}

/**
 * Check if two tags are aliases of each other (bidirectional)
 * REQ-TAG-SIM-003
 */
export function aliasMatch(tag1: string, tag2: string): boolean {
  const t1 = tag1.toLowerCase();
  const t2 = tag2.toLowerCase();

  if (t1 === t2) return true;

  // Synchronously check cache or use defaults
  const aliases = aliasCache || getDefaultAliases();

  // Check if t1 is canonical and t2 is its alias
  if (aliases[t1] && aliases[t1].includes(t2)) return true;

  // Check if t2 is canonical and t1 is its alias
  if (aliases[t2] && aliases[t2].includes(t1)) return true;

  // Check reverse: if t1 is an alias of some canonical
  for (const [canonical, aliasList] of Object.entries(aliases)) {
    if (aliasList.includes(t1) && (canonical === t2 || aliasList.includes(t2))) {
      return true;
    }
    if (aliasList.includes(t2) && (canonical === t1 || aliasList.includes(t1))) {
      return true;
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Stem Matching (REQ-TAG-SIM-002)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Porter Stemmer implementation (simplified)
 * Reduces words to their stem/root form
 */
export function stem(word: string): string {
  let w = word.toLowerCase();

  // Step 1a: plurals
  if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("ies")) w = w.slice(0, -2);
  else if (w.endsWith("ss")) { /* keep */ }
  else if (w.endsWith("s")) w = w.slice(0, -1);

  // Step 1b: past tense and progressive
  if (w.endsWith("eed")) {
    if (w.length > 4) w = w.slice(0, -1);
  } else if (w.endsWith("ed")) {
    if (hasVowel(w.slice(0, -2))) {
      w = w.slice(0, -2);
      w = fixStem(w);
    }
  } else if (w.endsWith("ing")) {
    if (hasVowel(w.slice(0, -3))) {
      w = w.slice(0, -3);
      w = fixStem(w);
    }
  }

  // Step 1c: y to i
  if (w.endsWith("y") && hasVowel(w.slice(0, -1))) {
    w = w.slice(0, -1) + "i";
  }

  // Step 2: common suffixes
  const step2Suffixes: [string, string][] = [
    ["ational", "ate"],
    ["tional", "tion"],
    ["enci", "ence"],
    ["anci", "ance"],
    ["izer", "ize"],
    ["isation", "ize"],
    ["ization", "ize"],
    ["ation", "ate"],
    ["ator", "ate"],
    ["alism", "al"],
    ["iveness", "ive"],
    ["fulness", "ful"],
    ["ousness", "ous"],
    ["aliti", "al"],
    ["iviti", "ive"],
    ["biliti", "ble"],
    ["alli", "al"],
    ["entli", "ent"],
    ["eli", "e"],
    ["ousli", "ous"],
  ];

  for (const [suffix, replacement] of step2Suffixes) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (measureConsonants(stem) > 0) {
        w = stem + replacement;
      }
      break;
    }
  }

  // Step 3: more suffixes
  const step3Suffixes: [string, string][] = [
    ["icate", "ic"],
    ["ative", ""],
    ["alize", "al"],
    ["iciti", "ic"],
    ["ical", "ic"],
    ["ful", ""],
    ["ness", ""],
  ];

  for (const [suffix, replacement] of step3Suffixes) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (measureConsonants(stem) > 0) {
        w = stem + replacement;
      }
      break;
    }
  }

  // Step 3b: handle -er suffix (learner -> learn, runner -> run)
  if (w.endsWith("er") && w.length > 3) {
    let stem = w.slice(0, -2);
    // Check if removing -er leaves a valid stem with a vowel
    if (hasVowel(stem) && measureConsonants(stem) > 0) {
      // Handle double consonant (runner -> runn -> run)
      if (stem.length >= 2) {
        const last = stem[stem.length - 1];
        const secondLast = stem[stem.length - 2];
        if (last === secondLast && /[^aeioulsz]/.test(last)) {
          stem = stem.slice(0, -1);
        }
      }
      w = stem;
    }
  }

  // Step 4: remove suffixes
  const step4Suffixes = [
    "al", "ance", "ence", "ic", "able", "ible", "ant",
    "ement", "ment", "ent", "ion", "ou", "ism", "ate", "iti",
    "ous", "ive", "ize",
  ];

  for (const suffix of step4Suffixes) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      if (measureConsonants(stem) > 1) {
        if (suffix === "ion") {
          if (stem.endsWith("s") || stem.endsWith("t")) {
            w = stem;
          }
        } else {
          w = stem;
        }
      }
      break;
    }
  }

  // Step 5a: remove trailing e
  if (w.endsWith("e")) {
    const stem = w.slice(0, -1);
    if (measureConsonants(stem) > 1 || (measureConsonants(stem) === 1 && !endsWithCVC(stem))) {
      w = stem;
    }
  }

  // Step 5b: double consonant
  if (measureConsonants(w) > 1 && w.endsWith("ll")) {
    w = w.slice(0, -1);
  }

  return w;
}

function hasVowel(s: string): boolean {
  return /[aeiou]/.test(s);
}

function isConsonant(s: string, i: number): boolean {
  const c = s[i];
  if (/[aeiou]/.test(c)) return false;
  if (c === "y") return i === 0 || !isConsonant(s, i - 1);
  return true;
}

function measureConsonants(s: string): number {
  let m = 0;
  let i = 0;

  // Skip initial consonants
  while (i < s.length && isConsonant(s, i)) i++;

  while (i < s.length) {
    // Skip vowels
    while (i < s.length && !isConsonant(s, i)) i++;
    if (i >= s.length) break;

    m++;

    // Skip consonants
    while (i < s.length && isConsonant(s, i)) i++;
  }

  return m;
}

function endsWithCVC(s: string): boolean {
  if (s.length < 3) return false;
  const c1 = isConsonant(s, s.length - 3);
  const v = !isConsonant(s, s.length - 2);
  const c2 = isConsonant(s, s.length - 1);
  const lastChar = s[s.length - 1];
  return c1 && v && c2 && !/[wxy]/.test(lastChar);
}

function fixStem(s: string): string {
  // Handle double consonants
  if (s.length >= 2) {
    const last = s[s.length - 1];
    const secondLast = s[s.length - 2];
    if (last === secondLast && /[^aeioulsz]/.test(last)) {
      return s.slice(0, -1);
    }
  }

  // Add e for short stems
  if (measureConsonants(s) === 1 && endsWithCVC(s)) {
    return s + "e";
  }

  return s;
}

/**
 * Check if two tags have the same stem
 * REQ-TAG-SIM-002
 */
export function stemMatch(tag1: string, tag2: string): boolean {
  // Normalize: lowercase, remove hyphens/underscores
  const normalize = (t: string) => t.toLowerCase().replace(/[-_]/g, "");

  const t1 = normalize(tag1);
  const t2 = normalize(tag2);

  // Same after normalization
  if (t1 === t2) return true;

  // Compare stems
  const stem1 = stem(t1);
  const stem2 = stem(t2);

  return stem1 === stem2 && stem1.length > 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// Levenshtein Distance
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Create distance matrix
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  // Fill in the rest
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Compute normalized Levenshtein similarity (0-1)
 */
function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / maxLen;
}

// ═══════════════════════════════════════════════════════════════════════════
// Similarity Scoring (REQ-TAG-SIM-001)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute weighted similarity score between two tags
 * REQ-TAG-SIM-001
 */
export function computeSimilarity(tag1: string, tag2: string): TagSimilarityResult {
  // Extract base tag (remove prefix like topic/)
  const base1 = tag1.includes("/") ? tag1.split("/").pop()! : tag1;
  const base2 = tag2.includes("/") ? tag2.split("/").pop()! : tag2;

  // Compute individual signals
  const isStemMatch = stemMatch(base1, base2);
  const stemScore = isStemMatch ? 1 : 0;
  const levScore = levenshteinSimilarity(base1, base2);
  const isAliasMatch = aliasMatch(base1, base2);
  const aliasScore = isAliasMatch ? 1 : 0;

  // If alias match, return perfect score
  if (isAliasMatch) {
    return {
      score: 1.0,
      signals: {
        stem: stemScore,
        levenshtein: levScore,
        alias: 1,
      },
    };
  }

  // If stem match, guarantee high score (> 0.8)
  // Stem matches are strong indicators of semantic similarity
  if (isStemMatch) {
    // Boost score: stem match guarantees at least 0.85
    const baseScore = 0.85;
    // Add bonus from Levenshtein (up to 0.15 more)
    const levBonus = levScore * 0.15;
    return {
      score: Math.min(1, baseScore + levBonus),
      signals: {
        stem: 1,
        levenshtein: levScore,
        alias: 0,
      },
    };
  }

  // No stem or alias match - use pure Levenshtein
  // Scale it down since without stem match, similarity is weaker
  const score = levScore * 0.8;

  return {
    score: Math.min(1, score),
    signals: {
      stem: 0,
      levenshtein: levScore,
      alias: 0,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Find Similar (REQ-TAG-SIM-004)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find existing tags similar to a candidate tag
 * Used at inference time to prevent creating duplicates
 * REQ-TAG-SIM-004
 */
export function findSimilarExisting(
  candidate: string,
  existingTags: string[],
  options: FindSimilarOptions = {}
): SimilarTagMatch[] {
  const threshold = options.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const results: SimilarTagMatch[] = [];

  for (const existing of existingTags) {
    const result = computeSimilarity(candidate, existing);

    if (result.score >= threshold) {
      // Determine reason
      let reason = "";
      if (result.signals.alias === 1) {
        reason = "alias match";
      } else if (result.signals.stem === 1) {
        reason = "stem match";
      } else if (result.signals.levenshtein > 0.8) {
        reason = "typo/similar spelling";
      } else {
        reason = "similar";
      }

      results.push({
        tag: existing,
        score: result.score,
        reason,
      });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════════════════
// Find Duplicate Clusters (REQ-TAG-SIM-005)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scan vault tags and group duplicates into clusters
 * Used for maintenance to find existing duplicates
 * REQ-TAG-SIM-005
 */
export function findDuplicateClusters(
  vaultTags: TagWithCount[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD
): DuplicateCluster[] {
  const clusters: DuplicateCluster[] = [];
  const assigned = new Set<string>();

  // Sort by count descending (most used = likely canonical)
  const sorted = [...vaultTags].sort((a, b) => b.count - a.count);

  for (const { tag, count } of sorted) {
    if (assigned.has(tag)) continue;

    // Find similar tags
    const similar: { tag: string; score: number }[] = [];

    for (const other of sorted) {
      if (other.tag === tag || assigned.has(other.tag)) continue;

      const result = computeSimilarity(tag, other.tag);
      if (result.score >= threshold) {
        similar.push({ tag: other.tag, score: result.score });
      }
    }

    if (similar.length > 0) {
      // This tag is canonical (highest count), others are duplicates
      const duplicates = similar.map(s => s.tag);
      const avgScore = similar.reduce((sum, s) => sum + s.score, 0) / similar.length;

      clusters.push({
        canonical: tag,
        duplicates,
        avgScore,
      });

      // Mark all as assigned
      assigned.add(tag);
      duplicates.forEach(d => assigned.add(d));
    }
  }

  return clusters;
}

// ═══════════════════════════════════════════════════════════════════════════
// Generate Consolidation Rules (REQ-TAG-SIM-006)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate migration consolidation rules from duplicate clusters
 * REQ-TAG-SIM-006
 */
export function generateConsolidationRules(clusters: DuplicateCluster[]): ConsolidationRule[] {
  return clusters.map(cluster => ({
    sources: cluster.duplicates,
    target: cluster.canonical,
  }));
}

/**
 * Generate YAML-formatted consolidation rules
 */
export function formatConsolidationRulesYaml(clusters: DuplicateCluster[]): string {
  const rules = generateConsolidationRules(clusters);

  let yaml = "consolidations:\n";
  for (const rule of rules) {
    yaml += `  - sources: [${rule.sources.join(", ")}]\n`;
    yaml += `    target: ${rule.target}\n`;
  }

  return yaml;
}
