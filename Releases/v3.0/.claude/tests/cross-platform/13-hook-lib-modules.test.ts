/**
 * 13-hook-lib-modules.test.ts — Hook Library Module Import Tests (Cross-Platform Suite)
 *
 * Validates all 13 modules in hooks/lib/ can be imported without errors
 * on any platform (macOS, Linux, WSL2, native Windows).
 *
 * For each module:
 *   1. safeImport succeeds (.ok === true)
 *   2. Module exports at least one function or constant (has keys)
 *
 * Modules with known exports get deeper validation:
 *   - paths.ts: getPaiDir(), expandPath()
 *   - tab-constants.ts: TAB_COLORS, PHASE_TAB_CONFIG
 *   - identity.ts: getDAName(), getIdentity()
 *   - time.ts: getPSTTimestamp(), getPSTDate(), getISOTimestamp()
 *   - algorithm-state.ts: readState(), writeState(), phaseTransition()
 *
 * Run: bun test tests/cross-platform/13-hook-lib-modules.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { homedir } from 'os';
import { V3_ROOT, SLOW_TIMEOUT, safeImport } from '../windows/helpers';

// ─── All 13 lib modules ─────────────────────────────────────────────────────

const LIB_MODULES = [
  'paths',
  'stdin',
  'tab-setter',
  'tab-constants',
  'identity',
  'notifications',
  'time',
  'output-validators',
  'metadata-extraction',
  'learning-utils',
  'change-detection',
  'algorithm-state',
  'prd-template',
] as const;

// ─── Section 1: Bulk Import Tests (all 13 modules) ──────────────────────────

describe('Hook lib Module Imports', () => {
  test(`should have exactly 13 modules defined`, () => {
    expect(LIB_MODULES.length).toBe(13);
  });

  for (const moduleName of LIB_MODULES) {
    describe(moduleName, () => {
      test('imports without error', async () => {
        const result = await safeImport(`../../hooks/lib/${moduleName}`);
        expect(result.ok).toBe(true);
        if (!result.ok) {
          console.error(`  Import failed for ${moduleName}: ${result.error}`);
        }
      }, SLOW_TIMEOUT);

      test('exports at least one function or constant', async () => {
        const result = await safeImport<Record<string, unknown>>(`../../hooks/lib/${moduleName}`);
        expect(result.ok).toBe(true);
        if (result.ok) {
          // Filter out __esModule and default if they are the only keys
          const exportKeys = Object.keys(result.module).filter(
            k => k !== '__esModule' && k !== 'default'
          );
          expect(exportKeys.length).toBeGreaterThan(0);
        }
      }, SLOW_TIMEOUT);
    });
  }
});

// ─── Section 2: paths.ts Deep Tests ─────────────────────────────────────────

describe('paths.ts exports', () => {
  test('getPaiDir() returns a non-empty string', async () => {
    const result = await safeImport<{ getPaiDir: () => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const paiDir = result.module.getPaiDir();
      expect(typeof paiDir).toBe('string');
      expect(paiDir.length).toBeGreaterThan(0);
    }
  }, SLOW_TIMEOUT);

  test('expandPath("~/test") returns string containing homedir', async () => {
    const result = await safeImport<{ expandPath: (p: string) => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expanded = result.module.expandPath('~/test');
      expect(typeof expanded).toBe('string');
      const home = homedir();
      expect(expanded).toContain(home);
      expect(expanded).not.toStartWith('~');
    }
  }, SLOW_TIMEOUT);

  test('expandPath("$HOME/test") resolves $HOME', async () => {
    const result = await safeImport<{ expandPath: (p: string) => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const expanded = result.module.expandPath('$HOME/test');
      expect(expanded).toContain(homedir());
      expect(expanded).not.toContain('$HOME');
    }
  }, SLOW_TIMEOUT);

  test('getSettingsPath() returns path ending in settings.json', async () => {
    const result = await safeImport<{ getSettingsPath: () => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const settingsPath = result.module.getSettingsPath();
      expect(settingsPath).toContain('settings.json');
    }
  }, SLOW_TIMEOUT);

  test('sanitizeSessionId strips path traversal characters', async () => {
    const result = await safeImport<{ sanitizeSessionId: (id: string) => string }>('../../hooks/lib/paths');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sanitized = result.module.sanitizeSessionId('../../etc/passwd');
      expect(sanitized).not.toContain('.');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('etcpasswd');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 3: tab-constants.ts Deep Tests ─────────────────────────────────

describe('tab-constants.ts exports', () => {
  test('exports TAB_COLORS with expected keys', async () => {
    const result = await safeImport<{ TAB_COLORS: Record<string, unknown> }>('../../hooks/lib/tab-constants');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const colors = result.module.TAB_COLORS;
      expect(colors).toBeDefined();
      expect(typeof colors).toBe('object');
      // Should have the core tab states
      expect(colors).toHaveProperty('thinking');
      expect(colors).toHaveProperty('working');
      expect(colors).toHaveProperty('completed');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('idle');
    }
  }, SLOW_TIMEOUT);

  test('exports PHASE_TAB_CONFIG with algorithm phases', async () => {
    const result = await safeImport<{ PHASE_TAB_CONFIG: Record<string, unknown> }>('../../hooks/lib/tab-constants');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const config = result.module.PHASE_TAB_CONFIG;
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
      // Should have the 9 algorithm phases
      const phases = ['OBSERVE', 'THINK', 'PLAN', 'BUILD', 'EXECUTE', 'VERIFY', 'LEARN', 'COMPLETE', 'IDLE'];
      for (const phase of phases) {
        expect(config).toHaveProperty(phase);
      }
    }
  }, SLOW_TIMEOUT);

  test('exports ACTIVE_TAB_BG and ACTIVE_TAB_FG as strings', async () => {
    const result = await safeImport<{ ACTIVE_TAB_BG: string; ACTIVE_TAB_FG: string }>('../../hooks/lib/tab-constants');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.module.ACTIVE_TAB_BG).toBe('string');
      expect(typeof result.module.ACTIVE_TAB_FG).toBe('string');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 4: identity.ts Deep Tests ──────────────────────────────────────

describe('identity.ts exports', () => {
  test('getDAName() returns a non-empty string', async () => {
    const result = await safeImport<{ getDAName: () => string }>('../../hooks/lib/identity');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const name = result.module.getDAName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  }, SLOW_TIMEOUT);

  test('getIdentity() returns object with required fields', async () => {
    const result = await safeImport<{ getIdentity: () => Record<string, unknown> }>('../../hooks/lib/identity');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const identity = result.module.getIdentity();
      expect(identity).toHaveProperty('name');
      expect(identity).toHaveProperty('fullName');
      expect(identity).toHaveProperty('displayName');
      expect(identity).toHaveProperty('mainDAVoiceID');
      expect(identity).toHaveProperty('color');
    }
  }, SLOW_TIMEOUT);

  test('getPrincipal() returns object with name and timezone', async () => {
    const result = await safeImport<{ getPrincipal: () => Record<string, unknown> }>('../../hooks/lib/identity');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const principal = result.module.getPrincipal();
      expect(principal).toHaveProperty('name');
      expect(principal).toHaveProperty('timezone');
    }
  }, SLOW_TIMEOUT);

  test('getDefaultIdentity() returns fallback identity', async () => {
    const result = await safeImport<{ getDefaultIdentity: () => Record<string, unknown> }>('../../hooks/lib/identity');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const defaults = result.module.getDefaultIdentity();
      expect(defaults).toHaveProperty('name');
      expect(defaults).toHaveProperty('color');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 5: time.ts Deep Tests ──────────────────────────────────────────

describe('time.ts exports', () => {
  test('getPSTTimestamp() returns a formatted timestamp string', async () => {
    const result = await safeImport<{ getPSTTimestamp: () => string }>('../../hooks/lib/time');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ts = result.module.getPSTTimestamp();
      expect(typeof ts).toBe('string');
      // Format: "YYYY-MM-DD HH:MM:SS TZ"
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} /);
    }
  }, SLOW_TIMEOUT);

  test('getPSTDate() returns YYYY-MM-DD format', async () => {
    const result = await safeImport<{ getPSTDate: () => string }>('../../hooks/lib/time');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const date = result.module.getPSTDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  }, SLOW_TIMEOUT);

  test('getISOTimestamp() returns ISO8601 string with offset', async () => {
    const result = await safeImport<{ getISOTimestamp: () => string }>('../../hooks/lib/time');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const iso = result.module.getISOTimestamp();
      expect(typeof iso).toBe('string');
      // Format: "YYYY-MM-DDTHH:MM:SS+HH:MM" or similar
      expect(iso).toContain('T');
      expect(iso).toMatch(/[+-]\d{2}:\d{2}$/);
    }
  }, SLOW_TIMEOUT);

  test('getYearMonth() returns YYYY-MM format', async () => {
    const result = await safeImport<{ getYearMonth: () => string }>('../../hooks/lib/time');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ym = result.module.getYearMonth();
      expect(ym).toMatch(/^\d{4}-\d{2}$/);
    }
  }, SLOW_TIMEOUT);

  test('getFilenameTimestamp() returns filename-safe format', async () => {
    const result = await safeImport<{ getFilenameTimestamp: () => string }>('../../hooks/lib/time');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const fn = result.module.getFilenameTimestamp();
      // Format: "YYYY-MM-DD-HHMMSS" — no colons or spaces
      expect(fn).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}$/);
      expect(fn).not.toContain(':');
      expect(fn).not.toContain(' ');
    }
  }, SLOW_TIMEOUT);

  test('getTimezoneDisplay() returns a non-empty timezone string', async () => {
    const result = await safeImport<{ getTimezoneDisplay: () => string }>('../../hooks/lib/time');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const tz = result.module.getTimezoneDisplay();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 6: algorithm-state.ts Deep Tests ───────────────────────────────

describe('algorithm-state.ts exports', () => {
  test('exports readState as a function', async () => {
    const result = await safeImport<{ readState: unknown }>('../../hooks/lib/algorithm-state');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.module.readState).toBe('function');
    }
  }, SLOW_TIMEOUT);

  test('exports writeState as a function', async () => {
    const result = await safeImport<{ writeState: unknown }>('../../hooks/lib/algorithm-state');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.module.writeState).toBe('function');
    }
  }, SLOW_TIMEOUT);

  test('exports phaseTransition as a function', async () => {
    const result = await safeImport<{ phaseTransition: unknown }>('../../hooks/lib/algorithm-state');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.module.phaseTransition).toBe('function');
    }
  }, SLOW_TIMEOUT);

  test('exports criteriaAdd and criteriaUpdate as functions', async () => {
    const result = await safeImport<{ criteriaAdd: unknown; criteriaUpdate: unknown }>('../../hooks/lib/algorithm-state');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.module.criteriaAdd).toBe('function');
      expect(typeof result.module.criteriaUpdate).toBe('function');
    }
  }, SLOW_TIMEOUT);

  test('exports algorithmEnd and sweepStaleActive as functions', async () => {
    const result = await safeImport<{ algorithmEnd: unknown; sweepStaleActive: unknown }>('../../hooks/lib/algorithm-state');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.module.algorithmEnd).toBe('function');
      expect(typeof result.module.sweepStaleActive).toBe('function');
    }
  }, SLOW_TIMEOUT);

  test('readState returns null for non-existent session', async () => {
    const result = await safeImport<{ readState: (id: string) => unknown }>('../../hooks/lib/algorithm-state');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const state = result.module.readState('nonexistent-test-session-00000');
      expect(state).toBeNull();
    }
  }, SLOW_TIMEOUT);
});
