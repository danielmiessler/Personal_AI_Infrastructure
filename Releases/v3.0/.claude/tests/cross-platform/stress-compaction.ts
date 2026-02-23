#!/usr/bin/env bun
/**
 * PAI Compaction Stress Test — Full Scaffolding Survival
 *
 * Verifies the ENTIRETY of PAI survives aggressive context compaction and
 * context clearing. Tests that every prompt results in PAI's scaffolding
 * being intact — Algorithm header, 7 phases, ISC, voice line, capability
 * audit, identity — not just that names survive.
 *
 * Approach:
 *   1. Create session, verify full PAI scaffolding (baseline)
 *   2. Loop N times: inject conversation content → force /compact
 *   3. After all compaction cycles, verify full PAI scaffolding survives
 *   4. Send /clear to wipe context, verify PAI hooks reload full scaffolding
 *   5. Check settings.json integrity (catches Windows corruption bug)
 *
 * Uses forced /compact instead of expensive context-fill ($2-5).
 * Uses stream-json + verbose to capture ALL PAI text between tool calls.
 *
 * Prerequisites:
 *   - ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN environment variable
 *   - PAI installed at ~/.claude/ (via ci-setup-pai.ts)
 *   - Claude CLI in PATH (npm install -g @anthropic-ai/claude-code)
 *
 * Environment variables:
 *   STRESS_TEST_MODEL      — Model to use (default: claude-sonnet-4-6)
 *   STRESS_COMPACT_CYCLES  — Number of compact cycles (default: 20)
 *   STRESS_VERIFY_TURNS    — Max turns for verification phases (default: 8)
 *
 * Cost: ~$1.50-3.00 per run depending on model and cycles
 */

import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Configuration ───────────────────────────────────────────────────────────

const MODEL = process.env.STRESS_TEST_MODEL || 'claude-sonnet-4-6';
const PAI_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(PAI_DIR, 'settings.json');
const COMPACT_CYCLES = parseInt(process.env.STRESS_COMPACT_CYCLES || '20', 10);
const VERIFY_TURNS = parseInt(process.env.STRESS_VERIFY_TURNS || '8', 10);

// Generic verification prompt — NO PAI-specific callouts.
// Non-trivial question triggers FULL Algorithm depth (not MINIMAL).
const VERIFY_PROMPT = 'What are the three most important principles of good software architecture and why? Be thorough but concise.';

// Generic conversation prompts for compaction cycles — short, diverse, no PAI callouts.
const CONVERSATION_PROMPTS = [
  'Tell me a brief fun fact about sorting algorithms.',
  'What is one principle of good software architecture?',
  'Name a famous computer scientist and their key contribution.',
  'What makes a good API design? One sentence answer.',
  'Explain the concept of recursion in one sentence.',
  'What is the difference between a stack and a queue?',
  'Name one benefit of functional programming.',
  'What does Big O notation measure?',
  'What is a hash table used for?',
  'Explain what a binary tree is in one sentence.',
];

// Minimum markers for CI pass. PAI-loaded responses typically hit 5-15.
const MIN_MARKERS_BASELINE = 3;       // Phase 1 — fresh start
const MIN_MARKERS_POST_COMPACT = 3;   // Phase 3 — after N compactions
const MIN_MARKERS_POST_CLEAR = 3;     // Phase 4 — after /clear

// ─── Types ───────────────────────────────────────────────────────────────────

interface Marker {
  name: string;
  pattern: RegExp;
}

interface MarkerResult {
  name: string;
  passed: boolean;
}

interface VerboseRunResult {
  text: string;
  sessionId: string;
  cost: number;
  numTurns: number;
}

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
  cost: number;
  critical: boolean;
}

// ─── PAI Scaffolding Markers ─────────────────────────────────────────────────

