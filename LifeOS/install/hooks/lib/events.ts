/**
 * events.ts — shared emitter and reader for the unified event log.
 *
 * HookSystem.md § Unified Event System has documented `appendEvent()` as the
 * hook-facing emitter since v5.0.0, but no such function ever shipped: every
 * writer of `MEMORY/STATE/events.jsonl` inlined its own `appendFileSync`. This
 * library is that documented API, plus the reader half the log never had.
 *
 * THE EMISSION CONTRACT (normative — read this before adding an emitter)
 *
 * A checker that reports a set of findings emits ONE event per COMPLETED check,
 * carrying its FULL current finding set — including the empty set, flagged
 * `ok: true`. Not "on change", not "only when something is wrong".
 *
 *   emitted with findings: []   →  "I checked; nothing is wrong."
 *   no emission at all          →  "I did not check; the previous set stands."
 *
 * Both statements are load-bearing for the SessionStart readback, which reduces
 * the log to the LAST event per type. An emitter that only speaks up when it has
 * findings can never announce that a finding was fixed, so the readback shows a
 * resolved finding forever. An emitter that emits an empty set from a code path
 * that skipped the scan claims a clean bill of health it never checked — worse,
 * because it silently clears real findings. Emit on completion, never on skip.
 *
 * FINDING IDENTITY
 *
 * Every finding carries a `key` that is stable across runs for the same
 * underlying problem, and encodes NOTHING that churns — no counts, no
 * timestamps, no ordinals. The readback compares finding-key SETS to decide
 * whether anything changed; a key containing a count re-fires the digest on
 * every run, and a key containing a timestamp never settles.
 *
 * READS/WRITES: LIFEOS/MEMORY/STATE/events.jsonl (append-only, never rotated).
 * The reader therefore scans backwards from EOF in bounded windows and stops as
 * soon as every requested type has been seen, so log growth costs the
 * SessionStart path nothing.
 *
 * FAILURE MODE: every function here is best-effort and never throws. Events are
 * observability, not the critical path.
 *
 * Ported from public PR #1758, @anikinsasha.
 */

import { appendFileSync, mkdirSync, openSync, readSync, fstatSync, closeSync } from 'fs';
import { dirname } from 'path';
import { paiPath } from './paths';

// UTC via Date, not lib/time.ts: `timestamp` has been UTC in every event ever
// written to this log, and lib/time.ts's getISOTimestamp() is local-with-offset —
// adopting it would silently change the wire format. It also drags identity.ts
// and a YAML parse onto the emit path, which sits inside every hook run.
function eventTimestamp(): string {
  return new Date().toISOString();
}

/** Base shape every event shares. `type` is the dot-separated topic. */
export interface BaseEvent {
  type: string;
  source: string;
  [key: string]: unknown;
}

/** One reported problem. `key` is its identity; `detail` is human-facing text. */
export interface Finding {
  /**
   * Stable identity of this finding within (type, source). Same problem across
   * runs ⇒ same key. MUST NOT contain counts, timestamps, or positions.
   */
  key: string;
  /** Optional finding class, e.g. 'missing_active'. Free-form per emitter. */
  kind?: string;
  /** Human-readable description, shown in the SessionStart digest. */
  detail: string;
}

/** An event carrying a complete finding set. See THE EMISSION CONTRACT above. */
export interface FindingSetEvent extends BaseEvent {
  ok: boolean;
  finding_count: number;
  findings: Finding[];
}

/** A parsed line from the log. Unknown fields are preserved. */
export interface EventRecord {
  timestamp?: string;
  session_id?: string;
  type?: string;
  source?: string;
  [key: string]: unknown;
}

/** Stop scanning backwards past this many bytes, however large the log grows. */
export const DEFAULT_MAX_SCAN_BYTES = 8 * 1024 * 1024;
/** Backwards read window. Sized so a typical log needs exactly one read. */
export const DEFAULT_CHUNK_BYTES = 256 * 1024;

export function eventsPath(): string {
  return paiPath('MEMORY', 'STATE', 'events.jsonl');
}

/**
 * Append one event. `timestamp` and `session_id` are injected; an event may
 * override either by supplying its own. Never throws.
 */
export function appendEvent(event: BaseEvent, path: string = eventsPath()): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    const record: EventRecord = {
      timestamp: eventTimestamp(),
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
      ...event,
    };
    appendFileSync(path, JSON.stringify(record) + '\n', 'utf-8');
  } catch {
    // Observability must never break the hook that emitted.
  }
}

/**
 * Emit a completed check's full finding set, per THE EMISSION CONTRACT.
 * Call this exactly once per completed check — including when `findings` is
 * empty, which is how a fixed problem leaves the readback digest.
 */
export function emitFindingSet(
  opts: {
    type: string;
    source: string;
    findings: Finding[];
    /** Extra context fields merged into the event (counts, durations, …). */
    extra?: Record<string, unknown>;
  },
  path: string = eventsPath(),
): void {
  const event: FindingSetEvent = {
    ...(opts.extra ?? {}),
    type: opts.type,
    source: opts.source,
    ok: opts.findings.length === 0,
    finding_count: opts.findings.length,
    findings: opts.findings,
  };
  appendEvent(event, path);
}

