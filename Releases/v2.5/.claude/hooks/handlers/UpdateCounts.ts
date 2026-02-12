/**
 * UpdateCounts.ts - Update settings.json with fresh system counts
 *
 * PURPOSE:
 * Updates the counts section of settings.json at the end of each session.
 * Banner and statusline then read from settings.json (instant, no execution).
 *
 * ARCHITECTURE:
 * Stop hook → UpdateCounts → settings.json
 * Session start → Banner reads settings.json (instant)
 * Session start → Statusline reads settings.json (instant)
 *
 * COUNTING METHODOLOGY:
 * - Skills: Directories in skills/ that contain a SKILL.md file
 * - Workflows: .md files in any Workflows/ directory (recursive)
 * - Hooks: .ts files directly in hooks/ (depth 1)
 * - Signals: .md files in MEMORY/LEARNING/ (recursive) - learning documents
 * - Files: All files in skills/PAI/USER/ (recursive)
 * - Work: Directories in MEMORY/WORK/ (depth 1) - work projects
 * - Research: .md and .json files in MEMORY/RESEARCH/ (recursive)
 * - Ratings: Lines in ratings.jsonl (rating entries)
 *
 * This design ensures:
 * - No spawning/execution at session start
 * - Counts are always available (no waiting)
 * - Single source of truth in settings.json
 * - No dependency on external tools like fd
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { getPaiDir, getSettingsPath } from '../lib/paths';

interface Counts {
  skills: number;
  workflows: number;
  hooks: number;
  signals: number;
  files: number;
  work: number;
  research: number;
  ratings: number;
  updatedAt: string;
}

/**
 * Count files matching criteria recursively
 */
function countFilesRecursive(dir: string, extension?: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countFilesRecursive(fullPath, extension);
      } else if (entry.isFile()) {
        if (!extension || entry.name.endsWith(extension)) {
          count++;
        }
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }
  return count;
}

/**
 * Count .md files inside any Workflows directory
 */
function countWorkflowFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === 'workflows') {
          count += countFilesRecursive(fullPath, '.md');
        } else {
          count += countWorkflowFiles(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }
  return count;
}

/**
 * Count skills (directories with SKILL.md file)
 */
function countSkills(paiDir: string): number {
  let count = 0;
  const skillsDir = join(paiDir, 'skills');
  try {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillFile = join(skillsDir, entry.name, 'SKILL.md');
        if (existsSync(skillFile)) {
          count++;
        }
      }
    }
  } catch {
    // skills directory doesn't exist
  }
  return count;
}

/**
 * Count hooks (.ts files in hooks/ at depth 1)
 */
function countHooks(paiDir: string): number {
  let count = 0;
  const hooksDir = join(paiDir, 'hooks');
  try {
    for (const entry of readdirSync(hooksDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.ts')) {
        count++;
      }
    }
  } catch {
    // hooks directory doesn't exist
  }
  return count;
}

/**
 * Count non-empty lines in a JSONL file (ratings = rating entries)
 */
function countRatingsLines(filePath: string): number {
  try {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return 0;
    return readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).length;
  } catch {
    return 0;
  }
}

/**
 * Count directories at depth 1 (work projects)
 */
function countWorkDirs(paiDir: string): number {
  let count = 0;
  const workDir = join(paiDir, 'MEMORY/WORK');
  try {
    for (const entry of readdirSync(workDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        count++;
      }
    }
  } catch {
    // MEMORY/WORK doesn't exist
  }
  return count;
}

/**
 * Count .md and .json files in MEMORY/RESEARCH (research documents)
 */
function countResearchFiles(paiDir: string): number {
  const researchDir = join(paiDir, 'MEMORY/RESEARCH');
  return countFilesRecursive(researchDir, '.md') + countFilesRecursive(researchDir, '.json');
}

/**
 * Get all counts
 */
function getCounts(paiDir: string): Counts {
  return {
    skills: countSkills(paiDir),
    workflows: countWorkflowFiles(join(paiDir, 'skills')),
    hooks: countHooks(paiDir),
    signals: countFilesRecursive(join(paiDir, 'MEMORY/LEARNING'), '.md'),
    files: countFilesRecursive(join(paiDir, 'skills/PAI/USER')),
    work: countWorkDirs(paiDir),
    research: countResearchFiles(paiDir),
    ratings: countRatingsLines(join(paiDir, 'MEMORY/LEARNING/SIGNALS/ratings.jsonl')),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Handler called by StopOrchestrator
 */
export async function handleUpdateCounts(): Promise<void> {
  const paiDir = getPaiDir();
  const settingsPath = getSettingsPath();

  try {
    // Get fresh counts
    const counts = getCounts(paiDir);

    // Read current settings
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    // Update counts section
    settings.counts = counts;

    // Write back
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

    // Updated settings.json with fresh counts
  } catch (error) {
    // Failed to update counts - non-fatal
    // Non-fatal - don't throw, let other handlers continue
  }
}

// Allow running standalone to seed initial counts
if (import.meta.main) {
  handleUpdateCounts().then(() => process.exit(0));
}
