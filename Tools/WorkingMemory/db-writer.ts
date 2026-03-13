// Working Memory System - SQLite Write Operations
// Handles all insert/update operations against memory.db

import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { CaptureEntry, SessionSummary } from "./types";

// --- Singleton DB Instance ---

const DB_PATH = resolve(
  process.env.PAI_DIR ?? resolve(homedir(), ".claude"),
  "MEMORY",
  "memory.db"
);
let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readwrite: true, create: false });
    // Verify WAL mode (already set by db-init.ts)
    const wal = _db.query("PRAGMA journal_mode;").get() as {
      journal_mode: string;
    };
    if (wal.journal_mode !== "wal") {
      _db.exec("PRAGMA journal_mode = WAL;");
    }
    _db.exec("PRAGMA foreign_keys = ON;");
    _db.exec("PRAGMA busy_timeout = 5000;");
  }
  return _db;
}

// --- Prepared Statements (lazily initialized) ---

let _stmts: ReturnType<typeof prepareStatements> | null = null;

function prepareStatements(db: Database) {
  return {
    insertEntry: db.prepare(`
      INSERT INTO entries (session_id, timestamp, message_role, tool_name,
        tool_input_summary, tool_output_summary, topics_json, decisions_json,
        reasoning_chain, raw_jsonl_offset)
      VALUES ($session_id, $timestamp, $message_role, $tool_name,
        $tool_input_summary, $tool_output_summary, $topics_json, $decisions_json,
        $reasoning_chain, $raw_jsonl_offset)
    `),

    upsertTopic: db.prepare(`
      INSERT INTO topics (name, first_seen, last_seen, session_count, entry_count)
      VALUES ($name, $timestamp, $timestamp, 1, 1)
      ON CONFLICT(name) DO UPDATE SET
        last_seen = $timestamp,
        entry_count = entry_count + 1
    `),

    insertTopicEntry: db.prepare(`
      INSERT OR IGNORE INTO topic_entries (topic_id, entry_id)
      VALUES ($topic_id, $entry_id)
    `),

    getTopicId: db.prepare(`
      SELECT id FROM topics WHERE name = $name
    `),

    insertDecision: db.prepare(`
      INSERT INTO decisions (session_id, entry_id, decision_text, reasoning_context, confidence, timestamp)
      VALUES ($session_id, $entry_id, $decision_text, $reasoning_context, $confidence, $timestamp)
    `),

    ensureSession: db.prepare(`
      INSERT OR IGNORE INTO sessions (id, started_at, entry_count)
      VALUES ($id, $started_at, 0)
    `),

    updateSession: db.prepare(`
      UPDATE sessions SET
        ended_at = $ended_at,
        duration_seconds = $duration_seconds,
        summary = $summary,
        topics_json = $topics_json,
        decisions_json = $decisions_json,
        action_items_json = $action_items_json,
        unresolved_json = $unresolved_json,
        entry_count = $entry_count
      WHERE id = $id
    `),

    incrementSessionEntryCount: db.prepare(`
      UPDATE sessions SET entry_count = entry_count + 1 WHERE id = $id
    `),
  };
}

function getStmts() {
  if (!_stmts) {
    _stmts = prepareStatements(getDb());
  }
  return _stmts;
}

// --- Public Write Functions ---

/**
 * Insert a captured entry into the database.
 * Handles topics (upsert + junction) and decisions as part of the same transaction.
 * Returns the new entry ID.
 */
export function insertEntry(entry: CaptureEntry, rawOffset?: number): number {
  const db = getDb();
  const stmts = getStmts();

  const entryId = db.transaction(() => {
    // 1. Ensure session exists
    ensureSession(entry.session_id);

    // 2. Insert the entry row
    stmts.insertEntry.run({
      $session_id: entry.session_id,
      $timestamp: entry.timestamp,
      $message_role: entry.message_role,
      $tool_name: entry.tool_name,
      $tool_input_summary: entry.tool_input_summary,
      $tool_output_summary: entry.tool_output_summary,
      $topics_json: JSON.stringify(entry.topics_extracted),
      $decisions_json: JSON.stringify(entry.decisions_made),
      $reasoning_chain: entry.reasoning_chain,
      $raw_jsonl_offset: rawOffset ?? null,
    });

    // Get the inserted entry ID
    const lastId = (
      db.query("SELECT last_insert_rowid() as id").get() as { id: number }
    ).id;

    // 3. Increment session entry count
    stmts.incrementSessionEntryCount.run({ $id: entry.session_id });

    // 4. Handle topics: upsert each topic and create junction rows
    for (const topicName of entry.topics_extracted) {
      stmts.upsertTopic.run({
        $name: topicName,
        $timestamp: entry.timestamp,
      });

      const topicRow = stmts.getTopicId.get({ $name: topicName }) as {
        id: number;
      } | null;
      if (topicRow) {
        stmts.insertTopicEntry.run({
          $topic_id: topicRow.id,
          $entry_id: lastId,
        });
      }
    }

    // 5. Handle decisions: insert each decision linked to this entry
    for (const decisionText of entry.decisions_made) {
      stmts.insertDecision.run({
        $session_id: entry.session_id,
        $entry_id: lastId,
        $decision_text: decisionText,
        $reasoning_context: entry.reasoning_chain,
        $confidence: "medium",
        $timestamp: entry.timestamp,
      });
    }

    return lastId;
  })();

  return entryId;
}

/**
 * Update a session row with summary data (called at session end).
 */
export function updateSession(
  sessionId: string,
  summary: SessionSummary
): void {
  const stmts = getStmts();

  stmts.updateSession.run({
    $id: sessionId,
    $ended_at: new Date().toISOString(),
    $duration_seconds: summary.duration,
    $summary: JSON.stringify({
      key_files_touched: summary.key_files_touched,
    }),
    $topics_json: JSON.stringify(summary.topics_covered),
    $decisions_json: JSON.stringify(summary.decisions_made),
    $action_items_json: JSON.stringify(summary.action_items),
    $unresolved_json: JSON.stringify(summary.unresolved_questions),
    $entry_count: summary.entry_count,
  });
}

/**
 * Create a session row if it doesn't exist (INSERT OR IGNORE).
 */
export function ensureSession(sessionId: string): void {
  const stmts = getStmts();
  stmts.ensureSession.run({
    $id: sessionId,
    $started_at: new Date().toISOString(),
  });
}
