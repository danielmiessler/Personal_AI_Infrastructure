/**
 * Index formatting and load functionality for obs CLI
 * 
 * Provides:
 * - Numbered index output format for search results
 * - Storing last search results for subsequent load commands
 * - Selection parsing (1,2,4,10-15)
 */

import { join, basename } from "path";
import { existsSync } from "fs";
import { mkdir, writeFile, readFile } from "fs/promises";
import { homedir } from "os";
import { SearchResult } from "./search";
import { readNote } from "./read";

// Store last search results in a temp location
const CACHE_DIR = join(homedir(), ".cache", "obs");
const LAST_SEARCH_FILE = join(CACHE_DIR, "last-search.json");

export interface IndexedResult {
  index: number;
  name: string;
  path: string;
  date: string;
  type: string;
  tags: string[];
  similarity?: number;  // For semantic search results
  excerpt?: string;     // For semantic search results
}

export interface SearchIndex {
  query: string;
  timestamp: string;
  tagMatches: IndexedResult[];
  semanticMatches: IndexedResult[];
}

/**
 * Detect content type from tags
 */
function detectType(tags: string[]): string {
  if (tags.includes("transcript")) return "transcript";
  if (tags.includes("meeting-notes")) return "meeting";
  if (tags.includes("wisdom")) return "wisdom";
  if (tags.includes("raw")) return "raw";
  if (tags.includes("bibliography")) return "reference";
  if (tags.includes("ideas")) return "idea";
  if (tags.includes("incoming")) return "incoming";
  return "note";
}

/**
 * Filter tags for display - remove metadata/system tags, keep meaningful content tags
 * Priority: project tags, topic tags, person tags
 */
function filterDisplayTags(tags: string[]): string[] {
  // Tags to always exclude (metadata, system, redundant)
  const excludePatterns = [
    /^scope\//,           // scope/work, scope/private
    /^source\//,          // source/telegram, source/voice
    /^incoming$/,
    /^raw$/,
    /^fabric-extraction$/,
    /^transcript$/,       // Already shown in Type column
    /^meeting-notes$/,    // Already shown in Type column
    /^wisdom$/,           // Already shown in Type column
  ];
  
  // Filter and prioritize
  const filtered = tags.filter(tag => 
    !excludePatterns.some(pattern => pattern.test(tag))
  );
  
  // Sort: project/ first, then person tags (has underscore), then topics
  return filtered.sort((a, b) => {
    const aIsProject = a.startsWith("project/");
    const bIsProject = b.startsWith("project/");
    if (aIsProject && !bIsProject) return -1;
    if (!aIsProject && bIsProject) return 1;
    
    const aIsPerson = a.includes("_") && !a.includes("/");
    const bIsPerson = b.includes("_") && !b.includes("/");
    if (aIsPerson && !bIsPerson) return -1;
    if (!aIsPerson && bIsPerson) return 1;
    
    return a.localeCompare(b);
  });
}

/**
 * Format date to local timezone string: YYYY-MM-DD
 */
function formatLocalDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Extract date from note name or captureDate
 * Note names are typically: YYYY-MM-DD-Title
 */
function extractDate(result: SearchResult): string {
  // Try to get from captureDate first
  if (result.captureDate) {
    return formatLocalDate(result.captureDate);
  }

  // Try to extract from filename
  const match = result.name.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }

  // Fall back to modification time
  if (result.mtime) {
    return formatLocalDate(result.mtime);
  }

  return "unknown";
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Convert search results to indexed format
 */
export function toIndexedResults(
  results: SearchResult[],
  startIndex: number = 1
): IndexedResult[] {
  return results.map((result, i) => ({
    index: startIndex + i,
    name: result.name,
    path: result.path,
    date: extractDate(result),
    type: detectType(result.frontmatterTags || result.tags),  // Use frontmatter tags, fallback to all tags
    tags: filterDisplayTags(result.tags),
  }));
}

/**
 * Convert semantic search results to indexed format
 */
export function toSemanticIndexedResults(
  results: Array<{ noteName: string; notePath: string; similarity: number; content: string; tags?: string[] }>,
  startIndex: number = 1
): IndexedResult[] {
  return results.map((result, i) => ({
    index: startIndex + i,
    name: result.noteName,
    path: result.notePath,
    date: extractDateFromName(result.noteName),
    type: result.tags ? detectType(result.tags) : "note",
    tags: result.tags ? filterDisplayTags(result.tags) : [],
    similarity: result.similarity,
    excerpt: result.content.slice(0, 80).replace(/\n/g, " ").trim(),
  }));
}

