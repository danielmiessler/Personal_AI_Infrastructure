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
