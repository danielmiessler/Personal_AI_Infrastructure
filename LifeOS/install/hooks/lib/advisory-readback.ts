/**
 * advisory-readback.ts — deliver advisory findings at SessionStart.
 *
 * The SessionEnd advisory checkers (MemoryDirIntegrity, KnowledgeConformance)
 * write their findings to stderr and to `MEMORY/STATE/events.jsonl`. Neither
 * surface reaches anyone: SessionEnd stderr is a transient teardown print that
 * cannot inject context, and until now nothing in the tree ever read the event
 * log. This library is the read half — it runs at SessionStart, where context
 * injection does work, and turns the last-known finding set into at most a few
 * lines of context.
 *
 * WHAT IT EMITS
 *
 * Nothing, almost always. A line appears only when the finding SET changed since
 * the last time the digest was shown, plus a slow re-emission so a real,
 * long-unfixed finding cannot go silent forever after one impression that
 * scrolled past during a session about something else. Steady state — no
 * findings, or findings already shown recently — is zero characters.
 *
 * Change is computed over stable finding KEYS, never counts: a count-keyed set
 * either re-fires every run or never settles. See hooks/lib/events.ts.
 *
 * STATE: MEMORY/STATE/advisory-readback.json, created on first run. Losing it
 * costs one extra digest impression, nothing more.
 *
 * Ported from public PR #1758, @anikinsasha.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { paiPath } from './paths';
import { readLatestByType, findingsOf, type EventRecord, type Finding } from './events';

/** UTC, matching the event log. See the note in lib/events.ts. */
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Event types the digest reduces. Every registered type is scanned for
 * independently, so a quiet checker's last emission is never evicted by a
 * chatty one's.
 *
 * This list holds SHIPPED emitters only. `doc.integrity` (DocCrossRefIntegrity)
 * is deliberately absent: that handler does not emit a finding set today, and
 * registering a type nothing writes is how the old event-type table came to
 * document eleven emitters that did not exist. Add the type in the same change
 * that adds the emission.
 */
export const ADVISORY_EVENT_TYPES = [
  'doc.integrity.memory_dir',
  'doc.integrity.knowledge_conformance',
] as const;

/** Sessions a nonempty, unchanged finding set stays quiet before re-announcing. */
export const RE_EMIT_AFTER_SESSIONS = 20;

/** Findings shown in full before the digest collapses to a count. */
export const MAX_DIGEST_LINES = 3;

/** Short label per event type, so a digest line says where it came from. */
const TYPE_LABELS: Record<string, string> = {
  'doc.integrity.memory_dir': 'memory-dirs',
  'doc.integrity.knowledge_conformance': 'knowledge',
};

export interface AdvisoryMarker {
  v: 1;
  /** Sorted finding identities as of the last digest impression. */
  keys: string[];
  /** SessionStarts since the last impression, for the slow re-emission. */
  sessions_since_emit: number;
  last_emitted_at: string | null;
}

export interface TypedFinding extends Finding {
  type: string;
}

export const EMPTY_MARKER: AdvisoryMarker = {
  v: 1,
  keys: [],
  sessions_since_emit: 0,
  last_emitted_at: null,
};

export function markerPath(): string {
  return paiPath('MEMORY', 'STATE', 'advisory-readback.json');
}

/** Identity of a finding across the whole digest: type + the emitter's key. */
export function findingId(f: TypedFinding): string {
  return `${f.type} ${f.key}`;
}

/** Flatten the per-type latest events into one finding list, order stable. */
export function collectFindings(
  latest: Map<string, EventRecord>,
  types: readonly string[] = ADVISORY_EVENT_TYPES,
): TypedFinding[] {
  const out: TypedFinding[] = [];
  for (const type of types) {
    for (const f of findingsOf(latest.get(type))) {
      out.push({ ...f, type });
    }
  }
  return out;
}

/**
 * Decide whether to show the digest, and what the marker becomes.
 * Pure — the whole emission policy, independent of disk.
 */
export function decideDigest(
  findings: TypedFinding[],
  marker: AdvisoryMarker,
  reEmitAfterSessions: number = RE_EMIT_AFTER_SESSIONS,
): { emit: boolean; marker: AdvisoryMarker } {
  const keys = Array.from(new Set(findings.map(findingId))).sort();

  // Nothing outstanding: say nothing, but record the cleared set so the next
  // real finding reads as a change rather than as "same as last time".
  if (keys.length === 0) {
    return {
      emit: false,
      marker: { ...marker, v: 1, keys: [], sessions_since_emit: 0 },
    };
  }

  const changed =
    keys.length !== marker.keys.length || keys.some((k, i) => k !== marker.keys[i]);

  if (changed) {
    return {
      emit: true,
      marker: { v: 1, keys, sessions_since_emit: 0, last_emitted_at: nowIso() },
    };
  }

  const elapsed = marker.sessions_since_emit + 1;
  if (elapsed >= reEmitAfterSessions) {
    return {
      emit: true,
      marker: { v: 1, keys, sessions_since_emit: 0, last_emitted_at: nowIso() },
    };
  }

  return { emit: false, marker: { ...marker, v: 1, keys, sessions_since_emit: elapsed } };
}

/** Render the digest. Pure; caller decides whether it is shown. */
export function renderDigest(findings: TypedFinding[], maxLines: number = MAX_DIGEST_LINES): string {
  const lines = findings
    .slice(0, maxLines)
    // One finding is one line. `detail` carries on-disk directory names, so a
    // newline in one would let a directory shape the surrounding SessionStart
    // text rather than appear inside it.
    .map((f) => `  [${TYPE_LABELS[f.type] ?? f.type}] ${String(f.detail).replace(/\s+/g, ' ').trim()}`);
  const remainder = findings.length - lines.length;
  if (remainder > 0) {
    lines.push(`  …and ${remainder} more — see MEMORY/STATE/events.jsonl`);
  }
  return `**Advisory findings from the last session (${findings.length}):**\n${lines.join('\n')}`;
}

export function readMarker(path: string = markerPath()): AdvisoryMarker {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_MARKER };
    return {
      v: 1,
      keys: Array.isArray(parsed.keys) ? parsed.keys.filter((k: unknown) => typeof k === 'string') : [],
      sessions_since_emit:
        typeof parsed.sessions_since_emit === 'number' && parsed.sessions_since_emit >= 0
          ? parsed.sessions_since_emit
          : 0,
      last_emitted_at: typeof parsed.last_emitted_at === 'string' ? parsed.last_emitted_at : null,
    };
  } catch {
    return { ...EMPTY_MARKER };
  }
}

export function writeMarker(marker: AdvisoryMarker, path: string = markerPath()): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(marker, null, 2));
  } catch {
    // A marker we cannot persist costs one extra impression, never correctness.
  }
}

/**
 * The SessionStart entry point: read the log, decide, persist, render.
 * Returns null when there is nothing to show — the common case.
 */
export function loadAdvisoryDigest(opts: { eventsPath?: string; markerPath?: string } = {}): string | null {
  try {
    const latest = readLatestByType([...ADVISORY_EVENT_TYPES], { path: opts.eventsPath });
    const findings = collectFindings(latest);
    const marker = readMarker(opts.markerPath ?? markerPath());
    const decision = decideDigest(findings, marker);
    writeMarker(decision.marker, opts.markerPath ?? markerPath());
    return decision.emit ? renderDigest(findings) : null;
  } catch {
    return null;
  }
}
