#!/usr/bin/env bun
/**
 * AutoWorkCreation.hook.ts - Session/Task Management (UserPromptSubmit)
 *
 * PURPOSE:
 * Creates and manages the session/task hierarchy for each Claude Code session.
 * - SESSION: One directory per Claude Code session (the primitive)
 * - TASK: Subdirectories for distinct work items within a session
 *
 * Each task has its own algorithm execution context (ISC.json, THREAD.md).
 *
 * TRIGGER: UserPromptSubmit
 *
 * STRUCTURE CREATED:
 * WORK/{timestamp}_{session-title}/
 * ├── META.yaml                    # Session metadata
 * ├── tasks/
 * │   ├── 001_{task-slug}/
 * │   │   ├── ISC.json             # Task's Ideal State Criteria
 * │   │   └── THREAD.md            # Task's algorithm log (includes metadata in frontmatter)
 * │   └── current -> 001_...       # Symlink to active task
 * └── scratch/                     # Temporary files
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, lstatSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getPSTComponents, getISOTimestamp } from './lib/time';
import { inference } from '../skills/PAI/Tools/Inference';

interface HookInput {
  session_id: string;
  prompt?: string;
  user_prompt?: string;
}

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_count: number;
  created_at: string;
}

interface PromptClassification {
  type: 'work' | 'question' | 'conversational';
  title: string;
  effort: 'TRIVIAL' | 'QUICK' | 'STANDARD' | 'THOROUGH';
  is_new_topic: boolean;
}

const BASE_DIR = process.env.PAI_DIR || join((process.env.HOME || process.env.USERPROFILE || homedir()), '.claude');
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');

const CLASSIFICATION_PROMPT = `Classify this user request. Return ONLY valid JSON:
{
  "type": "work" | "question" | "conversational",
  "title": "<3-8 word title>",
  "effort": "TRIVIAL" | "QUICK" | "STANDARD" | "THOROUGH",
  "is_new_topic": true | false
}

DEFINITIONS:
- type: work (task/imperative), question (info request), conversational (greeting/thanks)
- effort: TRIVIAL (<5 min), QUICK (5-30 min), STANDARD (30 min - 2 hrs), THOROUGH (2+ hrs)
- is_new_topic: true if this is a distinctly different topic from previous context, false if continuation

CONTEXT FOR is_new_topic:
- true: "Now let's work on authentication" (new domain)
- true: "Different question - how do I..." (explicit topic change)
- false: "Also update the..." (continuation)
- false: "What about..." (follow-up on same topic)
- false: "Proceed" or "Yes" (confirmation)`;

async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function readCurrentWork(): CurrentWork | null {
  try {
    if (!existsSync(CURRENT_WORK_FILE)) return null;
    return JSON.parse(readFileSync(CURRENT_WORK_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeCurrentWork(state: CurrentWork): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(CURRENT_WORK_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function slugify(text: string, maxLen: number = 40): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, maxLen)
    .replace(/-$/, '') || 'task';
}

function generateSessionDirName(title: string): string {
  const { year, month, day, hours, minutes, seconds } = getPSTComponents();
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;
  return `${timestamp}_${slugify(title, 50)}`;
}

/**
 * Create session directory structure
 */
function createSessionDirectory(sessionDirName: string, sessionId: string, title: string): string {
  const sessionPath = join(WORK_DIR, sessionDirName);
  const timestamp = getISOTimestamp();

  // Create session structure
  mkdirSync(join(sessionPath, 'tasks'), { recursive: true });
  mkdirSync(join(sessionPath, 'scratch'), { recursive: true });

  // Session META.yaml
  const meta = `id: "${sessionDirName}"
title: "${title}"
session_id: "${sessionId}"
created_at: "${timestamp}"
status: "ACTIVE"
completed_at: null
`;
  writeFileSync(join(sessionPath, 'META.yaml'), meta, 'utf-8');

  // Created session directory
  return sessionPath;
}

/**
 * Create task directory with ISC.json and THREAD.md (with frontmatter metadata)
 */