function extractDateFromName(name: string): string {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "unknown";
}

/**
 * Format results as numbered index table
 */
export function formatIndexTable(
  tagMatches: IndexedResult[],
  semanticMatches: IndexedResult[],
  query: string
): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`📋 Search Results for "${query}"`);
  lines.push("");
  
  // Tag matches section
  if (tagMatches.length > 0) {
    lines.push(`TAG MATCHES (${tagMatches.length} notes)`);
    lines.push("─".repeat(80));
    lines.push(formatHeader());
    lines.push("─".repeat(80));
    
    for (const result of tagMatches) {
      lines.push(formatResultRow(result));
    }
    lines.push("");
  }
  
  // Semantic matches section
  if (semanticMatches.length > 0) {
    lines.push(`SEMANTIC MATCHES (${semanticMatches.length} notes)`);
    lines.push("─".repeat(80));
    lines.push(formatSemanticHeader());
    lines.push("─".repeat(80));
    
    for (const result of semanticMatches) {
      lines.push(formatSemanticRow(result));
    }
    lines.push("");
  }
  
  // Footer with load instructions
  if (tagMatches.length > 0 || semanticMatches.length > 0) {
    lines.push("─".repeat(80));
    lines.push("Load options: obs load <selection>");
    lines.push("  • obs load all              - Load all results");
    lines.push("  • obs load 1,2,5            - Load specific items");
    lines.push("  • obs load 1-5              - Load range");
    lines.push("  • obs load --type transcript - Load by type");
    lines.push("  • obs load --since 2025-12-08 - Load by date");
  }
  
  return lines.join("\n");
}

/**
 * Format results as JSON for Claude to parse and present
 */
export function formatIndexJson(
  tagMatches: IndexedResult[],
  semanticMatches: IndexedResult[],
  query: string
): string {
  const output = {
    query,
    timestamp: new Date().toISOString(),
    summary: {
      tagMatchCount: tagMatches.length,
      semanticMatchCount: semanticMatches.length,
      totalCount: tagMatches.length + semanticMatches.length,
    },
    tagMatches: tagMatches.map(r => ({
      index: r.index,
      date: r.date,
      type: r.type,
      title: r.name.replace(/^[\d-]+/, "").trim() || r.name,
      tags: r.tags.slice(0, 3),  // Top 3 meaningful tags
      path: r.path,
    })),
    semanticMatches: semanticMatches.map(r => ({
      index: r.index,
      date: r.date,
      type: r.type,
      title: r.name.replace(/^[\d-]+/, "").trim() || r.name,
      score: r.similarity ? Math.round(r.similarity * 100) : null,
      excerpt: r.excerpt,
      tags: r.tags.slice(0, 3),
      path: r.path,
    })),
    loadInstructions: {
      command: "obs load <selection>",
      examples: [
        { selection: "all", description: "Load all results" },
        { selection: "1,2,5", description: "Load specific items" },
        { selection: "1-5", description: "Load range" },
        { selection: "--type transcript", description: "Filter by type" },
      ],
    },
  };
  
  return JSON.stringify(output, null, 2);
}

function formatHeader(): string {
  return " #  │ Date       │ Type       │ Title                                    │ Tags";
}

function formatSemanticHeader(): string {
  return " #  │ Score │ Date       │ Title                                    │ Excerpt";
}

// System/meta tags to filter from display (show user-meaningful tags)
const SYSTEM_TAGS = new Set([
  "incoming", "raw", "wisdom", "transcript", "meeting",
  "source/telegram", "source/email", "source/web",
  "scope/work", "scope/private",
  "fabric-extraction",
]);

function formatResultRow(result: IndexedResult): string {
  const num = result.index.toString().padStart(2);
  const date = result.date;
  const type = result.type.padEnd(10);
  const title = truncate(result.name.replace(/^[\d-]+/, "").trim() || result.name, 40).padEnd(40);

  // Filter out system tags to show user-meaningful tags
  const userTags = result.tags.filter(t => !SYSTEM_TAGS.has(t));
  const displayTags = userTags.slice(0, 3).map(t => {
    // Shorten project/ prefix for display
    if (t.startsWith("project/")) return t.replace("project/", "p/");
    return t;
  });
  const tags = truncate(displayTags.join(", "), 35);

  return `${num}  │ ${date} │ ${type} │ ${title} │ ${tags}`;
}

