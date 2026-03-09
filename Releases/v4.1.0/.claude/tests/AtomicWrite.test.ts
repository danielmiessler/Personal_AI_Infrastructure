/**
 * AtomicWrite.test.ts — Tests for atomic file write utilities
 *
 * Run: bun test ./.claude/tests/AtomicWrite.test.ts
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { atomicWriteJSON, atomicWriteText } from '../hooks/lib/atomic';

const TEST_DIR = tmpdir();

function tmpFile(name: string) {
  return join(TEST_DIR, `pai-atomic-test-${name}-${process.pid}.json`);
}

describe('atomicWriteJSON', () => {
  test('writes JSON file correctly', () => {
    const path = tmpFile('basic');
    atomicWriteJSON(path, { hello: 'world', count: 42 });
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    expect(parsed.hello).toBe('world');
    expect(parsed.count).toBe(42);
    unlinkSync(path);
  });

  test('overwrites existing file', () => {
    const path = tmpFile('overwrite');
    writeFileSync(path, JSON.stringify({ old: true }));
    atomicWriteJSON(path, { new: true });
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    expect(parsed.new).toBe(true);
    expect(parsed.old).toBeUndefined();
    unlinkSync(path);
  });

  test('leaves no .tmp file on success', () => {
    const path = tmpFile('no-tmp');
    atomicWriteJSON(path, { x: 1 });
    expect(existsSync(`${path}.${process.pid}.tmp`)).toBe(false);
    unlinkSync(path);
  });

  test('writes arrays correctly', () => {
    const path = tmpFile('array');
    atomicWriteJSON(path, [1, 2, 3]);
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    expect(parsed).toEqual([1, 2, 3]);
    unlinkSync(path);
  });

  test('writes null values correctly', () => {
    const path = tmpFile('null');
    atomicWriteJSON(path, { value: null });
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    expect(parsed.value).toBeNull();
    unlinkSync(path);
  });

  test('output is pretty-printed JSON', () => {
    const path = tmpFile('pretty');
    atomicWriteJSON(path, { a: 1 });
    const raw = readFileSync(path, 'utf-8');
    expect(raw).toContain('\n');
    unlinkSync(path);
  });
});

describe('atomicWriteText', () => {
  test('writes text file correctly', () => {
    const path = tmpFile('text');
    atomicWriteText(path, 'hello world');
    expect(readFileSync(path, 'utf-8')).toBe('hello world');
    unlinkSync(path);
  });

  test('overwrites existing text file', () => {
    const path = tmpFile('text-overwrite');
    writeFileSync(path, 'old content');
    atomicWriteText(path, 'new content');
    expect(readFileSync(path, 'utf-8')).toBe('new content');
    unlinkSync(path);
  });

  test('leaves no .tmp file on success', () => {
    const path = tmpFile('text-no-tmp');
    atomicWriteText(path, 'data');
    expect(existsSync(`${path}.${process.pid}.tmp`)).toBe(false);
    unlinkSync(path);
  });
});
