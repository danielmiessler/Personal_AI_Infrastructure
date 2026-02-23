#!/usr/bin/env bun
/**
 * PAI Full Verification Test
 *
 * Single prompt, ~$0.10-0.50 per run. Proves PAI is operational by
 * checking that PAI artifact markers appear in Claude's output.
 *
 * Uses a generic prompt (no PAI-specific callouts) so passing proves
 * PAI context files genuinely loaded and influenced behavior.
 *
 * Uses --output-format stream-json to capture ALL assistant text
 * including text written between tool calls. PAI's mandatory tool calls
 * (voice curls, TaskCreate) mean the Algorithm header and phase text
 * appear as intermediate text blocks, not in the final response.
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
const MAX_TURNS = parseInt(process.env.PAI_TEST_MAX_TURNS || '8', 10);
const PAI_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(PAI_DIR, 'settings.json');

// Generic prompt with no PAI-specific callouts.
// If PAI is loaded, its context files force Algorithm format automatically.
const PROMPT = 'What are the three most important principles of good software architecture and why? Be thorough but concise.';

// Minimum number of markers that must pass for CI to succeed.
// PAI-loaded responses typically hit 5-15 markers. 3 is the floor.
const MIN_PASS_COUNT = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Marker {
  name: string;
  pattern: RegExp;
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

interface RunResult {
  text: string;
  sessionId: string;
  cost: number;
  numTurns: number;
}

function runClaude(prompt: string): RunResult {
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  const command = `claude -p "${escapedPrompt}" --model ${MODEL} --max-turns ${MAX_TURNS} --output-format stream-json --verbose`;

  console.log(`  $ claude -p "${prompt.slice(0, 60)}..." --max-turns ${MAX_TURNS} --model ${MODEL}`);

  const result = spawnSync(command, {
    encoding: 'utf-8',
    timeout: 300_000, // 5 min
    env: process.env,
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
  });

  if (result.error) {
    console.error(`  Spawn error: ${result.error.message}`);
    return { text: '', sessionId: '', cost: 0, numTurns: 0 };
  }

  const stdout = result.stdout || '';

  // Parse NDJSON stream — extract ALL text from assistant messages.
  // stream-json outputs one JSON object per line. We look for text in:
  // - assistant messages with content blocks
  // - content_block_delta events (streaming text)
  // - the final result object
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
      // Not valid JSON — include raw text if substantial
      if (line.trim().length > 10) {
        textParts.push(line);
      }
    }
  }

  // Also include stderr in case text appears there
  if (result.stderr) {
    textParts.push(result.stderr);
  }

  return {
    text: textParts.join('\n'),
    sessionId,
    cost,
    numTurns,
  };
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
  const { text, sessionId, cost, numTurns } = runClaude(PROMPT);

  console.log(`  Session:   ${sessionId || '(not reported)'}`);
  console.log(`  Turns:     ${numTurns}`);
  console.log(`  Cost:      $${cost.toFixed(4)}`);
  console.log(`  Output:    ${text.length} chars`);
  console.log();

  if (text.length === 0) {
    console.error('FATAL: Claude produced no output (stream-json returned no text)');
    process.exit(1);
  }

  // ── Check Markers ──────────────────────────────────────────────────

  console.log('── PAI Artifact Verification ──');
  const markers = buildMarkers(identity);

  let passes = 0;

  for (const marker of markers) {
    const found = marker.pattern.test(text);
    if (found) passes++;
    console.log(`  [${found ? 'PASS' : 'MISS'}] ${marker.name}`);
  }

  // ── Summary ────────────────────────────────────────────────────────

  console.log();
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Markers:    ${passes}/${markers.length} detected`);
  console.log(`  Threshold:  ${MIN_PASS_COUNT} minimum`);
  console.log(`  Cost:       $${cost.toFixed(4)}`);
  console.log('═══════════════════════════════════════════════════════');

  if (passes < MIN_PASS_COUNT) {
    console.error(`\n  PAI VERIFICATION FAILED — only ${passes} markers (need ${MIN_PASS_COUNT}+)`);
    console.error('\n  ── Output excerpt (first 3000 chars) ──');
    console.error(text.slice(0, 3000));
    process.exit(1);
  }

  console.log(`\n  PAI VERIFICATION PASSED (${passes}/${markers.length} markers)`);
}

main();
