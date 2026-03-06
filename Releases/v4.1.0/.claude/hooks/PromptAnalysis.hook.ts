#!/usr/bin/env bun
/**
 * PromptAnalysis.hook.ts — Batched prompt analysis (tab title + session name)
 *
 * TRIGGER: UserPromptSubmit (runs AFTER ModeClassifier, BEFORE RatingCapture)
 *
 * PURPOSE: Replace 2 separate Haiku inference calls (TerminalState tab title +
 * SessionAutoName session name) with a single call. Writes shared result to
 * MEMORY/STATE/prompt-analysis/{session_id}.json for downstream hooks to read.
 *
 * WHAT IT REPLACES:
 * - TerminalState's summarizePrompt() inference call for tab title
 * - SessionAutoName's inference call for session name (first prompt only)
 *
 * WHAT IT DOES NOT REPLACE:
 * - RatingCapture's sentiment analysis (needs transcript context, fundamentally different)
 * - ModeClassifier (deterministic regex, no inference)
 *
 * DOWNSTREAM HOOKS read the shared result and skip their own inference if present.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { inference } from '../PAI/Tools/Inference';
import { paiPath } from './lib/paths';

const ANALYSIS_DIR = paiPath('MEMORY', 'STATE', 'prompt-analysis');

const SYSTEM_PROMPT = `Analyze this user prompt. Return JSON only — no other text.

{
  "tab_title": "2-4 word gerund sentence ending in period (e.g. 'Fixing auth bug.')",
  "session_name": "Exactly 4 words in Title Case describing the task (e.g. 'Fix Auth Module Bug')"
}

RULES:
- tab_title: Start with gerund (-ing verb). 2-4 words max. End with period. Be specific to the prompt content.
- session_name: Exactly 4 words in Title Case. Describe the task like a newspaper headline. No articles (a/an/the).
- Both fields must reference ONLY topics explicitly present in the user's message.
- NEVER use generic words: "task", "work", "request", "response", "session".
- If the prompt is a greeting, rating (1-10), or short acknowledgment, return null for both fields.`;

export interface PromptAnalysisResult {
  tab_title: string | null;
  session_name: string | null;
  timestamp: string;
}

/**
 * Read the shared analysis result for a session.
 * Returns null if no result exists or it's stale (>30s old).
 */
export function readAnalysisResult(sessionId: string): PromptAnalysisResult | null {
  try {
    const resultPath = join(ANALYSIS_DIR, `${sessionId}.json`);
    if (!existsSync(resultPath)) return null;

    const content = readFileSync(resultPath, 'utf-8');
    const result: PromptAnalysisResult = JSON.parse(content);

    // Reject stale results (>30s) to prevent using results from previous prompts
    const age = Date.now() - new Date(result.timestamp).getTime();
    if (age > 30000) return null;

    return result;
  } catch {
    return null;
  }
}

async function main() {
  let input: any;
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      let data = '';
      const timer = setTimeout(() => resolve(data), 5000);
      process.stdin.on('data', (chunk) => { data += chunk.toString(); });
      process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
      process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
    });

    if (!raw.trim()) process.exit(0);
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const prompt = (input.prompt || input.user_prompt || '').trim();
  const sessionId = input.session_id;

  if (!prompt || prompt.length < 10 || !sessionId) {
    console.error('[PromptAnalysis] Skipping — prompt too short or no session ID');
    process.exit(0);
  }

  // Skip for ratings (1-10) and trivial inputs
  if (/^([1-9]|10)[\s\-:]*/.test(prompt)) {
    console.error('[PromptAnalysis] Skipping — rating input');
    process.exit(0);
  }

  // Clean prompt for inference
  const cleanPrompt = prompt
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);

  try {
    const result = await inference({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: cleanPrompt,
      expectJson: true,
      timeout: 10000,
      level: 'fast',
    });

    if (!result.success || !result.parsed) {
      console.error(`[PromptAnalysis] Inference failed: ${result.error}`);
      process.exit(0);
    }

    const parsed = result.parsed as any;
    const analysisResult: PromptAnalysisResult = {
      tab_title: typeof parsed.tab_title === 'string' ? parsed.tab_title : null,
      session_name: typeof parsed.session_name === 'string' ? parsed.session_name : null,
      timestamp: new Date().toISOString(),
    };

    // Write shared result
    if (!existsSync(ANALYSIS_DIR)) mkdirSync(ANALYSIS_DIR, { recursive: true });
    writeFileSync(
      join(ANALYSIS_DIR, `${sessionId}.json`),
      JSON.stringify(analysisResult, null, 2)
    );

    console.error(`[PromptAnalysis] Result: tab="${analysisResult.tab_title}", name="${analysisResult.session_name}" (${result.latencyMs}ms)`);
  } catch (err) {
    console.error(`[PromptAnalysis] Error: ${err}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[PromptAnalysis] Fatal:', err);
  process.exit(0);
});
