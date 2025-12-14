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
 * - Sends voice notification that system is ready (via Piper TTS)
 * - Calls load-core-context.ts to inject PAI context into the session
 *
 * Setup:
 * 1. Set DA environment variable in settings.json (your AI's name)
 * 2. Ensure load-core-context.ts exists in hooks/ directory
 * 3. Add both hooks to SessionStart in settings.json
 */

import { existsSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { PAI_DIR } from './lib/pai-paths';

// Debounce duration in milliseconds (prevents duplicate SessionStart events)
const DEBOUNCE_MS = 2000;
const LOCKFILE = join(tmpdir(), 'pai-session-start.lock');

// Check voice server health and always report status
async function checkVoiceHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:8888/health', {
      signal: AbortSignal.timeout(2000)
    });
    if (response.ok) {
      const health = await response.json();
      const provider = health.provider || 'unknown';
      const apiConfigured = health.api_key_configured ? '✅' : '⚠️ API key missing';
      console.error(`🎙️  VOICE: Server running (${provider}) ${apiConfigured}`);
      return true;
    }
    console.error('⚠️  VOICE: Server returned error');
    return false;
  } catch (error) {
    console.error('⚠️  VOICE: Server not running - start with: cd $PAI_DIR/voice-server && bun run server.ts');
    return false;
  }
}

async function sendNotification(title: string, message: string, agent: string = 'aito') {
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
        agent
      }),
    });

    if (!response.ok) {
      console.error(`Notification failed: ${response.status}`);
    }
  } catch (error) {
    // Silently fail if voice server isn't running
  }
}

/**
 * Check if we're within the debounce window to prevent duplicate notifications
 * from the IDE firing multiple SessionStart events
 */
function shouldDebounce(): boolean {
  try {
    if (existsSync(LOCKFILE)) {
      const lockContent = readFileSync(LOCKFILE, 'utf-8');
      const lockTime = parseInt(lockContent, 10);
      const now = Date.now();

      if (now - lockTime < DEBOUNCE_MS) {
        // Within debounce window, skip this notification
        return true;
      }
    }

    // Update lockfile with current timestamp
    writeFileSync(LOCKFILE, Date.now().toString());
    return false;
  } catch (error) {
    // If any error, just proceed (don't break session start)
    try {
      writeFileSync(LOCKFILE, Date.now().toString());
    } catch {}
    return false;
  }
}

async function testStopHook() {
  const stopHookPath = join(PAI_DIR, 'hooks/stop-hook.ts');

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
    const daName = process.env.DA || 'Nameless AI-subagent';
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
    // Clean up stale lockfile on new session start
    // This ensures new Claude launches always get the startup voice
    try {
      if (existsSync(LOCKFILE)) {
        unlinkSync(LOCKFILE);
      }
    } catch {}

    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // This is a subagent session - exit silently without notification
      console.error('🤖 Subagent session detected - skipping session initialization');
      process.exit(0);
    }

    // Check debounce to prevent duplicate voice notifications
    // (IDE extension can fire multiple SessionStart events)
    if (shouldDebounce()) {
      console.error('🔇 Debouncing duplicate SessionStart event');
      process.exit(0);
    }

    // Test stop-hook first (only for main sessions)
    const stopHookOk = await testStopHook();

    const daName = process.env.DA || 'Nameless AI-subagent';
    const message = `${daName} here, ready to go.`;

    if (!stopHookOk) {
      console.error('\n⚠️ STOP-HOOK ISSUE DETECTED - Tab titles may not update automatically');
    }

    // Note: PAI core context loading is handled by load-core-context.ts hook
    // which should run BEFORE this hook in settings.json SessionStart hooks

    // Check voice health and report issues visibly (don't fail silently)
    const voiceHealthy = await checkVoiceHealth();

    if (voiceHealthy) {
      await sendNotification(`${daName} Systems Initialized`, message, 'aito');
    }

    process.exit(0);
  } catch (error) {
    console.error('SessionStart hook error:', error);
    process.exit(1);
  }
}

main();
