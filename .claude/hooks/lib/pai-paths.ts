/**
 * PAI Path Resolution - Single Source of Truth
 *
 * This module provides consistent path resolution across all PAI hooks.
 * It handles PAI_DIR detection whether set explicitly or defaulting to ~/.claude
 *
 * Usage in hooks:
 *   import { PAI_DIR, HOOKS_DIR, SKILLS_DIR } from './lib/pai-paths';
 */

import { homedir } from 'os';
import { resolve, join } from 'path';
import { existsSync } from 'fs';

/**
 * Smart PAI_DIR detection with fallback
 * Priority:
 * 1. PAI_DIR environment variable (if set)
 * 2. ~/.claude (standard location)
 */
export const PAI_DIR = process.env.PAI_DIR
  ? resolve(process.env.PAI_DIR)
  : resolve(homedir(), '.claude');

/**
 * Common PAI directories
 */
export const HOOKS_DIR = join(PAI_DIR, 'hooks');
export const SKILLS_DIR = join(PAI_DIR, 'skills');
export const AGENTS_DIR = join(PAI_DIR, 'agents');
export const HISTORY_DIR = join(PAI_DIR, 'history');
export const COMMANDS_DIR = join(PAI_DIR, 'commands');

/**
 * Validate PAI directory structure on first import
 * This fails fast with a clear error if PAI is misconfigured
 */
function validatePAIStructure(): void {
  if (!existsSync(PAI_DIR)) {
    console.error(`❌ PAI_DIR does not exist: ${PAI_DIR}`);
    console.error(`   Expected ~/.claude or set PAI_DIR environment variable`);
    process.exit(1);
  }

  if (!existsSync(HOOKS_DIR)) {
    console.error(`❌ PAI hooks directory not found: ${HOOKS_DIR}`);
    console.error(`   Your PAI_DIR may be misconfigured`);
    console.error(`   Current PAI_DIR: ${PAI_DIR}`);
    process.exit(1);
  }
}

// Run validation on module import
// This ensures any hook that imports this module will fail fast if paths are wrong
validatePAIStructure();

/**
 * Helper to get history file path with date-based organization
 */
export function getHistoryFilePath(subdir: string, filename: string): string {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: process.env.TIME_ZONE || 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');

  return join(HISTORY_DIR, subdir, `${year}-${month}`, filename);
}
