/**
 * 17-settings-integrity.test.ts — Settings.json Integrity Tests (Cross-Platform)
 *
 * Validates the TEMPLATE settings.json (at Releases/v3.0/.claude/settings.json)
 * is internally consistent with the filesystem:
 *   - settings.json exists and is valid JSON
 *   - Every hook command references a file that exists in hooks/
 *   - Every .hook.ts file in hooks/ is referenced by at least one hook command
 *   - Hook commands use ${PAI_DIR} variable (no hardcoded absolute paths)
 *   - statusLine command references an existing file
 *   - contextFiles entries correspond to real files in the tree
 *   - Required config sections (env, daidentity, principal, pai) are present
 *
 * This is a structural integrity test — it catches drift between settings.json
 * and the actual filesystem without running any hooks or installer logic.
 *
 * Run: bun test tests/cross-platform/17-settings-integrity.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { V3_ROOT, HOOKS_DIR, ALL_HOOKS, SLOW_TIMEOUT } from '../windows/helpers';
import { readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// ─── Load settings.json once ─────────────────────────────────────────────────

const SETTINGS_PATH = join(V3_ROOT, 'settings.json');
let settings: Record<string, any> | null = null;
let settingsParseError: string | null = null;

try {
  const raw = readFileSync(SETTINGS_PATH, 'utf-8');
  settings = JSON.parse(raw);
} catch (err: any) {
  settingsParseError = err.message || String(err);
}

/**
 * Extract all hook command strings from the settings.json hooks section.
 * Walks the nested hooks structure: hooks -> EventName -> [{ hooks: [{ command }] }]
 */
function extractHookCommands(settingsObj: Record<string, any>): string[] {
  const commands: string[] = [];
  const hooks = settingsObj.hooks;
  if (!hooks || typeof hooks !== 'object') return commands;

  for (const eventName of Object.keys(hooks)) {
    const eventEntries = hooks[eventName];
    if (!Array.isArray(eventEntries)) continue;

    for (const entry of eventEntries) {
      // Entry can have a direct hooks array or matcher + hooks
      const hooksList = entry.hooks;
      if (!Array.isArray(hooksList)) continue;

      for (const hook of hooksList) {
        if (hook.command && typeof hook.command === 'string') {
          commands.push(hook.command);
        }
      }
    }
  }

  return commands;
}

/**
 * Extract the filename from a hook command like "${PAI_DIR}/hooks/Foo.hook.ts"
 * Returns just the basename: "Foo.hook.ts"
 */
function extractHookFilename(command: string): string | null {
  // Match patterns like ${PAI_DIR}/hooks/Something.hook.ts or $PAI_DIR/hooks/Something.hook.ts
  const match = command.match(/hooks\/([A-Za-z0-9_-]+\.hook\.ts)/);
  return match ? match[1] : null;
}

// ─── Section 1: settings.json Exists and Parses ──────────────────────────────

describe('Settings Integrity — File Validity', () => {
  test('settings.json exists and is valid JSON', () => {
    expect(existsSync(SETTINGS_PATH)).toBe(true);
    expect(settingsParseError).toBeNull();
    expect(settings).not.toBeNull();
    expect(typeof settings).toBe('object');
  });
});

// ─── Section 2: Hook Commands Reference Existing Files ───────────────────────

describe('Settings Integrity — Hook File References', () => {
  test('every hook command references an existing file in hooks/', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const commands = extractHookCommands(settings);
    expect(commands.length).toBeGreaterThan(0);

    const missingFiles: string[] = [];

    for (const cmd of commands) {
      const filename = extractHookFilename(cmd);
      if (!filename) continue; // Non-hook commands (e.g., statusline)

      const fullPath = join(HOOKS_DIR, filename);
      if (!existsSync(fullPath)) {
        missingFiles.push(`${filename} (from command: ${cmd})`);
      }
    }

    if (missingFiles.length > 0) {
      console.error('Missing hook files:', missingFiles);
    }
    expect(missingFiles.length).toBe(0);
  });
});

// ─── Section 3: Every .hook.ts File Is Referenced ────────────────────────────

describe('Settings Integrity — Hook File Coverage', () => {
  test('every .hook.ts file in hooks/ is referenced in at least one hook command', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const commands = extractHookCommands(settings);
    const referencedFilenames = new Set<string>();

    for (const cmd of commands) {
      const filename = extractHookFilename(cmd);
      if (filename) referencedFilenames.add(filename);
    }

    const unreferenced: string[] = [];

    for (const hookFile of ALL_HOOKS) {
      if (!referencedFilenames.has(hookFile)) {
        unreferenced.push(hookFile);
      }
    }

    if (unreferenced.length > 0) {
      console.error('Hook files not referenced in settings.json:', unreferenced);
    }
    expect(unreferenced.length).toBe(0);
  });
});

