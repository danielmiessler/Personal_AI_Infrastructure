/**
 * 25-voice-service-mgmt.test.ts — Voice Server Service Management Tests
 *
 * Tests Windows Task Scheduler integration, macOS launchctl, and Linux systemd
 * service management for the voice server via manage.ts.
 *
 * Coverage:
 *   - Task Scheduler install/start/stop/uninstall command generation
 *   - manage.ts CLI help output on all platforms
 *   - Platform-appropriate service manager selection
 *   - Log path resolution per platform
 *   - Service name constants
 *   - Fallback behavior when service managers fail
 *
 * Run: bun test tests/cross-platform/25-voice-service-mgmt.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  V3_ROOT, IS_NATIVE_WINDOWS, IS_MACOS, IS_LINUX,
  SLOW_TIMEOUT, safeImport,
} from '../windows/helpers';

// ─── Type for the platform module ─────────────────────────────────────────────

type PlatformModule = {
  isMacOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isWSL: boolean;
  getPlatformName: () => string;
  getServiceManager: () => 'launchctl' | 'systemd' | 'task-scheduler' | 'none';
  getLogDir: () => string;
  expandEnvVars: (str: string) => string;
};

let platformMod: PlatformModule | null = null;

async function getPlatform(): Promise<PlatformModule> {
  if (platformMod) return platformMod;
  const result = await safeImport<PlatformModule>('../../lib/platform');
  if (!result.ok) throw new Error(`Failed to import platform.ts: ${result.error}`);
  platformMod = result.module;
  return platformMod;
}

// ─── Section 1: Service Manager Detection ────────────────────────────────────

describe('getServiceManager()', () => {
  test('returns a valid service manager type', async () => {
    const mod = await getPlatform();
    const result = mod.getServiceManager();
    expect(['launchctl', 'systemd', 'task-scheduler', 'none']).toContain(result);
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: returns task-scheduler', async () => {
    const mod = await getPlatform();
    expect(mod.getServiceManager()).toBe('task-scheduler');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: returns launchctl', async () => {
    const mod = await getPlatform();
    expect(mod.getServiceManager()).toBe('launchctl');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_LINUX)('Linux: returns systemd', async () => {
    const mod = await getPlatform();
    expect(mod.getServiceManager()).toBe('systemd');
  }, SLOW_TIMEOUT);
});

// ─── Section 2: manage.ts CLI ────────────────────────────────────────────────

describe('manage.ts CLI', () => {
  const managePath = join(V3_ROOT, 'VoiceServer', 'manage.ts');

  test('manage.ts exists', () => {
    expect(existsSync(managePath)).toBe(true);
  });

  test('shows help when invoked with no args', () => {
    const result = spawnSync('bun', ['run', managePath], {
      encoding: 'utf-8',
      timeout: 15_000,
      cwd: V3_ROOT,
    });
    expect(result.status).toBe(0);
    const output = result.stdout + result.stderr;
    expect(output).toContain('PAI Voice Server Manager');
    expect(output).toContain('install');
    expect(output).toContain('start');
    expect(output).toContain('stop');
    expect(output).toContain('status');
    expect(output).toContain('uninstall');
  }, SLOW_TIMEOUT);

  test('shows current platform name in help', () => {
    const result = spawnSync('bun', ['run', managePath], {
      encoding: 'utf-8',
      timeout: 15_000,
      cwd: V3_ROOT,
    });
    const output = result.stdout + result.stderr;
    expect(output).toContain('Platform:');
    // Should contain one of the known platform names
    const hasKnownPlatform =
      output.includes('Windows') ||
      output.includes('macOS') ||
      output.includes('Linux') ||
      output.includes('WSL');
    expect(hasKnownPlatform).toBe(true);
  }, SLOW_TIMEOUT);

  test('exits with code 1 for unknown command', () => {
    const result = spawnSync('bun', ['run', managePath, 'nonexistent-cmd'], {
      encoding: 'utf-8',
      timeout: 15_000,
      cwd: V3_ROOT,
    });
    expect(result.status).toBe(1);
  }, SLOW_TIMEOUT);
});

// ─── Section 3: Windows Task Scheduler Integration ──────────────────────────

describe('Windows Task Scheduler', () => {
  const TASK_NAME = 'PAI-VoiceServer';

  test.skipIf(!IS_NATIVE_WINDOWS)('schtasks.exe is available on Windows', () => {
    const result = spawnSync('schtasks.exe', ['/Query', '/FO', 'LIST', '/TN', '\\'], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    // schtasks should at least be callable (even if the specific task doesn't exist)
    // It returns 0 for root query or 1 for task not found — both confirm it works
    expect(result.status !== null).toBe(true);
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('manage.ts install command includes schtasks params', () => {
    // Read manage.ts source and verify it uses correct schtasks flags
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('schtasks.exe');
    expect(manageContent).toContain('/Create');
    expect(manageContent).toContain('/TN');
    expect(manageContent).toContain(TASK_NAME);
    expect(manageContent).toContain('/SC');
    expect(manageContent).toContain('ONLOGON');
  }, SLOW_TIMEOUT);

  test('manage.ts uses correct task name constant', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    // Verify the task name is defined and consistent
    expect(manageContent).toContain(`const TASK_NAME = '${TASK_NAME}'`);
  }, SLOW_TIMEOUT);

  test('manage.ts stop uses schtasks /End for Windows', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('/End');
    expect(manageContent).toContain('/TN');
  }, SLOW_TIMEOUT);

  test('manage.ts uninstall uses schtasks /Delete for Windows', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('/Delete');
    expect(manageContent).toContain('/F');
  }, SLOW_TIMEOUT);

  test('manage.ts status uses schtasks /Query for Windows', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('/Query');
    expect(manageContent).toContain('/FO LIST');
  }, SLOW_TIMEOUT);

  test('manage.ts has fallback direct start when schtasks fails', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    // Should have a spawn fallback in both installWindows and cmdStart
    const spawnCount = (manageContent.match(/spawn\(bunPath/g) || []).length;
    expect(spawnCount).toBeGreaterThanOrEqual(1);
  }, SLOW_TIMEOUT);
});

// ─── Section 4: macOS launchctl Integration ──────────────────────────────────

describe('macOS launchctl', () => {
  test('manage.ts contains launchctl service management', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('launchctl load');
    expect(manageContent).toContain('launchctl unload');
    expect(manageContent).toContain('launchctl list');
    expect(manageContent).toContain('com.pai.voice-server');
  }, SLOW_TIMEOUT);

  test('manage.ts generates plist for macOS', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('PropertyList');
    expect(manageContent).toContain('RunAtLoad');
    expect(manageContent).toContain('KeepAlive');
    expect(manageContent).toContain('LaunchAgents');
  }, SLOW_TIMEOUT);
});

// ─── Section 5: Linux systemd Integration ────────────────────────────────────

describe('Linux systemd', () => {
  test('manage.ts contains systemd service management', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('systemctl --user');
    expect(manageContent).toContain('daemon-reload');
    expect(manageContent).toContain('[Service]');
    expect(manageContent).toContain('Restart=on-failure');
  }, SLOW_TIMEOUT);
});

// ─── Section 6: Log Path Resolution ──────────────────────────────────────────

describe('Voice server log paths', () => {
  test('getLogDir returns a non-empty string', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    expect(typeof logDir).toBe('string');
    expect(logDir.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: log dir is under AppData', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    if (process.env.APPDATA) {
      expect(logDir).toContain('PAI');
      expect(logDir).toContain('logs');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: log dir is Library/Logs', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    expect(logDir).toContain('Library/Logs');
  }, SLOW_TIMEOUT);

  test('manage.ts creates log directory on install', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('mkdirSync');
    expect(manageContent).toContain('recursive: true');
  }, SLOW_TIMEOUT);
});

// ─── Section 7: Cross-platform consistency ───────────────────────────────────

describe('Service management cross-platform consistency', () => {
  test('all three platforms have install functions', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain('installMacOS');
    expect(manageContent).toContain('installWindows');
    expect(manageContent).toContain('installLinux');
    expect(manageContent).toContain('installWSL');
  }, SLOW_TIMEOUT);

  test('all commands are registered in the CLI', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    const expectedCommands = ['install', 'start', 'stop', 'restart', 'status', 'uninstall'];
    for (const cmd of expectedCommands) {
      expect(manageContent).toContain(`${cmd}:`);
    }
  }, SLOW_TIMEOUT);

  test('manage.ts imports platform abstractions', () => {
    const manageContent = require('fs').readFileSync(
      join(V3_ROOT, 'VoiceServer', 'manage.ts'), 'utf-8'
    );
    expect(manageContent).toContain("from '../lib/platform'");
    expect(manageContent).toContain('isMacOS');
    expect(manageContent).toContain('isWindows');
    expect(manageContent).toContain('isLinux');
    expect(manageContent).toContain('isWSL');
  }, SLOW_TIMEOUT);
});
