# Working Memory System

**A SQLite-backed queryable memory layer for PAI's flat-file memory system.**

PAI's default memory system (v7.x) uses flat files (JSONL, YAML, Markdown) written by hooks. It is write-heavy but read-light -- searching across hundreds of session files means globbing and grepping. The Working Memory System adds structured queries, full-text search, compression, indexing, and a CLI on top.

## Architecture

```
Claude Code Session
    |
    v
capture-hook.ts (PostToolUse hook)
    |-- Writes append-only JSONL (primary store, crash-safe)
    |-- Deferred SQLite insert via db-writer (secondary index)
    v
session-summarizer-hook.ts (Stop hook)
    |-- Reads session JSONL
    |-- Aggregates topics, decisions, action items, questions
    |-- Writes summary to JSONL + SQLite
    v
memory.ts (Query CLI)
    |-- Full-text search (FTS5 + BM25 ranking)
    |-- Topic-based context retrieval
    |-- Decision history with reasoning
    |-- Session browsing and summaries
    |-- Storage statistics
```

## Quick Start

```bash
# 1. Initialize the database
bun db-init.ts

# 2. Register hooks in your settings.json
# capture-hook.ts  -> PostToolUse
# session-summarizer-hook.ts -> Stop

# 3. Query your memory
bun memory.ts search "database migration"
bun memory.ts context "authentication"
bun memory.ts decisions --last 30d
bun memory.ts session list
bun memory.ts stats
```

## Files

| File | Purpose |
|------|---------|
| `schema.sql` | SQLite schema (sessions, entries, topics, decisions, FTS5) |
| `types.ts` | Shared TypeScript interfaces |
| `db-init.ts` | Database bootstrap and verification |
| `db-writer.ts` | Write operations (insert entry, update session) |
| `db-reader.ts` | Read/query operations (search, topics, decisions, stats) |
| `memory.ts` | Query CLI (the main user-facing tool) |
| `capture-hook.ts` | PostToolUse hook (captures tool calls to JSONL + SQLite) |
| `session-summarizer-hook.ts` | Stop hook (aggregates session into summary) |
| `compressor.ts` | Gzip compression for old JSONL files |
| `indexer.ts` | Background re-indexer (backfills SQLite from JSONL) |
| `maintenance.ts` | Storage management CLI (compress, archive, vacuum) |
| `significance-scorer.ts` | Session significance scoring (keyword/impact analysis) |
| `daily-log.ts` | Daily log query tool (today, yesterday, week, search) |

## Storage Layout

```
~/.claude/MEMORY/
  +-- memory.db           # SQLite database (WAL mode)
  +-- CAPTURE/             # Primary JSONL store
  |   +-- YYYY-MM-DD/      # Date-partitioned directories
  |       +-- {session}.jsonl
  +-- ARCHIVE/             # Compressed old sessions
      +-- YYYY-MM/
      +-- archive-manifest.json
```

## Design Decisions

**JSONL is the source of truth.** SQLite is a secondary index that can be rebuilt from JSONL at any time via `indexer.ts reindex-all`. This means:

- Hook failures in SQLite writes are non-fatal
- The capture hook targets <100ms execution time
- Crash safety: JSONL writes use fsync

**WAL mode for concurrency.** Multiple readers (query CLI, agents) can read while the capture hook writes without blocking.

**FTS5 with Porter stemming.** Full-text search uses SQLite's FTS5 extension with `porter unicode61` tokenization for natural language queries with stemming support.

**Date-partitioned JSONL.** Capture files are organized by date (`CAPTURE/YYYY-MM-DD/`) for efficient archival and compression of old sessions.

## Maintenance

```bash
# Run all maintenance (compress old files, archive, check DB size)
bun maintenance.ts run

# Show storage breakdown
bun maintenance.ts stats

# Archive sessions older than 90 days
bun maintenance.ts archive --older-than 90d

# Reclaim SQLite space
bun maintenance.ts vacuum

# Re-index JSONL files into SQLite
bun indexer.ts reindex-all
```

## Requirements

- **Bun** >= 1.0 (uses `bun:sqlite` native module)
- SQLite with FTS5 support (included in Bun's bundled SQLite)
