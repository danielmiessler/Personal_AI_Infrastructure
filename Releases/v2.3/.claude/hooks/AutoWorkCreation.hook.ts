#!/usr/bin/env bun
/**
 * AutoWorkCreation.hook.ts - Automatic Work Directory Creation (UserPromptSubmit)
 *
 * PURPOSE:
 * Automatically creates and manages work directories for each session. Every user
 * prompt is classified and tracked, building a complete record of what was worked
 * on. This enables work resumption, session summaries, and learning extraction.
 *
 * TRIGGER: UserPromptSubmit
 *
 * INPUT:
 * - stdin: Hook input JSON with prompt, session_id, transcript_path
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Creates: MEMORY/WORK/<timestamp>_<slug>/ directory structure
 * - Creates: META.yaml, IDEAL.md, IdealState.jsonl, items/*.yaml
 * - Updates: MEMORY/STATE/current-work.json (session state)
 * - API call: Haiku inference for prompt classification
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None (creates foundational work structure)
 * - COORDINATES WITH: StopOrchestrator/capture (updates work on completion)
 * - MUST RUN BEFORE: All other UserPromptSubmit hooks (establishes work context)
 * - MUST RUN AFTER: None
 *
 * SESSION MODEL:
 * - First prompt: Creates work directory + first item
 * - Subsequent prompts: Adds items to existing work directory
 * - Session end: SessionSummary marks COMPLETED and clears state
 *
 * CLASSIFICATION TYPES:
 * - work: Any task/imperative (fix, add, create, etc.)
 * - question: Information requests (what, how, why, etc.)
 * - conversational: Greetings, thanks, confirmations
 *
 * EFFORT LEVELS:
 * - TRIVIAL: <5 min (single line change)
 * - QUICK: 5-30 min (small task)
 * - STANDARD: 30 min - 2 hrs (normal task)
 * - THOROUGH: 2+ hrs (complex task)
 *
 * DIRECTORY STRUCTURE CREATED:
 * WORK/<timestamp>_<slug>/
 * ├── META.yaml (work metadata)
 * ├── IDEAL.md (ideal state criteria)
 * ├── IdealState.jsonl (ALGORITHM tracking)
 * ├── items/ (individual prompt items)
 * ├── verification/ (test results)
 * ├── research/ (research artifacts)
 * ├── agents/ (agent work)
 * │   ├── claimed/
 * │   └── completed/
 * └── children/ (spawned sub-work)
 *
 * ERROR HANDLING:
 * - Empty prompt: Silent exit
 * - Classification failure: Falls back to 'work' type
 * - File operation failures: Logged, continues
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (work tracking shouldn't delay response)
 * - Typical execution: <200ms (includes Haiku classification)
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getPSTComponents, getISOTimestamp } from './lib/time';
import { inference } from '../skills/CORE/Tools/Inference';

interface HookInput {
  session_id: string;
  prompt?: string;        // Actual field name from Claude Code
  user_prompt?: string;   // Legacy field name
  transcript_path: string;
  hook_event_name: string;
}

interface CurrentWork {
  session_id: string;
  work_dir: string;
  created_at: string;
  item_count: number;
}

interface WorkClassification {
  type: 'work' | 'question' | 'conversational';
  title: string;
  effort: 'TRIVIAL' | 'QUICK' | 'STANDARD' | 'THOROUGH';
}

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');

const CLASSIFICATION_PROMPT = `Classify this user request. Return ONLY valid JSON:
{
  "type": "work" | "question" | "conversational",
  "title": "<3-8 word title for work items, empty for questions/conversational>",
  "effort": "TRIVIAL" | "QUICK" | "STANDARD" | "THOROUGH"
}

DEFINITIONS:
- work: Any task/imperative (fix, add, create, update, check, run, deploy, implement, etc.)
- question: Asking for information (what, how, why, explain, etc. - ends with ?)
- conversational: Greetings, thanks, confirmations, short follow-ups (yes, no, ok, thanks)

EFFORT LEVELS:
- TRIVIAL: Single line change, simple lookup (<5 min)
- QUICK: Small task, few files (5-30 min)
- STANDARD: Normal task, multiple steps (30 min - 2 hrs)
- THOROUGH: Complex task, research needed (2+ hrs)

EXAMPLES:
"Fix the login bug" → {"type": "work", "title": "Fix login bug", "effort": "QUICK"}
"What is the codebase structure?" → {"type": "question", "title": "", "effort": "TRIVIAL"}
"Thanks" → {"type": "conversational", "title": "", "effort": "TRIVIAL"}
"Add user authentication with JWT" → {"type": "work", "title": "Add JWT authentication", "effort": "STANDARD"}`;

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Read current work state
 */
function readCurrentWork(): CurrentWork | null {
  try {
    if (!existsSync(CURRENT_WORK_FILE)) return null;
    const content = readFileSync(CURRENT_WORK_FILE, 'utf-8');
    return JSON.parse(content) as CurrentWork;
  } catch {
    return null;
  }
}

/**
 * Write current work state
 */
