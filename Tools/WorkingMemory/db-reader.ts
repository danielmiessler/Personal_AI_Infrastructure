// Working Memory System - SQLite Read/Search Operations
// Handles all queries and full-text search against memory.db

import { statSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { getDb } from "./db-writer";
import type {
  SearchResult,
  EntryRow,
  DecisionRecord,
  TopicRecord,
  SessionRow,
} from "./types";

// --- Prepared Statements (lazily initialized) ---

let _stmts: ReturnType<typeof prepareStatements> | null = null;

function prepareStatements(db: ReturnType<typeof getDb>) {
  return {
    searchEntries: db.prepare(`
      SELECT
        entries.id AS entry_id,
        entries.session_id,
        entries.timestamp,
        entries.tool_name,
        snippet(search, 0, '>>>', '<<<', '...', 32) AS matched_text,
        search.rank
      FROM search
      JOIN entries ON search.rowid = entries.id
      WHERE search MATCH $query
      ORDER BY search.rank
      LIMIT $limit
    `),

    getTopicEntries: db.prepare(`
      SELECT e.*
      FROM entries e
      JOIN topic_entries te ON te.entry_id = e.id
      JOIN topics t ON t.id = te.topic_id
      WHERE t.name = $topic_name
      ORDER BY e.timestamp DESC
      LIMIT $limit
    `),

    getSessionEntries: db.prepare(`
      SELECT * FROM entries
      WHERE session_id = $session_id
      ORDER BY timestamp ASC
    `),

    getRecentDecisions: db.prepare(`
      SELECT id, session_id, entry_id, decision_text, reasoning_context, confidence, timestamp
      FROM decisions
      WHERE timestamp >= $since
      ORDER BY timestamp DESC
      LIMIT $limit
    `),

    getTopics: db.prepare(`
      SELECT id, name, first_seen, last_seen, session_count, entry_count
      FROM topics
      ORDER BY entry_count DESC
      LIMIT $limit
    `),

    getSessionList: db.prepare(`
      SELECT * FROM sessions
      ORDER BY started_at DESC
      LIMIT $limit
    `),

    getSessionById: db.prepare(`
      SELECT * FROM sessions WHERE id = $id
    `),

    countEntries: db.prepare(`SELECT COUNT(*) AS count FROM entries`),
    countSessions: db.prepare(`SELECT COUNT(*) AS count FROM sessions`),
    countTopics: db.prepare(`SELECT COUNT(*) AS count FROM topics`),
    countDecisions: db.prepare(`SELECT COUNT(*) AS count FROM decisions`),
  };
}

function getStmts() {
  if (!_stmts) {
    _stmts = prepareStatements(getDb());
  }
  return _stmts;
}

// --- Public Read Functions ---

/**
 * Full-text search using FTS5 with BM25 ranking.
 * Returns entries matching the query, ordered by relevance.
 */
export function searchEntries(
  query: string,
  limit: number = 20
): SearchResult[] {
  const stmts = getStmts();
  return stmts.searchEntries.all({
    $query: query,
    $limit: limit,
  }) as SearchResult[];
}

/**
 * Get all entries tagged with a specific topic via the junction table.
 */
export function getTopicEntries(
  topicName: string,
  limit: number = 50
): EntryRow[] {
  const stmts = getStmts();
  return stmts.getTopicEntries.all({
    $topic_name: topicName,
    $limit: limit,
  }) as EntryRow[];
}

/**
 * Get all entries for a specific session, ordered chronologically.
 */
export function getSessionEntries(sessionId: string): EntryRow[] {
  const stmts = getStmts();
  return stmts.getSessionEntries.all({
    $session_id: sessionId,
  }) as EntryRow[];
}

/**
 * Get recent decisions from the last N days.
 */
export function getRecentDecisions(
  days: number = 7,
  limit: number = 100
): DecisionRecord[] {
  const stmts = getStmts();
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();
  return stmts.getRecentDecisions.all({
    $since: since,
    $limit: limit,
  }) as DecisionRecord[];
}

/**
 * Get all topics sorted by entry_count descending.
 */
export function getTopics(limit: number = 100): TopicRecord[] {
  const stmts = getStmts();
  return stmts.getTopics.all({ $limit: limit }) as TopicRecord[];
}

/**
 * Get recent sessions, most recent first.
 */
export function getSessionList(limit: number = 50): SessionRow[] {
  const stmts = getStmts();
  return stmts.getSessionList.all({ $limit: limit }) as SessionRow[];
}

/**
 * Get a single session by ID, or null if not found.
 */
export function getSessionById(id: string): SessionRow | null {
  const stmts = getStmts();
  const row = stmts.getSessionById.get({ $id: id }) as
    | SessionRow
    | undefined;
  return row ?? null;
}

/**
 * Get aggregate stats about the memory database.
 */
export function getStats(): {
  totalEntries: number;
  totalSessions: number;
  totalTopics: number;
  totalDecisions: number;
  dbSizeBytes: number;
} {
  const stmts = getStmts();
  const dbPath = resolve(
    process.env.PAI_DIR ?? resolve(homedir(), ".claude"),
    "MEMORY",
    "memory.db"
  );

  const totalEntries = (stmts.countEntries.get() as { count: number })
    .count;
  const totalSessions = (stmts.countSessions.get() as { count: number })
    .count;
  const totalTopics = (stmts.countTopics.get() as { count: number }).count;
  const totalDecisions = (
    stmts.countDecisions.get() as { count: number }
  ).count;

  let dbSizeBytes = 0;
  try {
    dbSizeBytes = statSync(dbPath).size;
  } catch {
    // DB file may not exist yet
  }

  return {
    totalEntries,
    totalSessions,
    totalTopics,
    totalDecisions,
    dbSizeBytes,
  };
}
