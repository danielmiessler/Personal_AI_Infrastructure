/**
 * Input validators for setup wizard
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { dirname } from 'path';

/**
 * Expand ~ to home directory
 * Uses USERPROFILE on Windows, HOME on Unix
 */
export function expandPath(path: string): string {
  const home = process.platform === 'win32'
    ? (process.env.USERPROFILE || homedir())
    : homedir();

  if (path.startsWith('~/')) {
    return path.replace('~', home);
  }
  if (path === '~') {
    return home;
  }
  return path;
}

/**
 * Validate PAI directory path
 */
export function validatePath(path: string): string | undefined {
  if (!path || path.trim() === '') {
    return 'Path is required';
  }

  const expanded = expandPath(path.trim());
  const parent = dirname(expanded);

  // Check parent directory exists (we'll create the target)
  if (!existsSync(parent)) {
    return `Parent directory does not exist: ${parent}`;
  }

  return undefined; // Valid
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | undefined {
  if (!email || email.trim() === '') {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Invalid email format';
  }

  return undefined; // Valid
}

/**
 * Validate name (non-empty)
 */
export function validateName(name: string): string | undefined {
  if (!name || name.trim() === '') {
    return 'Name is required';
  }

  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }

  return undefined; // Valid
}

/**
 * Validate assistant name
 */
export function validateAssistantName(name: string): string | undefined {
  if (!name || name.trim() === '') {
    return 'Assistant name is required';
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name.trim())) {
    return 'Assistant name must start with a letter and contain only letters, numbers, underscores, or hyphens';
  }

  return undefined; // Valid
}
