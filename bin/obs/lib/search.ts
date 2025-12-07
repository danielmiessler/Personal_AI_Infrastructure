/**
 * Search functionality for obs CLI
 * Uses ripgrep for fast searching and parses YAML frontmatter
 */

import { readdir, stat } from "fs/promises";
import { join, basename } from "path";
import { getConfig, validateVault } from "./config";
import { parseNote } from "./parse";

/**
 * Scope filter types for context separation
 * - work: Exclude private content (default for queries)
 * - private: Only show private content
 * - all: Show everything
 */
export type ScopeFilter = "work" | "private" | "all";

export interface SearchOptions {
  tags: string[];
  text?: string;
  recent?: number;
  untagged?: boolean;
  notTags?: string[];
  scope?: ScopeFilter;  // Default: "work" (exclude private)
  since?: Date;         // Filter by capture date (frontmatter generation_date)
  modified?: Date;      // Filter by modification time (mtime >= modified)
  created?: Date;       // Filter by file creation time (birthtime >= created)
}

export interface SearchResult {
  name: string;
  path: string;
  tags: string[];
  date?: string;           // Raw frontmatter date string (for display)
  captureDate?: Date;      // Parsed capture date from frontmatter
  mtime: Date;             // File modification time
  birthtime: Date;         // File creation time
}

/**
 * Parse frontmatter date string to Date object
 * Supports: "YYYY-MM-DD HH:MM" or "YYYY-MM-DD"
 */
function parseDateString(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;

  // Try "YYYY-MM-DD HH:MM" format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?$/);
  if (match) {
    const [, year, month, day, hour = "0", minute = "0"] = match;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

/**
 * Search notes by tag and/or text
 */
export async function searchNotes(options: SearchOptions): Promise<SearchResult[]> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  let results: SearchResult[] = [];

  // If text search, use ripgrep
  if (options.text) {
    results = await searchByText(vaultPath, options.text);
  } else {
    // List all markdown files
    results = await listAllNotes(vaultPath);
  }

  // Filter by tags if specified
  if (options.tags.length > 0) {
    results = results.filter((note) =>
      options.tags.every((tag) => note.tags.some((t) => t.includes(tag)))
    );
  }

  // Filter by not having certain tags
  if (options.notTags && options.notTags.length > 0) {
    results = results.filter((note) =>
      !options.notTags!.some((tag) => note.tags.some((t) => t.includes(tag)))
    );
  }

  // Filter untagged notes
  if (options.untagged) {
    results = results.filter(
      (note) => note.tags.length === 0 || (note.tags.length === 1 && note.tags[0] === "incoming")
    );
  }

  // Filter by scope (default: work = only include scope/work tagged notes)
  // Security model: No tag = private (excluded from default queries)
  // Must explicitly have scope/work to be included
  const scope = options.scope ?? "work";
  if (scope === "work") {
    // Only include notes WITH scope/work tag (no tag = excluded)
    results = results.filter((note) => note.tags.some((t) => t === "scope/work"));
  } else if (scope === "private") {
    // Only include notes with scope/private tag OR no scope tag
    results = results.filter((note) =>
      note.tags.some((t) => t === "scope/private") ||
      !note.tags.some((t) => t.startsWith("scope/"))
    );
  }
  // scope === "all" → no filtering

  // Filter by since date (capture date from frontmatter)
  if (options.since) {
    results = results.filter((note) => {
      // Use captureDate if available, fall back to mtime
      const noteDate = note.captureDate || note.mtime;
      return noteDate >= options.since!;
    });
  }

  // Filter by modified date (file modification time)
  if (options.modified) {
    results = results.filter((note) => note.mtime >= options.modified!);
  }

  // Filter by created date (file creation time / birthtime)
  if (options.created) {
    results = results.filter((note) => note.birthtime >= options.created!);
  }

  // Sort by capture date (most recent first), fall back to mtime
  results.sort((a, b) => {
    const dateA = a.captureDate || a.mtime;
    const dateB = b.captureDate || b.mtime;
    return dateB.getTime() - dateA.getTime();
  });

  // Limit results if specified
  if (options.recent && options.recent > 0) {
    results = results.slice(0, options.recent);
  }

  return results;
}

/**
 * Search by text using ripgrep
 */
async function searchByText(vaultPath: string, query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    // Use grep with recursive search (more portable than rg)
    // -l = files only, -r = recursive, -i = case insensitive, --include = filter
    const { stdout } = await execAsync(
      `grep -ril --include="*.md" "${query}" "${vaultPath}" 2>/dev/null || true`
    );
    const files = stdout.trim().split("\n").filter(Boolean);

    for (const filePath of files) {
      try {
        const note = await parseNote(filePath);
        const stats = await stat(filePath);
        results.push({
          name: basename(filePath, ".md"),
          path: filePath,
          tags: note.tags,
          date: note.date,
          captureDate: parseDateString(note.date),
          mtime: stats.mtime,
          birthtime: stats.birthtime,
        });
      } catch (error) {
        // Skip files that can't be parsed
      }
    }
  } catch (error) {
    // grep errors are caught, return empty results
  }

  return results;
}

/**
 * List all markdown notes in vault
 */
async function listAllNotes(vaultPath: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories and _meta
      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const note = await parseNote(fullPath);
          const stats = await stat(fullPath);
          results.push({
            name: basename(fullPath, ".md"),
            path: fullPath,
            tags: note.tags,
            date: note.date,
            captureDate: parseDateString(note.date),
            mtime: stats.mtime,
            birthtime: stats.birthtime,
          });
        } catch (error) {
          // Skip files that can't be parsed
        }
      }
    }
  }

  await walkDir(vaultPath);
  return results;
}

/**
 * Parse a "since" string into a Date
 * Supports:
 *   - "7d" / "7D" - N days ago
 *   - "2w" / "2W" - N weeks ago
 *   - "1m" / "1M" - N months ago (30 days each)
 *   - "2025-12-01" - ISO date
 *   - "today" - start of today
 *   - "yesterday" - start of yesterday
 *   - "this week" - start of current week (Monday)
 *   - "this month" - start of current month
 */
export function parseSince(value: string): Date | null {
  const now = new Date();
  const lower = value.toLowerCase().trim();

  // Relative: "7d", "2w", "1m"
  const relMatch = lower.match(/^(\d+)([dwm])$/);
  if (relMatch) {
    const num = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    const result = new Date(now);
    if (unit === "d") {
      result.setDate(result.getDate() - num);
    } else if (unit === "w") {
      result.setDate(result.getDate() - num * 7);
    } else if (unit === "m") {
      result.setDate(result.getDate() - num * 30);
    }
    result.setHours(0, 0, 0, 0);
    return result;
  }

  // Named: "today", "yesterday", "this week", "this month"
  if (lower === "today") {
    const result = new Date(now);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  if (lower === "yesterday") {
    const result = new Date(now);
    result.setDate(result.getDate() - 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  if (lower === "this week") {
    const result = new Date(now);
    const day = result.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    result.setDate(result.getDate() - diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  if (lower === "this month") {
    const result = new Date(now.getFullYear(), now.getMonth(), 1);
    return result;
  }

  // ISO date: "2025-12-01"
  const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    const result = new Date(value + "T00:00:00");
    if (!isNaN(result.getTime())) {
      return result;
    }
  }

  return null;
}
