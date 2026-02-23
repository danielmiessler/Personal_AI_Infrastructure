#!/usr/bin/env bun
/**
 * PAI Compaction Stress Test
 *
 * Verifies PAI identity survives context compaction across all platforms.
 * Runs multi-turn sessions that fill the context window, forcing compaction,
 * then checks that identity (user name, AI name) persists.
 *
 * Prerequisites:
 *   - ANTHROPIC_API_KEY environment variable
 *   - PAI installed at ~/.claude/ (via ci-setup-pai.ts)
 *   - Claude CLI in PATH (npm install -g @anthropic-ai/claude-code)
 *
 * Environment variables:
 *   STRESS_TEST_MODEL   — Model to use (default: claude-sonnet-4-6)
 *   STRESS_FILL_PHASES  — Number of context-fill phases (default: 3)
 *   STRESS_FILL_TURNS   — Max turns per fill phase (default: 4)
 *
 * Cost: ~$2-5 per run depending on model and phases
 */

import { spawnSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Configuration ───────────────────────────────────────────────────────────

const MODEL = process.env.STRESS_TEST_MODEL || 'claude-sonnet-4-6';
const PAI_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(PAI_DIR, 'settings.json');
const FILL_PHASES = parseInt(process.env.STRESS_FILL_PHASES || '3', 10);
const FILL_TURNS = parseInt(process.env.STRESS_FILL_TURNS || '4', 10);

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClaudeJsonOutput {
  type?: string;
  subtype?: string;
  result: string;
  session_id: string;
  cost_usd: number;
  num_turns: number;
  is_error: boolean;
  duration_ms?: number;
  total_cost?: number;
}

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
  cost: number;
  /** If true, failure = CI exit 1. If false, failure = warning only. */
  critical: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function runClaude(
  prompt: string,
  opts: { maxTurns?: number; resume?: string } = {},
): ClaudeJsonOutput | null {
  const args = ['-p', prompt, '--model', MODEL, '--output-format', 'json'];
  if (opts.maxTurns) args.push('--max-turns', String(opts.maxTurns));
  if (opts.resume) args.push('--resume', opts.resume);

  const display = prompt.length > 100 ? prompt.slice(0, 97) + '...' : prompt;
  console.log(`  $ claude -p "${display}" --max-turns ${opts.maxTurns || 'default'}`);

  const result = spawnSync('claude', args, {
    encoding: 'utf-8',
    timeout: 600_000, // 10 min per phase
    env: process.env,
    maxBuffer: 100 * 1024 * 1024,
    shell: true, // Required on Windows to resolve claude.cmd from npm global install
  });

  if (result.error) {
    console.error(`  Spawn error: ${result.error.message}`);
    return null;
  }

  const stdout = result.stdout || '';
  // Try parsing the whole stdout as JSON
  try {
    return JSON.parse(stdout);
  } catch { /* fall through */ }

  // Sometimes multiple JSON lines — take the last valid one
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch { /* next */ }
  }

  console.error(`  Could not parse JSON (${stdout.length} chars)`);
  if (result.stderr) console.error(`  stderr: ${result.stderr.slice(0, 300)}`);
  return null;
}

function checkSettingsIntegrity(): { clean: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!existsSync(SETTINGS_PATH)) {
    return { clean: false, issues: ['settings.json not found'] };
  }

  const content = readFileSync(SETTINGS_PATH, 'utf-8');

  // Check for ${PAI_DIR} corruption (the known Windows failure mode)
  if (content.includes('${PAI_DIR}')) {
    issues.push('Contains literal ${PAI_DIR} — hook path corruption');
  }

  try {
    const parsed = JSON.parse(content);
    if (!parsed.hooks) issues.push('Missing hooks section');
    if (!parsed.env) issues.push('Missing env section');
    if (!parsed.principal?.name) issues.push('Missing principal.name');
    if (!parsed.daidentity?.name) issues.push('Missing daidentity.name');
  } catch (e: any) {
    issues.push(`Invalid JSON: ${e.message}`);
  }

  return { clean: issues.length === 0, issues };
}

function readExpectedIdentity(): { user: string; ai: string } {
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
    return {
      user: (settings.principal?.name || '').toLowerCase(),
      ai: (settings.daidentity?.name || '').toLowerCase(),
    };
  } catch {
    return { user: '', ai: '' };
  }
}

/**
 * Read PAI source files and embed them in a prompt.
 * Each phase reads different files to create diverse context.
 */
