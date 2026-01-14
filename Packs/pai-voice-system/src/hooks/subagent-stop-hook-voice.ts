#!/usr/bin/env bun
/**
 * PAI Voice Subagent Stop Hook - Delegated Agent Voice Notifications
 *
 * This hook runs when a subagent (spawned via Task tool) finishes responding.
 * It extracts the 🗣️ line and sends it to the voice server with the agent's voice.
 *
 * Part of the pai-voice-system pack.
 *
 * Key difference from main agent hook:
 * - Subagents may have different voice IDs configured
 * - Looks for [AGENT:Name] tags in the response
 * - Supports multi-voice agent conversations
 *
 * Configuration (settings.json):
 * ```json
 * {
 *   "hooks": {
 *     "SubagentStop": [{
 *       "type": "command",
 *       "command": "bun run ${PAI_DIR}/skills/VoiceSystem/hooks/subagent-stop-hook-voice.ts"
 *     }]
 *   }
 * }
 * ```
 *
 * Environment Variables:
 *   VOICE_SERVER_URL - Voice server URL (default: http://localhost:8888)
 *   PAI_DIR - PAI installation directory
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { enhanceProsody, cleanForSpeech } from './lib/prosody-enhancer';

// Configuration
const VOICE_SERVER_URL = process.env.VOICE_SERVER_URL || 'http://localhost:8888';
const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');

// Voice personalities configuration
interface VoicePersonality {
  voice_id: string;
  voice_name: string;
  stability: number;
  similarity_boost: number;
  description: string;
  type: string;
}

interface VoiceConfig {
  voices: Record<string, VoicePersonality>;
}

// Load voice personalities from configuration
function loadVoicePersonalities(): VoiceConfig | null {
  try {
    // Try PAI skill voice-personalities.md first
    const paiPersonalitiesPath = join(PAI_DIR, 'skills', 'CORE', 'voice-personalities.md');
    if (existsSync(paiPersonalitiesPath)) {
      const markdownContent = readFileSync(paiPersonalitiesPath, 'utf-8');
      const jsonMatch = markdownContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1]);
      }
    }

    // Fallback to voice-personalities.json in pack
    const jsonPath = join(PAI_DIR, 'skills', 'VoiceSystem', 'voice-personalities.json');
    if (existsSync(jsonPath)) {
      return JSON.parse(readFileSync(jsonPath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading voice personalities:', error);
  }
  return null;
}

const voiceConfig = loadVoicePersonalities();

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
  voice_name?: string;
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
 * Extract agent name from response
 * Looks for [AGENT:Name] tags
 */
function extractAgentName(text: string): string | null {
  const agentMatch = text.match(/\[AGENT:(\w+)\]/i);
  return agentMatch ? agentMatch[1] : null;
}

/**
 * Get voice ID for an agent name
 */
function getVoiceIdForAgent(agentName: string): string | null {
  if (!voiceConfig) return null;

  // Try exact match first
  if (voiceConfig.voices[agentName]) {
    return voiceConfig.voices[agentName].voice_id;
  }

  // Try case-insensitive match
  const lowerName = agentName.toLowerCase();
  for (const [name, config] of Object.entries(voiceConfig.voices)) {
    if (name.toLowerCase() === lowerName) {
      return config.voice_id;
    }
  }

  return null;
}

/**
 * Extract the voice message from the response
 */
function extractVoiceMessage(text: string): { message: string; agentName: string | null } | null {
  // Remove system-reminder tags
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  // Extract agent name if present
  const agentName = extractAgentName(text);

  // Patterns to try (in order of priority)
  const patterns = [
    // 🗣️ AgentName: [text]
    /🗣️\s*\*{0,2}(\w+):?\*{0,2}\s*(.+?)(?:\n|$)/i,
    // 🎯 COMPLETED: [text]
    /🎯\s*\*{0,2}COMPLETED:?\*{0,2}\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Handle both patterns - first has agentName in group 1
      let message: string;
      let extractedAgent: string | null = null;

      if (pattern.source.includes('(\\w+)')) {
        // First pattern: 🗣️ AgentName: message
        extractedAgent = match[1];
        message = match[2];
      } else {
        // Second pattern: 🎯 COMPLETED: message
        message = match[1];
      }

      message = message.trim();

      // Clean up the message
      message = message.replace(/^\[AGENT:\w+\]\s*/i, '');

      // Clean for speech while preserving prosody markers
      message = cleanForSpeech(message);

      // Enhance with prosody markers
      const prosodyAgent = extractedAgent || agentName || 'assistant';
      message = enhanceProsody(message, prosodyAgent.toLowerCase());

      return {
        message,
        agentName: extractedAgent || agentName
      };
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
  let extracted: { message: string; agentName: string | null } | null = null;

  if (hookInput && hookInput.transcript_path) {
    const lastMessage = getLastAssistantMessage(hookInput.transcript_path);
    if (lastMessage) {
      extracted = extractVoiceMessage(lastMessage);
    }
  }

  // Send voice notification if we have a message
  if (extracted) {
    // Get voice ID for the agent (if configured)
    const voiceId = extracted.agentName ? getVoiceIdForAgent(extracted.agentName) : null;

    const payload: NotificationPayload = {
      title: extracted.agentName || 'Agent',
      message: extracted.message,
      voice_enabled: true,
      voice_id: voiceId || undefined,
      voice_name: extracted.agentName || undefined
    };

    await sendVoiceNotification(payload);
  }

  process.exit(0);
}

// Run the hook
main().catch((error) => {
  console.error('Voice subagent stop hook error:', error);
  process.exit(0); // Don't fail the hook - always exit cleanly
});
