/**
 * LifeOS Pulse — Discord state migration tests
 *
 * Covers the one-shot carry-across from the pre-v7 ~/.claude/discord-bot-state.json
 * to LIFEOS/PULSE/state/discord/state.json.
 *
 * Every case runs against a temp directory via loadState()'s injectable paths —
 * no real home directory is read or written.
 *
 * Run from LIFEOS/PULSE:
 *   bun test modules/discord/state.test.ts
 *
 * IDs below are fabricated. Never put real state or credentials in a test.
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadState, type StatePaths } from "./state.ts";

let dir: string;
let paths: StatePaths;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "discord-state-"));
  paths = {
    statePath: join(dir, "new", "state.json"),
    legacyPath: join(dir, "discord-bot-state.json"),
  };
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const LEGACY = {
  lastMessageId: "1000000000000000001",
  botUserId: "2000000000000000002",
  pulseSessionId: "00000000-1111-2222-3333-444444444444",
};

function writeLegacy(contents: string | object) {
  writeFileSync(
    paths.legacyPath,
    typeof contents === "string" ? contents : JSON.stringify(contents)
  );
}

function writeNew(state: object) {
  mkdirSync(join(dir, "new"), { recursive: true });
  writeFileSync(paths.statePath, JSON.stringify(state));
}

test("new path present → legacy ignored, existing state not overwritten", () => {
  const current = { lastMessageId: "9999", botUserId: "8888", pulseSessionId: "current" };
  writeNew(current);
  writeLegacy(LEGACY);

  expect(loadState(paths)).toEqual(current);
  // The newer file must survive untouched.
  expect(JSON.parse(readFileSync(paths.statePath, "utf-8"))).toEqual(current);
});

test("new path absent, legacy present → all three fields carried across", () => {
  writeLegacy(LEGACY);

  const loaded = loadState(paths);
  expect(loaded.lastMessageId).toBe(LEGACY.lastMessageId);
  expect(loaded.botUserId).toBe(LEGACY.botUserId);
  expect(loaded.pulseSessionId).toBe(LEGACY.pulseSessionId);

  // ...and persisted to the new location.
  expect(existsSync(paths.statePath)).toBe(true);
  expect(JSON.parse(readFileSync(paths.statePath, "utf-8"))).toEqual(LEGACY);
});

test("migration copies rather than moves — legacy file left on disk", () => {
  writeLegacy(LEGACY);
  loadState(paths);

  expect(existsSync(paths.legacyPath)).toBe(true);
  expect(JSON.parse(readFileSync(paths.legacyPath, "utf-8"))).toEqual(LEGACY);
});

test("migration is idempotent — second load reads the new path, legacy still intact", () => {
  writeLegacy(LEGACY);

  const first = loadState(paths);
  const second = loadState(paths);

  expect(second).toEqual(first);
  expect(existsSync(paths.legacyPath)).toBe(true);
});

test("both absent → default state", () => {
  expect(loadState(paths)).toEqual({
    lastMessageId: null,
    botUserId: null,
    pulseSessionId: null,
  });
});

test("legacy present but malformed → default state, no throw, nothing written", () => {
  writeLegacy("{ this is not valid json");

  expect(() => loadState(paths)).not.toThrow();
  expect(loadState(paths)).toEqual({
    lastMessageId: null,
    botUserId: null,
    pulseSessionId: null,
  });
  // A corrupt legacy file must not produce a corrupt new file.
  expect(existsSync(paths.statePath)).toBe(false);
  // ...and the original is left for recovery.
  expect(existsSync(paths.legacyPath)).toBe(true);
});

test("partial legacy state is filled in from defaults", () => {
  writeLegacy({ lastMessageId: "123" });

  expect(loadState(paths)).toEqual({
    lastMessageId: "123",
    botUserId: null,
    pulseSessionId: null,
  });
});
