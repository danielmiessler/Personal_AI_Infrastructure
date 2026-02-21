/**
 * 14-hook-handlers.test.ts — Hook Handler Import Tests (Cross-Platform Suite)
 *
 * Validates all 7 handlers in hooks/handlers/ can be imported without errors
 * on any platform (macOS, Linux, WSL2, native Windows).
 *
 * For each handler:
 *   1. File exists in HANDLERS_DIR
 *   2. safeImport succeeds (.ok === true)
 *   3. Module has at least one exported function (typeof check)
 *
 * The 7 handlers:
 *   AlgorithmEnrichment  — Algorithm state enrichment on Stop
 *   DocCrossRefIntegrity — Document cross-reference integrity checking
 *   SystemIntegrity      — System integrity maintenance spawner
 *   TabState             — Kitty terminal tab state management
 *   UpdateCounts         — settings.json count updates
 *   VoiceNotification    — Voice server TTS notification
 *   RebuildSkill         — Auto-rebuild SKILL.md from components
 *
 * Run: bun test tests/cross-platform/14-hook-handlers.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  HANDLERS_DIR,
  ALL_HANDLERS,
  V3_ROOT,
  SLOW_TIMEOUT,
  safeImport,
} from '../windows/helpers';

// ─── Expected handlers ───────────────────────────────────────────────────────

const EXPECTED_HANDLERS = [
  'AlgorithmEnrichment.ts',
  'DocCrossRefIntegrity.ts',
  'RebuildSkill.ts',
  'SystemIntegrity.ts',
  'TabState.ts',
  'UpdateCounts.ts',
  'VoiceNotification.ts',
] as const;

// Handler name to its known primary export function name
const HANDLER_PRIMARY_EXPORT: Record<string, string> = {
  'AlgorithmEnrichment':  'handleAlgorithmEnrichment',
  'DocCrossRefIntegrity': 'handleDocCrossRefIntegrity',
  'SystemIntegrity':      'handleSystemIntegrity',
  'TabState':             'handleTabState',
  'UpdateCounts':         'handleUpdateCounts',
  'VoiceNotification':    'handleVoice',
  'RebuildSkill':         'handleRebuildSkill',
};

// ─── Section 1: Handler Registry Validation ──────────────────────────────────

describe('Handler Registry', () => {
  test('ALL_HANDLERS has exactly 7 entries', () => {
    expect(ALL_HANDLERS.length).toBe(7);
  });

  test('ALL_HANDLERS matches expected handler list', () => {
    // ALL_HANDLERS is sorted alphabetically (from helpers.ts readdirSync + sort)
    const expected = [...EXPECTED_HANDLERS].sort();
    expect(ALL_HANDLERS).toEqual(expected);
  });

  test('HANDLERS_DIR points to hooks/handlers/ inside V3_ROOT', () => {
    expect(HANDLERS_DIR).toContain('hooks');
    expect(HANDLERS_DIR).toContain('handlers');
    expect(HANDLERS_DIR.startsWith(V3_ROOT)).toBe(true);
  });
});

// ─── Section 2: Bulk Handler Tests (all 7) ───────────────────────────────────

describe('Handler Imports', () => {
  for (const handlerFile of EXPECTED_HANDLERS) {
    const handlerName = handlerFile.replace('.ts', '');

    describe(handlerName, () => {
      test('file exists in HANDLERS_DIR', () => {
        const fullPath = join(HANDLERS_DIR, handlerFile);
        expect(existsSync(fullPath)).toBe(true);
      });

      test('imports without error', async () => {
        const result = await safeImport(`../../hooks/handlers/${handlerName}`);
        expect(result.ok).toBe(true);
        if (!result.ok) {
          console.error(`  Import failed for ${handlerName}: ${result.error}`);
        }
      }, SLOW_TIMEOUT);

      test('has at least one exported function', async () => {
        const result = await safeImport<Record<string, unknown>>(`../../hooks/handlers/${handlerName}`);
        expect(result.ok).toBe(true);
        if (result.ok) {
          const exportKeys = Object.keys(result.module).filter(
            k => k !== '__esModule' && k !== 'default'
          );
          const hasFunctionExport = exportKeys.some(
            key => typeof result.module[key] === 'function'
          );
          expect(hasFunctionExport).toBe(true);
        }
      }, SLOW_TIMEOUT);
    });
  }
});

// ─── Section 3: Primary Export Verification ──────────────────────────────────

describe('Handler Primary Exports', () => {
  for (const [handlerName, fnName] of Object.entries(HANDLER_PRIMARY_EXPORT)) {
    test(`${handlerName} exports ${fnName}() as a function`, async () => {
      const result = await safeImport<Record<string, unknown>>(`../../hooks/handlers/${handlerName}`);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.module).toHaveProperty(fnName);
        expect(typeof result.module[fnName]).toBe('function');
      }
    }, SLOW_TIMEOUT);
  }
});

// ─── Section 4: Handler File Integrity ───────────────────────────────────────

describe('Handler File Integrity', () => {
  test('no unexpected files in handlers directory', () => {
    // ALL_HANDLERS only includes .ts files (filtered in helpers.ts)
    // Verify there are no extra handler files beyond our expected 7
    for (const file of ALL_HANDLERS) {
      expect(EXPECTED_HANDLERS).toContain(file);
    }
  });

  test('every expected handler is present in ALL_HANDLERS', () => {
    for (const expected of EXPECTED_HANDLERS) {
      expect(ALL_HANDLERS).toContain(expected);
    }
  });

  test('handler files are TypeScript (.ts extension)', () => {
    for (const file of ALL_HANDLERS) {
      expect(file).toMatch(/\.ts$/);
    }
  });
});
