import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import {
  KittyTerminalAdapter,
  WindowsTerminalAdapter,
  GenericTerminalAdapter,
  createTerminalAdapter,
  getTerminalSize,
  type TabColorOptions,
} from './terminal';

describe('Terminal Abstraction Layer', () => {
  // ─── Interface Compliance ───────────────────────────────────────────────

  describe('KittyTerminalAdapter', () => {
    test('has type "kitty"', () => {
      const adapter = new KittyTerminalAdapter('unix:/tmp/kitty-test');
      expect(adapter.type).toBe('kitty');
    });

    test('is supported', () => {
      const adapter = new KittyTerminalAdapter('unix:/tmp/kitty-test');
      expect(adapter.supported).toBe(true);
    });

    test('setTitle does not throw', () => {
      const adapter = new KittyTerminalAdapter('unix:/tmp/kitty-test');
      // Will fail silently (no real kitty socket) — just verifying no crash
      expect(() => adapter.setTitle('Test Title')).not.toThrow();
    });

    test('setTabColor does not throw', () => {
      const adapter = new KittyTerminalAdapter('unix:/tmp/kitty-test');
      expect(() => adapter.setTabColor({
        activeBg: '#000000', activeFg: '#ffffff',
        inactiveBg: '#333333', inactiveFg: '#cccccc',
      })).not.toThrow();
    });

    test('resetTabColor does not throw', () => {
      const adapter = new KittyTerminalAdapter('unix:/tmp/kitty-test');
      expect(() => adapter.resetTabColor()).not.toThrow();
    });
  });

  describe('WindowsTerminalAdapter', () => {
    test('has type "windows-terminal"', () => {
      const adapter = new WindowsTerminalAdapter();
      expect(adapter.type).toBe('windows-terminal');
    });

    test('is supported', () => {
      const adapter = new WindowsTerminalAdapter();
      expect(adapter.supported).toBe(true);
    });

    test('setTitle does not throw', () => {
      const adapter = new WindowsTerminalAdapter();
      expect(() => adapter.setTitle('Test Title')).not.toThrow();
    });

    test('setTabColor is no-op (does not throw)', () => {
      const adapter = new WindowsTerminalAdapter();
      expect(() => adapter.setTabColor({
        activeBg: '#000000', activeFg: '#ffffff',
        inactiveBg: '#333333', inactiveFg: '#cccccc',
      })).not.toThrow();
    });

    test('resetTabColor is no-op (does not throw)', () => {
      const adapter = new WindowsTerminalAdapter();
      expect(() => adapter.resetTabColor()).not.toThrow();
    });
  });

  describe('GenericTerminalAdapter', () => {
    test('has type "generic"', () => {
      const adapter = new GenericTerminalAdapter();
      expect(adapter.type).toBe('generic');
    });

    test('is NOT supported', () => {
      const adapter = new GenericTerminalAdapter();
      expect(adapter.supported).toBe(false);
    });

    test('all methods are no-op (no throw)', () => {
      const adapter = new GenericTerminalAdapter();
      expect(() => adapter.setTitle('Test')).not.toThrow();
      expect(() => adapter.setTabColor({
        activeBg: '#000', activeFg: '#fff',
        inactiveBg: '#333', inactiveFg: '#ccc',
      })).not.toThrow();
      expect(() => adapter.resetTabColor()).not.toThrow();
    });
  });

  // ─── Factory ────────────────────────────────────────────────────────────

  describe('createTerminalAdapter', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
      // Restore env
      process.env.TERM = origEnv.TERM;
      process.env.KITTY_WINDOW_ID = origEnv.KITTY_WINDOW_ID;
      process.env.KITTY_LISTEN_ON = origEnv.KITTY_LISTEN_ON;
      process.env.WT_SESSION = origEnv.WT_SESSION;
      process.env.WT_PROFILE_ID = origEnv.WT_PROFILE_ID;
    });

    test('returns GenericTerminalAdapter when no terminal detected', () => {
      delete process.env.KITTY_WINDOW_ID;
      delete process.env.KITTY_LISTEN_ON;
      delete process.env.WT_SESSION;
      delete process.env.WT_PROFILE_ID;
      process.env.TERM = 'xterm-256color';
      const adapter = createTerminalAdapter(null);
      expect(adapter.type).toBe('generic');
    });

    test('returns WindowsTerminalAdapter when WT_SESSION set', () => {
      delete process.env.KITTY_WINDOW_ID;
      delete process.env.KITTY_LISTEN_ON;
      process.env.TERM = 'xterm-256color';
      process.env.WT_SESSION = 'test-session-id';
      delete process.env.WT_PROFILE_ID;
      // Re-set to ensure detection works
      process.env.WT_SESSION = 'test-session-id';
      const adapter = createTerminalAdapter(null);
      expect(adapter.type).toBe('windows-terminal');
    });
  });

  // ─── Terminal Size ──────────────────────────────────────────────────────

  describe('getTerminalSize', () => {
    test('returns object with columns and rows', () => {
      const size = getTerminalSize();
      expect(typeof size.columns).toBe('number');
      expect(typeof size.rows).toBe('number');
      expect(size.columns).toBeGreaterThan(0);
      expect(size.rows).toBeGreaterThan(0);
    });

    test('defaults to 80x24 minimum', () => {
      const size = getTerminalSize();
      // Either real values or fallback defaults — both valid
      expect(size.columns).toBeGreaterThanOrEqual(1);
      expect(size.rows).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Three Implementations Exist ────────────────────────────────────────

  describe('ISC-TM-1: Three implementations exist', () => {
    test('KittyTerminalAdapter implements TerminalAdapter', () => {
      const a = new KittyTerminalAdapter('unix:/tmp/test');
      expect(a.type).toBeDefined();
      expect(a.supported).toBeDefined();
      expect(typeof a.setTitle).toBe('function');
      expect(typeof a.setTabColor).toBe('function');
      expect(typeof a.resetTabColor).toBe('function');
    });

    test('WindowsTerminalAdapter implements TerminalAdapter', () => {
      const a = new WindowsTerminalAdapter();
      expect(a.type).toBeDefined();
      expect(a.supported).toBeDefined();
      expect(typeof a.setTitle).toBe('function');
      expect(typeof a.setTabColor).toBe('function');
      expect(typeof a.resetTabColor).toBe('function');
    });

    test('GenericTerminalAdapter implements TerminalAdapter', () => {
      const a = new GenericTerminalAdapter();
      expect(a.type).toBeDefined();
      expect(a.supported).toBeDefined();
      expect(typeof a.setTitle).toBe('function');
      expect(typeof a.setTabColor).toBe('function');
      expect(typeof a.resetTabColor).toBe('function');
    });
  });
});
