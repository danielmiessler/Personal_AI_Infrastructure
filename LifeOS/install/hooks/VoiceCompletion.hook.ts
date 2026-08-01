#!/usr/bin/env bun
/**
 * @version 1.4.6
 * VoiceCompletion.hook.ts — Send completion voice line to TTS server
 *
 * PURPOSE:
 * Extracts the 🗣️ voice line from Claude's response and sends it to
 * the ElevenLabs voice server for spoken playback.
 *
 * TRIGGER: Stop
 *
 * NEEDS TRANSCRIPT: Yes (for voice line extraction)
 *
 * VOICE GATE: Only fires for main terminal sessions (not subagents).
 * Checks for kitty-sessions/{sessionId}.json to determine if main session.
 *
 * HANDLER: handlers/VoiceNotification.ts
 */

import { readHookInput, parseTranscriptFromInput } from './lib/hook-io';
import { handleVoice } from './handlers/VoiceNotification';
import { extractVoiceCompletion } from '../LIFEOS/TOOLS/TranscriptParser';
import { isDesktopChannel, logSkippedVoice, getNotificationChannel } from './lib/notification-channel';

/**
 * Extract a speakable summary from response text when no 🗣️ line exists.
 * Tries structured markers first, then falls back to first sentence.
 */
function extractFallbackSummary(text: string): string {
  // Strip system-reminder tags
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  // Try SUMMARY line
  const summaryMatch = text.match(/📋\s*\*{0,2}SUMMARY:?\*{0,2}\s*(.+?)(?:\n|$)/i);
  if (summaryMatch?.[1]) {
    const summary = summaryMatch[1].trim();
    if (summary.length >= 10 && summary.length <= 200) return summary;
  }

  // Try CHANGE/VERIFY bullets (take first one)
  const changeMatch = text.match(/🔧\s*\*{0,2}CHANGE:?\*{0,2}\s*(.+?)(?:\n|$)/i);
  if (changeMatch?.[1]) {
    const change = changeMatch[1].trim();
    if (change.length >= 10 && change.length <= 200) return change;
  }

  // Last resort: first sentence that looks like a summary (>20 chars, ends with period)
  const sentences = text.split(/[.!?]\s/);
  for (const s of sentences) {
    const clean = s.replace(/[#*_`~>\[\](){}|]/g, '').trim();
    if (clean.length >= 20 && clean.length <= 150 && !/^[═━─╌]/.test(clean)) {
      return clean + '.';
    }
  }

  return '';
}

/**
 * Voice gate: only main terminal sessions get voice.
 * Subagents spawned via Task tool have CLAUDE_CODE_AGENT_TASK_ID set.
 * The old kitty-sessions file check was unreliable — new sessions
 * had no file and were incorrectly blocked.
 */
function isMainSession(): boolean {
  // Subagents set this env var; main sessions don't
  return !process.env.CLAUDE_CODE_AGENT_TASK_ID;
}

async function main() {
  const input = await readHookInput();
  if (!input) { process.exit(0); }

  // Voice gate: skip subagent sessions
  if (!isMainSession()) {
    console.error('[VoiceCompletion] Voice OFF (not main session)');
    process.exit(0);
  }

  // Channel gate: desktop /notify must not fire when the session is running
  // on behalf of a remote channel (iMessage, Siri). Those channels deliver
  // replies via their own APIs. See hooks/lib/notification-channel.ts.
  if (!isDesktopChannel()) {
    const channel = getNotificationChannel();
    console.error(`[VoiceCompletion] Voice OFF (remote channel: ${channel})`);
    logSkippedVoice({ hookLabel: 'VoiceCompletion', message: '', sessionId: input.session_id });
    process.exit(0);
  }

  const parsed = await parseTranscriptFromInput(input);

  // Fallback: if transcript parsing found no voice line, try last_assistant_message
  if (!parsed.voiceCompletion && input.last_assistant_message) {
    const fromLastMsg = extractVoiceCompletion(input.last_assistant_message);
    if (fromLastMsg) {
      parsed.voiceCompletion = fromLastMsg;
    } else {
      // Final fallback: extract first meaningful sentence from last_assistant_message
      const fallback = extractFallbackSummary(input.last_assistant_message);
      if (fallback) {
        parsed.voiceCompletion = fallback;
      }
    }
  }

  try {
    await handleVoice(parsed, input.session_id);
  } catch (err) {
    console.error('[VoiceCompletion] Handler failed:', err);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[VoiceCompletion] Fatal:', err);
  process.exit(0);
});