function writeCurrentWork(state: CurrentWork): void {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
  writeFileSync(CURRENT_WORK_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Generate work directory name
 */
function generateWorkDirName(title: string): string {
  const { year, month, day, hours, minutes, seconds } = getPSTComponents();
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

  // Slugify title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/-$/, '');

  return `${timestamp}_${slug || 'session-work'}`;
}

/**
 * Create work directory structure
 */
function createWorkDirectory(workDirName: string, sessionId: string, title: string): void {
  const workPath = join(WORK_DIR, workDirName);

  // Create all subdirectories
  const subdirs = [
    '',
    'items',
    'verification',
    'research',
    'agents',
    'agents/claimed',
    'agents/completed',
    'children',
  ];

  for (const subdir of subdirs) {
    const dirPath = join(workPath, subdir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  // Create META.yaml
  const meta = `id: "${workDirName}"
title: "${title}"
created_at: "${getISOTimestamp()}"
completed_at: null
source: "SESSION"
status: "ACTIVE"
session_id: "${sessionId}"
lineage:
  tools_used: []
  files_changed: []
  agents_spawned: []
parent: null
`;
  writeFileSync(join(workPath, 'META.yaml'), meta, 'utf-8');

  // Create IDEAL.md (empty placeholder for ALGORITHM)
  writeFileSync(join(workPath, 'IDEAL.md'), `# Ideal State\n\nTo be defined.\n`, 'utf-8');

  // Create empty IdealState.jsonl (ready for ALGORITHM)
  writeFileSync(join(workPath, 'IdealState.jsonl'), '', 'utf-8');

  console.error(`[AutoWorkCreation] Created work directory: ${workPath}`);
}

/**
 * Add item to work directory
 */
function addItemToWork(workDirName: string, itemNumber: number, prompt: string, classification: WorkClassification): void {
  const workPath = join(WORK_DIR, workDirName);
  const itemsPath = join(workPath, 'items');

  // Generate item filename
  const itemId = String(itemNumber).padStart(3, '0');
  const slug = (classification.title || prompt.substring(0, 30))
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
    .replace(/-$/, '');

  const itemFilename = `${itemId}-${slug}.yaml`;
  const itemPath = join(itemsPath, itemFilename);

  // Create item YAML
  const item = `id: "${itemId}"
description: "${prompt.replace(/"/g, '\\"').substring(0, 500)}"
type: "${classification.type}"
effort: "${classification.effort}"
source: "USER_PROMPT"
status: "ACTIVE"
created_at: "${getISOTimestamp()}"
completed_at: null
response_summary: null
lineage:
  created_by: "user_request"
`;
  writeFileSync(itemPath, item, 'utf-8');

  console.error(`[AutoWorkCreation] Added item ${itemId} to ${workDirName}`);
}

/**
 * Classify user prompt using Haiku
 */
async function classifyPrompt(prompt: string): Promise<WorkClassification> {
  // Quick heuristic checks first
  const trimmed = prompt.trim();

  // Very short = conversational
  if (trimmed.length < 10 && /^(yes|no|ok|okay|thanks|thank you|sure|got it|cool|great)$/i.test(trimmed)) {
    return { type: 'conversational', title: '', effort: 'TRIVIAL' };
  }

  // Ends with ? = question (unless it's rhetorical/command)
  if (trimmed.endsWith('?') && /^(what|how|why|where|when|who|which|can you explain|could you tell)/i.test(trimmed)) {
    return { type: 'question', title: '', effort: 'TRIVIAL' };
  }

  // Use Haiku for better classification
  try {
    const result = await inference({
      systemPrompt: CLASSIFICATION_PROMPT,
      userPrompt: prompt,
      expectJson: true,
      timeout: 10000,
      level: 'fast',
    });

    if (result.success && result.parsed) {
      const parsed = result.parsed as WorkClassification;
      // Validate and return
      if (['work', 'question', 'conversational'].includes(parsed.type)) {
        return {
          type: parsed.type,
          title: parsed.title || '',
          effort: parsed.effort || 'QUICK',
        };
      }
    }
  } catch (err) {
    console.error(`[AutoWorkCreation] Classification failed: ${err}`);
  }

  // Fallback: assume it's work
  const fallbackTitle = prompt.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim();
  return { type: 'work', title: fallbackTitle, effort: 'QUICK' };
}

async function main() {
  try {
    console.error('[AutoWorkCreation] Hook started');

    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    // The payload uses 'prompt' (Claude Code) - user_prompt is legacy
    const prompt = data.prompt || data.user_prompt || '';
    const sessionId = data.session_id || 'unknown';

    if (!prompt || prompt.length < 2) {
      console.error('[AutoWorkCreation] Empty or very short prompt, skipping');
      process.exit(0);
    }

    // Ensure WORK directory exists
    if (!existsSync(WORK_DIR)) {
      mkdirSync(WORK_DIR, { recursive: true });
    }

    // Read current work state
    let currentWork = readCurrentWork();

    // Check if we need to create a new work directory for this session
    if (!currentWork || currentWork.session_id !== sessionId) {
      // New session - classify and create work directory
      const classification = await classifyPrompt(prompt);

      const title = classification.title || prompt.substring(0, 50);
      const workDirName = generateWorkDirName(title);

      // Create work directory
      createWorkDirectory(workDirName, sessionId, title);

      // Create first item
      addItemToWork(workDirName, 1, prompt, classification);

      // Update state
      currentWork = {
        session_id: sessionId,
        work_dir: workDirName,
        created_at: getISOTimestamp(),
        item_count: 1,
      };
      writeCurrentWork(currentWork);

      console.error(`[AutoWorkCreation] Created new work directory for session ${sessionId}`);
    } else {
      // Existing session - add item
      const classification = await classifyPrompt(prompt);

      currentWork.item_count += 1;
      addItemToWork(currentWork.work_dir, currentWork.item_count, prompt, classification);

      // Update state
      writeCurrentWork(currentWork);

      console.error(`[AutoWorkCreation] Added item ${currentWork.item_count} to existing work`);
    }

    console.error('[AutoWorkCreation] Done');
    process.exit(0);
  } catch (err) {
    console.error(`[AutoWorkCreation] Error: ${err}`);
    process.exit(0);
  }
}

main();