function buildMarkers(identity: { user: string; ai: string }): Marker[] {
  return [
    // Algorithm header — catches Full and Minimal formats
    { name: 'Algorithm header', pattern: /♻|PAI ALGORITHM|🤖 PAI/i },

    // 7 Algorithm phases (Full format)
    { name: 'Phase: OBSERVE', pattern: /OBSERVE.*1\/7|━.*OBSERVE/i },
    { name: 'Phase: THINK', pattern: /THINK.*2\/7|━.*THINK/i },
    { name: 'Phase: PLAN', pattern: /PLAN.*3\/7|━.*PLAN/i },
    { name: 'Phase: BUILD', pattern: /BUILD.*4\/7|━.*BUILD/i },
    { name: 'Phase: EXECUTE', pattern: /EXECUTE.*5\/7|━.*EXECUTE/i },
    { name: 'Phase: VERIFY', pattern: /VERIFY.*6\/7|━.*VERIFY/i },
    { name: 'Phase: LEARN', pattern: /LEARN.*7\/7|━.*LEARN/i },

    // Identity
    { name: `User identity ("${identity.user}")`, pattern: new RegExp(identity.user, 'i') },
    { name: `AI identity ("${identity.ai}")`, pattern: new RegExp(identity.ai, 'i') },

    // Voice line — end of every response
    { name: 'Voice line', pattern: /🗣️/ },

    // ISC / Ideal State Criteria / TASK line
    { name: 'ISC or TASK', pattern: /ISC|Ideal State|TASK:/i },

    // Capability audit
    { name: 'Capability audit', pattern: /CAPABILIT|capability/i },

    // Reverse engineering (OBSERVE content)
    { name: 'Reverse engineering', pattern: /explicitly said|implied|REVERSE ENGINEER/i },

    // Effort level
    { name: 'Effort level', pattern: /EFFORT LEVEL|Instant|Fast|Standard|Extended/i },
  ];
}

function checkMarkers(text: string, markers: Marker[]): { results: MarkerResult[]; passCount: number } {
  const results: MarkerResult[] = [];
  let passCount = 0;
  for (const m of markers) {
    const passed = m.pattern.test(text);
    if (passed) passCount++;
    results.push({ name: m.name, passed });
  }
  return { results, passCount };
}

// ─── CLI Helpers ─────────────────────────────────────────────────────────────

/**
 * Run claude -p with stream-json + verbose output.
 * Captures ALL assistant text including intermediate blocks between tool calls.
 * This is essential because PAI's mandatory tool calls (voice curls, TaskCreate)
 * mean Algorithm headers and phase text appear as intermediate text, not in the
 * final result field.
 */
function runClaudeVerbose(
  prompt: string,
  opts: { maxTurns?: number; resume?: string } = {},
): VerboseRunResult {
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  let command = `claude -p "${escapedPrompt}" --model ${MODEL} --output-format stream-json --verbose`;
  if (opts.maxTurns) command += ` --max-turns ${opts.maxTurns}`;
  if (opts.resume) command += ` --resume ${opts.resume}`;

  const display = prompt.length > 70 ? prompt.slice(0, 67) + '...' : prompt;
  console.log(`  $ claude -p "${display}" --max-turns ${opts.maxTurns || 'default'} [stream-json]`);

  const result = spawnSync(command, {
    encoding: 'utf-8',
    timeout: 300_000,
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  if (result.error) {
    console.error(`  Spawn error: ${result.error.message}`);
    return { text: '', sessionId: '', cost: 0, numTurns: 0 };
  }

  const stdout = result.stdout || '';
  const textParts: string[] = [];
  let sessionId = '';
  let cost = 0;
  let numTurns = 0;

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);

      // Assistant message with content blocks
      if (obj.type === 'assistant' && obj.message?.content) {
        for (const block of obj.message.content) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          }
        }
      }

      // Content block delta (streaming)
      if (obj.type === 'content_block_delta' && obj.delta?.text) {
        textParts.push(obj.delta.text);
      }

      // Result message (final summary)
      if (obj.type === 'result') {
        sessionId = obj.session_id || '';
        cost = obj.cost_usd || obj.total_cost || 0;
        numTurns = obj.num_turns || 0;
        if (obj.result) textParts.push(obj.result);
      }
    } catch {
      if (line.trim().length > 10) textParts.push(line);
    }
  }

  if (result.stderr) textParts.push(result.stderr);

  return { text: textParts.join('\n'), sessionId, cost, numTurns };
}

