/**
 * 23-platform-gaps.test.ts — Platform.ts Remaining Gap Coverage
 *
 * Tests all exported functions/constants from lib/platform.ts that are
 * NOT already covered by existing cross-platform tests (11-20).
 *
 * Covered gaps:
 *   - getLogDir()              — platform-specific log directory
 *   - isWSL                    — WSL detection constant
 *   - getKillByPatternCommand  — kill-by-pattern shell string
 *   - getDeleteFileCommand     — file deletion { command, args }
 *   - getLocalTTSCommand       — local text-to-speech command
 *   - getPortCheckCommand      — port check { command, args }
 *   - getHomeDir               — home directory fallback chain
 *   - getConfigDir             — config directory platform behavior
 *   - isKittyAvailable         — Kitty terminal detection
 *   - getKittySocketPath       — Kitty socket resolution
 *   - getTempFilePath          — temp file path generation
 *   - pathSeparator            — platform path separator constant
 *
 * Run: bun test tests/cross-platform/23-platform-gaps.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { sep } from 'path';
import {
  V3_ROOT, IS_NATIVE_WINDOWS, IS_MACOS, IS_LINUX,
  SLOW_TIMEOUT, safeImport, isAbsolutePath,
} from '../windows/helpers';

// ─── Type for the platform module ─────────────────────────────────────────────

type PlatformModule = {
  getLogDir: () => string;
  isWSL: boolean;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  getKillByPatternCommand: (pattern: string) => string;
  getDeleteFileCommand: (filePath: string) => { command: string; args: string[] };
  getLocalTTSCommand: (text: string, voiceName?: string) => { command: string; args: string[] } | null;
  getPortCheckCommand: (port: number) => { command: string; args: string[] };
  getHomeDir: () => string;
  getConfigDir: () => string;
  isKittyAvailable: () => boolean;
  getKittySocketPath: () => string | null;
  getTempFilePath: (prefix: string, extension: string) => string;
  pathSeparator: string;
  getPlatformName: () => string;
  platform: NodeJS.Platform;
};

// ─── Shared import ────────────────────────────────────────────────────────────

let platformMod: PlatformModule | null = null;
let importError: string | null = null;

// Helper to get the module (imported once, cached)
async function getPlatform(): Promise<PlatformModule> {
  if (platformMod) return platformMod;
  const result = await safeImport<PlatformModule>('../../lib/platform');
  if (!result.ok) {
    importError = result.error;
    throw new Error(`Failed to import platform.ts: ${result.error}`);
  }
  platformMod = result.module;
  return platformMod;
}

// ─── Section 1: getLogDir() ──────────────────────────────────────────────────

describe('getLogDir()', () => {
  test('returns a non-empty string', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    expect(typeof logDir).toBe('string');
    expect(logDir.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('returns an absolute path', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    expect(isAbsolutePath(logDir)).toBe(true);
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: contains Library/Logs', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    expect(logDir).toContain('Library/Logs');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_LINUX)('Linux: contains .local/share path segment', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    expect(logDir).toContain('.local/share');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: contains AppData or home directory', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    const home = mod.getHomeDir();
    // On Windows with APPDATA set, uses APPDATA/PAI/logs
    // Otherwise falls through to the Linux/default path which still contains home
    const containsAppData = logDir.includes('AppData');
    const containsHome = logDir.startsWith(home);
    expect(containsAppData || containsHome).toBe(true);
  }, SLOW_TIMEOUT);
});

// ─── Section 2: isWSL ─────────────────────────────────────────────────────────

describe('isWSL', () => {
  test('is a boolean', async () => {
    const mod = await getPlatform();
    expect(typeof mod.isWSL).toBe('boolean');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows native: isWSL is false', async () => {
    const mod = await getPlatform();
    expect(mod.isWSL).toBe(false);
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: isWSL is false', async () => {
    const mod = await getPlatform();
    expect(mod.isWSL).toBe(false);
  }, SLOW_TIMEOUT);

  test('isWSL detection aligns with environment variables', async () => {
    const mod = await getPlatform();
    const hasWslEnv = !!(process.env.WSL_DISTRO_NAME || process.env.WSLENV);
    const hasWslPath = (process.env.PATH || '').includes('/mnt/c/');
    if (mod.isLinux && (hasWslEnv || hasWslPath)) {
      // If we detect WSL env indicators and we are on Linux, isWSL should be true
      expect(mod.isWSL).toBe(true);
    }
    if (!mod.isLinux) {
      // If not Linux, isWSL must be false regardless of env vars
      expect(mod.isWSL).toBe(false);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 3: getKillByPatternCommand() ─────────────────────────────────────

describe('getKillByPatternCommand()', () => {
  test('returns a non-empty string', async () => {
    const mod = await getPlatform();
    const cmd = mod.getKillByPatternCommand('bun');
    expect(typeof cmd).toBe('string');
    expect(cmd.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('pattern appears in the returned command string', async () => {
    const mod = await getPlatform();
    const cmd = mod.getKillByPatternCommand('my-test-process');
    expect(cmd).toContain('my-test-process');
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: contains pkill', async () => {
    const mod = await getPlatform();
    const cmd = mod.getKillByPatternCommand('bun');
    expect(cmd).toContain('pkill');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: contains taskkill', async () => {
    const mod = await getPlatform();
    const cmd = mod.getKillByPatternCommand('bun');
    expect(cmd).toContain('taskkill');
  }, SLOW_TIMEOUT);

  test('handles patterns with special characters gracefully', async () => {
    const mod = await getPlatform();
    const cmd = mod.getKillByPatternCommand('bun serve --port 8888');
    expect(typeof cmd).toBe('string');
    expect(cmd).toContain('bun serve --port 8888');
  }, SLOW_TIMEOUT);
});

// ─── Section 4: getDeleteFileCommand() ────────────────────────────────────────

describe('getDeleteFileCommand()', () => {
  test('returns { command, args } object', async () => {
    const mod = await getPlatform();
    const result = mod.getDeleteFileCommand('/tmp/test-file.txt');
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(typeof result.command).toBe('string');
    expect(Array.isArray(result.args)).toBe(true);
  }, SLOW_TIMEOUT);

  test('file path appears in args', async () => {
    const mod = await getPlatform();
    const testPath = '/tmp/pai-delete-test.txt';
    const result = mod.getDeleteFileCommand(testPath);
    const argsJoined = result.args.join(' ');
    expect(argsJoined).toContain(testPath);
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: uses rm command', async () => {
    const mod = await getPlatform();
    const result = mod.getDeleteFileCommand('/tmp/test.txt');
    expect(result.command).toBe('rm');
    expect(result.args).toContain('-f');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: uses cmd.exe with del', async () => {
    const mod = await getPlatform();
    const result = mod.getDeleteFileCommand('C:\\temp\\test.txt');
    expect(result.command).toBe('cmd.exe');
    expect(result.args).toContain('/c');
    expect(result.args).toContain('del');
  }, SLOW_TIMEOUT);
});

// ─── Section 5: getLocalTTSCommand() ──────────────────────────────────────────

describe('getLocalTTSCommand()', () => {
  test('returns object or null', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Hello world');
    if (result !== null) {
      expect(typeof result).toBe('object');
      expect(typeof result.command).toBe('string');
      expect(Array.isArray(result.args)).toBe(true);
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: uses /usr/bin/say', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Test speech');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.command).toBe('/usr/bin/say');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: text appears in args', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Hello from tests');
    expect(result).not.toBeNull();
    if (result) {
      const argsJoined = result.args.join(' ');
      expect(argsJoined).toContain('Hello from tests');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: voiceName parameter adds -v flag', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Test', 'Samantha');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.args).toContain('-v');
      expect(result.args).toContain('Samantha');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: uses powershell.exe with System.Speech', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Hello Windows');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.command).toBe('powershell.exe');
      const argsJoined = result.args.join(' ');
      expect(argsJoined).toContain('System.Speech');
      expect(argsJoined).toContain('SpeechSynthesizer');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: voiceName adds SelectVoice call', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Test', 'David');
    expect(result).not.toBeNull();
    if (result) {
      const argsJoined = result.args.join(' ');
      expect(argsJoined).toContain('SelectVoice');
      expect(argsJoined).toContain('David');
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_LINUX)('Linux: uses espeak command', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('Linux test');
    expect(result).not.toBeNull();
    if (result) {
      expect(result.command).toBe('espeak');
    }
  }, SLOW_TIMEOUT);

  test('sanitizes dangerous characters from text', async () => {
    const mod = await getPlatform();
    const result = mod.getLocalTTSCommand('test`$(whoami)\'evil"stuff\\bad');
    // Should not crash, and dangerous chars should be stripped
    if (result !== null) {
      const argsJoined = result.args.join(' ');
      expect(argsJoined).not.toContain('$(');
      expect(argsJoined).not.toContain('`');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 6: getPortCheckCommand() ─────────────────────────────────────────

describe('getPortCheckCommand()', () => {
  test('returns { command, args } object', async () => {
    const mod = await getPlatform();
    const result = mod.getPortCheckCommand(8080);
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(typeof result.command).toBe('string');
    expect(Array.isArray(result.args)).toBe(true);
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: uses lsof', async () => {
    const mod = await getPlatform();
    const result = mod.getPortCheckCommand(3000);
    expect(result.command).toBe('lsof');
    // Port should appear in args as part of the :port pattern
    const argsJoined = result.args.join(' ');
    expect(argsJoined).toContain(':3000');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: uses netstat', async () => {
    const mod = await getPlatform();
    const result = mod.getPortCheckCommand(8888);
    expect(result.command).toBe('netstat');
    expect(result.args).toContain('-ano');
  }, SLOW_TIMEOUT);

  test('args is a non-empty array', async () => {
    const mod = await getPlatform();
    const result = mod.getPortCheckCommand(9999);
    expect(result.args.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);
});

// ─── Section 7: getHomeDir() fallback chain ───────────────────────────────────

describe('getHomeDir()', () => {
  test('returns a non-empty string', async () => {
    const mod = await getPlatform();
    const home = mod.getHomeDir();
    expect(typeof home).toBe('string');
    expect(home.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('returns an absolute path', async () => {
    const mod = await getPlatform();
    const home = mod.getHomeDir();
    expect(isAbsolutePath(home)).toBe(true);
  }, SLOW_TIMEOUT);

  test('when HOME is set, returns HOME value', async () => {
    // On Unix systems (Linux/macOS/WSL), HOME is always set
    if (process.env.HOME) {
      const mod = await getPlatform();
      const home = mod.getHomeDir();
      expect(home).toBe(process.env.HOME);
    }
  }, SLOW_TIMEOUT);

  test('result is consistent across multiple calls', async () => {
    const mod = await getPlatform();
    const home1 = mod.getHomeDir();
    const home2 = mod.getHomeDir();
    expect(home1).toBe(home2);
  }, SLOW_TIMEOUT);
});

// ─── Section 8: getConfigDir() ───────────────────────────────────────────────

describe('getConfigDir()', () => {
  test('returns a non-empty string', async () => {
    const mod = await getPlatform();
    const configDir = mod.getConfigDir();
    expect(typeof configDir).toBe('string');
    expect(configDir.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('returns an absolute path', async () => {
    const mod = await getPlatform();
    const configDir = mod.getConfigDir();
    expect(isAbsolutePath(configDir)).toBe(true);
  }, SLOW_TIMEOUT);

  test('contains PAI in the path', async () => {
    const mod = await getPlatform();
    const configDir = mod.getConfigDir();
    expect(configDir).toContain('PAI');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows with APPDATA: uses APPDATA-based path', async () => {
    const mod = await getPlatform();
    if (process.env.APPDATA) {
      const configDir = mod.getConfigDir();
      expect(configDir).toContain(process.env.APPDATA);
    }
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: uses .config/PAI under home', async () => {
    const mod = await getPlatform();
    // Only test default behavior when PAI_CONFIG_DIR is not overriding
    if (!process.env.PAI_CONFIG_DIR) {
      const configDir = mod.getConfigDir();
      expect(configDir).toContain('.config');
      expect(configDir).toContain('PAI');
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 9: isKittyAvailable() ───────────────────────────────────────────

describe('isKittyAvailable()', () => {
  test('returns a boolean', async () => {
    const mod = await getPlatform();
    const result = mod.isKittyAvailable();
    expect(typeof result).toBe('boolean');
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: always returns false', async () => {
    const mod = await getPlatform();
    expect(mod.isKittyAvailable()).toBe(false);
  }, SLOW_TIMEOUT);

  test('without KITTY env vars: returns false', async () => {
    // In CI and most test environments, Kitty is not running
    if (!process.env.KITTY_WINDOW_ID && !process.env.KITTY_LISTEN_ON && process.env.TERM !== 'xterm-kitty') {
      const mod = await getPlatform();
      expect(mod.isKittyAvailable()).toBe(false);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 10: getKittySocketPath() ────────────────────────────────────────

describe('getKittySocketPath()', () => {
  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: returns null', async () => {
    const mod = await getPlatform();
    expect(mod.getKittySocketPath()).toBeNull();
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: returns a string', async () => {
    const mod = await getPlatform();
    const result = mod.getKittySocketPath();
    // On Unix, it always returns a string (either from env or the default path)
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: result starts with unix:', async () => {
    const mod = await getPlatform();
    const result = mod.getKittySocketPath();
    if (result && !process.env.KITTY_LISTEN_ON) {
      // Default fallback path starts with unix:
      expect(result).toMatch(/^unix:/);
    }
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix with KITTY_LISTEN_ON: uses env value', async () => {
    if (process.env.KITTY_LISTEN_ON) {
      const mod = await getPlatform();
      const result = mod.getKittySocketPath();
      expect(result).toBe(process.env.KITTY_LISTEN_ON);
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 11: getTempFilePath() ───────────────────────────────────────────

describe('getTempFilePath()', () => {
  test('returns a non-empty string', async () => {
    const mod = await getPlatform();
    const result = mod.getTempFilePath('test', '.txt');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  test('result starts with the platform temp directory', async () => {
    const { tmpdir } = await import('os');
    const mod = await getPlatform();
    const result = mod.getTempFilePath('test', '.txt');
    expect(result.startsWith(tmpdir())).toBe(true);
  }, SLOW_TIMEOUT);

  test('result contains the prefix', async () => {
    const mod = await getPlatform();
    const result = mod.getTempFilePath('myprefix', '.log');
    expect(result).toContain('myprefix');
  }, SLOW_TIMEOUT);

  test('result ends with the extension', async () => {
    const mod = await getPlatform();
    const result = mod.getTempFilePath('test', '.json');
    expect(result.endsWith('.json')).toBe(true);
  }, SLOW_TIMEOUT);

  test('each call produces a unique path', async () => {
    const mod = await getPlatform();
    const path1 = mod.getTempFilePath('unique', '.tmp');
    // Small delay to ensure Date.now() advances
    await new Promise(resolve => setTimeout(resolve, 2));
    const path2 = mod.getTempFilePath('unique', '.tmp');
    expect(path1).not.toBe(path2);
  }, SLOW_TIMEOUT);

  test('is an absolute path', async () => {
    const mod = await getPlatform();
    const result = mod.getTempFilePath('abs', '.txt');
    expect(isAbsolutePath(result)).toBe(true);
  }, SLOW_TIMEOUT);
});

// ─── Section 12: pathSeparator ───────────────────────────────────────────────

describe('pathSeparator', () => {
  test('is a string', async () => {
    const mod = await getPlatform();
    expect(typeof mod.pathSeparator).toBe('string');
  }, SLOW_TIMEOUT);

  test('matches Node.js path.sep', async () => {
    const mod = await getPlatform();
    expect(mod.pathSeparator).toBe(sep);
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: is backslash', async () => {
    const mod = await getPlatform();
    expect(mod.pathSeparator).toBe('\\');
  }, SLOW_TIMEOUT);

  test.skipIf(IS_NATIVE_WINDOWS)('Unix: is forward slash', async () => {
    const mod = await getPlatform();
    expect(mod.pathSeparator).toBe('/');
  }, SLOW_TIMEOUT);
});

// ─── Section 13: Cross-cutting consistency checks ────────────────────────────

describe('Platform module consistency', () => {
  test('module imports without error', async () => {
    const result = await safeImport<PlatformModule>('../../lib/platform');
    expect(result.ok).toBe(true);
  }, SLOW_TIMEOUT);

  test('platform constant matches process.platform', async () => {
    const mod = await getPlatform();
    expect(mod.platform).toBe(process.platform);
  }, SLOW_TIMEOUT);

  test('exactly one of isWindows/isMacOS/isLinux is true', async () => {
    const mod = await getPlatform();
    const trueCount = [mod.isWindows, mod.isMacOS, mod.isLinux].filter(Boolean).length;
    expect(trueCount).toBe(1);
  }, SLOW_TIMEOUT);

  test('getPlatformName returns a human-readable string', async () => {
    const mod = await getPlatform();
    const name = mod.getPlatformName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    // Should be one of the known names
    expect(['macOS', 'WSL', 'Windows', 'Linux']).toContain(name);
  }, SLOW_TIMEOUT);

  test('getLogDir is under home or system app directory', async () => {
    const mod = await getPlatform();
    const logDir = mod.getLogDir();
    const home = mod.getHomeDir();
    // On all platforms, log dir should be either under home or a system path
    const isUnderHome = logDir.startsWith(home);
    const isUnderAppData = process.env.APPDATA ? logDir.startsWith(process.env.APPDATA) : false;
    expect(isUnderHome || isUnderAppData).toBe(true);
  }, SLOW_TIMEOUT);

  test('getConfigDir and getLogDir are different directories', async () => {
    const mod = await getPlatform();
    const configDir = mod.getConfigDir();
    const logDir = mod.getLogDir();
    expect(configDir).not.toBe(logDir);
  }, SLOW_TIMEOUT);
});
