#!/usr/bin/env bun
/**
 * ============================================================================
 * MODELMIX — session-scoped intelligence-rung mix for the statusline
 * ============================================================================
 *
 * WHY THIS EXISTS:
 * The ACTIVE roster answers "which rung is running right now". It does not
 * answer the question the principal actually asks of it: *is the system
 * genuinely dipping into the top rung when the work earns it, or is it
 * quietly riding the default all session?* One glance at
 * `FABLE 12%` next to `OPUS 84%` answers that; a lit/dim label cannot.
 *
 * WHAT IT MEASURES:
 * Share of OUTPUT TOKENS per rung across the session — the main-loop
 * transcript plus every subagent transcript spawned under it. Output tokens,
 * not call count, because a Haiku classification call and a deep Fable
 * analysis are not equal "uses" of intelligence; tokens generated is the
 * honest measure of how much work each rung actually did.
 *
 * GROUND TRUTH is the harness transcript (`message.model` + `message.usage`
 * on each assistant message), not our own logging — the harness records what
 * the API actually billed, so a silently-downgraded dispatch shows up as the
 * model that really ran.
 *
 * RUNG LABELS come from EFFORT_MODEL/CURRENT in models.ts. A lineup change
 * re-labels this automatically; no edit here.
 *
 * KNOWN GAPS (deliberate, do not "fix" by guessing):
 *   - Cross-vendor (Forge/CodexResearcher → OpenAI) spends tokens outside any
 *     Claude transcript, so it gets a USED flag from the subagent meta files,
 *     never a percentage. Percentages are Claude-rung-only and sum to 100.
 *   - `Inference.ts` subprocess calls are not in the transcript and carry no
 *     token counts in model-verification.jsonl. They are out of the mix; the
 *     statusline's separate 300s FABLE-live probe still reads that file.
 *
 * PERFORMANCE: the statusline ticks every 5s and transcripts reach many MB.
 * Every file is read INCREMENTALLY from a stored byte offset, so a tick costs
 * O(bytes written since last tick), not O(session). State lives in
 * MEMORY/STATE/model-mix/<session>.json and is disposable — delete it and the
 * next run re-reads from zero.
 *
 * USAGE:
 *   bun ModelMix.ts --session <id>     # shell-eval: mix_max=8 mix_high=88 ...
 *   bun ModelMix.ts --session <id> --json
 * ============================================================================
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync, rmSync, openSync, readSync, closeSync } from 'fs';
import { join, dirname } from 'path';
import { EFFORT_MODEL, CURRENT, CROSS_VENDOR, type EffortLevel, type ClaudeTier } from './models.ts';

const HOME = process.env.HOME || '';
const PROJECTS_DIR = join(HOME, '.claude', 'projects');

/**
 * Resolved per call, not at import: the statusline and the tests both set
 * LIFEOS_DIR in the environment, and capturing it at module load silently
 * pinned every caller to whatever it was at import time.
 */
const stateDir = () =>
  join(process.env.LIFEOS_DIR || join(HOME, '.claude', 'LIFEOS'), 'MEMORY', 'STATE', 'model-mix');

/** Rungs in display order, low → max, matching the statusline ladder. */
export const RUNGS: EffortLevel[] = ['low', 'medium', 'high', 'max'];

/** tier → rung, derived by inverting EFFORT_MODEL so models.ts stays the one edit point. */
const TIER_RUNG: Partial<Record<ClaudeTier, EffortLevel>> = Object.fromEntries(
  (Object.entries(EFFORT_MODEL) as [EffortLevel, ClaudeTier][]).map(([level, tier]) => [tier, level])
);

/** Agent types that execute on a non-Anthropic carrier — token spend invisible to transcripts. */
const CROSS_VENDOR_AGENTS = new Set(Object.keys(CROSS_VENDOR).map(k => k.toLowerCase()));

export interface Mix {
  tokens: Record<EffortLevel, number>;
  calls: Record<EffortLevel, number>;
  pct: Record<EffortLevel, number>;
  total: number;
  crossVendor: boolean;
  unknownModels: string[];
}

const zero = (): Record<EffortLevel, number> => ({ max: 0, high: 0, medium: 0, low: 0 });

/**
 * Model ID → rung. Matches the tier NAME inside the ID (claude-opus-5 → opus),
 * which survives version bumps without touching CURRENT. Falls back to an exact
 * CURRENT lookup for IDs that don't carry their tier name.
 * Returns null for anything unrecognized — never guess a rung.
 */