function formatSemanticRow(result: IndexedResult): string {
  const num = result.index.toString().padStart(2);
  const score = result.similarity 
    ? `${(result.similarity * 100).toFixed(0)}%`.padStart(5) 
    : "  -  ";
  const date = result.date;
  const title = truncate(result.name.replace(/^[\d-]+/, "").trim() || result.name, 40).padEnd(40);
  const excerpt = truncate(result.excerpt || "", 30);
  
  return `${num}  │ ${score} │ ${date} │ ${title} │ ${excerpt}`;
}

/**
 * Save search results to cache for subsequent load commands
 */
export async function saveSearchIndex(index: SearchIndex): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
  await writeFile(LAST_SEARCH_FILE, JSON.stringify(index, null, 2));
}

/**
 * Load the last search index from cache
 */
export async function loadSearchIndex(): Promise<SearchIndex | null> {
  if (!existsSync(LAST_SEARCH_FILE)) {
    return null;
  }
  
  try {
    const content = await readFile(LAST_SEARCH_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Parse selection string into array of indices
 * Supports: "1,2,5", "1-5", "1,3-5,10", "all"
 */
export function parseSelection(selection: string, maxIndex: number): number[] {
  if (selection.toLowerCase() === "all") {
    return Array.from({ length: maxIndex }, (_, i) => i + 1);
  }
  
  const indices: Set<number> = new Set();
  const parts = selection.split(",").map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes("-")) {
      // Range: "1-5"
      const [start, end] = part.split("-").map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end && i <= maxIndex; i++) {
          if (i >= 1) indices.add(i);
        }
      }
    } else {
      // Single number
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxIndex) {
        indices.add(num);
      }
    }
  }
  
  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Load notes by selection from the last search
 */
export async function loadBySelection(
  selection: string,
  options?: { type?: string; since?: string; tags?: string[] }
): Promise<{ loaded: string[]; content: string }> {
  const index = await loadSearchIndex();

  if (!index) {
    throw new Error("No previous search found. Run 'obs search' or 'obs semantic' first.");
  }

  // Combine all results
  const allResults = [...index.tagMatches, ...index.semanticMatches];

  if (allResults.length === 0) {
    throw new Error("Previous search had no results.");
  }

  let selectedResults: IndexedResult[];

  if (options?.tags && options.tags.length > 0) {
    // Filter by tags (all tags must match - AND logic)
    selectedResults = allResults.filter(r =>
      options.tags!.every(tag => r.tags.some(t => t.includes(tag)))
    );
  } else if (options?.type) {
    // Filter by type
    selectedResults = allResults.filter(r => r.type === options.type);
  } else if (options?.since) {
    // Filter by date
    selectedResults = allResults.filter(r => r.date >= options.since!);
  } else {
    // Parse numeric selection
    const indices = parseSelection(selection, allResults.length);
    selectedResults = allResults.filter(r => indices.includes(r.index));
  }
  
  if (selectedResults.length === 0) {
    throw new Error(`No results match selection: ${selection}`);
  }
  
  // Load content for each selected note
  const contents: string[] = [];
  const loaded: string[] = [];
  
  for (const result of selectedResults) {
    try {
      const content = await readNote(result.name);
      contents.push(`\n${"=".repeat(80)}\n# ${result.name}\n${"=".repeat(80)}\n\n${content}`);
      loaded.push(result.name);
    } catch (error) {
      // Skip notes that can't be read
      console.error(`Warning: Could not read ${result.name}`);
    }
  }
  
  return {
    loaded,
    content: contents.join("\n"),
  };
}

/**
 * Format load result summary
 */
export function formatLoadSummary(loaded: string[], totalSize: number): string {
  const lines: string[] = [];
  lines.push(`✅ Loaded ${loaded.length} document(s) (${formatSize(totalSize)})`);
  lines.push("");
  for (const name of loaded) {
    lines.push(`  • ${truncate(name, 70)}`);
  }
  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

