#!/usr/bin/env bun
/**
 * QuestionAnswered.hook.ts - Reset Tab After Question Answered (PostToolUse)
 *
 * PURPOSE:
 * Resets the terminal tab from question state (teal) back to working state (orange)
 * after the user answers an AskUserQuestion prompt. This bridges the gap where
 * question answers don't trigger UserPromptSubmit (they're tool results, not prompts).
 *
 * TRIGGER: PostToolUse (matcher: AskUserQuestion)
 *
 * INPUT:
 * - stdin: Hook input JSON with tool_input containing the user's answer
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status message
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Kitty remote control: Sets tab color to orange (#804000)
 * - Kitty remote control: Sets tab title to working format
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: SetQuestionTab (runs before this, sets teal)
 * - COORDINATES WITH: UpdateTabTitle (shares tab color scheme)
 * - MUST RUN AFTER: SetQuestionTab (resets its teal color)
 *
 * TAB COLOR SCHEME (inactive tab only - active tab stays dark blue):
 * - Dark teal (#085050): Waiting for user input (SetQuestionTab)
 * - Dark orange (#804000): Actively working (this hook + UpdateTabTitle)
 * - Dark purple (#1E0A3C): AI inference/thinking (UpdateTabTitle)
 * - Dark blue (#002B80): Active tab always uses this
 *
 * ERROR HANDLING:
 * - Kitty unavailable: Silent failure
 */

const TAB_WORKING_BG = '#804000';      // Dark orange - actively working
const ACTIVE_TAB_BG = '#002B80';       // Dark blue - active tab always
const ACTIVE_TEXT = '#FFFFFF';
const INACTIVE_TEXT = '#A0A0A0';

async function main() {
  try {
    // Set tab color: active stays dark blue, inactive shows orange
    await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_BG} active_fg=${ACTIVE_TEXT} inactive_bg=${TAB_WORKING_BG} inactive_fg=${INACTIVE_TEXT}`.quiet();

    // Set working title
    await Bun.$`kitty @ set-tab-title "⚙️Processing answer…"`.quiet();

    console.error('[QuestionAnswered] Tab reset to working state (orange on inactive only)');
  } catch (error) {
    // Silently fail if kitty remote control is not available
    console.error('[QuestionAnswered] Kitty remote control unavailable');
  }

  process.exit(0);
}

main();
