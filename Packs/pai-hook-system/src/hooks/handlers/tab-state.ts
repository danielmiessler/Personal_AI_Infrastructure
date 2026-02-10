/**
 * tab-state.ts - Kitty tab state handler
 *
 * Pure handler: receives pre-parsed transcript data, updates Kitty tab.
 * No I/O for transcript reading - that's done by orchestrator.
 * Uses socket-based remote control to prevent escape sequence leaks.
 */

import { existsSync } from 'fs';
import { isValidVoiceCompletion, getTabFallback } from '../lib/response-format';
import type { ParsedTranscript, ResponseState } from '../../skills/CORE/Tools/TranscriptParser';

// Tab color states for visual feedback (inactive tab only - active tab stays dark blue)
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

/**
 * Handle tab state update with pre-parsed transcript data.
 */
export async function handleTabState(parsed: ParsedTranscript): Promise<void> {
  let plainCompletion = parsed.plainCompletion;

  // Validate completion
  if (!isValidVoiceCompletion(plainCompletion)) {
    console.error(`[TabState] Invalid completion: "${plainCompletion.slice(0, 50)}..."`);
    plainCompletion = getTabFallback('end');
  }

  try {
    const state: ResponseState = parsed.responseState;
    const stateColor = TAB_COLORS[state];
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

    console.error(`[TabState] State: ${state}, Color: ${stateColor}, Suffix: "${suffix}"`);

    // Get socket for kitty remote control
    const socket = getKittySocket();

    if (!socket) {
      console.error('[TabState] No kitty socket available, skipping tab update');
      return;
    }

    // Set tab colors: active tab always dark blue, inactive shows state color
    await Bun.$`kitten @ --to ${socket} set-tab-color --self active_bg=${ACTIVE_TAB_COLOR} active_fg=${ACTIVE_TEXT_COLOR} inactive_bg=${stateColor} inactive_fg=${INACTIVE_TEXT_COLOR}`;

    // Set tab title
    await Bun.$`kitty @ --to ${socket} set-tab-title ${tabTitle}`;
  } catch (error) {
    console.error('[TabState] Failed to update Kitty tab:', error);
  }
}
