/**
 * Cron scheduling — LIFEOS/PULSE/lib.ts
 *
 * Covers the two availability failures a typo in PULSE.toml used to cause:
 *   1. crash loop — a malformed expression threw out of the scheduler loop
 *      into main().catch → process.exit(1), and the supervisors restart on a
 *      30s throttle.
 *   2. hang — a zero step spun forever inside parseField, blocking the event
 *      loop until the process OOM'd.
 *
 * The hang case is exercised in a subprocess with a hard kill well inside the
 * default 5s test budget, so a regression fails the run instead of wedging it.
 */
import { test, expect, describe, afterAll } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

// HOME is read at module load to resolve the user cron file, which loadConfig()
// stats. Point it at a throwaway directory before importing so no test can read
// a real operator's config.
const FAKE_HOME = mkdtempSync(join(tmpdir(), "pulse-cron-test-"))
process.env.HOME = FAKE_HOME

const LIB_PATH = join(import.meta.dir, "../../LIFEOS/PULSE/lib.ts")
const { validateCron, matchesCron, isDue, loadConfig } = await import(LIB_PATH)

afterAll(() => rmSync(FAKE_HOME, { recursive: true, force: true }))

describe("validateCron rejects", () => {
  const bad: Array<[string, string]> = [
    ["0 9 * *", "four fields — the typo that crash-looped the daemon"],
    ["* * * * * *", "six fields"],
    ["", "empty"],
    ["   ", "whitespace only"],
    ["*/0 * * * *", "zero step — the expression that hung the daemon"],
    ["0-59/0 * * * *", "zero step on an explicit range"],
    ["* */0 * * *", "zero step in another field"],
    ["*/-1 * * * *", "negative step"],
    ["99 * * * *", "minute out of range"],
    ["* 24 * * *", "hour out of range"],
    ["* * 0 * *", "day-of-month below range"],
    ["* * * 13 *", "month out of range"],
    ["* * * * 7", "day-of-week out of range"],
    ["30-10 * * * *", "inverted range"],
    ["* * 20-5 * *", "inverted range on day-of-month"],
    ["abc * * * *", "not a number"],
    ["* * * JAN *", "month names are not supported"],
    ["1,,2 * * * *", "empty list term"],
    ["1- * * * *", "truncated range"],
    ["*/ * * * *", "missing step"],
    ["1-2-3 * * * *", "malformed range"],
    [`${"0-59,".repeat(200)}0 * * * *`, "absurdly long expression"],
  ]

  for (const [expression, why] of bad) {
    test(`${JSON.stringify(expression).slice(0, 40)} — ${why}`, () => {
      const problem = validateCron(expression)
      expect(problem).toBeString()
      expect(problem!.length).toBeGreaterThan(0)
    })
  }

  test("the reason names the field that is wrong", () => {
    expect(validateCron("* 24 * * *")).toContain("hour")
    expect(validateCron("* * * * 7")).toContain("day-of-week")
    expect(validateCron("0 9 * *")).toContain("5 fields")
  })

  test("matchesCron throws a message carrying the expression", () => {
    expect(() => matchesCron("0 9 * *", new Date())).toThrow(/0 9 \* \*/)
    expect(() => matchesCron("*/0 * * * *", new Date())).toThrow(/step must be 1 or more/)
  })
})

describe("validateCron accepts", () => {
  const good = [
    "* * * * *",
    "*/5 * * * *",
    "*/15 * * * *",
    "*/30 * * * *",
    "0 3 * * *",
    "0 23 * * *",
    "0 4 * * 0",
    "0 7 * * *",
    "1,15,30 * * * *",
    "0 9-17 * * 1-5",
    "0 0-23/2 * * *",
    "5/10 * * * *",
    "0 0 1 1 *",
    "59 23 31 12 6",
    "  0   3  *  *  *  ",
  ]

  for (const expression of good) {
    test(JSON.stringify(expression), () => {
      expect(validateCron(expression)).toBeNull()
    })
  }

  test("every schedule in the shipped PULSE.toml validates", () => {
    const toml = readFileSync(join(import.meta.dir, "../../LIFEOS/PULSE/PULSE.toml"), "utf-8")
    const schedules = [...toml.matchAll(/^\s*\w*schedule\s*=\s*"([^"]+)"/gm)].map((m) => m[1])
    expect(schedules.length).toBeGreaterThan(0)
    for (const schedule of schedules) {
      expect([schedule, validateCron(schedule)]).toEqual([schedule, null])
    }
  })
})

