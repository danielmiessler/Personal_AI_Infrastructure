#!/usr/bin/env bun
/**
 * Assertions — the typed deterministic assert engine (assertion-first evals).
 *
 * Vocabulary follows Anthropic's "Demystifying evals for AI agents": a grader is
 * logic that scores an aspect of the output; a grader holds one or more
 * ASSERTIONS (checks). This file is the deterministic (code-based) layer — fast,
 * cheap, objective, reproducible. Model-graded assertions (llm-rubric, llm-assert)
 * live in Judge.ts; the runner composes both.
 *
 * Design is promptfoo-inspired (a typed `{type, value, threshold, weight}` assert
 * with `not-` negation) but our own clean TS — no runtime dependency, no API
 * billing. Deterministic asserts never call a model.
 *
 * Anthropic's "grade outcomes, not paths" rule: trajectory/tool-sequence asserts
 * are intentionally NOT default here — they are a separate opt-in concern, kept
 * out of the everyday output-graded path because rigid path-matching is brittle.
 */

export type DeterministicAssertType =
  | 'equals'
  | 'contains'
  | 'icontains'
  | 'contains-all'
  | 'contains-any'
  | 'regex'
  | 'starts-with'
  | 'ends-with'
  | 'is-json'
  | 'contains-json'
  | 'max-length'
  | 'min-length';

export type ModelAssertType = 'llm-rubric' | 'llm-assert';

export type AssertType = DeterministicAssertType | ModelAssertType;

/** An assertion. `type` may carry a `not-` prefix to invert a deterministic check. */
export interface Assertion {
  type: string; // AssertType or `not-<DeterministicAssertType>`
  value?: unknown; // expected value / substring(s) / pattern / rubric text / JSON schema
  threshold?: number; // for model-graded score cutoff, or length bounds
  weight?: number; // default 1.0 — partial-credit importance
  metric?: string; // optional label for aggregation/UI
}

export interface AssertResult {
  type: string;
  passed: boolean;
  score: number; // 0..1
  reason: string;
  weight: number;
}

const MODEL_TYPES = new Set<string>(['llm-rubric', 'llm-assert']);

export function isModelAssert(type: string): boolean {
  const base = type.startsWith('not-') ? type.slice(4) : type;
  return MODEL_TYPES.has(base);
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString);
  return [asString(v)];
}

