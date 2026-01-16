#!/usr/bin/env bun

/**
 * Kai Todo Background Processor
 *
 * Processes queued tasks automatically when Claude usage is available.
 * Designed for autonomous tasks that don't require user input.
 *
 * Features:
 *   - Processes one-time autonomous tasks from Queued
 *   - Processes recurring tasks when their nextRun time has passed
 *   - Supports model selection (haiku, sonnet, opus)
 *   - Updates lastRun and nextRun for recurring tasks
 *
 * Usage:
 *   bun run background-processor.ts [--dry-run] [--task-id KT-001]
 *
 * Options:
 *   --dry-run     Show what would be processed without executing
 *   --task-id     Process a specific task by ID
 *   --max-tasks   Maximum tasks to process in one run (default: 3)
 *   --autonomous  Only process tasks marked as autonomous
 *
 * Setup:
 *   Add to crontab for scheduled processing (every 5 hours):
 *   0 0,5,10,15,20 * * * cd ~/.claude/skills/KaiTodo && bun run background-processor.ts --autonomous
 */

import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'bun';

const TODO_FILE = join(process.env.HOME || '', 'Documents/personal/Kai-Todo.md');
const LOG_FILE = join(process.env.HOME || '', '.claude/skills/KaiTodo/processor.log');
const CLAUDE_CLI = join(process.env.HOME || '', '.local/bin/claude');

interface RecurringConfig {
  interval: 'daily' | 'weekly' | 'custom';
  customDays?: number;
  runTime?: string;    // HH:mm format
  lastRun?: string;
  nextRun?: string;
}

type ClaudeModel = 'sonnet' | 'opus' | 'haiku';

interface Task {
  id: string;
  title: string;
  priority: string;
  added: string;
  skill?: string;
  notes?: string;
  autonomous?: boolean;
  recurring?: RecurringConfig;
  model?: ClaudeModel;
}

async function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(message);
  await appendFile(LOG_FILE, line).catch(() => {});
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function calculateNextRun(recurring: RecurringConfig, fromDate?: string): string {
  const base = fromDate ? new Date(fromDate) : new Date();
  let days = 1;

  switch (recurring.interval) {
    case 'daily':
      days = 1;
      break;
    case 'weekly':
      days = 7;
      break;
    case 'custom':
      days = recurring.customDays || 1;
      break;
  }

  base.setDate(base.getDate() + days);

  if (recurring.runTime) {
    const [hours, minutes] = recurring.runTime.split(':').map(Number);
    base.setHours(hours, minutes, 0, 0);
  }

  return formatDateTime(base);
}

function isTaskDue(task: Task): boolean {
  if (!task.recurring) return true; // Non-recurring tasks are always "due"
  if (!task.recurring.nextRun) return true; // No nextRun means it should run

  const nextRun = new Date(task.recurring.nextRun);
  const now = new Date();

  return now >= nextRun;
}

async function parseTasks(sectionName: string): Promise<Task[]> {
  if (!existsSync(TODO_FILE)) {
    return [];
  }

  const content = await readFile(TODO_FILE, 'utf-8');
  const tasks: Task[] = [];

  const sectionRegex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const sectionMatch = content.match(sectionRegex);
  if (!sectionMatch) return tasks;

  const taskRegex = /### \[([^\]]+)\] (.+)\n([\s\S]*?)(?=\n### |\n## |$)/g;
  let match;

  while ((match = taskRegex.exec(sectionMatch[1])) !== null) {
    const [, id, title, body] = match;

    const priorityMatch = body.match(/\*\*Priority\*\*:\s*(\w+)/);
    const addedMatch = body.match(/\*\*Added\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);
    const skillMatch = body.match(/\*\*Skill\*\*:\s*([^\n]+)/);
    const notesMatch = body.match(/\*\*Notes\*\*:\s*([^\n]+)/);
    const autonomousMatch = body.match(/\*\*Autonomous\*\*:\s*(true|yes)/i);
    const modelMatch = body.match(/\*\*Model\*\*:\s*(\w+)/);
    const recurringMatch = body.match(/\*\*Recurring\*\*:\s*(\w+)(?:\s*\((\d+)\s*days?\))?/);
    const runTimeMatch = body.match(/\*\*Run Time\*\*:\s*([\d:]+)/);
    const lastRunMatch = body.match(/\*\*Last Run\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);
    const nextRunMatch = body.match(/\*\*Next Run\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);

    // Parse recurring config
    let recurring: RecurringConfig | undefined;
    if (recurringMatch) {
      const interval = recurringMatch[1].toLowerCase() as 'daily' | 'weekly' | 'custom';
      recurring = {
        interval,
        customDays: interval === 'custom' && recurringMatch[2] ? parseInt(recurringMatch[2]) : undefined,
        runTime: runTimeMatch?.[1],
        lastRun: lastRunMatch?.[1],
        nextRun: nextRunMatch?.[1],
      };
    }

    // Parse model
    const modelValue = modelMatch?.[1]?.toLowerCase();
    const validModels = ['sonnet', 'opus', 'haiku'];
    const model = validModels.includes(modelValue || '') ? modelValue as ClaudeModel : undefined;

    tasks.push({
      id,
      title: title.trim(),
      priority: priorityMatch?.[1] || 'medium',
      added: addedMatch?.[1] || '',
      skill: skillMatch?.[1]?.trim(),
      notes: notesMatch?.[1]?.trim(),
      autonomous: !!autonomousMatch,
      recurring,
      model,
    });
  }

  return tasks;
}

