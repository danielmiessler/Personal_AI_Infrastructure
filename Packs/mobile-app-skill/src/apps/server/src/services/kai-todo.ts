import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const TODO_FILE = join(process.env.HOME || '', 'Documents/personal/Kai-Todo.md');

export interface RecurringConfig {
  interval: 'daily' | 'weekly' | 'custom';
  customDays?: number;
  runTime?: string;    // HH:mm format - time of day to run
  lastRun?: string;
  nextRun?: string;
}

export type ClaudeModel = 'sonnet' | 'opus' | 'haiku';

export interface KaiTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  added: string;
  skill?: string;
  notes?: string;
  autonomous?: boolean;
  recurring?: RecurringConfig;
  model?: ClaudeModel;
  status: 'queued' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
}

export class KaiTodoService {
  private async readFile(): Promise<string> {
    if (!existsSync(TODO_FILE)) {
      return '';
    }
    return await readFile(TODO_FILE, 'utf-8');
  }

  private async writeFile(content: string): Promise<void> {
    await writeFile(TODO_FILE, content, 'utf-8');
  }

  private parseSection(content: string, sectionName: string): KaiTask[] {
    const tasks: KaiTask[] = [];
    const sectionRegex = new RegExp(`## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const sectionMatch = content.match(sectionRegex);

    if (!sectionMatch) return tasks;

    const sectionContent = sectionMatch[1];
    const taskRegex = /### \[([^\]]+)\] (.+)\n([\s\S]*?)(?=\n### |\n## |$)/g;
    let match;

    while ((match = taskRegex.exec(sectionContent)) !== null) {
      const [, id, title, body] = match;

      const priorityMatch = body.match(/\*\*Priority\*\*:\s*(\w+)/);
      const addedMatch = body.match(/\*\*Added\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);
      const skillMatch = body.match(/\*\*Skill\*\*:\s*([^\n]+)/);
      const notesMatch = body.match(/\*\*Notes\*\*:\s*([^\n]+)/);
      const autonomousMatch = body.match(/\*\*Autonomous\*\*:\s*(\w+)/);
      const modelMatch = body.match(/\*\*Model\*\*:\s*(\w+)/);
      const recurringMatch = body.match(/\*\*Recurring\*\*:\s*(\w+)(?:\s*\((\d+)\s*days?\))?/);
      const runTimeMatch = body.match(/\*\*Run Time\*\*:\s*([\d:]+)/);
      const lastRunMatch = body.match(/\*\*Last Run\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);
      const nextRunMatch = body.match(/\*\*Next Run\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);
      const startedMatch = body.match(/\*\*Started\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);
      const completedMatch = body.match(/\*\*Completed\*\*:\s*([\d-]+(?:\s+[\d:]+)?)/);

      const status = sectionName === 'Queued' ? 'queued' :
                     sectionName === 'In Progress' ? 'in_progress' : 'completed';

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

      // Parse model - validate it's a known model
      const modelValue = modelMatch?.[1]?.toLowerCase();
      const validModels = ['sonnet', 'opus', 'haiku'];
      const model = validModels.includes(modelValue || '') ? modelValue as ClaudeModel : undefined;

      tasks.push({
        id,
        title: title.trim(),
        priority: (priorityMatch?.[1] || 'medium') as 'high' | 'medium' | 'low',
        added: addedMatch?.[1] || '',
        skill: skillMatch?.[1]?.trim(),
        notes: notesMatch?.[1]?.trim(),
        autonomous: autonomousMatch?.[1]?.toLowerCase() === 'true',
        recurring,
        model,
        status,
        startedAt: startedMatch?.[1],
        completedAt: completedMatch?.[1],
      });
    }

    return tasks;
  }

  async getTasks(): Promise<{ queued: KaiTask[]; inProgress: KaiTask[]; completed: KaiTask[] }> {
    const content = await this.readFile();

    return {
      queued: this.parseSection(content, 'Queued'),
      inProgress: this.parseSection(content, 'In Progress'),
      completed: this.parseSection(content, 'Completed'),
    };
  }

  async addTask(title: string, options: { priority?: string; skill?: string; notes?: string; autonomous?: boolean; recurring?: RecurringConfig; model?: ClaudeModel } = {}): Promise<KaiTask> {
    const content = await this.readFile();
    const { queued } = await this.getTasks();

    // Generate next ID
    const existingIds = queued.map(t => parseInt(t.id.replace('KT-', '')) || 0);
    const nextNum = Math.max(0, ...existingIds) + 1;
    const id = `KT-${String(nextNum).padStart(3, '0')}`;

    const now = this.formatDateTime(new Date());
    const priority = options.priority || 'medium';

    // Build recurring string
    let recurringStr = '';
    if (options.recurring) {
      const intervalStr = options.recurring.interval === 'custom'
        ? `custom (${options.recurring.customDays} days)`
        : options.recurring.interval;
      recurringStr = `\n- **Recurring**: ${intervalStr}`;

      // Add run time if specified
      if (options.recurring.runTime) {
        recurringStr += `\n- **Run Time**: ${options.recurring.runTime}`;
      }

      // Calculate next run date
      const nextRun = this.calculateNextRun(options.recurring);
      if (nextRun) {
        recurringStr += `\n- **Next Run**: ${nextRun}`;
      }
    }

    const taskBlock = `
### [${id}] ${title}
- **Added**: ${now}
- **Priority**: ${priority}${options.skill ? `\n- **Skill**: ${options.skill}` : ''}${options.autonomous ? `\n- **Autonomous**: true` : ''}${options.model ? `\n- **Model**: ${options.model}` : ''}${recurringStr}${options.notes ? `\n- **Notes**: ${options.notes}` : ''}
`;

    // Insert after "## Queued" line
    const updatedContent = content.replace(
      /## Queued\n/,
      `## Queued\n${taskBlock}`
    );

    await this.writeFile(updatedContent);

    return {
      id,
      title,
      priority: priority as 'high' | 'medium' | 'low',
      added: now,
      skill: options.skill,
      notes: options.notes,
      autonomous: options.autonomous,
      recurring: options.recurring,
      model: options.model,
      status: 'queued',
    };
  }

