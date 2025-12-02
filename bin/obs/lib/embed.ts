/**
 * Embedding and semantic search functionality for obs CLI
 * Uses sqlite-vec for vector storage and OpenAI for embeddings
 */

import { Database } from "bun:sqlite";
import { readdir, stat, mkdir } from "fs/promises";
import { join, basename, dirname } from "path";
import { existsSync } from "fs";
import { getConfig, validateVault } from "./config";
import { parseNote } from "./parse";

// Embedding model configuration
// text-embedding-3-small = 1536 dimensions (default - matches existing DB)
// text-embedding-3-large = 3072 dimensions (better semantic understanding)
const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIM = EMBEDDING_MODEL.includes("large") ? 3072 : 1536;
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200;

export interface EmbeddingResult {
  notePath: string;
  noteName: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/**
 * Initialize the embeddings database with sqlite-vec
 */
export async function initDatabase(): Promise<Database> {
  const config = getConfig();

  // Ensure directory exists
  const dbDir = dirname(config.embeddingsDb);
  if (!existsSync(dbDir)) {
    await mkdir(dbDir, { recursive: true });
  }

  const db = new Database(config.embeddingsDb);

  // Load sqlite-vec extension if available
  try {
    db.exec("SELECT load_extension('vec0')");
  } catch (e) {
    // Extension might be built-in or not available
  }

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      mtime REAL NOT NULL,
      embedded_at REAL
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      note_id INTEGER NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path);
    CREATE INDEX IF NOT EXISTS idx_chunks_note ON chunks(note_id);
  `);

  return db;
}

/**
 * Get OpenAI API key from environment or config files
 */
function getOpenAIKey(): string {
  // First check environment variable
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  // Load from config files (same as config.ts)
  const { existsSync, readFileSync } = require("fs");
  const { join } = require("path");
  const { homedir } = require("os");

  const loadEnvFile = (path: string): Record<string, string> => {
    const env: Record<string, string> = {};
    if (existsSync(path)) {
      try {
        const lines = readFileSync(path, "utf-8").split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#")) {
            const [key, ...valueParts] = trimmed.split("=");
            if (key && valueParts.length > 0) {
              env[key.trim()] = valueParts.join("=").trim();
            }
          }
        }
      } catch { /* ignore */ }
    }
    return env;
  };

  // Check claude config first, then fabric
  const claudeEnv = loadEnvFile(join(homedir(), ".claude", ".env"));
  if (claudeEnv.OPENAI_API_KEY) {
    return claudeEnv.OPENAI_API_KEY;
  }

  const fabricEnv = loadEnvFile(join(homedir(), ".config", "fabric", ".env"));
  if (fabricEnv.OPENAI_API_KEY) {
    return fabricEnv.OPENAI_API_KEY;
  }

  throw new Error(
    "OPENAI_API_KEY not set. Add it to ~/.claude/.env or ~/.config/fabric/.env"
  );
}

/**
 * Generate embeddings using OpenAI API
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = getOpenAIKey();

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Convert embedding array to blob for storage
 */
function embeddingToBlob(embedding: number[]): Buffer {
  const buffer = Buffer.alloc(embedding.length * 4);
  embedding.forEach((val, i) => buffer.writeFloatLE(val, i * 4));
  return buffer;
}

/**
 * Convert blob back to embedding array
 */
function blobToEmbedding(blob: Buffer | Uint8Array): number[] {
  // Convert Uint8Array to Buffer if needed (SQLite returns Uint8Array in Bun)
  const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Build or update embeddings for all notes in vault
 */
export async function buildEmbeddings(options: {
  force?: boolean;
  verbose?: boolean;
}): Promise<{ processed: number; skipped: number; errors: number }> {
  validateVault();
  const config = getConfig();
  const db = await initDatabase();

  const stats = { processed: 0, skipped: 0, errors: 0 };
  const batchSize = 20; // Process embeddings in batches

  // Get existing notes from DB
  const existingNotes = new Map<string, { id: number; mtime: number }>();
  const rows = db.query("SELECT id, path, mtime FROM notes").all() as {
    id: number;
    path: string;
    mtime: number;
  }[];
  for (const row of rows) {
    existingNotes.set(row.path, { id: row.id, mtime: row.mtime });
  }

  // Walk vault and collect notes to process
  const notesToProcess: { path: string; mtime: number }[] = [];

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (
        entry.name.startsWith(".") ||
        entry.name === "_meta" ||
        entry.name === "attachments"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const stats = await stat(fullPath);
        const existing = existingNotes.get(fullPath);

        if (
          options.force ||
          !existing ||
          stats.mtime.getTime() > existing.mtime
        ) {
          notesToProcess.push({ path: fullPath, mtime: stats.mtime.getTime() });
        } else {
          stats.skipped++;
        }
      }
    }
  }

  await walkDir(config.vaultPath);

  if (options.verbose) {
    console.log(`Found ${notesToProcess.length} notes to process`);
  }

  // Process notes in batches
  for (let i = 0; i < notesToProcess.length; i += batchSize) {
    const batch = notesToProcess.slice(i, i + batchSize);
    const allChunks: { note: typeof batch[0]; chunks: string[] }[] = [];

    // Parse and chunk all notes in batch
    for (const note of batch) {
      try {
        const parsed = await parseNote(note.path);
        const chunks = chunkText(parsed.content);
        allChunks.push({ note, chunks });
      } catch (error) {
        if (options.verbose) {
          console.error(`Error parsing ${note.path}: ${error}`);
        }
        stats.errors++;
      }
    }

    // Generate embeddings for all chunks
    const allTexts = allChunks.flatMap((n) => n.chunks);
    if (allTexts.length === 0) continue;

    try {
      const embeddings = await generateEmbeddings(allTexts);

      let embedIdx = 0;
      for (const { note, chunks } of allChunks) {
        const name = basename(note.path, ".md");

        // Upsert note
        db.run(
          `INSERT INTO notes (path, name, mtime, embedded_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(path) DO UPDATE SET mtime = ?, embedded_at = ?`,
          [note.path, name, note.mtime, Date.now(), note.mtime, Date.now()]
        );

        const noteId = (
          db.query("SELECT id FROM notes WHERE path = ?").get(note.path) as {
            id: number;
          }
        ).id;

        // Delete old chunks
        db.run("DELETE FROM chunks WHERE note_id = ?", [noteId]);

        // Insert new chunks with embeddings
        for (let j = 0; j < chunks.length; j++) {
          const embedding = embeddings[embedIdx++];
          db.run(
            "INSERT INTO chunks (note_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)",
            [noteId, j, chunks[j], embeddingToBlob(embedding)]
          );
        }

        stats.processed++;
        if (options.verbose) {
          console.log(`Embedded: ${name} (${chunks.length} chunks)`);
        }
      }
    } catch (error) {
      if (options.verbose) {
        console.error(`Error generating embeddings: ${error}`);
      }
      stats.errors += batch.length;
    }
  }

  db.close();
  return stats;
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  query: string,
  limit: number = 10
): Promise<EmbeddingResult[]> {
  validateVault();
  const config = getConfig();
  const db = await initDatabase();

  // Generate embedding for query
  const [queryEmbedding] = await generateEmbeddings([query]);

  // Get all chunks with embeddings
  const chunks = db
    .query(
      `
    SELECT c.id, c.note_id, c.chunk_index, c.content, c.embedding, n.path, n.name
    FROM chunks c
    JOIN notes n ON c.note_id = n.id
    WHERE c.embedding IS NOT NULL
  `
    )
    .all() as {
    id: number;
    note_id: number;
    chunk_index: number;
    content: string;
    embedding: Buffer;
    path: string;
    name: string;
  }[];

  // Calculate similarities
  const results: EmbeddingResult[] = [];
  for (const chunk of chunks) {
    const chunkEmbedding = blobToEmbedding(chunk.embedding);
    const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

    results.push({
      notePath: chunk.path,
      noteName: chunk.name,
      chunkIndex: chunk.chunk_index,
      content: chunk.content,
      similarity,
    });
  }

  // Sort by similarity and return top results
  results.sort((a, b) => b.similarity - a.similarity);
  db.close();

  return results.slice(0, limit);
}

/**
 * Embed a single note immediately after creation
 * Used by ingest pipeline for real-time indexing
 */
export async function embedNote(notePath: string, options?: { verbose?: boolean }): Promise<boolean> {
  try {
    const db = await initDatabase();
    const fileStat = await stat(notePath);
    const name = basename(notePath, ".md");

    // Parse and chunk the note
    const parsed = await parseNote(notePath);
    const chunks = chunkText(parsed.content);

    if (chunks.length === 0) {
      if (options?.verbose) {
        console.log(`  No content to embed: ${name}`);
      }
      db.close();
      return false;
    }

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks);

    // Upsert note
    db.run(
      `INSERT INTO notes (path, name, mtime, embedded_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO UPDATE SET mtime = ?, embedded_at = ?`,
      [notePath, name, fileStat.mtime.getTime(), Date.now(), fileStat.mtime.getTime(), Date.now()]
    );

    const noteId = (
      db.query("SELECT id FROM notes WHERE path = ?").get(notePath) as { id: number }
    ).id;

    // Delete old chunks
    db.run("DELETE FROM chunks WHERE note_id = ?", [noteId]);

    // Insert new chunks with embeddings
    for (let j = 0; j < chunks.length; j++) {
      const embedding = embeddings[j];
      db.run(
        "INSERT INTO chunks (note_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)",
        [noteId, j, chunks[j], embeddingToBlob(embedding)]
      );
    }

    if (options?.verbose) {
      console.log(`  Embedded: ${name} (${chunks.length} chunks)`);
    }

    db.close();
    return true;
  } catch (error) {
    if (options?.verbose) {
      console.error(`  Embedding error: ${error}`);
    }
    return false;
  }
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(): Promise<{
  totalNotes: number;
  totalChunks: number;
  lastUpdated: Date | null;
}> {
  const config = getConfig();

  try {
    const db = new Database(config.embeddingsDb);

    const noteCount = (
      db.query("SELECT COUNT(*) as count FROM notes").get() as { count: number }
    ).count;
    const chunkCount = (
      db.query("SELECT COUNT(*) as count FROM chunks").get() as { count: number }
    ).count;
    const lastUpdate = db
      .query("SELECT MAX(embedded_at) as ts FROM notes")
      .get() as { ts: number | null };

    db.close();

    return {
      totalNotes: noteCount,
      totalChunks: chunkCount,
      lastUpdated: lastUpdate.ts ? new Date(lastUpdate.ts) : null,
    };
  } catch {
    return { totalNotes: 0, totalChunks: 0, lastUpdated: null };
  }
}
