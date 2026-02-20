/**
 * 01-platform.test.ts — Platform Abstraction Layer E2E Tests
 *
 * Tests the cross-platform abstraction layer (lib/platform.ts)
 * against REAL platform behavior. No mocking of process.platform.
 *
 * Runs on all platforms. Uses describe.skipIf for platform-specific blocks.
 *
 * Part of: PRD-20260219-windows-11-support (Windows E2E Suite)
 */

import { describe, test, expect } from 'bun:test';
import { existsSync } from 'fs';
import { IS_NATIVE_WINDOWS, IS_MACOS, IS_LINUX, SLOW_TIMEOUT, hasCorrectSeparator, isAbsolutePath, safeImport } from './helpers';

import {
  isWindows,
  isMacOS,
  isLinux,
  getPlatformName,
  getHomeDir,
  getTempDir,
  getPaiDir,
  paiPath,
  getPortCheckCommandString,
  getKillCommand,
  detectTerminal,
  getDefaultShell,
  supportsAnsiEscapes,
  getAudioPlayCommand,
  getNotificationCommand,
  getServiceManager,
} from '../../lib/platform';

// ─── Cross-Platform Tests (run everywhere) ──────────────────────────────────

describe('platform abstraction — cross-platform', () => {

  test('exactly one of isWindows, isMacOS, isLinux is true', () => {
    const flags = [isWindows, isMacOS, isLinux];
    const trueCount = flags.filter(Boolean).length;
    expect(trueCount).toBe(1);
  });

  test('getPlatformName() returns a recognized platform string', () => {
    const name = getPlatformName();
    expect(['Windows', 'macOS', 'Linux', 'WSL']).toContain(name);
  });

  test('getHomeDir() returns a non-empty absolute path', () => {
    const home = getHomeDir();
    expect(home.length).toBeGreaterThan(0);
    expect(isAbsolutePath(home)).toBe(true);
  });

  test('getTempDir() returns a non-empty absolute path that exists', () => {
    const tmp = getTempDir();
    expect(tmp.length).toBeGreaterThan(0);
    expect(isAbsolutePath(tmp)).toBe(true);
    expect(existsSync(tmp)).toBe(true);
  });

  test('getPaiDir() returns a path ending in .claude', () => {
    const paiDir = getPaiDir();
    expect(paiDir).toEndWith('.claude');
  });

  test('paiPath("foo", "bar") returns a path containing foo and bar', () => {
    const result = paiPath('foo', 'bar');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  test('getPortCheckCommandString(8888) returns non-empty string containing 8888', () => {
    const cmd = getPortCheckCommandString(8888);
    expect(cmd.length).toBeGreaterThan(0);
    expect(cmd).toContain('8888');
  });

  test('getKillCommand(1234, true) returns non-empty string containing 1234', () => {
    const cmd = getKillCommand(1234, true);
    expect(cmd.length).toBeGreaterThan(0);
    expect(cmd).toContain('1234');
  });

  test('detectTerminal() returns a recognized terminal type', () => {
    const terminal = detectTerminal();
    expect(['kitty', 'windows-terminal', 'iterm2', 'generic']).toContain(terminal);
  });

  test('getDefaultShell() returns a non-empty string', () => {
    const shell = getDefaultShell();
    expect(shell.length).toBeGreaterThan(0);
  });

  test('supportsAnsiEscapes() returns a boolean', () => {
    const result = supportsAnsiEscapes();
    expect(typeof result).toBe('boolean');
  });

});

// ─── Windows-Only Tests ─────────────────────────────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('platform abstraction — Windows-only', () => {

  test('isWindows is true, isMacOS and isLinux are false', () => {
    expect(isWindows).toBe(true);
    expect(isMacOS).toBe(false);
    expect(isLinux).toBe(false);
  });

  test('getHomeDir() contains backslash and starts with a drive letter', () => {
    const home = getHomeDir();
    expect(home).toContain('\\');
    expect(home).toMatch(/^[A-Za-z]:\\/);
  });

  test('getTempDir() starts with a drive letter', () => {
    const tmp = getTempDir();
    expect(tmp).toMatch(/^[A-Za-z]:\\/);
  });

  test('getPortCheckCommandString() contains netstat and findstr', () => {
    const cmd = getPortCheckCommandString(9999);
    expect(cmd.toLowerCase()).toContain('netstat');
    expect(cmd.toLowerCase()).toContain('findstr');
  });

  test('getKillCommand() contains taskkill', () => {
    const cmd = getKillCommand(5678, true);
    expect(cmd.toLowerCase()).toContain('taskkill');
  });

  test('detectTerminal() returns windows-terminal or generic (never kitty)', () => {
    const terminal = detectTerminal();
    expect(terminal).not.toBe('kitty');
    expect(['windows-terminal', 'iterm2', 'generic']).toContain(terminal);
  });

  test('getDefaultShell() contains powershell (case-insensitive)', () => {
    const shell = getDefaultShell();
    expect(shell.toLowerCase()).toContain('powershell');
  });

  test('getAudioPlayCommand() returns null or contains powershell', () => {
    const result = getAudioPlayCommand('test.wav');
    if (result !== null) {
      expect(result.command.toLowerCase()).toContain('powershell');
    }
  });

  test('getNotificationCommand() returns null or contains powershell', () => {
    const result = getNotificationCommand('Test', 'Hello');
    if (result !== null) {
      expect(result.command.toLowerCase()).toContain('powershell');
    }
  });

  test('getServiceManager() returns task-scheduler', () => {
    const manager = getServiceManager();
    expect(manager).toBe('task-scheduler');
  });

});

// ─── macOS/Linux Tests ──────────────────────────────────────────────────────

describe.skipIf(IS_NATIVE_WINDOWS)('platform abstraction — macOS/Linux', () => {

  test('isWindows is false', () => {
    expect(isWindows).toBe(false);
  });

  test('getHomeDir() starts with /', () => {
    const home = getHomeDir();
    expect(home).toStartWith('/');
  });

  test('getPortCheckCommandString() contains lsof', () => {
    const cmd = getPortCheckCommandString(9999);
    expect(cmd).toContain('lsof');
  });

  test('getKillCommand() contains kill', () => {
    const cmd = getKillCommand(5678, true);
    expect(cmd).toContain('kill');
  });

});
