/**
 * CLAUDE.local.md Writer
 *
 * Generates and writes CLAUDE.local.md files for session continuity.
 * Uses templates from mai-project-core.
 *
 * All operations are DETERMINISTIC - no LLM calls.
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { generateLocalMd } from 'mai-project-core';

export interface LocalMdOptions {
  timestamp: string;
  sessionId: string;
  currentTask: string;
  currentStep: string;
  modifiedFiles: string[];
  recentDecisions: string[];
  agents: Array<{ id: string; task: string; status: string }>;
  resumeInstructions: string;
}

/**
 * Write CLAUDE.local.md file
 */
export function writeLocalMd(filePath: string, options: LocalMdOptions): void {
  const content = generateLocalMd(options);
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Read existing CLAUDE.local.md file
 */
export function readLocalMd(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }
  return readFileSync(filePath, 'utf-8');
}

/**
 * Check if CLAUDE.local.md exists
 */
export function localMdExists(filePath: string): boolean {
  return existsSync(filePath);
}

/**
 * Generate resume instructions based on todo state
 */
export function generateResumeInstructions(
  todos: Array<{ content: string; status: string }>,
  currentTask?: { content: string }
): string {
  if (!currentTask) {
    const pending = todos.filter(t => t.status === 'pending');
    if (pending.length > 0) {
      return `Start with: ${pending[0].content}`;
    }
    return 'All tasks completed or no tasks defined.';
  }
  return `Continue with: ${currentTask.content}`;
}

/**
 * Build LocalMdOptions from parsed data
 */
export function buildLocalMdOptions(
  sessionId: string,
  todos: Array<{ content: string; status: string; activeForm: string }>,
  modifiedFiles: string[],
  decisions: string[],
  agents: Array<{ id: string; task: string; status: string }>
): LocalMdOptions {
  const currentTask = todos.find(t => t.status === 'in_progress');

  return {
    timestamp: new Date().toISOString(),
    sessionId,
    currentTask: currentTask?.content || 'None',
    currentStep: currentTask?.activeForm || 'None',
    modifiedFiles,
    recentDecisions: decisions,
    agents,
    resumeInstructions: generateResumeInstructions(todos, currentTask),
  };
}
