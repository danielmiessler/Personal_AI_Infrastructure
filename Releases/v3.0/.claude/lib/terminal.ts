/**
 * Terminal Abstraction Layer
 *
 * Provides a unified interface for terminal operations across:
 * - Kitty (via kitten @ remote control)
 * - Windows Terminal (via ANSI OSC escape sequences)
 * - Generic terminals (graceful no-op)
 *
 * Part of: PRD-20260219-windows-11-support (Phase 3)
 */

import { execSync } from 'child_process';
import { detectTerminal, isKittyAvailable, type TerminalType } from './platform';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface TabColorOptions {
  activeBg: string;
  activeFg: string;
  inactiveBg: string;
  inactiveFg: string;
}

export interface TerminalAdapter {
  /** Terminal type this adapter handles */
  readonly type: TerminalType;
  /** Whether this terminal supports title/color operations */
  readonly supported: boolean;
  /** Set the tab/window title */
  setTitle(title: string): void;
  /** Set tab colors (no-op on terminals without per-tab color support) */
  setTabColor(options: TabColorOptions): void;
  /** Reset tab colors to terminal defaults */
  resetTabColor(): void;
}

// ─── Kitty Implementation ───────────────────────────────────────────────────

export class KittyTerminalAdapter implements TerminalAdapter {
  readonly type = 'kitty' as const;
  readonly supported = true;

  constructor(private readonly listenOn: string) {}

  setTitle(title: string): void {
    const escaped = title.replace(/"/g, '\\"');
    const toFlag = `--to="${this.listenOn}"`;
    try {
      execSync(`kitten @ ${toFlag} set-tab-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });
      execSync(`kitten @ ${toFlag} set-window-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });
    } catch { /* silent — terminal may not be available */ }
  }

  setTabColor(options: TabColorOptions): void {
    const toFlag = `--to="${this.listenOn}"`;
    try {
      execSync(
        `kitten @ ${toFlag} set-tab-color --self active_bg=${options.activeBg} active_fg=${options.activeFg} inactive_bg=${options.inactiveBg} inactive_fg=${options.inactiveFg}`,
        { stdio: 'ignore', timeout: 2000 }
      );
    } catch { /* silent */ }
  }

  resetTabColor(): void {
    const toFlag = `--to="${this.listenOn}"`;
    try {
      execSync(
        `kitten @ ${toFlag} set-tab-color --self active_bg=none active_fg=none inactive_bg=none inactive_fg=none`,
        { stdio: 'ignore', timeout: 2000 }
      );
    } catch { /* silent */ }
  }
}

// ─── Windows Terminal Implementation ────────────────────────────────────────

export class WindowsTerminalAdapter implements TerminalAdapter {
  readonly type = 'windows-terminal' as const;
  readonly supported = true;

  /**
   * Set title using ANSI OSC escape sequence.
   * OSC 0 sets both window title and icon name (used as tab title by WT).
   * Ref: https://learn.microsoft.com/en-us/windows/terminal/tutorials/tab-title
   */
  setTitle(title: string): void {
    try {
      process.stderr.write(`\x1b]0;${title}\x07`);
    } catch { /* silent */ }
  }

  /** Windows Terminal does not support per-tab color via escape sequences. */
  setTabColor(_options: TabColorOptions): void {
    // No-op: WT uses profile-based color schemes, not runtime per-tab colors.
  }

  /** No-op — nothing to reset. */
  resetTabColor(): void {}
}

// ─── Generic Fallback ───────────────────────────────────────────────────────

export class GenericTerminalAdapter implements TerminalAdapter {
  readonly type = 'generic' as const;
  readonly supported = false;

  setTitle(_title: string): void {}
  setTabColor(_options: TabColorOptions): void {}
  resetTabColor(): void {}
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create the appropriate terminal adapter for the current environment.
 *
 * @param kittyListenOn - Kitty socket path (required for Kitty adapter)
 */
export function createTerminalAdapter(kittyListenOn?: string | null): TerminalAdapter {
  if (isKittyAvailable() && kittyListenOn) {
    return new KittyTerminalAdapter(kittyListenOn);
  }

  if (detectTerminal() === 'windows-terminal') {
    return new WindowsTerminalAdapter();
  }

  return new GenericTerminalAdapter();
}

// ─── Terminal Size ──────────────────────────────────────────────────────────

export interface TerminalSize {
  columns: number;
  rows: number;
}

/**
 * Get the current terminal size.
 * Works cross-platform via process.stdout (Bun/Node built-in).
 * Falls back to 80x24 if not a TTY.
 */
export function getTerminalSize(): TerminalSize {
  return {
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}
