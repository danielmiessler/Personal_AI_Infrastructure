/**
 * PAI Settings Loader - Single Source of Truth
 *
 * This module provides consistent settings loading across all PAI hooks.
 * It loads settings.json once and provides a unified interface for accessing
 * all configuration values with proper fallback chains.
 *
 * Usage in hooks:
 *   import { getPAISettings } from './lib/pai-settings';
 *   const settings = getPAISettings();
 *   console.log(settings.daName);  // "PAI"
 *   console.log(settings.voiceId);  // "cgSgspJ2msm6clMCkdW9"
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { PAI_DIR } from './pai-paths';

/**
 * Settings configuration interface from settings.json
 */
interface SettingsConfig {
  env?: {
    DA?: string;
    DA_VOICE_ID?: string;
    PAI_DIR?: string;
    VOICE_SERVER_PORT?: string;
    VOICE_CACHE_TTL_DAYS?: string;
    ELEVENLABS_API_KEY?: string;
    ELEVENLABS_VOICE_ID?: string;
  };
}

/**
 * Unified PAI settings interface
 */
export interface PAISettings {
  /** Digital Assistant name (e.g., "PAI", "Kai") */
  daName: string;
  /** Voice ID for DA (ElevenLabs voice ID) */
  voiceId: string;
  /** PAI directory path */
  paiDir: string;
  /** Voice server port */
  voiceServerPort: number;
  /** Cache TTL in days */
  cacheTTLDays: number;
  /** Whether ElevenLabs API key is configured */
  hasApiKey: boolean;
}

/**
 * Cached settings to avoid re-reading the file multiple times
 */
let cachedSettings: PAISettings | null = null;

/**
 * Default voice ID (Jessica - available to all ElevenLabs users)
 */
const DEFAULT_VOICE_ID = 'cgSgspJ2msm6clMCkdW9';

/**
 * Get voice ID with comprehensive fallback chain
 * Priority:
 * 1. process.env.DA_VOICE_ID (set by Claude Code from settings.json)
 * 2. settings.json env.DA_VOICE_ID
 * 3. .env ELEVENLABS_VOICE_ID
 * 4. Default voice ID (Jessica)
 */
function getVoiceIdWithFallback(settings: SettingsConfig): string {
  // 1. Try process.env first (when running inside Claude Code)
  if (process.env.DA_VOICE_ID) {
    return process.env.DA_VOICE_ID;
  }

  // 2. Try settings.json
  if (settings.env?.DA_VOICE_ID) {
    return settings.env.DA_VOICE_ID;
  }

  // 3. Try .env file
  try {
    const envPath = join(PAI_DIR, '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^ELEVENLABS_VOICE_ID=(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {
    // Fall through to default
  }

  // 4. Default fallback
  return DEFAULT_VOICE_ID;
}

/**
 * Check if ElevenLabs API key is configured
 */
function hasElevenLabsApiKey(settings: SettingsConfig): boolean {
  // Check settings.json
  if (settings.env?.ELEVENLABS_API_KEY) {
    return true;
  }

  // Check .env file
  try {
    const envPath = join(PAI_DIR, '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      return /^ELEVENLABS_API_KEY=/m.test(envContent);
    }
  } catch {
    // Fall through
  }

  return false;
}

/**
 * Load PAI settings from settings.json with proper fallbacks
 * This function caches the settings to avoid re-reading the file
 */
export function getPAISettings(): PAISettings {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings;
  }

  let settings: SettingsConfig = {};
  let paiDir = PAI_DIR;

  // Try to load settings.json
  try {
    const settingsPath = join(PAI_DIR, 'settings.json');
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

      // Update PAI_DIR if explicitly set in settings
      if (settings.env?.PAI_DIR) {
        paiDir = settings.env.PAI_DIR.replace('__HOME__', homedir());
      }
    }
  } catch (error) {
    console.error('⚠️ Could not load settings.json, using default values');
  }

  // Build unified settings object with all fallbacks
  cachedSettings = {
    daName: settings.env?.DA || process.env.DA || 'PAI',
    voiceId: getVoiceIdWithFallback(settings),
    paiDir: paiDir,
    voiceServerPort: settings.env?.VOICE_SERVER_PORT
      ? parseInt(settings.env.VOICE_SERVER_PORT)
      : parseInt(process.env.VOICE_SERVER_PORT || '8888'),
    cacheTTLDays: settings.env?.VOICE_CACHE_TTL_DAYS
      ? parseInt(settings.env.VOICE_CACHE_TTL_DAYS)
      : 30,
    hasApiKey: hasElevenLabsApiKey(settings),
  };

  return cachedSettings;
}

/**
 * Clear cached settings (useful for testing or when settings change)
 */
export function clearSettingsCache(): void {
  cachedSettings = null;
}

/**
 * Get voice server port (convenience function)
 */
export function getVoiceServerPort(): number {
  return getPAISettings().voiceServerPort;
}

/**
 * Get DA voice ID (convenience function)
 */
export function getVoiceId(): string {
  return getPAISettings().voiceId;
}

/**
 * Get DA name (convenience function)
 */
export function getDAName(): string {
  return getPAISettings().daName;
}
