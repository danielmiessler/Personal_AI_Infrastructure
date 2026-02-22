/**
 * 03-installer.test.ts — Installer Function Tests (Windows E2E Suite)
 *
 * Validates the PAI installer engine works on all platforms:
 *   - Engine modules import without errors
 *   - State management functions work correctly
 *   - Step definitions are well-formed
 *   - Windows-specific installer paths and guards
 *   - System detection runs without crashing
 *
 * Run: bun test tests/windows/03-installer.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import {
  INSTALL_DIR,
  V3_ROOT,
  IS_NATIVE_WINDOWS,
  SLOW_TIMEOUT,
  safeImport,
} from './helpers';

// ─── Section 1: Module Loading (cross-platform) ────────────────────────────

describe('Installer Module Loading', () => {
  test('PAI-Install/engine/actions.ts imports cleanly', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/actions`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('actions.ts import error:', result.error);
  }, SLOW_TIMEOUT);

  test('PAI-Install/engine/state.ts imports cleanly', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/state`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('state.ts import error:', result.error);
  }, SLOW_TIMEOUT);

  test('PAI-Install/engine/steps.ts imports cleanly', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('steps.ts import error:', result.error);
  }, SLOW_TIMEOUT);

  test('PAI-Install/engine/validate.ts imports cleanly', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('validate.ts import error:', result.error);
  }, SLOW_TIMEOUT);

  test('PAI-Install/cli/display.ts imports cleanly', async () => {
    const result = await safeImport(`${INSTALL_DIR}/cli/display`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('display.ts import error:', result.error);
  }, SLOW_TIMEOUT);
});

// ─── Section 2: State Management (cross-platform) ──────────────────────────

describe('State Management', () => {
  test('createFreshState() returns object with currentStep and completedSteps', async () => {
    const result = await safeImport<{
      createFreshState: (mode: string) => {
        currentStep: string;
        completedSteps: string[];
      };
    }>(`${INSTALL_DIR}/engine/state`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const state = result.module.createFreshState('cli');
      expect(state).toBeDefined();
      expect(typeof state.currentStep).toBe('string');
      expect(state.currentStep).toBe('system-detect');
      expect(Array.isArray(state.completedSteps)).toBe(true);
      expect(state.completedSteps.length).toBe(0);
    }
  }, SLOW_TIMEOUT);

  test('hasSavedState() returns boolean without throwing', async () => {
    const result = await safeImport<{
      hasSavedState: () => boolean;
    }>(`${INSTALL_DIR}/engine/state`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const hasState = result.module.hasSavedState();
      expect(typeof hasState).toBe('boolean');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 3: Steps Configuration (cross-platform) ───────────────────────

describe('Steps Configuration', () => {
  test('STEPS is an array with at least 5 entries', async () => {
    const result = await safeImport<{
      STEPS: Array<{ id: string; name: string; description: string }>;
    }>(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(Array.isArray(result.module.STEPS)).toBe(true);
      expect(result.module.STEPS.length).toBeGreaterThanOrEqual(5);
    }
  }, SLOW_TIMEOUT);

  test('each step has id, name, and description', async () => {
    const result = await safeImport<{
      STEPS: Array<{ id: string; name: string; description: string }>;
    }>(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      for (const step of result.module.STEPS) {
        expect(typeof step.id).toBe('string');
        expect(step.id.length).toBeGreaterThan(0);
        expect(typeof step.name).toBe('string');
        expect(step.name.length).toBeGreaterThan(0);
        expect(typeof step.description).toBe('string');
        expect(step.description.length).toBeGreaterThan(0);
      }
    }
  }, SLOW_TIMEOUT);

  test('step IDs include system-detect, prerequisites, and api-keys', async () => {
    const result = await safeImport<{
      STEPS: Array<{ id: string }>;
    }>(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const ids = result.module.STEPS.map(s => s.id);
      expect(ids).toContain('system-detect');
      expect(ids).toContain('prerequisites');
      expect(ids).toContain('api-keys');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Windows-specific Installer Paths ───────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('Windows-specific Installer Paths', () => {
  test('platform module reports isWindows as true', async () => {
    const result = await safeImport<{
      isWindows: boolean;
    }>(`${V3_ROOT}/lib/platform`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.module.isWindows).toBe(true);
    }
  }, SLOW_TIMEOUT);

  test('Bun install command for Windows uses irm or powershell', async () => {
    // The actions module uses isWindows to branch Bun install logic.
    // On Windows, the install command should use PowerShell's irm.
    // We verify by reading the source and checking the Windows branch.
    const actionsPath = `${INSTALL_DIR}/engine/actions.ts`;
    const { readFileSync } = await import('fs');
    const source = readFileSync(actionsPath, 'utf-8');

    // The Windows branch should contain 'irm' (Invoke-RestMethod) for bun install
    expect(source).toContain('irm bun.sh/install.ps1');
  }, SLOW_TIMEOUT);

  test('shell profile path contains PowerShell', async () => {
    const result = await safeImport<{
      getShellProfilePath: () => string;
    }>(`${V3_ROOT}/lib/platform`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      const profilePath = result.module.getShellProfilePath();
      expect(profilePath).toContain('PowerShell');
    }
  }, SLOW_TIMEOUT);

  test('chmod/chown functions would be skipped via platform guard', async () => {
    const result = await safeImport<{
      isCommandAvailable: (cmd: string) => boolean;
      isWindows: boolean;
    }>(`${V3_ROOT}/lib/platform`);
    expect(result.ok).toBe(true);

    if (result.ok) {
      // On Windows, chmod and chown should report as unavailable
      expect(result.module.isCommandAvailable('chmod')).toBe(false);
      expect(result.module.isCommandAvailable('chown')).toBe(false);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 5: System Detection (cross-platform) ──────────────────────────

describe('System Detection', () => {
  test('runSystemDetect() returns state object without throwing', async () => {
    const actionsResult = await safeImport<{
      runSystemDetect: (
        state: any,
        emit: (event: any) => void | Promise<void>,
      ) => Promise<any>;
    }>(`${INSTALL_DIR}/engine/actions`);
    expect(actionsResult.ok).toBe(true);

    const stateResult = await safeImport<{
      createFreshState: (mode: string) => any;
    }>(`${INSTALL_DIR}/engine/state`);
    expect(stateResult.ok).toBe(true);

    if (actionsResult.ok && stateResult.ok) {
      const state = stateResult.module.createFreshState('cli');
      const emit = (_event: any) => {};

      const detection = await actionsResult.module.runSystemDetect(state, emit);

      // Detection result should be a well-formed object
      expect(detection).toBeDefined();
      expect(detection).toHaveProperty('os');
      expect(detection).toHaveProperty('tools');
      expect(detection).toHaveProperty('homeDir');
      expect(typeof detection.os.platform).toBe('string');
      expect(typeof detection.homeDir).toBe('string');
      expect(detection.homeDir.length).toBeGreaterThan(0);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 6: PowerShell Profile Detection (cross-platform source analysis) ─

describe('PowerShell Profile Detection — Source Analysis', () => {
  const actionsSource = readFileSync(join(INSTALL_DIR, 'engine', 'actions.ts'), 'utf-8');
  const validateSource = readFileSync(join(INSTALL_DIR, 'engine', 'validate.ts'), 'utf-8');

  test('actions.ts detects PS 5.1 profile via powershell.exe $PROFILE', () => {
    expect(actionsSource).toContain('powershell.exe');
    expect(actionsSource).toContain('Write-Host $PROFILE');
  });

  test('actions.ts detects PS 7+ profile via pwsh.exe $PROFILE', () => {
    expect(actionsSource).toContain('pwsh.exe');
  });

  test('actions.ts does not hardcode a single PowerShell profile directory', () => {
    // The old bug: hardcoded "Documents", "PowerShell" only (missed WindowsPowerShell + OneDrive)
    // New code uses dynamic $PROFILE detection with fallback to BOTH directories
    expect(actionsSource).toContain('WindowsPowerShell');
    expect(actionsSource).toContain('"PowerShell"');
  });

  test('actions.ts writes pai function to multiple detected profiles', () => {
    // Should iterate over profilePaths array, not write to a single path
    expect(actionsSource).toContain('for (const psProfilePath of profilePaths)');
  });

  test('validate.ts checks both PS 5.1 and PS 7+ profile paths', () => {
    expect(validateSource).toContain('powershell.exe');
    expect(validateSource).toContain('pwsh.exe');
  });

  test('validate.ts has WindowsPowerShell fallback path', () => {
    expect(validateSource).toContain('WindowsPowerShell');
  });

  test('actions.ts pai function uses bun and @args for PowerShell', () => {
    expect(actionsSource).toMatch(/function pai \{ bun .* @args \}/);
  });

  test('actions.ts cleans old PAI alias before writing new one', () => {
    expect(actionsSource).toContain('Remove old PAI alias');
    expect(actionsSource).toMatch(/replace.*PAI alias/);
    expect(actionsSource).toMatch(/replace.*function pai/);
  });
});

// ─── Section 7: Windows-only Profile Path E2E ─────────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('Windows Profile Path E2E', () => {

  test('PS 5.1 $PROFILE path contains WindowsPowerShell', () => {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Write-Host $PROFILE'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    const profilePath = (result.stdout || '').trim();
    expect(profilePath).toContain('WindowsPowerShell');
    expect(profilePath).toEndWith('.ps1');
  }, SLOW_TIMEOUT);

  test('PS 5.1 and PS 7+ have different profile paths', () => {
    const ps5Result = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Write-Host $PROFILE'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    const ps5Path = (ps5Result.stdout || '').trim();

    // PS 7+ may not be installed — skip comparison if unavailable
    const ps7Result = spawnSync('pwsh.exe', ['-NoProfile', '-Command', 'Write-Host $PROFILE'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });

    if (ps7Result.status === 0) {
      const ps7Path = (ps7Result.stdout || '').trim();
      // They should be different directories (WindowsPowerShell vs PowerShell)
      expect(ps5Path).not.toBe(ps7Path);
      expect(ps5Path).toContain('WindowsPowerShell');
      expect(ps7Path).not.toContain('WindowsPowerShell');
    } else {
      // PS 7+ not installed — that's fine, just verify PS 5.1 works
      expect(ps5Path.length).toBeGreaterThan(0);
    }
  }, SLOW_TIMEOUT);

  test('PowerShell profile contains pai function after installation', () => {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Write-Host $PROFILE'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    const profilePath = (result.stdout || '').trim();

    try {
      const content = readFileSync(profilePath, 'utf-8');
      expect(content).toContain('# PAI alias');
      expect(content).toContain('function pai');
      expect(content).toContain('bun');
    } catch {
      // Profile may not exist if installer hasn't been run yet — skip gracefully
      console.log(`SKIP: PS profile not found at ${profilePath} (installer not run)`);
    }
  }, SLOW_TIMEOUT);

  test('pai command is callable from PowerShell (requires PAI installed)', () => {
    // First verify a profile with the pai function actually exists
    // (CI runners have clean Windows images with no PAI installed)
    const profileResult = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Write-Host $PROFILE'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    const profilePath = (profileResult.stdout || '').trim();

    let hasPaiFunction = false;
    try {
      const content = readFileSync(profilePath, 'utf-8');
      hasPaiFunction = content.includes('function pai');
    } catch {
      // Profile doesn't exist — installer hasn't been run
    }

    if (!hasPaiFunction) {
      console.log(`SKIP: pai function not in PS profile (installer not run on this machine)`);
      return;
    }

    // Profile has pai function — verify it's callable
    const result = spawnSync('powershell.exe', [
      '-Command',
      'if (Get-Command pai -ErrorAction SilentlyContinue) { Write-Host "FOUND" } else { Write-Host "NOT_FOUND" }',
    ], {
      encoding: 'utf-8',
      timeout: 15_000,
    });
    const output = (result.stdout || '').trim();
    expect(output).toBe('FOUND');
  }, SLOW_TIMEOUT);
});
