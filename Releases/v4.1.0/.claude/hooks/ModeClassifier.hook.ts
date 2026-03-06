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

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  const prompt = ((input as any).prompt || '').trim();
  if (!prompt || prompt.length < 2) process.exit(0);

  // Minimal: greetings, ratings (1-10), short acknowledgments
  const isMinimal = /^(hi|hello|hey|thanks|thank you|ok|okay|done|got it|sure|yes|no|yep|nope|\d+[\s\-:]*)$/i.test(prompt);

  // ALGORITHM requires BOTH gates to pass:
  // Gate 1: action verb present
  const hasActionVerb = /\b(build|create|implement|fix|debug|refactor|analyze|write|design|review|plan|add|update|remove|set|migrate|convert|optimize|investigate|research|develop|configure|deploy|install|test|audit|generate|scaffold|integrate|setup|set up)\b/i.test(prompt);

  // Gate 2: technical object present OR multi-step complexity
  const hasTechnicalObject = /\b(code|file|function|class|method|api|endpoint|database|schema|config|hook|script|test|build|deploy|server|component|module|service|bug|error|feature|algorithm|query|migration|route|middleware|model|controller|template|pipeline|workflow|repo|branch|commit|container|package|dependency|type|interface|struct)\b/i.test(prompt);
  const words = prompt.trim().split(/\s+/);
  const isComplex = words.length > 30 || /\b(and then|also|step|first|second|finally|\d+\))\b/i.test(prompt);

  const isAlgorithm = hasActionVerb && (hasTechnicalObject || isComplex);

  const mode = isMinimal ? 'MINIMAL' : isAlgorithm ? 'ALGORITHM' : 'NATIVE';

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
