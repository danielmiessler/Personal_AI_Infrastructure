/**
 * VoiceNotification.ts - Voice Notification Handler
 *
 * PURPOSE:
 * Sends completion messages to the voice server for TTS playback.
 * Extracts the 🗣️ voice line from responses and sends to ElevenLabs via voice server.
 *
 * Pure handler: receives pre-parsed transcript data, sends to voice server.
 * No I/O for transcript reading - that's done by VoiceCompletion.hook.ts.
 */

import { existsSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { paiPath } from '../lib/paths';
import { getIdentity, type VoicePersonality } from '../lib/identity';
import { getISOTimestamp } from '../lib/time';
import { isValidVoiceCompletion, getVoiceFallback } from '../lib/output-validators';
import { findActiveSessionByUUID } from '../lib/isa-utils';

import type { ParsedTranscript } from '../../LIFEOS/TOOLS/TranscriptParser';
import { PULSE_BASE } from '../../LIFEOS/PULSE/endpoint';

const DA_IDENTITY = getIdentity();

// ElevenLabs voice notification payload
interface ElevenLabsNotificationPayload {
  message: string;
  title?: string;
  voice_enabled?: boolean;
  voice_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    speed: number;
    use_speaker_boost: boolean;
  };
  volume?: number;
}

interface VoiceEvent {
  timestamp: string;
  session_id: string;
  event_type: 'sent' | 'failed' | 'skipped';
  message: string;
  character_count: number;
  voice_engine: 'elevenlabs';
  voice_id: string;
  status_code?: number;
  error?: string;
}

const VOICE_LOG_PATH = paiPath('MEMORY', 'VOICE', 'voice-events.jsonl');

/**
 * Resolve the active session's work dir for echoing voice events into a
 * per-session `voice.jsonl`. Source of truth is MEMORY/STATE/work.json,
 * matched by sessionUUID. Returns null when no active row exists — the
 * voice event still lands in the global voice-events.jsonl above.
 */
function getActiveWorkDir(sessionId: string): string | null {
  try {
    const active = findActiveSessionByUUID(sessionId);
    if (!active) return null;
    const workPath = paiPath('MEMORY', 'WORK', active.slug);
    return existsSync(workPath) ? workPath : null;
  } catch {
    return null;
  }
}

function logVoiceEvent(event: VoiceEvent): void {
  const line = JSON.stringify(event) + '\n';

  try {
    const dir = paiPath('MEMORY', 'VOICE');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(VOICE_LOG_PATH, line);
  } catch {
    // Silent fail
  }

  try {
    const workDir = event.session_id ? getActiveWorkDir(event.session_id) : null;
    if (workDir) {
      appendFileSync(join(workDir, 'voice.jsonl'), line);
    }
  } catch {
    // Silent fail
  }
}

async function sendNotification(payload: ElevenLabsNotificationPayload, sessionId: string): Promise<void> {
  const voiceId = payload.voice_id || DA_IDENTITY.mainDAVoiceID;

  const baseEvent: Omit<VoiceEvent, 'event_type' | 'status_code' | 'error'> = {
    timestamp: getISOTimestamp(),
    session_id: sessionId,
    message: payload.message,
    character_count: payload.message.length,
    voice_engine: 'elevenlabs',
    voice_id: voiceId,
  };

  try {
    // Use ElevenLabs voice server /notify endpoint
    const response = await fetch(`${PULSE_BASE}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout - ElevenLabs TTS takes ~4s, need headroom
    });

    if (!response.ok) {
      console.error('[Voice] Server error:', response.statusText);
      logVoiceEvent({
        ...baseEvent,
        event_type: 'failed',
        status_code: response.status,
        error: response.statusText,
      });
    } else {
      logVoiceEvent({
        ...baseEvent,
        event_type: 'sent',
        status_code: response.status,
      });

    }
  } catch (error) {
    console.error('[Voice] Failed to send:', error);
    logVoiceEvent({
      ...baseEvent,
      event_type: 'failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle voice notification with pre-parsed transcript data.
 * Uses ElevenLabs TTS via the voice server.
 */
export async function handleVoice(parsed: ParsedTranscript, sessionId: string): Promise<void> {
  let voiceCompletion = parsed.voiceCompletion;

  // Validate voice completion
  if (!isValidVoiceCompletion(voiceCompletion)) {
    console.error(`[Voice] Invalid completion: "${voiceCompletion.slice(0, 50)}..."`);
    voiceCompletion = getVoiceFallback();
  }

  // Skip empty or too-short messages
  if (!voiceCompletion || voiceCompletion.length < 5) {
    console.error('[Voice] Skipping - message too short or empty');
    return;
  }

  // Get voice settings from DA identity in settings.json
  const voiceId = DA_IDENTITY.mainDAVoiceID;
  const voiceSettings = DA_IDENTITY.voice;

  const payload: ElevenLabsNotificationPayload = {
    message: voiceCompletion,
    title: `${DA_IDENTITY.name} says`,
    voice_enabled: true,
    voice_id: voiceId,
    voice_settings: voiceSettings ? {
      stability: voiceSettings.stability ?? 0.5,
      similarity_boost: voiceSettings.similarityBoost ?? 0.75,
      style: voiceSettings.style ?? 0.0,
      speed: voiceSettings.speed ?? 1.0,
      use_speaker_boost: voiceSettings.useSpeakerBoost ?? true,
    } : undefined,
  };

  await sendNotification(payload, sessionId);
}
