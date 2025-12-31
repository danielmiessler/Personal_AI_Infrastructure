/**
 * Read note functionality for ctx CLI
 */

import { readdir } from "fs/promises";
import { join, basename } from "path";
import { existsSync } from "fs";
import { getConfig, validateVault } from "./config";

/**
 * Read a note by name or path
 */
export async function readNote(noteName: string): Promise<string> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  // Normalize note name
  let normalizedName = noteName;

  // Remove .md extension if present
  if (normalizedName.endsWith(".md")) {
    normalizedName = normalizedName.slice(0, -3);
  }

  // Try direct path first
  const directPath = join(vaultPath, `${normalizedName}.md`);
  if (existsSync(directPath)) {
    return await Bun.file(directPath).text();
  }

  // If it's an absolute path
  if (existsSync(noteName)) {
    return await Bun.file(noteName).text();
  }

  // Search for note by name (case-insensitive partial match)
  const matchingNote = await findNoteByName(vaultPath, normalizedName);
  if (matchingNote) {
    return await Bun.file(matchingNote).text();
  }

  throw new Error(`Note not found: ${noteName}`);
}

/**
 * Find a note by partial name match
 */
async function findNoteByName(vaultPath: string, searchName: string): Promise<string | null> {
  const searchLower = searchName.toLowerCase();

  async function walkDir(dir: string): Promise<string | null> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories and _meta
      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        const found = await walkDir(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const noteName = basename(entry.name, ".md").toLowerCase();

        // Exact match
        if (noteName === searchLower) {
          return fullPath;
        }

        // Partial match (contains search term)
        if (noteName.includes(searchLower)) {
          return fullPath;
        }
      }
    }

    return null;
  }

  return walkDir(vaultPath);
}
