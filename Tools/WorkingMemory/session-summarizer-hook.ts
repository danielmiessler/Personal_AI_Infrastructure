#!/usr/bin/env bun
// Working Memory System - Session Summarizer (Stop Hook)
// Reads all JSONL entries for the current session, aggregates into a
// SessionSummary, writes to JSONL + SQLite. Target: <10 seconds.

import {
  readFileSync,
  existsSync,
  readdirSync,
  openSync,
  appendFileSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type {
  CaptureEntry,
  SessionSummary,
  TopicFrequency,
  DecisionSummary,
  ActionItem,
} from "./types";

// --- Constants ---

const PAI_DIR =
  process.env.PAI_DIR ?? resolve(homedir(), ".claude");
const CAPTURE_DIR = resolve(PAI_DIR, "MEMORY/CAPTURE");

// --- Action Item Detection Patterns ---

const ACTION_ITEM_PATTERNS: RegExp[] = [
  /\b(?:TODO|FIXME|HACK|XXX|BLOCKED)\b[:\s]+[^.!?\n]{5,150}[.!?\n]/gi,
  /\b(?:need(?:s)? to|should|must|have to|ought to)\b[^.!?\n]{5,150}[.!?\n]/gi,
  /\b(?:action item|next step|follow[- ]?up)\b[:\s]*[^.!?\n]{5,150}[.!?\n]/gi,
];

// --- Question Detection Patterns ---

const QUESTION_PATTERNS: RegExp[] = [
  /(?:^|\n)[^.!?\n]*\?(?:\s|$)/gm,
  /\b(?:wondering|unclear|not sure|question is|open question|need to figure out|TBD)\b[^.!?\n]{5,150}[.!?\n]/gi,
];

// --- Utility Functions ---

/**
 * Get or generate session ID.
 */
function getSessionId(): string {
  const envId = process.env.CLAUDE_SESSION_ID;
  if (envId) return envId;

  // Fallback: try to find the most recent session file for today
  const today = new Date().toISOString().slice(0, 10);
  const todayDir = resolve(CAPTURE_DIR, today);
  if (existsSync(todayDir)) {
    const files = readdirSync(todayDir)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
      .reverse();
    if (files.length > 0) {
      return files[0].replace(".jsonl", "");
    }
  }

  return "";
}

/**
 * Find the JSONL file for a given session ID.
 * Searches date-partitioned directories under CAPTURE_DIR.
 */
function findSessionFile(sessionId: string): string | null {
  if (!existsSync(CAPTURE_DIR)) return null;

  const dateDirs = readdirSync(CAPTURE_DIR)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const dateDir of dateDirs) {
    const candidate = resolve(
      CAPTURE_DIR,
      dateDir,
      `${sessionId}.jsonl`
    );
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Read and parse all JSONL entries for a session.
 * Skips malformed lines gracefully.
 */
function readSessionEntries(filePath: string): CaptureEntry[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content
    .split("\n")
    .filter((line) => line.trim().length > 0);
  const entries: CaptureEntry[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as CaptureEntry;
      if (parsed.type === "session_summary") continue;
      entries.push(parsed);
    } catch {
      continue;
    }
  }

  return entries;
}

/**
 * Aggregate topic frequencies across all entries.
 */
function aggregateTopics(
  entries: CaptureEntry[]
): TopicFrequency[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.topics_extracted) {
      for (const topic of entry.topics_extracted) {
        const normalized = topic.toLowerCase();
        counts.set(
          normalized,
          (counts.get(normalized) ?? 0) + 1
        );
      }
    }
  }

  return Array.from(counts.entries())
    .map(([name, frequency]) => ({ name, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Collect all decisions with reasoning context.
 */
function aggregateDecisions(
  entries: CaptureEntry[]
): DecisionSummary[] {
  const seen = new Set<string>();
  const decisions: DecisionSummary[] = [];

  for (const entry of entries) {
    if (entry.decisions_made) {
      for (const decision of entry.decisions_made) {
        const normalized = decision.toLowerCase().trim();
        if (seen.has(normalized)) continue;
        const isDuplicate = Array.from(seen).some(
          (existing) =>
            existing.includes(normalized) ||
            normalized.includes(existing)
        );
        if (isDuplicate) continue;

        seen.add(normalized);
        decisions.push({
          text: decision,
          reasoning:
            entry.reasoning_chain ||
            `Context: ${entry.tool_name} - ${entry.tool_input_summary.slice(0, 200)}`,
          confidence: inferConfidence(decision),
        });
      }
    }
  }

  return decisions;
}

/**
 * Infer decision confidence from language signals.
 */
function inferConfidence(
  text: string
): "high" | "medium" | "low" {
  const lower = text.toLowerCase();
  if (
    /\b(?:definitely|certainly|clearly|must|always|absolutely)\b/.test(
      lower
    )
  )
    return "high";
  if (
    /\b(?:probably|likely|seems|appears|think|should)\b/.test(
      lower
    )
  )
    return "medium";
  if (
    /\b(?:maybe|perhaps|might|could|not sure|uncertain|possibly)\b/.test(
      lower
    )
  )
    return "low";
  return "medium";
}

/**
 * Extract action items from all entries' summaries.
 */
function extractActionItems(
  entries: CaptureEntry[]
): ActionItem[] {
  const items: ActionItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const combinedText = `${entry.tool_input_summary} ${entry.tool_output_summary} ${entry.reasoning_chain}`;

    for (const pattern of ACTION_ITEM_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(combinedText)) !== null) {
        const text = match[0].trim();
        if (text.length > 10 && text.length < 300) {
          const normalized = text.toLowerCase();
          if (!seen.has(normalized)) {
            seen.add(normalized);
            items.push({ text, status: "open" });
          }
        }
      }
    }
  }

  return items.slice(0, 30);
}

