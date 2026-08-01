/**
 * notification-channel.ts — Channel isolation for desktop VoiceServer.
 *
 * The Pulse VoiceServer at localhost:31337/notify is the DESKTOP voice channel.
 * It plays audio out of the laptop speaker. Stop / StopFailure / UserPromptSubmit
 * hooks that fire /notify must NOT fire when the Claude session is running on
 * behalf of a remote channel (iMessage, Siri) — those channels deliver
 * replies via their own APIs, and a desktop /notify call from a
 * remote-channel turn is a leak.
 *
 * Contract:
 *   PULSE/modules/imessage.ts spawns its SDK subprocess with
 *     env: { ...process.env, LIFEOS_NOTIFICATION_CHANNEL: "imessage" }
 *   Any future remote channel (email, slack, ...) follows the same pattern.
 *
 * Every voice-firing hook checks isDesktopChannel() before calling /notify,
 * and writes a skipped event to voice-events.jsonl with reason
 * 'remote_channel:<channel>' so the leak is observable in either direction.
 */

import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { paiPath } from './paths';
import { getISOTimestamp } from './time';

export type NotificationChannel = 'desktop' | 'imessage' | string;

const VOICE_LOG_PATH = paiPath('MEMORY', 'VOICE', 'voice-events.jsonl');

/**
 * Read the current notification channel from the env. Defaults to 'desktop'
 * when unset — terminal/main-session behavior is preserved.
 */
export function getNotificationChannel(): NotificationChannel {
  const raw = process.env.LIFEOS_NOTIFICATION_CHANNEL;
  if (!raw || raw.length === 0) return 'desktop';
  return raw as NotificationChannel;
}

/**
 * True when the channel is 'desktop' or unset. Voice-firing hooks gate on this:
 * if false, skip the /notify call and log a skipped event.
 */
export function isDesktopChannel(): boolean {
  return getNotificationChannel() === 'desktop';
}

/**
 * Append a skipped-voice event to voice-events.jsonl. Caller passes the
 * hook label and the message it would have voiced, plus the session id.
 * Best-effort — silent failure on FS error so a logging glitch never blocks
 * the host hook from completing.
 */
export function logSkippedVoice(opts: {
  hookLabel: string;
  message: string;
  sessionId?: string;
}): void {
  try {
    const channel = getNotificationChannel();
    const event = {
      timestamp: getISOTimestamp(),
      session_id: opts.sessionId ?? 'unknown',
      event_type: 'skipped' as const,
      hook: opts.hookLabel,
      reason: `remote_channel:${channel}`,
      message: opts.message,
      character_count: opts.message.length,
      voice_engine: 'elevenlabs' as const,
    };
    const dir = paiPath('MEMORY', 'VOICE');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(VOICE_LOG_PATH, JSON.stringify(event) + '\n');
  } catch {
    // Silent — observability must not break host hooks.
  }
}
