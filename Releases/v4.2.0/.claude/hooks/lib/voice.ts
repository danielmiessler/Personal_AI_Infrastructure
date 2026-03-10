/**
 * Voice Utility — Centralized voice announcement with enable/disable gate
 *
 * All voice calls should go through this utility. Reads `voice.enabled`
 * from settings.json. When disabled (default), all calls are no-ops.
 *
 * Usage:
 *   import { announce, isVoiceEnabled } from './lib/voice';
 *   await announce('Entering the Algorithm', { voiceId: 'abc123' });
 */

import { getSettings } from './identity';

const VOICE_SERVER_URL = 'http://localhost:8888/notify';
const VOICE_TIMEOUT_MS = 3000;

/**
 * Check if voice is enabled in settings.json.
 * Returns false by default (voice is opt-in).
 */
export function isVoiceEnabled(): boolean {
  try {
    const settings = getSettings();
    return (settings as any).voice?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * Send a voice announcement to the TTS server.
 * No-ops if voice is disabled. Fire-and-forget by default.
 *
 * @param message - Text to speak
 * @param opts.voiceId - ElevenLabs voice ID override
 * @param opts.wait - If true, await the fetch (default: false, fire-and-forget)
 */
export async function announce(
  message: string,
  opts?: { voiceId?: string; wait?: boolean }
): Promise<void> {
  if (!isVoiceEnabled()) return;
  if (!message || message.length < 3) return;

  const body = JSON.stringify({
    message,
    voice_id: opts?.voiceId,
    voice_enabled: true,
  });

  const fetchPromise = fetch(VOICE_SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
  }).catch(() => {});

  if (opts?.wait) {
    await fetchPromise;
  }
}
