#!/usr/bin/env bun
// Working Memory System - Storage Management CLI
// Usage:
//   bun maintenance.ts run        - run all maintenance tasks
//   bun maintenance.ts stats      - show storage breakdown
//   bun maintenance.ts archive    - archive old sessions [--older-than 90d]
//   bun maintenance.ts vacuum     - run SQLite VACUUM

import {
  statSync,
  readdirSync,
  mkdirSync,
  renameSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { Database } from "bun:sqlite";
import { compressFile, getCompressibleFiles } from "./compressor";

// --- Paths ---

const PAI_DIR =
  process.env.PAI_DIR ?? join(homedir(), ".claude");
const MEMORY_ROOT = join(PAI_DIR, "MEMORY");
const CAPTURE_DIR = join(MEMORY_ROOT, "CAPTURE");
const ARCHIVE_DIR = join(MEMORY_ROOT, "ARCHIVE");
const DB_PATH = join(MEMORY_ROOT, "memory.db");

// --- ANSI Colors ---

const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";

// --- Helpers ---

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getDirSize(dir: string): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        total += getDirSize(fullPath);
      } else if (entry.isFile()) {
        try {
          total += statSync(fullPath).size;
        } catch {
          // skip
        }
      }
    }
  } catch {
    // dir unreadable
  }
  return total;
}

function countFilesRecursive(
  dir: string,
  ext: string
): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countFilesRecursive(
          join(dir, entry.name),
          ext
        );
      } else if (entry.name.endsWith(ext)) {
        count++;
      }
    }
  } catch {
    // skip
  }
  return count;
}

function getDbTableCount(
  db: Database,
  table: string
): number {
  try {
    const row = db
      .query(`SELECT COUNT(*) as cnt FROM ${table}`)
      .get() as { cnt: number } | null;
    return row?.cnt ?? 0;
  } catch {
    return 0;
  }
}

function getSessionsByAge(
  db: Database,
  olderThanDays: number
): string[] {
  const cutoff = new Date(
    Date.now() - olderThanDays * 24 * 60 * 60 * 1000
  ).toISOString();
  try {
    const rows = db
      .query(
        `SELECT id FROM sessions WHERE started_at < ? ORDER BY started_at ASC`
      )
      .all(cutoff) as { id: string }[];
    return rows.map((r) => r.id);
  } catch {
    return [];
  }
}

function getRecentSessionIds(
  db: Database,
  keepCount: number
): Set<string> {
  try {
    const rows = db
      .query(
        `SELECT id FROM sessions ORDER BY started_at DESC LIMIT ?`
      )
      .all(keepCount) as { id: string }[];
    return new Set(rows.map((r) => r.id));
  } catch {
    return new Set();
  }
}

// --- Archive Manifest ---

interface ArchiveManifest {
  last_updated: string;
  archived_sessions: {
    session_id: string;
    archived_at: string;
    original_file: string;
    archive_path: string;
  }[];
}

function loadManifest(): ArchiveManifest {
  const manifestPath = join(
    ARCHIVE_DIR,
    "archive-manifest.json"
  );
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(
        readFileSync(manifestPath, "utf-8")
      ) as ArchiveManifest;
    } catch {
      // corrupted, start fresh
    }
  }
  return {
    last_updated: new Date().toISOString(),
    archived_sessions: [],
  };
}

