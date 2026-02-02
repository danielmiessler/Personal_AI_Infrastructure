#!/usr/bin/env bun
/**
 * AskUserQuestionVoice.hook.ts - Voice notification when user input is requested
 *
 * PURPOSE:
 * Sends a voice notification when PAI uses the AskUserQuestion tool,
 * alerting the user that their input is needed.
 *
 * TRIGGER: ToolUse (filtered to tool_name === "AskUserQuestion")
 *
 * INPUT:
 * - stdin: Hook input JSON with tool_name, tool_input, session_id
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Debug messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Sends voice notification to voice server (fire-and-forget)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - INDEPENDENT: Does not depend on or coordinate with other hooks
 *
 * ERROR HANDLING:
 * - Voice server unavailable: Silent failure
 * - Invalid input: Silent exit
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <100ms
 */

import { getIdentity } from './lib/identity';

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input?: Record<string, unknown>;
}

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Send voice notification for AskUserQuestion
 */
async function notifyUserInputNeeded(): Promise<void> {
  const identity = getIdentity();
  const voiceId = identity.voiceId || 's3TPKV1kjDlVtZbl4Ksh';
  const voiceSettings = identity.voice;

  try {
    // Use AbortController with short timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: 'I have a question for you.',
        title: `${identity.name} asks`,
        voice_enabled: true,
        voice_id: voiceId,
        voice_settings: voiceSettings ? {
          stability: voiceSettings.stability ?? 0.5,
          similarity_boost: voiceSettings.similarity_boost ?? 0.75,
          style: voiceSettings.style ?? 0.0,
          speed: voiceSettings.speed ?? 1.0,
          use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
        } : undefined,
      }),
    }).finally(() => clearTimeout(timeoutId));

    console.error('[AskUserQuestionVoice] Voice notification sent');
  } catch (err) {
    console.error('[AskUserQuestionVoice] Voice failed (non-critical):', err);
  }
}

async function main() {
  try {
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);

    // Only trigger for AskUserQuestion tool
    if (data.tool_name !== 'AskUserQuestion') {
      process.exit(0);
    }

    console.error('[AskUserQuestionVoice] AskUserQuestion detected, sending voice notification');

    // Fire-and-forget voice notification
    await notifyUserInputNeeded();

    process.exit(0);
  } catch (err) {
    console.error('[AskUserQuestionVoice] Error:', err);
    process.exit(0); // Always exit cleanly
  }
}

main();
