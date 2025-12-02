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
}

export interface SearchResult {
  name: string;
  path: string;
  tags: string[];
  date?: string;
  mtime: Date;
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

  // Sort by modification time (most recent first)
  results.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

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
          mtime: stats.mtime,
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
            mtime: stats.mtime,
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