/**
 * Reduce log lines (in file order) to the latest event per requested type.
 * Pure — the IO-free core of `readLatestByType`.
 */
export function reduceLatestByType(lines: string[], types: string[]): Map<string, EventRecord> {
  const wanted = new Set(types);
  const out = new Map<string, EventRecord>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: EventRecord;
    try {
      rec = JSON.parse(trimmed);
    } catch {
      continue; // A torn or corrupt line is skipped, never fatal.
    }
    if (!rec || typeof rec !== 'object') continue;
    const type = typeof rec.type === 'string' ? rec.type : '';
    if (!type || !wanted.has(type)) continue;
    out.set(type, rec); // Later wins: file order is authoritative.
  }
  return out;
}

/**
 * Read the latest event for each requested type, scanning backwards from EOF.
 *
 * The window is per-type-complete, not fixed-size: it keeps growing until every
 * requested type has been seen, the start of the file is reached, or `maxBytes`
 * is consumed. A fixed tail would let one chatty emitter evict a quiet one's
 * last emission, silently dropping the quiet checker's findings from the digest.
 *
 * `maxBytes` bounds that guarantee rather than removing it: a quiet type whose
 * last emission sits further back than `maxBytes` in an append-only log is not
 * found. At the 8 MiB default that is roughly a hundred thousand events ago,
 * and the cost of the miss is one absent advisory line, not a wrong one.
 *
 * Never throws; returns an empty map when the log is absent or unreadable.
 */
export function readLatestByType(
  types: string[],
  opts: { path?: string; maxBytes?: number; chunkBytes?: number } = {},
): Map<string, EventRecord> {
  const path = opts.path ?? eventsPath();
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_SCAN_BYTES;
  const chunkBytes = opts.chunkBytes ?? DEFAULT_CHUNK_BYTES;
  const wanted = new Set(types);
  const out = new Map<string, EventRecord>();
  if (wanted.size === 0) return out;

  let fd: number | null = null;
  try {
    fd = openSync(path, 'r');
    let end = fstatSync(fd).size;
    let scanned = 0;
    // Bytes of the partial first line of the window just scanned. Carried as
    // BYTES, not text: a multi-byte code point straddling a window boundary
    // would decode to a replacement char if each half were decoded alone.
    // Typed as Uint8Array so a `subarray()` view assigns cleanly here.
    let carry: Uint8Array = new Uint8Array(0);

    while (end > 0 && out.size < wanted.size && scanned < maxBytes) {
      const want = Math.min(chunkBytes, end, maxBytes - scanned);
      const start = end - want;
      const buf = Buffer.allocUnsafe(want);
      readSync(fd, buf, 0, want, start);
      scanned += want;

      const windowBuf = carry.length > 0 ? Buffer.concat([buf, carry]) : buf;
      const lineBufs: Buffer[] = [];
      let sliceStart = 0;
      for (let i = 0; i < windowBuf.length; i++) {
        if (windowBuf[i] === 0x0a) {
          lineBufs.push(windowBuf.subarray(sliceStart, i));
          sliceStart = i + 1;
        }
      }
      lineBufs.push(windowBuf.subarray(sliceStart));

      // Below byte 0 there is more of this line; hand it to the next window.
      carry = start > 0 ? (lineBufs.shift() ?? new Uint8Array(0)) : new Uint8Array(0);

      for (let i = lineBufs.length - 1; i >= 0; i--) {
        const line = lineBufs[i].toString('utf-8').trim();
        if (!line) continue;
        let rec: EventRecord;
        try {
          rec = JSON.parse(line);
        } catch {
          continue;
        }
        if (!rec || typeof rec !== 'object') continue;
        const type = typeof rec.type === 'string' ? rec.type : '';
        if (!type || !wanted.has(type) || out.has(type)) continue;
        out.set(type, rec); // Scanning backwards: first seen is the latest.
        if (out.size === wanted.size) break;
      }

      end = start;
    }
  } catch {
    // Missing or unreadable log — the readback simply has nothing to say.
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

/**
 * Extract the findings of an event, tolerating a non-conforming payload.
 * Anything without a usable `key` and `detail` is dropped rather than shown
 * under a fabricated identity.
 */
export function findingsOf(record: EventRecord | undefined): Finding[] {
  if (!record || !Array.isArray(record.findings)) return [];
  const out: Finding[] = [];
  for (const raw of record.findings as unknown[]) {
    if (!raw || typeof raw !== 'object') continue;
    const f = raw as Record<string, unknown>;
    const key = typeof f.key === 'string' ? f.key : '';
    const detail = typeof f.detail === 'string' ? f.detail : '';
    if (!key || !detail) continue;
    const finding: Finding = { key, detail };
    if (typeof f.kind === 'string') finding.kind = f.kind;
    out.push(finding);
  }
  return out;
}
