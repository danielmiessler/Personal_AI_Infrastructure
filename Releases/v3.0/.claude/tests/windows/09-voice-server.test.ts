/**
 * 09-voice-server.test.ts — Voice Server Cross-Platform E2E Tests
 *
 * Tests the voice server (server.ts) and management CLI (manage.ts)
 * against REAL platform behavior. No mocking of process.platform.
 *
 * Validates:
 *   1. manage.ts CLI — help output, argument parsing
 *   2. server.ts — module importability, no dead macOS code
 *   3. platform.ts audio — getAudioPlayCommand per platform
 *   4. platform.ts notifications — getNotificationCommand per platform
 *   5. manage.ts platform detection — correct service manager per OS
 *
 * Runs on all platforms. Uses describe.skipIf for platform-specific blocks.
 *
 * Part of: PRD-20260219-windows-11-support (Voice Mode)
 */

import { describe, test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  V3_ROOT,
  IS_NATIVE_WINDOWS,
  IS_MACOS,
  IS_LINUX,
  SLOW_TIMEOUT,
  bunRun,
  safeImport,
} from './helpers';

import {
  getAudioPlayCommand,
  getNotificationCommand,
  getServiceManager,
} from '../../lib/platform';

const VOICE_DIR = join(V3_ROOT, 'VoiceServer');
const MANAGE_TS = join(VOICE_DIR, 'manage.ts');
const SERVER_TS = join(VOICE_DIR, 'server.ts');

// ─── 1. File Existence ──────────────────────────────────────────────────────

describe('voice server — file structure', () => {

  test('manage.ts exists in VoiceServer directory', () => {
    expect(existsSync(MANAGE_TS)).toBe(true);
  });

  test('server.ts exists in VoiceServer directory', () => {
    expect(existsSync(SERVER_TS)).toBe(true);
  });

  test('manage.ts imports from lib/platform (not inline process.platform)', () => {
    const content = readFileSync(MANAGE_TS, 'utf-8');
    expect(content).toContain("from '../lib/platform'");
  });

  test('server.ts imports from lib/platform (not inline process.platform)', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    expect(content).toContain("from '../lib/platform'");
  });

});

// ─── 2. manage.ts CLI (cross-platform) ──────────────────────────────────────

describe('voice server — manage.ts CLI', () => {

  test('manage.ts with no args prints usage and exits 0', () => {
    const result = bunRun(['run', MANAGE_TS], { timeout: SLOW_TIMEOUT });
    expect(result.status).toBe(0);
    const output = result.stdout || '';
    expect(output).toContain('PAI Voice Server Manager');
    expect(output).toContain('Usage:');
    expect(output).toContain('install');
    expect(output).toContain('start');
    expect(output).toContain('stop');
    expect(output).toContain('status');
  }, SLOW_TIMEOUT);

  test('manage.ts with invalid command exits 1', () => {
    const result = bunRun(['run', MANAGE_TS, 'invalidcmd'], { timeout: SLOW_TIMEOUT });
    expect(result.status).toBe(1);
  }, SLOW_TIMEOUT);

  test('manage.ts help output includes current platform name', () => {
    const result = bunRun(['run', MANAGE_TS], { timeout: SLOW_TIMEOUT });
    const output = result.stdout || '';
    expect(output).toContain('Platform:');
  }, SLOW_TIMEOUT);

});

// ─── 3. server.ts code quality (cross-platform) ────────────────────────────

describe('voice server — server.ts code quality', () => {

  test('server.ts does not contain escapeForAppleScript (dead macOS code)', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    expect(content).not.toContain('escapeForAppleScript');
  });

  test('server.ts sendNotification comment says cross-platform', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    expect(content).toContain('cross-platform');
  });

  test('server.ts does not contain hardcoded /tmp/ paths', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    // Check non-comment lines only
    const codeLines = content.split('\n').filter(l => {
      const trimmed = l.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*');
    });
    const codeContent = codeLines.join('\n');
    expect(codeContent).not.toMatch(/["'`]\/tmp\//);
  });

  test('server.ts uses getTempFilePath from platform.ts', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    expect(content).toContain('getTempFilePath');
  });

  test('server.ts uses getAudioPlayCommand from platform.ts', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    expect(content).toContain('getAudioPlayCommand');
  });

  test('server.ts uses getNotificationCommand from platform.ts', () => {
    const content = readFileSync(SERVER_TS, 'utf-8');
    expect(content).toContain('getNotificationCommand');
  });

});

// ─── 4. platform.ts audio/notification — cross-platform ────────────────────

