#!/usr/bin/env bun
/**
 * ModeClassifier.hook.ts — Deterministic mode pre-classification
 *
 * TRIGGER: UserPromptSubmit (runs BEFORE RatingCapture)
 *
 * PURPOSE: Prevent LLM from defaulting to NATIVE mode ~91% of the time due to
 * template attractor bias in CLAUDE.md. Uses deterministic regex (<20ms, no API)
 * to classify prompts and inject a mode hint into additionalContext.
 *
 * MODES:
 * - MINIMAL:    greetings, ratings, short acknowledgments
 * - ALGORITHM:  action verbs indicating substantial work
 * - NATIVE:     everything else (no injection — let CLAUDE.md classify)
 */

import { readHookInput } from './lib/hook-io';
import { classify } from './lib/classify';

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  const prompt = ((input as any).prompt || '').trim();

  const mode = classify(prompt);

  // Only inject for MINIMAL and ALGORITHM — NATIVE is the default, no hint needed
  if (mode === 'MINIMAL' || mode === 'ALGORITHM') {
    console.log(JSON.stringify({
      additionalContext: `<mode_hint>${mode}</mode_hint>\nPre-classified as ${mode} mode based on prompt pattern. Use this mode for your response format unless semantic analysis clearly overrides it.`
    }));
    console.error(`[ModeClassifier] Injected mode hint: ${mode}`);
  } else {
    console.error(`[ModeClassifier] NATIVE (no hint injected)`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[ModeClassifier] Error:', err);
  process.exit(0);
});
