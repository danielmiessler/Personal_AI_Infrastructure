#!/usr/bin/env bun
/**
 * AutoWorkCreation.hook.ts — Create session-scoped state files (UserPromptSubmit)
 *
 * PURPOSE:
 * Creates per-session state files (current-work-{session_id}.json) so that
 * context recovery after compaction can find the correct PRD even when
 * multiple Claude sessions run concurrently.
 *
 * Without this hook, the Algorithm's Context Recovery step 5 references
 * session-scoped state files that never get created, and SessionCleanup's
 * findStateFile() always falls back to the legacy current-work.json.
 *
 * TRIGGER: UserPromptSubmit
 *
 * INPUT:
 * - stdin: Hook input JSON (session_id, prompt)
 *
 * OUTPUT:
 * - stdout: None (silent hook)
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Creates: MEMORY/WORK/<timestamp>_<slug>/ directory with META.yaml
 * - Creates: MEMORY/STATE/current-work-{session_id}.json (session-scoped state)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - READ BY: SessionCleanup.hook.ts (findStateFile reads session-scoped state)
 * - READ BY: WorkCompletionLearning.hook.ts (findStateFile reads session-scoped state)
 * - COORDINATES WITH: PRDSync.hook.ts (PRD updates sync to work.json)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <20ms
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getISOTimestamp } from './lib/time';
import { getPaiDir } from './lib/paths';

const BASE_DIR = getPaiDir();
const MEMORY_DIR = join(BASE_DIR, 'MEMORY');
const STATE_DIR = join(MEMORY_DIR, 'STATE');
const WORK_DIR = join(MEMORY_DIR, 'WORK');

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_title: string;
  task_count: number;
  created_at: string;
  prd_path?: string;
}

interface HookInput {
  session_id?: string;
  prompt?: string;
  user_prompt?: string;
}

/**
 * Slugify text for directory names
 */
function slugify(text: string, maxLen: number = 40): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, maxLen)
      .replace(/-$/, '') || 'task'
  );
}

/**
 * Classify prompt as work, question, or conversational
 */
function classifyPrompt(prompt: string, hasExistingSession: boolean): {
  type: 'work' | 'question' | 'conversational';
  title: string;
  is_new_topic: boolean;
} {
  const trimmed = prompt.trim();

  // Short conversational responses
  if (
    trimmed.length < 20 &&
    /^(yes|no|ok|okay|thanks|proceed|continue|go ahead|sure|got it|hi|hello|hey|good morning|good evening|\d{1,2})$/i.test(trimmed)
  ) {
    return { type: 'conversational', title: '', is_new_topic: false };
  }

  const title = trimmed.substring(0, 60).replace(/[^a-zA-Z0-9\s]/g, '').trim();

  if (!hasExistingSession) {
    return { type: 'work', title, is_new_topic: true };
  }

  return { type: 'work', title, is_new_topic: false };
}

/**
 * Get local time components for timestamp-based directory names
 */
function getLocalComponents(): {
  year: number; month: string; day: string;
  hours: string; minutes: string; seconds: string;
} {
  const date = new Date();
  return {
    year: date.getFullYear(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    hours: String(date.getHours()).padStart(2, '0'),
    minutes: String(date.getMinutes()).padStart(2, '0'),
    seconds: String(date.getSeconds()).padStart(2, '0'),
  };
}

async function main() {
  let input: HookInput;
  try {
    input = JSON.parse(readFileSync(0, 'utf-8'));
  } catch {
    process.exit(0);
  }

  const prompt = input.prompt || input.user_prompt || '';
  if (prompt.length < 2) {
    process.exit(0);
  }

  const sessionId = input.session_id || 'unknown';

  mkdirSync(WORK_DIR, { recursive: true });
  mkdirSync(STATE_DIR, { recursive: true });

  // Read current session-scoped state
  let currentWork: CurrentWork | null = null;
  const scopedFile = join(STATE_DIR, `current-work-${sessionId}.json`);

  if (existsSync(scopedFile)) {
    try {
      currentWork = JSON.parse(readFileSync(scopedFile, 'utf-8'));
    } catch { /* corrupt state — treat as new session */ }
  }

  const isExistingSession = currentWork && currentWork.session_id === sessionId;
  const classification = classifyPrompt(prompt, !!isExistingSession);

  // Conversational continuation — no state changes needed
  if (classification.type === 'conversational' && !classification.is_new_topic) {
    console.error('[AutoWork] Conversational continuation, no new task');
    process.exit(0);
  }

  if (!isExistingSession) {
    // New session — create work directory and session-scoped state file
    const title = classification.title || prompt.substring(0, 50);
    const { year, month, day, hours, minutes, seconds } = getLocalComponents();
    const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
    const sessionDirName = `${timestamp}_${slugify(title, 50)}`;
    const sessionPath = join(WORK_DIR, sessionDirName);

    mkdirSync(join(sessionPath, 'tasks'), { recursive: true });
    mkdirSync(join(sessionPath, 'scratch'), { recursive: true });

    // Create META.yaml
    const meta = [
      `id: "${sessionDirName}"`,
      `title: "${title}"`,
      `session_id: "${sessionId}"`,
      `created_at: "${getISOTimestamp()}"`,
      `completed_at: null`,
      `status: "ACTIVE"`,
    ].join('\n') + '\n';
    writeFileSync(join(sessionPath, 'META.yaml'), meta, 'utf-8');

    // Write session-scoped state file
    const stateData: CurrentWork = {
      session_id: sessionId,
      session_dir: sessionDirName,
      current_task: `001_${slugify(title)}`,
      task_title: title,
      task_count: 1,
      created_at: getISOTimestamp(),
    };
    writeFileSync(scopedFile, JSON.stringify(stateData, null, 2), 'utf-8');

    console.error(`[AutoWork] New session: ${sessionDirName} (state: current-work-${sessionId}.json)`);
  } else {
    console.error(`[AutoWork] Continuing session: ${currentWork!.session_dir}`);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
