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

import { mkdirSync, writeFileSync, rmSync, readFileSync, appendFileSync } from 'node:fs';
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
// Default is the generic core-dispositions suite that ships with the skill —
// a fresh install fires a suite that actually exists (Forge 7.10.2 audit).
//
// Was 'core-behaviors' until public issue #1752, @ozdreamwalk: that suite is a
// legacy v1 `tasks:` file EvalRunner cannot execute, so this path errored on
// every single config change and no config edit was ever actually verified.
// core-behaviors stays in the tree as SKILL.md's anti-pattern example.
function resolveSuite(): string {
  try {
    const cfgPath = join(CLAUDE_ROOT, 'LIFEOS', 'USER', 'CUSTOMIZATIONS', 'SKILLS', 'Evals', 'config.json');
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
    if (typeof cfg.config_change_suite === 'string' && cfg.config_change_suite.length > 0) return cfg.config_change_suite;
  } catch { /* no user config — generic default */ }
  return 'core-dispositions';
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
      // voice_enabled must be explicit: /notify defaults voice ON, and background/cadence jobs never voice ({{PRINCIPAL_NAME}}, 2026-08-14)
      body: JSON.stringify({ message, voice_enabled: false }),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* Pulse may be down; the latest.json + log still record the result */ }
}

async function main(): Promise<void> {
  const trigger = process.argv[2] ?? 'unknown';

  mkdirSync(RESULTS_DIR, { recursive: true });
  // Single-flight: stale lock older than 10 min is reclaimed. The 'wx' flag is
  // load-bearing — an existsSync-then-write let two sentinel files edited in the
  // same instant both pass the check, both run the suite, and both notify.
  // ported from public PR #1737, @elhoim
  try {
    writeFileSync(LOCK, new Date().toISOString(), { flag: 'wx' });
  } catch {
    let stale = true;
    try {
      const age = Date.now() - Date.parse(readFileSync(LOCK, 'utf8').trim() || '');
      stale = !Number.isFinite(age) || age >= 10 * 60_000;
    } catch { /* unreadable lock — treat as stale and reclaim */ }
    if (!stale) {
      log({ event: 'skip-locked', trigger });
      return;
    }
    rmSync(LOCK, { force: true });
    try {
      writeFileSync(LOCK, new Date().toISOString(), { flag: 'wx' });
    } catch {
      // Another run reclaimed the stale lock first; it owns this fire.
      log({ event: 'skip-locked', trigger });
      return;
    }
  }

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
    // Notify, don't just log. A suite that cannot RUN is the same operational
    // fact as a suite that fails: the config change went unverified. Logging to
    // a JSONL nobody tails makes a permanently-broken suite look exactly like a
    // clean pass on every config edit. ported from public PR #1737, @elhoim
    const msg = (e as Error)?.message ?? String(e);
    log({ event: 'error', trigger, error: msg });
    await notify(`Behavioural eval could not run after editing ${trigger}: ${SUITE} errored (${msg}). The change is unverified.`);
  } finally {
    try { rmSync(LOCK, { force: true }); } catch { /* best-effort */ }
  }
}

main();
