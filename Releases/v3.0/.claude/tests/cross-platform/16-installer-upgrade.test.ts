/**
 * 16-installer-upgrade.test.ts — Installer Upgrade Configuration Tests (Cross-Platform)
 *
 * Tests configuration generation for upgrade scenarios:
 *   - PROJECTS_DIR normalization via path.resolve()
 *   - PAI_DIR faithfully passes through from config
 *   - Identity fields (principalName, aiName) map to correct output keys
 *   - Generated config includes hooks-related context
 *   - Determinism: same input always produces identical output structure
 *
 * These tests exercise generateSettingsJson() with various PAIConfig inputs
 * to validate the config generator handles edge cases correctly on all platforms.
 * No disk writes, no network calls.
 *
 * Run: bun test tests/cross-platform/16-installer-upgrade.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { V3_ROOT, INSTALL_DIR, SLOW_TIMEOUT } from '../windows/helpers';
import { resolve } from 'path';
import { homedir } from 'os';

// ─── Type alias for dynamic import ───────────────────────────────────────────

type ConfigGenModule = {
  generateSettingsJson: (config: Record<string, any>) => Record<string, any>;
};

// ─── Shared test config ──────────────────────────────────────────────────────

const baseConfig = {
  principalName: 'UpgradeTestUser',
  timezone: 'Europe/London',
  aiName: 'UpgradeAI',
  catchphrase: 'Upgrading systems',
  paiDir: resolve(homedir(), '.claude'),
  configDir: resolve(homedir(), '.config', 'PAI'),
};

// ─── Section 1: PROJECTS_DIR Normalization ───────────────────────────────────

describe('Upgrade Config — PROJECTS_DIR Normalization', () => {
  test('projectsDir with backslashes is resolved via path.resolve()', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const config = { ...baseConfig, projectsDir: 'C:\\Users\\test\\code' };
    const settings = result.generateSettingsJson(config);

    // path.resolve() normalizes the path for the current platform
    const expected = resolve('C:\\Users\\test\\code');
    expect(settings.env.PROJECTS_DIR).toBe(expected);
  }, SLOW_TIMEOUT);
});

// ─── Section 2: PAI_DIR Pass-Through ─────────────────────────────────────────

describe('Upgrade Config — PAI_DIR Uses Provided Path', () => {
  test('PAI_DIR in output matches paiDir from config input', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const customPaiDir = '/custom/path/.claude';
    const config = { ...baseConfig, paiDir: customPaiDir };
    const settings = result.generateSettingsJson(config);

    expect(settings.env.PAI_DIR).toBe(customPaiDir);
  }, SLOW_TIMEOUT);
});

// ─── Section 3: Identity Population ──────────────────────────────────────────

describe('Upgrade Config — Identity Population', () => {
  test('principalName maps to principal.name', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const settings = result.generateSettingsJson(baseConfig);

    expect(settings.principal).toBeDefined();
    expect(settings.principal.name).toBe(baseConfig.principalName);
  }, SLOW_TIMEOUT);

  test('aiName maps to daidentity.name', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const settings = result.generateSettingsJson(baseConfig);

    expect(settings.daidentity).toBeDefined();
    expect(settings.daidentity.name).toBe(baseConfig.aiName);
  }, SLOW_TIMEOUT);

  test('timezone maps to principal.timezone', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const settings = result.generateSettingsJson(baseConfig);

    expect(settings.principal.timezone).toBe(baseConfig.timezone);
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Context Files Section ────────────────────────────────────────

describe('Upgrade Config — Context Files Present', () => {
  test('generated config has contextFiles array', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const settings = result.generateSettingsJson(baseConfig);

    expect(settings.contextFiles).toBeDefined();
    expect(Array.isArray(settings.contextFiles)).toBe(true);
    expect(settings.contextFiles.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('contextFiles references skill files', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;
    const settings = result.generateSettingsJson(baseConfig);

    // At minimum, the PAI SKILL.md should be referenced
    const hasSkillRef = settings.contextFiles.some(
      (f: string) => f.includes('skills/PAI/SKILL.md')
    );
    expect(hasSkillRef).toBe(true);
  }, SLOW_TIMEOUT);
});

// ─── Section 5: Determinism ──────────────────────────────────────────────────

describe('Upgrade Config — Determinism', () => {
  test('calling generateSettingsJson twice with same input produces identical output', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;

    const settings1 = result.generateSettingsJson(baseConfig);
    const settings2 = result.generateSettingsJson(baseConfig);

    // Compare JSON serialization to check structural equality
    // Exclude any timestamp-like fields that might differ
    const json1 = JSON.stringify(settings1, null, 2);
    const json2 = JSON.stringify(settings2, null, 2);

    expect(json1).toBe(json2);
  }, SLOW_TIMEOUT);

  test('two calls produce objects with identical key sets', async () => {
    const result = await import(`${INSTALL_DIR}/engine/config-gen`) as ConfigGenModule;

    const settings1 = result.generateSettingsJson(baseConfig);
    const settings2 = result.generateSettingsJson(baseConfig);

    expect(Object.keys(settings1).sort()).toEqual(Object.keys(settings2).sort());
    expect(Object.keys(settings1.env).sort()).toEqual(Object.keys(settings2.env).sort());
    expect(Object.keys(settings1.principal).sort()).toEqual(Object.keys(settings2.principal).sort());
    expect(Object.keys(settings1.daidentity).sort()).toEqual(Object.keys(settings2.daidentity).sort());
    expect(Object.keys(settings1.pai).sort()).toEqual(Object.keys(settings2.pai).sort());
  }, SLOW_TIMEOUT);
});
