/**
 * ModeClassifier.test.ts — Regression tests for deterministic mode classification
 *
 * Tests the dual-gate ALGORITHM classification:
 *   Gate 1: action verb present
 *   Gate 2: technical object present OR multi-step complexity
 *
 * Run: bun test tests/ModeClassifier.test.ts
 */

import { test, expect, describe } from 'bun:test';

// Extract classification logic from ModeClassifier.hook.ts
// (duplicated here to test without stdin/stdout hook harness)
function classify(prompt: string): 'MINIMAL' | 'ALGORITHM' | 'NATIVE' {
  const trimmed = prompt.trim();
  if (!trimmed || trimmed.length < 2) return 'NATIVE';

  const isMinimal = /^(hi|hello|hey|thanks|thank you|ok|okay|done|got it|sure|yes|no|yep|nope|\d+[\s\-:]*)$/i.test(trimmed);

  const hasActionVerb = /\b(build|create|implement|fix|debug|refactor|analyze|write|design|review|plan|add|update|remove|set|migrate|convert|optimize|investigate|research|develop|configure|deploy|install|test|audit|generate|scaffold|integrate|setup|set up)\b/i.test(trimmed);

  const hasTechnicalObject = /\b(code|file|function|class|method|api|endpoint|database|schema|config|hook|script|test|build|deploy|server|component|module|service|bug|error|feature|algorithm|query|migration|route|middleware|model|controller|template|pipeline|workflow|repo|branch|commit|container|package|dependency|type|interface|struct)\b/i.test(trimmed);
  const words = trimmed.split(/\s+/);
  const isComplex = words.length > 30 || /\b(and then|also|step|first|second|finally|\d+\))\b/i.test(trimmed);

  const isAlgorithm = hasActionVerb && (hasTechnicalObject || isComplex);

  return isMinimal ? 'MINIMAL' : isAlgorithm ? 'ALGORITHM' : 'NATIVE';
}

describe('ModeClassifier', () => {
  // ── MINIMAL cases ──
  describe('MINIMAL', () => {
    test('rating number → MINIMAL', () => expect(classify('7')).toBe('MINIMAL'));
    test('rating with dash → MINIMAL', () => expect(classify('8 -')).toBe('MINIMAL'));
    test('greeting → MINIMAL', () => expect(classify('hello')).toBe('MINIMAL'));
    test('thanks → MINIMAL', () => expect(classify('thanks')).toBe('MINIMAL'));
    test('yes → MINIMAL', () => expect(classify('yes')).toBe('MINIMAL'));
    test('ok → MINIMAL', () => expect(classify('ok')).toBe('MINIMAL'));
  });

  // ── ALGORITHM cases (verb + technical object) ──
  describe('ALGORITHM', () => {
    test('build REST API → ALGORITHM', () =>
      expect(classify('build a REST API endpoint')).toBe('ALGORITHM'));
    test('fix auth bug → ALGORITHM', () =>
      expect(classify('fix the authentication bug')).toBe('ALGORITHM'));
    test('write unit tests → ALGORITHM', () =>
      expect(classify('write unit tests for the auth module')).toBe('ALGORITHM'));
    test('add middleware → ALGORITHM', () =>
      expect(classify('add authentication middleware to the API')).toBe('ALGORITHM'));
    test('update database schema → ALGORITHM', () =>
      expect(classify('update the database schema migration')).toBe('ALGORITHM'));
    test('refactor component → ALGORITHM', () =>
      expect(classify('refactor the login component')).toBe('ALGORITHM'));
    test('deploy server → ALGORITHM', () =>
      expect(classify('deploy the voice server update')).toBe('ALGORITHM'));
    test('debug pipeline → ALGORITHM', () =>
      expect(classify('debug the build pipeline error')).toBe('ALGORITHM'));
    test('set config → ALGORITHM', () =>
      expect(classify('set the config values for production')).toBe('ALGORITHM'));
    test('remove deprecated function → ALGORITHM', () =>
      expect(classify('remove the deprecated function from the module')).toBe('ALGORITHM'));
  });

  // ── ALGORITHM via complexity gate (long prompt, no tech object) ──
  describe('ALGORITHM (complexity gate)', () => {
    test('long multi-step prompt → ALGORITHM', () => {
      const longPrompt = 'implement ' + 'this is a very detailed request '.repeat(5);
      expect(classify(longPrompt)).toBe('ALGORITHM');
    });
    test('numbered steps → ALGORITHM', () =>
      expect(classify('create 1) the layout 2) the navigation 3) the footer')).toBe('ALGORITHM'));
  });

  // ── NATIVE cases (verb but NO technical object/complexity) ──
  describe('NATIVE (false positive prevention)', () => {
    test('write back to them → NATIVE', () =>
      expect(classify('write back to them that I agree')).toBe('NATIVE'));
    test('update my status → NATIVE', () =>
      expect(classify('update my status')).toBe('NATIVE'));
    test('add a comma here → NATIVE', () =>
      expect(classify('add a comma here')).toBe('NATIVE'));
    test('review the document I sent → NATIVE', () =>
      expect(classify('review the document I sent yesterday')).toBe('NATIVE'));
    test('set a reminder → NATIVE', () =>
      expect(classify('set a reminder for tomorrow')).toBe('NATIVE'));
  });

  // ── NATIVE cases (questions, general) ──
  describe('NATIVE (general)', () => {
    test('question → NATIVE', () =>
      expect(classify('what is the difference between X and Y')).toBe('NATIVE'));
    test('opinion request → NATIVE', () =>
      expect(classify('what do you think about this approach')).toBe('NATIVE'));
    test('explain something → NATIVE', () =>
      expect(classify('can you explain how this works')).toBe('NATIVE'));
  });
});
