/**
 * Usage days are cut in the principal's timezone, consistently across the
 * UsageAggregator (usage-daily.jsonl), the Usage tab and the Performance tab.
 *
 * One synthetic instant, 2026-03-09T03:00:00Z: March 9 in UTC, still March 8 in
 * America/Bogota (UTC-5, no DST). Every site must agree on the local day when a
 * zone is configured, and must reproduce the UTC day when no config is found.
 *
 * Run: cd LIFEOS/PULSE && bun test   (bun:test + node builtins only; writes to a temp dir)
 */
import { afterAll, beforeAll, describe, expect, setSystemTime, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INSTANT = "2026-03-09T03:00:00.000Z";
const UTC_DAY = "2026-03-09";
const BOGOTA_DAY = "2026-03-08";

const PULSE_DIR = join(import.meta.dir, "..");
const TOOLS_DIR = join(PULSE_DIR, "..", "TOOLS");
const AGGREGATOR = join(TOOLS_DIR, "UsageAggregator.ts");

const root = mkdtempSync(join(tmpdir(), "lifeos-day-key-"));
// Pulse modules read HOME / CLAUDE_CONFIG_DIR at import time; the aggregator gets its own tree
// because it overwrites usage-daily.jsonl, which the Usage tab fixture must keep.
const home = join(root, "home");
const pulseObsDir = join(home, ".claude", "LIFEOS", "MEMORY", "OBSERVABILITY");
const aggDir = join(root, "agg");
const aggObsDir = join(aggDir, "LIFEOS", "MEMORY", "OBSERVABILITY");
const configs = {
  bogota: join(root, "bogota.toml"),
  invalid: join(root, "invalid-zone.toml"),
  missing: join(root, "does-not-exist.toml"),
};
const originalEnv = {
  HOME: process.env.HOME,
  CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR,
  LIFEOS_CONFIG_PATH: process.env.LIFEOS_CONFIG_PATH,
};

const configToml = (timezone: string) =>
  `[principal]\nname = "Test Principal"\ntimezone = "${timezone}"\n\n[da]\nname = "Test DA"\n\n[da.voices.main]\nvoice_id = "voice-test"\n`;
const jsonl = (rows: object[]) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
const session = {
  sessionId: "session-a", firstTimestamp: INSTANT, lastTimestamp: INSTANT, messageCount: 1,
  totalTokens: 1000, costTotal: 1, primaryModel: "test-model", models: { "test-model": 1 },
};

beforeAll(() => {
  mkdirSync(pulseObsDir, { recursive: true });
  mkdirSync(aggObsDir, { recursive: true });
  mkdirSync(join(aggDir, "projects", "proj-test"), { recursive: true });
  writeFileSync(configs.bogota, configToml("America/Bogota"));
  writeFileSync(configs.invalid, configToml("Not/AZone"));

  // Aggregator sources: a session rollup and a live transcript message, both at INSTANT.
  writeFileSync(join(aggObsDir, "session-costs.jsonl"), jsonl([session]));
  writeFileSync(join(aggDir, "projects", "proj-test", "session-b.jsonl"), jsonl([
    { type: "assistant", sessionId: "session-b", timestamp: INSTANT, message: { model: "test-model", usage: { input_tokens: 10, output_tokens: 5 } } },
  ]));

  // Performance tab sources at the same instant.
  writeFileSync(join(pulseObsDir, "session-costs.jsonl"), jsonl([session]));
  writeFileSync(join(pulseObsDir, "tool-failures.jsonl"), jsonl([{ timestamp: INSTANT, tool_name: "Bash" }]));
  writeFileSync(join(pulseObsDir, "tool-activity.jsonl"), jsonl([{ timestamp: INSTANT, tool_name: "Bash" }]));

  // Usage tab store: which rows count as "today" and "this week" depends on the zone.
  writeFileSync(join(pulseObsDir, "usage-daily.jsonl"), jsonl([
    { date: "2026-03-01", messages: 1, totalTokens: 1, costUsd: 1, models: {} },
    { date: BOGOTA_DAY, messages: 1, totalTokens: 10, costUsd: 10, models: {} },
    { date: UTC_DAY, messages: 1, totalTokens: 100, costUsd: 100, models: {} },
  ]));

  process.env.HOME = home;
  process.env.CLAUDE_CONFIG_DIR = join(home, ".claude");
  setSystemTime(new Date(INSTANT));
});

afterAll(() => {
  setSystemTime();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(root, { recursive: true, force: true });
});

function runAggregator(configPath: string): Array<{ date: string; messages: number }> {
  const env = { ...process.env, HOME: originalEnv.HOME ?? "", CLAUDE_CONFIG_DIR: aggDir, LIFEOS_CONFIG_PATH: configPath };
  const run = Bun.spawnSync([process.execPath, AGGREGATOR], { env, cwd: TOOLS_DIR, stdout: "pipe", stderr: "pipe" });
  if (run.exitCode !== 0) throw new Error(`UsageAggregator exited ${run.exitCode}: ${run.stderr.toString()}`);
  return readFileSync(join(aggObsDir, "usage-daily.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

async function usageSummary() {
  const usage = await import("../modules/usage.ts");
  const res = await usage.handleRequest(new Request("http://localhost/api/usage/summary"), "/api/usage/summary");
  return (await res!.json()) as { today: { costUsd: number }; week: { costUsd: number } };
}

async function performanceDays() {
  const perf = await import("../Performance/module.ts");
  perf.startPerformance({ enabled: true });
  const get = async (path: string) => (await perf.handlePerformanceRequest(new Request(`http://localhost${path}`)))!.json();
  const cost = await get("/api/performance/cost");
  const failures = await get("/api/performance/failures");
  return {
    dailyCosts: cost.dailyCosts.map((d: { day: string }) => d.day),
    trend: failures.trend.map((d: { day: string }) => d.day),
  };
}

describe("LifeosConfig day helpers", () => {
  test("dayKey cuts an instant in the given zone and rejects what does not parse", async () => {
    const { dayKey } = await import("../../TOOLS/LifeosConfig");
    expect(dayKey(INSTANT, "America/Bogota")).toBe(BOGOTA_DAY);
    expect(dayKey(INSTANT, "UTC")).toBe(UTC_DAY);
    expect(dayKey("2026-03-08T22:00:00-05:00", "America/Bogota")).toBe(BOGOTA_DAY); // hook-style offset stamp
    expect(dayKey("", "UTC")).toBeNull();
    expect(dayKey("not a timestamp", "UTC")).toBeNull();
  });

  test("principalTimeZone reads the config and falls back to UTC on a missing or unknown zone", async () => {
    const { principalTimeZone } = await import("../../TOOLS/LifeosConfig");
    process.env.LIFEOS_CONFIG_PATH = configs.bogota;
    expect(principalTimeZone()).toBe("America/Bogota");
    process.env.LIFEOS_CONFIG_PATH = configs.invalid;
    expect(principalTimeZone()).toBe("UTC");
    process.env.LIFEOS_CONFIG_PATH = configs.missing;
    expect(principalTimeZone()).toBe("UTC");
  });
});

describe("UsageAggregator day bucket", () => {
  test("lands on the local day with a configured zone", () => {
    const rows = runAggregator(configs.bogota);
    expect(rows.map((r) => r.date)).toEqual([BOGOTA_DAY]);
    expect(rows[0].messages).toBe(2); // the rollup session and the live transcript share the day
  });

  test("keeps the UTC day without a config", () => {
    const rows = runAggregator(configs.missing);
    expect(rows.map((r) => r.date)).toEqual([INSTANT.slice(0, 10)]);
  });
});

describe("Usage tab (modules/usage.ts)", () => {
  test("today and the week cut follow the local day", async () => {
    process.env.LIFEOS_CONFIG_PATH = configs.bogota;
    const summary = await usageSummary();
    expect(summary.today.costUsd).toBe(10); // March 8 locally
    expect(summary.week.costUsd).toBe(111); // March 1 is within 7 days of March 8
  });

  test("keeps the UTC day without a config", async () => {
    process.env.LIFEOS_CONFIG_PATH = configs.missing;
    const summary = await usageSummary();
    expect(summary.today.costUsd).toBe(100);
    expect(summary.week.costUsd).toBe(110);
  });
});

describe("Performance tab (Performance/module.ts)", () => {
  test("daily costs and the failure trend follow the local day", async () => {
    process.env.LIFEOS_CONFIG_PATH = configs.bogota;
    expect(await performanceDays()).toEqual({ dailyCosts: [BOGOTA_DAY], trend: [BOGOTA_DAY] });
  });

  test("keeps the UTC day without a config", async () => {
    process.env.LIFEOS_CONFIG_PATH = configs.missing;
    expect(await performanceDays()).toEqual({ dailyCosts: [UTC_DAY], trend: [UTC_DAY] });
  });
});
