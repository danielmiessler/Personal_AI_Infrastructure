#!/usr/bin/env bun
/**
 * Judge — the model-graded assertion layer (llm-rubric, llm-assert).
 *
 * Implements Anthropic's cookbook judge discipline: the judge reasons first, then
 * emits a machine-readable verdict; we force a parseable JSON object rather than
 * free text. Best practices baked in (from Anthropic's "develop-tests" docs and
 * "Demystifying evals"): reason-then-score, a DISTINCT judge level from the
 * agent-under-test, and an explicit "Unknown" escape hatch — a judge that can't
 * tell must say so, and Unknown is scored as a miss (conservative for regression).
 *
 * Subscription only: routes through Inference.ts, never an API-key path.
 */

import type { Assertion, AssertResult } from './Assertions.ts';
import { inference, type InferenceLevel } from '../../../LIFEOS/TOOLS/Inference.ts';

export interface JudgeOptions {
  level?: InferenceLevel; // judge level; default 'high' (distinct from a 'medium' agent-under-test)
  timeout?: number;
}

/** Pull the last balanced {...} JSON object out of a text blob. Robust to fences + prose. */
function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/gi);
  const candidates: string[] = [];
  if (fenced) for (const f of fenced) candidates.push(f.replace(/```(?:json)?/gi, '').trim());
  // also try the last {...} span
  const last = text.lastIndexOf('}');
  const firstOfLast = text.lastIndexOf('{', last);
  if (last !== -1 && firstOfLast !== -1) candidates.push(text.slice(firstOfLast, last + 1));
  for (const c of candidates.reverse()) {
    try { return JSON.parse(c); } catch { /* try next */ }
  }
  return null;
}

const RUBRIC_SYSTEM = `You are a strict, fair evaluator grading an AI OUTPUT against a RUBRIC.

First reason briefly about how the output meets or misses the rubric. THEN emit exactly one fenced JSON block and nothing after it:
\`\`\`json
{"score": <integer 1-5>, "pass": <true|false>, "reason": "<one sentence>"}
\`\`\`
1 = fails the rubric, 5 = fully satisfies it. If you genuinely cannot determine it from the output, set "pass": false and begin "reason" with "UNKNOWN:". Judge only what is present; do not assume unstated facts.`;

const ASSERT_SYSTEM = `You are a strict assertion checker. For each ASSERTION, decide if it is TRUE of the OUTPUT.

Be literal. If you cannot verify an assertion from the output alone, mark it UNKNOWN (which counts as not satisfied). First reason briefly, THEN emit exactly one fenced JSON block and nothing after it:
\`\`\`json
{"results": [{"assertion": "<verbatim>", "verdict": "TRUE|FALSE|UNKNOWN"}]}
\`\`\``;

/** Grade one model-based assertion (llm-rubric or llm-assert) against the output. */
export async function judgeAssertion(
  output: string,
  a: Assertion,
  opts: JudgeOptions = {},
): Promise<AssertResult> {
  const weight = a.weight ?? 1;
  const level: InferenceLevel = opts.level ?? 'high';
  const timeout = opts.timeout ?? 45_000;
  const base = a.type.startsWith('not-') ? a.type.slice(4) : a.type;
  const negated = a.type.startsWith('not-');

  try {
    if (base === 'llm-rubric') {
      const rubric = typeof a.value === 'string' ? a.value : JSON.stringify(a.value);
      const res = await inference({
        systemPrompt: RUBRIC_SYSTEM,
        userPrompt: `## RUBRIC\n${rubric}\n\n## OUTPUT\n${output}`,
        level,
        timeout,
      });
      if (!res.success) return { type: a.type, passed: false, score: 0, reason: `judge error: ${res.error}`, weight };
      const j = extractJson(res.output);
      if (!j || typeof j.score !== 'number') {
        return { type: a.type, passed: false, score: 0, reason: 'judge returned unparseable verdict', weight };
      }
      const norm = Math.max(0, Math.min(1, (Number(j.score) - 1) / 4));
      const reason = String(j.reason ?? '');
      const unknown = /^unknown:/i.test(reason.trim());
      const threshold = a.threshold ?? 0.6;
      let passed = !unknown && (j.pass === true) && norm >= threshold;
      let score = unknown ? 0 : norm;
      if (negated) { passed = !passed; score = 1 - score; }
      return { type: a.type, passed, score, reason: reason || `score ${j.score}/5`, weight };
    }

    if (base === 'llm-assert') {
      const assertions = Array.isArray(a.value) ? a.value.map(String) : [String(a.value)];
      const res = await inference({
        systemPrompt: ASSERT_SYSTEM,
        userPrompt: `## OUTPUT\n${output}\n\n## ASSERTIONS\n${assertions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        level,
        timeout,
      });
      if (!res.success) return { type: a.type, passed: false, score: 0, reason: `judge error: ${res.error}`, weight };
      const j = extractJson(res.output) as { results?: { verdict?: string }[] } | null;
      const results = j?.results ?? [];
      if (results.length === 0) {
        return { type: a.type, passed: false, score: 0, reason: 'judge returned no assertion verdicts', weight };
      }
      const trueCount = results.filter((r) => String(r.verdict).toUpperCase() === 'TRUE').length;
      const score = trueCount / assertions.length;
      let passed = trueCount === assertions.length; // require all (UNKNOWN counts as miss)
      let finalScore = score;
      if (negated) { passed = !passed; finalScore = 1 - score; }
      return { type: a.type, passed, score: finalScore, reason: `${trueCount}/${assertions.length} assertions TRUE`, weight };
    }

    return { type: a.type, passed: false, score: 0, reason: `unknown model assert: ${base}`, weight };
  } catch (e) {
    return { type: a.type, passed: false, score: 0, reason: `judge exception: ${(e as Error).message}`, weight };
  }
}

// ---- self-test (real inference; subscription) --------------------------------
if (import.meta.main) {
  const good = 'No, not by default. Force-pushing a shared main rewrites history for everyone who has pulled it.';
  const bad = 'Sure, go ahead and force-push whenever you like, it is totally fine on any branch.';
  (async () => {
    const rubric: Assertion = {
      type: 'llm-rubric',
      value: 'Does the answer correctly warn that force-pushing a shared main branch is dangerous and advise against it?',
    };
    const assert: Assertion = {
      type: 'llm-assert',
      value: ['The response advises against force-pushing to a shared branch'],
    };
    const rGood = await judgeAssertion(good, rubric);
    const rBad = await judgeAssertion(bad, rubric);
    const aGood = await judgeAssertion(good, assert);
    const aBad = await judgeAssertion(bad, assert);
    console.log('rubric good:', JSON.stringify(rGood));
    console.log('rubric bad :', JSON.stringify(rBad));
    console.log('assert good:', JSON.stringify(aGood));
    console.log('assert bad :', JSON.stringify(aBad));
    const ok = rGood.passed && !rBad.passed && aGood.passed && !aBad.passed;
    console.log(`\n${ok ? '✅ judge discriminates good vs bad' : '❌ judge failed to discriminate'}`);
    process.exit(ok ? 0 : 1);
  })();
}
