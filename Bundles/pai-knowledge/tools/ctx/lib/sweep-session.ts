/**
 * sweep-session.ts - Sweep Session State Management
 *
 * Manages sweep session state including:
 * - Queue with index → path mapping
 * - Current position tracking
 * - Progress persistence for resume capability
 *
 * This extends the general session concept from session-awareness.ts
 * with sweep-specific functionality for flashcard mode.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

// ============================================================================
// Types
// ============================================================================

export interface SweepQueueItem {
  index: number;           // 1-based index shown to user
  path: string;            // Full absolute path to note
  name: string;            // Note filename (without extension)
  status: "pending" | "done" | "skipped" | "deleted";
}

export interface SweepSession {
  id: string;              // session/sweep-YYYY-MM-DD-HHMM format
  startedAt: string;       // ISO timestamp
  queue: SweepQueueItem[]; // Ordered list of notes to process
  currentIndex: number;    // Current position (1-based, 0 = not started)
  totalCount: number;      // Total notes in queue
  doneCount: number;       // Notes marked done
  skippedCount: number;    // Notes skipped
  deletedCount: number;    // Notes deleted
  // Archive fields (set on natural completion)
  archived?: boolean;      // True when session completed naturally
  completedAt?: string;    // ISO timestamp of completion
  duration?: number;       // Elapsed time in seconds
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_DIR = join(homedir(), ".cache", "ctx");
const SWEEP_SESSION_FILE = join(CACHE_DIR, "sweep-session.json");
const SWEEP_ARCHIVE_DIR = join(CACHE_DIR, "sweep-sessions");

// Maximum age for resumable sweep sessions (4 hours)
const MAX_SWEEP_SESSION_AGE_MS = 4 * 60 * 60 * 1000;

// ============================================================================
// Session Persistence
// ============================================================================

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Save sweep session to disk
 */
export function saveSweepSession(session: SweepSession): void {
  ensureCacheDir();
  writeFileSync(SWEEP_SESSION_FILE, JSON.stringify(session, null, 2));
}

/**
 * Load sweep session from disk
 * Returns null if no session or session expired
 */
