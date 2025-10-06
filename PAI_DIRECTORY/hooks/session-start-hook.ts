#!/usr/bin/env bun

import { existsSync, statSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Load voice configuration from voices.json
function loadVoiceConfig(): { voice_name: string; rate: number } {
  try {
    const paiDir = process.env.PAI_DIR || `${homedir()}/.claude`;
    const voicesPath = join(paiDir, 'voice-server/voices.json');
    const config = JSON.parse(readFileSync(voicesPath, 'utf-8'));
    const kaiVoice = config.voices.kai;
    return {
      voice_name: kaiVoice.voice_name,
      rate: kaiVoice.rate_wpm
    };
  } catch (e) {
    // Fallback if voices.json doesn't exist
    console.error('⚠️  Could not load voices.json, using fallback voice');
    return {
      voice_name: 'Jamie (Premium)',
      rate: 228
    };
  }
}

async function sendNotification(title: string, message: string, priority: string = 'normal') {
  try {
    const voiceConfig = loadVoiceConfig();

    const response = await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        message,
        voice_enabled: true,
        priority,
        voice_name: voiceConfig.voice_name,
        rate: voiceConfig.rate
      }),
    });

    if (!response.ok) {
      console.error(`Notification failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

async function testStopHook() {
  const paiDir = process.env.PAI_DIR || `${process.env.HOME}/PAI/PAI_DIRECTORY`;
  const stopHookPath = `${paiDir}/hooks/stop-hook.ts`;

  console.error('\n🔍 Testing stop-hook configuration...');

  // Check if stop-hook exists
  if (!existsSync(stopHookPath)) {
    console.error('❌ Stop-hook NOT FOUND at:', stopHookPath);
    return false;
  }

  // Check if stop-hook is executable
  try {
    const stats = statSync(stopHookPath);
    const isExecutable = (stats.mode & 0o111) !== 0;

    if (!isExecutable) {
      console.error('❌ Stop-hook exists but is NOT EXECUTABLE');
      return false;
    }

    console.error('✅ Stop-hook found and is executable');

    // Set initial tab title to show session started with Kai ready
    process.stderr.write('\x1b]0;Kai Ready\x07');
    process.stderr.write('\x1b]2;Kai Ready\x07');
    process.stderr.write('\x1b]30;Kai Ready\x07');
    console.error('📍 Set initial tab title: "Kai Ready"');

    return true;
  } catch (e) {
    console.error('❌ Error checking stop-hook:', e);
    return false;
  }
}

async function main() {
  try {
    // Test stop-hook first
    const stopHookOk = await testStopHook();

    const daName = process.env.DA || 'Kai';
    const message = `${daName} here, ready to go.`;

    if (!stopHookOk) {
      console.error('\n⚠️ STOP-HOOK ISSUE DETECTED - Tab titles may not update automatically');
    }

    await sendNotification(`${daName} Systems Initialized`, message, 'low');
    process.exit(0);
  } catch (error) {
    console.error('SessionStart hook error:', error);
    process.exit(1);
  }
}

main();