/** Evaluate one deterministic assertion against the output text. */
export function evaluateDeterministic(output: string, a: Assertion): AssertResult {
  const weight = a.weight ?? 1;
  const negated = a.type.startsWith('not-');
  const base = negated ? a.type.slice(4) : a.type;

  let passed = false;
  let reason = '';

  switch (base as DeterministicAssertType) {
    case 'equals':
      passed = output.trim() === asString(a.value).trim();
      reason = passed ? 'exact match' : 'not an exact match';
      break;
    case 'contains':
      passed = output.includes(asString(a.value));
      reason = passed ? `contains "${asString(a.value)}"` : `missing "${asString(a.value)}"`;
      break;
    case 'icontains':
      passed = output.toLowerCase().includes(asString(a.value).toLowerCase());
      reason = passed ? 'contains (case-insensitive)' : 'missing (case-insensitive)';
      break;
    case 'contains-all': {
      const items = asStringArray(a.value);
      const missing = items.filter((s) => !output.includes(s));
      passed = missing.length === 0;
      reason = passed ? 'contains all' : `missing: ${missing.join(', ')}`;
      break;
    }
    case 'contains-any': {
      const items = asStringArray(a.value);
      const hit = items.find((s) => output.includes(s));
      passed = hit !== undefined;
      reason = passed ? `contains "${hit}"` : `none of ${items.length} present`;
      break;
    }
    case 'regex': {
      let re: RegExp;
      try {
        re = new RegExp(asString(a.value));
      } catch (e) {
        return { type: a.type, passed: false, score: 0, reason: `bad regex: ${(e as Error).message}`, weight };
      }
      passed = re.test(output);
      reason = passed ? `matches /${asString(a.value)}/` : `no match /${asString(a.value)}/`;
      break;
    }
    case 'starts-with':
      passed = output.trimStart().startsWith(asString(a.value));
      reason = passed ? 'starts with expected' : 'does not start with expected';
      break;
    case 'ends-with':
      passed = output.trimEnd().endsWith(asString(a.value));
      reason = passed ? 'ends with expected' : 'does not end with expected';
      break;
    case 'is-json':
      try {
        JSON.parse(output.trim());
        passed = true;
        reason = 'valid JSON';
      } catch {
        passed = false;
        reason = 'not valid JSON';
      }
      break;
    case 'contains-json': {
      passed = /[{[][\s\S]*[}\]]/.test(output) && (() => {
        const m = output.match(/[{[][\s\S]*[}\]]/);
        if (!m) return false;
        try { JSON.parse(m[0]); return true; } catch { return false; }
      })();
      reason = passed ? 'contains a JSON fragment' : 'no valid JSON fragment';
      break;
    }
    case 'max-length':
      passed = output.length <= (a.threshold ?? Infinity);
      reason = `length ${output.length} ${passed ? '<=' : '>'} ${a.threshold}`;
      break;
    case 'min-length':
      passed = output.length >= (a.threshold ?? 0);
      reason = `length ${output.length} ${passed ? '>=' : '<'} ${a.threshold}`;
      break;
    default:
      return { type: a.type, passed: false, score: 0, reason: `unknown deterministic assert: ${base}`, weight };
  }

  if (negated) {
    passed = !passed;
    reason = `NOT(${reason})`;
  }
  return { type: a.type, passed, score: passed ? 1 : 0, reason, weight };
}

// ---- self-test ----------------------------------------------------------------
if (import.meta.main) {
  const cases: { out: string; a: Assertion; want: boolean }[] = [
    { out: 'Hello world', a: { type: 'equals', value: 'Hello world' }, want: true },
    { out: 'Hello world', a: { type: 'equals', value: 'hello' }, want: false },
    { out: 'Hello world', a: { type: 'contains', value: 'world' }, want: true },
    { out: 'Hello world', a: { type: 'not-contains', value: 'should work' }, want: true },
    { out: 'Hello WORLD', a: { type: 'icontains', value: 'world' }, want: true },
    { out: 'a b c', a: { type: 'contains-all', value: ['a', 'c'] }, want: true },
    { out: 'a b c', a: { type: 'contains-all', value: ['a', 'z'] }, want: false },
    { out: 'a b c', a: { type: 'contains-any', value: ['x', 'b'] }, want: true },
    { out: 'v1.2.3', a: { type: 'regex', value: '^v\\d+\\.\\d+\\.\\d+$' }, want: true },
    { out: 'No, not by default', a: { type: 'starts-with', value: 'No' }, want: true },
    { out: '{"a":1}', a: { type: 'is-json' }, want: true },
    { out: 'nope', a: { type: 'is-json' }, want: false },
    { out: 'prefix {"a":1} suffix', a: { type: 'contains-json' }, want: true },
    { out: 'short', a: { type: 'max-length', threshold: 10 }, want: true },
    { out: 'this is quite long', a: { type: 'max-length', threshold: 5 }, want: false },
    { out: 'should work', a: { type: 'not-contains', value: 'should work' }, want: false },
  ];
  let pass = 0;
  for (const c of cases) {
    const r = evaluateDeterministic(c.out, c.a);
    const ok = r.passed === c.want;
    if (ok) pass++;
    console.log(`${ok ? '✅' : '❌'} ${c.a.type} on "${c.out.slice(0, 20)}" → ${r.passed} (want ${c.want}) — ${r.reason}`);
  }
  console.log(`\n${pass}/${cases.length} deterministic assert cases passed`);
  process.exit(pass === cases.length ? 0 : 1);
}