  private formatDateTime(date: Date): string {
    // Format: YYYY-MM-DD HH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  private calculateNextRun(recurring: RecurringConfig, fromDate?: string): string {
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

    // Apply specific run time if set
    if (recurring.runTime) {
      const [hours, minutes] = recurring.runTime.split(':').map(Number);
      base.setHours(hours, minutes, 0, 0);
    }

    return this.formatDateTime(base);
  }

  async updateTaskStatus(id: string, newStatus: 'queued' | 'in_progress' | 'completed'): Promise<boolean> {
    let content = await this.readFile();
    const allTasks = await this.getTasks();
    const allTasksList = [...allTasks.queued, ...allTasks.inProgress, ...allTasks.completed];
    const task = allTasksList.find(t => t.id === id);

    // Find the task in any section
    const taskRegex = new RegExp(`(### \\[${id}\\] .+\\n[\\s\\S]*?)(?=\\n### |\\n## |$)`);
    const match = content.match(taskRegex);

    if (!match) return false;

    let taskBlock = match[1];
    const now = this.formatDateTime(new Date());

    // Handle recurring task completion
    if (newStatus === 'completed' && task?.recurring) {
      // Update Last Run
      if (taskBlock.includes('**Last Run**')) {
        taskBlock = taskBlock.replace(/\*\*Last Run\*\*:\s*[\d-]+(?:\s+[\d:]+)?/, `**Last Run**: ${now}`);
      } else {
        taskBlock = taskBlock.trimEnd() + `\n- **Last Run**: ${now}\n`;
      }

      // Update Next Run
      const nextRun = this.calculateNextRun(task.recurring, now);
      if (taskBlock.includes('**Next Run**')) {
        taskBlock = taskBlock.replace(/\*\*Next Run\*\*:\s*[\d-]+(?:\s+[\d:]+)?/, `**Next Run**: ${nextRun}`);
      } else {
        taskBlock = taskBlock.trimEnd() + `\n- **Next Run**: ${nextRun}\n`;
      }

      // Remove from current section
      content = content.replace(taskRegex, '');

      // Re-queue the recurring task instead of completing it
      content = content.replace(
        /## Queued\n/,
        `## Queued\n${taskBlock}\n`
      );
    } else {
      // Add Started timestamp when moving to in_progress
      if (newStatus === 'in_progress') {
        if (taskBlock.includes('**Started**')) {
          taskBlock = taskBlock.replace(/\*\*Started\*\*:\s*[\d-]+(?:\s+[\d:]+)?/, `**Started**: ${now}`);
        } else {
          taskBlock = taskBlock.trimEnd() + `\n- **Started**: ${now}\n`;
        }
      }

      // Standard non-recurring completion
      if (newStatus === 'completed' && !taskBlock.includes('**Completed**')) {
        taskBlock = taskBlock.trimEnd() + `\n- **Completed**: ${now}\n`;
      }

      // Remove from current section
      content = content.replace(taskRegex, '');

      // Add to new section
      const sectionName = newStatus === 'queued' ? 'Queued' :
                          newStatus === 'in_progress' ? 'In Progress' : 'Completed';

      content = content.replace(
        new RegExp(`## ${sectionName}\\n`),
        `## ${sectionName}\n${taskBlock}\n`
      );
    }

    // Clean up extra newlines
    content = content.replace(/\n{3,}/g, '\n\n');

    await this.writeFile(content);
    return true;
  }

