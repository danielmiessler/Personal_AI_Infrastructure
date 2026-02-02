/**
 * Central Identity Loader
 * Single source of truth for DA (Digital Assistant) and Principal identity
 *
 * Reads from settings.json - the programmatic way, not markdown parsing.
 * All hooks and tools should import from here.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME!;
const SETTINGS_PATH = join(HOME, '.claude/settings.json');

// Default identity (fallback if settings.json doesn't have identity section)
const DEFAULT_IDENTITY = {
  name: 'PAI',
  fullName: 'Personal AI',
  displayName: 'PAI',
  voiceId: '',
  color: '#3B82F6',
};

const DEFAULT_PRINCIPAL = {
  name: 'User',
  pronunciation: '',
  timezone: 'UTC',
};

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
}

export interface Identity {
  name: string;
  fullName: string;
  displayName: string;
  voiceId: string;
  color: string;
  voice?: VoiceSettings;
}

export interface Principal {
  name: string;
  pronunciation: string;
  timezone: string;
}

export interface Settings {
  daidentity?: Partial<Identity>;
  principal?: Partial<Principal>;
  env?: Record<string, string>;
  /** When true, skips non-essential voice notifications. Defaults to false. */
  reducedVoiceFeedback?: boolean;
  [key: string]: unknown;
}

let cachedSettings: Settings | null = null;

/**
 * Load settings.json (cached)
 */
function loadSettings(): Settings {
  if (cachedSettings) return cachedSettings;

  try {
    if (!existsSync(SETTINGS_PATH)) {
      cachedSettings = {};
      return cachedSettings;
    }

    const content = readFileSync(SETTINGS_PATH, 'utf-8');
    cachedSettings = JSON.parse(content);
    return cachedSettings!;
  } catch {
    cachedSettings = {};
    return cachedSettings;
  }
}

/**
 * Get DA (Digital Assistant) identity from settings.json
 */
export function getIdentity(): Identity {
  const settings = loadSettings();

  // Prefer settings.daidentity, fall back to env.DA for backward compat
  const daidentity = settings.daidentity || {} as Record<string, unknown>;
  const envDA = settings.env?.DA;

  return {
    name: (daidentity.name as string) || envDA || DEFAULT_IDENTITY.name,
    fullName: (daidentity.fullName as string) || (daidentity.name as string) || envDA || DEFAULT_IDENTITY.fullName,
    displayName: (daidentity.displayName as string) || (daidentity.name as string) || envDA || DEFAULT_IDENTITY.displayName,
    voiceId: (daidentity.voiceId as string) || DEFAULT_IDENTITY.voiceId,
    color: (daidentity.color as string) || DEFAULT_IDENTITY.color,
    voice: daidentity.voice as VoiceSettings | undefined,
  };
}

/**
 * Get Principal (human owner) identity from settings.json
 */
export function getPrincipal(): Principal {
  const settings = loadSettings();

  // Prefer settings.principal, fall back to env.PRINCIPAL for backward compat
  const principal = settings.principal || {};
  const envPrincipal = settings.env?.PRINCIPAL;

  return {
    name: principal.name || envPrincipal || DEFAULT_PRINCIPAL.name,
    pronunciation: principal.pronunciation || DEFAULT_PRINCIPAL.pronunciation,
    timezone: principal.timezone || DEFAULT_PRINCIPAL.timezone,
  };
}

/**
 * Clear cache (useful for testing or when settings.json changes)
 */
export function clearCache(): void {
  cachedSettings = null;
}

/**
 * Get just the DA name (convenience function)
 */
export function getDAName(): string {
  return getIdentity().name;
}

/**
 * Get just the Principal name (convenience function)
 */
export function getPrincipalName(): string {
  return getPrincipal().name;
}

/**
 * Get just the voice ID (convenience function)
 */
export function getVoiceId(): string {
  return getIdentity().voiceId;
}

/**
 * Get the full settings object (for advanced use)
 */
export function getSettings(): Settings {
  return loadSettings();
}

/**
 * Get the default identity (for documentation/testing)
 */
export function getDefaultIdentity(): Identity {
  return { ...DEFAULT_IDENTITY };
}

/**
 * Get the default principal (for documentation/testing)
 */
export function getDefaultPrincipal(): Principal {
  return { ...DEFAULT_PRINCIPAL };
}

/**
 * Check if reduced voice feedback is enabled.
 * When true, skips non-essential voice notifications (session start, integrity check, algorithm phases).
 * Essential notifications (prompt acknowledgment, completion, user questions) always play.
 * Defaults to false for backwards compatibility.
 */
export function isReducedVoiceFeedback(): boolean {
  const settings = loadSettings();
  return settings.reducedVoiceFeedback === true;
}
