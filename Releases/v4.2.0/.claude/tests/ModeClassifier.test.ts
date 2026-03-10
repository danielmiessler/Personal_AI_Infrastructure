/**
 * ModeClassifier.test.ts — Regression tests for deterministic mode classification
 *
 * Imports classify() directly from hooks/lib/classify.ts so tests always
 * reflect actual hook behavior — no logic drift from duplication.
 *
 * Run: bun test ./.claude/tests/ModeClassifier.test.ts
 */

import { test, expect, describe } from 'bun:test';
import { classify } from '../hooks/lib/classify';

describe('ModeClassifier', () => {

  // ── MINIMAL ──
  describe('MINIMAL', () => {
    test('rating 7 → MINIMAL',        () => expect(classify('7')).toBe('MINIMAL'));
    test('rating 10 → MINIMAL',       () => expect(classify('10')).toBe('MINIMAL'));
    test('rating with dash → MINIMAL',() => expect(classify('8 -')).toBe('MINIMAL'));
    test('rating with colon → MINIMAL',()=> expect(classify('9:')).toBe('MINIMAL'));
    test('greeting hi → MINIMAL',     () => expect(classify('hi')).toBe('MINIMAL'));
    test('greeting hello → MINIMAL',  () => expect(classify('hello')).toBe('MINIMAL'));
    test('thanks → MINIMAL',          () => expect(classify('thanks')).toBe('MINIMAL'));
    test('ok → MINIMAL',              () => expect(classify('ok')).toBe('MINIMAL'));
    test('yes → MINIMAL',             () => expect(classify('yes')).toBe('MINIMAL'));
    test('done → MINIMAL',            () => expect(classify('done')).toBe('MINIMAL'));
  });

  // ── ALGORITHM (verb + technical object) ──
  describe('ALGORITHM', () => {
    test('build REST API → ALGORITHM',
      () => expect(classify('build a REST API endpoint')).toBe('ALGORITHM'));
    test('fix auth bug → ALGORITHM',
      () => expect(classify('fix the authentication bug')).toBe('ALGORITHM'));
    test('write unit tests → ALGORITHM',
      () => expect(classify('write unit tests for the auth module')).toBe('ALGORITHM'));
    test('add middleware → ALGORITHM',
      () => expect(classify('add authentication middleware to the API')).toBe('ALGORITHM'));
    test('update database schema → ALGORITHM',
      () => expect(classify('update the database schema migration')).toBe('ALGORITHM'));
    test('refactor component → ALGORITHM',
      () => expect(classify('refactor the login component')).toBe('ALGORITHM'));
    test('deploy server → ALGORITHM',
      () => expect(classify('deploy the voice server update')).toBe('ALGORITHM'));
    test('debug pipeline → ALGORITHM',
      () => expect(classify('debug the build pipeline error')).toBe('ALGORITHM'));
    test('set config → ALGORITHM',
      () => expect(classify('set the config values for production')).toBe('ALGORITHM'));
    test('remove deprecated function → ALGORITHM',
      () => expect(classify('remove the deprecated function from the module')).toBe('ALGORITHM'));
    test('set up repo → ALGORITHM (two-word verb)',
      () => expect(classify('set up the repo structure')).toBe('ALGORITHM'));
  });

  // ── ALGORITHM (complexity gate — verb + multi-step, no tech object) ──
  describe('ALGORITHM (complexity gate)', () => {
    test('31-word prompt → ALGORITHM',
      () => expect(classify('implement ' + 'this is a very detailed request '.repeat(5))).toBe('ALGORITHM'));
    test('numbered steps → ALGORITHM',
      () => expect(classify('create 1) the layout 2) the navigation 3) the footer')).toBe('ALGORITHM'));
    test('verb + "and then" → ALGORITHM',
      () => expect(classify('build the header and then add the footer')).toBe('ALGORITHM'));
    test('verb + "first" → ALGORITHM',
      () => expect(classify('implement this first then verify it works second')).toBe('ALGORITHM'));
  });

  // ── NATIVE (verb present but no tech object and no complexity) ──
  describe('NATIVE (false positive prevention)', () => {
    test('write back to them → NATIVE',
      () => expect(classify('write back to them that I agree')).toBe('NATIVE'));
    test('update my status → NATIVE',
      () => expect(classify('update my status')).toBe('NATIVE'));
    test('add a comma → NATIVE',
      () => expect(classify('add a comma here')).toBe('NATIVE'));
    test('review the document → NATIVE',
      () => expect(classify('review the document I sent yesterday')).toBe('NATIVE'));
    test('set a reminder → NATIVE',
      () => expect(classify('set a reminder for tomorrow')).toBe('NATIVE'));
    test('verb only, no object → NATIVE',
      () => expect(classify('fix')).toBe('NATIVE'));
    test('complexity keywords but no verb → NATIVE',
      () => expect(classify('first do this and then do that step by step')).toBe('NATIVE'));
  });

  // ── NATIVE (general questions and conversation) ──
  describe('NATIVE (general)', () => {
    test('what question → NATIVE',
      () => expect(classify('what is the difference between X and Y')).toBe('NATIVE'));
    test('opinion request → NATIVE',
      () => expect(classify('what do you think about this approach')).toBe('NATIVE'));
    test('explain request → NATIVE',
      () => expect(classify('can you explain how this works')).toBe('NATIVE'));
    test('empty string → NATIVE',
      () => expect(classify('')).toBe('NATIVE'));
    test('single char → NATIVE',
      () => expect(classify('x')).toBe('NATIVE'));
  });
});