function createTaskDirectory(
  sessionPath: string,
  taskNumber: number,
  title: string,
  effort: string,
  prompt: string
): string {
  const taskId = String(taskNumber).padStart(3, '0');
  const taskSlug = slugify(title);
  const taskDirName = `${taskId}_${taskSlug}`;
  const taskPath = join(sessionPath, 'tasks', taskDirName);
  const timestamp = getISOTimestamp();

  mkdirSync(taskPath, { recursive: true });

  // Task THREAD.md with frontmatter metadata (no separate META.yaml)
  const thread = `---
taskId: "${taskDirName}"
title: "${title}"
effortLevel: "${effort}"
status: "IN_PROGRESS"
createdAt: "${timestamp}"
prompt: |
  ${prompt.substring(0, 500).replace(/\n/g, '\n  ')}
---

# Algorithm Thread: ${title}

## Phase Log

### 👀 OBSERVE Phase
_Pending..._

### 🧠 THINK Phase
_Pending..._

### 📋 PLAN Phase
_Pending..._

### 🔨 BUILD Phase
_Pending..._

### ▶️ EXECUTE Phase
_Pending..._

### ✅ VERIFY Phase
_Pending..._

### 🎓 LEARN Phase
_Pending..._

---

## ISC Evolution

_Criteria updates logged here..._

---

## Key Observations

_Important observations during execution..._
`;
  writeFileSync(join(taskPath, 'THREAD.md'), thread, 'utf-8');

  // Task ISC.json with proper scaffold
  const isc = {
    taskId: taskDirName,
    status: 'PENDING',
    effortLevel: effort,
    criteria: [],
    antiCriteria: [],
    satisfaction: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeFileSync(join(taskPath, 'ISC.json'), JSON.stringify(isc, null, 2), 'utf-8');

  // Update 'current' symlink
  const currentLink = join(sessionPath, 'tasks', 'current');
  try {
    if (existsSync(currentLink) || lstatSync(currentLink)) {
      unlinkSync(currentLink);
    }
  } catch { /* ignore if doesn't exist */ }
  symlinkSync(taskDirName, currentLink);

  // Created task directory
  return taskDirName;
}

async function classifyPrompt(prompt: string, hasExistingSession: boolean): Promise<PromptClassification> {
  const trimmed = prompt.trim();

  // Quick heuristics
  if (trimmed.length < 15 && /^(yes|no|ok|okay|thanks|proceed|continue|go ahead|sure|got it)$/i.test(trimmed)) {
    return { type: 'conversational', title: '', effort: 'TRIVIAL', is_new_topic: false };
  }

  // Use inference for classification
  try {
    const contextNote = hasExistingSession
      ? '\n\nNOTE: There is an existing session with prior tasks. Consider if this is a continuation or new topic.'
      : '\n\nNOTE: This is the first prompt in a new session. is_new_topic should be true.';

    const result = await inference({
      systemPrompt: CLASSIFICATION_PROMPT + contextNote,
      userPrompt: prompt,
      expectJson: true,
      timeout: 10000,
      level: 'fast',
    });

    if (result.success && result.parsed) {
      const parsed = result.parsed as PromptClassification;
      return {
        type: parsed.type || 'work',
        title: parsed.title || prompt.substring(0, 50),
        effort: parsed.effort || 'STANDARD',
        is_new_topic: hasExistingSession ? (parsed.is_new_topic ?? false) : true,
      };
    }
  } catch (err) {
    // Classification failed - using fallback
  }

  // Fallback
  return {
    type: 'work',
    title: prompt.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim(),
    effort: 'STANDARD',
    is_new_topic: !hasExistingSession,
  };
}

async function main() {
  try {
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    const prompt = data.prompt || data.user_prompt || '';
    const sessionId = data.session_id || 'unknown';

    if (!prompt || prompt.length < 2) {
      process.exit(0);
    }

    if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

    let currentWork = readCurrentWork();
    const isExistingSession = currentWork && currentWork.session_id === sessionId;

    const classification = await classifyPrompt(prompt, !!isExistingSession);

    // Skip task creation for pure conversational
    if (classification.type === 'conversational' && !classification.is_new_topic) {
      // Conversational continuation, no new task
      process.exit(0);
    }

    if (!isExistingSession) {
      // New session: create session directory + first task
      const title = classification.title || prompt.substring(0, 50);
      const sessionDirName = generateSessionDirName(title);
      const sessionPath = createSessionDirectory(sessionDirName, sessionId, title);

      const taskDirName = createTaskDirectory(
        sessionPath,
        1,
        title,
        classification.effort,
        prompt
      );

      currentWork = {
        session_id: sessionId,
        session_dir: sessionDirName,
        current_task: taskDirName,
        task_count: 1,
        created_at: getISOTimestamp(),
      };
      writeCurrentWork(currentWork);

      // New session with task created
    } else if (classification.is_new_topic) {
      // Existing session, new topic: create new task
      const sessionPath = join(WORK_DIR, currentWork!.session_dir);
      const newTaskNumber = currentWork!.task_count + 1;
      const title = classification.title || prompt.substring(0, 50);

      const taskDirName = createTaskDirectory(
        sessionPath,
        newTaskNumber,
        title,
        classification.effort,
        prompt
      );

      currentWork!.current_task = taskDirName;
      currentWork!.task_count = newTaskNumber;
      writeCurrentWork(currentWork!);

      // New task in session
    } else {
      // Continuation of current task - no new task needed
    }

    process.exit(0);
  } catch (err) {
    // AutoWork error - non-blocking
    process.exit(0);
  }
}

main();
