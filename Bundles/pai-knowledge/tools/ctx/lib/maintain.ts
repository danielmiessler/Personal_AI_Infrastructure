/**
 * Vault maintenance utilities for ctx CLI
 * Provides health checks, cleanup, and optimization tools
 */

import { readdir, stat } from "fs/promises";
import { join, basename } from "path";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { getConfig, validateVault } from "./config";
import { parseNote } from "./parse";

export interface LargeFile {
  name: string;
  path: string;
  size: number;
  isBinary: boolean;
}

export interface BrokenLink {
  sourceName: string;
  sourcePath: string;
  brokenLink: string;
  lineNumber?: number;
}

export interface OrphanNote {
  name: string;
  path: string;
  tags: string[];
  mtime: Date;
}

export interface StorageStats {
  totalSize: number;
  fileCount: number;
  byExtension: Map<string, { count: number; size: number }>;
  byDirectory: Map<string, { count: number; size: number }>;
  largestFiles: LargeFile[];
}

export interface HealthReport {
  largeFiles: LargeFile[];
  brokenLinks: BrokenLink[];
  orphans: OrphanNote[];
  storageStats: StorageStats;
  timestamp: Date;
}

/**
 * Check if a file appears to be binary
 */
function isBinaryFile(filePath: string): boolean {
  try {
    const buffer = readFileSync(filePath);
    // Check first 8KB for null bytes (indicator of binary)
    const chunk = buffer.subarray(0, Math.min(8192, buffer.length));
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] === 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Find files larger than threshold
 * @param thresholdMB - Size threshold in megabytes (default: 1)
 */
export async function findLargeFiles(thresholdMB: number = 1): Promise<LargeFile[]> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;
  const thresholdBytes = thresholdMB * 1024 * 1024;

  const largeFiles: LargeFile[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories
      if (entry.name.startsWith(".")) {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = await stat(fullPath);
          if (stats.size >= thresholdBytes) {
            largeFiles.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              isBinary: isBinaryFile(fullPath),
            });
          }
        } catch (error) {
          // Skip files we can't stat
        }
      }
    }
  }

  await walkDir(vaultPath);
  return largeFiles.sort((a, b) => b.size - a.size);
}

/**
 * Find broken [[wikilinks]] in notes
 */
export async function findBrokenLinks(): Promise<BrokenLink[]> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  const brokenLinks: BrokenLink[] = [];
  const allNoteNames = new Set<string>();

  // First, collect all note names
  async function collectNoteNames(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await collectNoteNames(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        allNoteNames.add(basename(entry.name, ".md"));
      }
    }
  }

  await collectNoteNames(vaultPath);

  // Now scan for broken links
  async function scanForLinks(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await scanForLinks(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");

          // Match [[wikilinks]] (without aliases for simplicity)
          const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

          lines.forEach((line, index) => {
            let match;
            while ((match = wikiLinkRegex.exec(line)) !== null) {
              const linkTarget = match[1].trim();

              // Check if target exists (note name without .md extension)
              if (!allNoteNames.has(linkTarget)) {
                brokenLinks.push({
                  sourceName: basename(fullPath, ".md"),
                  sourcePath: fullPath,
                  brokenLink: linkTarget,
                  lineNumber: index + 1,
                });
              }
            }
          });
        } catch (error) {
          // Skip files we can't read
        }
      }
    }
  }

  await scanForLinks(vaultPath);
  return brokenLinks;
}

/**
 * Find orphaned notes (no incoming or outgoing links, minimal tags)
 */
export async function findOrphans(): Promise<OrphanNote[]> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  const allNotes = new Map<string, { path: string; tags: string[]; mtime: Date }>();
  const incomingLinks = new Map<string, Set<string>>();
  const outgoingLinks = new Map<string, Set<string>>();

  // First pass: collect all notes and their outgoing links
  async function scanNotes(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await scanNotes(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const note = await parseNote(fullPath);
          const stats = await stat(fullPath);
          const noteName = basename(fullPath, ".md");

          allNotes.set(noteName, {
            path: fullPath,
            tags: note.tags,
            mtime: stats.mtime,
          });

          // Parse outgoing links
          const content = readFileSync(fullPath, "utf-8");
          const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
          let match;

          while ((match = wikiLinkRegex.exec(content)) !== null) {
            const linkTarget = match[1].trim();

            if (!outgoingLinks.has(noteName)) {
              outgoingLinks.set(noteName, new Set());
            }
            outgoingLinks.get(noteName)!.add(linkTarget);

            // Track incoming links
            if (!incomingLinks.has(linkTarget)) {
              incomingLinks.set(linkTarget, new Set());
            }
            incomingLinks.get(linkTarget)!.add(noteName);
          }
        } catch (error) {
          // Skip files we can't parse
        }
      }
    }
  }

  await scanNotes(vaultPath);

  // Find orphans: notes with no connections and minimal semantic value
  const orphans: OrphanNote[] = [];

  for (const [noteName, noteData] of allNotes.entries()) {
    const hasIncoming = (incomingLinks.get(noteName)?.size || 0) > 0;
    const hasOutgoing = (outgoingLinks.get(noteName)?.size || 0) > 0;
    const hasTopicTags = noteData.tags.some(t => t.startsWith("topic/"));
    const hasPersonTags = noteData.tags.some(t => t.startsWith("person/"));
    const hasProjectTags = noteData.tags.some(t => t.startsWith("project/"));

    // Orphan if: no links AND no significant tags
    if (!hasIncoming && !hasOutgoing && !hasTopicTags && !hasPersonTags && !hasProjectTags) {
      orphans.push({
        name: noteName,
        path: noteData.path,
        tags: noteData.tags,
        mtime: noteData.mtime,
      });
    }
  }

  return orphans.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

