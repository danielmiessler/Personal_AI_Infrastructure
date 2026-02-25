/**
 * 22-installer-engine.test.ts -- Installer Engine Validation & Summary Tests (Cross-Platform)
 *
 * Tests installer engine functions with real temp directory structures:
 *   - runValidation() individual checks (settings.json, fields, directories, keys, voice)
 *   - generateSummary() platform-specific behavior (voice mode, activation command)
 *
 * Uses temp directories for CI safety -- no real API keys, no real ~/.claude access.
 * All filesystem state is created in beforeAll and cleaned in afterAll.
 *
 * Run: bun test tests/cross-platform/22-installer-engine.test.ts
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { INSTALL_DIR, SLOW_TIMEOUT, safeImport, IS_NATIVE_WINDOWS } from '../windows/helpers';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// -- Type aliases for dynamic imports --------------------------------------------------

type ValidateModule = {
  runValidation: (state: any) => Promise<Array<{
    name: string;
    passed: boolean;
    detail: string;
    critical: boolean;
  }>>;
  generateSummary: (state: any) => {
    paiVersion: string;
    principalName: string;
    aiName: string;
    timezone: string;
    voiceEnabled: boolean;
    voiceMode: string;
    catchphrase: string;
    installType: string;
    completedSteps: number;
    totalSteps: number;
    activationCommand: string;
    activationHint: string;
  };
};

type StateModule = {
  createFreshState: (mode: string) => {
    version: string;
    mode: string;
    currentStep: string;
    completedSteps: string[];
    skippedSteps: string[];
    collected: Record<string, unknown>;
    detection: any;
    installType: string | null;
    errors: any[];
    [key: string]: unknown;
  };
};

// -- Helper: build a minimal InstallState pointing at temp dirs --------------------

function buildState(overrides: {
  paiDir?: string;
  configDir?: string;
  collected?: Record<string, unknown>;
  completedSteps?: string[];
  installType?: string | null;
} = {}): any {
  return {
    version: '3.0',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentStep: 'validation',
    completedSteps: overrides.completedSteps ?? [],
    skippedSteps: [],
    mode: 'cli',
    detection: {
      paiDir: overrides.paiDir ?? '/nonexistent',
      configDir: overrides.configDir ?? '/nonexistent-config',
      os: { platform: process.platform, arch: process.arch, version: '', name: '' },
      shell: { name: '', version: '', path: '' },
      tools: {
        bun: { installed: true },
        git: { installed: true },
        claude: { installed: false },
        node: { installed: false },
        brew: { installed: false },
      },
      existing: { paiInstalled: false, hasApiKeys: false, elevenLabsKeyFound: false, backupPaths: [] },
      timezone: 'UTC',
      homeDir: tmpdir(),
    },
    collected: overrides.collected ?? {},
    installType: overrides.installType ?? null,
    errors: [],
  };
}

// -- Temp directory management ---------------------------------------------------------

let tempRoot: string;

// Section 1 dirs: full valid structure
let s1PaiDir: string;
let s1ConfigDir: string;

// Section 2 dirs: empty pai dir (no settings.json)
let s2PaiDir: string;

// Section 3 dirs: invalid JSON settings
let s3PaiDir: string;

// Section 4 dirs: empty settings object (missing fields)
let s4PaiDir: string;

// Section 5 dirs: partial directory structure
let s5PaiDir: string;

// Section 6 dirs: ElevenLabs key detection
let s6PaiDir: string;
let s6ConfigDir: string;

beforeAll(() => {
  tempRoot = mkdtempSync(join(tmpdir(), 'pai-test-22-'));

  // -- Section 1: Full valid structure -----------------------------------------------
  s1PaiDir = join(tempRoot, 's1-pai');
  s1ConfigDir = join(tempRoot, 's1-config');
  mkdirSync(s1PaiDir, { recursive: true });
  mkdirSync(s1ConfigDir, { recursive: true });

  const validSettings = {
    principal: { name: 'Test', timezone: 'UTC' },
    daidentity: {
      name: 'TestAI',
      voices: { main: { voiceId: 'abcdef1234567890abcdef' } },
    },
    pai: { version: '3.0' },
  };
  writeFileSync(join(s1PaiDir, 'settings.json'), JSON.stringify(validSettings, null, 2));

  // Create all required subdirectories
  for (const sub of ['skills', 'MEMORY', 'MEMORY/STATE', 'MEMORY/WORK', 'hooks', 'Plans']) {
    mkdirSync(join(s1PaiDir, sub), { recursive: true });
  }

  // Create PAI core skill file
  mkdirSync(join(s1PaiDir, 'skills', 'PAI'), { recursive: true });
  writeFileSync(join(s1PaiDir, 'skills', 'PAI', 'SKILL.md'), '# PAI Core Skill');

  // -- Section 2: Empty pai dir (no settings.json) -----------------------------------
  s2PaiDir = join(tempRoot, 's2-pai');
  mkdirSync(s2PaiDir, { recursive: true });

  // -- Section 3: Invalid JSON settings -----------------------------------------------
  s3PaiDir = join(tempRoot, 's3-pai');
  mkdirSync(s3PaiDir, { recursive: true });
  writeFileSync(join(s3PaiDir, 'settings.json'), 'not json {{{');

  // -- Section 4: Empty settings object -----------------------------------------------
  s4PaiDir = join(tempRoot, 's4-pai');
  mkdirSync(s4PaiDir, { recursive: true });
  writeFileSync(join(s4PaiDir, 'settings.json'), JSON.stringify({}));

  // -- Section 5: Partial directory structure ------------------------------------------
  s5PaiDir = join(tempRoot, 's5-pai');
  mkdirSync(s5PaiDir, { recursive: true });
  writeFileSync(join(s5PaiDir, 'settings.json'), JSON.stringify({
    principal: { name: 'Partial', timezone: 'UTC' },
    daidentity: { name: 'PartialAI' },
    pai: { version: '3.0' },
  }));
  // Only create skills and MEMORY -- leave MEMORY/STATE, MEMORY/WORK, hooks, Plans missing
  mkdirSync(join(s5PaiDir, 'skills'), { recursive: true });
  mkdirSync(join(s5PaiDir, 'MEMORY'), { recursive: true });

  // -- Section 6: ElevenLabs key in configDir .env ------------------------------------
  s6PaiDir = join(tempRoot, 's6-pai');
  s6ConfigDir = join(tempRoot, 's6-config');
  mkdirSync(s6PaiDir, { recursive: true });
  mkdirSync(s6ConfigDir, { recursive: true });
  writeFileSync(join(s6PaiDir, 'settings.json'), JSON.stringify({
    principal: { name: 'KeyTest' },
    daidentity: { name: 'KeyAI' },
    pai: { version: '3.0' },
  }));
  writeFileSync(join(s6ConfigDir, '.env'), 'ELEVENLABS_API_KEY=test_key_abc123\n');
});

afterAll(() => {
  try {
    rmSync(tempRoot, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup -- CI temp dirs are ephemeral
  }
});

// -- Helper: find a check by name in results ------------------------------------------

function findCheck(
  checks: Array<{ name: string; passed: boolean; detail: string; critical: boolean }>,
  name: string
): { name: string; passed: boolean; detail: string; critical: boolean } | undefined {
  return checks.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
}

// =====================================================================================
// Section 1: runValidation with valid settings.json
// =====================================================================================

describe('Installer Engine -- runValidation() with valid settings.json', () => {
  test('settings.json check passes for valid JSON file', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    expect(Array.isArray(checks)).toBe(true);
    expect(checks.length).toBeGreaterThan(0);

    const settingsCheck = findCheck(checks, 'settings.json');
    expect(settingsCheck).toBeDefined();
    expect(settingsCheck!.passed).toBe(true);
    expect(settingsCheck!.detail).toContain('Valid');
  }, SLOW_TIMEOUT);

  test('principal name check passes when configured', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const principalCheck = findCheck(checks, 'Principal name');
    expect(principalCheck).toBeDefined();
    expect(principalCheck!.passed).toBe(true);
    expect(principalCheck!.detail).toContain('Test');
  }, SLOW_TIMEOUT);

  test('AI identity check passes when configured', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const identityCheck = findCheck(checks, 'AI identity');
    expect(identityCheck).toBeDefined();
    expect(identityCheck!.passed).toBe(true);
    expect(identityCheck!.detail).toContain('TestAI');
  }, SLOW_TIMEOUT);

  test('PAI version check passes when set', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const versionCheck = findCheck(checks, 'PAI version');
    expect(versionCheck).toBeDefined();
    expect(versionCheck!.passed).toBe(true);
    expect(versionCheck!.detail).toContain('3.0');
  }, SLOW_TIMEOUT);

  test('timezone check passes when configured', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const tzCheck = findCheck(checks, 'Timezone');
    expect(tzCheck).toBeDefined();
    expect(tzCheck!.passed).toBe(true);
  }, SLOW_TIMEOUT);

  test('directory structure checks pass for all created directories', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const dirNames = ['Skills directory', 'Memory directory', 'State directory', 'Work directory', 'Hooks directory', 'Plans directory'];
    for (const dirName of dirNames) {
      const dirCheck = findCheck(checks, dirName);
      expect(dirCheck).toBeDefined();
      expect(dirCheck!.passed).toBe(true);
      expect(dirCheck!.detail).toContain('Present');
    }
  }, SLOW_TIMEOUT);

  test('PAI core skill check passes when SKILL.md exists', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const skillCheck = findCheck(checks, 'PAI core skill');
    expect(skillCheck).toBeDefined();
    expect(skillCheck!.passed).toBe(true);
    expect(skillCheck!.detail).toContain('Present');
  }, SLOW_TIMEOUT);

  test('DA voice ID check passes when voiceId is in settings', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const voiceCheck = findCheck(checks, 'DA voice ID');
    expect(voiceCheck).toBeDefined();
    expect(voiceCheck!.passed).toBe(true);
    expect(voiceCheck!.detail).toContain('Voice ID');
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 2: runValidation with missing settings.json
// =====================================================================================

describe('Installer Engine -- runValidation() with missing settings.json', () => {
  test('settings.json check fails with "File not found"', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s2PaiDir });
    const checks = await result.module.runValidation(state);

    const settingsCheck = findCheck(checks, 'settings.json');
    expect(settingsCheck).toBeDefined();
    expect(settingsCheck!.passed).toBe(false);
    expect(settingsCheck!.detail.toLowerCase()).toContain('not found');
  }, SLOW_TIMEOUT);

  test('settings.json check is marked critical', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s2PaiDir });
    const checks = await result.module.runValidation(state);

    const settingsCheck = findCheck(checks, 'settings.json');
    expect(settingsCheck).toBeDefined();
    expect(settingsCheck!.critical).toBe(true);
  }, SLOW_TIMEOUT);

  test('no principal/identity/version checks when settings.json missing', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s2PaiDir });
    const checks = await result.module.runValidation(state);

    // When settings.json is missing, the settings-dependent checks (principal, identity,
    // version, timezone) are not added because the code only pushes them if settings !== null
    const principalCheck = findCheck(checks, 'Principal name');
    const identityCheck = findCheck(checks, 'AI identity');

    // Either they don't exist or they fail -- both are valid depending on implementation
    if (principalCheck) {
      expect(principalCheck.passed).toBe(false);
    }
    if (identityCheck) {
      expect(identityCheck.passed).toBe(false);
    }
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 3: runValidation with invalid JSON settings
// =====================================================================================

describe('Installer Engine -- runValidation() with invalid JSON', () => {
  test('settings.json check fails with "invalid JSON" detail', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s3PaiDir });
    const checks = await result.module.runValidation(state);

    const settingsCheck = findCheck(checks, 'settings.json');
    expect(settingsCheck).toBeDefined();
    expect(settingsCheck!.passed).toBe(false);
    expect(settingsCheck!.detail.toLowerCase()).toContain('invalid json');
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 4: runValidation with missing fields (empty object)
// =====================================================================================

describe('Installer Engine -- runValidation() with missing fields', () => {
  test('principal name check fails for empty settings', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s4PaiDir });
    const checks = await result.module.runValidation(state);

    // settings.json should pass (valid JSON) but fields should fail
    const settingsCheck = findCheck(checks, 'settings.json');
    expect(settingsCheck).toBeDefined();
    expect(settingsCheck!.passed).toBe(true);

    const principalCheck = findCheck(checks, 'Principal name');
    expect(principalCheck).toBeDefined();
    expect(principalCheck!.passed).toBe(false);
    expect(principalCheck!.detail.toLowerCase()).toContain('not configured');
  }, SLOW_TIMEOUT);

  test('AI identity check fails for empty settings', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s4PaiDir });
    const checks = await result.module.runValidation(state);

    const identityCheck = findCheck(checks, 'AI identity');
    expect(identityCheck).toBeDefined();
    expect(identityCheck!.passed).toBe(false);
    expect(identityCheck!.detail.toLowerCase()).toContain('not configured');
  }, SLOW_TIMEOUT);

  test('PAI version check fails for empty settings', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s4PaiDir });
    const checks = await result.module.runValidation(state);

    const versionCheck = findCheck(checks, 'PAI version');
    expect(versionCheck).toBeDefined();
    expect(versionCheck!.passed).toBe(false);
  }, SLOW_TIMEOUT);

  test('timezone check fails for empty settings', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s4PaiDir });
    const checks = await result.module.runValidation(state);

    const tzCheck = findCheck(checks, 'Timezone');
    expect(tzCheck).toBeDefined();
    expect(tzCheck!.passed).toBe(false);
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 5: runValidation directory checks (partial structure)
// =====================================================================================

describe('Installer Engine -- runValidation() directory checks (partial)', () => {
  test('present directories pass (skills, MEMORY)', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s5PaiDir });
    const checks = await result.module.runValidation(state);

    const skillsDirCheck = findCheck(checks, 'Skills directory');
    expect(skillsDirCheck).toBeDefined();
    expect(skillsDirCheck!.passed).toBe(true);

    const memoryDirCheck = findCheck(checks, 'Memory directory');
    expect(memoryDirCheck).toBeDefined();
    expect(memoryDirCheck!.passed).toBe(true);
  }, SLOW_TIMEOUT);

  test('missing directories fail (State, Work, Hooks, Plans)', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s5PaiDir });
    const checks = await result.module.runValidation(state);

    const stateDirCheck = findCheck(checks, 'State directory');
    expect(stateDirCheck).toBeDefined();
    expect(stateDirCheck!.passed).toBe(false);
    expect(stateDirCheck!.detail).toContain('Missing');

    const workDirCheck = findCheck(checks, 'Work directory');
    expect(workDirCheck).toBeDefined();
    expect(workDirCheck!.passed).toBe(false);

    const hooksDirCheck = findCheck(checks, 'Hooks directory');
    expect(hooksDirCheck).toBeDefined();
    expect(hooksDirCheck!.passed).toBe(false);

    const plansDirCheck = findCheck(checks, 'Plans directory');
    expect(plansDirCheck).toBeDefined();
    expect(plansDirCheck!.passed).toBe(false);
  }, SLOW_TIMEOUT);

  test('skills and MEMORY directories are marked critical', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s5PaiDir });
    const checks = await result.module.runValidation(state);

    const skillsDirCheck = findCheck(checks, 'Skills directory');
    expect(skillsDirCheck).toBeDefined();
    expect(skillsDirCheck!.critical).toBe(true);

    const memoryDirCheck = findCheck(checks, 'Memory directory');
    expect(memoryDirCheck).toBeDefined();
    expect(memoryDirCheck!.critical).toBe(true);

    // Non-critical dirs
    const hooksDirCheck = findCheck(checks, 'Hooks directory');
    expect(hooksDirCheck).toBeDefined();
    expect(hooksDirCheck!.critical).toBe(false);
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 6: ElevenLabs key detection
// =====================================================================================

describe('Installer Engine -- runValidation() ElevenLabs key detection', () => {
  test('ElevenLabs check passes when .env has key in configDir', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s6PaiDir, configDir: s6ConfigDir });
    const checks = await result.module.runValidation(state);

    const elCheck = findCheck(checks, 'ElevenLabs');
    expect(elCheck).toBeDefined();
    expect(elCheck!.passed).toBe(true);
    expect(elCheck!.detail.toLowerCase()).toContain('stored');
  }, SLOW_TIMEOUT);

  test('ElevenLabs check fails when no .env exists', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Use s2PaiDir which has no .env anywhere
    const noEnvConfig = join(tempRoot, 's6-noenv-config');
    mkdirSync(noEnvConfig, { recursive: true });
    const state = buildState({ paiDir: s2PaiDir, configDir: noEnvConfig });
    const checks = await result.module.runValidation(state);

    const elCheck = findCheck(checks, 'ElevenLabs');
    expect(elCheck).toBeDefined();
    expect(elCheck!.passed).toBe(false);
  }, SLOW_TIMEOUT);

  test('ElevenLabs check is not critical', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s6PaiDir, configDir: s6ConfigDir });
    const checks = await result.module.runValidation(state);

    const elCheck = findCheck(checks, 'ElevenLabs');
    expect(elCheck).toBeDefined();
    expect(elCheck!.critical).toBe(false);
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 7: Voice server health check
// =====================================================================================

describe('Installer Engine -- runValidation() voice server health check', () => {
  test('voice server check fails when server is not running', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const voiceCheck = findCheck(checks, 'Voice server');
    expect(voiceCheck).toBeDefined();
    // In CI and test environments, the voice server should not be running
    // so this check should fail with "Not reachable"
    if (!voiceCheck!.passed) {
      expect(voiceCheck!.detail.toLowerCase()).toContain('not reachable');
    }
    // If it happens to be running (local dev), that is also a valid pass
  }, SLOW_TIMEOUT);

  test('voice server check is not critical', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({ paiDir: s1PaiDir, configDir: s1ConfigDir });
    const checks = await result.module.runValidation(state);

    const voiceCheck = findCheck(checks, 'Voice server');
    expect(voiceCheck).toBeDefined();
    expect(voiceCheck!.critical).toBe(false);
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 8: generateSummary() platform behavior
// =====================================================================================

describe('Installer Engine -- generateSummary() platform behavior', () => {
  test('voiceMode is "elevenlabs" when elevenLabsKey is present', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({
      completedSteps: ['voice'],
      collected: { elevenLabsKey: 'sk-test-key-123' },
    });
    const summary = result.module.generateSummary(state);

    expect(summary.voiceMode).toBe('elevenlabs');
  }, SLOW_TIMEOUT);

  test('voiceMode is platform fallback when voice step completed without key', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({
      completedSteps: ['voice'],
      collected: {}, // no elevenLabsKey
    });
    const summary = result.module.generateSummary(state);

    // isWindows in the validate module reads from lib/platform.ts which checks process.platform
    if (IS_NATIVE_WINDOWS) {
      expect(summary.voiceMode).toBe('windows-sapi');
    } else {
      expect(summary.voiceMode).toBe('macos-say');
    }
  }, SLOW_TIMEOUT);

  test('voiceMode is "none" when voice step not completed and no key', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({
      completedSteps: [], // voice step not completed
      collected: {},
    });
    const summary = result.module.generateSummary(state);

    expect(summary.voiceMode).toBe('none');
  }, SLOW_TIMEOUT);

  test('activationCommand contains "pai" on Windows, "source ~/.zshrc" on Unix', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState();
    const summary = result.module.generateSummary(state);

    if (IS_NATIVE_WINDOWS) {
      expect(summary.activationCommand).toContain('pai');
      // On Windows, should NOT contain "source ~/.zshrc"
      expect(summary.activationCommand).not.toContain('source');
    } else {
      expect(summary.activationCommand).toContain('source ~/.zshrc');
      expect(summary.activationCommand).toContain('pai');
    }
  }, SLOW_TIMEOUT);

  test('activationHint is platform-appropriate', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState();
    const summary = result.module.generateSummary(state);

    if (IS_NATIVE_WINDOWS) {
      expect(summary.activationHint.toLowerCase()).toContain('powershell');
    } else {
      expect(summary.activationHint.toLowerCase()).toContain('shell');
    }
  }, SLOW_TIMEOUT);

  test('voiceEnabled reflects completedSteps including "voice"', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const withVoice = buildState({ completedSteps: ['voice'] });
    const withoutVoice = buildState({ completedSteps: [] });

    const summaryWith = result.module.generateSummary(withVoice);
    const summaryWithout = result.module.generateSummary(withoutVoice);

    expect(summaryWith.voiceEnabled).toBe(true);
    expect(summaryWithout.voiceEnabled).toBe(false);
  }, SLOW_TIMEOUT);
});

// =====================================================================================
// Section 9: generateSummary() basic fields
// =====================================================================================

describe('Installer Engine -- generateSummary() basic fields', () => {
  test('paiVersion is "3.0"', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState();
    const summary = result.module.generateSummary(state);

    expect(summary.paiVersion).toBe('3.0');
  }, SLOW_TIMEOUT);

  test('totalSteps is 8', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState();
    const summary = result.module.generateSummary(state);

    expect(summary.totalSteps).toBe(8);
  }, SLOW_TIMEOUT);

  test('principalName comes from collected data with fallback', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const withName = buildState({ collected: { principalName: 'Marcus' } });
    const withoutName = buildState({ collected: {} });

    const summaryWithName = result.module.generateSummary(withName);
    const summaryDefault = result.module.generateSummary(withoutName);

    expect(summaryWithName.principalName).toBe('Marcus');
    expect(summaryDefault.principalName).toBe('User'); // default fallback
  }, SLOW_TIMEOUT);

  test('aiName comes from collected data with fallback', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const withName = buildState({ collected: { aiName: 'Webb' } });
    const withoutName = buildState({ collected: {} });

    const summaryWithName = result.module.generateSummary(withName);
    const summaryDefault = result.module.generateSummary(withoutName);

    expect(summaryWithName.aiName).toBe('Webb');
    expect(summaryDefault.aiName).toBe('PAI'); // default fallback
  }, SLOW_TIMEOUT);

  test('timezone comes from collected data with fallback', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const withTz = buildState({ collected: { timezone: 'America/Chicago' } });
    const withoutTz = buildState({ collected: {} });

    const summaryWithTz = result.module.generateSummary(withTz);
    const summaryDefault = result.module.generateSummary(withoutTz);

    expect(summaryWithTz.timezone).toBe('America/Chicago');
    expect(summaryDefault.timezone).toBe('UTC'); // default fallback
  }, SLOW_TIMEOUT);

  test('completedSteps count matches state', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state = buildState({
      completedSteps: ['system-detect', 'prerequisites', 'identity', 'voice'],
    });
    const summary = result.module.generateSummary(state);

    expect(summary.completedSteps).toBe(4);
  }, SLOW_TIMEOUT);

  test('installType reflects state.installType with fallback', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const freshState = buildState({ installType: 'fresh' });
    const upgradeState = buildState({ installType: 'upgrade' });
    const nullState = buildState({ installType: null });

    const freshSummary = result.module.generateSummary(freshState);
    const upgradeSummary = result.module.generateSummary(upgradeState);
    const nullSummary = result.module.generateSummary(nullState);

    expect(freshSummary.installType).toBe('fresh');
    expect(upgradeSummary.installType).toBe('upgrade');
    // null installType uses fallback "fresh"
    expect(nullSummary.installType).toBe('fresh');
  }, SLOW_TIMEOUT);

  test('catchphrase comes from collected data', async () => {
    const result = await safeImport<ValidateModule>(`${INSTALL_DIR}/engine/validate`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const withCatch = buildState({ collected: { catchphrase: 'Let us think about this long-term' } });
    const withoutCatch = buildState({ collected: {} });

    const summaryWith = result.module.generateSummary(withCatch);
    const summaryWithout = result.module.generateSummary(withoutCatch);

    expect(summaryWith.catchphrase).toBe('Let us think about this long-term');
    expect(summaryWithout.catchphrase).toBe(''); // default fallback
  }, SLOW_TIMEOUT);
});
