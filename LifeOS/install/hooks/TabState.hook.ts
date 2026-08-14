#!/usr/bin/env bun
/**
 * @version 1.1.0
 * TabState.hook.ts — Unified Kitty tab-state hook (PreToolUse + PostToolUse + Stop)
 *
 * Since 2026-08-12 EVERY stamp routes through setAscentTab: the tab color is
 * always the run's ascent-state color (the same paint as the Pulse phase list),
 * and the "waiting on you" signal is the ⏳ activity glyph, not a special color
 * (question teal and blocked amber are retired).
 *
 * CONSOLIDATION (2026-07-10, {{PRINCIPAL_NAME}}'s hook consolidation):
 * Merges three former hooks into ONE file, dispatched on `hook_event_name`:
 *   - PreToolUse  (matcher AskUserQuestion) ← SetQuestionTab.hook.ts
 *       Stamps ⏳ on the run's ascent color; saves previousTitle for restore.
 *   - PostToolUse (matcher AskUserQuestion) ← QuestionAnswered.hook.ts
 *       Restores the run's prior ascent state after the user answers.
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

import { readTabState, stripPrefix, setAscentTab } from './lib/tab-setter';
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

    // The question keeps the run's ascent COLOR (tab colors are the six run
    // states since 2026-08-12); the ⏳ activity glyph carries "waiting on you".
    // previousTitle + previousAscent ride along so the answer restores the run.
    const prior = currentState?.ascent;
    const stampState = prior && !['idle', 'cairn'].includes(prior) ? prior : 'traverse';
    setAscentTab(stampState, sessionId, summary, {
      activity: 'waiting',
      previousTitle,
      previousAscent: prior,
    });

    console.error(`[TabState/PreToolUse] Question stamp (⏳, ${stampState}): "${summary}"`);
  } catch (error) {
    // Silently fail if kitty remote control is not available
    console.error('[TabState/PreToolUse] Kitty remote control unavailable');
  }
}

// ---------------------------------------------------------------------------
// PermissionRequest — blocked-on-approval stamp (Herdr steal, 2026-08-11)
// ---------------------------------------------------------------------------

/** Short human-readable detail for the blocked title: what needs approving. */
function permissionDetail(input: any): string {
  const toolName = typeof input?.tool_name === 'string' ? input.tool_name : 'tool';
  try {
    const ti = input?.tool_input;
    if (toolName === 'Bash' && typeof ti?.command === 'string') {
      const cmd = ti.command.trim().replace(/\s+/g, ' ');
      return `Bash ${cmd.slice(0, 40)}${cmd.length > 40 ? '…' : ''}`;
    }
    if (typeof ti?.file_path === 'string') {
      const base = ti.file_path.split('/').filter(Boolean).pop();
      if (base) return `${toolName} ${base}`;
    }
  } catch { /* fall through */ }
  return toolName;
}

function handlePermissionRequest(input: HookInput): void {
  const sessionId = input.session_id;
  try {
    const currentState = readTabState(sessionId);
    // A second request while already blocked must not overwrite the REAL
    // previous title/ascent with the blocked stamp itself.
    const alreadyBlocked = currentState?.blocked === true;
    const previousTitle = alreadyBlocked ? currentState?.previousTitle : (currentState?.title || undefined);
    const previousAscent = alreadyBlocked ? currentState?.previousAscent : currentState?.ascent;

    // Approval stamps keep the run's ascent color too — ⏳ + the APPROVE text
    // carry the "waiting on you" signal (the amber blocked color is retired).
    const stampState = previousAscent && !['idle', 'cairn'].includes(previousAscent) ? previousAscent : 'traverse';
    setAscentTab(stampState, sessionId, `APPROVE: ${permissionDetail(input as any)}`, {
      activity: 'waiting',
      literal: true,
      blocked: true,
      previousTitle,
      previousAscent,
    });
    console.error(`[TabState/PermissionRequest] Approval stamp (⏳, ${stampState})`);
  } catch {
    console.error('[TabState/PermissionRequest] Kitty remote control unavailable');
  }
}

/** Restore a blocked tab after the approved tool completed. */
function restoreFromBlocked(input: HookInput): void {
  try {
    const sessionId = input.session_id;
    const currentState = readTabState(sessionId);
    if (!currentState?.blocked) return; // not blocked — fast no-op (wildcard path)

    // Fall back to the traverse gerund, never a bare state word — and never
    // "restore" a stacked APPROVE stamp as if it were the run's real title.
    let restoredTitle = 'Traversing.';
    if (currentState.previousTitle) {
      const rawTitle = stripPrefix(currentState.previousTitle);
      if (rawTitle && !/^APPROVE:/i.test(rawTitle)) restoredTitle = rawTitle;
    }
    const prior = currentState.previousAscent;
    const restoreState = prior && !['idle', 'cairn'].includes(prior) ? prior : 'traverse';
    setAscentTab(restoreState, sessionId, restoredTitle);
    console.error(`[TabState/PostToolUse] Blocked tab restored to ascent state: ${restoreState}`);
  } catch {
    console.error('[TabState/PostToolUse] Blocked-restore failed (kitty unavailable)');
  }
}

// ---------------------------------------------------------------------------
// PostToolUse — question restore (AskUserQuestion) or blocked restore (any tool)
// ---------------------------------------------------------------------------

function handlePostToolUse(input: HookInput): void {
  // Wildcard registration: any tool other than AskUserQuestion only ever
  // clears a blocked stamp; everything else exits untouched.
  if ((input as any).tool_name !== 'AskUserQuestion') {
    restoreFromBlocked(input);
    return;
  }
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
      case 'PermissionRequest':
        handlePermissionRequest(input);
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
