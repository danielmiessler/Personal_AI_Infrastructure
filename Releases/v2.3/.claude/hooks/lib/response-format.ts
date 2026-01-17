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

const CORE_SKILL_PATH = join(process.env.HOME!, '.claude/skills/CORE/SKILL.md');

// Cache the format spec
let formatSpec: string | null = null;

/**
 * Load response format spec from CORE skill
 * Used for reference when debugging or extending validation
 */
export function getResponseFormatSpec(): string {
  if (!formatSpec) {
    try {
      const content = readFileSync(CORE_SKILL_PATH, 'utf-8');
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
  /help you/i,
  /assist you/i,
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

/**
 * Check if a tab summary is valid
 * Tab summaries should start with a gerund (e.g., "Fixing the bug.", "Checking the config.")
 */
export function isValidTabSummary(text: string): boolean {
  if (!text || text.length < 3) return false;

  // Must start with gerund (capital letter + letters + "ing")
  const startsWithGerund = /^[A-Z][a-z]*ing\b/.test(text);
  if (!startsWithGerund) return false;

  // Reject conversational filler even if it starts with a gerund
  for (const pattern of ALWAYS_GARBAGE_PATTERNS) {
    if (pattern.test(text)) return false;
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
 * Returns complete sentence starting with gerund
 */
export function getTabFallback(stage: 'start' | 'end' = 'start'): string {
  // NOTE: Do NOT include state symbols (✓, ⚠, ⚙️) here - tab-state.ts adds those based on state
  // Complete sentence format: "[Gerund] the [object]."
  return stage === 'end' ? 'Finishing the task.' : 'Processing the request.';
}
