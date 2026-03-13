#!/usr/bin/env bun
// Working Memory System - Background Re-Indexer
// Reads JSONL capture files and indexes any entries not yet in the database

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { getDb, insertEntry, ensureSession } from "./db-writer";
import type { CaptureEntry } from "./types";

const CAPTURE_DIR = resolve(
  process.env.PAI_DIR ?? resolve(homedir(), ".claude"),
  "MEMORY",
  "CAPTURE"
);

// --- Prepared Statements ---

let _stmts: ReturnType<typeof prepareStatements> | null = null;

function prepareStatements(db: ReturnType<typeof getDb>) {
  return {
    getMaxOffset: db.prepare(`
      SELECT COALESCE(MAX(raw_jsonl_offset), -1) AS max_offset
      FROM entries
      WHERE session_id = $session_id
    `),

    getIndexedSessionIds: db.prepare(`
      SELECT DISTINCT id FROM sessions
    `),
  };
}

function getStmts() {
  if (!_stmts) {
    _stmts = prepareStatements(getDb());
  }
  return _stmts;
}

// --- JSONL File Discovery ---

/**
 * List all JSONL files in the CAPTURE directory.
 * Supports date-partitioned and flat layouts.
 */
function listJsonlFiles(): {
  sessionId: string;
  path: string;
}[] {
  if (!existsSync(CAPTURE_DIR)) return [];

  const results: { sessionId: string; path: string }[] = [];

  const topEntries = readdirSync(CAPTURE_DIR, {
    withFileTypes: true,
  });
  for (const entry of topEntries) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      results.push({
        sessionId: entry.name.replace(/\.jsonl$/, ""),
        path: resolve(CAPTURE_DIR, entry.name),
      });
    } else if (
      entry.isDirectory() &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
    ) {
      const subDir = resolve(CAPTURE_DIR, entry.name);
      try {
        const subFiles = readdirSync(subDir).filter((f) =>
          f.endsWith(".jsonl")
        );
        for (const f of subFiles) {
          results.push({
            sessionId: f.replace(/\.jsonl$/, ""),
            path: resolve(subDir, f),
          });
        }
      } catch {
        // Skip unreadable subdirectories
      }
    }
  }

  return results;
}

/**
 * Parse a JSONL file into an array of entries with their line offsets.
 */
function parseJsonlFile(
  filePath: string
): { entry: CaptureEntry; offset: number }[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content
    .split("\n")
    .filter((line) => line.trim().length > 0);

  const results: { entry: CaptureEntry; offset: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i]) as CaptureEntry;
      if (parsed.type === "session_summary") continue;
      results.push({ entry: parsed, offset: i });
    } catch {
      console.warn(
        `[indexer] Skipping malformed line ${i} in ${filePath}`
      );
    }
  }

  return results;
}

// --- Public Functions ---

/**
 * Re-index a specific session's JSONL file.
 * Only indexes entries beyond the current max offset for that session.
 */
export function reindexSession(sessionId: string): number {
  let filePath: string | null = null;
  const flatPath = resolve(
    CAPTURE_DIR,
    `${sessionId}.jsonl`
  );
  if (existsSync(flatPath)) {
    filePath = flatPath;
  } else {
    try {
      const dateDirs = readdirSync(CAPTURE_DIR, {
        withFileTypes: true,
      })
        .filter(
          (d) =>
            d.isDirectory() &&
            /^\d{4}-\d{2}-\d{2}$/.test(d.name)
        )
        .map((d) => d.name)
        .sort()
        .reverse();
      for (const dateDir of dateDirs) {
        const candidate = resolve(
          CAPTURE_DIR,
          dateDir,
          `${sessionId}.jsonl`
        );
        if (existsSync(candidate)) {
          filePath = candidate;
          break;
        }
      }
    } catch {
      // CAPTURE_DIR unreadable
    }
  }

  if (!filePath) {
    console.warn(
      `[indexer] No JSONL file found for session: ${sessionId}`
    );
    return 0;
  }

  const stmts = getStmts();

  ensureSession(sessionId);

  const result = stmts.getMaxOffset.get({
    $session_id: sessionId,
  }) as { max_offset: number };
  const maxOffset = result.max_offset;

  const entries = parseJsonlFile(filePath);
  const newEntries = entries.filter(
    (e) => e.offset > maxOffset
  );

  if (newEntries.length === 0) {
    return 0;
  }

  let added = 0;
  for (const { entry, offset } of newEntries) {
    try {
      insertEntry(entry, offset);
      added++;
    } catch (err) {
      console.error(
        `[indexer] Failed to index entry at offset ${offset} in session ${sessionId}:`,
        err
      );
    }
  }

  console.log(
    `[indexer] Session ${sessionId}: indexed ${added} new entries`
  );
  return added;
}

/**
 * Scan all JSONL files and index any missing entries.
 */
export function reindexAll(): {
  sessionsProcessed: number;
  entriesAdded: number;
} {
  const files = listJsonlFiles();

  if (files.length === 0) {
    console.log(
      "[indexer] No JSONL files found in CAPTURE directory"
    );
    return { sessionsProcessed: 0, entriesAdded: 0 };
  }

  let sessionsProcessed = 0;
  let entriesAdded = 0;

  for (const { sessionId } of files) {
    const added = reindexSession(sessionId);
    if (added > 0) {
      entriesAdded += added;
    }
    sessionsProcessed++;
  }

  console.log(
    `[indexer] Complete: ${sessionsProcessed} sessions processed, ${entriesAdded} entries added`
  );
  return { sessionsProcessed, entriesAdded };
}

/**
 * Find JSONL files that don't have a matching session in the database.
 */
export function getUnindexedSessions(): string[] {
  const files = listJsonlFiles();
  const stmts = getStmts();

  const indexedSessions = new Set(
    (
      stmts.getIndexedSessionIds.all() as { id: string }[]
    ).map((r) => r.id)
  );

  return files
    .map((f) => f.sessionId)
    .filter((id) => !indexedSessions.has(id));
}

// --- CLI Entry Point ---

if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "reindex-all": {
      const result = reindexAll();
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "reindex": {
      const sessionId = args[1];
      if (!sessionId) {
        console.error(
          "Usage: bun indexer.ts reindex <session-id>"
        );
        process.exit(1);
      }
      const added = reindexSession(sessionId);
      console.log(
        JSON.stringify({ sessionId, entriesAdded: added })
      );
      break;
    }

    case "unindexed": {
      const sessions = getUnindexedSessions();
      console.log(JSON.stringify(sessions, null, 2));
      break;
    }

    default: {
      console.log("Working Memory Indexer");
      console.log("Usage:");
      console.log(
        "  bun indexer.ts reindex-all          - Re-index all JSONL files"
      );
      console.log(
        "  bun indexer.ts reindex <session-id>  - Re-index a specific session"
      );
      console.log(
        "  bun indexer.ts unindexed             - List unindexed sessions"
      );
      break;
    }
  }
}
