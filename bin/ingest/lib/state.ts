/**
 * State Management for Ingest Pipeline
 *
 * Tracks processed messages, failures, and last update offset.
 * Uses SQLite for persistence.
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { getConfig } from "./config";

export interface MessageState {
  messageId: number;
  status: "pending" | "processing" | "completed" | "failed";
  contentType: string;
  createdAt: string;
  processedAt: string | null;
  error: string | null;
  outputPaths: string | null; // JSON array of paths
  retryCount: number;
}

let db: Database | null = null;

/**
 * Initialize the state database
 */
export function initDb(): Database {
  if (db) return db;

  const config = getConfig();
  const dbPath = config.stateDb;

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      message_id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      content_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT,
      error TEXT,
      output_paths TEXT,
      retry_count INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`);

  return db;
}

/**
 * Get the last processed update offset
 */
export function getLastOffset(): number | undefined {
  const db = initDb();
  const row = db.query("SELECT value FROM state WHERE key = 'last_offset'").get() as { value: string } | null;
  return row ? parseInt(row.value, 10) : undefined;
}

/**
 * Set the last processed update offset
 */
export function setLastOffset(offset: number): void {
  const db = initDb();
  db.run(
    "INSERT OR REPLACE INTO state (key, value) VALUES ('last_offset', ?)",
    [offset.toString()]
  );
}

/**
 * Check if a message has been processed
 */
export function isProcessed(messageId: number): boolean {
  const db = initDb();
  const row = db.query(
    "SELECT status FROM messages WHERE message_id = ? AND status = 'completed'"
  ).get(messageId) as { status: string } | null;
  return row !== null;
}

/**
 * Mark a message as processing
 */
export function markProcessing(messageId: number, contentType: string): void {
  const db = initDb();
  db.run(
    `INSERT OR REPLACE INTO messages (message_id, status, content_type, created_at, retry_count)
     VALUES (?, 'processing', ?, datetime('now'),
       COALESCE((SELECT retry_count FROM messages WHERE message_id = ?), 0))`,
    [messageId, contentType, messageId]
  );
}

/**
 * Mark a message as completed
 */
export function markCompleted(messageId: number, outputPaths: string[]): void {
  const db = initDb();
  db.run(
    `UPDATE messages SET
       status = 'completed',
       processed_at = datetime('now'),
       output_paths = ?,
       error = NULL
     WHERE message_id = ?`,
    [JSON.stringify(outputPaths), messageId]
  );
}

/**
 * Mark a message as failed
 */
export function markFailed(messageId: number, error: string): void {
  const db = initDb();
  db.run(
    `UPDATE messages SET
       status = 'failed',
       processed_at = datetime('now'),
       error = ?,
       retry_count = retry_count + 1
     WHERE message_id = ?`,
    [error, messageId]
  );
}

/**
 * Get pending messages (not yet processed)
 */
export function getPending(): MessageState[] {
  const db = initDb();
  const rows = db.query(
    "SELECT * FROM messages WHERE status = 'pending' ORDER BY created_at"
  ).all() as any[];
  return rows.map(rowToState);
}

/**
 * Get failed messages
 */
export function getFailed(): MessageState[] {
  const db = initDb();
  const rows = db.query(
    "SELECT * FROM messages WHERE status = 'failed' ORDER BY created_at DESC"
  ).all() as any[];
  return rows.map(rowToState);
}

/**
 * Get recent completed messages
 */
export function getCompleted(limit: number = 20): MessageState[] {
  const db = initDb();
  const rows = db.query(
    "SELECT * FROM messages WHERE status = 'completed' ORDER BY processed_at DESC LIMIT ?"
  ).all(limit) as any[];
  return rows.map(rowToState);
}

/**
 * Get status counts
 */
export function getStatusCounts(): Record<string, number> {
  const db = initDb();
  const rows = db.query(
    "SELECT status, COUNT(*) as count FROM messages GROUP BY status"
  ).all() as { status: string; count: number }[];

  const counts: Record<string, number> = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  for (const row of rows) {
    counts[row.status] = row.count;
  }

  return counts;
}

/**
 * Reset a message for retry
 */
export function resetForRetry(messageId: number): void {
  const db = initDb();
  db.run(
    "UPDATE messages SET status = 'pending', error = NULL WHERE message_id = ?",
    [messageId]
  );
}

/**
 * Reset all failed messages for retry
 */
export function resetAllFailed(): number {
  const db = initDb();
  const result = db.run(
    "UPDATE messages SET status = 'pending', error = NULL WHERE status = 'failed'"
  );
  return result.changes;
}

/**
 * Get message by ID
 */
export function getMessage(messageId: number): MessageState | null {
  const db = initDb();
  const row = db.query(
    "SELECT * FROM messages WHERE message_id = ?"
  ).get(messageId) as any | null;
  return row ? rowToState(row) : null;
}

/**
 * Convert DB row to MessageState
 */
function rowToState(row: any): MessageState {
  return {
    messageId: row.message_id,
    status: row.status,
    contentType: row.content_type,
    createdAt: row.created_at,
    processedAt: row.processed_at,
    error: row.error,
    outputPaths: row.output_paths,
    retryCount: row.retry_count,
  };
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
