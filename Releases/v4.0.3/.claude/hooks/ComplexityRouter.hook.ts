#!/usr/bin/env bun
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * ComplexityRouter.hook.ts - Auto Model Routing (Haiku ↔ Sonnet ↔ Opus)
 *
 * PURPOSE:
 * Classifies prompt complexity and injects routing hints for optimal model selection.
 * Fires BEFORE Claude processes the prompt — gives routing guidance based on
 * heuristic signal detection only (no LLM inference, <5ms).
 *
 * TRIGGER: UserPromptSubmit
 *
 * TIERS:
 * - HAIKU:  Simple tasks (greetings, acks, short prompts, trivial fixes) — cheapest
 * - SONNET: Standard tasks (default) — balanced — SILENT (no output)
 * - OPUS:   Complex tasks (architecture, design, comprehensive plans, ≥2 signals) — highest quality
 *
 * OUTPUT:
 * - HAIKU tier:  <system-reminder> routing hint to spawn Task(model="haiku")
 * - SONNET tier: silent (no stdout) — Sonnet handles it directly
 * - OPUS tier:   <system-reminder> routing hint with matched signals list
 * - stderr: [ComplexityRouter] debug logs always
 *
 * PERFORMANCE:
 * - Pure heuristic: <5ms (no network, no inference, no imports from lib/)
 * - Always exits 0 — never blocks prompt processing
 *
 * ACCURACY (v1.1):
 * - Negation suppression: "not a comprehensive refactor" → SONNET (not OPUS)
 * - Simplicity prefix suppression: "quick architecture refactor" → SONNET (not OPUS)
 * - Structural anchor: long prompts only elevate to OPUS if domain signals also present
 */

// ── Input Interface ──

interface HookInput {
  session_id: string;
  prompt?: string;
  user_prompt?: string;
}

// ── Haiku Patterns (any 1 match = HAIKU tier) ──

const HAIKU_GREETINGS = /^(hi|hello|hey|sup|yo|howdy|greetings|salut|bonjour|hola)\b/i;
const HAIKU_ACKS = /^(yes|no|ok|okay|sure|thanks|thank you|continue|done|got it|noted|understood|ack|cool|great|perfect|good|nice|yep|nope|yup)\b\.?$/i;
const HAIKU_RATING = /^(10|[1-9])(\s*[-:\/]?\s*.*)?$/;
const HAIKU_SIMPLE_FIX = /^(fix|add|remove|delete|rename|update|change|move|swap)\s+(a\s+|the\s+)?\w+\.?\w*\s*$/i;

function isHaikuTier(prompt: string): boolean {
  const trimmed = prompt.trim();

  // Single-word prompt
  if (/^\w+$/.test(trimmed)) return true;

  // Very short prompt (< 40 chars)
  if (trimmed.length < 40) {
    // But not if it has complexity signals
    const hasComplexity = /\b(architect|design|comprehensive|refactor|migrate|infrastructure|PRD|strategy|roadmap|framework|platform|ecosystem|orchestrat|integrat|negotiate|salary|career|prioritize|clarity|guidance|advice|decision|tradeoff|balance|should)\b/i.test(trimmed);
    if (!hasComplexity) return true;
  }

  // Pure greeting
  if (HAIKU_GREETINGS.test(trimmed)) return true;

  // Pure acknowledgment
  if (HAIKU_ACKS.test(trimmed)) return true;

  // Pure rating (number only or number with brief comment, no sentence starters)
  if (HAIKU_RATING.test(trimmed)) {
    const ratingMatch = trimmed.match(/^(10|[1-9])(\s*[-:\/]?\s*(.*))?$/);
    if (ratingMatch) {
      const rest = ratingMatch[3]?.trim() || '';
      const notACount = !/^(items?|things?|steps?|files?|lines?|bugs?|issues?|times?|minutes?|hours?|th\b|st\b|nd\b|rd\b|of\b)/i.test(rest);
      if (notACount) return true;
    }
  }

  // Simple fix pattern: "fix typo", "add semicolon", "rename variable"
  if (HAIKU_SIMPLE_FIX.test(trimmed)) return true;

  return false;
}

// ── Opus Signal Detection (need ≥2 matches = OPUS tier) ──

const OPUS_SIGNAL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  // Architecture/Design
  { name: 'architecture', pattern: /\b(architect|design|redesign|blueprint|schema|system design|systems design)\b/i },
  // Scale keywords
  { name: 'scale/comprehensive', pattern: /\b(comprehensive|complex|sophisticated|exhaustive)\b/i },
  // Refactor/Migration
  { name: 'refactor/migration', pattern: /\b(refactor|migrate|migration|overhaul|restructure|rewrite|rearchitect)\b/i },
  // Infrastructure
  { name: 'infrastructure', pattern: /\b(infrastructure|platform|framework|ecosystem|pipeline)\b/i },
  // Planning artifacts
  { name: 'planning/strategy', pattern: /\b(PRD|roadmap|strategy|implementation plan|specification|requirements|milestones?)\b/i },
  // High-complexity skills
  { name: 'complex-skill', pattern: /\b(council|red.?team|first.?principles?|be creative|world.?threat|swarm|agent.?team)\b/i },
  // Multi-system coordination
  { name: 'multi-system', pattern: /\b(integrat|orchestrat|coordinat|multiple systems?|end.?to.?end|full.?stack)\b/i },
  // Length signal: >400 chars (checked separately)
  // Sentence count signal: 4+ sentences (checked separately)
  // Question count: 2+ questions (checked separately)
];

// ── Signal Suppression Helpers (v1.1) ──

function isNegated(text: string, matchIndex: number): boolean {
  const before = text.slice(Math.max(0, matchIndex - 35), matchIndex);
  return /\b(not|no|don'?t|doesn'?t|without|never)\s+(\w+\s+){0,3}$/i.test(before);
}

