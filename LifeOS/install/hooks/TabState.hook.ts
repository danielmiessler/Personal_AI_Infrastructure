#!/usr/bin/env bun
/**
 * @version 1.0.1
 * TabState.hook.ts — Unified Kitty tab-state hook (PreToolUse + PostToolUse + Stop)
 *
 * CONSOLIDATION (2026-07-10, {{PRINCIPAL_NAME}}'s hook consolidation):
 * Merges three former hooks into ONE file, dispatched on `hook_event_name`:
 *   - PreToolUse  (matcher AskUserQuestion) ← SetQuestionTab.hook.ts
 *       Sets tab teal (#0D4F4F) and saves previousTitle so the answer can restore it.
 *   - PostToolUse (matcher AskUserQuestion) ← QuestionAnswered.hook.ts
 *       Restores tab to working/orange (#804000) after the user answers.
 *   - Stop                                  ← ResponseTabReset.hook.ts
 *       Sets completion/past-tense tab state via handlers/TabState.ts.
 *
 * PURE TERMINAL-UI PLUMBING: writes ZERO bytes to model context. All output is
 * tab title/color via kitty remote control plus stderr diagnostics; stdout is empty.
 *
 * INPUT:  stdin — hook input JSON (read ONCE, shared across branches).
 * OUTPUT: stdout: None · stderr: status · exit(0): always (non-blocking, fail-open).
 *
 * ERROR HANDLING:
 * - Kitty unavailable: silent failure (other terminals not supported).
 * - stdin empty/malformed: fail-open, exit(0) with no tab change.
 */

import { setTabState, readTabState, stripPrefix, setAscentTab } from './lib/tab-setter';
import { isValidQuestionTitle, getQuestionFallback } from './lib/output-validators';
import { readHookInput, parseTranscriptFromInput, type HookInput } from './lib/hook-io';
import { handleTabState } from './handlers/TabState';

const FALLBACK_TITLE = getQuestionFallback();

// ---------------------------------------------------------------------------
// PreToolUse (AskUserQuestion) — formerly SetQuestionTab.hook.ts
// ---------------------------------------------------------------------------

/**
 * Extract a short summary from the AskUserQuestion tool_input.
 * Uses the header field (already a concise label); falls back to first 3 words
 * of the question text.
 */
function extractSummary(input: any): string {
  try {
    const questions = input?.tool_input?.questions;
    if (!Array.isArray(questions) || questions.length === 0) return FALLBACK_TITLE;

    const q = questions[0];

    // Prefer the header field — it's already a short label
    if (q.header && typeof q.header === 'string' && q.header.trim().length > 0) {
      return q.header.trim();
    }

    // Fallback: first 3 words of the question text
    if (q.question && typeof q.question === 'string') {
      const words = q.question.trim().split(/\s+/).slice(0, 3);
      return words.join(' ').replace(/\?$/, '');
    }
  } catch {
    // Fall through to default
  }
  return FALLBACK_TITLE;
}

function handlePreToolUse(input: HookInput): void {
  let summary = extractSummary(input as any);
  const sessionId = input.session_id;

  // Validate the summary for question titles
  if (!isValidQuestionTitle(summary)) {
    summary = FALLBACK_TITLE;
  }

  try {
    // Read current working title so the PostToolUse branch can restore it
    const currentState = readTabState(sessionId);
    const previousTitle = currentState?.title || undefined;

    // Set tab to question state (teal) with previousTitle + previousAscent for
    // restoration — the question stamp overwrites the state file, so the run's
    // ascent state must ride along or the restore falls back to generic.
    setTabState({ title: summary, state: 'question', previousTitle, previousAscent: currentState?.ascent, sessionId });

    console.error(`[TabState/PreToolUse] Tab set to teal with summary: "${summary}"`);
  } catch (error) {
    // Silently fail if kitty remote control is not available
    console.error('[TabState/PreToolUse] Kitty remote control unavailable');
  }
}

// ---------------------------------------------------------------------------
// PostToolUse (AskUserQuestion) — formerly QuestionAnswered.hook.ts
// ---------------------------------------------------------------------------

function handlePostToolUse(input: HookInput): void {
  try {
    const sessionId = input.session_id;

    // Read previous working title saved by the PreToolUse branch
    const currentState = readTabState(sessionId);
    let restoredTitle = 'Processing answer.';

    if (currentState?.previousTitle) {
      // Strip any emoji prefix from the saved title and re-add working prefix
      const rawTitle = stripPrefix(currentState.previousTitle);
      if (rawTitle) {
        restoredTitle = rawTitle;
      }
    }

    // Restore the run's real ascent state (carried through the question stamp);
    // un-ISA'd work restores to traverse — the pre-Algorithm gear is retired.
    const prior = currentState?.previousAscent;
    const restoreState = prior && !['idle', 'cairn'].includes(prior) ? prior : 'traverse';
    setAscentTab(restoreState, sessionId, restoredTitle);

    console.error(`[TabState/PostToolUse] Tab restored to ascent state: ${restoreState}`);
  } catch (error) {
    // Silently fail if kitty remote control is not available
    console.error('[TabState/PostToolUse] Kitty remote control unavailable');
  }
}

// ---------------------------------------------------------------------------
// Stop — formerly ResponseTabReset.hook.ts
// ---------------------------------------------------------------------------

async function handleStop(input: HookInput): Promise<void> {
  const parsed = await parseTranscriptFromInput(input);

  try {
    await handleTabState(parsed, input.session_id);
  } catch (err) {
    console.error('[TabState/Stop] Handler failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function main() {
  const input = await readHookInput();
  if (!input) { process.exit(0); }

  try {
    switch (input.hook_event_name) {
      case 'PreToolUse':
        handlePreToolUse(input);
        break;
      case 'PostToolUse':
        handlePostToolUse(input);
        break;
      case 'Stop':
        await handleStop(input);
        break;
      default:
        // Unknown event — no-op, fail open
        break;
    }
  } catch (err) {
    console.error('[TabState] Dispatch failed:', err);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[TabState] Fatal:', err);
  process.exit(0);
});
