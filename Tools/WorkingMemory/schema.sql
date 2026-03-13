-- Working Memory System - SQLite Schema
-- Queryable memory layer on top of PAI's flat-file memory system
-- Enable WAL mode (set via PRAGMA in db-init.ts)

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER,
  summary TEXT,
  topics_json TEXT,
  decisions_json TEXT,
  action_items_json TEXT,
  unresolved_json TEXT,
  entry_count INTEGER DEFAULT 0
);

-- Entries table (one row per captured tool call)
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  message_role TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_input_summary TEXT NOT NULL DEFAULT '',
  tool_output_summary TEXT NOT NULL DEFAULT '',
  topics_json TEXT NOT NULL DEFAULT '[]',
  decisions_json TEXT NOT NULL DEFAULT '[]',
  reasoning_chain TEXT NOT NULL DEFAULT '',
  raw_jsonl_offset INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Topics table (unique topic names with counters)
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  session_count INTEGER DEFAULT 1,
  entry_count INTEGER DEFAULT 1
);

-- Junction table: topics <-> entries (many-to-many)
CREATE TABLE IF NOT EXISTS topic_entries (
  topic_id INTEGER NOT NULL,
  entry_id INTEGER NOT NULL,
  PRIMARY KEY (topic_id, entry_id),
  FOREIGN KEY (topic_id) REFERENCES topics(id),
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  entry_id INTEGER NOT NULL,
  decision_text TEXT NOT NULL,
  reasoning_context TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'medium',
  timestamp TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

-- FTS5 virtual table for full-text search across entries
CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(
  tool_input_summary,
  tool_output_summary,
  reasoning_chain,
  content='entries',
  content_rowid='id',
  tokenize='porter unicode61'
);

-- Triggers to keep FTS5 in sync with entries table
CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO search(rowid, tool_input_summary, tool_output_summary, reasoning_chain)
  VALUES (new.id, new.tool_input_summary, new.tool_output_summary, new.reasoning_chain);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO search(search, rowid, tool_input_summary, tool_output_summary, reasoning_chain)
  VALUES ('delete', old.id, old.tool_input_summary, old.tool_output_summary, old.reasoning_chain);
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO search(search, rowid, tool_input_summary, tool_output_summary, reasoning_chain)
  VALUES ('delete', old.id, old.tool_input_summary, old.tool_output_summary, old.reasoning_chain);
  INSERT INTO search(rowid, tool_input_summary, tool_output_summary, reasoning_chain)
  VALUES (new.id, new.tool_input_summary, new.tool_output_summary, new.reasoning_chain);
END;

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_entries_session_id ON entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_entries_tool_name ON entries(tool_name);
CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);
CREATE INDEX IF NOT EXISTS idx_decisions_session_id ON decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(timestamp);
