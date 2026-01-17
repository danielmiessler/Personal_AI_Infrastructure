/**
 * tab-state.ts - Kitty tab state handler
 *
 * Pure handler: receives pre-parsed transcript data, updates Kitty tab.
 * Uses inference to generate proper 3-4 word completion summary.
 */

import { isValidVoiceCompletion, getTabFallback } from '../lib/response-format';
import { inference } from '../../skills/CORE/Tools/Inference';
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

const COMPLETION_PROMPT = `Convert this completion message into a 3-4 word past-tense sentence.

Format: "[Past tense verb] the [object]."

Examples:
- "Fixed auth bug" → "Fixed the auth bug."
- "Removed assistant messages from context" → "Fixed the context issue."
- "Updated the hook logic" → "Updated the hook."
- "Created new component" → "Created the component."

RULES:
1. MUST be 3-4 words maximum
2. MUST start with past tense verb (Fixed, Updated, Created, etc.)
3. MUST end with period
4. Use "the" before common nouns

Output ONLY the sentence. Nothing else.`;

/**
 * Generate a proper 3-4 word completion summary using inference.
 */
async function generateCompletionSummary(voiceLine: string): Promise<string> {
  try {
    const result = await inference({
      systemPrompt: COMPLETION_PROMPT,
      userPrompt: voiceLine.slice(0, 500),
      timeout: 10000,
      level: 'fast',
    });

    if (result.success && result.output) {
      let summary = result.output.replace(/^["']|["']$/g, '').trim();
      const words = summary.split(/\s+/).slice(0, 4);
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

    // Set tab colors: active tab always dark blue, inactive shows state color
    await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_COLOR} active_fg=${ACTIVE_TEXT_COLOR} inactive_bg=${stateColor} inactive_fg=${INACTIVE_TEXT_COLOR}`;

    // Set tab title
    await Bun.$`kitty @ set-tab-title ${tabTitle}`;
  } catch (error) {
    console.error('[TabState] Failed to update Kitty tab:', error);
  }
}
