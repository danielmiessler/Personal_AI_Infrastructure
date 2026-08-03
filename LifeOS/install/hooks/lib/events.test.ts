/**
 * events.test.ts — the emission contract and the backwards reader.
 *
 * Run: bun test LifeOS/install/hooks/lib/events.test.ts
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  appendEvent,
  emitFindingSet,
  reduceLatestByType,
  readLatestByType,
  findingsOf,
  type EventRecord,
} from './events';

let dir: string;
let log: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lifeos-events-'));
  log = join(dir, 'nested', 'events.jsonl');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function lines(): EventRecord[] {
  return readFileSync(log, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

describe('appendEvent', () => {
  test('creates the directory, appends one JSON line, injects timestamp + session_id', () => {
    const prev = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = 'sess-1';
    try {
      appendEvent({ type: 'custom.a', source: 'T' }, log);
      appendEvent({ type: 'custom.b', source: 'T' }, log);
    } finally {
      if (prev === undefined) delete process.env.CLAUDE_SESSION_ID;
      else process.env.CLAUDE_SESSION_ID = prev;
    }
    const recs = lines();
    expect(recs.length).toBe(2);
    expect(recs[0].type).toBe('custom.a');
    expect(recs[0].session_id).toBe('sess-1');
    expect(typeof recs[0].timestamp).toBe('string');
  });

  test('never throws when the path is unwritable', () => {
    const unwritable = join(dir, 'a-file');
    writeFileSync(unwritable, 'x');
    expect(() => appendEvent({ type: 'custom.a', source: 'T' }, join(unwritable, 'events.jsonl'))).not.toThrow();
  });
});

describe('emitFindingSet — the emission contract', () => {
  test('an empty finding set is still emitted, flagged ok', () => {
    emitFindingSet({ type: 'doc.integrity', source: 'T', findings: [] }, log);
    const [rec] = lines();
    expect(rec.ok).toBe(true);
    expect(rec.finding_count).toBe(0);
    expect(rec.findings).toEqual([]);
  });

  test('a nonempty set is flagged not-ok and carries every finding', () => {
    emitFindingSet(
      {
        type: 'doc.integrity',
        source: 'T',
        findings: [
          { key: 'a', detail: 'A broke' },
          { key: 'b', kind: 'refs', detail: 'B broke' },
        ],
        extra: { docs_checked: 7 },
      },
      log,
    );
    const [rec] = lines();
    expect(rec.ok).toBe(false);
    expect(rec.finding_count).toBe(2);
    expect(rec.docs_checked).toBe(7);
    expect((rec.findings as unknown[]).length).toBe(2);
  });

  test('a set that clears is observable: the later empty emission wins the reduction', () => {
    emitFindingSet({ type: 'doc.integrity', source: 'T', findings: [{ key: 'a', detail: 'A broke' }] }, log);
    emitFindingSet({ type: 'doc.integrity', source: 'T', findings: [] }, log);
    const latest = readLatestByType(['doc.integrity'], { path: log });
    expect(findingsOf(latest.get('doc.integrity'))).toEqual([]);
  });
});

describe('reduceLatestByType', () => {
  test('last emission per type wins; untracked types and corrupt lines are ignored', () => {
    const map = reduceLatestByType(
      [
        JSON.stringify({ type: 'x', n: 1 }),
        'not json',
        JSON.stringify({ type: 'y', n: 2 }),
        JSON.stringify({ type: 'ignored', n: 99 }),
        '',
        JSON.stringify({ type: 'x', n: 3 }),
      ],
      ['x', 'y'],
    );
    expect(map.get('x')?.n).toBe(3);
    expect(map.get('y')?.n).toBe(2);
    expect(map.has('ignored')).toBe(false);
  });
});

describe('readLatestByType', () => {
  test('returns an empty map for a missing log', () => {
    expect(readLatestByType(['x'], { path: join(dir, 'nope.jsonl') }).size).toBe(0);
  });

  test('a chatty emitter cannot evict a quiet one — the window grows per type', () => {
    // The quiet type is emitted once, then buried under padding far larger than
    // one read window. A fixed-size tail would drop it; per-type coverage cannot.
    appendEvent({ type: 'quiet', source: 'Q', marker: 'the-only-one' }, log);
    for (let i = 0; i < 400; i++) {
      appendEvent({ type: 'chatty', source: 'C', i, pad: 'x'.repeat(200) }, log);
    }
    const latest = readLatestByType(['quiet', 'chatty'], { path: log, chunkBytes: 1024 });
    expect(latest.get('quiet')?.marker).toBe('the-only-one');
    expect(latest.get('chatty')?.i).toBe(399);
  });

  test('stops early once every requested type is found', () => {
    for (let i = 0; i < 200; i++) appendEvent({ type: 'old', source: 'O', i }, log);
    appendEvent({ type: 'a', source: 'A', v: 1 }, log);
    appendEvent({ type: 'b', source: 'B', v: 2 }, log);
    const latest = readLatestByType(['a', 'b'], { path: log, chunkBytes: 64 });
    expect(latest.get('a')?.v).toBe(1);
    expect(latest.get('b')?.v).toBe(2);
  });

  test('multi-byte characters spanning a read-window boundary survive', () => {
    // Non-ASCII payloads at many lengths, so at least one code point lands
    // across a window edge for a small chunk size.
    for (let i = 0; i < 60; i++) {
      appendEvent({ type: 'utf', source: 'U', i, pad: 'é☃🌍'.repeat(i + 1) }, log);
    }
    const latest = readLatestByType(['utf'], { path: log, chunkBytes: 97 });
    expect(latest.get('utf')?.i).toBe(59);
    expect(latest.get('utf')?.pad).toBe('é☃🌍'.repeat(60));
  });

  test('a torn trailing line is skipped, the record before it still readable', () => {
    appendEvent({ type: 'x', source: 'T', n: 1 }, log);
    appendFileSync(log, '{"type":"x","n":2'); // crash mid-append, no newline
    expect(readLatestByType(['x'], { path: log }).get('x')?.n).toBe(1);
  });

  test('honours maxBytes rather than scanning an unbounded log', () => {
    appendEvent({ type: 'ancient', source: 'A' }, log);
    for (let i = 0; i < 200; i++) appendEvent({ type: 'recent', source: 'R', i, pad: 'y'.repeat(100) }, log);
    const latest = readLatestByType(['ancient', 'recent'], { path: log, chunkBytes: 512, maxBytes: 2048 });
    expect(latest.has('ancient')).toBe(false);
    expect(latest.get('recent')?.i).toBe(199);
  });
});

describe('findingsOf', () => {
  test('drops entries without a usable key or detail rather than inventing identity', () => {
    const rec = { type: 't', findings: [{ key: 'k', detail: 'd' }, { key: '', detail: 'd' }, { detail: 'd' }, 7] };
    expect(findingsOf(rec as EventRecord)).toEqual([{ key: 'k', detail: 'd' }]);
  });

  test('tolerates events with no findings array at all', () => {
    expect(findingsOf({ type: 't' })).toEqual([]);
    expect(findingsOf(undefined)).toEqual([]);
  });
});
