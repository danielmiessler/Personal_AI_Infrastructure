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
 * INPUT:
 * - None (triggered by tool match, no stdin processing)
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status message
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Kitty remote control: Sets tab color to teal (#085050)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None
 * - COORDINATES WITH: UpdateTabTitle (shares tab color management)
 * - MUST RUN BEFORE: None
 * - MUST RUN AFTER: UpdateTabTitle (overrides working color when asking)
 *
 * TAB COLOR SCHEME (inactive tab only - active tab stays dark blue):
 * - Dark teal (#085050): Waiting for user input (this hook)
 * - Dark orange (#804000): Actively working (UpdateTabTitle)
 * - Dark purple (#1E0A3C): AI inference/thinking (UpdateTabTitle)
 * - Dark blue (#002B80): Active tab always uses this
 *
 * ERROR HANDLING:
 * - Kitty unavailable: Silent failure (other terminals not supported)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <50ms
 */

import { existsSync } from 'fs';

const TAB_AWAITING_BG = '#085050';  // Dark teal - waiting for user input
const ACTIVE_TAB_BG = '#002B80';    // Dark blue - active tab always
const TAB_TEXT = '#FFFFFF';
const INACTIVE_TEXT = '#A0A0A0';

// Simple question indicator - teal background does the work
const QUESTION_TITLE = '❓ Question';

/**
 * Get kitty socket path - required for socket-only remote control.
 * Using socket-based control prevents escape sequence leaks (P@kitty-cmd artifacts).
 */
function getKittySocket(): string | null {
  if (process.env.KITTY_LISTEN_ON) {
    return process.env.KITTY_LISTEN_ON;
  }
  const defaultSocket = `/tmp/kitty-${process.env.USER}`;
  try {
    if (existsSync(defaultSocket)) {
      return `unix:${defaultSocket}`;
    }
  } catch {}
  return null;
}

async function main() {
  try {
    const socket = getKittySocket();

    if (!socket) {
      console.error('[SetQuestionTab] No kitty socket available, skipping');
      process.exit(0);
    }

    // Set tab color: active stays dark blue, inactive shows teal
    await Bun.$`kitten @ --to ${socket} set-tab-color --self active_bg=${ACTIVE_TAB_BG} active_fg=${TAB_TEXT} inactive_bg=${TAB_AWAITING_BG} inactive_fg=${INACTIVE_TEXT}`;

    // Set simple question title - teal background provides visual distinction
    await Bun.$`kitty @ --to ${socket} set-tab-title ${QUESTION_TITLE}`;

    console.error('[SetQuestionTab] Tab set to teal with question indicator');
  } catch (error) {
    // Silently fail if kitty remote control is not available
    console.error('[SetQuestionTab] Kitty remote control unavailable');
  }

  process.exit(0);
}

main();
