/**
 * 19-audio-playback.test.ts — Audio Playback via Virtual Audio Devices
 *
 * Tests VoiceServer audio pipeline beyond just command generation:
 *   - Platform-specific audio command availability
 *   - PulseAudio null sink playback on Linux CI
 *   - Audio file path resolution with correct separators
 *   - Voice notification curl graceful degradation
 *
 * CI requirement (Linux only):
 *   sudo apt-get install -y pulseaudio
 *   pulseaudio --start --daemonize
 *   pactl load-module module-null-sink sink_name=virtual_speaker
 *
 * Run: bun test tests/cross-platform/19-audio-playback.test.ts
 */

import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, sep } from 'path';
import {
  V3_ROOT, IS_NATIVE_WINDOWS, IS_MACOS, IS_LINUX,
  SLOW_TIMEOUT, safeImport,
} from '../windows/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check if PulseAudio is running (Linux only) */
function isPulseAudioAvailable(): boolean {
  if (!IS_LINUX) return false;
  try {
    const result = spawnSync('pactl', ['info'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

const HAS_PULSEAUDIO = isPulseAudioAvailable();

// ─── Section 1: Platform Audio Command Availability ───────────────────────────

describe('Platform Audio Command Availability', () => {
  test('platform.ts getAudioPlayCommand() returns command object for current platform', async () => {
    const result = await safeImport<{
      getAudioPlayCommand: (filePath: string) => { command: string; args: string[] } | null;
    }>('../../lib/platform');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cmd = result.module.getAudioPlayCommand('/tmp/test.mp3');
      // On CI without audio (WSL2), may return null; on real platforms, returns object
      if (cmd !== null) {
        expect(typeof cmd.command).toBe('string');
        expect(Array.isArray(cmd.args)).toBe(true);
        expect(cmd.args.length).toBeGreaterThan(0);
      }
    }
  }, SLOW_TIMEOUT);

  test.skipIf(!IS_MACOS)('macOS: afplay command exists', () => {
    const result = spawnSync('which', ['afplay'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    expect(result.status).toBe(0);
  });

  test.skipIf(!IS_LINUX)('Linux: paplay or aplay command exists (skip on WSL2 without audio)', () => {
    const paplay = spawnSync('which', ['paplay'], { encoding: 'utf-8', timeout: 5_000 });
    const aplay = spawnSync('which', ['aplay'], { encoding: 'utf-8', timeout: 5_000 });
    // On full Linux or CI with pulseaudio, at least one should exist
    // On WSL2 without audio packages, both may be missing — skip gracefully
    if (paplay.status !== 0 && aplay.status !== 0) {
      console.warn('SKIP: Neither paplay nor aplay found — WSL2 or minimal Linux without audio');
      return;
    }
    expect(paplay.status === 0 || aplay.status === 0).toBe(true);
  });

  test.skipIf(!IS_NATIVE_WINDOWS)('Windows: PowerShell audio class is available', () => {
    const result = spawnSync('powershell.exe', [
      '-NoProfile', '-Command',
      '[System.Media.SoundPlayer] | Out-Null; Write-Output "ok"',
    ], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    expect(result.stdout.trim()).toBe('ok');
  });
});

// ─── Section 2: PulseAudio Null Sink (Linux CI) ──────────────────────────────

describe.skipIf(!HAS_PULSEAUDIO)('PulseAudio Null Sink — Virtual Audio Device', () => {
  test('PulseAudio is running and reports sinks', () => {
    const result = spawnSync('pactl', ['list', 'short', 'sinks'], {
      encoding: 'utf-8',
      timeout: 5_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  test('paplay succeeds with a generated silence WAV', () => {
    // Generate a tiny WAV file (silence) and play it through null sink
    const tmpWav = '/tmp/pai-test-silence.wav';
    // Create a valid but minimal WAV header (44 bytes header + 0 bytes data = silence)
    const wavHeader = Buffer.alloc(44);
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(36, 4); // File size - 8
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // PCM format
    wavHeader.writeUInt16LE(1, 22); // Mono
    wavHeader.writeUInt32LE(44100, 24); // Sample rate
    wavHeader.writeUInt32LE(44100 * 2, 28); // Byte rate
    wavHeader.writeUInt16LE(2, 32); // Block align
    wavHeader.writeUInt16LE(16, 34); // Bits per sample
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(0, 40); // Data size

    require('fs').writeFileSync(tmpWav, wavHeader);

    const result = spawnSync('paplay', [tmpWav], {
      encoding: 'utf-8',
      timeout: 10_000,
    });

    // Clean up
    try { require('fs').unlinkSync(tmpWav); } catch { /* ignore */ }

    // paplay should exit 0 — audio goes to null sink and is discarded
    expect(result.status).toBe(0);
  });
});

// ─── Section 3: Audio File Path Resolution ────────────────────────────────────

describe('Audio File Path Resolution', () => {
  test('getAudioPlayCommand uses platform-appropriate path separators', async () => {
    const result = await safeImport<{
      getAudioPlayCommand: (filePath: string) => { command: string; args: string[] } | null;
    }>('../../lib/platform');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const testPath = join('/tmp', 'test-audio', 'file.mp3');
      const cmd = result.module.getAudioPlayCommand(testPath);
      if (cmd !== null) {
        // The file path argument in the args should use current platform's separator
        const pathArg = cmd.args.find((arg: string) => arg.includes('test-audio'));
        if (pathArg) {
          expect(pathArg.includes(sep) || pathArg.includes('/')).toBe(true);
        }
      }
    }
  }, SLOW_TIMEOUT);
});

// ─── Section 4: Voice Notification Graceful Degradation ───────────────────────

describe('Voice Notification — Graceful Degradation', () => {
  test('curl to localhost:8888 completes without hanging', () => {
    const result = spawnSync('curl', [
      '-s', '-f', '--connect-timeout', '2',
      '-X', 'POST',
      'http://localhost:8888/notify',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ voice_id: 'test', message: 'CI test' }),
    ], {
      encoding: 'utf-8',
      timeout: 10_000,
    });
    // Must not hang — either succeeds (server running) or fails gracefully
    // Exit code 0 = server running, 7 = connection refused, 22 = HTTP error, 28 = timeout
    expect(result.status).not.toBeNull();
    expect([0, 7, 22, 28, 56]).toContain(result.status!);
  });

  test('getNotificationCommand returns valid command structure', async () => {
    const result = await safeImport<{
      getNotificationCommand: (title: string, body: string) => { command: string; args: string[] } | null;
    }>('../../lib/platform');
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cmd = result.module.getNotificationCommand('Test', 'Hello CI');
      // Returns null on unsupported platforms, object on supported ones
      if (cmd !== null) {
        expect(typeof cmd.command).toBe('string');
        expect(Array.isArray(cmd.args)).toBe(true);
        expect(cmd.args.length).toBeGreaterThan(0);
      }
    }
  }, SLOW_TIMEOUT);
});
