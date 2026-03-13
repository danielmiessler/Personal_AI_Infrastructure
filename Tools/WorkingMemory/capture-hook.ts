#!/usr/bin/env bun
// Working Memory System - PostToolUse Capture Hook
// Reads Claude Code hook JSON from stdin, extracts topics/decisions,
// writes append-only JSONL and defers SQLite insert to db-writer.
// Target: <100ms total execution time.

import {
  appendFileSync,
  mkdirSync,
  existsSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { CaptureEntry } from "./types";

// --- Constants ---

const PAI_DIR =
  process.env.PAI_DIR ?? resolve(homedir(), ".claude");
const CAPTURE_DIR = resolve(PAI_DIR, "MEMORY/CAPTURE");
const MAX_SUMMARY_LEN = 500;

// --- Decision Detection Patterns ---

const DECISION_PATTERNS: RegExp[] = [
  /\b(?:decided to|chose|going with|selected|will use|opting for|settled on|picking|switching to|moving to|adopting)\b[^.!?\n]{5,120}[.!?\n]/gi,
  /\b(?:the decision is|we(?:'ll| will) go with|let(?:'s| us) use|I(?:'ll| will) use|the approach is)\b[^.!?\n]{5,120}[.!?\n]/gi,
];

// --- Topic Extraction Patterns ---

// File path pattern: captures meaningful path segments
const FILE_PATH_RE = /(?:\/[\w.-]+){2,}/g;

// Technology/framework names
const TECH_NAMES_RE =
  /\b(?:typescript|javascript|bun|node|react|vue|svelte|next\.?js|sqlite|postgres|redis|docker|kubernetes|graphql|rest|api|css|html|json|yaml|toml|markdown|git|github|aws|gcp|azure|vercel|netlify|deno|python|rust|go(?:lang)?|java|swift|kotlin|ruby|php|c\+\+|bash|zsh|linux|macos|windows|nginx|apache|webpack|vite|esbuild|rollup|jest|vitest|playwright|cypress|tailwind|prisma|drizzle|trpc|grpc|oauth|jwt|tls|ssl|http|websocket|sse|fts5|wal)\b/gi;

// PascalCase project names
const PROJECT_NAME_RE = /\b(?:[A-Z][a-z]+){2,}\b/g;
const KEBAB_PROJECT_RE = /\b[a-z]+(?:-[a-z]+){1,5}\b/g;

// Architecture/design concepts
const CONCEPT_RE =
  /\b(?:authentication|authorization|caching|indexing|migration|refactor(?:ing)?|deployment|monitoring|logging|testing|schema|middleware|pipeline|hook|plugin|module|service|endpoint|controller|model|interface|abstraction|pattern|architecture|microservice|monolith|event[\s-]driven|pub[\s-]?sub|queue|streaming|batch|real[\s-]?time|async|concurrent|parallel|distributed)\b/gi;

// --- Utility Functions ---

/**
 * Truncate text at word boundary, respecting max length.
 */
function truncateSmart(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text ?? "";
  const cutoff = text.lastIndexOf(" ", maxLen - 3);
  const breakPoint =
    cutoff > maxLen * 0.5 ? cutoff : maxLen - 3;
  return text.slice(0, breakPoint) + "...";
}

/**
 * Stringify any value to a flat string suitable for summarization.
 */
function flattenToString(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

/**
 * Extract unique topics from combined text.
 * Returns deduplicated, lowercased topic strings.
 */
function extractTopics(text: string): string[] {
  const topics = new Set<string>();

  // File paths - extract last 2 meaningful segments
  const paths = text.match(FILE_PATH_RE) ?? [];
  for (const p of paths) {
    const segments = p.split("/").filter(Boolean);
    if (segments.length >= 2) {
      topics.add(segments.slice(-2).join("/"));
    }
  }

  // Technology names
  const techs = text.match(TECH_NAMES_RE) ?? [];
  for (const t of techs) {
    topics.add(t.toLowerCase());
  }

  // PascalCase project names (at least 2 words, not common English)
  const projects = text.match(PROJECT_NAME_RE) ?? [];
  for (const p of projects) {
    if (p.length > 5) topics.add(p);
  }

  // Kebab-case identifiers (filter out very short ones)
  const kebabs = text.match(KEBAB_PROJECT_RE) ?? [];
  for (const k of kebabs) {
    if (k.length > 8 && k.includes("-")) topics.add(k);
  }

  // Concept/architecture terms
  const concepts = text.match(CONCEPT_RE) ?? [];
  for (const c of concepts) {
    topics.add(c.toLowerCase());
  }

  return Array.from(topics).slice(0, 20); // Cap at 20 topics per entry
}

/**
 * Extract decisions from text using pattern matching.
 */
function extractDecisions(text: string): string[] {
  const decisions: string[] = [];

  for (const pattern of DECISION_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const cleaned = match[0].trim();
      if (cleaned.length > 10 && cleaned.length < 300) {
        decisions.push(cleaned);
      }
    }
  }

  // Deduplicate by checking substring containment
  const unique: string[] = [];
  for (const d of decisions) {
    if (
      !unique.some(
        (existing) =>
          existing.includes(d) || d.includes(existing)
      )
    ) {
      unique.push(d);
    }
  }

  return unique.slice(0, 10); // Cap at 10 decisions per entry
}

/**
 * Get or generate session ID.
 * Prefers CLAUDE_SESSION_ID env var, falls back to date+random.
 */
function getSessionId(): string {
  const envId = process.env.CLAUDE_SESSION_ID;
  if (envId) return envId;

  const now = new Date();
  const dateStr = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 10);
  return `${dateStr}-${rand}`;
}

/**
 * Get today's date as YYYY-MM-DD for directory partitioning.
 */
function getDateDir(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Append a JSONL line with fsync for crash safety.
 */
function appendJsonlSync(
  filePath: string,
  data: CaptureEntry
): void {
  const dir = filePath.slice(0, filePath.lastIndexOf("/"));
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const line = JSON.stringify(data) + "\n";
  const fd = openSync(filePath, "a");
  try {
    appendFileSync(fd, line);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

// --- DB Writer Import (deferred - may not be initialized yet) ---

let dbInsert:
  | ((entry: CaptureEntry, rawOffset?: number) => number)
  | null = null;

try {
  const dbWriter = await import("./db-writer");
  if (dbWriter.insertEntry) {
    dbInsert = dbWriter.insertEntry;
  }
} catch {
  // db-writer not yet available - JSONL is the primary store
}

// --- Main Hook ---

async function main(): Promise<void> {
  // Read JSON from stdin (Claude Code hook format)
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();

  if (!raw) {
    process.exit(0);
  }

  let hookData: {
    tool_name?: string;
    tool_input?: unknown;
    tool_result?: unknown;
  };
  try {
    hookData = JSON.parse(raw);
  } catch {
    // Malformed input - exit silently, never block Claude Code
    process.exit(0);
  }

  const toolName = hookData.tool_name ?? "unknown";
  const inputStr = flattenToString(hookData.tool_input);
  const outputStr = flattenToString(hookData.tool_result);

  // Build summaries (truncated at word boundaries)
  const inputSummary = truncateSmart(inputStr, MAX_SUMMARY_LEN);
  const outputSummary = truncateSmart(
    outputStr,
    MAX_SUMMARY_LEN
  );

  // Combined text for extraction
  const combinedText = `${inputStr} ${outputStr}`;

  // Extract topics and decisions
  const topics = extractTopics(combinedText);
  const decisions = extractDecisions(combinedText);

  // Build the capture entry
  const sessionId = getSessionId();
  const entry: CaptureEntry = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    message_role: "tool",
    tool_name: toolName,
    tool_input_summary: inputSummary,
    tool_output_summary: outputSummary,
    topics_extracted: topics,
    decisions_made: decisions,
    reasoning_chain: "",
    type: "entry",
  };

  // Write JSONL synchronously (primary store, crash-safe)
  const dateDir = getDateDir();
  const jsonlPath = resolve(
    CAPTURE_DIR,
    dateDir,
    `${sessionId}.jsonl`
  );
  appendJsonlSync(jsonlPath, entry);

  // Deferred SQLite write (synchronous - db-writer returns entry ID)
  if (dbInsert) {
    try {
      dbInsert(entry);
    } catch {
      // SQLite write failure is non-fatal; JSONL is the source of truth
    }
  }
}

main().catch(() => {
  // Never let hook failures propagate to Claude Code
  process.exit(0);
});
