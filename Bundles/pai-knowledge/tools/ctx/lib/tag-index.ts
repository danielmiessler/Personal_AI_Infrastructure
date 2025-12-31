/**
 * Tag Index for ctx CLI
 *
 * SQLite-based tag indexing for sub-second search performance.
 *
 * GOAL: `ctx search --tag status/inbox` should complete in <100ms
 *
 * Architecture:
 * - note_tags table stores (note_id, tag) pairs
 * - Indexes on both tag and note_id for fast lookups
 * - Incremental updates when notes are created/modified/deleted
 * - Verification mode to detect and fix inconsistencies
 *
 * Performance targets:
 * - Single tag lookup: <100ms
 * - Tag listing with counts: <50ms
 * - Index rebuild: <30s for 2000 notes
 */

import { Database } from "bun:sqlite";
import { readdir, stat } from "fs/promises";
import { join, basename } from "path";
import { getConfig, validateVault } from "./config";
import { initDatabase } from "./embed";
import { parseNote } from "./parse";

export interface TagIndexStats {
  totalNotes: number;
  totalTags: number;
  uniqueTags: number;
  lastUpdated: Date | null;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface NoteWithTags {
  id: number;
  path: string;
  name: string;
  tags: string[];
  mtime: Date;
}

/**
 * Initialize tag index (called by initDatabase)
 * Table creation is handled in embed.ts
 */
export async function ensureTagIndex(): Promise<void> {
  // Tag index table is created by initDatabase() in embed.ts
  // This function exists for explicit initialization if needed
  await initDatabase();
}

/**
 * Rebuild tag index from scratch
 * Scans all notes in vault and populates note_tags table
 */
export async function rebuildTagIndex(options?: {
  verbose?: boolean;
}): Promise<{ processed: number; tags: number; errors: number }> {
  validateVault();
  const config = getConfig();
  const db = await initDatabase();

  const stats = { processed: 0, tags: 0, errors: 0 };

  try {
    // Clear existing tag index
    db.run("DELETE FROM note_tags");

    if (options?.verbose) {
      console.log("Rebuilding tag index...");
    }

    // Get all notes from vault
    const notes: { path: string; mtime: number }[] = [];

    const walkDir = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (
          entry.name.startsWith(".") ||
          entry.name === "_meta" ||
          entry.name === "attachments"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          const fileStat = await stat(fullPath);
          notes.push({ path: fullPath, mtime: fileStat.mtime.getTime() });
        }
      }
    };

    await walkDir(config.vaultPath);

    if (options?.verbose) {
      console.log(`Found ${notes.length} notes to index`);
    }

    // Process each note
    for (const note of notes) {
      try {
        const parsed = await parseNote(note.path);
        const name = basename(note.path, ".md");

        // Get or create note entry
        let noteId: number;
        const existing = db.query("SELECT id FROM notes WHERE path = ?").get(note.path) as { id: number } | null;

        if (existing) {
          noteId = existing.id;
          // Update mtime
          db.run("UPDATE notes SET mtime = ? WHERE id = ?", [note.mtime, noteId]);
        } else {
          // Insert new note
          db.run(
            "INSERT INTO notes (path, name, mtime) VALUES (?, ?, ?)",
            [note.path, name, note.mtime]
          );
          noteId = (db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
        }

        // Insert tags
        const indexedAt = Date.now();
        for (const tag of parsed.tags) {
          try {
            db.run(
              "INSERT OR IGNORE INTO note_tags (note_id, tag, indexed_at) VALUES (?, ?, ?)",
              [noteId, tag, indexedAt]
            );
            stats.tags++;
          } catch (error) {
            // Ignore duplicate tag errors
          }
        }

        stats.processed++;
        if (options?.verbose && stats.processed % 100 === 0) {
          console.log(`  Processed ${stats.processed}/${notes.length} notes...`);
        }
      } catch (error) {
        if (options?.verbose) {
          console.error(`Error indexing ${note.path}: ${error}`);
        }
        stats.errors++;
      }
    }

    if (options?.verbose) {
      console.log(`Tag index rebuilt: ${stats.processed} notes, ${stats.tags} tag entries`);
    }
  } finally {
    db.close();
  }

  return stats;
}

/**
 * Update tag index for a single note
 * Called when a note is created or modified
 */
