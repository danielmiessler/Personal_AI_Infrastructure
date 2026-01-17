#!/usr/bin/env bun
/**
 * Voice Selection - Gender-aware voice defaults for PAI
 *
 * This module provides intelligent default voice selection based on the
 * DA (Digital Assistant) name. If the name sounds feminine, it defaults
 * to a feminine voice. If masculine, a masculine voice. Neutral names
 * prompt the user to choose.
 *
 * These are NOT Kai's voices - they are dedicated defaults for PAI public releases.
 */

// Default voice IDs for PAI (not Kai's personal voices)
export const DEFAULT_VOICES = {
  male: "bIHbv24MWmeRgasZH58o",      // Male voice
  female: "MClEFoImJXBTgLwdLI5n",    // Female voice
  neutral: "M563YhMmA0S8vEYwkgYa"    // Neutral voice
} as const;

// Common feminine names for AI assistants
const FEMININE_NAMES = new Set([
  'nova', 'luna', 'aurora', 'aria', 'stella', 'iris', 'ivy', 'eve', 'maya',
  'sophia', 'emma', 'olivia', 'ava', 'mia', 'zara', 'cleo', 'lyra', 'vera',
  'serena', 'freya', 'athena', 'diana', 'venus', 'artemis', 'hera', 'gaia',
  'alice', 'clara', 'ella', 'grace', 'nora', 'ruby', 'violet', 'willow',
  'aurora', 'celeste', 'dawn', 'fern', 'hazel', 'jade', 'jasmine', 'lily',
  'pearl', 'rose', 'sky', 'summer', 'winter', 'autumn', 'spring'
]);

// Common masculine names for AI assistants
const MASCULINE_NAMES = new Set([
  'atlas', 'orion', 'max', 'leo', 'kai', 'echo', 'rex', 'ace', 'zion', 'axel',
  'james', 'william', 'henry', 'oliver', 'jack', 'owen', 'liam', 'noah', 'ethan',
  'apollo', 'thor', 'zeus', 'mars', 'odin', 'titan', 'phoenix', 'griffin',
  'blade', 'bolt', 'dash', 'flint', 'hawk', 'hunter', 'lance', 'maverick',
  'raven', 'storm', 'wolf', 'blaze', 'colt', 'drake', 'finn', 'grant',
  'jarvis', 'neo', 'pulse', 'quantum', 'spark', 'vector', 'zenith'
]);

// Explicitly neutral names (will prompt user to choose)
const NEUTRAL_NAMES = new Set([
  'sage', 'river', 'jordan', 'alex', 'sam', 'casey', 'riley', 'morgan',
  'quinn', 'taylor', 'avery', 'drew', 'hayden', 'jamie', 'jessie', 'pat',
  'robin', 'skyler', 'sydney', 'terry', 'core', 'base', 'prime', 'one',
  'assistant', 'helper', 'guide', 'mentor', 'partner', 'companion'
]);

export type VoiceGender = 'male' | 'female' | 'neutral';

/**
 * Infers the likely gender association of a name
 * Returns 'neutral' if the name is not recognized (user should be prompted)
 */
export function inferGender(name: string): VoiceGender {
  const lower = name.toLowerCase().trim();

  // Check explicit neutral first
  if (NEUTRAL_NAMES.has(lower)) return 'neutral';

  // Check feminine
  if (FEMININE_NAMES.has(lower)) return 'female';

  // Check masculine
  if (MASCULINE_NAMES.has(lower)) return 'male';

  // Unknown name - return neutral (will prompt user)
  return 'neutral';
}

/**
 * Selects the default voice based on the DA name
 * Returns the voice ID and a human-readable name
 */
export function selectDefaultVoice(daName: string): {
  voiceId: string;
  voiceType: VoiceGender;
  voiceName: string;
  isExplicitChoice: boolean;
} {
  const gender = inferGender(daName);

  return {
    voiceId: DEFAULT_VOICES[gender],
    voiceType: gender,
    voiceName: gender.charAt(0).toUpperCase() + gender.slice(1),
    isExplicitChoice: gender === 'neutral' // User should be prompted if neutral
  };
}

/**
 * Gets the voice ID for a specific gender
 */
export function getVoiceId(gender: VoiceGender): string {
  return DEFAULT_VOICES[gender];
}

/**
 * Validates an ElevenLabs voice ID format
 * ElevenLabs voice IDs are typically 20 alphanumeric characters
 */
export function isValidVoiceId(voiceId: string): boolean {
  return /^[a-zA-Z0-9]{20,24}$/.test(voiceId);
}

// CLI interface for testing
if (import.meta.main) {
  const name = process.argv[2];

  if (!name) {
    console.log('Usage: bun voice-selection.ts <da-name>');
    console.log('');
    console.log('Examples:');
    console.log('  bun voice-selection.ts Nova   # Returns: Female');
    console.log('  bun voice-selection.ts Atlas  # Returns: Male');
    console.log('  bun voice-selection.ts Sage   # Returns: Neutral (prompts user)');
    console.log('');
    console.log('Voice IDs:');
    console.log(`  Male:    ${DEFAULT_VOICES.male}`);
    console.log(`  Female:  ${DEFAULT_VOICES.female}`);
    console.log(`  Neutral: ${DEFAULT_VOICES.neutral}`);
    process.exit(0);
  }

  const result = selectDefaultVoice(name);
  console.log(`DA Name: ${name}`);
  console.log(`Voice Type: ${result.voiceName}`);
  console.log(`Voice ID: ${result.voiceId}`);
  console.log(`Prompt User: ${result.isExplicitChoice ? 'Yes (neutral name)' : 'No (clear gender)'}`);
}
