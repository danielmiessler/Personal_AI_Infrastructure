#!/usr/bin/env bun
/**
 * PAI Voice Stop Hook - Main Agent Voice Notifications
 *
 * This hook runs when the main Claude Code agent finishes responding.
 * It extracts the 🗣️ line from responses and sends it to the voice server.
 *
 * Part of the pai-voice-system pack.
 *
 * Configuration (settings.json):
 * ```json
 * {
 *   "hooks": {
 *     "Stop": [{
 *       "type": "command",
 *       "command": "bun run ${PAI_DIR}/skills/VoiceSystem/hooks/stop-hook-voice.ts"
 *     }]
 *   }
 * }
 * ```
 *
 * Environment Variables:
 *   VOICE_SERVER_URL - Voice server URL (default: http://localhost:8888)
 *   ELEVENLABS_VOICE_ID - Default voice ID for TTS
 *   PAI_DIR - PAI installation directory
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { enhanceProsody, cleanForSpeech } from './lib/prosody-enhancer';

// Configuration
const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL || 'http://localhost:8888';
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '';
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// AI Identity - loaded from environment variables first, then DAIDENTITY.md as fallback
interface AIIdentity {
  name: string;
  displayName: string;
  voiceId: string;
}

function loadIdentity(): AIIdentity {
  // Environment variables take priority (set in shell profile or settings.json)
  const envName = process.env.DA;
  const envVoiceId = process.env.ELEVENLABS_VOICE_ID;

  const defaultIdentity: AIIdentity = {
    name: 'PAI',
    displayName: 'PAI',
    voiceId: DEFAULT_VOICE_ID
  };

  // If DA env var is set, use it as primary source
  if (envName) {
    return {
      name: envName,
      displayName: envName,
      voiceId: envVoiceId || DEFAULT_VOICE_ID
    };
  }

  // Fallback: Try to load from DAIDENTITY.md for additional customization
  try {
    const identityPath = join(PAI_DIR, 'skills', 'CORE', 'USER', 'DAIDENTITY.md');
    if (existsSync(identityPath)) {
      const content = readFileSync(identityPath, 'utf-8');

      // Extract fields from markdown format: **Field:** Value
      const nameMatch = content.match(/\*\*Name:\*\*\s*(\w+)/);
      const displayMatch = content.match(/\*\*Display\s*Name:\*\*\s*(.+?)(?:\n|$)/i);
      const voiceMatch = content.match(/\*\*Voice\s*ID:\*\*\s*(\S+)/i);

      return {
        name: nameMatch?.[1] || defaultIdentity.name,
        displayName: displayMatch?.[1]?.trim() || nameMatch?.[1] || defaultIdentity.displayName,
        voiceId: voiceMatch?.[1] || envVoiceId || defaultIdentity.voiceId
      };
    }
  } catch (error) {
    console.error('Error loading identity:', error);
  }

  return defaultIdentity;
}

const AI_IDENTITY = loadIdentity();

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  voice_id?: string;
}

/**
 * Convert Claude content (string or array of blocks) to plain text
 */
function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (typeof c === 'string') return c;
        if (c?.text) return c.text;
        if (c?.content) return contentToText(c.content);
        return '';
      })
      .join(' ')
      .trim();
  }
  return '';
}

/**
 * Extract the voice message from the response
 * Looks for: 🗣️ AI_NAME: [message]
 * Falls back to: 🎯 COMPLETED: [message]
 */
function extractVoiceMessage(text: string): string | null {
  // Remove system-reminder tags
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  // Patterns to try (in order of priority)
  const patterns = [
    // Primary: 🗣️ AI_NAME: [text]
    new RegExp(`🗣️\\s*\\*{0,2}${AI_IDENTITY.name}:?\\*{0,2}\\s*(.+?)(?:\\n|$)`, 'is'),
    // Fallback: 🎯 COMPLETED: [text]
    /🎯\s*\*{0,2}COMPLETED:?\*{0,2}\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let message = match[1].trim();

      // Clean up the message
      message = message.replace(/^\[AGENT:\w+\]\s*/i, ''); // Remove agent tags

      // Clean for speech while preserving prosody markers
      message = cleanForSpeech(message);

      // Enhance with prosody markers
      message = enhanceProsody(message, AI_IDENTITY.name.toLowerCase());

      return message;
    }
  }

  return null;
}

/**
 * Read the last assistant message from the transcript
 */
function getLastAssistantMessage(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let lastAssistantMessage = '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line) as any;

          if (entry.type === 'assistant' && entry.message?.content) {
            const text = contentToText(entry.message.content);
            if (text) {
              lastAssistantMessage = text;
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    return lastAssistantMessage;
  } catch (error) {
    console.error('Error reading transcript:', error);
    return '';
  }
}

/**
 * Send notification to the voice server
 */
async function sendVoiceNotification(payload: NotificationPayload): Promise<void> {
  try {
    const response = await fetch(`${VOICE_SERVER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Voice server error:', response.statusText);
    }
  } catch (error) {
    // Fail silently - voice server may not be running
    console.error('Failed to send voice notification:', error);
  }
}

async function main() {
  let hookInput: HookInput | null = null;

  // Read hook input from stdin
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      hookInput = JSON.parse(input) as HookInput;
    }
  } catch (error) {
    console.error('Error reading hook input:', error);
  }

  // Extract voice message from the last response
  let voiceMessage: string | null = null;

  if (hookInput && hookInput.transcript_path) {
    const lastMessage = getLastAssistantMessage(hookInput.transcript_path);
    if (lastMessage) {
      voiceMessage = extractVoiceMessage(lastMessage);
    }
  }

  // Send voice notification if we have a message
  if (voiceMessage) {
    const payload: NotificationPayload = {
      title: AI_IDENTITY.displayName,
      message: voiceMessage,
      voice_enabled: true,
      voice_id: AI_IDENTITY.voiceId || undefined
    };

    await sendVoiceNotification(payload);
  }

  process.exit(0);
}

// Run the hook
main().catch((error) => {
  console.error('Voice stop hook error:', error);
  process.exit(0); // Don't fail the hook - always exit cleanly
});
