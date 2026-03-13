#!/usr/bin/env bun
// Working Memory System - Database Bootstrap
// Creates directories and initializes SQLite with full schema

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";

const MEMORY_ROOT = resolve(
  process.env.PAI_DIR ?? resolve(homedir(), ".claude"),
  "MEMORY"
);
const DB_PATH = resolve(MEMORY_ROOT, "memory.db");
const SCHEMA_PATH = resolve(dirname(import.meta.path), "schema.sql");

// --- Directory Bootstrap ---

const DIRS = [
  resolve(MEMORY_ROOT, "CAPTURE"),
  resolve(MEMORY_ROOT, "ARCHIVE"),
];

function bootstrapDirs(): void {
  for (const dir of DIRS) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`[bootstrap] Created: ${dir}`);
    }
  }
}

// --- Database Init ---

function initDatabase(): Database {
  const db = new Database(DB_PATH, { create: true });

  // Enable WAL mode for concurrent read performance
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  // Read and execute schema
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  return db;
}

// --- Verification ---

function verify(db: Database): void {
  // Check WAL mode
  const walResult = db.query("PRAGMA journal_mode;").get() as {
    journal_mode: string;
  };
  console.log(`[verify] journal_mode: ${walResult.journal_mode}`);

  // List all tables
  const tables = db
    .query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    )
    .all() as { name: string }[];
  console.log(`[verify] Tables: ${tables.map((t) => t.name).join(", ")}`);

  // Check for FTS5 search table
  const allObjects = db
    .query("SELECT name, type FROM sqlite_master ORDER BY name;")
    .all() as { name: string; type: string }[];

  const searchTable = allObjects.find((o) => o.name === "search");
  if (searchTable) {
    console.log(`[verify] FTS5 table: search (type: ${searchTable.type})`);
  }

  // List indexes
  const indexes = db
    .query(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name;"
    )
    .all() as { name: string }[];
  console.log(
    `[verify] Indexes: ${indexes.map((i) => i.name).join(", ")}`
  );

  // Verify foreign keys
  const fkResult = db.query("PRAGMA foreign_keys;").get() as {
    foreign_keys: number;
  };
  console.log(
    `[verify] foreign_keys: ${fkResult.foreign_keys ? "ON" : "OFF"}`
  );
}

// --- Main ---

function main(): void {
  console.log(
    "[db-init] Bootstrapping Working Memory System..."
  );
  console.log(`[db-init] DB path: ${DB_PATH}`);

  bootstrapDirs();

  const db = initDatabase();
  verify(db);
  db.close();

  console.log("[db-init] Bootstrap complete.");
}

main();
