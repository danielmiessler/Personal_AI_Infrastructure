#!/usr/bin/env bun
/**
 * PreCompact Hook - Triggered before context compression
 * Extracts context information from transcript and notifies about compression
 */

import { readFileSync } from 'fs';
import { getVoicesPath } from '../utils/paths';

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  voice_id?: string;
  speed?: number;
  priority?: 'low' | 'normal' | 'high';
}

interface VoicesConfig {
  speed: number;
  voices: Record<string, string>;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  compact_type?: string;
}

interface TranscriptEntry {
  type: string;
  message?: {
    role?: string;
    content?: Array<{
      type: string;
      text: string;
    }>
  };
  timestamp?: string;
}

/**
 * Send notification to the Aito notification server (Aito is a fork of Kai)
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Silently handle notification failures
  }
}

/**
 * Count messages in transcript to provide context
 */
function getTranscriptStats(transcriptPath: string): { messageCount: number; isLarge: boolean } {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    let userMessages = 0;
    let assistantMessages = 0;
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line) as TranscriptEntry;
          if (entry.type === 'user') {
            userMessages++;
          } else if (entry.type === 'assistant') {
            assistantMessages++;
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
    
    const totalMessages = userMessages + assistantMessages;
    const isLarge = totalMessages > 50; // Consider large if more than 50 messages
    
    return { messageCount: totalMessages, isLarge };
  } catch (error) {
    return { messageCount: 0, isLarge: false };
  }
}

// Load voice configuration from voices.json (single source of truth)
const voicesPath = getVoicesPath();
if (!voicesPath) {
  console.error('❌ voices.json not found - voice system will not work');
  process.exit(1);
}
const voicesConfig: VoicesConfig = JSON.parse(readFileSync(voicesPath, 'utf-8'));

async function main() {
  let hookInput: HookInput | null = null;
  
  try {
    // Read the JSON input from stdin
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
    // Silently handle input errors
  }
  
  // Determine the type of compression
  const compactType = hookInput?.compact_type || 'auto';
  let message = 'Compressing context to continue';
  
  // Get transcript statistics if available
  if (hookInput && hookInput.transcript_path) {
    const stats = getTranscriptStats(hookInput.transcript_path);
    if (stats.messageCount > 0) {
      if (compactType === 'manual') {
        message = `Manually compressing ${stats.messageCount} messages`;
      } else {
        message = stats.isLarge 
          ? `Auto-compressing large context with ${stats.messageCount} messages`
          : `Compressing context with ${stats.messageCount} messages`;
      }
    }
  }
  
  // Send notification with voice (using Aito's voice from config)
  await sendNotification({
    title: 'Aito Context',
    message: message,
    voice_enabled: true,
    voice_id: voicesConfig.voices.aito,
    speed: voicesConfig.speed,
    priority: 'low',
  });
  
  process.exit(0);
}

// Run the hook
main().catch(() => {
  process.exit(0);
});