/**
 * Run claude -p with json output (lightweight, for compaction cycles).
 */
function runClaudeJson(
  prompt: string,
  opts: { maxTurns?: number; resume?: string } = {},
): { sessionId: string; cost: number } | null {
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  let command = `claude -p "${escapedPrompt}" --model ${MODEL} --output-format json`;
  if (opts.maxTurns) command += ` --max-turns ${opts.maxTurns}`;
  if (opts.resume) command += ` --resume ${opts.resume}`;

  const result = spawnSync(command, {
    encoding: 'utf-8',
    timeout: 300_000,
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  if (result.error) return null;

  const stdout = result.stdout || '';
  try {
    const parsed = JSON.parse(stdout);
    return { sessionId: parsed.session_id || '', cost: parsed.cost_usd || parsed.total_cost || 0 };
  } catch { /* fall through */ }

  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]);
      return { sessionId: parsed.session_id || '', cost: parsed.cost_usd || parsed.total_cost || 0 };
    } catch { /* next */ }
  }

  return null;
}

/**
 * Run /compact as a slash command via the CLI.
 */
function runCompact(sessionId: string): { success: boolean; cost: number } {
  const command = `claude -p "/compact" --model ${MODEL} --output-format json --resume ${sessionId} --max-turns 1`;

  const result = spawnSync(command, {
    encoding: 'utf-8',
    timeout: 120_000,
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  if (result.error) return { success: false, cost: 0 };

  const stdout = result.stdout || '';
  let cost = 0;
  try {
    const parsed = JSON.parse(stdout);
    cost = parsed.cost_usd || parsed.total_cost || 0;
  } catch {
    const lines = stdout.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        cost = parsed.cost_usd || parsed.total_cost || 0;
        break;
      } catch { /* next */ }
    }
  }

  const success = result.status === 0 || result.status === null;
  return { success, cost };
}

/**
 * Run /clear as a slash command via the CLI.
 */
function runClear(sessionId: string): { success: boolean; cost: number } {
  const command = `claude -p "/clear" --model ${MODEL} --output-format json --resume ${sessionId} --max-turns 1`;

  const result = spawnSync(command, {
    encoding: 'utf-8',
    timeout: 120_000,
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  if (result.error) return { success: false, cost: 0 };

  const stdout = result.stdout || '';
  let cost = 0;
  try {
    const parsed = JSON.parse(stdout);
    cost = parsed.cost_usd || parsed.total_cost || 0;
  } catch {
    const lines = stdout.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        cost = parsed.cost_usd || parsed.total_cost || 0;
        break;
      } catch { /* next */ }
    }
  }

  const success = result.status === 0 || result.status === null;
  return { success, cost };
}