/**
 * Extract unresolved questions from entries.
 */
function extractUnresolvedQuestions(
  entries: CaptureEntry[]
): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();

  const allOutputText = entries
    .map((e) => e.tool_output_summary)
    .join(" ")
    .toLowerCase();

  for (const entry of entries) {
    const text = `${entry.tool_input_summary} ${entry.reasoning_chain}`;

    for (const pattern of QUESTION_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const question = match[0].trim();
        if (
          question.length > 15 &&
          question.length < 300 &&
          question.includes("?")
        ) {
          const normalized = question.toLowerCase();
          if (!seen.has(normalized)) {
            const keyWords = normalized
              .replace(/[?.,!]/g, "")
              .split(/\s+/)
              .filter((w) => w.length > 4);
            const answeredRatio =
              keyWords.filter((w) =>
                allOutputText.includes(w)
              ).length / Math.max(keyWords.length, 1);

            if (answeredRatio < 0.6) {
              seen.add(normalized);
              questions.push(question);
            }
          }
        }
      }
    }
  }

  return questions.slice(0, 20);
}

/**
 * Extract unique file paths from tool inputs across all entries.
 */
function extractKeyFiles(entries: CaptureEntry[]): string[] {
  const files = new Set<string>();
  const FILE_PATH_RE = /(?:\/[\w.-]+){2,}/g;

  for (const entry of entries) {
    if (
      ["Read", "Write", "Edit", "Glob", "Grep"].includes(
        entry.tool_name
      )
    ) {
      const paths =
        entry.tool_input_summary.match(FILE_PATH_RE) ?? [];
      for (const p of paths) {
        if (
          p.length > 3 &&
          !p.startsWith("/dev/") &&
          !p.startsWith("/proc/")
        ) {
          files.add(p);
        }
      }
    }

    if (entry.tool_name === "Bash") {
      const paths =
        entry.tool_input_summary.match(FILE_PATH_RE) ?? [];
      for (const p of paths) {
        if (
          p.length > 5 &&
          !p.startsWith("/dev/") &&
          !p.startsWith("/proc/") &&
          !p.startsWith("/usr/bin/")
        ) {
          files.add(p);
        }
      }
    }
  }

  return Array.from(files).sort();
}