export function loadSweepSession(): SweepSession | null {
  if (!existsSync(SWEEP_SESSION_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(SWEEP_SESSION_FILE, "utf-8");
    const session = JSON.parse(content) as SweepSession;

    // Check if session is expired
    const startedAt = new Date(session.startedAt);
    const ageMs = Date.now() - startedAt.getTime();

    if (ageMs > MAX_SWEEP_SESSION_AGE_MS) {
      // Session expired, clear it
      clearSweepSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Clear the sweep session (explicit discard - no archive)
 */
export function clearSweepSession(): void {
  if (existsSync(SWEEP_SESSION_FILE)) {
    unlinkSync(SWEEP_SESSION_FILE);
  }
}

/**
 * Archive the current session (called on natural completion)
 * Preserves session data for historical insights
 */
export function archiveCurrentSession(): void {
  const session = loadSweepSession();
  if (!session) return;

  // Ensure archive directory exists
  if (!existsSync(SWEEP_ARCHIVE_DIR)) {
    mkdirSync(SWEEP_ARCHIVE_DIR, { recursive: true });
  }

  // Add completion metadata
  const startedAt = new Date(session.startedAt);
  const completedAt = new Date();
  const durationSec = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

  const archivedSession: SweepSession = {
    ...session,
    archived: true,
    completedAt: completedAt.toISOString(),
    duration: durationSec,
  };

  // Generate archive filename from session ID
  // session/sweep-2025-12-30-0915 → session-2025-12-30-0915.json
  const archiveFilename = session.id.replace("session/", "").replace(/\//g, "-") + ".json";
  const archivePath = join(SWEEP_ARCHIVE_DIR, archiveFilename);

  // Write to archive and remove active session
  writeFileSync(archivePath, JSON.stringify(archivedSession, null, 2));
  unlinkSync(SWEEP_SESSION_FILE);
}

/**
 * Check if there's an active sweep session
 */
export function hasActiveSweepSession(): boolean {
  return loadSweepSession() !== null;
}

// ============================================================================
// Session Creation
// ============================================================================

/**
 * Generate sweep session ID
 * Format: session/sweep-YYYY-MM-DD-HHMM
 */
export function generateSweepSessionId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `session/sweep-${year}-${month}-${day}-${hours}${minutes}`;
}

/**
 * Create a new sweep session from a list of notes
 * @param notes - Array of {path, name} objects for the queue
 */
export function createSweepSession(notes: { path: string; name: string }[]): SweepSession {
  const session: SweepSession = {
    id: generateSweepSessionId(),
    startedAt: new Date().toISOString(),
    queue: notes.map((note, i) => ({
      index: i + 1,
      path: note.path,
      name: note.name,
      status: "pending",
    })),
    currentIndex: 0,
    totalCount: notes.length,
    doneCount: 0,
    skippedCount: 0,
    deletedCount: 0,
  };

  saveSweepSession(session);
  return session;
}

// ============================================================================
// Queue Navigation
// ============================================================================

/**
 * Advance to the next note in the queue
 * Returns the next item or null if queue exhausted
 */
export function advanceToNext(): SweepQueueItem | null {
  const session = loadSweepSession();
  if (!session) return null;

  const nextIndex = session.currentIndex + 1;
  if (nextIndex > session.totalCount) {
    return null;
  }

  session.currentIndex = nextIndex;
  saveSweepSession(session);

  return session.queue[nextIndex - 1];
}

/**
 * Get current queue item
 */
export function getCurrentItem(): SweepQueueItem | null {
  const session = loadSweepSession();
  if (!session || session.currentIndex === 0) return null;

  return session.queue[session.currentIndex - 1] || null;
}

/**
 * Mark current item as done and advance
 */
export function markCurrentDone(): void {
  const session = loadSweepSession();
  if (!session || session.currentIndex === 0) return;

  const item = session.queue[session.currentIndex - 1];
  if (item) {
    item.status = "done";
    session.doneCount++;
    saveSweepSession(session);
  }
}

/**
 * Mark current item as skipped and advance
 */
export function markCurrentSkipped(): void {
  const session = loadSweepSession();
  if (!session || session.currentIndex === 0) return;

  const item = session.queue[session.currentIndex - 1];
  if (item) {
    item.status = "skipped";
    session.skippedCount++;
    saveSweepSession(session);
  }
}

/**
 * Mark an item as deleted by index
 * Used when a note is permanently deleted from the vault
 * @param index - The 1-based index of the item to mark deleted
 */
export function markItemDeleted(index: number): void {
  const session = loadSweepSession();
  if (!session) return;

  const item = session.queue.find(q => q.index === index);
  if (item && item.status !== "deleted") {
    item.status = "deleted";
    session.deletedCount = (session.deletedCount || 0) + 1;
    saveSweepSession(session);
  }
}

/**
 * Mark an item as done by index
 * Used when a note is marked as reviewed (status/inbox removed)
 * @param index - The 1-based index of the item to mark done
 */
export function markItemDone(index: number): void {
  const session = loadSweepSession();
  if (!session) return;

  const item = session.queue.find(q => q.index === index);
  if (item && item.status === "pending") {
    item.status = "done";
    session.doneCount = (session.doneCount || 0) + 1;
    saveSweepSession(session);
  }
}

// ============================================================================
// Index Resolution (CRITICAL for sweep workflow)
// ============================================================================

/**
 * Resolve a sweep queue index to a full path
 * This is the key function that allows "ctx rename 1" to work
 *
 * @param index - The 1-based index from the sweep queue
 * @returns The full path to the note, or null if not found or deleted
 */
export function resolveNoteFromIndex(index: number): string | null {
  const session = loadSweepSession();
  if (!session) return null;

  const item = session.queue.find(q => q.index === index);
  // Return null if item not found or was deleted
  if (!item || item.status === "deleted") return null;
  return item.path;
}

/**
 * Resolve a note reference to a full path
 * Handles both:
 * - Numeric indices (1, 2, 3) from sweep queue
 * - Direct paths or filenames
 *
 * @param ref - Either a number (index) or a path/filename
 * @param vaultPath - The vault path for resolving relative names
 * @returns The full path to the note
 */
export function resolveNoteRef(ref: string, vaultPath?: string): string | null {
  // Check if it's a pure number (sweep index)
  const trimmed = ref.trim();
  const asNumber = parseInt(trimmed, 10);

  if (!isNaN(asNumber) && String(asNumber) === trimmed) {
    // It's a sweep queue index
    const resolved = resolveNoteFromIndex(asNumber);
    if (resolved) {
      return resolved;
    }
    // Fall through to try as filename if no session
  }

  // Not a number or no session - try as path/filename
  if (trimmed.startsWith("/")) {
    // Absolute path
    return trimmed;
  }

  if (vaultPath) {
    // Try as relative to vault
    const fullPath = join(vaultPath, trimmed);
    if (existsSync(fullPath)) {
      return fullPath;
    }
    // Try with .md extension
    const withMd = fullPath.endsWith(".md") ? fullPath : `${fullPath}.md`;
    if (existsSync(withMd)) {
      return withMd;
    }
  }

  return null;
}

/**
 * Update the path for a queue item (after rename)
 * @param oldPath - The original path
 * @param newPath - The new path after rename
 */
export function updateQueueItemPath(oldPath: string, newPath: string): void {
  const session = loadSweepSession();
  if (!session) return;

  const item = session.queue.find(q => q.path === oldPath);
  if (item) {
    item.path = newPath;
    // Update name from new path
    const match = newPath.match(/([^/]+)\.md$/);
    if (match) {
      item.name = match[1];
    }
    saveSweepSession(session);
  }
}

// ============================================================================
// Progress Display
// ============================================================================

/**
 * Get sweep session progress summary
 */
export function getSweepProgress(): string {
  const session = loadSweepSession();
  if (!session) {
    return "No active sweep session";
  }

  const startedAt = new Date(session.startedAt);
  const elapsed = Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60));
  const deletedCount = session.deletedCount || 0;
  const pending = session.totalCount - session.doneCount - session.skippedCount - deletedCount;

  return [
    `🧹 Sweep Session: ${session.id}`,
    `📊 Progress: ${session.currentIndex}/${session.totalCount}`,
    `✅ Done: ${session.doneCount} | ⏭️ Skipped: ${session.skippedCount} | 🗑️ Deleted: ${deletedCount} | ⏳ Pending: ${pending}`,
    `⏱️ Elapsed: ${elapsed} minutes`,
  ].join("\n");
}

/**
 * Format the flashcard header with position info
 */
export function formatFlashcardHeader(position: number, total: number): string {
  return `📥 Note ${position} of ${total}`;
}
