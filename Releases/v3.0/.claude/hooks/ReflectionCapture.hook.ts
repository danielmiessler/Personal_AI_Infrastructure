#!/usr/bin/env bun
/**
 * ReflectionCapture.hook.ts — Extract LEARN Phase Reflections (SessionEnd)
 *
 * PURPOSE:
 * Automatically captures Algorithm LEARN phase reflections (Q1, Q2, Q3)
 * and the LEARNING line from session transcripts, writing them as structured
 * JSONL to the algorithm-reflections.jsonl file. This feeds MineReflections
 * and other downstream analysis workflows.
 *
 * TRIGGER: SessionEnd
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, transcript_path)
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Appends to: MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl
 * - Reads: Session transcript (JSONL), AlgorithmTracker state
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: AlgorithmTracker (reads algorithm state for criteria counts, effort level)
 * - COORDINATES WITH: WorkCompletionLearning (both capture different aspects at SessionEnd)
 * - MUST RUN AFTER: AlgorithmTracker has finalized state
 *
 * EXTRACTION PATTERNS:
 * Looks for LEARN phase content in assistant messages:
 * - "Q1 — Self:" or "**Q1 — Self:**"
 * - "Q2 — Algorithm:" or "**Q2 — Algorithm:**"
 * - "Q3 — AI:" or "**Q3 — AI:**"
 * - "LEARNING:" or "**LEARNING:**"
 *
 * DEDUPLICATION:
 * Checks existing JSONL entries by session_id to avoid duplicate writes
 * (e.g., if session is resumed and ends again).
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (fire-and-forget at session end)
 * - Typical execution: <200ms (transcript scan)
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { getISOTimestamp } from './lib/time';
import { readState } from './lib/algorithm-state';

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const REFLECTIONS_DIR = join(BASE_DIR, 'MEMORY', 'LEARNING', 'REFLECTIONS');
const REFLECTIONS_FILE = join(REFLECTIONS_DIR, 'algorithm-reflections.jsonl');

// ── Reflection Extraction ──

interface ReflectionData {
  q1: string;
  q2: string;
  q3: string;
  learning: string;
}

/**
 * Extract a reflection field value from text.
 * Handles both bold and plain formats, multi-line content up to the next section.
 */
function extractField(text: string, pattern: RegExp, stopPatterns: RegExp[]): string {
  const match = text.match(pattern);
  if (!match) return '';

  // Get everything after the match
  let content = text.slice(match.index! + match[0].length);

  // Find the earliest stop pattern
  let endIdx = content.length;
  for (const stop of stopPatterns) {
    const stopMatch = content.match(stop);
    if (stopMatch && stopMatch.index !== undefined && stopMatch.index < endIdx) {
      endIdx = stopMatch.index;
    }
  }

  content = content.slice(0, endIdx).trim();

  // Clean up markdown artifacts
  content = content
    .replace(/^\*\*\s*/, '')
    .replace(/\s*\*\*$/, '')
    .replace(/^[""]|[""]$/g, '')
    .replace(/\n\s*\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*$/, '')  // trailing bullet dash
    .trim();

  return content;
}

