/**
 * response-format.ts - Self-healing validation for hook outputs
 *
 * When hooks produce invalid output (garbage like "Ready" or "I appreciate you reaching out"),
 * this module provides validation and format-compliant fallbacks.
 *
 * The approach: validate output, and if invalid, provide safe fallbacks.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PAI_SKILL_PATH = join(process.env.HOME || process.env.USERPROFILE || homedir(), '.claude', 'skills', 'PAI', 'SKILL.md');

// Cache the format spec
let formatSpec: string | null = null;

/**
 * Load response format spec from PAI skill
 * Used for reference when debugging or extending validation
 */
export function getResponseFormatSpec(): string {
  if (!formatSpec) {
    try {
      const content = readFileSync(PAI_SKILL_PATH, 'utf-8');
      // Extract the Response Format section
      const match = content.match(/## 🚨 Response Format[\s\S]*?(?=\n## |$)/);
      formatSpec = match ? match[0] : '';
    } catch {
      formatSpec = '';
    }
  }
  return formatSpec;
}

// Garbage patterns for SHORT messages only (< 40 chars)
// These catch conversational filler but not legitimate uses in longer sentences
const SHORT_MESSAGE_GARBAGE = [
  /\bready\b/i,
  /\bhello\b/i,
  /hi there/i,
  /available/i,
];

// Garbage patterns for ALL messages - these are always conversational filler
const ALWAYS_GARBAGE_PATTERNS = [
  /appreciate/i,
  /thank/i,
  /welcome/i,
  /help(ing)? you/i,   // "help you" or "Helping you"
  /assist(ing)? you/i, // "assist you" or "Assisting you"
  /reaching out/i,
  /happy to/i,
  /let me know/i,
  /feel free/i,
];

// Conversational starters that aren't factual summaries
const CONVERSATIONAL_STARTERS = [
  /^I'm /i,
  /^I am /i,
  /^Sure[,.]?/i,
  /^OK[,.]?/i,
  /^Got it[,.]?/i,
  /^Done\.?$/i,
  /^Yes[,.]?/i,
  /^No[,.]?/i,
  /^Okay[,.]?/i,
  /^Alright[,.]?/i,
];

// Explicit blocklist for single-word garbage
const SINGLE_WORD_BLOCKLIST = [
  'ready', 'done', 'ok', 'okay', 'yes', 'no', 'sure', 'prefix',
  'hello', 'hi', 'hey', 'thanks', 'working', 'processing'
];

/**
 * Check if a voice completion is valid
 * Voice completions should be factual summaries, not conversational fluff
 */
export function isValidVoiceCompletion(text: string): boolean {
  if (!text || text.length < 3) return false;

  // Reject single words (almost always garbage)
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount === 1) {
    const lowerText = text.toLowerCase().replace(/[^a-z]/g, '');
    if (SINGLE_WORD_BLOCKLIST.includes(lowerText)) return false;
    // Single words under 10 chars are suspicious
    if (lowerText.length < 10) return false;
  }

  // Reject very short messages (less than 10 chars usually garbage)
  if (text.length < 10) return false;

  // Always reject these conversational filler patterns
  for (const pattern of ALWAYS_GARBAGE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Only apply short-message garbage patterns to messages < 40 chars
  // Longer messages can legitimately contain "ready", "hello" etc. in context
  if (text.length < 40) {
    for (const pattern of SHORT_MESSAGE_GARBAGE) {
      if (pattern.test(text)) return false;
    }
  }

  // Reject conversational starters
  for (const pattern of CONVERSATIONAL_STARTERS) {
    if (pattern.test(text)) return false;
  }

  return true;
}

// Words that indicate an incomplete sentence when they appear at the end
// This is a WHITELIST approach: we define what "incomplete" looks like
// instead of trying to blacklist every possible fragment pattern
const INCOMPLETE_ENDINGS = [
  'the', 'a', 'an',           // articles
  'to', 'for', 'with', 'of',  // prepositions
  'in', 'on', 'at', 'by',     // more prepositions
  'from', 'into', 'about',    // more prepositions
  'and', 'or', 'but',         // conjunctions
  'that', 'which',            // relative pronouns
];

// Prepositions that when followed by a single word make incomplete phrases
// e.g., "for root" (root what?), "to fix" (to fix what?)
const PREPOSITIONS = ['to', 'for', 'with', 'from', 'into', 'about', 'of', 'on', 'at', 'by'];

/**
 * Check if a tab summary is valid - validates COMPLETE sentences.
 *
 * Requirements:
 * - Must be 2-6 words (single words are usually garbage)
 * - Must START with a gerund (-ing verb) - CRITICAL check
 * - Must end with a period
 * - No conversational garbage
 * - No incomplete endings (dangling prepositions, articles)
 */
export function isValidTabSummary(text: string): boolean {
  if (!text || text.length < 5) return false;

  // Must end with a period
  if (!text.endsWith('.')) return false;

  // Remove the period for word analysis
  const content = text.slice(0, -1).trim();
  const words = content.split(/\s+/);

  // Must be 2-6 words (single words are usually garbage like "Processing.")
  if (words.length < 2 || words.length > 6) return false;

  // CRITICAL: Must start with a gerund (-ing verb)
  // This catches garbage like "Fiction Apps Monetization Optimized" where
  // the model picked up content topics instead of summarizing the task
  const firstWord = words[0].toLowerCase();
  if (!firstWord.endsWith('ing')) {
    return false;
  }

  // Reject conversational garbage patterns
  for (const pattern of ALWAYS_GARBAGE_PATTERNS) {
    if (pattern.test(text)) return false;
  }

  // Reject first-person pronouns
  const lowerContent = content.toLowerCase();
  if (/\bi\b/.test(lowerContent) || /\bme\b/.test(lowerContent) || /\bmy\b/.test(lowerContent)) {
    return false;
  }

  // Check for incomplete endings (dangling prepositions, articles, conjunctions)
  const lastWord = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if (INCOMPLETE_ENDINGS.includes(lastWord)) {
    return false;
  }

  // Check for dangling preposition phrases (e.g., "Fixing issue with" is incomplete)
  if (words.length >= 2) {
    const secondToLast = words[words.length - 2].toLowerCase().replace(/[^a-z]/g, '');
    // If second-to-last is a preposition and last word is short, likely fragment
    if (PREPOSITIONS.includes(secondToLast) && lastWord.length <= 4) {
      return false;
    }
  }

  return true;
}

/**
 * Get fallback for voice line
 * When no valid voice line exists, stay silent (empty string)
 */
export function getVoiceFallback(): string {
  return '';
}

/**
 * Get fallback for tab title based on lifecycle stage
 * @param stage - 'start' for beginning work, 'end' for completion
 * Short and non-generic
 */
export function getTabFallback(stage: 'start' | 'end' = 'start'): string {
  // NOTE: Do NOT include state symbols (✓, ⚠, ⚙️) here - tab-state.ts adds those based on state
  return stage === 'end' ? 'Done.' : 'Working.';
}
