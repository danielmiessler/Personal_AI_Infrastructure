#!/usr/bin/env bun
/**
 * Today.ts - Generate daily review/todo list
 *
 * Usage:
 *   bun run Today.ts                    # Generate today.md
 *   bun run Today.ts --output stdout    # Print to stdout
 */

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parseArgs } from 'util';

// Types
export interface ProjectItem {
  name: string;
  description?: string;
}

export interface PlanItem {
  name: string;
  path: string;
  modified: Date;
}

export interface FutureIdea {
  title: string;
  priority: string;
  added?: string;
}

/**
 * Extract projects from Telos PROJECTS section
 */
export function extractProjects(telosContent: string): ProjectItem[] {
  const projects: ProjectItem[] = [];

  // Find PROJECTS section
  const projectsMatch = telosContent.match(/## PROJECTS\s*([\s\S]*?)(?=\n## |$)/i);
  if (!projectsMatch) return projects;

  const projectsSection = projectsMatch[1];

  // Extract top-level bullet points with bold names
  // Match lines starting with - ** at the beginning (not indented)
  const lines = projectsSection.split('\n');
  for (const line of lines) {
    // Only match non-indented bullet points with bold text
    const match = line.match(/^[-*]\s+\*\*(.+?)\*\*:?\s*(.*)/);
    if (match) {
      projects.push({
        name: match[1],
        description: match[2] || undefined,
      });
    }
  }

  return projects;
}

/**
 * Extract goals with G prefix from Telos
 */
export function extractGoals(telosContent: string): string[] {
  const goals: string[] = [];

  // Find GOALS section
  const goalsMatch = telosContent.match(/## GOALS\s*([\s\S]*?)(?=\n## |$)/i);
  if (!goalsMatch) return goals;

  const goalsSection = goalsMatch[1];

  // Extract G1, G2, etc.
  const lines = goalsSection.split('\n');
  for (const line of lines) {
    const match = line.match(/^[-*]\s+\*\*G\d+\*\*:?\s*(.*)/);
    if (match) {
      goals.push(match[1]);
    }
  }

  return goals;
}

/**
 * Extract challenges with C prefix from Telos
 */
export function extractChallenges(telosContent: string): string[] {
  const challenges: string[] = [];

  // Find CHALLENGES section
  const challengesMatch = telosContent.match(/## CHALLENGES\s*([\s\S]*?)(?=\n## |$)/i);
  if (!challengesMatch) return challenges;

  const challengesSection = challengesMatch[1];

  // Extract C1, C2, etc.
  const lines = challengesSection.split('\n');
  for (const line of lines) {
    const match = line.match(/^[-*]\s+\*\*C\d+\*\*:?\s*(.*)/);
    if (match) {
      challenges.push(match[1]);
    }
  }

  return challenges;
}

/**
 * Get plans modified within last 7 days
 */
export function getActivePlans(paiDir: string): PlanItem[] {
  const plansDir = join(paiDir, 'plans');
  if (!existsSync(plansDir)) return [];

  const plans: PlanItem[] = [];

  try {
    const files = readdirSync(plansDir);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const fullPath = join(plansDir, file);
      const stat = statSync(fullPath);

      // Only include plans modified in last 7 days
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (stat.mtime.getTime() > weekAgo) {
        plans.push({
          name: file.replace('.md', ''),
          path: fullPath,
          modified: stat.mtime,
        });
      }
    }
  } catch {
    // Ignore errors
  }

  // Sort by most recently modified
  plans.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  return plans.slice(0, 5); // Top 5 recent plans
}

/**
 * Get future ideas from docs/future-ideas.md
 */
export function getFutureIdeas(paiDir: string): FutureIdea[] {
  const ideasPath = join(paiDir, 'docs', 'future-ideas.md');
  if (!existsSync(ideasPath)) return [];

  const ideas: FutureIdea[] = [];

  try {
    const content = readFileSync(ideasPath, 'utf-8');

    // Extract sections (## Title)
    const sections = content.split(/\n## /).slice(1);
    for (const section of sections) {
      const lines = section.split('\n');
      const title = lines[0].trim();

      // Look for priority and added date
      let priority = 'Medium';
      let added: string | undefined;

      for (const line of lines) {
        if (line.includes('**Priority:**')) {
          priority = line.replace('**Priority:**', '').trim();
        }
        if (line.includes('**Added:**')) {
          added = line.replace('**Added:**', '').trim();
        }
      }

      if (title && !title.toLowerCase().includes('future ideas')) {
        ideas.push({ title, priority, added });
      }
    }
  } catch {
    // Ignore errors
  }

  return ideas;
}

/**
 * Get formatted date string
 */
function getFormattedDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate today.md content
 */
export function generateTodayContent(paiDir: string): string {
  const sections: string[] = [];

  // Header
  sections.push(`# Today - ${getFormattedDate()}`);
  sections.push('');

  // Load Telos
  const telosPath = join(paiDir, 'skills', 'CORE', 'Telos.md');
  let projects: ProjectItem[] = [];
  let goals: string[] = [];
  let challenges: string[] = [];

  if (existsSync(telosPath)) {
    const telosContent = readFileSync(telosPath, 'utf-8');
    projects = extractProjects(telosContent);
    goals = extractGoals(telosContent);
    challenges = extractChallenges(telosContent);
  }

  // Active Projects
  if (projects.length > 0) {
    sections.push('## Active Projects');
    sections.push('');
    for (const project of projects) {
      sections.push(`- [ ] **${project.name}**`);
    }
    sections.push('');
  }

  // Recent Plans
  const plans = getActivePlans(paiDir);
  if (plans.length > 0) {
    sections.push('## In Progress (Recent Plans)');
    sections.push('');
    for (const plan of plans) {
      const daysAgo = Math.floor((Date.now() - plan.modified.getTime()) / (24 * 60 * 60 * 1000));
      const ago = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      sections.push(`- [ ] ${plan.name} *(modified ${ago})*`);
    }
    sections.push('');
  }

  // Goals
  if (goals.length > 0) {
    sections.push('## Goals');
    sections.push('');
    for (const goal of goals.slice(0, 3)) {
      sections.push(`- ${goal}`);
    }
    sections.push('');
  }

  // Challenges
  if (challenges.length > 0) {
    sections.push('## Challenges');
    sections.push('');
    for (const challenge of challenges.slice(0, 3)) {
      sections.push(`- ${challenge}`);
    }
    sections.push('');
  }

  // Future Ideas
  const ideas = getFutureIdeas(paiDir);
  if (ideas.length > 0) {
    sections.push('## Backlog');
    sections.push('');
    for (const idea of ideas.slice(0, 5)) {
      sections.push(`- ${idea.title} *(${idea.priority})*`);
    }
    sections.push('');
  }

  // Footer
  sections.push('---');
  sections.push('');
  sections.push('*Generated by DailyReview skill. Run `/today` to refresh.*');

  return sections.join('\n');
}

/**
 * Log run to history
 */
function logRun(paiDir: string): void {
  const logPath = join(paiDir, 'history', 'daily-review.jsonl');

  const entry = {
    timestamp: new Date().toISOString(),
    command: 'today',
    success: true,
  };

  try {
    appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch {
    // Ignore logging errors
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: 'string', short: 'o', default: 'file' },
    },
  });

  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const content = generateTodayContent(paiDir);

  if (values.output === 'stdout') {
    console.log(content);
  } else {
    const outputPath = join(paiDir, 'today.md');
    writeFileSync(outputPath, content);
    console.log(`Generated: ${outputPath}`);
  }

  logRun(paiDir);
}

// Run if executed directly
if (import.meta.main) {
  main();
}
