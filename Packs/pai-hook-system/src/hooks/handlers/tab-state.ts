/**
 * tab-state.ts - Terminal tab state handler
 *
 * Pure handler: receives pre-parsed transcript data, updates terminal tab.
 * No I/O for transcript reading - that's done by orchestrator.
 *
 * TERMINAL DETECTION:
 * Uses the same pattern as UpdateTabTitle.hook.ts:
 * - Kitty: Uses remote control API with subprocess timeout protection
 * - Other terminals: Falls back to escape codes for basic title support
 *
 * SUBPROCESS CONTROL (Kitty only):
 * Uses runWithTimeout() instead of Bun.$`` to enable killing hung subprocesses.
 * The kitten/kitty commands can hang indefinitely when Kitty is unresponsive,
 * blocking terminal I/O. With explicit subprocess control, we can:
 * 1. Set a 2-second timeout
 * 2. Kill the process with SIGTERM if it exceeds timeout
 * 3. Force kill with SIGKILL if SIGTERM doesn't work
 */

import { isValidVoiceCompletion, getTabFallback } from '../lib/response-format';
import { runWithTimeout } from '../../lib/subprocess';
import type { ParsedTranscript, ResponseState } from '../../skills/CORE/Tools/TranscriptParser';

// Tab color states for visual feedback (Kitty only - inactive tab)
const TAB_COLORS = {
  awaitingInput: '#0D6969',  // Dark teal - needs input
  completed: '#022800',      // Very dark green - success
  error: '#804000',          // Dark orange - problem
} as const;

const TAB_SUFFIXES = {
  awaitingInput: '?',
  completed: '',
  error: '!',
} as const;

const ACTIVE_TAB_COLOR = '#002B80';  // Dark blue
const ACTIVE_TEXT_COLOR = '#FFFFFF';
const INACTIVE_TEXT_COLOR = '#A0A0A0';

// Timeout for Kitty commands (2 seconds should be more than enough)
const KITTY_COMMAND_TIMEOUT_MS = 2000;

/**
 * Check if we're running in Kitty terminal with remote control available.
 * Same pattern as UpdateTabTitle.hook.ts.
 */
function isKittyTerminal(): boolean {
  return process.env.TERM === 'xterm-kitty' || !!process.env.KITTY_LISTEN_ON;
}

/**
 * Set tab title using escape codes (works in most terminals).
 * This is the fallback for non-Kitty terminals.
 */
function setTabTitleEscapeCode(title: string): void {
  // OSC 0 - Set icon name and window title
  // OSC 2 - Set window title
  // These work in iTerm2, Terminal.app, and most other terminals
  process.stderr.write(`\x1b]0;${title}\x07`);
  process.stderr.write(`\x1b]2;${title}\x07`);
}

/**
 * Handle tab state update with pre-parsed transcript data.
 */
export async function handleTabState(parsed: ParsedTranscript): Promise<void> {
  let plainCompletion = parsed.plainCompletion;

  // Validate completion
  if (!isValidVoiceCompletion(plainCompletion)) {
    console.error(`[TabState] Invalid completion, using fallback`);
    plainCompletion = getTabFallback('end');
  }

  try {
    const state: ResponseState = parsed.responseState;
    const suffix = TAB_SUFFIXES[state];

    // Truncate title for tab readability
    const cleanTitle = plainCompletion.replace(/[…?!]$/, '');
    const words = cleanTitle.split(/\s+/).slice(0, 4);
    let shortTitle = words.join(' ');
    if (shortTitle.length > 25) {
      shortTitle = shortTitle.slice(0, 22) + '…';
    }

    // Add symbol prefix based on state
    const statePrefix = state === 'completed' ? '✓' : state === 'error' ? '⚠' : '';
    const tabTitle = `${statePrefix}${shortTitle}${suffix}`;

    // Terminal-specific handling
    if (isKittyTerminal()) {
      // Kitty: Use remote control with subprocess timeout protection
      await handleKittyTabState(tabTitle, state);
    } else {
      // Other terminals: Use escape codes for basic title support
      // Note: Tab colors not supported in escape codes, only title
      setTabTitleEscapeCode(tabTitle);
      console.error(`[TabState] Set title via escape codes: "${tabTitle}"`);
    }
  } catch (error) {
    console.error('[TabState] Failed to update tab:', error);
    // Don't re-throw - tab state is non-critical, shouldn't crash orchestrator
  }
}

/**
 * Handle Kitty-specific tab state with subprocess control.
 * Uses runWithTimeout to prevent hanging on unresponsive Kitty.
 */
async function handleKittyTabState(tabTitle: string, state: ResponseState): Promise<void> {
  const stateColor = TAB_COLORS[state];

  console.error(`[TabState] Kitty: State=${state}, Color=${stateColor}`);

  // Set tab colors with timeout protection
  const colorResult = await runWithTimeout(
    [
      'kitten', '@', 'set-tab-color', '--self',
      `active_bg=${ACTIVE_TAB_COLOR}`,
      `active_fg=${ACTIVE_TEXT_COLOR}`,
      `inactive_bg=${stateColor}`,
      `inactive_fg=${INACTIVE_TEXT_COLOR}`,
    ],
    KITTY_COMMAND_TIMEOUT_MS,
    { stderr: 'pipe' }
  );

  if (!colorResult.success) {
    if (colorResult.timedOut) {
      console.error(`[TabState] set-tab-color timed out after ${KITTY_COMMAND_TIMEOUT_MS}ms (process killed)`);
    } else {
      console.error(`[TabState] set-tab-color failed (exit ${colorResult.exitCode}): ${colorResult.stderr}`);
    }
    // Don't throw - tab colors are non-critical, continue to try title
  }

  // Set tab title with timeout protection
  const titleResult = await runWithTimeout(
    ['kitty', '@', 'set-tab-title', tabTitle],
    KITTY_COMMAND_TIMEOUT_MS,
    { stderr: 'pipe' }
  );

  if (!titleResult.success) {
    if (titleResult.timedOut) {
      console.error(`[TabState] set-tab-title timed out after ${KITTY_COMMAND_TIMEOUT_MS}ms (process killed)`);
    } else {
      console.error(`[TabState] set-tab-title failed (exit ${titleResult.exitCode}): ${titleResult.stderr}`);
    }
    // Don't throw - tab title is non-critical
  }

  // Log success
  if (colorResult.success && titleResult.success) {
    console.error(`[TabState] Updated Kitty tab: "${tabTitle}" with color ${stateColor}`);
  } else if (colorResult.success || titleResult.success) {
    console.error(`[TabState] Partial update: color=${colorResult.success}, title=${titleResult.success}`);
  }
}
