#!/usr/bin/env bun
/**
 * PAI Full Verification Test
 *
 * Single prompt, ~$0.10-0.30 per run. Proves PAI is operational by
 * checking that PAI artifact markers appear in Claude's output.
 *
 * Uses a threshold-based pass condition (minimum N markers detected)
 * because model depth selection is stochastic — Sonnet may use Minimal
 * or Full format depending on how it classifies the prompt.
 *
 * Prerequisites:
 *   - CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY
 *   - PAI installed at ~/.claude/ (via ci-setup-pai.ts)
 *   - Claude CLI in PATH
 */

import { spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Configuration ───────────────────────────────────────────────────────────

const MODEL = process.env.PAI_TEST_MODEL || 'claude-sonnet-4-6';
const MAX_TURNS = parseInt(process.env.PAI_TEST_MAX_TURNS || '3', 10);
const PAI_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(PAI_DIR, 'settings.json');

// The prompt: thinking-only task (no tool use) that triggers PAI Algorithm format.
// Must NOT request file reads/tool use, or Claude burns turns on tools with no text output.
const PROMPT = 'Using the full PAI Algorithm format with all phase headers, explain why 1+1=2 from first principles. Include your identity and voice line. Do not use any tools.';

// Minimum number of markers that must pass for CI to succeed.
// Even Minimal format typically hits 3-4 markers (header, voice, identity, TASK).
// Zero markers = PAI definitely not loaded. 1-2 = marginal. 3+ = PAI active.
const MIN_PASS_COUNT = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Marker {
  name: string;
  pattern: RegExp;
}

interface ClaudeJsonOutput {
  result: string;
  session_id: string;
  cost_usd: number;
  num_turns: number;
  is_error: boolean;
}

// ─── PAI Artifact Markers ────────────────────────────────────────────────────

function buildMarkers(identity: { user: string; ai: string }): Marker[] {
  return [
    // Algorithm header — broadened to catch Minimal format too
    { name: 'Algorithm header', pattern: /♻|PAI ALGORITHM|🤖 PAI/i },

    // All 7 phases (Full format only)
    { name: 'Phase 1: OBSERVE', pattern: /OBSERVE.*1\/7|━.*OBSERVE/i },
    { name: 'Phase 2: THINK', pattern: /THINK.*2\/7|━.*THINK/i },
    { name: 'Phase 3: PLAN', pattern: /PLAN.*3\/7|━.*PLAN/i },
    { name: 'Phase 4: BUILD', pattern: /BUILD.*4\/7|━.*BUILD/i },
    { name: 'Phase 5: EXECUTE', pattern: /EXECUTE.*5\/7|━.*EXECUTE/i },
    { name: 'Phase 6: VERIFY', pattern: /VERIFY.*6\/7|━.*VERIFY/i },
    { name: 'Phase 7: LEARN', pattern: /LEARN.*7\/7|━.*LEARN/i },

    // Identity
    { name: `User identity ("${identity.user}")`, pattern: new RegExp(identity.user, 'i') },
    { name: `AI identity ("${identity.ai}")`, pattern: new RegExp(identity.ai, 'i') },

    // Voice line
    { name: `Voice line (🗣️)`, pattern: /🗣️/ },

    // ISC / Ideal State Criteria / TASK line
    { name: 'ISC or TASK', pattern: /ISC|Ideal State|TASK:/i },

    // Capability audit
    { name: 'Capability audit', pattern: /CAPABILIT|skill/i },

    // Reverse engineering (OBSERVE content)
    { name: 'Reverse engineering', pattern: /explicitly said|implied|REVERSE ENGINEER/i },

    // Effort level
    { name: 'Effort level', pattern: /EFFORT LEVEL|Instant|Fast|Standard|Extended/i },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readIdentity(): { user: string; ai: string } {
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

function runClaude(prompt: string): ClaudeJsonOutput | null {
  // Build full command string with quoted prompt — using args array with shell:true
  // causes the shell to split the prompt on spaces (e.g. "-p Use first..." → "-p Use")
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  const command = `claude -p "${escapedPrompt}" --model ${MODEL} --max-turns ${MAX_TURNS} --output-format json`;

  console.log(`  $ ${command.slice(0, 100)}...`);

  const result = spawnSync(command, {
    encoding: 'utf-8',
    timeout: 300_000, // 5 min
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  if (result.error) {
    console.error(`  Spawn error: ${result.error.message}`);
    return null;
  }

  const stdout = result.stdout || '';
  try {
    return JSON.parse(stdout);
  } catch { /* fall through */ }

  // Multi-line JSON — take last valid
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try { return JSON.parse(lines[i]); } catch { /* next */ }
  }

  console.error(`  Could not parse JSON (${stdout.length} chars)`);
  if (result.stderr) console.error(`  stderr: ${result.stderr.slice(0, 300)}`);
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PAI Full Verification Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Platform:  ${process.platform} (${process.arch})`);
  console.log(`  Model:     ${MODEL}`);
  console.log(`  Max turns: ${MAX_TURNS}`);
  console.log(`  PAI_DIR:   ${PAI_DIR}`);
  console.log();

  // ── Prerequisites ──────────────────────────────────────────────────

  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('ERROR: Neither ANTHROPIC_API_KEY nor CLAUDE_CODE_OAUTH_TOKEN is set');
    process.exit(1);
  }
  const authMethod = process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'OAuth' : 'API Key';
  console.log(`  Auth:      ${authMethod}`);

  if (!existsSync(SETTINGS_PATH)) {
    console.error(`ERROR: PAI not installed — ${SETTINGS_PATH} missing`);
    process.exit(1);
  }

  const identity = readIdentity();
  if (!identity.user || !identity.ai) {
    console.error('ERROR: Could not read identity from settings.json');
    process.exit(1);
  }
  console.log(`  User:      "${identity.user}"`);
  console.log(`  AI:        "${identity.ai}"`);
  console.log();

  // ── Run Claude ─────────────────────────────────────────────────────

  console.log('── Running PAI verification prompt ──');
  const result = runClaude(PROMPT);

  if (!result) {
    console.error('FATAL: Claude produced no output');
    process.exit(1);
  }

  if (result.is_error) {
    console.error(`FATAL: Claude returned error: ${result.result?.slice(0, 200)}`);
    process.exit(1);
  }

  console.log(`  Session:   ${result.session_id}`);
  console.log(`  Turns:     ${result.num_turns}`);
  console.log(`  Cost:      $${(result.cost_usd || 0).toFixed(4)}`);
  console.log(`  Output:    ${(result.result || '').length} chars`);
  console.log();

  // ── Check Markers ──────────────────────────────────────────────────

  console.log('── PAI Artifact Verification ──');
  const markers = buildMarkers(identity);
  const text = result.result || '';

  let passes = 0;
  let misses = 0;

  for (const marker of markers) {
    const found = marker.pattern.test(text);
    if (found) passes++;
    else misses++;
    console.log(`  [${found ? 'PASS' : 'MISS'}] ${marker.name}`);
  }

  // ── Summary ────────────────────────────────────────────────────────

  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Markers:    ${passes}/${markers.length} detected`);
  console.log(`  Threshold:  ${MIN_PASS_COUNT} minimum`);
  console.log(`  Cost:       $${(result.cost_usd || 0).toFixed(4)}`);
  console.log('═══════════════════════════════════════════════════════');

  if (passes < MIN_PASS_COUNT) {
    console.error(`\n  PAI VERIFICATION FAILED — only ${passes} markers (need ${MIN_PASS_COUNT}+)`);
    console.error('\n  ── Output excerpt (first 2000 chars) ──');
    console.error(text.slice(0, 2000));
    process.exit(1);
  }

  console.log(`\n  PAI VERIFICATION PASSED (${passes}/${markers.length} markers)`);
}

main();
