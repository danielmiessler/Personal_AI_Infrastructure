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
import { inference } from '../../skills/PAI/Tools/Inference';
import { paiPath } from '../lib/paths';
import { getISOTimestamp } from '../lib/time';
import { getDAName } from '../lib/identity';
import type { ParsedTranscript, ResponseState } from '../../skills/PAI/Tools/TranscriptParser';

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
    // Persisted tab title
  } catch (error) {
    // Failed to persist title - non-critical
  }
}

const COMPLETION_PROMPT = `Create a 3-5 word COMPLETE SENTENCE describing what was done.

FORMAT: "[Specific subject] [past participle]."
The subject MUST come first so tabs are distinguishable.

GOOD (specific subjects):
- "Auth bug fixed."
- "Hook validation updated."
- "Tab title logic simplified."
- "Context filtering improved."
- "Letter to manager drafted."

BAD — NEVER USE GENERIC SUBJECTS:
- "Task completed." (generic — WHAT task?)
- "Task completion described." (generic meta-description)
- "Work finished." (generic)
- "Request handled." (generic)
- "Response generated." (meta)

BAD — fragments:
- "Fixed." (too vague)
- "Updated the" (incomplete)
- "Done with the" (fragment)

RULES:
1. 3-5 words, COMPLETE sentence
2. SPECIFIC subject FIRST (name the actual thing), then past participle
3. NEVER use "task", "work", "request", "response", "completion" as subjects
4. End with period

Output ONLY the sentence. Nothing else.`;

// Generic subjects that provide zero information about what was actually done
const GENERIC_SUBJECTS = [
  'task', 'work', 'request', 'response', 'completion',
  'job', 'item', 'thing', 'action', 'operation', 'process',
];

/**
 * Check if a completion summary uses a generic subject instead of a specific one.
 * "Task completed." is useless. "Auth bug fixed." is useful.
 */
function hasGenericSubject(summary: string): boolean {
  const content = summary.replace(/\.$/, '').trim().toLowerCase();
  const firstWord = content.split(/\s+/)[0];
  return GENERIC_SUBJECTS.includes(firstWord);
}

/**
 * Generate a proper 3-5 word completion summary using inference.
 * Subject comes first for tab distinguishability.
 * Validates output to reject generic summaries like "Task completed."
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
      const words = summary.split(/\s+/).slice(0, 5);
      summary = words.join(' ');
      if (!summary.endsWith('.')) summary += '.';

      // Reject generic subjects — "Task completed." tells you nothing
      if (hasGenericSubject(summary)) {
        // Rejected generic summary - try to extract something specific
        const fallback = extractSpecificSubject(voiceLine);
        return fallback;
      }

      return summary;
    }
  } catch (error) {
    // Inference failed - using fallback
  }
  return getTabFallback('end');
}

/**
 * Extract a specific subject from the voice line when inference produces garbage.
 * Takes the first few meaningful words from the voice line as a fallback.
 */
function extractSpecificSubject(voiceLine: string): string {
  // Strip common prefixes like "Done.", "Kai:", etc.
  const daName = getDAName();
  let cleaned = voiceLine
    .replace(new RegExp(`^(Done\\.?\\s*|${daName}:\\s*|I've\\s+|I\\s+)`, 'i'), '')
    .trim();

  if (!cleaned || cleaned.length < 3) return getTabFallback('end');

  // Take first 4 meaningful words
  const words = cleaned.split(/\s+/).slice(0, 4);
  let result = words.join(' ');
  // Clean trailing punctuation and add period
  result = result.replace(/[,;:!?\-]+$/, '').trim();
  if (!result.endsWith('.')) result += '.';
  return result;
}

/**
 * Handle tab state update with pre-parsed transcript data.
 */
export async function handleTabState(parsed: ParsedTranscript): Promise<void> {
  let plainCompletion = parsed.plainCompletion;

  // Validate completion
  if (!isValidVoiceCompletion(plainCompletion)) {
    // Invalid completion, using fallback
    plainCompletion = getTabFallback('end');
  }

  try {
    const state: ResponseState = parsed.responseState;
    const stateColor = TAB_COLORS[state];

    // Use inference to generate proper completion summary
    const shortTitle = await generateCompletionSummary(plainCompletion);

    // Simple checkmark for completion - color indicates success vs error
    const tabTitle = `✓${shortTitle}`;

    // Tab state updated

    // Persist title for recovery after compaction/restart
    persistTabTitle(tabTitle, shortTitle, state);

    // Set tab colors: active tab always dark blue, inactive shows state color
    await Bun.$`kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_COLOR} active_fg=${ACTIVE_TEXT_COLOR} inactive_bg=${stateColor} inactive_fg=${INACTIVE_TEXT_COLOR}`;

    // Set tab title
    await Bun.$`kitty @ set-tab-title ${tabTitle}`;
  } catch (error) {
    // Failed to update Kitty tab - non-critical
  }
}
