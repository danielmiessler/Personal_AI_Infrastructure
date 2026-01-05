#!/usr/bin/env bun
// $PAI_DIR/hooks/stop-hook-voice.ts
// Main agent voice notification with prosody enhancement

import { readFileSync } from 'fs';
import { enhanceProsody, cleanForSpeech, getVoiceId } from './lib/prosody-enhancer';

const isStrictMode = process.env.VOICE_STRICT_MODE === 'true' ||
                     process.env.VOICE_STRICT_MODE === '1';

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  priority?: 'low' | 'normal' | 'high';
  voice_id: string;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

/**
 * Convert Claude content to plain text
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
 * Extract completion message with prosody enhancement
 */
function extractCompletion(text: string, agentType: string = 'pai'): string | null {
  // Remove system-reminder tags
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  // Look for COMPLETED section
  const patterns = [
    /🎯\s*\*{0,2}COMPLETED:?\*{0,2}\s*(.+?)(?:\n|$)/i,
    /\*{0,2}COMPLETED:?\*{0,2}\s*(.+?)(?:\n|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let completed = match[1].trim();

      // Clean agent tags
      completed = completed.replace(/^\[AGENT:\w+\]\s*/i, '');

      // Clean for speech
      completed = cleanForSpeech(completed);

      // Enhance with prosody
      completed = enhanceProsody(completed, agentType);

      return completed;
    }
  }

  return isStrictMode ? null : 'Completed task';
}

/**
 * Read last assistant message from transcript
 */
function getLastAssistantMessage(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let lastAssistantMessage = '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line);
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
 * Send notification to voice server
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  const serverUrl = process.env.PAI_VOICE_SERVER || 'http://localhost:8888/notify';

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Voice server error:', response.statusText);
    }
  } catch (error) {
    // Fail silently - voice server may not be running
    console.error('Voice notification failed (server may be offline):', error);
  }
}

async function main() {
  let hookInput: HookInput | null = null;

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
      hookInput = JSON.parse(input);
    }
  } catch (error) {
    console.error('Error reading hook input:', error);
  }

  // Extract completion from transcript
  let completion: string | null = 'Completed task';
  const agentType = 'pai'; // Main agent is your PAI

  if (hookInput?.transcript_path) {
    const lastMessage = getLastAssistantMessage(hookInput.transcript_path);
    if (lastMessage) {
      completion = extractCompletion(lastMessage, agentType);
    }
  }

  // Skip notification if no completion message (strict mode)
  if (completion) {
    // Get voice ID for this agent
    const voiceId = getVoiceId(agentType);

    // Send voice notification
    const payload: NotificationPayload = {
      title: 'PAI',
      message: completion,
      voice_enabled: true,
      priority: 'normal',
      voice_id: voiceId
    };

    await sendNotification(payload);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Stop hook error:', error);
  process.exit(0);
});
