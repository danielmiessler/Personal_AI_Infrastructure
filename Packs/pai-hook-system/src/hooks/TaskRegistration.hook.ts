#!/usr/bin/env bun
/**
 * TaskRegistration.hook.ts - Register tasks in external registry (PreToolUse: TaskCreate/TaskUpdate)
 *
 * PURPOSE:
 * Tracks task creation and completion in an external registry that hooks can access.
 * Enables SessionStart hygiene hook to detect orphans via PID liveness checks.
 *
 * TRIGGERS:
 * - PreToolUse: TaskCreate → Register new task with current PID
 * - PreToolUse: TaskUpdate → Update heartbeat or unregister on completion/deletion
 *
 * DESIGN:
 * This hook reads the tool input from stdin and:
 * - For TaskCreate: Extracts subject, registers with current PID
 * - For TaskUpdate with status=completed/deleted: Unregisters task
 * - For TaskUpdate with other changes: Updates heartbeat
 *
 * The registry enables the SessionStart hygiene hook to check `kill -0 $pid`
 * and detect when a task's owning process is dead (crashed agent = orphan).
 */

import { registerTask, unregisterTask, heartbeatTask } from './lib/TaskRegistry';

interface HookInput {
  tool_name: string;
  tool_input: {
    subject?: string;
    taskId?: string;
    status?: string;
    description?: string;
    activeForm?: string;
  };
}

async function main() {
  try {
    // Read hook input from stdin
    const input = await Bun.stdin.text();
    if (!input.trim()) {
      process.exit(0);
    }

    const hookData: HookInput = JSON.parse(input);
    const { tool_name, tool_input } = hookData;

    // Determine if this is a subagent
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (tool_name === 'TaskCreate') {
      // Register new task with current process info
      const taskId = `pending-${Date.now()}`; // Temporary ID until actual ID is assigned
      const subject = tool_input.subject || 'Unknown task';

      registerTask(taskId, subject, isSubagent);
      console.error(`📝 Registered task: ${subject} (PID: ${process.pid}, subagent: ${isSubagent})`);

    } else if (tool_name === 'TaskUpdate') {
      const { taskId, status } = tool_input;

      if (!taskId) {
        process.exit(0);
      }

      if (status === 'completed' || status === 'deleted') {
        // Task is done - remove from registry
        unregisterTask(taskId);
        console.error(`🗑️ Unregistered task: ${taskId} (status: ${status})`);
      } else {
        // Task is being updated - refresh heartbeat
        heartbeatTask(taskId);
        console.error(`💓 Heartbeat updated: ${taskId}`);
      }
    }

    process.exit(0);
  } catch (error) {
    // Non-fatal - don't block task operations
    console.error(`⚠️ Task registration hook error: ${error}`);
    process.exit(0);
  }
}

main();
