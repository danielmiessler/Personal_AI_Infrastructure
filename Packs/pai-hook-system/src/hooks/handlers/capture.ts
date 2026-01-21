/**
 * capture.ts - Response capture handler
 *
 * Pure handler: receives pre-parsed transcript data, updates WORK items.
 * No I/O for transcript reading - that's done by orchestrator.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getPaiDir } from '../lib/paths';
import { sendEventToObservability, getCurrentTimestamp, getSourceApp } from '../lib/observability';
import { notifyTaskComplete, notifyError, getSessionDurationMinutes } from '../lib/notifications';
import { getLearningCategory, isLearningCapture } from '../lib/learning-utils';
import { getPSTTimestamp, getPSTDate, getYearMonth, getISOTimestamp } from '../lib/time';
import type { ParsedTranscript, StructuredResponse } from '../../skills/CORE/Tools/TranscriptParser';

const BASE_DIR = getPaiDir();
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');

interface CurrentWork {
  session_id: string;
  work_dir: string;
  created_at: string;
  item_count: number;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

function generateFilename(description: string, type: 'LEARNING' | 'WORK'): string {
  const pstTimestamp = getPSTTimestamp();
  const date = pstTimestamp.slice(0, 10);
  const time = pstTimestamp.slice(11, 19).replace(/:/g, '');

  const cleanDesc = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

  return `${date}-${time}_${type}_${cleanDesc}.md`;
}

function generateLearningContent(structured: StructuredResponse, fullText: string, timestamp: string): string {
  return `---
capture_type: LEARNING
timestamp: ${timestamp}
auto_captured: true
tags: [auto-capture]
---

# Quick Learning: ${structured.completed || structured.summary || 'Task Completion'}

**Date:** ${structured.date || getPSTDate()}
**Auto-captured:** Yes (use /capture-learning for detailed narrative)

---

## Summary

${structured.summary || 'N/A'}

## Analysis

${structured.analysis || 'N/A'}

## Actions Taken

${structured.actions || 'N/A'}

## Results

${structured.results || 'N/A'}

## Current Status

${structured.status || 'N/A'}

## Next Steps

${structured.next || 'N/A'}

---

## Notes

This is an automatically captured learning moment. For a more detailed narrative with:
- The full problem-solving journey
- What we initially thought vs. what was true
- Detailed troubleshooting steps
- Comprehensive lesson learned

Use: \`/capture-learning\` to create a full learning document.

---

## Full Response

<details>
<summary>Click to view full response</summary>

${fullText.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')}

</details>
`;
}

function readCurrentWork(): CurrentWork | null {
  try {
    if (!existsSync(CURRENT_WORK_FILE)) return null;
    const content = readFileSync(CURRENT_WORK_FILE, 'utf-8');
    return JSON.parse(content) as CurrentWork;
  } catch {
    return null;
  }
}

function updateWorkItem(workDirName: string, structured: StructuredResponse): boolean {
  try {
    const workPath = join(WORK_DIR, workDirName);
    const itemsPath = join(workPath, 'items');

    if (!existsSync(itemsPath)) {
      console.error(`[Capture] Items directory not found: ${itemsPath}`);
      return false;
    }

    const items = readdirSync(itemsPath).filter(f => f.endsWith('.yaml')).sort();
    if (items.length === 0) {
      console.error('[Capture] No items found in work directory');
      return false;
    }

    const latestItem = items[items.length - 1];
    const itemPath = join(itemsPath, latestItem);

    let itemContent = readFileSync(itemPath, 'utf-8');
    itemContent = itemContent.replace(/^status: "ACTIVE"$/m, 'status: "DONE"');
    itemContent = itemContent.replace(
      /^completed_at: null$/m,
      `completed_at: "${getISOTimestamp()}"`
    );

    const summary = (structured.completed || structured.summary || 'Task completed').substring(0, 200);
    itemContent = itemContent.replace(
      /^response_summary: null$/m,
      `response_summary: "${summary.replace(/"/g, '\\"')}"`
    );

    writeFileSync(itemPath, itemContent, 'utf-8');
    console.error(`[Capture] Updated work item: ${latestItem}`);
    return true;
  } catch (error) {
    console.error(`[Capture] Error updating work item: ${error}`);
    return false;
  }
}

async function captureWorkSummary(text: string, structured: StructuredResponse): Promise<void> {
  try {
    if (!structured.summary && !structured.completed) {
      return;
    }

    // Update active work directory if one exists
    const currentWork = readCurrentWork();
    if (currentWork?.work_dir) {
      const updated = updateWorkItem(currentWork.work_dir, structured);
      if (updated) {
        console.error(`[Capture] Updated work directory: ${currentWork.work_dir}`);
      }
    }

    // Only write to LEARNING/ if this qualifies as a learning capture
    const isLearning = isLearningCapture(text, structured.summary, structured.analysis);

    if (isLearning) {
      let description = (structured.completed || structured.summary || 'task-completion')
        .replace(/^Completed\s+/i, '')
        .replace(/\[AGENT:\w+\]\s*/gi, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      if (!description || description.length < 3) {
        description = structured.summary || structured.analysis || 'task-completion';
        description = description.replace(/^Completed\s+/i, '').trim();
      }

      if (!description || description.length < 3) {
        description = 'general-task';
      }

      const yearMonth = getYearMonth();
      const filename = generateFilename(description, 'LEARNING');
      const baseDir = getPaiDir();
      const category = getLearningCategory(text);
      const targetDir = join(baseDir, 'MEMORY', 'LEARNING', category, yearMonth);

      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const filePath = join(targetDir, filename);
      const timestamp = getPSTTimestamp();
      const content = generateLearningContent(structured, text, timestamp);

      writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ Captured learning to: ${filePath}`);
    }
  } catch (error) {
    console.error('[Capture] Error capturing work summary:', error);
  }
}

/**
 * Handle response capture with pre-parsed transcript data.
 */
export async function handleCapture(parsed: ParsedTranscript, hookInput: HookInput): Promise<void> {
  const { lastMessage, structured, plainCompletion } = parsed;

  // Capture work summary (async, non-blocking)
  if (lastMessage) {
    captureWorkSummary(lastMessage, structured).catch(err => {
      console.error('[Capture] History capture failed (non-critical):', err);
    });
  }

  // Push notifications for long tasks
  const duration = getSessionDurationMinutes();
  if (duration > 0) {
    console.error(`⏱️ Session duration: ${duration.toFixed(1)} minutes`);
  }

  const hasError = lastMessage && (
    /error|failed|exception|crash/i.test(lastMessage) &&
    /📊\s*STATUS:.*(?:error|failed|broken)/i.test(lastMessage)
  );

  if (hasError) {
    notifyError(plainCompletion).catch(() => {});
  } else {
    notifyTaskComplete(plainCompletion).catch(() => {});
  }

  // Observability event
  await sendEventToObservability({
    source_app: getSourceApp(),
    session_id: hookInput.session_id,
    hook_event_type: 'Stop',
    timestamp: getCurrentTimestamp(),
    transcript_path: hookInput.transcript_path,
    summary: structured.completed || plainCompletion,
  }).catch(() => {});
}