// ─── Section 4: Hook Commands Use ${PAI_DIR} Variable ────────────────────────

describe('Settings Integrity — Hook Command Patterns', () => {
  test('hook commands use ${PAI_DIR} variable, no hardcoded absolute paths', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const commands = extractHookCommands(settings);
    expect(commands.length).toBeGreaterThan(0);

    const hardcodedPaths: string[] = [];

    for (const cmd of commands) {
      // Check for hardcoded absolute Unix paths
      if (/^\/[a-z]/.test(cmd) && !cmd.includes('${PAI_DIR}') && !cmd.includes('$PAI_DIR')) {
        hardcodedPaths.push(cmd);
      }
      // Check for hardcoded Windows paths
      if (/^[A-Z]:\\/.test(cmd)) {
        hardcodedPaths.push(cmd);
      }
    }

    if (hardcodedPaths.length > 0) {
      console.error('Hook commands with hardcoded paths:', hardcodedPaths);
    }
    expect(hardcodedPaths.length).toBe(0);
  });
});

// ─── Section 5: statusLine Command References Existing File ──────────────────

describe('Settings Integrity — StatusLine', () => {
  test('statusLine command references an existing file', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const statusLine = settings.statusLine;
    expect(statusLine).toBeDefined();
    expect(statusLine.command).toBeDefined();
    expect(typeof statusLine.command).toBe('string');

    // Extract the filename from the command (e.g., "$PAI_DIR/statusline-command.sh")
    const command: string = statusLine.command;
    const filenameMatch = command.match(/\/([A-Za-z0-9_.-]+)$/);
    expect(filenameMatch).not.toBeNull();

    if (filenameMatch) {
      const filename = filenameMatch[1];
      const fullPath = join(V3_ROOT, filename);
      expect(existsSync(fullPath)).toBe(true);
    }
  });
});

// ─── Section 6: contextFiles Entries Exist ───────────────────────────────────

describe('Settings Integrity — Context Files', () => {
  test('each contextFiles entry has a corresponding file in the tree', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const contextFiles = settings.contextFiles;
    expect(contextFiles).toBeDefined();
    expect(Array.isArray(contextFiles)).toBe(true);
    expect(contextFiles.length).toBeGreaterThan(0);

    const missing: string[] = [];

    for (const relPath of contextFiles) {
      // contextFiles are relative to the .claude/ directory (V3_ROOT)
      const fullPath = join(V3_ROOT, relPath);
      if (!existsSync(fullPath)) {
        missing.push(relPath);
      }
    }

    if (missing.length > 0) {
      console.error('Context files not found on disk:', missing);
    }
    expect(missing.length).toBe(0);
  });
});

// ─── Section 7: env Section Has Required Keys ────────────────────────────────

describe('Settings Integrity — env Section', () => {
  test('env section has PAI_DIR and PAI_CONFIG_DIR', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    expect(settings.env).toBeDefined();
    expect(typeof settings.env).toBe('object');
    expect(settings.env.PAI_DIR).toBeDefined();
    expect(typeof settings.env.PAI_DIR).toBe('string');
    expect(settings.env.PAI_CONFIG_DIR).toBeDefined();
    expect(typeof settings.env.PAI_CONFIG_DIR).toBe('string');
  });
});

// ─── Section 8: daidentity Section Has Required Keys ─────────────────────────

describe('Settings Integrity — daidentity Section', () => {
  test('daidentity has name, displayName, color, and voices', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const da = settings.daidentity;
    expect(da).toBeDefined();
    expect(typeof da).toBe('object');
    expect(da.name).toBeDefined();
    expect(typeof da.name).toBe('string');
    expect(da.displayName).toBeDefined();
    expect(typeof da.displayName).toBe('string');
    expect(da.color).toBeDefined();
    expect(typeof da.color).toBe('string');
    expect(da.voices).toBeDefined();
    expect(typeof da.voices).toBe('object');
  });
});

// ─── Section 9: principal Section Has Required Keys ──────────────────────────

describe('Settings Integrity — principal Section', () => {
  test('principal has name and timezone', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const principal = settings.principal;
    expect(principal).toBeDefined();
    expect(typeof principal).toBe('object');
    expect(principal.name).toBeDefined();
    expect(typeof principal.name).toBe('string');
    expect(principal.timezone).toBeDefined();
    expect(typeof principal.timezone).toBe('string');
  });
});

// ─── Section 10: pai Section Has Version ─────────────────────────────────────

describe('Settings Integrity — pai Section', () => {
  test('pai.version exists and is a string', () => {
    expect(settings).not.toBeNull();
    if (!settings) return;

    const pai = settings.pai;
    expect(pai).toBeDefined();
    expect(typeof pai).toBe('object');
    expect(pai.version).toBeDefined();
    expect(typeof pai.version).toBe('string');
    expect(pai.version.length).toBeGreaterThan(0);
  });
});
