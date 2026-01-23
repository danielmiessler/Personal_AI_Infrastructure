#!/usr/bin/env bun
/**
 * SetQuestionTab.hook.ts - Tab Color for User Input (PreToolUse)
 *
 * PURPOSE:
 * Changes the terminal tab color to dark teal when Claude invokes the
 * AskUserQuestion tool. This visual indicator shows that the system is
 * waiting for user input, distinct from the working (orange) or inference
 * (purple) states set by UpdateTabTitle.
 *
 * TRIGGER: PreToolUse (matcher: AskUserQuestion)
 *
 * TERMINAL DETECTION:
 * Uses the same pattern as UpdateTabTitle.hook.ts:
 * - Kitty: Uses remote control API for colors + title
 * - Other terminals: Falls back to escape codes for basic title support
 *
 * TAB COLOR SCHEME (Kitty only - inactive tab):
 * - Dark teal (#085050): Waiting for user input (this hook)
 * - Dark orange (#804000): Actively working (UpdateTabTitle)
 * - Dark purple (#1E0A3C): AI inference/thinking (UpdateTabTitle)
 * - Dark blue (#002B80): Active tab always uses this
 *
 * ERROR HANDLING:
 * - Kitty unavailable: Falls back to escape codes
 * - All errors: Silent failure (non-blocking)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <50ms
 */

import { runWithTimeout } from '../lib/subprocess';

const TAB_AWAITING_BG = '#085050';  // Dark teal - waiting for user input
const ACTIVE_TAB_BG = '#002B80';    // Dark blue - active tab always
const TAB_TEXT = '#FFFFFF';
const INACTIVE_TEXT = '#A0A0A0';

// Simple question indicator - teal background does the work
const QUESTION_TITLE = '❓ Question';

// Timeout for Kitty commands
const KITTY_COMMAND_TIMEOUT_MS = 2000;

/**
 * Check if we're running in Kitty terminal with remote control available.
 */
function isKittyTerminal(): boolean {
  return process.env.TERM === 'xterm-kitty' || !!process.env.KITTY_LISTEN_ON;
}

/**
 * Set tab title using escape codes (works in most terminals).
 */
function setTabTitleEscapeCode(title: string): void {
  process.stderr.write(`\x1b]0;${title}\x07`);
  process.stderr.write(`\x1b]2;${title}\x07`);
}

async function main() {
  try {
    if (isKittyTerminal()) {
      // Kitty: Use remote control with subprocess timeout protection
      const colorResult = await runWithTimeout(
        [
          'kitten', '@', 'set-tab-color', '--self',
          `active_bg=${ACTIVE_TAB_BG}`,
          `active_fg=${TAB_TEXT}`,
          `inactive_bg=${TAB_AWAITING_BG}`,
          `inactive_fg=${INACTIVE_TEXT}`,
        ],
        KITTY_COMMAND_TIMEOUT_MS,
        { stderr: 'pipe' }
      );

      if (colorResult.success) {
        const titleResult = await runWithTimeout(
          ['kitty', '@', 'set-tab-title', QUESTION_TITLE],
          KITTY_COMMAND_TIMEOUT_MS,
          { stderr: 'pipe' }
        );

        if (titleResult.success) {
          console.error('[SetQuestionTab] Kitty tab set to teal with question indicator');
        }
      } else {
        console.error('[SetQuestionTab] Kitty remote control failed, falling back to escape codes');
        setTabTitleEscapeCode(QUESTION_TITLE);
      }
    } else {
      // Other terminals: Use escape codes for basic title support
      setTabTitleEscapeCode(QUESTION_TITLE);
      console.error('[SetQuestionTab] Set title via escape codes');
    }
  } catch (error) {
    // Silently fail - tab state is non-critical
    console.error('[SetQuestionTab] Error:', error);
  }

  process.exit(0);
}

main();
