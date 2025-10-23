#!/usr/bin/env bun

/**
 * initialize-pai-session.ts
 *
 * Main PAI session initialization hook that runs at the start of every Claude Code session.
 *
 * What it does:
 * - Checks if this is a subagent session (skips for subagents)
 * - Tests that stop-hook is properly configured
 * - Sets initial terminal tab title
 * - Sends voice notification that system is ready (if voice server is running)
 * - Calls load-core-context.ts to inject PAI context into the session
 *
 * Setup:
 * 1. Set environment variables in settings.json:
 *    - DA: Your AI's name (e.g., "Kai", "Nova", "Assistant")
 *    - DA_VOICE_ID: Your ElevenLabs voice ID (if using voice system)
 *    - PAI_DIR: Path to your PAI directory (defaults to $HOME/.claude)
 * 2. Ensure load-core-context.ts exists in hooks/ directory
 * 3. Add both hooks to SessionStart in settings.json
 */

import { existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

async function sendNotification(title: string, message: string, priority: string = 'normal') {
  try {
    // Get voice ID from environment variable (customize in settings.json)
    const voiceId = process.env.DA_VOICE_ID || 'default-voice-id';

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
        voice_id: voiceId
      }),
    });

    if (!response.ok) {
      console.error(`Notification failed: ${response.status}`);
    }
  } catch (error) {
    // Silently fail if voice server isn't running
    // console.error('Failed to send notification:', error);
  }
}

async function testStopHook() {
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

  if (!pluginRoot) {
    console.error('❌ CLAUDE_PLUGIN_ROOT environment variable not set');
    return false;
  }

  const stopHookPath = join(pluginRoot, 'hooks/stop-hook.ts');

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

    // Set initial tab title (customize with your AI's name via DA env var)
    const daName = process.env.DA || 'AI Assistant';
    const tabTitle = `${daName} Ready`;

    process.stderr.write(`\x1b]0;${tabTitle}\x07`);
    process.stderr.write(`\x1b]2;${tabTitle}\x07`);
    process.stderr.write(`\x1b]30;${tabTitle}\x07`);
    console.error(`📍 Set initial tab title: "${tabTitle}"`);

    return true;
  } catch (e) {
    console.error('❌ Error checking stop-hook:', e);
    return false;
  }
}

async function main() {
  try {
    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // This is a subagent session - exit silently without notification
      console.error('🤖 Subagent session detected - skipping session initialization');
      process.exit(0);
    }

    // Test stop-hook first (only for main sessions)
    const stopHookOk = await testStopHook();

    const daName = process.env.DA || 'AI Assistant';
    const message = `${daName} here, ready to go.`;

    if (!stopHookOk) {
      console.error('\n⚠️ STOP-HOOK ISSUE DETECTED - Tab titles may not update automatically');
    }

    // Note: PAI core context loading is handled by load-core-context.ts hook
    // which should run BEFORE this hook in settings.json SessionStart hooks

    await sendNotification(`${daName} Systems Initialized`, message, 'low');
    process.exit(0);
  } catch (error) {
    console.error('SessionStart hook error:', error);
    process.exit(1);
  }
}

main();