function extractReflections(text: string): ReflectionData | null {
  // Check if this text contains a LEARN phase
  if (!text.includes('LEARN') && !text.includes('Q1') && !text.includes('LEARNING')) {
    return null;
  }

  // Support both formats:
  //   "**Q1 (Self):**"  and  "Q1 — Self:"  and  "**Q1 — Self:**"
  const q1Pattern = /\*?\*?Q1\s*(?:[—–-]\s*Self|\(Self\)):?\*?\*?\s*/;
  const q2Pattern = /\*?\*?Q2\s*(?:[—–-]\s*Algorithm|\(Algorithm\)):?\*?\*?\s*/;
  const q3Pattern = /\*?\*?Q3\s*(?:[—–-]\s*AI|\(AI\)):?\*?\*?\s*/;
  const learningPattern = /(?:📝\s*)?\*?\*?LEARNING:?\*?\*?\s*/;

  const q1 = extractField(text, q1Pattern, [q2Pattern, q3Pattern, learningPattern, /━━━/, /🗣️\s*PAI/]);
  const q2 = extractField(text, q2Pattern, [q3Pattern, learningPattern, /━━━/, /🗣️\s*PAI/]);
  const q3 = extractField(text, q3Pattern, [learningPattern, /━━━/, /🗣️\s*PAI/]);
  const learning = extractField(text, learningPattern, [/━━━/, /🗣️\s*PAI/, /^#{1,3}\s/m, /^---$/m]);

  // Need at least one field to be non-empty
  if (!q1 && !q2 && !q3 && !learning) return null;

  return { q1, q2, q3, learning };
}

// ── Transcript Scanning ──

function scanTranscript(transcriptPath: string): ReflectionData | null {
  if (!existsSync(transcriptPath)) {
    console.error(`[ReflectionCapture] Transcript not found: ${transcriptPath}`);
    return null;
  }

  const content = readFileSync(transcriptPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Scan in reverse — LEARN phase is typically near the end
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const entry = JSON.parse(lines[i]);

      // Only look at assistant messages
      if (entry.type !== 'assistant' || !entry.message?.content) continue;

      // Extract text from content blocks
      const textBlocks = entry.message.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text);

      for (const text of textBlocks) {
        // Check if this block contains LEARN phase content
        // Must have the LEARN phase header (not just the word LEARN)
        const hasLearnPhase = (text.includes('LEARN') && text.includes('7/7')) ||
          (text.includes('LEARN') && text.includes('━━━'));
        const hasReflections = text.includes('Q1') || text.includes('LEARNING');
        if (hasLearnPhase && hasReflections) {
          const reflections = extractReflections(text);
          if (reflections) return reflections;
        }
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  return null;
}

// ── Deduplication ──

function isDuplicate(sessionId: string): boolean {
  if (!existsSync(REFLECTIONS_FILE)) return false;

  try {
    const content = readFileSync(REFLECTIONS_FILE, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.session_id === sessionId) return true;
      } catch {}
    }
  } catch {}

  return false;
}

// ── Main ──

async function main() {
  try {
    // Read input from stdin
    let sessionId: string | undefined;
    let transcriptPath: string | undefined;

    try {
      const input = await Promise.race([
        Bun.stdin.text(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
      ]);
      if (input && input.trim()) {
        const parsed = JSON.parse(input);
        sessionId = parsed.session_id;
        transcriptPath = parsed.transcript_path;
      }
    } catch {
      console.error('[ReflectionCapture] Failed to read stdin');
      process.exit(0);
    }

    if (!transcriptPath) {
      console.error('[ReflectionCapture] No transcript_path in input');
      process.exit(0);
    }

    if (!sessionId) {
      console.error('[ReflectionCapture] No session_id in input');
      process.exit(0);
    }

    // Check for duplicate
    if (isDuplicate(sessionId)) {
      console.error(`[ReflectionCapture] Already captured reflections for session ${sessionId.slice(0, 8)}`);
      process.exit(0);
    }

    // Scan transcript for LEARN reflections
    const reflections = scanTranscript(transcriptPath);
    if (!reflections) {
      console.error('[ReflectionCapture] No LEARN reflections found in transcript');
      process.exit(0);
    }

    // Read algorithm state for metadata
    const state = readState(sessionId);
    const criteriaCount = state?.criteria.length ?? 0;
    const criteriaPassed = state?.criteria.filter(c => c.status === 'completed').length ?? 0;
    const criteriaFailed = state?.criteria.filter(c => c.status === 'failed').length ?? 0;
    const effortLevel = state?.sla ?? 'Standard';
    const taskDescription = state?.taskDescription ?? 'Unknown task';

    // Build JSONL entry matching the existing format
    const entry = {
      timestamp: getISOTimestamp(),
      session_id: sessionId,
      effort_level: effortLevel,
      task_description: taskDescription,
      criteria_count: criteriaCount,
      criteria_passed: criteriaPassed,
      criteria_failed: criteriaFailed,
      prd_id: state?.prdPath ?? null,
      implied_sentiment: criteriaPassed === criteriaCount && criteriaCount > 0 ? 8 : 6,
      reflection_q1: reflections.q1 || null,
      reflection_q2: reflections.q2 || null,
      reflection_q3: reflections.q3 || null,
      learning: reflections.learning || null,
      within_budget: true,
      source: 'auto-hook',
    };

    // Ensure directory exists
    if (!existsSync(REFLECTIONS_DIR)) {
      mkdirSync(REFLECTIONS_DIR, { recursive: true });
    }

    // Append to JSONL
    appendFileSync(REFLECTIONS_FILE, JSON.stringify(entry) + '\n');
    console.error(`[ReflectionCapture] Captured reflections for "${taskDescription}" (${criteriaPassed}/${criteriaCount} criteria)`);

    process.exit(0);
  } catch (error) {
    console.error(`[ReflectionCapture] Error: ${error}`);
    process.exit(0);
  }
}

main();