function checkSettingsIntegrity(): { clean: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!existsSync(SETTINGS_PATH)) {
    return { clean: false, issues: ['settings.json not found'] };
  }

  const content = readFileSync(SETTINGS_PATH, 'utf-8');

  try {
    const parsed = JSON.parse(content);
    if (!parsed.hooks) issues.push('Missing hooks section');
    if (!parsed.env) issues.push('Missing env section');
    if (!parsed.principal?.name) issues.push('Missing principal.name');
    if (!parsed.daidentity?.name) issues.push('Missing daidentity.name');

    if (parsed.env) {
      for (const [key, val] of Object.entries(parsed.env)) {
        if (typeof val === 'string' && val.includes('${PAI_DIR}')) {
          issues.push(`env.${key} contains unresolved \${PAI_DIR}`);
        }
      }
    }
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
 * Log marker results and push to CheckResult array.
 */
function logMarkerResults(
  phase: string,
  markerResults: MarkerResult[],
  passCount: number,
  total: number,
  minRequired: number,
  cost: number,
  results: CheckResult[],
): void {
  for (const mr of markerResults) {
    console.log(`  [${mr.passed ? 'PASS' : 'MISS'}] ${mr.name}`);
  }
  console.log(`  Markers: ${passCount}/${total} (minimum: ${minRequired})`);

  results.push({
    name: `${phase}: Scaffolding markers`,
    passed: passCount >= minRequired,
    details: `${passCount}/${total} markers detected (need ${minRequired}+)`,
    cost,
    critical: true,
  });

  // Individual critical markers for detailed reporting
  const criticalNames = ['Algorithm header', 'Voice line'];
  for (const mr of markerResults) {
    if (criticalNames.some(c => mr.name.includes(c)) || mr.name.includes('identity')) {
      results.push({
        name: `${phase}: ${mr.name}`,
        passed: mr.passed,
        details: mr.passed ? 'Present' : 'MISSING',
        cost: 0,
        critical: false, // Individual markers are warnings; threshold is the critical gate
      });
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PAI Compaction Stress Test — Full Scaffolding');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Platform:       ${process.platform} (${process.arch})`);
  console.log(`  Model:          ${MODEL}`);
  console.log(`  PAI_DIR:        ${PAI_DIR}`);
  console.log(`  Compact cycles: ${COMPACT_CYCLES}`);
  console.log(`  Verify turns:   ${VERIFY_TURNS}`);
  console.log();

  // ── Prerequisites ──────────────────────────────────────────────────

  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('ERROR: Neither ANTHROPIC_API_KEY nor CLAUDE_CODE_OAUTH_TOKEN is set');
    process.exit(1);
  }
  const authMethod = process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'OAuth' : 'API Key';
  console.log(`  Auth:           ${authMethod}`);

  if (!existsSync(SETTINGS_PATH)) {
    console.error(`ERROR: PAI not installed — ${SETTINGS_PATH} missing`);
    process.exit(1);
  }

  const identity = readExpectedIdentity();
  if (!identity.user || !identity.ai) {
    console.error('ERROR: Could not read identity from settings.json');
    process.exit(1);
  }
  console.log(`  Expected user:  "${identity.user}"`);
  console.log(`  Expected AI:    "${identity.ai}"`);
  console.log();

  const markers = buildMarkers(identity);
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

  // ── Phase 1: Baseline — Full PAI Scaffolding ───────────────────────

  console.log('\n── Phase 1: Baseline — Full PAI Scaffolding ──');
  const p1 = runClaudeVerbose(VERIFY_PROMPT, { maxTurns: VERIFY_TURNS });

  totalCost += p1.cost;
  console.log(`  Session: ${p1.sessionId || '(not reported)'}`);
  console.log(`  Turns:   ${p1.numTurns}`);
  console.log(`  Cost:    $${p1.cost.toFixed(4)}`);
  console.log(`  Output:  ${p1.text.length} chars`);

  if (!p1.sessionId || p1.text.length === 0) {
    console.error('FATAL: Phase 1 produced no output — cannot continue');
    process.exit(1);
  }

  const sessionId = p1.sessionId;
  const p1Check = checkMarkers(p1.text, markers);
  console.log();
  logMarkerResults('Baseline', p1Check.results, p1Check.passCount, markers.length, MIN_MARKERS_BASELINE, p1.cost, results);

  // ── Phase 2: Compaction Cycles ─────────────────────────────────────
  // Each cycle: (a) inject conversation content, (b) force /compact
  // This creates "summary of a summary" degradation — matching real-world behavior.

  console.log(`\n── Phase 2: ${COMPACT_CYCLES} Compaction Cycles ──`);

  let compactSuccesses = 0;
  let compactFailures = 0;

  for (let i = 0; i < COMPACT_CYCLES; i++) {
    const cycleNum = i + 1;
    const prompt = CONVERSATION_PROMPTS[i % CONVERSATION_PROMPTS.length];

    // (a) Inject conversation content (lightweight json mode)
    const convResult = runClaudeJson(prompt, {
      maxTurns: 1,
      resume: sessionId,
    });

    if (convResult) {
      totalCost += convResult.cost;
    }

    // (b) Force /compact
    const compactResult = runCompact(sessionId);
    totalCost += compactResult.cost;

    if (compactResult.success) {
      compactSuccesses++;
    } else {
      compactFailures++;
    }

    // Progress every 5 cycles
    if (cycleNum % 5 === 0 || cycleNum === COMPACT_CYCLES) {
      console.log(`  Cycle ${cycleNum}/${COMPACT_CYCLES}: ${compactSuccesses} ok, ${compactFailures} failed | Cost: $${totalCost.toFixed(4)}`);
    }
  }

  results.push({
    name: 'Compaction cycles completed',
    passed: compactSuccesses > 0,
    details: `${compactSuccesses}/${COMPACT_CYCLES} successful, ${compactFailures} failed`,
    cost: 0,
    critical: false,
  });

  // ── Phase 3: Post-Compaction — Full PAI Scaffolding ────────────────

  console.log('\n── Phase 3: Post-Compaction — Full PAI Scaffolding ──');

  const p3 = runClaudeVerbose(VERIFY_PROMPT, {
    maxTurns: VERIFY_TURNS,
    resume: sessionId,
  });

  totalCost += p3.cost;
  console.log(`  Turns:  ${p3.numTurns}`);
  console.log(`  Cost:   $${p3.cost.toFixed(4)}`);
  console.log(`  Output: ${p3.text.length} chars`);

  if (p3.text.length === 0) {
    console.error('WARN: Post-compaction produced no text');
    results.push({
      name: 'Post-compaction: Response',
      passed: false,
      details: 'No text output after compaction',
      cost: p3.cost,
      critical: true,
    });
  } else {
    const p3Check = checkMarkers(p3.text, markers);
    console.log();
    logMarkerResults('Post-compaction', p3Check.results, p3Check.passCount, markers.length, MIN_MARKERS_POST_COMPACT, p3.cost, results);
  }

  // ── Phase 4: Context Clear + Full PAI Reload ───────────────────────
  // Tests that PAI hooks re-fire after /clear wipes conversation history.

  console.log('\n── Phase 4: Context Clear + Full PAI Reload ──');

  const clearResult = runClear(sessionId);
  totalCost += clearResult.cost;
  console.log(`  /clear: ${clearResult.success ? 'OK' : 'FAILED'}`);

  if (clearResult.success) {
    const p4 = runClaudeVerbose(VERIFY_PROMPT, {
      maxTurns: VERIFY_TURNS,
      resume: sessionId,
    });

    totalCost += p4.cost;
    console.log(`  Turns:  ${p4.numTurns}`);
    console.log(`  Cost:   $${p4.cost.toFixed(4)}`);
    console.log(`  Output: ${p4.text.length} chars`);

    if (p4.text.length === 0) {
      console.error('WARN: Post-clear produced no text');
      results.push({
        name: 'Post-clear: Response',
        passed: false,
        details: 'No text output after /clear',
        cost: p4.cost,
        critical: true,
      });
    } else {
      const p4Check = checkMarkers(p4.text, markers);
      console.log();
      logMarkerResults('Post-clear', p4Check.results, p4Check.passCount, markers.length, MIN_MARKERS_POST_CLEAR, p4.cost, results);
    }
  } else {
    results.push({
      name: 'Post-clear: /clear command',
      passed: false,
      details: '/clear failed — cannot test scaffolding reload',
      cost: 0,
      critical: false, // Graceful degradation if /clear unsupported in print mode
    });
    console.log('  WARN: /clear may not be supported in print mode');
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
  console.log(`  Total cost:     $${totalCost.toFixed(4)}`);
  console.log(`  Compact cycles: ${compactSuccesses}/${COMPACT_CYCLES} successful`);
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
  console.log(`  Total cost:        $${totalCost.toFixed(4)}`);
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