const SIMPLICITY_PREFIX = /\b(quick|quickly|simple|simply|just|brief|briefly|minor|small|basic|easy|trivial|little)\s+(\w+\s+)?$/i;

function hasSimplicityPrefix(text: string, matchIndex: number): boolean {
  const before = text.slice(Math.max(0, matchIndex - 40), matchIndex);
  return SIMPLICITY_PREFIX.test(before);
}

// ── Opus Signal Analysis ──

interface OpusAnalysis {
  signalCount: number;
  matchedSignals: string[];
}

function analyzeOpusSignals(prompt: string): OpusAnalysis {
  const domainSignals: string[] = [];

  // Pattern-based domain signals (with negation + simplicity suppression)
  for (const { name, pattern } of OPUS_SIGNAL_PATTERNS) {
    const match = pattern.exec(prompt);
    if (match && !isNegated(prompt, match.index) && !hasSimplicityPrefix(prompt, match.index)) {
      domainSignals.push(name);
    }
  }

  // Structural signals (only count if at least 1 domain signal matched)
  const structuralSignals: string[] = [];

  if (prompt.length > 400) {
    structuralSignals.push('long-prompt (>400 chars)');
  }

  const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length >= 4) {
    structuralSignals.push(`multi-sentence (${sentences.length} sentences)`);
  }

  const questions = (prompt.match(/\?/g) || []).length;
  if (questions >= 2) {
    structuralSignals.push(`multi-question (${questions} questions)`);
  }

  // Structural signals require a domain anchor
  const allSignals = domainSignals.length >= 1
    ? [...domainSignals, ...structuralSignals]
    : domainSignals;

  return { signalCount: allSignals.length, matchedSignals: allSignals };
}

// ── Routing Output ──

function outputHaikuHint(): void {
  console.log(`<system-reminder>
<complexity-router tier="HAIKU" action="RELAY">
RELAY MODE ACTIVE — run BEFORE any Algorithm phases or OBSERVE:
1. If context contains a <command-name> tag (skill invocation): skip relay, proceed normally with full Algorithm.
2. Otherwise — RELAY PROTOCOL (no exceptions):
   a. Emit the ♻️ header and TASK line immediately.
   b. Your FIRST and ONLY tool call: Task(subagent_type="general-purpose", model="haiku", prompt=[the user's exact message])
   c. After the tool call completes, print the sub-agent's full output as plain text in your own response (do NOT leave it only inside the collapsed tool result block).
   d. No ISC. No OBSERVE. No phases. No capability audit.
   e. End with: 🗣️ SoushAI: [one-line spoken summary]
</complexity-router>
</system-reminder>`);
}

function outputOpusHint(matchedSignals: string[]): void {
  console.log(`<system-reminder>
<complexity-router tier="OPUS" action="ELEVATE">
HIGH COMPLEXITY DETECTED — elevate effort level:
Signals: ${matchedSignals.join(', ')}

→ Treat this as Deep or Comprehensive effort level in the Algorithm.
→ Run full Algorithm phases at maximum quality and depth.
→ Do NOT downgrade to Fast or Standard — complexity signals demand full treatment.
</complexity-router>
</system-reminder>`);
}

// ── Routing Signal Writer ──

function writeRoutingSignal(sessionId: string, tier: string, promptChars: number, relayFired: boolean = false): void {
  try {
    const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
    const stateDir = join(paiDir, 'MEMORY', 'STATE');
    mkdirSync(stateDir, { recursive: true });
    const signal = { timestamp: new Date().toISOString(), session_id: sessionId, tier, prompt_chars: promptChars, relay_fired: relayFired };
    writeFileSync(join(stateDir, `pending-route-${sessionId}.json`), JSON.stringify(signal));
  } catch { /* non-blocking — hook still works if write fails */ }
}

// ── Stdin Reader ──

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 5000);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

// ── Main ──

async function main(): Promise<void> {
  try {
    const input = await readStdin();

    let data: HookInput;
    try {
      data = JSON.parse(input);
    } catch {
      console.error('[ComplexityRouter] Failed to parse stdin JSON — skipping');
      process.exit(0);
    }

    const prompt = (data.prompt || data.user_prompt || '').trim();

    if (!prompt) {
      console.error('[ComplexityRouter] Empty prompt — skipping');
      process.exit(0);
    }

    // ── Tier 1: HAIKU (fast path — check first) ──
    if (isHaikuTier(prompt)) {
      console.error(`[ComplexityRouter] HAIKU tier — simple prompt detected (${prompt.length} chars)`);
      outputHaikuHint();
      writeRoutingSignal(data.session_id, 'HAIKU', prompt.length, true);
      process.exit(0);
    }

    // ── Tier 3: OPUS (needs ≥2 signals) ──
    const opusAnalysis = analyzeOpusSignals(prompt);
    if (opusAnalysis.signalCount >= 3) {
      console.error(`[ComplexityRouter] OPUS tier — ${opusAnalysis.signalCount} signals: ${opusAnalysis.matchedSignals.join(', ')}`);
      outputOpusHint(opusAnalysis.matchedSignals);
      writeRoutingSignal(data.session_id, 'OPUS', prompt.length);
      process.exit(0);
    }

    // ── Tier 2: SONNET (default — silent) ──
    console.error(`[ComplexityRouter] SONNET tier (default) — ${opusAnalysis.signalCount} opus signal(s), not enough for OPUS`);
    // No stdout output — Sonnet handles it directly
    writeRoutingSignal(data.session_id, 'SONNET', prompt.length);

  } catch (err) {
    console.error(`[ComplexityRouter] Unexpected error: ${err}`);
  }

  process.exit(0);
}

main();
