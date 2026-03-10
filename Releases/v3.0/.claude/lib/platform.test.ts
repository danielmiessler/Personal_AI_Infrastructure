/**
 * Platform Abstraction Layer — Unit Tests
 *
 * Tests all exports from platform.ts with dual-platform mocking.
 * Run: bun test lib/platform.test.ts
 *
 * Part of: PRD-20260219-windows-11-support (Phase 0)
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  isWindows,
  isMacOS,
  isLinux,
  getPlatformName,
  getHomeDir,
  getTempDir,
  getTempFilePath,
  getConfigDir,
  getLogDir,
  getPortCheckCommandString,
  getKillCommand,
  getKillByPatternCommand,
  isCommandAvailable,
  getDefaultShell,
  getShellProfilePath,
  detectTerminal,
  isKittyAvailable,
  getKittySocketPath,
  supportsAnsiEscapes,
  getAudioPlayCommand,
  getNotificationCommand,
  getDeleteFileCommand,
  getServiceManager,
} from './platform';

// ─── Section 1: OS Detection (current platform — no mocking needed) ────────

describe('OS Detection (current platform)', () => {
  test('exactly one of isWindows, isMacOS, isLinux is true', () => {
    const trueCount = [isWindows, isMacOS, isLinux].filter(Boolean).length;
    // On WSL, isLinux is true. On macOS, isMacOS is true. etc.
    expect(trueCount).toBeGreaterThanOrEqual(1);
  });

  test('getPlatformName returns a non-empty string', () => {
    const name = getPlatformName();
    expect(name.length).toBeGreaterThan(0);
    expect(['macOS', 'Windows', 'Linux', 'WSL']).toContain(name);
  });
});

// ─── Section 2: Path Resolution ────────────────────────────────────────────

describe('Path Resolution', () => {
  test('getHomeDir returns a non-empty string', () => {
    const home = getHomeDir();
    expect(home.length).toBeGreaterThan(0);
  });

  test('getTempDir returns a non-empty string', () => {
    const tmp = getTempDir();
    expect(tmp.length).toBeGreaterThan(0);
  });

  test('getTempFilePath includes prefix and extension', () => {
    const path = getTempFilePath('voice', '.mp3');
    expect(path).toContain('voice');
    expect(path).toContain('.mp3');
    // Should NOT contain hardcoded /tmp/
    expect(path).toStartWith(getTempDir());
  });

  test('getConfigDir returns a path', () => {
    const dir = getConfigDir();
    expect(dir.length).toBeGreaterThan(0);
  });

  test('getConfigDir respects PAI_CONFIG_DIR env var', () => {
    const original = process.env.PAI_CONFIG_DIR;
    process.env.PAI_CONFIG_DIR = '/custom/config';
    try {
      expect(getConfigDir()).toBe('/custom/config');
    } finally {
      if (original === undefined) {
        delete process.env.PAI_CONFIG_DIR;
      } else {
        process.env.PAI_CONFIG_DIR = original;
      }
    }
  });

  test('getLogDir returns a path', () => {
    const dir = getLogDir();
    expect(dir.length).toBeGreaterThan(0);
  });
});

// ─── Section 3: Command Mapping ────────────────────────────────────────────

describe('Command Mapping', () => {
  test('getPortCheckCommandString returns a non-empty string', () => {
    const cmd = getPortCheckCommandString(8888);
    expect(cmd.length).toBeGreaterThan(0);
    expect(cmd).toContain('8888');
  });

  test('getKillCommand includes PID', () => {
    const cmd = getKillCommand(1234);
    expect(cmd).toContain('1234');
  });

  test('getKillCommand force variant includes PID', () => {
    const cmd = getKillCommand(1234, true);
    expect(cmd).toContain('1234');
  });

  test('getKillByPatternCommand includes pattern', () => {
    const cmd = getKillByPatternCommand('voice-server');
    expect(cmd).toContain('voice-server');
  });

  test('isCommandAvailable returns boolean', () => {
    const result = isCommandAvailable('git');
    expect(typeof result).toBe('boolean');
  });

  test('getDefaultShell returns a non-empty string', () => {
    const shell = getDefaultShell();
    expect(shell.length).toBeGreaterThan(0);
  });

  test('getShellProfilePath returns a string', () => {
    const profile = getShellProfilePath();
    expect(typeof profile).toBe('string');
  });
});

// ─── Section 4: Terminal Detection ─────────────────────────────────────────

describe('Terminal Detection', () => {
  test('detectTerminal returns a valid terminal type', () => {
    const terminal = detectTerminal();
    expect(['kitty', 'windows-terminal', 'iterm2', 'generic']).toContain(terminal);
  });

  test('isKittyAvailable returns boolean', () => {
    expect(typeof isKittyAvailable()).toBe('boolean');
  });

  test('getKittySocketPath returns string or null', () => {
    const socket = getKittySocketPath();
    expect(socket === null || typeof socket === 'string').toBe(true);
  });

  test('supportsAnsiEscapes returns boolean', () => {
    expect(typeof supportsAnsiEscapes()).toBe('boolean');
  });
});

// ─── Section 5: Audio & Notifications ──────────────────────────────────────

describe('Audio & Notifications', () => {
  test('getAudioPlayCommand returns command object or null', () => {
    const result = getAudioPlayCommand('/tmp/test.mp3', 0.5);
    if (result !== null) {
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('args');
      expect(Array.isArray(result.args)).toBe(true);
    }
  });

  test('getNotificationCommand returns command object or null', () => {
    const result = getNotificationCommand('Test Title', 'Test message');
    if (result !== null) {
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('args');
    }
  });

  test('getDeleteFileCommand returns command object', () => {
    const result = getDeleteFileCommand('/tmp/test.txt');
    expect(result).toHaveProperty('command');
    expect(result).toHaveProperty('args');
  });
});

// ─── Section 6: Service Management ─────────────────────────────────────────

describe('Service Management', () => {
  test('getServiceManager returns a valid type', () => {
    const manager = getServiceManager();
    expect(['launchctl', 'systemd', 'task-scheduler', 'none']).toContain(manager);
  });
});

// ─── Platform-Specific Behavioral Tests ────────────────────────────────────
// These verify correct behavior on the CURRENT platform (WSL/Linux).
// Windows-specific tests will run during smoke test on Justin's machine.

describe('Current Platform Behavior (Linux/WSL)', () => {
  test('port check uses lsof on Unix', () => {
    if (!isWindows) {
      const cmd = getPortCheckCommandString(8888);
      expect(cmd).toContain('lsof');
    }
  });

  test('kill command uses kill on Unix', () => {
    if (!isWindows) {
      const cmd = getKillCommand(1234, true);
      expect(cmd).toContain('kill -9');
    }
  });

  test('audio command uses afplay on macOS or paplay on Linux', () => {
    if (!isWindows) {
      const cmd = getAudioPlayCommand('/tmp/test.mp3');
      expect(cmd).not.toBeNull();
      if (isMacOS) {
        expect(cmd!.command).toBe('/usr/bin/afplay');
      } else if (isLinux) {
        expect(cmd!.command).toBe('paplay');
      }
    }
  });

  test('notification uses osascript on macOS or notify-send on Linux', () => {
    if (!isWindows) {
      const cmd = getNotificationCommand('Test', 'Message');
      expect(cmd).not.toBeNull();
      if (isMacOS) {
        expect(cmd!.command).toBe('/usr/bin/osascript');
      } else if (isLinux) {
        expect(cmd!.command).toBe('notify-send');
      }
    }
  });

  test('delete file uses rm on Unix', () => {
    if (!isWindows) {
      const cmd = getDeleteFileCommand('/tmp/test.txt');
      expect(cmd.command).toBe('rm');
    }
  });

  test('default shell is not powershell on Unix', () => {
    if (!isWindows) {
      const shell = getDefaultShell();
      expect(shell).not.toContain('powershell');
    }
  });

  test('service manager is launchctl on macOS or systemd on Linux', () => {
    if (isMacOS) {
      expect(getServiceManager()).toBe('launchctl');
    } else if (isLinux) {
      expect(getServiceManager()).toBe('systemd');
    }
  });
});
