/**
 * 06-terminal.test.ts — Terminal Abstraction E2E Tests
 *
 * Tests the terminal adapter layer (lib/terminal.ts)
 * against REAL platform behavior. No mocking of process.platform.
 *
 * Runs on all platforms. Uses describe.skipIf for platform-specific blocks.
 *
 * Part of: PRD-20260219-windows-11-support (Windows E2E Suite)
 */

import { describe, test, expect } from 'bun:test';
import { IS_NATIVE_WINDOWS } from './helpers';

import {
  createTerminalAdapter,
  getTerminalSize,
  KittyTerminalAdapter,
  WindowsTerminalAdapter,
  GenericTerminalAdapter,
} from '../../lib/terminal';

// ─── Cross-Platform Tests (run everywhere) ──────────────────────────────────

describe('terminal abstraction — cross-platform', () => {

  test('createTerminalAdapter() returns object with required interface', () => {
    const adapter = createTerminalAdapter();
    expect(typeof adapter.setTitle).toBe('function');
    expect(typeof adapter.setTabColor).toBe('function');
    expect(typeof adapter.resetTabColor).toBe('function');
    expect(typeof adapter.supported).toBe('boolean');
  });

  test('getTerminalSize() returns object with columns and rows as numbers', () => {
    const size = getTerminalSize();
    expect(typeof size.columns).toBe('number');
    expect(typeof size.rows).toBe('number');
  });

  test('getTerminalSize().columns is >= 1', () => {
    const size = getTerminalSize();
    expect(size.columns).toBeGreaterThanOrEqual(1);
  });

  test('getTerminalSize().rows is >= 1', () => {
    const size = getTerminalSize();
    expect(size.rows).toBeGreaterThanOrEqual(1);
  });

  test('adapter setTitle() does not throw', () => {
    const adapter = createTerminalAdapter();
    expect(() => adapter.setTitle('Test Title')).not.toThrow();
  });

  test('adapter setTabColor() does not throw', () => {
    const adapter = createTerminalAdapter();
    expect(() => adapter.setTabColor({
      activeBg: '#000000',
      activeFg: '#ffffff',
      inactiveBg: '#333333',
      inactiveFg: '#cccccc',
    })).not.toThrow();
  });

  test('adapter resetTabColor() does not throw', () => {
    const adapter = createTerminalAdapter();
    expect(() => adapter.resetTabColor()).not.toThrow();
  });

});

// ─── Windows-Only Tests ─────────────────────────────────────────────────────

describe.skipIf(!IS_NATIVE_WINDOWS)('terminal abstraction — Windows-only', () => {

  test('createTerminalAdapter() returns WindowsTerminalAdapter or GenericTerminalAdapter (never Kitty)', () => {
    const adapter = createTerminalAdapter();
    expect(adapter).not.toBeInstanceOf(KittyTerminalAdapter);
    const isExpectedType =
      adapter instanceof WindowsTerminalAdapter ||
      adapter instanceof GenericTerminalAdapter;
    expect(isExpectedType).toBe(true);
  });

  test('if WT_SESSION env var is set, adapter is WindowsTerminalAdapter', () => {
    if (process.env.WT_SESSION) {
      const adapter = createTerminalAdapter();
      expect(adapter).toBeInstanceOf(WindowsTerminalAdapter);
    }
  });

  test('WindowsTerminalAdapter.supported returns true', () => {
    const adapter = new WindowsTerminalAdapter();
    expect(adapter.supported).toBe(true);
  });

});

// ─── macOS/Linux Tests ──────────────────────────────────────────────────────

describe.skipIf(IS_NATIVE_WINDOWS)('terminal abstraction — macOS/Linux', () => {

  test('if TERM=xterm-kitty and KITTY_LISTEN_ON is set, adapter is KittyTerminalAdapter', () => {
    if (process.env.TERM === 'xterm-kitty' && process.env.KITTY_LISTEN_ON) {
      const adapter = createTerminalAdapter(process.env.KITTY_LISTEN_ON);
      expect(adapter).toBeInstanceOf(KittyTerminalAdapter);
    }
  });

  test('without Kitty env vars, adapter is GenericTerminalAdapter', () => {
    // Only test when Kitty and WT are NOT active
    if (!process.env.KITTY_LISTEN_ON && !process.env.KITTY_WINDOW_ID && process.env.TERM !== 'xterm-kitty' && !process.env.WT_SESSION) {
      const adapter = createTerminalAdapter();
      expect(adapter).toBeInstanceOf(GenericTerminalAdapter);
    }
  });

});
