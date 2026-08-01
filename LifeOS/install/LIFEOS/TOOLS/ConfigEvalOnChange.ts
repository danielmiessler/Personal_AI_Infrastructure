#!/usr/bin/env bun
/**
 * ConfigEvalOnChange — runs the DA behavioural-disposition regression suite
 * after a change to a behaviour-defining file, and notifies on regression.
 *
 * Spawned DETACHED by hooks/ConfigEvalFire.hook.ts when a Write/Edit lands on a
 * sentinel file (system prompt, DA/principal identity, CLAUDE.md, OPERATIONAL_RULES,
 * a hook). Never runs inline in a session — the hook returns immediately.
 *
 * Billing: routes through the Evals runner, which uses Inference.ts (subscription).
 * The spawner deletes ANTHROPIC_API_KEY/AUTH_TOKEN so no API billing is possible.
 *
 * Single-flight: a lockfile prevents overlapping runs when several sentinel files
 * change together. Regression (suite below threshold) POSTs a voice/Pulse notice.
 */

import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { runSuite } from '../../skills/Evals/Tools/EvalRunner.ts';
import { PULSE_BASE } from '../PULSE/endpoint';

const CLAUDE_ROOT = join(homedir(), '.claude');
const RESULTS_DIR = join(CLAUDE_ROOT, 'LIFEOS', 'MEMORY', 'STATE', 'Evals-Results');
const LOCK = join(RESULTS_DIR, '.config-eval.lock');
const LOG = join(CLAUDE_ROOT, 'LIFEOS', 'MEMORY', 'OBSERVABILITY', 'config-eval-fires.jsonl');
// Which suite to fire. Identity-bound suites live in the USER customization
// layer (never the public skill tree), so the name is USER-configured too:
// LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Evals/config.json {"config_change_suite": "..."}.
// Default is the generic core-behaviors suite that ships with the skill —
// a fresh install fires a suite that actually exists (Forge 7.10.2 audit).
function resolveSuite(): string {
  try {
    const cfgPath = join(CLAUDE_ROOT, 'LIFEOS', 'USER', 'CUSTOMIZATIONS', 'SKILLS', 'Evals', 'config.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
    if (typeof cfg.config_change_suite === 'string' && cfg.config_change_suite.length > 0) return cfg.config_change_suite;
  } catch { /* no user config — generic default */ }
  return 'core-behaviors';
}
const SUITE = resolveSuite();

function log(payload: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(LOG), { recursive: true });
    appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...payload }) + '\n');
  } catch { /* best-effort */ }
}

async function notify(message: string): Promise<void> {
  try {
    await fetch(`${PULSE_BASE}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* Pulse may be down; the latest.json + log still record the result */ }
}

async function main(): Promise<void> {
  const trigger = process.argv[2] ?? 'unknown';

  mkdirSync(RESULTS_DIR, { recursive: true });
  // Single-flight: stale lock older than 10 min is ignored.
  if (existsSync(LOCK)) {
    try {
      const age = Date.now() - Date.parse(readFileSync(LOCK, 'utf8').trim() || '');
      if (Number.isFinite(age) && age < 10 * 60_000) {
        log({ event: 'skip-locked', trigger });
        return;
      }
    } catch { /* fall through and re-acquire */ }
  }
  writeFileSync(LOCK, new Date().toISOString());

  try {
    const result = await runSuite(SUITE);
    log({ event: 'run', trigger, passed: result.passed, score: result.score, pass_to_k: result.pass_to_k, summary: result.summary });

    if (!result.passed) {
      const worst = [...result.cases].sort((a, b) => a.mean_score - b.mean_score)[0];
      await notify(
        `Behavioural regression after editing ${trigger}: ${SUITE} at pass^k ${(result.pass_to_k * 100).toFixed(0)}%, mean ${(result.score * 100).toFixed(0)}% (${result.summary}). Weakest: ${worst?.id ?? 'n/a'}.`,
      );
    }
  } catch (e) {
    log({ event: 'error', trigger, error: (e as Error)?.message ?? String(e) });
  } finally {
    try { rmSync(LOCK, { force: true }); } catch { /* best-effort */ }
  }
}

main();
