#!/usr/bin/env bun
/**
 * TaskHygiene.hook.ts - Autonomous stale task cleanup with ENFORCEMENT (SessionStart)
 *
 * PURPOSE:
 * Detects orphaned tasks by checking if their owning process is still alive.
 * Uses factual PID liveness checks (kill -0) instead of documentation-based reminders.
 *
 * TRIGGER: SessionStart
 *
 * DESIGN PHILOSOPHY (from RedTeam analysis):
 * - Documentation-based cleanup ("please clean up stale tasks") has ZERO enforcement power
 * - This hook uses an external TaskRegistry that tracks task -> PID mappings
 * - At session start, checks each registered task's PID with `kill -0`
 * - Dead PID = orphaned task = FACTUAL information for Claude to act on
 *
 * OUTPUT:
 * - If orphans found: Outputs specific task IDs with VERIFIED dead PIDs
 * - If no orphans: Silent exit
 * - Claude receives FACTS, not suggestions
 */

import { findOrphanedTasks, cleanOrphanedTasks, getAllTasks, TaskEntry } from './lib/TaskRegistry';
import { getPaiDir } from './lib/paths';

async function main() {
  try {
    // Skip for subagent sessions
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      console.error('🤖 Subagent session - skipping task hygiene');
      process.exit(0);
    }

    console.error('🧹 Checking for orphaned tasks...');

    // Get all registered tasks and find orphans
    const allTasks = getAllTasks();
    const orphans = findOrphanedTasks();

    console.error(`📊 Registry: ${allTasks.length} tasks, ${orphans.length} orphans`);

    if (orphans.length === 0) {
      console.error('✅ No orphaned tasks found');
      process.exit(0);
    }

    // Clean orphans from registry
    const cleanedIds = cleanOrphanedTasks();
    console.error(`🗑️ Cleaned ${cleanedIds.length} orphans from registry`);

    // Format orphan information for Claude
    const orphanDetails = orphans.map((o: TaskEntry) =>
      `  - Task "${o.taskId}": subject="${o.subject}", PID ${o.pid} (DEAD), created ${o.createdAt}`
    ).join('\n');

    // Output FACTUAL orphan report - Claude must act on verified information
    const report = `<system-reminder>
TASK HYGIENE: VERIFIED ORPHANED TASKS DETECTED

The following tasks have DEAD owning processes (verified via kill -0):

${orphanDetails}

**ACTION REQUIRED:**
These task IDs must be deleted using TaskUpdate with status='deleted':
${cleanedIds.map(id => `- TaskUpdate(taskId="${id}", status="deleted")`).join('\n')}

This is NOT a suggestion. The owning processes are confirmed dead.
Execute cleanup before proceeding with other work.
</system-reminder>`;

    console.log(report);
    console.error('⚠️ Orphaned tasks detected - cleanup instructions emitted');
    process.exit(0);
  } catch (error) {
    console.error('⚠️ Task hygiene hook error:', error);
    // Non-fatal - don't block session start
    process.exit(0);
  }
}

main();
