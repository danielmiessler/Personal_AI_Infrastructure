#!/usr/bin/env bun
/**
 * SatisfactionCapture.test.ts - parseExplicitRating() coverage
 *
 * No test runner is wired up in this repo yet, so this file is a
 * self-contained harness: `bun run SatisfactionCapture.test.ts` prints a
 * readable PASS/FAIL line per case and exits non-zero on any failure;
 * `bun test SatisfactionCapture.test.ts` executes the same top-level code
 * and surfaces the same exit code.
 *
 * Covers the numbered-list false-positive fix (a "1) ..." prompt must never
 * parse as rating 1) plus every explicit-rating form that must keep working
 * byte-identically.
 */

import { parseExplicitRating } from './SatisfactionCapture.hook.ts';

type Expected = { rating: number; comment?: string } | null;

interface Case {
  label: string;
  input: string;
  expected: Expected;
}

const cases: Case[] = [
  // ── Numbered-list prompts must never parse as a rating (the bug) ──
  {
    label: 'multi-item ") " list is not rating 1',
    input: "1) install the CLI, 2) run the setup script, 3) restart the daemon",
    expected: null,
  },
  {
    label: 'single ") " list item is not rating 1',
    input: "1) what does this flag do?",
    expected: null,
  },
  {
    label: 'multi-line "." list is not rating 1',
    input: "1. first thing\n2. second thing",
    expected: null,
  },
  {
    label: 'lone ") " item with no siblings is not rating 1',
    input: "1) only one item with no siblings",
    expected: null,
  },
  {
    label: 'bracket form "] " is not rating 2',
    input: "2] bracket form",
    expected: null,
  },

  // ── Bare digit + long prose is a list item, not a rating ──
  // "-" is an accepted rating separator, so these are shape-identical to "8 - nice"
  // and only comment length tells them apart.
  {
    label: 'bare digit + "-" + long instruction is not a rating',
    input: "2 - config.md -- add the do-not-edit header, and also copy the file somewhere outside the install directory first",
    expected: null,
  },
  {
    label: 'bare digit + "-" + multi-item instruction is not a rating',
    input: "1 - we don't have the premium licence tier.  2 - the zone is set to office IPs, the datacenter IP and my home IP.  Run those checks",
    expected: null,
  },
  {
    label: 'bare digit + prose referencing other items is not a rating',
    input: "4 and 5 -- both look like things we already moved into a private directory earlier, so they can go",
    expected: null,
  },
  {
    label: 'unambiguous N/10 form is NOT length-capped',
    input: "8/10 really solid work here, especially the part where you caught the edge case before it shipped",
    expected: { rating: 8, comment: 'really solid work here, especially the part where you caught the edge case before it shipped' },
  },
  {
    label: 'unambiguous word form is NOT length-capped',
    input: "eight really solid work here, especially the part where you caught the edge case before it shipped",
    expected: { rating: 8, comment: 'really solid work here, especially the part where you caught the edge case before it shipped' },
  },

  // ── Legitimate rating forms must keep working, byte-identically ──
  { label: 'bare digit', input: '8', expected: { rating: 8 } },
  { label: 'bare ten', input: '10', expected: { rating: 10 } },
  { label: 'word form', input: 'ten', expected: { rating: 10 } },
  { label: 'word form with comment', input: 'Eight great work', expected: { rating: 8, comment: 'great work' } },
  { label: 'N/10 with comment', input: '10/10, thank you', expected: { rating: 10, comment: 'thank you' } },
  { label: 'N / 10 spaced', input: '9 / 10', expected: { rating: 9 } },
  { label: 'out of 10 with comment', input: '8 out of 10 nice', expected: { rating: 8, comment: 'nice' } },
  { label: 'dash separator', input: '8 - nice', expected: { rating: 8, comment: 'nice' } },
  { label: 'colon separator', input: '8: nice', expected: { rating: 8, comment: 'nice' } },
  { label: 'space separator', input: '9 solid work', expected: { rating: 9, comment: 'solid work' } },
  { label: 'fraction sentence-starter is not a rating', input: '2/10 items', expected: null },
  { label: 'sentence-starter is not a rating', input: '2 items', expected: null },
  { label: 'sentence-starter is not a rating (files)', input: '3 files changed', expected: null },
];

let failures = 0;

for (const { label, input, expected } of cases) {
  const actual = parseExplicitRating(input);
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (pass) {
    console.log(`PASS: ${label}`);
  } else {
    failures++;
    console.error(`FAIL: ${label} — input=${JSON.stringify(input)} expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
  }
}

console.log(`\n${cases.length - failures}/${cases.length} passed`);
if (failures > 0) process.exitCode = 1;