export function rungForModel(model: string): EffortLevel | null {
  if (!model) return null;
  const m = model.toLowerCase();
  for (const tier of Object.keys(CURRENT) as ClaudeTier[]) {
    if (m.includes(tier)) return TIER_RUNG[tier] ?? null;
  }
  for (const [tier, id] of Object.entries(CURRENT) as [ClaudeTier, string][]) {
    if (m === id.toLowerCase()) return TIER_RUNG[tier] ?? null;
  }
  return null;
}

/**
 * Percentages from token totals. Any rung with nonzero work rounds to at
 * LEAST 1% — a real Fable dip that rounds to 0% would defeat the whole point.
 * The largest rung absorbs the rounding error so the row always sums to 100.
 */
export function toPct(tokens: Record<EffortLevel, number>): Record<EffortLevel, number> {
  const total = RUNGS.reduce((s, r) => s + tokens[r], 0);
  const pct = zero();
  if (total <= 0) return pct;
  for (const r of RUNGS) {
    if (tokens[r] > 0) pct[r] = Math.max(1, Math.round((tokens[r] / total) * 100));
  }
  const sum = RUNGS.reduce((s, r) => s + pct[r], 0);
  if (sum !== 100) {
    const biggest = RUNGS.reduce((a, b) => (tokens[a] >= tokens[b] ? a : b));
    pct[biggest] = Math.max(0, pct[biggest] + (100 - sum));
  }
  return pct;
}

interface FileState { offset: number; size: number; ids: string[] }
interface State {
  version: number;
  files: Record<string, FileState>;
  tokens: Record<EffortLevel, number>;
  calls: Record<EffortLevel, number>;
  unknownModels: string[];
}

const STATE_VERSION = 2;

function freshState(): State {
  return { version: STATE_VERSION, files: {}, tokens: zero(), calls: zero(), unknownModels: [] };
}

function loadState(path: string): State {
  try {
    const s = JSON.parse(readFileSync(path, 'utf-8')) as State;
    if (s?.version !== STATE_VERSION) return freshState();
    // Defensive: a hand-edited or partially-written state must not poison counts.
    if (!s.files || !s.tokens || !s.calls) return freshState();
    return s;
  } catch { return freshState(); }
}

/**
 * Read a file from `offset` to EOF, returning only COMPLETE lines. A transcript
 * is appended to while we read it, so the trailing partial line is left behind
 * and its bytes are not consumed — the next tick picks it up whole.
 */
function readNewLines(path: string, offset: number): { lines: string[]; offset: number } {
  const size = statSync(path).size;
  if (size <= offset) return { lines: [], offset };
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(size - offset);
    const read = readSync(fd, buf, 0, buf.length, offset);
    const text = buf.subarray(0, read).toString('utf-8');
    const lastNl = text.lastIndexOf('\n');
    if (lastNl < 0) return { lines: [], offset };
    return {
      lines: text.slice(0, lastNl).split('\n').filter(Boolean),
      offset: offset + Buffer.byteLength(text.slice(0, lastNl + 1), 'utf-8'),
    };
  } finally { closeSync(fd); }
}

/**
 * Fold one transcript's new bytes into the running totals.
 *
 * DEDUPE: the harness writes one line per content block, so a single assistant
 * message (one API call, one usage record) appears on several consecutive
 * lines with identical `message.id` and identical usage. Counting lines would
 * multiply every rung by ~3. Duplicates are always adjacent, so a short ring
 * buffer of recent ids is enough — and it survives across ticks because it is
 * persisted with the offset.
 */
function foldFile(path: string, fs_: FileState, state: State): FileState {
  let { offset, ids } = fs_;
  const size = statSync(path).size;
  if (size < offset) { offset = 0; ids = []; }  // truncated/rotated → re-read
  const { lines, offset: newOffset } = readNewLines(path, offset);
  const seen = new Set(ids);
  for (const line of lines) {
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    if (e?.type !== 'assistant') continue;
    const msg = e.message;
    const id = msg?.id;
    if (!id || seen.has(id)) continue;
    seen.add(id); ids.push(id);
    if (ids.length > 32) { const drop = ids.shift(); if (drop) seen.delete(drop); }
    const rung = rungForModel(msg?.model ?? '');
    if (!rung) {
      // `<synthetic>` is the harness's own placeholder on injected messages —
      // no API call, no tokens. Recording it as unknown would read as lineup
      // drift on every session.
      const unknown = String(msg?.model ?? '');
      if (unknown && unknown !== '<synthetic>' && !state.unknownModels.includes(unknown)) {
        state.unknownModels.push(unknown);
      }
      continue;
    }
    state.tokens[rung] += Number(msg?.usage?.output_tokens ?? 0);
    state.calls[rung] += 1;
  }
  return { offset: newOffset, size, ids };
}

