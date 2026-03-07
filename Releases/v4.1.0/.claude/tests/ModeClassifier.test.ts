/**
 * ModeClassifier.test.ts — Regression tests for deterministic mode classification
 *
 * Tests the dual-gate ALGORITHM classification:
 *   Gate 1: action verb present
 *   Gate 2: technical object present OR multi-step complexity
 *
 * Run: npx tsx --test tests/ModeClassifier.test.ts
 *   or: bun test tests/ModeClassifier.test.ts
 */

import { test, describe } from 'node:test';
import { strictEqual } from 'node:assert';

// Extract classification logic from ModeClassifier.hook.ts
// (duplicated here to test without stdin/stdout hook harness)
function classify(prompt: string): 'MINIMAL' | 'ALGORITHM' | 'NATIVE' {
  const trimmed = prompt.trim();

  const isMinimal = /^(hi|hello|hey|thanks|thank you|ok|okay|done|got it|sure|yes|no|yep|nope|\d+[\s\-:]*)$/i.test(trimmed);
  if (isMinimal) return 'MINIMAL';
  if (!trimmed || trimmed.length < 2) return 'NATIVE';

  const hasActionVerb = /\b(build|create|implement|fix|debug|refactor|analyze|write|design|review|plan|add|update|remove|set|migrate|convert|optimize|investigate|research|develop|configure|deploy|install|test|audit|generate|scaffold|integrate|setup|set up)\b/i.test(trimmed);

  const hasTechnicalObject = /\b(code|file|function|class|method|api|endpoint|database|schema|config|hook|script|test|build|deploy|server|component|module|service|bug|error|feature|algorithm|query|migration|route|middleware|model|controller|template|pipeline|workflow|repo|branch|commit|container|package|dependency|type|interface|struct)\b/i.test(trimmed);
  const words = trimmed.split(/\s+/);
  const isComplex = words.length > 30 || /\b(and then|also|step|first|second|finally)\b|\d+\)/i.test(trimmed);

  const isAlgorithm = hasActionVerb && (hasTechnicalObject || isComplex);

  return isAlgorithm ? 'ALGORITHM' : 'NATIVE';
}

describe('ModeClassifier', () => {
  // ── MINIMAL cases ──
  describe('MINIMAL', () => {
    test('rating number → MINIMAL', () => strictEqual(classify('7'), 'MINIMAL'));
    test('rating with dash → MINIMAL', () => strictEqual(classify('8 -'), 'MINIMAL'));
    test('greeting → MINIMAL', () => strictEqual(classify('hello'), 'MINIMAL'));
    test('thanks → MINIMAL', () => strictEqual(classify('thanks'), 'MINIMAL'));
    test('yes → MINIMAL', () => strictEqual(classify('yes'), 'MINIMAL'));
    test('ok → MINIMAL', () => strictEqual(classify('ok'), 'MINIMAL'));
  });

  // ── ALGORITHM cases (verb + technical object) ──
  describe('ALGORITHM', () => {
    test('build REST API → ALGORITHM', () =>
      strictEqual(classify('build a REST API endpoint'), 'ALGORITHM'));
    test('fix auth bug → ALGORITHM', () =>
      strictEqual(classify('fix the authentication bug'), 'ALGORITHM'));
    test('write unit tests → ALGORITHM', () =>
      strictEqual(classify('write unit tests for the auth module'), 'ALGORITHM'));
    test('add middleware → ALGORITHM', () =>
      strictEqual(classify('add authentication middleware to the API'), 'ALGORITHM'));
    test('update database schema → ALGORITHM', () =>
      strictEqual(classify('update the database schema migration'), 'ALGORITHM'));
    test('refactor component → ALGORITHM', () =>
      strictEqual(classify('refactor the login component'), 'ALGORITHM'));
    test('deploy server → ALGORITHM', () =>
      strictEqual(classify('deploy the voice server update'), 'ALGORITHM'));
    test('debug pipeline → ALGORITHM', () =>
      strictEqual(classify('debug the build pipeline error'), 'ALGORITHM'));
    test('set config → ALGORITHM', () =>
      strictEqual(classify('set the config values for production'), 'ALGORITHM'));
    test('remove deprecated function → ALGORITHM', () =>
      strictEqual(classify('remove the deprecated function from the module'), 'ALGORITHM'));
  });

  // ── ALGORITHM via complexity gate (long prompt, no tech object) ──
  describe('ALGORITHM (complexity gate)', () => {
    test('long multi-step prompt → ALGORITHM', () => {
      const longPrompt = 'implement ' + 'this is a very detailed request '.repeat(5);
      strictEqual(classify(longPrompt), 'ALGORITHM');
    });
    test('numbered steps → ALGORITHM', () =>
      strictEqual(classify('create 1) the layout 2) the navigation 3) the footer'), 'ALGORITHM'));
  });

  // ── NATIVE cases (verb but NO technical object/complexity) ──
  describe('NATIVE (false positive prevention)', () => {
    test('write back to them → NATIVE', () =>
      strictEqual(classify('write back to them that I agree'), 'NATIVE'));
    test('update my status → NATIVE', () =>
      strictEqual(classify('update my status'), 'NATIVE'));
    test('add a comma here → NATIVE', () =>
      strictEqual(classify('add a comma here'), 'NATIVE'));
    test('review the document I sent → NATIVE', () =>
      strictEqual(classify('review the document I sent yesterday'), 'NATIVE'));
    test('set a reminder → NATIVE', () =>
      strictEqual(classify('set a reminder for tomorrow'), 'NATIVE'));
  });

  // ── NATIVE cases (questions, general) ──
  describe('NATIVE (general)', () => {
    test('question → NATIVE', () =>
      strictEqual(classify('what is the difference between X and Y'), 'NATIVE'));
    test('opinion request → NATIVE', () =>
      strictEqual(classify('what do you think about this approach'), 'NATIVE'));
    test('explain something → NATIVE', () =>
      strictEqual(classify('can you explain how this works'), 'NATIVE'));
  });
});
