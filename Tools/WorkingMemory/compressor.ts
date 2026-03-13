#!/usr/bin/env bun
// Working Memory System - JSONL Compression Utilities
// Gzip compress/decompress JSONL files using node:zlib streams

import {
  createReadStream,
  createWriteStream,
  statSync,
  readdirSync,
  readSync,
  openSync,
  closeSync,
  unlinkSync,
} from "node:fs";
import { createGzip, createGunzip } from "node:zlib";
import { join, extname } from "node:path";
import { pipeline } from "node:stream/promises";

// --- Gzip magic number: 0x1f 0x8b ---

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

/**
 * Verify a file starts with the gzip magic number.
 */
function verifyGzipHeader(filePath: string): boolean {
  let fd: number | null = null;
  try {
    fd = openSync(filePath, "r");
    const buf = Buffer.alloc(2);
    const bytesRead = readSync(fd, buf, 0, 2, 0);
    if (bytesRead < 2) return false;
    return buf[0] === GZIP_MAGIC[0] && buf[1] === GZIP_MAGIC[1];
  } catch {
    return false;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

/**
 * Compress a JSONL file with gzip.
 * Returns the path to the .gz file.
 * Deletes the original after verifying the compressed file.
 */
export async function compressFile(
  filePath: string
): Promise<string> {
  const gzPath = `${filePath}.gz`;

  const source = createReadStream(filePath);
  const gzip = createGzip({ level: 6 });
  const dest = createWriteStream(gzPath);

  await pipeline(source, gzip, dest);

  // Verify the compressed file has a valid gzip header
  if (!verifyGzipHeader(gzPath)) {
    throw new Error(
      `Compression verification failed for ${gzPath}`
    );
  }

  // Verify compressed file has non-zero size
  const gzStat = statSync(gzPath);
  if (gzStat.size === 0) {
    throw new Error(`Compressed file is empty: ${gzPath}`);
  }

  // Safe to delete original
  unlinkSync(filePath);

  return gzPath;
}

/**
 * Decompress a .gz file back to JSONL.
 * Returns the path to the decompressed file.
 */
export async function decompressFile(
  gzPath: string
): Promise<string> {
  if (!gzPath.endsWith(".gz")) {
    throw new Error(
      `File does not have .gz extension: ${gzPath}`
    );
  }
  const outputPath = gzPath.slice(0, -3);

  const source = createReadStream(gzPath);
  const gunzip = createGunzip();
  const dest = createWriteStream(outputPath);

  await pipeline(source, gunzip, dest);

  return outputPath;
}

/**
 * Find JSONL files in captureDir that are older than `olderThanDays` days
 * and are not already compressed (.gz).
 * Supports date-partitioned and flat layouts.
 */
export function getCompressibleFiles(
  captureDir: string,
  olderThanDays: number
): string[] {
  const now = Date.now();
  const cutoffMs = olderThanDays * 24 * 60 * 60 * 1000;
  const results: string[] = [];

  let topEntries: ReturnType<typeof readdirSync>;
  try {
    topEntries = readdirSync(captureDir, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }

  function checkFile(fullPath: string): void {
    try {
      const stat = statSync(fullPath);
      if (!stat.isFile()) return;
      const ageMs = now - stat.mtimeMs;
      if (ageMs > cutoffMs) {
        results.push(fullPath);
      }
    } catch {
      // Skip files we can't stat
    }
  }

  for (const entry of topEntries) {
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      checkFile(join(captureDir, entry.name));
    } else if (
      entry.isDirectory() &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
    ) {
      const subDir = join(captureDir, entry.name);
      try {
        const subFiles = readdirSync(subDir);
        for (const f of subFiles) {
          if (f.endsWith(".jsonl")) {
            checkFile(join(subDir, f));
          }
        }
      } catch {
        // Skip unreadable subdirectories
      }
    }
  }

  return results.sort();
}
