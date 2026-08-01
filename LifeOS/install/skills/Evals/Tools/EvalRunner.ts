#!/usr/bin/env bun
/**
 * EvalRunner — assertion-first suite runner (v2). Canonical replacement for the
 * old grader-stack AlgorithmBridge path.
 *
 * A CASE is `{id, prompt, assert:[...]}`. The agent-under-test runs the prompt
 * with the LIVE system prompt + DA identity as its system (so a config edit that
 * shifts dispositions shows up), producing real output. Each assertion is graded
 * deterministically (Assertions.ts) or by the model judge (Judge.ts). Cases run
 * `trials` times; we report pass^k (all trials pass — the honest metric for a
 * reliability-critical agent) alongside pass@k. Subscription-billed via Inference.ts.
 *
 * Suite resolution order: USER customizations first (identity-bound suites live
 * outside the public skill), then the skill's own generic Suites/.
 *
 * Anthropic doctrine encoded: grade the OUTPUT not the path; capability vs
 * regression; partial credit via weighted asserts; balanced should-do/should-not
 * via `not-*` and negative cases. Read transcripts — every run persists them.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse as parseYaml } from 'yaml';
import { parseArgs } from 'node:util';
import { evaluateDeterministic, isModelAssert, type Assertion, type AssertResult } from './Assertions.ts';
import { judgeAssertion } from './Judge.ts';
import { inference, type InferenceLevel } from '../../../LIFEOS/TOOLS/Inference.ts';

const CLAUDE_ROOT = join(homedir(), '.claude');
const RESULTS_DIR = join(CLAUDE_ROOT, 'LIFEOS', 'MEMORY', 'STATE', 'Evals-Results');
const USER_SUITES = join(CLAUDE_ROOT, 'LIFEOS', 'USER', 'CUSTOMIZATIONS', 'SKILLS', 'Evals', 'Suites');
const SKILL_SUITES = join(import.meta.dir, '..', 'Suites');

export interface EvalCase {
  id: string;
  prompt: string;
  assert: Assertion[];
  threshold?: number;
  negative?: boolean; // documents a should-NOT case (balance); no behavior change
}

export interface EvalSuiteV2 {
  name: string;
  type?: 'capability' | 'regression';
  pass_threshold?: number;
  agent_level?: InferenceLevel;
  judge_level?: InferenceLevel;
  trials?: number;
  system_prompt?: string; // override; default = live system prompt + DA identity
  cases: EvalCase[];
}

export interface CaseResult {
  id: string;
  mean_score: number;
  pass_at_k: number;
  pass_to_k: number;
  trials: { score: number; passed: boolean; asserts: AssertResult[]; output: string }[];
}

export interface SuiteResult {
  suite: string;
  type: string;
  passed: boolean;
  score: number; // suite mean
  pass_to_k: number; // headline: mean per-case pass^k
  pass_at_k: number;
  summary: string;
  run_id: string;
  cases: { id: string; mean_score: number; pass_to_k: number; pass_at_k: number }[];
}

export function buildLiveSystemPrompt(): string {
  const sources = [
    join(CLAUDE_ROOT, 'LIFEOS', 'LIFEOS_SYSTEM_PROMPT.md'),
    join(CLAUDE_ROOT, 'LIFEOS', 'USER', 'DIGITAL_ASSISTANT', 'DA_IDENTITY.md'),
  ];
  const parts = sources.filter(existsSync).map((f) => readFileSync(f, 'utf-8'));
  return parts.length ? parts.join('\n\n---\n\n') : 'You are a precise assistant. Verify before claiming done; be concise.';
}

function resolveSuite(name: string): string | null {
  for (const dir of [USER_SUITES, SKILL_SUITES]) {
    for (const p of [join(dir, `${name}.yaml`), join(dir, 'Regression', `${name}.yaml`), join(dir, 'Capability', `${name}.yaml`)]) {
      if (existsSync(p)) return p;
    }
  }
  return null;
}

async function applyAsserts(output: string, asserts: Assertion[], judgeLevel: InferenceLevel): Promise<AssertResult[]> {
  const out: AssertResult[] = [];
  for (const a of asserts) {
    out.push(isModelAssert(a.type) ? await judgeAssertion(output, a, { level: judgeLevel }) : evaluateDeterministic(output, a));
  }
  return out;
}

function weighted(results: AssertResult[]): number {
  const tw = results.reduce((s, r) => s + r.weight, 0);
  return tw > 0 ? results.reduce((s, r) => s + r.score * r.weight, 0) / tw : 0;
}

export async function runSuite(name: string, override: Partial<EvalSuiteV2> = {}): Promise<SuiteResult> {
  const path = resolveSuite(name);
  let suite: EvalSuiteV2;
  if (path) {
    suite = { ...(parseYaml(readFileSync(path, 'utf-8')) as EvalSuiteV2), ...override };
  } else if (override.cases?.length) {
    // Inline/ephemeral suite (e.g. a drafted case dry-run) — no file needed.
    suite = { name, cases: [], ...override } as EvalSuiteV2;
  } else {
    return { suite: name, type: 'unknown', passed: false, score: 0, pass_to_k: 0, pass_at_k: 0, summary: `Suite not found: ${name}`, run_id: 'error', cases: [] };
  }
  const threshold = suite.pass_threshold ?? 0.75;
  const trials = suite.trials ?? 3;
  const agentLevel: InferenceLevel = suite.agent_level ?? 'medium';
  const judgeLevel: InferenceLevel = suite.judge_level ?? 'high';
  // Eval-context suffix: the agent-under-test runs single-shot with NO tools.
  // Without this, the full agentic system prompt makes it narrate/simulate tool
  // calls and defer the answer, so the eval measures "reaches for tools" instead
  // of the target disposition. This keeps the task unambiguous (Anthropic Step 2)
  // while preserving verify discipline — it can still caveat what it would check.
  const EVAL_CONTEXT =
    '\n\n---\n[EVALUATION CONTEXT] You are being evaluated in a single-shot setting with NO tools available. ' +
    'Do not narrate or simulate tool calls. Give your best final answer directly, applying your normal judgment, ' +
    'voice, and verification discipline within the answer itself (e.g. state plainly when something would need checking).';
  const systemPrompt = (suite.system_prompt ?? buildLiveSystemPrompt()) + EVAL_CONTEXT;
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const caseResults: CaseResult[] = [];
  for (const c of suite.cases) {
    const caseThreshold = c.threshold ?? threshold;
    const trialResults: CaseResult['trials'] = [];
    for (let t = 0; t < trials; t++) {
      const res = await inference({ systemPrompt, userPrompt: c.prompt, level: agentLevel, timeout: 90_000 });
      const output = res.success ? res.output.trim() : '';
      const asserts = res.success ? await applyAsserts(output, c.assert, judgeLevel) : [];
      const score = res.success ? weighted(asserts) : 0;
      trialResults.push({ score, passed: score >= caseThreshold, asserts, output });
      console.log(`  ${c.id} t${t + 1}: ${score >= caseThreshold ? '✅' : '❌'} ${(score * 100).toFixed(0)}%`);
    }
    const passed = trialResults.filter((t) => t.passed).length;
    caseResults.push({
      id: c.id,
      mean_score: trialResults.reduce((s, t) => s + t.score, 0) / trials,
      pass_at_k: passed > 0 ? 1 : 0,
      pass_to_k: passed / trials,
      trials: trialResults,
    });
  }

  const meanScore = caseResults.reduce((s, c) => s + c.mean_score, 0) / caseResults.length;
  const passToK = caseResults.reduce((s, c) => s + c.pass_to_k, 0) / caseResults.length;
  const passAtK = caseResults.reduce((s, c) => s + c.pass_at_k, 0) / caseResults.length;
  const passed = meanScore >= threshold;

  const result: SuiteResult = {
    suite: name,
    type: suite.type ?? 'regression',
    passed,
    score: meanScore,
    pass_to_k: passToK,
    pass_at_k: passAtK,
    summary: `pass^k ${(passToK * 100).toFixed(0)}%, mean ${(meanScore * 100).toFixed(1)}% over ${trials} trials`,
    run_id: runId,
    cases: caseResults.map((c) => ({ id: c.id, mean_score: c.mean_score, pass_to_k: c.pass_to_k, pass_at_k: c.pass_at_k })),
  };

  // Persist full transcripts (read transcripts — Anthropic gate) + latest status.
  const dir = join(RESULTS_DIR, name);
  mkdirSync(join(dir, runId), { recursive: true });
  writeFileSync(join(dir, runId, 'run.json'), JSON.stringify({ ...result, detail: caseResults }, null, 2));
  writeFileSync(join(dir, 'latest.json'), JSON.stringify({ ...result, ts: new Date().toISOString() }, null, 2));
  return result;
}

if (import.meta.main) {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      suite: { type: 'string', short: 's' },
      trials: { type: 'string', short: 't' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });
  if (values.help || !values.suite) {
    console.log(`EvalRunner — assertion-first suite runner\n\n  bun run EvalRunner.ts -s <suite> [-t trials] [--json]\n\nExit 0 = passed, 1 = regressed.`);
    process.exit(values.help ? 0 : 1);
  }
  const override: Partial<EvalSuiteV2> = {};
  if (values.trials) override.trials = parseInt(values.trials);
  console.log(`\nRunning suite: ${values.suite}\n`);
  const result = await runSuite(values.suite, override);
  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`\n📊 ${result.passed ? '✅ PASSED' : '❌ REGRESSED'}: ${result.suite} (${result.type})`);
    console.log(`   ${result.summary}`);
    for (const c of result.cases) console.log(`   - ${c.id}: pass^k ${(c.pass_to_k * 100).toFixed(0)}%  mean ${(c.mean_score * 100).toFixed(0)}%`);
  }
  process.exit(result.passed ? 0 : 1);
}
