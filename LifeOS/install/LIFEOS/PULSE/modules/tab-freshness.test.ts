// Freshness of machine-written ledgers: the .jsonl expansion, cadence-aware
// tiers, and the unchanged day-scale behaviour for everything else.
//
// Fixtures are synthetic files in a temp tree whose mtimes are set with
// utimesSync (no sleeps). The module roots its registry at HOME when it is
// imported, so HOME is pointed at the temp tree before the dynamic import and
// the registry-level test below never reads a real install.

import { test, expect, afterAll } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const root = mkdtempSync(join(tmpdir(), "tab-freshness-"))
const home = join(root, "home")
const realHome = process.env.HOME
process.env.HOME = home
const { computeFreshness, handleRequest, invalidate } = await import("./tab-freshness")

afterAll(() => {
  process.env.HOME = realHome
  rmSync(root, { recursive: true, force: true })
})

const MINUTE = 60_000
const LEDGER_ROW = JSON.stringify({ sessionId: "synthetic-0001" }) + "\n"
let cases = 0

function scratchDir(): string {
  const dir = join(root, `case-${cases++}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Writes a synthetic file whose mtime is `ageMinutes` in the past. */
function writeAged(path: string, ageMinutes: number, content = "{}\n"): string {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  const t = new Date(Date.now() - ageMinutes * MINUTE)
  utimesSync(path, t, t)
  return path
}

async function freshnessOf(tab: string) {
  invalidate()
  const res = await handleRequest(new Request(`http://localhost/api/tab-freshness?tab=${tab}`), "/api/tab-freshness")
  return res!.json()
}

test("a ledger 14 hours behind a 15-minute cadence is stale even beside a fresh .json", () => {
  const dir = scratchDir()
  writeAged(join(dir, "unrelated.json"), 0)
  const ledger = writeAged(join(dir, "session-costs.jsonl"), 14 * 60, LEDGER_ROW)
  const payload = computeFreshness("performance", [
    { name: "OBSERVABILITY/", path: dir, expand: true },
    { name: "session-costs.jsonl", path: ledger, expectedEveryMinutes: 15 },
  ])
  expect(payload.tier).toBe("stale")
  expect(payload.daysOld).toBe(0)
  expect(payload.ageMinutes).toBeGreaterThanOrEqual(840)
  expect(payload.ageMinutes).toBeLessThan(850)
  expect(payload.expectedEveryMinutes).toBe(15)
  expect(payload.label).toBe("session-costs.jsonl written 14 h ago, expected every 15 min")
  // listed explicitly and reached through the expansion: counted once, with the cadence
  const entries = payload.perFile.filter((p) => p.name.endsWith("session-costs.jsonl"))
  expect(entries).toHaveLength(1)
  expect(entries[0]).toMatchObject({ name: "session-costs.jsonl", source: "mtime", expectedEveryMinutes: 15 })
  expect(entries[0].ageMinutes).toBeGreaterThanOrEqual(840)
})

test("sources without a declared cadence keep the day scale, and .jsonl now enters the expansion", () => {
  const dir = scratchDir()
  writeAged(join(dir, "unrelated.json"), 0)
  writeAged(join(dir, "session-costs.jsonl"), 14 * 60, LEDGER_ROW)
  const payload = computeFreshness("performance", [{ name: "OBSERVABILITY/", path: dir, expand: true }])
  expect(payload.tier).toBe("fresh")
  expect(payload.daysOld).toBe(0)
  expect(payload.label).toBe("2 of 2 sources dated")
  expect(payload.ageMinutes).toBeUndefined()
  expect(payload.expectedEveryMinutes).toBeUndefined()
  expect(payload.perFile.map((p) => p.name).sort()).toEqual(["OBSERVABILITY/session-costs.jsonl", "OBSERVABILITY/unrelated.json"])
  expect(payload.perFile.every((p) => p.ageMinutes === undefined)).toBe(true)
})

test.each([
  [30, "fresh"],
  [150, "aging"],
  [151, "stale"],
] as const)("a 15-minute source written %i minutes ago is %s", (age, tier) => {
  const file = writeAged(join(scratchDir(), "heartbeat.json"), age)
  expect(computeFreshness("t", [{ name: "heartbeat.json", path: file, expectedEveryMinutes: 15 }]).tier).toBe(tier)
})

test("a cadence source on time still carries the day-scale verdict", () => {
  const file = writeAged(join(scratchDir(), "weekly.json"), 8 * 24 * 60)
  const payload = computeFreshness("t", [{ name: "weekly.json", path: file, expectedEveryMinutes: 7 * 24 * 60 }])
  expect(payload.tier).toBe("aging")
  expect(payload.daysOld).toBe(8)
  expect(payload.label).toBe("1 of 1 sources dated")
  expect(payload.expectedEveryMinutes).toBe(7 * 24 * 60)
})

test("an absent cadence source leaves the verdict to the sources on disk", () => {
  const dir = scratchDir()
  writeAged(join(dir, "notes.json"), 0)
  const payload = computeFreshness("t", [
    { name: "notes.json", path: join(dir, "notes.json") },
    { name: "missing.jsonl", path: join(dir, "missing.jsonl"), expectedEveryMinutes: 15 },
  ])
  expect(payload.tier).toBe("fresh")
  expect(payload.ageMinutes).toBeUndefined()
  expect(payload.perFile).toContainEqual({ name: "missing.jsonl", date: null, source: "unknown" })
})

test("the performance tab judges the cost-aggregation heartbeat against its 15-minute cadence", async () => {
  const lifeos = join(home, ".claude", "LIFEOS")
  writeAged(join(lifeos, "MEMORY", "OBSERVABILITY", "unrelated.json"), 0)
  writeAged(join(lifeos, "MEMORY", "OBSERVABILITY", "session-costs.jsonl"), 14 * 60, LEDGER_ROW)
  const heartbeat = join(lifeos, "PULSE", "Performance", "aggregator-state.json")
  const state = JSON.stringify({ lastScanMs: 0, sessionsProcessed: 0 })

  writeAged(heartbeat, 14 * 60, state)
  const stale = await freshnessOf("performance")
  expect(stale.tier).toBe("stale")
  expect(stale.daysOld).toBe(0)
  expect(stale.expectedEveryMinutes).toBe(15)
  expect(stale.ageMinutes).toBeGreaterThanOrEqual(840)
  expect(stale.perFile.map((p: { name: string }) => p.name)).toContain("MEMORY/OBSERVABILITY/session-costs.jsonl")

  writeAged(heartbeat, 1, state)
  const fresh = await freshnessOf("performance")
  expect(fresh.tier).toBe("fresh")
  expect(fresh.label).toBe("3 of 4 sources dated")
})