describe('voice server — audio playback abstraction', () => {

  test('getAudioPlayCommand returns non-null for a test file', () => {
    const result = getAudioPlayCommand('test.mp3');
    // Should return a command on all supported platforms
    expect(result).not.toBeNull();
  });

  test('getAudioPlayCommand result has command and args properties', () => {
    const result = getAudioPlayCommand('test.mp3');
    expect(result).toHaveProperty('command');
    expect(result).toHaveProperty('args');
    expect(typeof result!.command).toBe('string');
    expect(Array.isArray(result!.args)).toBe(true);
  });

  test('getAudioPlayCommand includes the file path in args', () => {
    const result = getAudioPlayCommand('myfile.mp3');
    const allArgs = [result!.command, ...result!.args].join(' ');
    expect(allArgs).toContain('myfile.mp3');
  });

  test('getAudioPlayCommand with volume parameter does not crash', () => {
    const result = getAudioPlayCommand('test.mp3', 0.5);
    expect(result).not.toBeNull();
  });

});

describe('voice server — notification abstraction', () => {

  test('getNotificationCommand returns non-null for valid title/message', () => {
    const result = getNotificationCommand('Test Title', 'Test Message');
    expect(result).not.toBeNull();
  });

  test('getNotificationCommand result has command and args properties', () => {
    const result = getNotificationCommand('Test', 'Hello');
    expect(result).toHaveProperty('command');
    expect(result).toHaveProperty('args');
    expect(typeof result!.command).toBe('string');
    expect(Array.isArray(result!.args)).toBe(true);
  });

  test('getNotificationCommand includes title content in command args', () => {
    const result = getNotificationCommand('MyTitle', 'MyMessage');
    const allArgs = [result!.command, ...result!.args].join(' ');
    expect(allArgs).toContain('MyTitle');
  });

  test('getNotificationCommand includes message content in command args', () => {
    const result = getNotificationCommand('MyTitle', 'MyMessage');
    const allArgs = [result!.command, ...result!.args].join(' ');
    expect(allArgs).toContain('MyMessage');
  });

});

// ─── 5. Windows-Only Voice Tests ────────────────────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('voice server — Windows-specific', () => {

  test('getAudioPlayCommand uses powershell.exe on Windows', () => {
    const result = getAudioPlayCommand('test.mp3');
    expect(result).not.toBeNull();
    expect(result!.command.toLowerCase()).toContain('powershell');
  });

  test('getAudioPlayCommand includes MediaPlayer in PowerShell args', () => {
    const result = getAudioPlayCommand('test.mp3');
    const allArgs = result!.args.join(' ');
    expect(allArgs).toContain('MediaPlayer');
  });

  test('getAudioPlayCommand volume parameter is reflected in PowerShell args', () => {
    const result = getAudioPlayCommand('test.mp3', 0.75);
    const allArgs = result!.args.join(' ');
    expect(allArgs).toContain('0.75');
  });

  test('getNotificationCommand uses powershell.exe on Windows', () => {
    const result = getNotificationCommand('Test', 'Hello');
    expect(result).not.toBeNull();
    expect(result!.command.toLowerCase()).toContain('powershell');
  });

  test('getNotificationCommand includes ToastNotification in PowerShell args', () => {
    const result = getNotificationCommand('Test', 'Hello');
    const allArgs = result!.args.join(' ');
    expect(allArgs).toContain('ToastNotification');
  });

  test('getServiceManager returns task-scheduler on Windows', () => {
    expect(getServiceManager()).toBe('task-scheduler');
  });

  test('manage.ts help mentions Windows platform', () => {
    const result = bunRun(['run', MANAGE_TS], { timeout: SLOW_TIMEOUT });
    const output = result.stdout || '';
    expect(output).toContain('Windows');
  }, SLOW_TIMEOUT);

});

// ─── 6. macOS-Only Voice Tests ──────────────────────────────────────────────

describe.skipIf(!IS_MACOS)('voice server — macOS-specific', () => {

  test('getAudioPlayCommand uses afplay on macOS', () => {
    const result = getAudioPlayCommand('test.mp3');
    expect(result).not.toBeNull();
    expect(result!.command).toContain('afplay');
  });

  test('getAudioPlayCommand includes -v flag with volume on macOS', () => {
    const result = getAudioPlayCommand('test.mp3', 0.5);
    expect(result!.args).toContain('-v');
  });

  test('getNotificationCommand uses osascript on macOS', () => {
    const result = getNotificationCommand('Test', 'Hello');
    expect(result).not.toBeNull();
    expect(result!.command).toContain('osascript');
  });

  test('getServiceManager returns launchctl on macOS', () => {
    expect(getServiceManager()).toBe('launchctl');
  });

});

// ─── 7. Linux-Only Voice Tests ──────────────────────────────────────────────

describe.skipIf(!IS_LINUX)('voice server — Linux-specific', () => {

  test('getAudioPlayCommand uses paplay on Linux', () => {
    const result = getAudioPlayCommand('test.mp3');
    expect(result).not.toBeNull();
    expect(result!.command).toContain('paplay');
  });

  test('getNotificationCommand uses notify-send on Linux', () => {
    const result = getNotificationCommand('Test', 'Hello');
    expect(result).not.toBeNull();
    expect(result!.command).toContain('notify-send');
  });

  test('getServiceManager returns systemd on Linux', () => {
    expect(getServiceManager()).toBe('systemd');
  });

});
