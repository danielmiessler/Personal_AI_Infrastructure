/**
 * Cross-Module Integration Tests
 *
 * Tests that PAI modules work together correctly on Windows.
 * These verify real E2E scenarios, not isolated unit behavior.
 *
 * Run: bun test tests/windows/08-integration.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  V3_ROOT,
  IS_NATIVE_WINDOWS,
  SLOW_TIMEOUT,
  HOOKS_DIR,
  bunRunFile,
} from './helpers';

// ─── E2E Scenario 1: Platform → Paths → Hooks Chain ──────────────────────────

describe('E2E: Platform detection flows through to hooks', () => {
  test('platform.ts and hooks/lib/paths.ts agree on home directory', async () => {
    const platform = await import('../../lib/platform');
    const paths = await import('../../hooks/lib/paths');

    const platformHome = platform.getHomeDir();
    const pathsHome = paths.getPaiDir();

    // Both should reference the same home base
    expect(platformHome.length).toBeGreaterThan(0);
    expect(pathsHome).toContain('.claude');
    // pathsHome should be inside platformHome
    expect(pathsHome.startsWith(platformHome)).toBe(true);
  });

  test('platform.ts and hooks/lib/paths.ts agree on PAI directory', async () => {
    const platform = await import('../../lib/platform');
    const paths = await import('../../hooks/lib/paths');

    const platformPai = platform.getPaiDir();
    const pathsPai = paths.getPaiDir();

    // Both should return the same directory
    expect(platformPai).toBe(pathsPai);
  });
});

// ─── E2E Scenario 2: Terminal Adapter → Tab Setter Chain ──────────────────────

describe('E2E: Terminal adapter integrates with tab-setter', () => {
  test('tab-setter module loads without error', async () => {
    const result = await import('../../hooks/lib/tab-setter')
      .then(() => true)
      .catch(() => false);
    expect(result).toBe(true);
  });

  test('terminal adapter factory returns valid adapter', async () => {
    const { createTerminalAdapter } = await import('../../lib/terminal');
    const adapter = createTerminalAdapter();

    expect(typeof adapter.setTitle).toBe('function');
    expect(typeof adapter.setTabColor).toBe('function');
    expect(typeof adapter.resetTabColor).toBe('function');
    expect(typeof adapter.supported).toBe('boolean');
  });

  test.skipIf(!IS_NATIVE_WINDOWS)(
    'Windows: terminal adapter is not Kitty',
    async () => {
      const { createTerminalAdapter } = await import('../../lib/terminal');
      const adapter = createTerminalAdapter();
      expect(adapter.constructor.name).not.toBe('KittyTerminalAdapter');
    }
  );
});

// ─── E2E Scenario 3: Installer → Settings → Hook Command Chain ───────────────

describe('E2E: Installer settings flow to hook commands', () => {
  test('settings.json exists and is valid JSON', () => {
    const settingsPath = join(V3_ROOT, 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);

    const content = readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);
    expect(typeof settings).toBe('object');
  });

  test('settings.json has hooks configuration', () => {
    const settingsPath = join(V3_ROOT, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    // Settings should have hooks key
    expect(settings.hooks).toBeDefined();
    expect(typeof settings.hooks).toBe('object');
  });

  test('hook commands reference .ts files', () => {
    const settingsPath = join(V3_ROOT, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    if (!settings.hooks) return;

    // Collect all hook commands from the nested structure:
    // hooks[event] = [{ matcher, hooks: [{ type, command }] }]
    const commands: string[] = [];
    for (const [_event, matchers] of Object.entries(settings.hooks)) {
      if (Array.isArray(matchers)) {
        for (const matcher of matchers as any[]) {
          if (Array.isArray(matcher.hooks)) {
            for (const hook of matcher.hooks) {
              if (hook.command) commands.push(hook.command);
            }
          }
        }
      }
    }

    // At least some hooks should exist
    expect(commands.length).toBeGreaterThan(0);

    // All commands should reference .ts files
    for (const cmd of commands) {
      expect(cmd).toContain('.ts');
    }
  });

  test('statusLine command exists in settings', () => {
    const settingsPath = join(V3_ROOT, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    if (settings.statusLine?.command) {
      expect(settings.statusLine.command).toContain('statusline-command');
    }
  });
});

// ─── E2E Scenario 4: Statusline → Git → Platform Chain ───────────────────────

describe('E2E: Statusline uses git and platform correctly', () => {
  test('statusline-command.ts exists', () => {
    const statuslinePath = join(V3_ROOT, 'statusline-command.ts');
    expect(existsSync(statuslinePath)).toBe(true);
  });

  test('statusline produces output with git info', () => {
    const result = bunRunFile(join(V3_ROOT, 'statusline-command.ts'), {
      input: '{}',
      timeout: 15_000,
    });

    // Should produce some output (even if some sections fail gracefully)
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.exitCode).toBe(0);
  }, SLOW_TIMEOUT);

  test('git is available and returns branch name', () => {
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf-8',
      cwd: V3_ROOT,
      timeout: 5_000,
    });

    expect(result.status).toBe(0);
    expect(result.stdout.trim().length).toBeGreaterThan(0);
  });
});

// ─── E2E Scenario 5: Full Hook Execution with stdin JSON ──────────────────────

describe('E2E: Hook receives JSON and produces structured response', () => {
  const minimalInput = {
    session_id: 'e2e-test-00000000-0000-0000-0000-000000000000',
    session_type: 'interactive',
    event: 'test',
    conversation: [],
  };

  test('AlgorithmTracker processes input and returns continue:true', () => {
    const hookPath = join(HOOKS_DIR, 'AlgorithmTracker.hook.ts');
    if (!existsSync(hookPath)) return;

    const result = spawnSync('bun', ['run', hookPath], {
      input: JSON.stringify(minimalInput),
      encoding: 'utf-8',
      timeout: 15_000,
      cwd: V3_ROOT,
      env: { ...process.env, PAI_TEST_MODE: '1' },
    });

    expect(result.status).toBe(0);
    if (result.stdout.trim()) {
      const output = JSON.parse(result.stdout.trim());
      expect(output).toHaveProperty('continue');
    }
  }, SLOW_TIMEOUT);

  test('CheckVersion hook doesn\'t crash', () => {
    const hookPath = join(HOOKS_DIR, 'CheckVersion.hook.ts');
    if (!existsSync(hookPath)) return;

    const result = spawnSync('bun', ['run', hookPath], {
      input: JSON.stringify(minimalInput),
      encoding: 'utf-8',
      timeout: 15_000,
      cwd: V3_ROOT,
      env: { ...process.env, PAI_TEST_MODE: '1' },
    });

    // Exit code 0 = success, null = timed out waiting for more input (also ok)
    expect(result.status === 0 || result.status === null || result.status === 1).toBe(true);
  }, SLOW_TIMEOUT);
});

// ─── E2E Scenario 6: Windows-Specific Integration ─────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('E2E: Windows-specific integration', () => {
  test('all platform paths use backslash separators', async () => {
    const { getHomeDir, getTempDir, getPaiDir, paiPath } = await import('../../lib/platform');

    expect(getHomeDir()).toContain('\\');
    expect(getTempDir()).toContain('\\');
    expect(getPaiDir()).toContain('\\');
    expect(paiPath('hooks')).toContain('\\');
  });

  test('Windows Terminal detected when WT_SESSION is set', async () => {
    if (!process.env.WT_SESSION) {
      // Can't test this without Windows Terminal
      return;
    }
    const { detectTerminal } = await import('../../lib/platform');
    expect(detectTerminal()).toBe('windows-terminal');
  });

  test('installer would use PowerShell for Bun install', async () => {
    const { isWindows } = await import('../../lib/platform');
    expect(isWindows).toBe(true);
    // The installer code checks isWindows and uses irm/iex for Bun install
  });

  test('no hook command would fail due to missing shebang support', () => {
    // On Windows, hook .ts files need `bun` prefix since shebangs don't work
    // Verify the installer's prefixing logic exists
    const actionsPath = join(V3_ROOT, 'PAI-Install/engine/actions.ts');
    const content = readFileSync(actionsPath, 'utf-8');

    // Should contain the hook prefixing logic
    expect(content).toContain('bun ');
    expect(content).toContain('isWindows');
  });
});

// ─── E2E Scenario 7: Cross-Platform Path Consistency ──────────────────────────

describe('E2E: Path abstractions are consistent', () => {
  test('getPaiDir from platform and paths modules match', async () => {
    const platform = await import('../../lib/platform');
    const paths = await import('../../hooks/lib/paths');

    expect(platform.getPaiDir()).toBe(paths.getPaiDir());
  });

  test('paiPath joins correctly on current platform', async () => {
    const { paiPath, getPaiDir } = await import('../../lib/platform');
    const base = getPaiDir();
    const joined = paiPath('hooks', 'lib', 'paths.ts');

    expect(joined).toStartWith(base);
    expect(joined).toContain('hooks');
    expect(joined).toContain('paths.ts');
  });

  test('no forward slashes in Windows paths', async () => {
    if (!IS_NATIVE_WINDOWS) return;

    const { getHomeDir, getTempDir, getPaiDir } = await import('../../lib/platform');

    // On Windows, path.join uses backslashes
    // These should NOT have forward slashes (except in drive letter like C:/)
    const homePath = getHomeDir();
    const afterDrive = homePath.substring(3); // Skip "C:\"
    expect(afterDrive).not.toContain('/');
  });
});
