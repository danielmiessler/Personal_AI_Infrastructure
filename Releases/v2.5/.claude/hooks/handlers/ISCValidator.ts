#!/usr/bin/env bun
/**
 * ISCValidator.ts - ISC File Validation Handler (Stop Event)
 *
 * PURPOSE:
 * Validates that ISC.json was properly populated during algorithm execution.
 * Checks for empty criteria arrays and stale THREAD.md phases.
 *
 * VALIDATION RULES:
 * 1. ISC.json criteria array must be non-empty after OBSERVE
 * 2. ISC.json must have been modified since session start
 * 3. THREAD.md should not have _Pending..._ placeholders
 *
 * BEHAVIOR:
 * - Currently WARNS (logs to stderr) if validation fails
 * - TODO: Can be upgraded to BLOCK response if validation fails
 *
 * CALLED BY: StopOrchestrator.hook.ts
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ParsedTranscript } from '../../skills/PAI/Tools/TranscriptParser';

interface CurrentWork {
  session_id: string;
  session_dir: string;
  current_task: string;
  task_count: number;
  created_at: string;
}

interface ISCData {
  taskId: string;
  status: string;
  effortLevel: string;
  criteria: string[];
  antiCriteria: string[];
  satisfaction: Record<string, boolean> | null;
  createdAt: string;
  updatedAt: string;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

const BASE_DIR = process.env.PAI_DIR || join(process.env.HOME || process.env.USERPROFILE || homedir(), '.claude');
const WORK_DIR = join(BASE_DIR, 'MEMORY', 'WORK');
const STATE_DIR = join(BASE_DIR, 'MEMORY', 'STATE');
const CURRENT_WORK_FILE = join(STATE_DIR, 'current-work.json');

function readCurrentWork(): CurrentWork | null {
  try {
    if (!existsSync(CURRENT_WORK_FILE)) return null;
    return JSON.parse(readFileSync(CURRENT_WORK_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function readISC(taskPath: string): ISCData | null {
  try {
    const iscPath = join(taskPath, 'ISC.json');
    if (!existsSync(iscPath)) return null;
    return JSON.parse(readFileSync(iscPath, 'utf-8'));
  } catch {
    return null;
  }
}

function readThread(taskPath: string): string | null {
  try {
    const threadPath = join(taskPath, 'THREAD.md');
    if (!existsSync(threadPath)) return null;
    return readFileSync(threadPath, 'utf-8');
  } catch {
    return null;
  }
}

function getFileModTime(filePath: string): Date | null {
  try {
    if (!existsSync(filePath)) return null;
    const stats = statSync(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

function validate(taskPath: string, currentWork: CurrentWork): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    warnings: [],
    errors: [],
  };

  // Check ISC.json
  const isc = readISC(taskPath);
  if (!isc) {
    result.errors.push('ISC.json not found or unreadable');
    result.valid = false;
    return result;
  }

  // Rule 1: Criteria array must be non-empty
  if (!isc.criteria || isc.criteria.length === 0) {
    result.warnings.push('ISC.json criteria array is EMPTY - algorithm may not have executed properly');
  }

  // Rule 2: Check if ISC.json was modified after session start
  const iscPath = join(taskPath, 'ISC.json');
  const iscModTime = getFileModTime(iscPath);
  const sessionStart = new Date(currentWork.created_at);

  if (iscModTime && iscModTime <= sessionStart) {
    result.warnings.push('ISC.json not modified since session start - no updates during algorithm execution');
  }

  // Check THREAD.md
  const thread = readThread(taskPath);
  if (!thread) {
    result.errors.push('THREAD.md not found or unreadable');
    result.valid = false;
    return result;
  }

  // Rule 3: Check for _Pending..._ placeholders
  const pendingCount = (thread.match(/_Pending\.\.\._/g) || []).length;
  if (pendingCount > 0) {
    result.warnings.push(`THREAD.md has ${pendingCount} phases still marked _Pending..._ - algorithm phases not logged`);
  }

  return result;
}

export interface ISCValidationResult {
  shouldBlock: boolean;
  blockReason?: string;
  warnings: string[];
  errors: string[];
}

export async function handleISCValidation(
  parsed: ParsedTranscript,
  hookInput: { session_id: string }
): Promise<ISCValidationResult> {
  const result: ISCValidationResult = {
    shouldBlock: false,
    warnings: [],
    errors: [],
  };

  const currentWork = readCurrentWork();
  if (!currentWork) {
    console.error('[ISCValidator] No current work found - skipping validation');
    return result;
  }

  // Skip if session IDs don't match
  if (currentWork.session_id !== hookInput.session_id) {
    console.error('[ISCValidator] Session ID mismatch - skipping validation');
    return result;
  }

  const taskPath = join(WORK_DIR, currentWork.session_dir, 'tasks', currentWork.current_task);
  if (!existsSync(taskPath)) {
    console.error(`[ISCValidator] Task path not found: ${taskPath}`);
    return result;
  }

  const validationResult = validate(taskPath, currentWork);
  result.warnings = validationResult.warnings;
  result.errors = validationResult.errors;

  // Log results
  if (result.errors.length > 0) {
    console.error('[ISCValidator] ERRORS:');
    result.errors.forEach((e) => console.error(`  ❌ ${e}`));
  }

  if (result.warnings.length > 0) {
    console.error('[ISCValidator] WARNINGS:');
    result.warnings.forEach((w) => console.error(`  ⚠️  ${w}`));
  }

  // Check if OBSERVE phase was attempted (algorithm was run)
  const responseText = parsed.plainCompletion || '';
  const algorithmAttempted = responseText.includes('OBSERVE') ||
                              responseText.includes('📦 CAPABILITIES') ||
                              responseText.includes('ISC TRACKER');

  // BLOCKING LOGIC: If algorithm was attempted but ISC is empty, block
  const isc = readISC(taskPath);
  if (algorithmAttempted && isc && (!isc.criteria || isc.criteria.length === 0)) {
    result.shouldBlock = true;
    result.blockReason = `ISC.json criteria array is EMPTY after algorithm execution.

You attempted the algorithm but did not populate ISC criteria.

REQUIRED:
1. In OBSERVE phase, build 3-10 ISC criteria
2. Write criteria to ISC.json before proceeding
3. Each criterion: 8-12 words, binary testable STATE

Example criterion: "Research agents return findings within two minutes"

Fix the ISC.json and try again.`;
  }

  if (validationResult.valid && result.warnings.length === 0) {
    console.error('[ISCValidator] ✓ All validation checks passed');
  }

  return result;
}
