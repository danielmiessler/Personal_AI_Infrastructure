#!/usr/bin/env bun

import { existsSync, statSync } from 'fs';

async function sendNotification(title: string, message: string, priority: string = 'normal') {
  try {
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
        voice_id: 'jqcCZkN6Knx8BJ5TBdYR'  // Assistant's voice ID
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
  const paiDir = process.env.PAI_DIR || `${process.env.HOME}/PAI`;
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