/**
 * Append a JSONL line with fsync for crash safety.
 */
function appendJsonlSync(
  filePath: string,
  data: Record<string, unknown>
): void {
  const line = JSON.stringify(data) + "\n";
  const fd = openSync(filePath, "a");
  try {
    appendFileSync(fd, line);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

// --- DB Writer Import (deferred) ---

let dbUpdateSession:
  | ((sessionId: string, summary: SessionSummary) => void)
  | null = null;

try {
  const dbWriter = await import("./db-writer");
  if (dbWriter.updateSession) {
    dbUpdateSession = dbWriter.updateSession;
  }
} catch {
  // db-writer not yet available - JSONL is the primary store
}

// --- Main Hook ---

async function main(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    console.error(
      "[session-summarizer] No session ID found. Exiting."
    );
    process.exit(0);
  }

  const filePath = findSessionFile(sessionId);
  if (!filePath) {
    console.error(
      `[session-summarizer] No capture file found for session: ${sessionId}`
    );
    process.exit(0);
  }

  const entries = readSessionEntries(filePath);
  if (entries.length === 0) {
    console.error(
      `[session-summarizer] No entries found for session: ${sessionId}`
    );
    process.exit(0);
  }

  // Calculate duration from first to last entry
  const timestamps = entries
    .map((e) => new Date(e.timestamp).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  const duration =
    timestamps.length >= 2
      ? Math.round(
          (timestamps[timestamps.length - 1] -
            timestamps[0]) /
            1000
        )
      : 0;

  // Build session summary
  const summary: SessionSummary = {
    topics_covered: aggregateTopics(entries),
    decisions_made: aggregateDecisions(entries),
    action_items: extractActionItems(entries),
    unresolved_questions:
      extractUnresolvedQuestions(entries),
    key_files_touched: extractKeyFiles(entries),
    duration,
    entry_count: entries.length,
  };

  // Write summary as final JSONL entry
  const summaryEntry: CaptureEntry & {
    summary: SessionSummary;
  } = {
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    message_role: "system",
    tool_name: "session_summarizer",
    tool_input_summary: `Summarized ${entries.length} entries over ${duration}s`,
    tool_output_summary: `Topics: ${summary.topics_covered.length}, Decisions: ${summary.decisions_made.length}, Actions: ${summary.action_items.length}`,
    topics_extracted: summary.topics_covered.map(
      (t) => t.name
    ),
    decisions_made: summary.decisions_made.map((d) => d.text),
    reasoning_chain: "",
    type: "session_summary",
    summary,
  };

  appendJsonlSync(filePath, summaryEntry);

  // Write to SQLite via db-writer
  if (dbUpdateSession) {
    try {
      dbUpdateSession(sessionId, summary);
    } catch {
      console.error(
        "[session-summarizer] SQLite write failed (non-fatal)."
      );
    }
  }

  // Report to stderr (visible in hook logs)
  console.error(
    `[session-summarizer] Session ${sessionId} summarized:`
  );
  console.error(`  Entries: ${summary.entry_count}`);
  console.error(`  Duration: ${summary.duration}s`);
  console.error(
    `  Topics: ${summary.topics_covered.length}`
  );
  console.error(
    `  Decisions: ${summary.decisions_made.length}`
  );
  console.error(
    `  Action items: ${summary.action_items.length}`
  );
  console.error(
    `  Unresolved questions: ${summary.unresolved_questions.length}`
  );
  console.error(
    `  Files touched: ${summary.key_files_touched.length}`
  );
}

main().catch((err) => {
  console.error(`[session-summarizer] Fatal error: ${err}`);
  process.exit(0);
});