/**
 * Calculate storage statistics
 */
export async function calculateStorage(): Promise<StorageStats> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  let totalSize = 0;
  let fileCount = 0;
  const byExtension = new Map<string, { count: number; size: number }>();
  const byDirectory = new Map<string, { count: number; size: number }>();
  const largestFiles: LargeFile[] = [];

  async function walkDir(dir: string, relativeBase: string = ""): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    const dirKey = relativeBase || "root";

    if (!byDirectory.has(dirKey)) {
      byDirectory.set(dirKey, { count: 0, size: 0 });
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.name.startsWith(".")) {
        continue;
      }

      if (entry.isDirectory()) {
        const newRelative = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
        await walkDir(fullPath, newRelative);
      } else if (entry.isFile()) {
        try {
          const stats = await stat(fullPath);
          const ext = entry.name.includes(".")
            ? entry.name.substring(entry.name.lastIndexOf("."))
            : "(no extension)";

          totalSize += stats.size;
          fileCount++;

          // By extension
          if (!byExtension.has(ext)) {
            byExtension.set(ext, { count: 0, size: 0 });
          }
          const extStats = byExtension.get(ext)!;
          extStats.count++;
          extStats.size += stats.size;

          // By directory
          const dirStats = byDirectory.get(dirKey)!;
          dirStats.count++;
          dirStats.size += stats.size;

          // Track largest files
          largestFiles.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
            isBinary: isBinaryFile(fullPath),
          });
        } catch (error) {
          // Skip files we can't stat
        }
      }
    }
  }

  await walkDir(vaultPath);

  // Keep only top 20 largest files
  largestFiles.sort((a, b) => b.size - a.size);

  return {
    totalSize,
    fileCount,
    byExtension,
    byDirectory,
    largestFiles: largestFiles.slice(0, 20),
  };
}

/**
 * Generate complete health report
 */
export async function generateHealthReport(): Promise<HealthReport> {
  const [largeFiles, brokenLinks, orphans, storageStats] = await Promise.all([
    findLargeFiles(1),
    findBrokenLinks(),
    findOrphans(),
    calculateStorage(),
  ]);

  return {
    largeFiles,
    brokenLinks,
    orphans,
    storageStats,
    timestamp: new Date(),
  };
}

/**
 * Clean embedding cache
 */
export async function cleanCache(dryRun: boolean = true): Promise<{ removedFiles: string[]; savedBytes: number }> {
  const config = getConfig();
  const cacheDir = join(config.vaultPath, "_meta", "embeddings");

  const removedFiles: string[] = [];
  let savedBytes = 0;

  if (!existsSync(cacheDir)) {
    return { removedFiles, savedBytes };
  }

  try {
    const files = readdirSync(cacheDir);

    for (const file of files) {
      const filePath = join(cacheDir, file);
      const stats = statSync(filePath);

      removedFiles.push(file);
      savedBytes += stats.size;

      if (!dryRun) {
        const { unlinkSync } = await import("fs");
        unlinkSync(filePath);
      }
    }
  } catch (error) {
    // Cache dir doesn't exist or can't be read
  }

  return { removedFiles, savedBytes };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Result of cleaning legacy suffixes from filenames
 */
export interface CleanSuffixResult {
  oldPath: string;
  newPath: string;
  oldName: string;
  newName: string;
}

/**
 * Legacy suffixes to remove from filenames
 * These were added during ingest but are now redundant
 * (source info is in frontmatter, raw is the default state)
 */
const LEGACY_SUFFIXES = [
  "-Telegram-Raw",
  "-Telegram",
  "-Raw",
];

/**
 * Find and optionally rename files with legacy suffixes
 * Removes: -Telegram-Raw, -Telegram, -Raw from note filenames
 *
 * @param dryRun - If true, only report what would change
 * @returns List of files renamed (or that would be renamed)
 */
export async function cleanLegacySuffixes(dryRun: boolean = true): Promise<CleanSuffixResult[]> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  const results: CleanSuffixResult[] = [];

  async function scanDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories and special folders
      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const baseName = entry.name.slice(0, -3); // Remove .md

        // Check for legacy suffixes
        for (const suffix of LEGACY_SUFFIXES) {
          if (baseName.endsWith(suffix)) {
            const cleanedName = baseName.slice(0, -suffix.length);
            const newFileName = cleanedName + ".md";
            const newPath = join(dir, newFileName);

            // Check if target already exists
            if (existsSync(newPath)) {
              console.error(`  ⚠️  Skipping ${entry.name}: ${newFileName} already exists`);
              continue;
            }

            results.push({
              oldPath: fullPath,
              newPath: newPath,
              oldName: entry.name,
              newName: newFileName,
            });

            if (!dryRun) {
              const { renameSync } = await import("fs");
              renameSync(fullPath, newPath);
            }

            break; // Only match first suffix
          }
        }
      }
    }
  }

  await scanDir(vaultPath);
  return results.sort((a, b) => a.oldName.localeCompare(b.oldName));
}
