#!/usr/bin/env bun
/**
 * StartupGreeting.hook.ts - Display PAI Banner at Session Start (SessionStart)
 *
 * PURPOSE:
 * Displays the responsive neofetch-style PAI banner with system statistics.
 * Creates a visual confirmation that PAI is initialized and shows key metrics
 * like skill count, session count, and learning items.
 * Optionally plays voice greeting (disabled when reducedVoiceFeedback is enabled).
 *
 * TRIGGER: SessionStart
 *
 * INPUT:
 * - Environment: COLUMNS, KITTY_WINDOW_ID for terminal detection
 * - Settings: settings.json for identity configuration
 *
 * OUTPUT:
 * - stdout: Banner display (captured by Claude Code)
 * - stderr: Error messages on failure
 * - exit(0): Normal completion
 * - exit(1): Banner display failed
 *
 * SIDE EFFECTS:
 * - Spawns Banner.ts tool as child process
 * - Reads settings.json for configuration
 * - Sends voice notification (unless reducedVoiceFeedback is enabled)
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None (runs independently at session start)
 * - COORDINATES WITH: LoadContext (both run at SessionStart)
 * - MUST RUN BEFORE: None (visual feedback only)
 * - MUST RUN AFTER: None
 *
 * ERROR HANDLING:
 * - Missing settings: Error logged, exits with error code
 * - Banner tool failure: Error logged, exits with error code
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (banner is informational)
 * - Typical execution: <100ms
 * - Skipped for subagents: Yes
 *
 * BANNER MODES:
 * - nano (<40 cols): Minimal single-line
 * - micro (40-59 cols): Compact with stats
 * - mini (60-84 cols): Medium layout
 * - normal (85+ cols): Full neofetch-style
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

import { getPaiDir, getSettingsPath } from './lib/paths';

const paiDir = getPaiDir();
const settingsPath = getSettingsPath();

/**
 * Send voice notification for startup greeting.
 * Fire-and-forget - doesn't block.
 * Skipped when reducedVoiceFeedback is enabled.
 */
async function sendVoiceGreeting(settings: Record<string, unknown>): Promise<void> {
  // Skip if reduced voice feedback is enabled
  if (settings.reducedVoiceFeedback === true) {
    return;
  }

  const daidentity = settings.daidentity as Record<string, unknown> | undefined;
  const voiceId = daidentity?.voiceId as string || 's3TPKV1kjDlVtZbl4Ksh';
  const voiceSettings = daidentity?.voice as Record<string, unknown> | undefined;
  const catchphrase = daidentity?.startupCatchphrase as string || 'Ready to assist.';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: catchphrase,
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
  } catch {
    // Voice server might not be running - silent fail
  }
}

(async () => {
  try {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      process.exit(0);
    }

    // Run the banner tool
    const bannerPath = join(paiDir, 'skills/CORE/Tools/Banner.ts');
    const result = spawnSync('bun', ['run', bannerPath], {
      encoding: 'utf-8',
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Pass through terminal detection env vars
        COLUMNS: process.env.COLUMNS,
        KITTY_WINDOW_ID: process.env.KITTY_WINDOW_ID,
      }
    });

    if (result.stdout) {
      console.log(result.stdout);
    }

    // Send voice greeting (fire-and-forget, skipped if reducedVoiceFeedback)
    sendVoiceGreeting(settings).catch(() => {});

    process.exit(0);
  } catch (error) {
    console.error('StartupGreeting: Failed to display banner', error);
    process.exit(1);
  }
})();
