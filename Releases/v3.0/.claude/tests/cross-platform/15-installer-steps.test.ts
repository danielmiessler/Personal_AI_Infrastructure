/**
 * 15-installer-steps.test.ts — Installer Engine Module Tests (Cross-Platform)
 *
 * Tests each installer engine module independently to verify:
 *   - All 5 core engine modules import without errors
 *   - detectSystem() returns well-formed detection data
 *   - createFreshState() produces correct initial state
 *   - STEPS array is complete with 8 entries, each well-formed
 *   - getStep(), getNextStep(), getProgress() behave correctly
 *   - generateSettingsJson() produces correct config structure
 *   - generateSummary() returns expected summary shape
 *
 * These tests use dynamic imports (safeImport) to catch import-time
 * crashes on any platform. No disk writes, no network calls.
 *
 * Run: bun test tests/cross-platform/15-installer-steps.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { V3_ROOT, INSTALL_DIR, SLOW_TIMEOUT, safeImport } from '../windows/helpers';

// ─── Type aliases for dynamic imports ────────────────────────────────────────

type ConfigGenModule = {
  generateSettingsJson: (config: Record<string, any>) => Record<string, any>;
};

type DetectModule = {
  detectSystem: () => {
    os: { platform: string };
    homeDir: string;
    paiDir: string;
    [key: string]: unknown;
  };
};

type StateModule = {
  createFreshState: (mode: string) => {
    mode: string;
    currentStep: string;
    completedSteps: string[];
    skippedSteps: string[];
    collected: Record<string, unknown>;
    steps?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

type StepsModule = {
  STEPS: Array<{ id: string; name: string; number: number; description: string; dependsOn: string[] }>;
  getStep: (id: string) => { id: string; name: string; number: number };
  getNextStep: (state: any) => { id: string; name: string; number: number } | null;
  getProgress: (state: any) => number;
};

type ValidateModule = {
  generateSummary: (state: any) => {
    totalSteps: number;
    completedSteps: number;
    [key: string]: unknown;
  };
};

// ─── Section 1: Module Imports ───────────────────────────────────────────────

describe('Installer Engine — Module Imports', () => {
  test('config-gen.ts imports without error', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/config-gen`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('config-gen import error:', result.error);
  }, SLOW_TIMEOUT);

  test('detect.ts imports without error', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/detect`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('detect import error:', result.error);
  }, SLOW_TIMEOUT);

  test('state.ts imports without error', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/state`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('state import error:', result.error);
  }, SLOW_TIMEOUT);

  test('steps.ts imports without error', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('steps import error:', result.error);
  }, SLOW_TIMEOUT);

  test('validate.ts imports without error', async () => {
    const result = await safeImport(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) console.error('validate import error:', result.error);
  }, SLOW_TIMEOUT);
});

// ─── Section 2: System Detection ─────────────────────────────────────────────

describe('Installer Engine — detectSystem()', () => {
  test('returns object with os.platform, homeDir, and paiDir', async () => {
    const result = await safeImport<DetectModule>(`${INSTALL_DIR}/engine/detect`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const detection = result.module.detectSystem();

    expect(detection).toBeDefined();
    expect(detection.os).toBeDefined();
    expect(typeof detection.os.platform).toBe('string');
    expect(['darwin', 'linux', 'win32']).toContain(detection.os.platform);
    expect(typeof detection.homeDir).toBe('string');
    expect(detection.homeDir.length).toBeGreaterThan(0);
    expect(typeof detection.paiDir).toBe('string');
    expect(detection.paiDir.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);
});

// ─── Section 3: State Management ─────────────────────────────────────────────

describe('Installer Engine — createFreshState()', () => {
  test('returns object with mode: "cli", steps, and collected', async () => {
    const result = await safeImport<StateModule>(`${INSTALL_DIR}/engine/state`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = result.module.createFreshState('cli');

    expect(state).toBeDefined();
    expect(state.mode).toBe('cli');
    expect(state.currentStep).toBe('system-detect');
    expect(Array.isArray(state.completedSteps)).toBe(true);
    expect(state.completedSteps.length).toBe(0);
    expect(Array.isArray(state.skippedSteps)).toBe(true);
    expect(state.skippedSteps.length).toBe(0);
    expect(state.collected).toBeDefined();
    expect(typeof state.collected).toBe('object');
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Step Definitions ─────────────────────────────────────────────

describe('Installer Engine — STEPS Array', () => {
  test('STEPS is an array with exactly 8 entries', async () => {
    const result = await safeImport<StepsModule>(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Array.isArray(result.module.STEPS)).toBe(true);
    expect(result.module.STEPS.length).toBe(8);
  }, SLOW_TIMEOUT);

  test('each step has id, name, and number fields', async () => {
    const result = await safeImport<StepsModule>(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const step of result.module.STEPS) {
      expect(typeof step.id).toBe('string');
      expect(step.id.length).toBeGreaterThan(0);
      expect(typeof step.name).toBe('string');
      expect(step.name.length).toBeGreaterThan(0);
      expect(typeof step.number).toBe('number');
      expect(step.number).toBeGreaterThanOrEqual(1);
      expect(step.number).toBeLessThanOrEqual(8);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 5: getStep() ────────────────────────────────────────────────────

describe('Installer Engine — getStep()', () => {
  test('getStep("system-detect") returns step with name containing "System" or "Detect"', async () => {
    const result = await safeImport<StepsModule>(`${INSTALL_DIR}/engine/steps`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const step = result.module.getStep('system-detect');
    expect(step).toBeDefined();
    expect(step.id).toBe('system-detect');

    const nameMatchesExpected =
      step.name.includes('System') || step.name.includes('Detect');
    expect(nameMatchesExpected).toBe(true);
  }, SLOW_TIMEOUT);
});

// ─── Section 6: getNextStep() ────────────────────────────────────────────────

describe('Installer Engine — getNextStep()', () => {
  test('returns first step (system-detect) for a fresh state', async () => {
    const stepsResult = await safeImport<StepsModule>(`${INSTALL_DIR}/engine/steps`);
    const stateResult = await safeImport<StateModule>(`${INSTALL_DIR}/engine/state`);
    expect(stepsResult.ok).toBe(true);
    expect(stateResult.ok).toBe(true);
    if (!stepsResult.ok || !stateResult.ok) return;

    const freshState = stateResult.module.createFreshState('cli');
    const nextStep = stepsResult.module.getNextStep(freshState);

    expect(nextStep).not.toBeNull();
    expect(nextStep!.id).toBe('system-detect');
  }, SLOW_TIMEOUT);
});

// ─── Section 7: getProgress() ────────────────────────────────────────────────

describe('Installer Engine — getProgress()', () => {
  test('returns 0 for a fresh state with no completed steps', async () => {
    const stepsResult = await safeImport<StepsModule>(`${INSTALL_DIR}/engine/steps`);
    const stateResult = await safeImport<StateModule>(`${INSTALL_DIR}/engine/state`);
    expect(stepsResult.ok).toBe(true);
    expect(stateResult.ok).toBe(true);
    if (!stepsResult.ok || !stateResult.ok) return;

    const freshState = stateResult.module.createFreshState('cli');
    const progress = stepsResult.module.getProgress(freshState);

    expect(progress).toBe(0);
  }, SLOW_TIMEOUT);
});

// ─── Section 8: generateSettingsJson() ───────────────────────────────────────

describe('Installer Engine — generateSettingsJson()', () => {
  const minimalConfig = {
    principalName: 'TestUser',
    timezone: 'America/New_York',
    aiName: 'TestAI',
    catchphrase: 'Hello, world',
    paiDir: '/home/test/.claude',
    configDir: '/home/test/.config/PAI',
  };

  test('returns object with env, principal, daidentity, and pai sections', async () => {
    const result = await safeImport<ConfigGenModule>(`${INSTALL_DIR}/engine/config-gen`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const settings = result.module.generateSettingsJson(minimalConfig);

    expect(settings).toBeDefined();
    expect(typeof settings).toBe('object');
    expect(settings.env).toBeDefined();
    expect(settings.principal).toBeDefined();
    expect(settings.daidentity).toBeDefined();
    expect(settings.pai).toBeDefined();
  }, SLOW_TIMEOUT);

  test('env.PAI_DIR matches provided paiDir', async () => {
    const result = await safeImport<ConfigGenModule>(`${INSTALL_DIR}/engine/config-gen`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const settings = result.module.generateSettingsJson(minimalConfig);

    expect(settings.env.PAI_DIR).toBe(minimalConfig.paiDir);
  }, SLOW_TIMEOUT);

  test('principal.name matches provided principalName', async () => {
    const result = await safeImport<ConfigGenModule>(`${INSTALL_DIR}/engine/config-gen`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const settings = result.module.generateSettingsJson(minimalConfig);

    expect(settings.principal.name).toBe(minimalConfig.principalName);
  }, SLOW_TIMEOUT);
});

// ─── Section 9: generateSummary() ────────────────────────────────────────────

describe('Installer Engine — generateSummary()', () => {
  test('returns object with totalSteps and completedSteps for fresh state', async () => {
    const validateResult = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    const stateResult = await safeImport<StateModule>(`${INSTALL_DIR}/engine/state`);
    expect(validateResult.ok).toBe(true);
    expect(stateResult.ok).toBe(true);
    if (!validateResult.ok || !stateResult.ok) return;

    const freshState = stateResult.module.createFreshState('cli');
    const summary = validateResult.module.generateSummary(freshState);

    expect(summary).toBeDefined();
    expect(typeof summary.totalSteps).toBe('number');
    expect(summary.totalSteps).toBe(8);
    expect(typeof summary.completedSteps).toBe('number');
    expect(summary.completedSteps).toBe(0);
  }, SLOW_TIMEOUT);
});
