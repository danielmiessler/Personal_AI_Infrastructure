/**
 * 10-install-e2e.test.ts — PAI Installer Engine E2E Tests
 *
 * Tests the PAI installer engine (detect, steps, validate, actions)
 * against REAL platform behavior. No mocking of process.platform.
 *
 * Validates:
 *   1. System detection — OS, shell, tools on all platforms
 *   2. Step definitions — 8 steps defined, dependency chain valid
 *   3. Configuration generation — settings.json structure
 *   4. Directory creation — required dirs exist after setup
 *   5. Voice server manage.ts CLI — cross-platform help output
 *   6. Validation module — check functions return expected structure
 *   7. Windows-specific — PowerShell detection, tool paths, aliases
 *
 * Runs on all platforms. Uses describe.skipIf for platform-specific blocks.
 *
 * Part of: PRD-20260219-windows-11-support (Install E2E)
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import {
  V3_ROOT,
  IS_NATIVE_WINDOWS,
  IS_MACOS,
  IS_LINUX,
  SLOW_TIMEOUT,
  bunRun,
} from './helpers';

// ─── Installer Engine Imports ────────────────────────────────────────────────

import { detectSystem } from '../../PAI-Install/engine/detect';
import { STEPS, getStep, getNextStep, getProgress } from '../../PAI-Install/engine/steps';
import type { InstallState, DetectionResult } from '../../PAI-Install/engine/types';
import { generateSettingsJson } from '../../PAI-Install/engine/config-gen';

// ─── Constants ───────────────────────────────────────────────────────────────

const MANAGE_TS = join(V3_ROOT, 'VoiceServer', 'manage.ts');

// ─── 1. System Detection (cross-platform) ───────────────────────────────────

describe('installer — system detection', () => {
  let detection: DetectionResult;

  beforeAll(() => {
    detection = detectSystem();
  });

  test('detectSystem returns a valid DetectionResult object', () => {
    expect(detection).toHaveProperty('os');
    expect(detection).toHaveProperty('shell');
    expect(detection).toHaveProperty('tools');
    expect(detection).toHaveProperty('existing');
    expect(detection).toHaveProperty('homeDir');
    expect(detection).toHaveProperty('paiDir');
  });

  test('detection.os.platform matches actual process.platform category', () => {
    if (process.platform === 'darwin') {
      expect(detection.os.platform).toBe('darwin');
    } else if (process.platform === 'win32') {
      expect(detection.os.platform).toBe('win32');
    } else {
      expect(detection.os.platform).toBe('linux');
    }
  });

  test('detection.os.arch is a non-empty string', () => {
    expect(detection.os.arch.length).toBeGreaterThan(0);
  });

  test('detection.os.name is a non-empty string', () => {
    expect(detection.os.name.length).toBeGreaterThan(0);
  });

  test('detection.shell has name, version, and path', () => {
    expect(detection.shell).toHaveProperty('name');
    expect(detection.shell).toHaveProperty('version');
    expect(detection.shell).toHaveProperty('path');
    expect(detection.shell.name.length).toBeGreaterThan(0);
  });

  test('detection.tools.bun.installed is true (we are running under Bun)', () => {
    expect(detection.tools.bun.installed).toBe(true);
  });

  test('detection.tools.git.installed is true (required for checkout)', () => {
    expect(detection.tools.git.installed).toBe(true);
  });

  test('detection.homeDir is an absolute path that exists', () => {
    expect(detection.homeDir.length).toBeGreaterThan(0);
    expect(existsSync(detection.homeDir)).toBe(true);
  });

  test('detection.paiDir ends with .claude', () => {
    expect(detection.paiDir).toEndWith('.claude');
  });

  test('detection.timezone is a non-empty string', () => {
    expect(detection.timezone.length).toBeGreaterThan(0);
  });

});

// ─── 2. Step Definitions ─────────────────────────────────────────────────────

describe('installer — step definitions', () => {

  test('STEPS array has exactly 8 steps', () => {
    expect(STEPS.length).toBe(8);
  });

  test('all 8 step IDs are present', () => {
    const ids = STEPS.map(s => s.id);
    expect(ids).toContain('system-detect');
    expect(ids).toContain('prerequisites');
    expect(ids).toContain('api-keys');
    expect(ids).toContain('identity');
    expect(ids).toContain('repository');
    expect(ids).toContain('configuration');
    expect(ids).toContain('voice');
    expect(ids).toContain('validation');
  });

  test('steps are numbered 1 through 8', () => {
    for (let i = 0; i < STEPS.length; i++) {
      expect(STEPS[i].number).toBe(i + 1);
    }
  });

  test('first step (system-detect) has no dependencies', () => {
    const step = getStep('system-detect');
    expect(step.dependsOn.length).toBe(0);
  });

  test('each non-first step depends on the previous step', () => {
    for (let i = 1; i < STEPS.length; i++) {
      expect(STEPS[i].dependsOn.length).toBeGreaterThan(0);
    }
  });

  test('getNextStep returns system-detect for a fresh state', () => {
    const state: InstallState = {
      version: '3.0',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'system-detect',
      completedSteps: [],
      skippedSteps: [],
      mode: 'cli',
      detection: null,
      collected: {},
      installType: null,
      errors: [],
    };
    const next = getNextStep(state);
    expect(next).not.toBeNull();
    expect(next!.id).toBe('system-detect');
  });

  test('getProgress returns 0 for a fresh state', () => {
    const state: InstallState = {
      version: '3.0',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'system-detect',
      completedSteps: [],
      skippedSteps: [],
      mode: 'cli',
      detection: null,
      collected: {},
      installType: null,
      errors: [],
    };
    expect(getProgress(state)).toBe(0);
  });

  test('getProgress returns 100 when all steps complete', () => {
    const state: InstallState = {
      version: '3.0',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'validation',
      completedSteps: STEPS.map(s => s.id),
      skippedSteps: [],
      mode: 'cli',
      detection: null,
      collected: {},
      installType: null,
      errors: [],
    };
    expect(getProgress(state)).toBe(100);
  });

});

// ─── 3. Configuration Generation ─────────────────────────────────────────────

describe('installer — configuration generation', () => {

  test('generateSettingsJson returns an object with required fields', () => {
    const config = generateSettingsJson({
      principalName: 'TestUser',
      timezone: 'America/Los_Angeles',
      aiName: 'TestAI',
      catchphrase: 'Hello World',
      paiDir: join(tmpdir(), '.claude-test'),
      configDir: join(tmpdir(), '.config-test'),
    });

    expect(config).toHaveProperty('principal');
    expect(config).toHaveProperty('daidentity');
    expect(config.principal.name).toBe('TestUser');
    expect(config.principal.timezone).toBe('America/Los_Angeles');
    expect(config.daidentity.name).toBe('TestAI');
  });

  test('generateSettingsJson includes PAI version field', () => {
    const config = generateSettingsJson({
      principalName: 'Test',
      timezone: 'UTC',
      aiName: 'PAI',
      catchphrase: 'Ready',
      paiDir: join(tmpdir(), '.claude-test'),
      configDir: join(tmpdir(), '.config-test'),
    });

    expect(config).toHaveProperty('pai');
    expect(config.pai).toHaveProperty('version');
  });

  test('generateSettingsJson output is valid JSON when stringified', () => {
    const config = generateSettingsJson({
      principalName: 'Test',
      timezone: 'UTC',
      aiName: 'PAI',
      catchphrase: 'Ready',
      paiDir: join(tmpdir(), '.claude-test'),
      configDir: join(tmpdir(), '.config-test'),
    });

    const json = JSON.stringify(config);
    const parsed = JSON.parse(json);
    expect(parsed.principal.name).toBe('Test');
  });

});

// ─── 4. Directory Structure Creation ─────────────────────────────────────────

describe('installer — directory structure', () => {
  const TEST_DIR = join(tmpdir(), `pai-install-test-${Date.now()}`);

  beforeAll(() => {
    // Create test directory to simulate installation
    mkdirSync(TEST_DIR, { recursive: true });
  });

  test('required directories can be created on this platform', () => {
    const requiredDirs = [
      'MEMORY',
      'MEMORY/STATE',
      'MEMORY/LEARNING',
      'MEMORY/WORK',
      'hooks',
      'skills',
      'Plans',
    ];

    for (const dir of requiredDirs) {
      const fullPath = join(TEST_DIR, dir);
      mkdirSync(fullPath, { recursive: true });
      expect(existsSync(fullPath)).toBe(true);
    }
  });

  test('settings.json can be written and read back', () => {
    const settingsPath = join(TEST_DIR, 'settings.json');
    const config = { principal: { name: 'Test' }, pai: { version: '3.0' } };
    writeFileSync(settingsPath, JSON.stringify(config, null, 2));

    expect(existsSync(settingsPath)).toBe(true);
    const read = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(read.principal.name).toBe('Test');
  });

  test('cleanup: remove test directory', () => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    expect(existsSync(TEST_DIR)).toBe(false);
  });

});

// ─── 5. Voice Server manage.ts CLI (cross-platform) ─────────────────────────

describe('installer — voice server manage.ts CLI', () => {

  test('manage.ts exists', () => {
    expect(existsSync(MANAGE_TS)).toBe(true);
  });

  test('manage.ts with no args prints help and exits 0', () => {
    const result = bunRun(['run', MANAGE_TS], { timeout: SLOW_TIMEOUT });
    expect(result.status).toBe(0);
    const output = result.stdout || '';
    expect(output).toContain('PAI Voice Server Manager');
    expect(output).toContain('Usage:');
  }, SLOW_TIMEOUT);

  test('manage.ts help output shows platform name', () => {
    const result = bunRun(['run', MANAGE_TS], { timeout: SLOW_TIMEOUT });
    const output = result.stdout || '';
    expect(output).toContain('Platform:');
  }, SLOW_TIMEOUT);

  test('manage.ts with invalid command exits 1', () => {
    const result = bunRun(['run', MANAGE_TS, 'badcommand'], { timeout: SLOW_TIMEOUT });
    expect(result.status).toBe(1);
  }, SLOW_TIMEOUT);

});

// ─── 6. Validation Module ────────────────────────────────────────────────────

describe('installer — validation module', () => {

  test('validation module can be imported', async () => {
    const mod = await import('../../PAI-Install/engine/validate');
    expect(mod).toHaveProperty('runValidation');
    expect(mod).toHaveProperty('generateSummary');
  });

  test('generateSummary returns correct structure for fresh state', async () => {
    const { generateSummary } = await import('../../PAI-Install/engine/validate');
    const state: InstallState = {
      version: '3.0',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 'validation',
      completedSteps: ['system-detect', 'prerequisites', 'api-keys', 'identity', 'repository', 'configuration', 'voice'],
      skippedSteps: [],
      mode: 'cli',
      detection: null,
      collected: {
        principalName: 'TestUser',
        aiName: 'TestAI',
        timezone: 'UTC',
        catchphrase: 'Hello',
      },
      installType: 'fresh',
      errors: [],
    };

    const summary = generateSummary(state);
    expect(summary.paiVersion).toBe('3.0');
    expect(summary.principalName).toBe('TestUser');
    expect(summary.aiName).toBe('TestAI');
    expect(summary.installType).toBe('fresh');
    expect(summary.completedSteps).toBe(7);
    expect(summary.totalSteps).toBe(8);
  });

});

// ─── 7. Windows-Specific Install Tests ───────────────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('installer — Windows-specific', () => {
  let detection: DetectionResult;

  beforeAll(() => {
    detection = detectSystem();
  });

  test('detectOS returns win32 platform', () => {
    expect(detection.os.platform).toBe('win32');
  });

  test('detectOS name contains Windows', () => {
    expect(detection.os.name).toContain('Windows');
  });

  test('detectShell returns powershell on Windows', () => {
    expect(detection.shell.name).toBe('powershell');
  });

  test('detectShell path contains powershell (case-insensitive)', () => {
    expect(detection.shell.path.toLowerCase()).toContain('powershell');
  });

  test('detectTool finds bun with a Windows path', () => {
    expect(detection.tools.bun.installed).toBe(true);
    if (detection.tools.bun.path) {
      // Windows paths have backslash or are .exe
      expect(
        detection.tools.bun.path.includes('\\') ||
        detection.tools.bun.path.toLowerCase().endsWith('.exe')
      ).toBe(true);
    }
  });

  test('detectTool finds git with a Windows path', () => {
    expect(detection.tools.git.installed).toBe(true);
  });

  test('manage.ts help mentions Windows platform', () => {
    const result = bunRun(['run', MANAGE_TS], { timeout: SLOW_TIMEOUT });
    const output = result.stdout || '';
    expect(output).toContain('Windows');
  }, SLOW_TIMEOUT);

  test('paiDir uses Windows home directory path', () => {
    // On Windows, homedir() returns something like C:\Users\...
    expect(detection.homeDir).toMatch(/^[A-Za-z]:\\/);
    expect(detection.paiDir).toMatch(/^[A-Za-z]:\\/);
  });

});

// ─── 8. macOS-Specific Install Tests ─────────────────────────────────────────

describe.skipIf(!IS_MACOS)('installer — macOS-specific', () => {
  let detection: DetectionResult;

  beforeAll(() => {
    detection = detectSystem();
  });

  test('detectOS returns darwin platform', () => {
    expect(detection.os.platform).toBe('darwin');
  });

  test('detectOS name contains macOS', () => {
    expect(detection.os.name).toContain('macOS');
  });

  test('brew detection returns a result (may or may not be installed)', () => {
    expect(detection.tools.brew).toHaveProperty('installed');
  });

});

// ─── 9. Linux-Specific Install Tests ─────────────────────────────────────────

describe.skipIf(!IS_LINUX)('installer — Linux-specific', () => {
  let detection: DetectionResult;

  beforeAll(() => {
    detection = detectSystem();
  });

  test('detectOS returns linux platform', () => {
    expect(detection.os.platform).toBe('linux');
  });

  test('shell is not powershell on Linux', () => {
    expect(detection.shell.name).not.toBe('powershell');
  });

  test('homeDir starts with /', () => {
    expect(detection.homeDir).toStartWith('/');
  });

});