export async function updateNoteTagsInIndex(
  notePath: string,
  options?: { verbose?: boolean }
): Promise<boolean> {
  try {
    const db = await initDatabase();
    const fileStat = await stat(notePath);
    const parsed = await parseNote(notePath);
    const name = basename(notePath, ".md");

    // Get or create note entry
    let noteId: number;
    const existing = db.query("SELECT id FROM notes WHERE path = ?").get(notePath) as { id: number } | null;

    if (existing) {
      noteId = existing.id;
      // Update mtime
      db.run("UPDATE notes SET mtime = ? WHERE id = ?", [fileStat.mtime.getTime(), noteId]);
    } else {
      // Insert new note
      db.run(
        "INSERT INTO notes (path, name, mtime) VALUES (?, ?, ?)",
        [notePath, name, fileStat.mtime.getTime()]
      );
      noteId = (db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
    }

    // Clear existing tags for this note
    db.run("DELETE FROM note_tags WHERE note_id = ?", [noteId]);

    // Insert new tags
    const indexedAt = Date.now();
    for (const tag of parsed.tags) {
      db.run(
        "INSERT OR IGNORE INTO note_tags (note_id, tag, indexed_at) VALUES (?, ?, ?)",
        [noteId, tag, indexedAt]
      );
    }

    if (options?.verbose) {
      console.log(`Updated tag index for ${name}: ${parsed.tags.length} tags`);
    }

    db.close();
    return true;
  } catch (error) {
    if (options?.verbose) {
      console.error(`Error updating tag index: ${error}`);
    }
    return false;
  }
}

/**
 * Remove note from tag index
 * Called when a note is deleted
 */
export async function removeNoteFromIndex(
  notePath: string,
  options?: { verbose?: boolean }
): Promise<boolean> {
  try {
    const db = await initDatabase();

    // Delete from notes table (CASCADE will remove tags)
    db.run("DELETE FROM notes WHERE path = ?", [notePath]);

    if (options?.verbose) {
      console.log(`Removed ${notePath} from tag index`);
    }

    db.close();
    return true;
  } catch (error) {
    if (options?.verbose) {
      console.error(`Error removing from tag index: ${error}`);
    }
    return false;
  }
}

/**
 * Find notes by tag (indexed lookup)
 * Returns note IDs and paths for notes with the specified tag
 */
export async function findNotesByTag(tag: string): Promise<NoteWithTags[]> {
  const db = await initDatabase();

  const results = db.query(`
    SELECT DISTINCT n.id, n.path, n.name, n.mtime
    FROM notes n
    JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag = ?
  `).all(tag) as { id: number; path: string; name: string; mtime: number }[];

  // Get tags for each note
  const notes: NoteWithTags[] = [];
  for (const row of results) {
    const tags = db.query("SELECT tag FROM note_tags WHERE note_id = ?").all(row.id) as { tag: string }[];
    notes.push({
      id: row.id,
      path: row.path,
      name: row.name,
      tags: tags.map(t => t.tag),
      mtime: new Date(row.mtime),
    });
  }

  db.close();
  return notes;
}

/**
 * Find notes by multiple tags (AND logic)
 * Returns notes that have ALL specified tags
 */
export async function findNotesByTagsAnd(tags: string[]): Promise<NoteWithTags[]> {
  if (tags.length === 0) return [];
  if (tags.length === 1) return findNotesByTag(tags[0]);

  const db = await initDatabase();

  // Build query with multiple JOINs for AND logic
  const joins = tags.map((_, i) => `JOIN note_tags nt${i} ON n.id = nt${i}.note_id`).join("\n");
  const conditions = tags.map((tag, i) => `nt${i}.tag = ?`).join(" AND ");

  const query = `
    SELECT DISTINCT n.id, n.path, n.name, n.mtime
    FROM notes n
    ${joins}
    WHERE ${conditions}
  `;

  const results = db.query(query).all(...tags) as { id: number; path: string; name: string; mtime: number }[];

  // Get tags for each note
  const notes: NoteWithTags[] = [];
  for (const row of results) {
    const tagRows = db.query("SELECT tag FROM note_tags WHERE note_id = ?").all(row.id) as { tag: string }[];
    notes.push({
      id: row.id,
      path: row.path,
      name: row.name,
      tags: tagRows.map(t => t.tag),
      mtime: new Date(row.mtime),
    });
  }

  db.close();
  return notes;
}

/**
 * Find notes by multiple tags (OR logic)
 * Returns notes that have ANY of the specified tags
 */
export async function findNotesByTagsOr(tags: string[]): Promise<NoteWithTags[]> {
  if (tags.length === 0) return [];
  if (tags.length === 1) return findNotesByTag(tags[0]);

  const db = await initDatabase();

  const placeholders = tags.map(() => "?").join(", ");
  const query = `
    SELECT DISTINCT n.id, n.path, n.name, n.mtime
    FROM notes n
    JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag IN (${placeholders})
  `;

  const results = db.query(query).all(...tags) as { id: number; path: string; name: string; mtime: number }[];

  // Get tags for each note
  const notes: NoteWithTags[] = [];
  for (const row of results) {
    const tagRows = db.query("SELECT tag FROM note_tags WHERE note_id = ?").all(row.id) as { tag: string }[];
    notes.push({
      id: row.id,
      path: row.path,
      name: row.name,
      tags: tagRows.map(t => t.tag),
      mtime: new Date(row.mtime),
    });
  }

  db.close();
  return notes;
}

/**
 * List all tags with counts
 * Much faster than scanning all files
 */
export async function listTagsWithCounts(): Promise<TagCount[]> {
  const db = await initDatabase();

  const results = db.query(`
    SELECT tag, COUNT(*) as count
    FROM note_tags
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `).all() as { tag: string; count: number }[];

  db.close();
  return results;
}

/**
 * List tags by prefix (e.g., "project/")
 */
export async function listTagsByPrefix(prefix: string): Promise<TagCount[]> {
  const db = await initDatabase();

  const results = db.query(`
    SELECT tag, COUNT(*) as count
    FROM note_tags
    WHERE tag LIKE ?
    GROUP BY tag
    ORDER BY count DESC, tag ASC
  `).all(prefix + "%") as { tag: string; count: number }[];

  db.close();
  return results;
}

/**
 * Get tag index statistics
 */
export async function getTagIndexStats(): Promise<TagIndexStats> {
  const db = await initDatabase();

  const noteCount = (db.query("SELECT COUNT(*) as count FROM notes").get() as { count: number }).count;
  const tagEntryCount = (db.query("SELECT COUNT(*) as count FROM note_tags").get() as { count: number }).count;
  const uniqueTagCount = (db.query("SELECT COUNT(DISTINCT tag) as count FROM note_tags").get() as { count: number }).count;
  const lastUpdate = db.query("SELECT MAX(indexed_at) as ts FROM note_tags").get() as { ts: number | null };

  db.close();

  return {
    totalNotes: noteCount,
    totalTags: tagEntryCount,
    uniqueTags: uniqueTagCount,
    lastUpdated: lastUpdate.ts ? new Date(lastUpdate.ts) : null,
  };
}

/**
 * Verify tag index consistency
 * Checks for:
 * - Stale entries (notes deleted from disk)
 * - Missing entries (notes added outside ctx)
 * - Outdated entries (notes modified since indexing)
 */
export async function verifyTagIndex(options?: {
  verbose?: boolean;
  clean?: boolean; // Remove stale entries
  update?: boolean; // Add missing entries
}): Promise<{
  stale: number;
  missing: number;
  outdated: number;
  errors: number;
}> {
  validateVault();
  const config = getConfig();
  const db = await initDatabase();

  const stats = { stale: 0, missing: 0, outdated: 0, errors: 0 };

  try {
    // Get all indexed notes
    const indexedNotes = db.query("SELECT id, path, mtime FROM notes").all() as {
      id: number;
      path: string;
      mtime: number;
    }[];

    // Check for stale entries (notes deleted from disk)
    for (const note of indexedNotes) {
      try {
        const fileStat = await stat(note.path);

        // Check if mtime changed (note was modified)
        if (fileStat.mtime.getTime() > note.mtime) {
          stats.outdated++;
          if (options?.verbose) {
            console.log(`Outdated: ${note.path}`);
          }
          if (options?.update) {
            await updateNoteTagsInIndex(note.path, { verbose: options.verbose });
          }
        }
      } catch (error) {
        // File doesn't exist - stale entry
        stats.stale++;
        if (options?.verbose) {
          console.log(`Stale: ${note.path}`);
        }
        if (options?.clean) {
          db.run("DELETE FROM notes WHERE id = ?", [note.id]);
        }
      }
    }

    // Check for missing entries (notes added outside ctx)
    const indexedPaths = new Set(indexedNotes.map(n => n.path));

    const walkDir = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (
          entry.name.startsWith(".") ||
          entry.name === "_meta" ||
          entry.name === "attachments"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          if (!indexedPaths.has(fullPath)) {
            stats.missing++;
            if (options?.verbose) {
              console.log(`Missing: ${fullPath}`);
            }
            if (options?.update) {
              await updateNoteTagsInIndex(fullPath, { verbose: options.verbose });
            }
          }
        }
      }
    };

    await walkDir(config.vaultPath);

    if (options?.verbose) {
      console.log("\nVerification Summary:");
      console.log(`  Stale entries: ${stats.stale}`);
      console.log(`  Missing entries: ${stats.missing}`);
      console.log(`  Outdated entries: ${stats.outdated}`);
      if (options?.clean || options?.update) {
        console.log("  Index updated");
      }
    }
  } finally {
    db.close();
  }

  return stats;
}

/**
 * Check if tag index is available and up-to-date
 * Returns true if index can be used for queries
 */
export async function isTagIndexAvailable(): Promise<boolean> {
  try {
    const db = await initDatabase();

    // Check if note_tags table exists and has data
    const count = (db.query("SELECT COUNT(*) as count FROM note_tags").get() as { count: number }).count;

    db.close();
    return count > 0;
  } catch (error) {
    return false;
  }
}
