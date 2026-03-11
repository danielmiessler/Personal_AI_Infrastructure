/**
 * voice-config.ts — Voice Enable/Disable Configuration
 *
 * Single source of truth for whether voice is enabled.
 * Used by all hooks that make voice server calls.
 *
 * Priority order (highest to lowest):
 *   1. PAI_VOICE_ENABLED env var  ("false" or "0" = disabled, anything else = enabled)
 *   2. settings.json voice.enabled field  (false = disabled)
 *   3. Default: enabled (true)
 *
 * Reconfigure at any time:
 *   - settings.json: set  "voice": { "enabled": false }
 *   - env var:       export PAI_VOICE_ENABLED=false  (takes precedence)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Returns true if voice is enabled, false if disabled.
 * Fast: reads from a module-level cache after first call.
 */
let _cached: boolean | null = null;

export function isVoiceEnabled(): boolean {
  if (_cached !== null) return _cached;
  _cached = _readVoiceEnabled();
  return _cached;
}

/**
 * Clear the cache (call if settings.json changes at runtime).
 */
export function clearVoiceCache(): void {
  _cached = null;
}

function _readVoiceEnabled(): boolean {
  // 1. Environment variable takes highest precedence
  const envOverride = process.env.PAI_VOICE_ENABLED;
  if (envOverride !== undefined) {
    const disabled = envOverride.toLowerCase() === 'false' || envOverride === '0';
    return !disabled;
  }

  // 2. Fall back to settings.json voice.enabled field
  try {
    const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
    const settingsPath = join(paiDir, 'settings.json');
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.voice?.enabled === false) return false;
    }
  } catch {
    // Silent fail — don't break hooks over a config read error
  }

  return true; // Default: voice enabled
}
