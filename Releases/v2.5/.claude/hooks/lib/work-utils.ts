/**
 * Work Utilities
 * Shared functions for working with WORK directories
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export type AlgorithmPhase = 'OBSERVE' | 'THINK' | 'PLAN' | 'BUILD' | 'EXECUTE' | 'VERIFY' | 'LEARN';

const CLAUDE_DIR = process.env.PAI_DIR || join(process.env.HOME || process.env.USERPROFILE || homedir(), '.claude');
const WORK_DIR = join(CLAUDE_DIR, 'MEMORY', 'WORK');

/**
 * Find the most recent active work directory
 */
export function findActiveWorkDir(): string | null {
  try {
    if (!existsSync(WORK_DIR)) return null;

    const entries = readdirSync(WORK_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'Signals')
      .map(d => ({ name: d.name, path: join(WORK_DIR, d.name) }))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (entries.length === 0) return null;

    // Return most recent that isn't completed
    for (const entry of entries) {
      // Check session META.yaml for status
      const metaPath = join(entry.path, 'META.yaml');
      if (existsSync(metaPath)) {
        const content = readFileSync(metaPath, 'utf-8');
        if (!content.includes('status: "COMPLETED"')) {
          return entry.path;
        }
      } else {
        // No META.yaml means session is likely active (new format)
        const tasksDir = join(entry.path, 'tasks');
        if (existsSync(tasksDir)) {
          return entry.path;
        }
      }
    }

    // Fallback to most recent
    return entries[0].path;
  } catch {
    return null;
  }
}