  async deleteTask(id: string): Promise<boolean> {
    let content = await this.readFile();

    const taskRegex = new RegExp(`### \\[${id}\\] .+\\n[\\s\\S]*?(?=\\n### |\\n## |$)`);

    if (!taskRegex.test(content)) return false;

    content = content.replace(taskRegex, '');
    content = content.replace(/\n{3,}/g, '\n\n');

    await this.writeFile(content);
    return true;
  }

  async updateTask(id: string, updates: {
    title?: string;
    priority?: string;
    skill?: string;
    notes?: string;
    autonomous?: boolean;
    recurring?: RecurringConfig;
    model?: ClaudeModel;
  }): Promise<boolean> {
    let content = await this.readFile();
    const allTasks = await this.getTasks();
    const allTasksList = [...allTasks.queued, ...allTasks.inProgress, ...allTasks.completed];
    const task = allTasksList.find(t => t.id === id);

    if (!task) return false;

    // Build the updated task block
    const title = updates.title ?? task.title;
    const priority = updates.priority ?? task.priority;
    const skill = updates.skill !== undefined ? updates.skill : task.skill;
    const notes = updates.notes !== undefined ? updates.notes : task.notes;
    const autonomous = updates.autonomous !== undefined ? updates.autonomous : task.autonomous;
    const recurring = updates.recurring !== undefined ? updates.recurring : task.recurring;
    const model = updates.model !== undefined ? updates.model : task.model;

    // Build recurring string
    let recurringStr = '';
    if (recurring) {
      const intervalStr = recurring.interval === 'custom'
        ? `custom (${recurring.customDays} days)`
        : recurring.interval;
      recurringStr = `\n- **Recurring**: ${intervalStr}`;

      if (recurring.runTime) {
        recurringStr += `\n- **Run Time**: ${recurring.runTime}`;
      }

      // Preserve or calculate next run
      const nextRun = recurring.nextRun || this.calculateNextRun(recurring);
      if (nextRun) {
        recurringStr += `\n- **Next Run**: ${nextRun}`;
      }

      if (recurring.lastRun) {
        recurringStr += `\n- **Last Run**: ${recurring.lastRun}`;
      }
    }

    const newTaskBlock = `### [${id}] ${title}
- **Added**: ${task.added}
- **Priority**: ${priority}${skill ? `\n- **Skill**: ${skill}` : ''}${autonomous ? `\n- **Autonomous**: true` : ''}${model ? `\n- **Model**: ${model}` : ''}${recurringStr}${notes ? `\n- **Notes**: ${notes}` : ''}${task.startedAt ? `\n- **Started**: ${task.startedAt}` : ''}${task.completedAt ? `\n- **Completed**: ${task.completedAt}` : ''}
`;

    // Replace the old task block with the new one
    const taskRegex = new RegExp(`### \\[${id}\\] .+\\n[\\s\\S]*?(?=\\n### |\\n## |$)`);
    content = content.replace(taskRegex, newTaskBlock);

    // Clean up extra newlines
    content = content.replace(/\n{3,}/g, '\n\n');

    await this.writeFile(content);
    return true;
  }
}

export const kaiTodoService = new KaiTodoService();