async function moveTaskToInProgress(taskId: string): Promise<boolean> {
  let content = await readFile(TODO_FILE, 'utf-8');

  const taskRegex = new RegExp(`(### \\[${taskId}\\] .+\\n[\\s\\S]*?)(?=\\n### |\\n## |$)`);
  const match = content.match(taskRegex);

  if (!match) return false;

  const taskBlock = match[1];
  content = content.replace(taskRegex, '');
  content = content.replace(/## In Progress\n/, `## In Progress\n${taskBlock}\n`);
  content = content.replace(/\n{3,}/g, '\n\n');

  await writeFile(TODO_FILE, content);
  return true;
}

async function completeRecurringTask(taskId: string): Promise<boolean> {
  let content = await readFile(TODO_FILE, 'utf-8');

  const taskRegex = new RegExp(`(### \\[${taskId}\\] .+\\n[\\s\\S]*?)(?=\\n### |\\n## |$)`);
  const match = content.match(taskRegex);

  if (!match) return false;

  let taskBlock = match[1];
  const now = formatDateTime(new Date());

  // Parse existing recurring config to calculate next run
  const recurringMatch = taskBlock.match(/\*\*Recurring\*\*:\s*(\w+)(?:\s*\((\d+)\s*days?\))?/);
  const runTimeMatch = taskBlock.match(/\*\*Run Time\*\*:\s*([\d:]+)/);

  if (!recurringMatch) return false;

  const interval = recurringMatch[1].toLowerCase() as 'daily' | 'weekly' | 'custom';
  const recurring: RecurringConfig = {
    interval,
    customDays: interval === 'custom' && recurringMatch[2] ? parseInt(recurringMatch[2]) : undefined,
    runTime: runTimeMatch?.[1],
  };

  const nextRun = calculateNextRun(recurring, now);

  // Update Last Run
  if (taskBlock.includes('**Last Run**')) {
    taskBlock = taskBlock.replace(/\*\*Last Run\*\*:\s*[\d-]+(?:\s+[\d:]+)?/, `**Last Run**: ${now}`);
  } else {
    taskBlock = taskBlock.trimEnd() + `\n- **Last Run**: ${now}\n`;
  }

  // Update Next Run
  if (taskBlock.includes('**Next Run**')) {
    taskBlock = taskBlock.replace(/\*\*Next Run\*\*:\s*[\d-]+(?:\s+[\d:]+)?/, `**Next Run**: ${nextRun}`);
  } else {
    taskBlock = taskBlock.trimEnd() + `\n- **Next Run**: ${nextRun}\n`;
  }

  // Remove from current section and re-queue
  content = content.replace(taskRegex, '');
  content = content.replace(/## Queued\n/, `## Queued\n${taskBlock}\n`);
  content = content.replace(/\n{3,}/g, '\n\n');

  await writeFile(TODO_FILE, content);
  return true;
}

async function moveTaskToCompleted(taskId: string): Promise<boolean> {
  let content = await readFile(TODO_FILE, 'utf-8');

  const taskRegex = new RegExp(`(### \\[${taskId}\\] .+\\n[\\s\\S]*?)(?=\\n### |\\n## |$)`);
  const match = content.match(taskRegex);

  if (!match) return false;

  let taskBlock = match[1];
  const now = formatDateTime(new Date());

  if (!taskBlock.includes('**Completed**')) {
    taskBlock = taskBlock.trimEnd() + `\n- **Completed**: ${now}\n`;
  }

  content = content.replace(taskRegex, '');
  content = content.replace(/## Completed\n/, `## Completed\n${taskBlock}\n`);
  content = content.replace(/\n{3,}/g, '\n\n');

  await writeFile(TODO_FILE, content);
  return true;
}

async function processTask(task: Task): Promise<boolean> {
  await log(`Processing task: [${task.id}] ${task.title}${task.recurring ? ` (recurring: ${task.recurring.interval})` : ''}`);

  // Build the prompt
  let prompt = `You are processing a queued task from Kai's todo list.

Task ID: ${task.id}
Title: ${task.title}
Priority: ${task.priority}`;

  if (task.skill) {
    prompt += `\nRelevant Skill: ${task.skill}`;
  }
  if (task.notes) {
    prompt += `\nNotes: ${task.notes}`;
  }

  // Add Research-specific instructions
  if (task.skill?.toLowerCase() === 'research') {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 16).replace(':', '');
    const researchDir = join(process.env.HOME || '', 'Documents/personal/Research/');
    prompt += `\n\nIMPORTANT: You have WebSearch permission. Use it to gather current information.
Save your research report as a markdown file to: ${researchDir}
Use filename format: ${dateStr}_${timeStr}_${task.title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50)}.md
Include date, sources, and key findings in the report.`;
  }

  prompt += `\n\nPlease complete this task. When done, summarize what was accomplished.`;

  // Move to in progress
  await moveTaskToInProgress(task.id);

  try {
    // Build claude command with model if specified (use full path for cron)
    const claudeArgs = [CLAUDE_CLI, '-p', prompt, '--verbose', '--output-format', 'stream-json'];

    if (task.model) {
      claudeArgs.push('--model', task.model);
      await log(`  Using model: ${task.model}`);
    }

    // Grant web search and file write permissions for Research tasks
    if (task.skill?.toLowerCase() === 'research') {
      claudeArgs.push('--allowedTools', 'WebSearch,Write,Read,Bash(curl:*),mcp__MCP_DOCKER__obsidian_append_content,mcp__MCP_DOCKER__obsidian_get_file_contents');
      await log(`  Granted research permissions: WebSearch, Write, Obsidian tools`);
    }

    // Run Claude CLI
    const proc = spawn(claudeArgs, {
      cwd: process.env.HOME,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    let output = '';
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += decoder.decode(value, { stream: true });
    }

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      await log(`Task ${task.id} completed successfully`);

      // Handle recurring vs one-time completion
      if (task.recurring) {
        await completeRecurringTask(task.id);
        await log(`  Recurring task re-queued with updated nextRun`);
      } else {
        await moveTaskToCompleted(task.id);
      }
      return true;
    } else {
      await log(`Task ${task.id} failed with exit code ${exitCode}`);
      return false;
    }
  } catch (error) {
    await log(`Task ${task.id} error: ${error}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autonomousOnly = args.includes('--autonomous');

  const taskIdIndex = args.indexOf('--task-id');
  const specificTaskId = taskIdIndex !== -1 ? args[taskIdIndex + 1] : null;

  const maxTasksIndex = args.indexOf('--max-tasks');
  const maxTasks = maxTasksIndex !== -1 ? parseInt(args[maxTasksIndex + 1]) : 3;

  await log('='.repeat(50));
  await log('Kai Todo Background Processor starting');

  // Get tasks from both Queued and In Progress (recurring tasks may be in either)
  const queuedTasks = await parseTasks('Queued');
  const inProgressTasks = await parseTasks('In Progress');

  await log(`Found ${queuedTasks.length} queued tasks, ${inProgressTasks.length} in-progress tasks`);

  // Combine all tasks, filtering appropriately
  let tasksToProcess: Task[] = [];

  // From queued: get autonomous one-time tasks OR due recurring tasks
  for (const task of queuedTasks) {
    if (task.recurring) {
      // Recurring task: check if it's due
      if (task.autonomous && isTaskDue(task)) {
        tasksToProcess.push(task);
      }
    } else {
      // One-time task: include if autonomous
      if (task.autonomous) {
        tasksToProcess.push(task);
      }
    }
  }

  // From in-progress: check for recurring tasks that are due (they may have been left in progress)
  for (const task of inProgressTasks) {
    if (task.recurring && task.autonomous && isTaskDue(task)) {
      tasksToProcess.push(task);
    }
  }

  await log(`${tasksToProcess.length} eligible tasks found (autonomous and due)`);

  if (tasksToProcess.length === 0) {
    await log('No tasks to process');
    return;
  }

  // Filter for specific task if requested
  if (specificTaskId) {
    tasksToProcess = tasksToProcess.filter(t => t.id === specificTaskId);
    if (tasksToProcess.length === 0) {
      await log(`Task ${specificTaskId} not found or not eligible`);
      return;
    }
  }

  // Sort by priority, then by nextRun (earliest first for recurring)
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  tasksToProcess.sort((a, b) => {
    const priorityDiff = (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    if (priorityDiff !== 0) return priorityDiff;

    // For same priority, sort recurring tasks by nextRun (earliest first)
    if (a.recurring?.nextRun && b.recurring?.nextRun) {
      return new Date(a.recurring.nextRun).getTime() - new Date(b.recurring.nextRun).getTime();
    }
    return 0;
  });

  // Limit to max tasks
  tasksToProcess = tasksToProcess.slice(0, maxTasks);

  if (dryRun) {
    await log('DRY RUN - would process:');
    for (const task of tasksToProcess) {
      const recurring = task.recurring ? ` [${task.recurring.interval}, next: ${task.recurring.nextRun}]` : '';
      const model = task.model ? ` [model: ${task.model}]` : '';
      await log(`  [${task.id}] ${task.title} (${task.priority})${recurring}${model}`);
    }
    return;
  }

  // Process tasks
  let processed = 0;
  let succeeded = 0;

  for (const task of tasksToProcess) {
    const success = await processTask(task);
    processed++;
    if (success) succeeded++;
  }

  await log(`Completed: ${succeeded}/${processed} tasks processed successfully`);
}

main().catch(console.error);