function buildContextPrompt(phaseIndex: number): string {
  let content = '';
  const MAX_FILE_SIZE = 50_000; // Skip files > 50KB

  function readDir(dir: string, prefix: string): void {
    if (!existsSync(dir)) return;
    try {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.ts') && !f.endsWith('.md')) continue;
        if (f.endsWith('.test.ts')) continue;
        const fullPath = join(dir, f);
        try {
          const text = readFileSync(fullPath, 'utf-8');
          if (text.length > MAX_FILE_SIZE) continue;
          content += `\n\n=== ${prefix}${f} ===\n${text}`;
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  switch (phaseIndex % 3) {
    case 0:
      readDir(join(PAI_DIR, 'hooks'), 'hooks/');
      return `Analyze these PAI hook files. For each hook, explain what event it handles, what it does, and its key dependencies. Be thorough.\n\n${content}`;
    case 1:
      readDir(join(PAI_DIR, 'hooks', 'lib'), 'hooks/lib/');
      readDir(join(PAI_DIR, 'hooks', 'handlers'), 'hooks/handlers/');
      return `Analyze these PAI hook library modules and handlers. For each, explain all exports, their purpose, and how they connect. Be detailed.\n\n${content}`;
    case 2:
    default:
      readDir(join(PAI_DIR, 'lib'), 'lib/');
      return `Analyze these PAI platform abstraction files. Explain the cross-platform patterns, how Windows support works, and all key functions. Be comprehensive.\n\n${content}`;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PAI Compaction Stress Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Platform:    ${process.platform} (${process.arch})`);
  console.log(`  Model:       ${MODEL}`);
  console.log(`  PAI_DIR:     ${PAI_DIR}`);
  console.log(`  Fill phases: ${FILL_PHASES}`);
  console.log(`  Turns/phase: ${FILL_TURNS}`);
  console.log();

  // ── Prerequisites ──────────────────────────────────────────────────

  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('ERROR: Neither ANTHROPIC_API_KEY nor CLAUDE_CODE_OAUTH_TOKEN is set');
    process.exit(1);
  }
  const authMethod = process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'OAuth' : 'API Key';
  console.log(`  Auth:        ${authMethod}`);

  if (!existsSync(SETTINGS_PATH)) {
    console.error(`ERROR: PAI not installed — ${SETTINGS_PATH} missing`);
    process.exit(1);
  }

  const identity = readExpectedIdentity();
  if (!identity.user || !identity.ai) {
    console.error('ERROR: Could not read identity from settings.json');
    process.exit(1);
  }
  console.log(`  Expected user: "${identity.user}"`);
  console.log(`  Expected AI:   "${identity.ai}"`);
  console.log();

  const results: CheckResult[] = [];
  let totalCost = 0;

  // ── Pre-Test: Settings Integrity ───────────────────────────────────

  console.log('── Pre-Test: Settings Integrity ──');
  const preCheck = checkSettingsIntegrity();
  console.log(`  Clean: ${preCheck.clean}`);
  if (!preCheck.clean) {
    console.error(`  Issues: ${preCheck.issues.join(', ')}`);
    console.error('FATAL: Cannot start with corrupted settings');
    process.exit(1);
  }

  // ── Phase 1: Initial PAI Load ──────────────────────────────────────

  console.log('\n── Phase 1: Initial PAI Load ──');
  const p1 = runClaude(
    'Hello! Please tell me: what is your name, and what is my name? Be brief.',
    { maxTurns: 2 },
  );

  if (!p1) {
    console.error('FATAL: Phase 1 produced no output');
    process.exit(1);
  }

  const sessionId = p1.session_id;
  totalCost += p1.cost_usd || 0;
  console.log(`  Session: ${sessionId}`);
  console.log(`  Cost:    $${(p1.cost_usd || 0).toFixed(2)}`);

  const p1Text = (p1.result || '').toLowerCase();
  const p1HasAlgo = /♻|pai algorithm|algorithm.*═/i.test(p1.result || '');
  const p1HasUser = p1Text.includes(identity.user);
  const p1HasAI = p1Text.includes(identity.ai);

  results.push({
    name: 'Initial: Algorithm format',
    passed: p1HasAlgo,
    details: p1HasAlgo ? 'Present' : 'Not detected (may need more turns)',
    cost: p1.cost_usd || 0,
    critical: false, // May not appear with 2-turn limit
  });
  results.push({
    name: 'Initial: User identity',
    passed: p1HasUser,
    details: p1HasUser ? `"${identity.user}" found` : `"${identity.user}" NOT found`,
    cost: 0,
    critical: true,
  });
  results.push({
    name: 'Initial: AI identity',
    passed: p1HasAI,
    details: p1HasAI ? `"${identity.ai}" found` : `"${identity.ai}" NOT found`,
    cost: 0,
    critical: true,
  });

  console.log(`  Algorithm: ${p1HasAlgo ? 'PASS' : 'WARN'}`);
  console.log(`  User:      ${p1HasUser ? 'PASS' : 'FAIL'}`);
  console.log(`  AI:        ${p1HasAI ? 'PASS' : 'FAIL'}`);

  // ── Phases 2-N: Context Filling ────────────────────────────────────

  for (let i = 0; i < FILL_PHASES; i++) {
    const phaseNum = i + 2;
    console.log(`\n── Phase ${phaseNum}: Context Fill ${i + 1}/${FILL_PHASES} ──`);

    const prompt = buildContextPrompt(i);
    const promptTokens = Math.round(prompt.length / 4);
    console.log(`  Prompt: ${prompt.length} chars (~${promptTokens} tokens)`);

    const pResult = runClaude(prompt, {
      maxTurns: FILL_TURNS,
      resume: sessionId,
    });

    if (pResult) {
      totalCost += pResult.cost_usd || 0;
      console.log(`  Turns:  ${pResult.num_turns}`);
      console.log(`  Cost:   $${(pResult.cost_usd || 0).toFixed(2)}`);
      console.log(`  Output: ${(pResult.result || '').length} chars`);
      results.push({
        name: `Context fill ${i + 1}`,
        passed: true,
        details: `${pResult.num_turns} turns, $${(pResult.cost_usd || 0).toFixed(2)}`,
        cost: pResult.cost_usd || 0,
        critical: false,
      });
    } else {
      console.log('  No output (session may have hit limits)');
      results.push({
        name: `Context fill ${i + 1}`,
        passed: true, // Fill failure is not a test failure
        details: 'No output — session may have hit limits',
        cost: 0,
        critical: false,
      });
    }
  }

  // ── Final Phase: Post-Compaction Identity ──────────────────────────

  const finalPhaseNum = FILL_PHASES + 2;
  console.log(`\n── Phase ${finalPhaseNum}: Post-Compaction Identity ──`);

  const pFinal = runClaude(
    'Quick check: What is your name, and what is my name? Just the names please.',
    { maxTurns: 3, resume: sessionId },
  );

  if (!pFinal) {
    console.error('WARN: Final phase produced no output');
    results.push({
      name: 'Post-compaction: Response',
      passed: false,
      details: 'No output from Claude',
      cost: 0,
      critical: true,
    });
  } else {
    totalCost += pFinal.cost_usd || 0;
    const fText = (pFinal.result || '').toLowerCase();
    const fHasUser = fText.includes(identity.user);
    const fHasAI = fText.includes(identity.ai);
    const fHasAlgo = /♻|pai algorithm|algorithm.*═/i.test(pFinal.result || '');

    results.push({
      name: 'Post-compaction: User identity',
      passed: fHasUser,
      details: fHasUser ? `"${identity.user}" survived` : `"${identity.user}" LOST`,
      cost: pFinal.cost_usd || 0,
      critical: true,
    });
    results.push({
      name: 'Post-compaction: AI identity',
      passed: fHasAI,
      details: fHasAI ? `"${identity.ai}" survived` : `"${identity.ai}" LOST`,
      cost: 0,
      critical: true,
    });
    results.push({
      name: 'Post-compaction: Algorithm format',
      passed: fHasAlgo,
      details: fHasAlgo ? 'Survived compaction' : 'Lost after compaction (known issue)',
      cost: 0,
      critical: false, // Known cross-platform issue — don't fail CI
    });

    console.log(`  User:      ${fHasUser ? 'PASS' : 'FAIL'}`);
    console.log(`  AI:        ${fHasAI ? 'PASS' : 'FAIL'}`);
    console.log(`  Algorithm: ${fHasAlgo ? 'PASS' : 'INFO (known issue)'}`);
  }

  // ── Post-Test: Settings Integrity ──────────────────────────────────

  console.log('\n── Post-Test: Settings Integrity ──');
  const postCheck = checkSettingsIntegrity();
  results.push({
    name: 'Post-test: Settings integrity',
    passed: postCheck.clean,
    details: postCheck.clean ? 'settings.json unchanged and valid' : postCheck.issues.join(', '),
    cost: 0,
    critical: true,
  });
  console.log(`  Clean: ${postCheck.clean}`);
  if (!postCheck.clean) console.log(`  Issues: ${postCheck.issues.join(', ')}`);

  // ── Summary ────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Total cost: $${totalCost.toFixed(2)}`);
  console.log();

  let criticalFails = 0;
  let warnings = 0;

  for (const r of results) {
    const icon = r.passed ? 'PASS' : r.critical ? 'FAIL' : 'WARN';
    console.log(`  [${icon}] ${r.name}: ${r.details}`);
    if (!r.passed) {
      if (r.critical) criticalFails++;
      else warnings++;
    }
  }

  console.log();
  console.log(`  Critical failures: ${criticalFails}`);
  console.log(`  Warnings:          ${warnings}`);
  console.log(`  Total cost:        $${totalCost.toFixed(2)}`);
  console.log('═══════════════════════════════════════════════════════');

  if (criticalFails > 0) {
    console.error('\n  STRESS TEST FAILED');
    process.exit(1);
  }

  console.log('\n  STRESS TEST PASSED');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