function saveManifest(manifest: ArchiveManifest): void {
  ensureDir(ARCHIVE_DIR);
  manifest.last_updated = new Date().toISOString();
  writeFileSync(
    join(ARCHIVE_DIR, "archive-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
}

// --- Commands ---

async function cmdRun(): Promise<void> {
  console.log(
    `\n${BOLD}${CYAN}=== Working Memory Maintenance ===${RESET}\n`
  );

  const results: string[] = [];

  // 1. Compress old JSONL files
  console.log(
    `${BOLD}[1/4] Compressing JSONL files older than 7 days...${RESET}`
  );
  ensureDir(CAPTURE_DIR);
  const compressible = getCompressibleFiles(CAPTURE_DIR, 7);
  if (compressible.length === 0) {
    console.log(`  ${DIM}No files to compress${RESET}`);
    results.push("Compression: nothing to do");
  } else {
    let compressed = 0;
    let errors = 0;
    for (const file of compressible) {
      try {
        await compressFile(file);
        compressed++;
        console.log(
          `  ${GREEN}+${RESET} ${basename(file)}`
        );
      } catch (err) {
        errors++;
        console.log(
          `  ${RED}!${RESET} Failed: ${basename(file)} - ${err}`
        );
      }
    }
    results.push(
      `Compression: ${compressed} files compressed, ${errors} errors`
    );
  }

  // 2. Archive sessions older than 90 days
  console.log(
    `\n${BOLD}[2/4] Archiving sessions older than 90 days...${RESET}`
  );
  const archiveCount = await archiveSessions(90);
  results.push(
    `Archive: ${archiveCount} sessions archived`
  );

  // 3. Check DB size
  console.log(
    `\n${BOLD}[3/4] Checking database size...${RESET}`
  );
  if (existsSync(DB_PATH)) {
    const dbSize = statSync(DB_PATH).size;
    const dbSizeFormatted = formatBytes(dbSize);
    if (dbSize > 5 * 1024 * 1024 * 1024) {
      console.log(
        `  ${RED}WARNING: Database is ${dbSizeFormatted} (exceeds 5GB threshold)${RESET}`
      );
      console.log(
        `  ${YELLOW}Consider running: bun maintenance.ts vacuum${RESET}`
      );
      results.push(
        `DB size: ${dbSizeFormatted} (WARNING: >5GB)`
      );
    } else {
      console.log(
        `  ${GREEN}Database size: ${dbSizeFormatted}${RESET}`
      );
      results.push(`DB size: ${dbSizeFormatted}`);
    }
  } else {
    console.log(`  ${DIM}Database not found${RESET}`);
    results.push("DB: not found");
  }

  // 4. Report
  console.log(`\n${BOLD}[4/4] Summary${RESET}`);
  for (const r of results) {
    console.log(`  ${CYAN}>${RESET} ${r}`);
  }
  console.log(`\n${GREEN}Maintenance complete.${RESET}\n`);
}

async function archiveSessions(
  olderThanDays: number
): Promise<number> {
  ensureDir(CAPTURE_DIR);
  ensureDir(ARCHIVE_DIR);

  if (!existsSync(DB_PATH)) {
    console.log(
      `  ${DIM}No database found, skipping archive${RESET}`
    );
    return 0;
  }

  const db = new Database(DB_PATH, { readonly: true });
  const oldSessions = getSessionsByAge(db, olderThanDays);
  const recentIds = getRecentSessionIds(db, 1000);
  db.close();

  const toArchive = oldSessions.filter(
    (id) => !recentIds.has(id)
  );

  if (toArchive.length === 0) {
    console.log(
      `  ${DIM}No sessions to archive${RESET}`
    );
    return 0;
  }

  const manifest = loadManifest();
  const alreadyArchived = new Set(
    manifest.archived_sessions.map((s) => s.session_id)
  );
  let archived = 0;

  for (const sessionId of toArchive) {
    if (alreadyArchived.has(sessionId)) continue;

    const captureFiles: { name: string; dir: string }[] =
      [];
    try {
      const topEntries = readdirSync(CAPTURE_DIR, {
        withFileTypes: true,
      });
      for (const entry of topEntries) {
        if (
          entry.isFile() &&
          entry.name.includes(sessionId) &&
          (entry.name.endsWith(".jsonl") ||
            entry.name.endsWith(".jsonl.gz"))
        ) {
          captureFiles.push({
            name: entry.name,
            dir: CAPTURE_DIR,
          });
        } else if (
          entry.isDirectory() &&
          /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
        ) {
          const subDir = join(CAPTURE_DIR, entry.name);
          try {
            const subFiles = readdirSync(subDir);
            for (const f of subFiles) {
              if (
                f.includes(sessionId) &&
                (f.endsWith(".jsonl") ||
                  f.endsWith(".jsonl.gz"))
              ) {
                captureFiles.push({
                  name: f,
                  dir: subDir,
                });
              }
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      /* skip */
    }

    for (const {
      name: file,
      dir: fileDir,
    } of captureFiles) {
      const srcPath = join(fileDir, file);

      let monthDir: string;
      try {
        const mtime = statSync(srcPath).mtime;
        const yyyy = mtime.getFullYear();
        const mm = String(mtime.getMonth() + 1).padStart(
          2,
          "0"
        );
        monthDir = `${yyyy}-${mm}`;
      } catch {
        monthDir = "unknown";
      }

      const archiveSubdir = join(ARCHIVE_DIR, monthDir);
      ensureDir(archiveSubdir);

      const destPath = join(archiveSubdir, file);
      try {
        renameSync(srcPath, destPath);
        manifest.archived_sessions.push({
          session_id: sessionId,
          archived_at: new Date().toISOString(),
          original_file: file,
          archive_path: join(monthDir, file),
        });
        console.log(
          `  ${GREEN}+${RESET} ${file} -> ${monthDir}/`
        );
        archived++;
      } catch (err) {
        console.log(
          `  ${RED}!${RESET} Failed to archive ${file}: ${err}`
        );
      }
    }
  }

  saveManifest(manifest);
  return archived;
}

function cmdStats(): void {
  console.log(
    `\n${BOLD}${CYAN}=== Working Memory Storage Stats ===${RESET}\n`
  );

  // CAPTURE dir
  console.log(
    `${BOLD}CAPTURE${RESET} ${DIM}(${CAPTURE_DIR})${RESET}`
  );
  const jsonlCount = countFilesRecursive(
    CAPTURE_DIR,
    ".jsonl"
  );
  const gzCount = countFilesRecursive(
    CAPTURE_DIR,
    ".jsonl.gz"
  );
  const captureSize = getDirSize(CAPTURE_DIR);
  console.log(
    `  .jsonl files:    ${CYAN}${jsonlCount}${RESET}`
  );
  console.log(
    `  .jsonl.gz files: ${CYAN}${gzCount}${RESET}`
  );
  console.log(
    `  Total size:      ${CYAN}${formatBytes(captureSize)}${RESET}`
  );

  // ARCHIVE dir
  console.log(
    `\n${BOLD}ARCHIVE${RESET} ${DIM}(${ARCHIVE_DIR})${RESET}`
  );
  if (existsSync(ARCHIVE_DIR)) {
    const archivedFiles =
      countFilesRecursive(ARCHIVE_DIR, ".jsonl") +
      countFilesRecursive(ARCHIVE_DIR, ".jsonl.gz");
    const archiveSize = getDirSize(ARCHIVE_DIR);
    console.log(
      `  Archived files:  ${CYAN}${archivedFiles}${RESET}`
    );
    console.log(
      `  Total size:      ${CYAN}${formatBytes(archiveSize)}${RESET}`
    );
  } else {
    console.log(`  ${DIM}Not created yet${RESET}`);
  }

  // SQLite DB
  console.log(
    `\n${BOLD}DATABASE${RESET} ${DIM}(${DB_PATH})${RESET}`
  );
  if (existsSync(DB_PATH)) {
    const dbSize = statSync(DB_PATH).size;
    console.log(
      `  File size:       ${CYAN}${formatBytes(dbSize)}${RESET}`
    );

    try {
      const db = new Database(DB_PATH, { readonly: true });
      const tables = [
        "sessions",
        "entries",
        "topics",
        "decisions",
      ];
      for (const table of tables) {
        const count = getDbTableCount(db, table);
        console.log(
          `  ${table}: ${CYAN}${count.toLocaleString()} rows${RESET}`
        );
      }
      db.close();
    } catch (err) {
      console.log(
        `  ${RED}Could not read database: ${err}${RESET}`
      );
    }

    if (dbSize > 5 * 1024 * 1024 * 1024) {
      console.log(
        `\n  ${RED}${BOLD}WARNING: Database exceeds 5GB!${RESET}`
      );
      console.log(
        `  ${YELLOW}Run: bun maintenance.ts vacuum${RESET}`
      );
    }
  } else {
    console.log(`  ${DIM}Not created yet${RESET}`);
  }

  // Total
  const totalSize =
    captureSize +
    getDirSize(ARCHIVE_DIR) +
    (existsSync(DB_PATH) ? statSync(DB_PATH).size : 0);
  console.log(
    `\n${BOLD}TOTAL STORAGE: ${CYAN}${formatBytes(totalSize)}${RESET}\n`
  );
}

async function cmdArchive(
  olderThanDays: number
): Promise<void> {
  console.log(
    `\n${BOLD}${CYAN}=== Archive Sessions Older Than ${olderThanDays} Days ===${RESET}\n`
  );
  const count = await archiveSessions(olderThanDays);
  if (count > 0) {
    console.log(
      `\n${GREEN}Archived ${count} session file(s).${RESET}\n`
    );
  } else {
    console.log(
      `\n${DIM}Nothing to archive.${RESET}\n`
    );
  }
}

function cmdVacuum(): void {
  console.log(
    `\n${BOLD}${CYAN}=== SQLite VACUUM ===${RESET}\n`
  );

  if (!existsSync(DB_PATH)) {
    console.log(
      `${RED}Database not found: ${DB_PATH}${RESET}\n`
    );
    process.exit(1);
  }

  const sizeBefore = statSync(DB_PATH).size;
  console.log(
    `  Size before: ${CYAN}${formatBytes(sizeBefore)}${RESET}`
  );

  try {
    const db = new Database(DB_PATH);
    db.exec("VACUUM");
    db.close();
  } catch (err) {
    console.log(
      `  ${RED}VACUUM failed: ${err}${RESET}\n`
    );
    process.exit(1);
  }

  const sizeAfter = statSync(DB_PATH).size;
  const saved = sizeBefore - sizeAfter;
  console.log(
    `  Size after:  ${CYAN}${formatBytes(sizeAfter)}${RESET}`
  );

  if (saved > 0) {
    console.log(
      `  ${GREEN}Reclaimed: ${formatBytes(saved)}${RESET}`
    );
  } else {
    console.log(
      `  ${DIM}No space to reclaim${RESET}`
    );
  }
  console.log();
}

function printUsage(): void {
  console.log(`
${BOLD}${CYAN}Working Memory Maintenance CLI${RESET}

${BOLD}Usage:${RESET}
  bun maintenance.ts run                    Run all maintenance tasks
  bun maintenance.ts stats                  Show storage breakdown
  bun maintenance.ts archive [--older-than 90d]  Archive old sessions
  bun maintenance.ts vacuum                 Run SQLite VACUUM to reclaim space

${BOLD}Options:${RESET}
  --older-than <Nd>   Archive sessions older than N days (default: 90d)
`);
}

// --- CLI Entry Point ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "run":
      await cmdRun();
      break;

    case "stats":
      cmdStats();
      break;

    case "archive": {
      let olderThanDays = 90;
      const olderIdx = args.indexOf("--older-than");
      if (olderIdx !== -1 && args[olderIdx + 1]) {
        const val = args[olderIdx + 1];
        const match = val.match(/^(\d+)d?$/);
        if (match) {
          olderThanDays = parseInt(match[1], 10);
        } else {
          console.log(
            `${RED}Invalid --older-than value: ${val}${RESET}`
          );
          console.log(
            `${DIM}Expected format: 90d or 90${RESET}`
          );
          process.exit(1);
        }
      }
      await cmdArchive(olderThanDays);
      break;
    }

    case "vacuum":
      cmdVacuum();
      break;

    default:
      printUsage();
      break;
  }
}

main().catch((err) => {
  console.error(`${RED}Fatal error: ${err}${RESET}`);
  process.exit(1);
});
