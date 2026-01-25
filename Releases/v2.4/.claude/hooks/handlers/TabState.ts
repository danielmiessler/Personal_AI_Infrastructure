/**
 * TabState.ts - Terminal Tab State Manager
 *
 * PURPOSE:
 * Updates Kitty terminal tab title and color on response completion.
 * Uses Sonnet inference to generate 3-5 word completion summary with
 * SUBJECT FIRST for tab distinguishability (e.g., "Auth bug fixed."
 * not "Fixed the auth bug.").
 *
 * Also persists the last tab title to state for recovery after compaction
 * or session restart.
 *
 * Pure handler: receives pre-parsed transcript data, updates Kitty tab.
 */

import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { isValidVoiceCompletion, getTabFallback } from '../lib/response-format';
import { inference } from '../../skills/CORE/Tools/Inference';
import { paiPath } from '../lib/paths';
import { getISOTimestamp } from '../lib/time';
import type { ParsedTranscript, ResponseState } from '../../skills/CORE/Tools/TranscriptParser';

// Tab color states for visual feedback (inactive tab only - active tab stays dark blue)
const TAB_COLORS = {
  awaitingInput: '#0D6969',  // Dark teal - needs input
  completed: '#022800',      // Very dark green - success
  error: '#804000',          // Dark orange - problem
} as const;

// No suffixes needed - sentences end with periods
// State is shown via prefix symbol only

const ACTIVE_TAB_COLOR = '#002B80';  // Dark blue
const ACTIVE_TEXT_COLOR = '#FFFFFF';
const INACTIVE_TEXT_COLOR = '#A0A0A0';

// State file for tab title persistence
const TAB_STATE_PATH = paiPath('MEMORY', 'STATE', 'tab-title.json');

interface TabTitleState {
  title: string;
  rawTitle: string;  // Without prefix
  timestamp: string;
  state: ResponseState;
}

/**
 * Persist tab title to state file for recovery after compaction/restart.
 */
function persistTabTitle(title: string, rawTitle: string, state: ResponseState): void {
  try {
    const stateDir = dirname(TAB_STATE_PATH);
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }

    const tabState: TabTitleState = {
      title,
      rawTitle,
      timestamp: getISOTimestamp(),
      state,
    };

    writeFileSync(TAB_STATE_PATH, JSON.stringify(tabState, null, 2), 'utf-8');
    console.error(`[TabState] Persisted title: "${rawTitle}"`);
  } catch (error) {
    console.error('[TabState] Failed to persist title:', error);
  }
}

const COMPLETION_PROMPT = `Create a 3-5 word COMPLETE SENTENCE describing what was done.

FORMAT: "[Subject/topic] [past participle]."
The subject MUST come first so tabs are distinguishable.

GOOD (complete sentences):
- "Auth bug fixed."
- "Hook validation updated."
- "Tab title logic simplified."
- "Context filtering improved."

BAD (fragments):
- "Fixed." (too vague)
- "Updated the" (incomplete)
- "Done with the" (fragment)

RULES:
1. 3-5 words, COMPLETE sentence
2. Subject/topic FIRST, then past participle (fixed, updated, added)
3. Be SPECIFIC about what was changed
4. End with period

Output ONLY the sentence. Nothing else.`;

/**
 * Generate a proper 3-5 word completion summary using inference.
 * Subject comes first for tab distinguishability.
 */
async function generateCompletionSummary(voiceLine: string): Promise<string> {
  try {
    const result = await inference({
      systemPrompt: COMPLETION_PROMPT,
      userPrompt: voiceLine.slice(0, 500),
      timeout: 20000,
      level: 'standard',  // Sonnet for better subject extraction
    });

    if (result.success && result.output) {
      let summary = result.output.replace(/^["']|["']$/g, '').trim();
      const words = summary.split(/\s+/).slice(0, 5);  // Allow up to 5 words for subject-first format
      summary = words.join(' ');
      if (!summary.endsWith('.')) summary += '.';
      return summary;
    }
  } catch (error) {
    console.error('[TabState] Inference failed:', error);
  }
  return getTabFallback('end');
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

    // Use inference to generate proper completion summary
    const shortTitle = await generateCompletionSummary(plainCompletion);

    // Simple checkmark for completion - color indicates success vs error
    const tabTitle = `✓${shortTitle}`;

    console.error(`[TabState] State: ${state}, Title: "${tabTitle}"`);

    // Persist title for recovery after compaction/restart
    persistTabTitle(tabTitle, shortTitle, state);

    // Set tab colors: active tab always dark blue, inactive shows state color
    await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_COLOR} active_fg=${ACTIVE_TEXT_COLOR} inactive_bg=${stateColor} inactive_fg=${INACTIVE_TEXT_COLOR}`;

    // Set tab title
    await Bun.$`kitty @ set-tab-title ${tabTitle}`;
  } catch (error) {
    console.error('[TabState] Failed to update Kitty tab:', error);
  }
}
