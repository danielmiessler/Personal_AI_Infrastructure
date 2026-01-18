#!/usr/bin/env bun
/**
 * Voice Volume Control - Adjust voice server volume at runtime
 *
 * Usage:
 *   bun run voice-volume.ts           # Show current volume
 *   bun run voice-volume.ts 0.3       # Set to 30%
 *   bun run voice-volume.ts up        # Increase by 10%
 *   bun run voice-volume.ts down      # Decrease by 10%
 *   bun run voice-volume.ts mute      # Set to 0
 *   bun run voice-volume.ts reset     # Reset to 50% (default)
 *
 * The volume setting is stored in ~/.claude/VoiceServer/volume.json
 * Changes take effect immediately on the next voice notification.
 */

import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const CONFIG_PATH = join(homedir(), '.claude', 'VoiceServer', 'volume.json');
const DEFAULT_VOLUME = 0.5;
const STEP = 0.1;

async function main() {
  const arg = process.argv[2]?.toLowerCase();

  // Ensure directory exists
  const dir = join(homedir(), '.claude', 'VoiceServer');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Read current config
  let currentVolume = DEFAULT_VOLUME;
  try {
    const file = Bun.file(CONFIG_PATH);
    if (await file.exists()) {
      const config = await file.json();
      currentVolume = config.volume ?? DEFAULT_VOLUME;
    }
  } catch {
    // Use default
  }

  // No argument = show current
  if (!arg) {
    const bar = '█'.repeat(Math.round(currentVolume * 10)) + '░'.repeat(10 - Math.round(currentVolume * 10));
    console.log(`\n🔊 Voice Volume: ${(currentVolume * 100).toFixed(0)}%`);
    console.log(`   [${bar}] ${currentVolume.toFixed(2)}\n`);
    console.log('Commands: up, down, mute, reset, or 0.0-1.0');
    return;
  }

  let newVolume: number;

  switch (arg) {
    case 'up':
    case '+':
      newVolume = Math.min(1.0, currentVolume + STEP);
      break;
    case 'down':
    case '-':
      newVolume = Math.max(0.0, currentVolume - STEP);
      break;
    case 'mute':
    case '0':
      newVolume = 0;
      break;
    case 'reset':
    case 'default':
      newVolume = DEFAULT_VOLUME;
      break;
    default:
      // Try to parse as number
      const parsed = parseFloat(arg);
      if (isNaN(parsed) || parsed < 0 || parsed > 1) {
        console.error('Invalid volume. Use 0.0-1.0, up, down, mute, or reset');
        process.exit(1);
      }
      newVolume = parsed;
  }

  // Update config
  const config = { volume: Math.round(newVolume * 100) / 100 };
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');

  // Display result
  const bar = '█'.repeat(Math.round(newVolume * 10)) + '░'.repeat(10 - Math.round(newVolume * 10));
  const icon = newVolume === 0 ? '🔇' : newVolume < 0.3 ? '🔈' : newVolume < 0.6 ? '🔉' : '🔊';

  console.log(`\n${icon} Volume: ${(currentVolume * 100).toFixed(0)}% → ${(newVolume * 100).toFixed(0)}%`);
  console.log(`   [${bar}] ${newVolume.toFixed(2)}\n`);

  // Note about restart
  if (newVolume !== currentVolume) {
    console.log('💡 Change takes effect on next voice notification');
  }
}

main().catch(console.error);