/** Locate the session's main transcript: ~/.claude/projects/<slug>/<session>.jsonl */
function findTranscript(sessionId: string): string | null {
  if (!existsSync(PROJECTS_DIR)) return null;
  for (const slug of readdirSync(PROJECTS_DIR)) {
    const p = join(PROJECTS_DIR, slug, `${sessionId}.jsonl`);
    if (existsSync(p)) return p;
  }
  return null;
}

/** Cross-vendor work is invisible to transcripts — read it off the subagent meta files. */
function usedCrossVendor(subagentDir: string): boolean {
  if (!existsSync(subagentDir)) return false;
  for (const f of readdirSync(subagentDir)) {
    if (!f.endsWith('.meta.json')) continue;
    try {
      const meta = JSON.parse(readFileSync(join(subagentDir, f), 'utf-8'));
      const type = String(meta?.agentType ?? '').toLowerCase();
      if (CROSS_VENDOR_AGENTS.has(type)) return true;
      if (String(meta?.model ?? '').toLowerCase().startsWith('gpt-')) return true;
    } catch { /* unreadable meta is not evidence of anything */ }
  }
  return false;
}

/**
 * One state file per session accumulates forever otherwise. A session's mix is
 * only ever read while that session is open, so anything untouched for a week
 * is dead weight — and the cache is disposable, so dropping it costs nothing
 * but a re-read if the session somehow resumes.
 */
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function pruneState(dir: string): void {
  const cutoff = Date.now() - PRUNE_AFTER_MS;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const p = join(dir, f);
    try { if (statSync(p).mtimeMs < cutoff) rmSync(p, { force: true }); } catch { /* racing another tick */ }
  }
}

export function computeMix(sessionId: string, transcriptOverride?: string): Mix {
  const empty: Mix = { tokens: zero(), calls: zero(), pct: zero(), total: 0, crossVendor: false, unknownModels: [] };
  const main = transcriptOverride ?? findTranscript(sessionId);
  if (!main || !existsSync(main)) return empty;

  const STATE_DIR = stateDir();
  const statePath = join(STATE_DIR, `${sessionId}.json`);
  const state = loadState(statePath);

  const subagentDir = join(dirname(main), sessionId, 'subagents');
  const files = [main];
  if (existsSync(subagentDir)) {
    for (const f of readdirSync(subagentDir)) {
      if (f.startsWith('agent-') && f.endsWith('.jsonl')) files.push(join(subagentDir, f));
    }
  }

  for (const f of files) {
    try {
      state.files[f] = foldFile(f, state.files[f] ?? { offset: 0, size: 0, ids: [] }, state);
    } catch { /* a file vanishing mid-session must not zero the whole mix */ }
  }

  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(statePath, JSON.stringify(state), 'utf-8');
    pruneState(STATE_DIR);
  } catch { /* best-effort cache; correctness does not depend on the write */ }

  return {
    tokens: state.tokens,
    calls: state.calls,
    pct: toPct(state.tokens),
    total: RUNGS.reduce((s, r) => s + state.tokens[r], 0),
    crossVendor: usedCrossVendor(subagentDir),
    unknownModels: state.unknownModels,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.main) {
  const argv = process.argv.slice(2);
  const arg = (n: string) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const sessionId = arg('--session') ?? '';
  const transcript = arg('--transcript');

  if (!sessionId && !transcript) {
    console.error('usage: ModelMix.ts --session <id> [--transcript <path>] [--json]');
    process.exit(2);
  }

  const mix = computeMix(sessionId, transcript);

  if (argv.includes('--json')) {
    console.log(JSON.stringify(mix, null, 2));
  } else {
    // Shell-eval contract consumed by LIFEOS_StatusLine.sh.
    const out = RUNGS.map(r => `mix_${r}=${mix.pct[r]}`).join('\n');
    console.log(`${out}\nmix_total=${mix.total}\nmix_forge=${mix.crossVendor ? 1 : 0}`);
  }
}
