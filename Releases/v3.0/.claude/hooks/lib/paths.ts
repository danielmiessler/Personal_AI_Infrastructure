/**
 * Centralized Path Resolution
 *
 * Handles environment variable expansion for portable PAI configuration.
 * Claude Code doesn't expand $HOME in settings.json env values, so we do it here.
 *
 * Usage:
 *   import { getPaiDir, getSettingsPath } from './lib/paths';
 *   const paiDir = getPaiDir(); // Always returns expanded absolute path
 */

import { homedir } from 'os';
import { join } from 'path';

/**
 * Expand shell-style variables in a path string.
 * Supports: ~, $VAR, ${VAR} (any env var, not just HOME).
 * Tilde is only expanded at the start of the string (matching shell behavior).
 */
export function expandPath(path: string): string {
  return path
    .replace(/^~(?=\/|$)/, homedir())
    .replace(/\$\{(\w+)\}/g, (_, v) => process.env[v] ?? '')
    .replace(/\$(\w+)/g, (_, v) => process.env[v] ?? '');
}

/**
 * Get the PAI directory (expanded)
 * Priority: PAI_DIR env var (expanded) → ~/.claude
 */
export function getPaiDir(): string {
  const envPaiDir = process.env.PAI_DIR;

  if (envPaiDir) {
    return expandPath(envPaiDir);
  }

  return join(homedir(), '.claude');
}

/**
 * Get the settings.json path
 */
export function getSettingsPath(): string {
  return join(getPaiDir(), 'settings.json');
}

/**
 * Get a path relative to PAI_DIR
 */
export function paiPath(...segments: string[]): string {
  return join(getPaiDir(), ...segments);
}

/**
 * Get the hooks directory
 */
export function getHooksDir(): string {
  return paiPath('hooks');
}

/**
 * Get the skills directory
 */
export function getSkillsDir(): string {
  return paiPath('skills');
}

/**
 * Get the MEMORY directory
 */
export function getMemoryDir(): string {
  return paiPath('MEMORY');
}