describe("matchesCron still evaluates valid expressions", () => {
  // 2026-01-05 is a Monday. Local time — matchesCron reads local date parts.
  const monday0930 = new Date(2026, 0, 5, 9, 30, 0)

  test("wildcard matches anything", () => {
    expect(matchesCron("* * * * *", monday0930)).toBe(true)
  })

  test("step form matches on the step and misses off it", () => {
    expect(matchesCron("*/15 * * * *", monday0930)).toBe(true)
    expect(matchesCron("*/15 * * * *", new Date(2026, 0, 5, 9, 31, 0))).toBe(false)
    expect(matchesCron("*/30 * * * *", monday0930)).toBe(true)
  })

  test("exact minute and hour", () => {
    expect(matchesCron("30 9 * * *", monday0930)).toBe(true)
    expect(matchesCron("30 10 * * *", monday0930)).toBe(false)
  })

  test("list form", () => {
    expect(matchesCron("0,30,45 * * * *", monday0930)).toBe(true)
    expect(matchesCron("0,15,45 * * * *", monday0930)).toBe(false)
  })

  test("range form on hour and day-of-week", () => {
    expect(matchesCron("30 9-17 * * 1-5", monday0930)).toBe(true)
    expect(matchesCron("30 9-17 * * 6", monday0930)).toBe(false)
    expect(matchesCron("30 10-17 * * 1-5", monday0930)).toBe(false)
  })

  test("weekly and monthly forms", () => {
    expect(matchesCron("0 4 * * 0", new Date(2026, 0, 4, 4, 0, 0))).toBe(true)
    expect(matchesCron("0 4 * * 0", monday0930)).toBe(false)
    expect(matchesCron("0 0 1 1 *", new Date(2026, 0, 1, 0, 0, 0))).toBe(true)
  })

  test("bare number with a step counts up from that number", () => {
    expect(matchesCron("5/10 * * * *", new Date(2026, 0, 5, 9, 25, 0))).toBe(true)
    expect(matchesCron("5/10 * * * *", new Date(2026, 0, 5, 9, 26, 0))).toBe(false)
  })
})

describe("isDue", () => {
  const monday0930 = new Date(2026, 0, 5, 9, 30, 0)

  test("due when the schedule matches and it has never run", () => {
    expect(isDue("*/15 * * * *", monday0930)).toBe(true)
  })

  test("not due twice in the same minute", () => {
    expect(isDue("*/15 * * * *", monday0930, monday0930.getTime())).toBe(false)
  })

  test("due again in a later matching minute", () => {
    expect(isDue("*/15 * * * *", monday0930, monday0930.getTime() - 15 * 60_000)).toBe(true)
  })
})

describe("loadConfig", () => {
  function daemonDirWith(toml: string): string {
    const dir = mkdtempSync(join(tmpdir(), "pulse-cron-cfg-"))
    writeFileSync(join(dir, "PULSE.toml"), toml)
    return dir
  }

  const CONFIG = `
[[job]]
name = "typo-schedule"
schedule = "0 9 * *"
type = "script"
command = "echo hi"
output = "log"
enabled = true

[[job]]
name = "zero-step"
schedule = "*/0 * * * *"
type = "script"
command = "echo hi"
output = "log"
enabled = true

[[job]]
name = "healthy"
schedule = "*/5 * * * *"
type = "script"
command = "echo hi"
output = "log"
enabled = true
`

  test("a bad schedule disables one job and leaves the rest running", async () => {
    const dir = daemonDirWith(CONFIG)
    try {
      const config = await loadConfig(dir)
      const byName = new Map(config.jobs.map((j: { name: string }) => [j.name, j]))

      expect(byName.size).toBe(3)

      // Kept in the list so the dashboard can show it, but never scheduled.
      expect(byName.get("typo-schedule").enabled).toBe(false)
      expect(byName.get("typo-schedule").scheduleError).toContain("5 fields")
      expect(byName.get("zero-step").enabled).toBe(false)
      expect(byName.get("zero-step").scheduleError).toContain("step")

      expect(byName.get("healthy").enabled).toBe(true)
      expect(byName.get("healthy").scheduleError).toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("Anti: loading a config with a bad schedule does not throw", async () => {
    const dir = daemonDirWith(CONFIG)
    try {
      await expect(loadConfig(dir)).resolves.toBeDefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

test("Anti: a pathological expression cannot hang the process", async () => {
  // Bounded on purpose: the child is killed after 3s, inside the default 5s
  // test budget. Before the fix these expressions never returned.
  const script = `
    const { validateCron, matchesCron } = await import(${JSON.stringify(LIB_PATH)})
    const pathological = ["*/0 * * * *", "0-59/0 * * * *", "* */0 * * *", "*/0 */0 */0 */0 */0"]
    for (const expr of pathological) {
      if (validateCron(expr) === null) { console.log("ACCEPTED " + expr); process.exit(2) }
      let threw = false
      try { matchesCron(expr, new Date()) } catch { threw = true }
      if (!threw) { console.log("NO THROW " + expr); process.exit(3) }
    }
    console.log("BOUNDED")
  `

  await using proc = Bun.spawn({
    cmd: [process.execPath, "-e", script],
    stdout: "pipe",
    stderr: "pipe",
  })
  const kill = setTimeout(() => proc.kill("SIGKILL"), 3_000)
  const [stdout, stderr, exitCode] = await Promise.all([
    proc.stdout.text(),
    proc.stderr.text(),
    proc.exited,
  ])
  clearTimeout(kill)

  expect(stderr).toBe("")
  expect(stdout.trim()).toBe("BOUNDED")
  expect(exitCode).toBe(0)
})
