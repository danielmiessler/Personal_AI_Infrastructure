import { describe, expect, test } from "bun:test";
import { calculateTrend, formatChange, formatDelta, type Observation } from "./GenerateAnalysis";

// All fixtures use fixed dates so the tests never depend on the wall clock.

/** Observations on the 1st of every `stepMonths` months from `from` to `to` (inclusive), skipping `skip` dates. */
function periodic(from: string, to: string, valueAt: (i: number) => number, skip: string[] = [], stepMonths = 1): Observation[] {
  const out: Observation[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  for (let i = 0; y < ty || (y === ty && m <= tm); i++) {
    const date = `${y}-${String(m).padStart(2, "0")}-01`;
    if (!skip.includes(date)) out.push({ date, value: valueAt(i) });
    m += stepMonths;
    while (m > 12) { m -= 12; y++; }
  }
  return out;
}

/** Business-day observations (Mon-Fri) from `from` to `to`, inclusive. */
function businessDaily(from: string, to: string, valueAt: (i: number) => number): Observation[] {
  const out: Observation[] = [];
  for (let d = new Date(from), i = 0; d <= new Date(to); d.setUTCDate(d.getUTCDate() + 1), i++) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push({ date: d.toISOString().slice(0, 10), value: valueAt(i) });
  }
  return out;
}

describe("calculateTrend anchors the window to the latest observation", () => {
  // Values rise 1.0 per observation, so the change equals the number of periods spanned.
  const monthly = periodic("2015-08", "2026-08", i => 100 + i);

  test("monthly series ending Aug 2026: 1Y start is Aug 2025 regardless of today", () => {
    const t = calculateTrend(monthly, 1)!;
    expect(t.endDate).toBe("2026-08-01");
    expect(t.startDate).toBe("2025-08-01");
    expect(t.change).toBe(12);
  });

  test("10Y window lands exactly ten years before the latest observation", () => {
    const t = calculateTrend(monthly, 10)!;
    expect(t.startDate).toBe("2016-08-01");
    expect(t.change).toBe(120);
  });

  test("quarterly series ending Q2 2026: 1Y start is Q2 2025", () => {
    const quarterly = periodic("2016-01", "2026-04", i => i, [], 3);
    const t = calculateTrend(quarterly, 1)!;
    expect(t.endDate).toBe("2026-04-01");
    expect(t.startDate).toBe("2025-04-01");
    expect(t.change).toBe(4);
  });

  test("missing observations next to the target do not shift the start", () => {
    // FRED returns "." for some periods; the caller drops them before windowing.
    const t = calculateTrend(periodic("2015-08", "2026-08", i => 100 + i, ["2025-07-01", "2025-09-01", "2025-10-01"]), 1)!;
    expect(t.startDate).toBe("2025-08-01");
    expect(t.change).toBe(12);
  });

  test("a missing target month returns null rather than a mislabelled 13-month window", () => {
    expect(calculateTrend(periodic("2015-08", "2026-08", i => 100 + i, ["2025-08-01"]), 1)).toBeNull();
  });

  test("quarterly series with a hole at the target returns null", () => {
    const quarterly = periodic("2016-01", "2026-04", i => i, ["2025-04-01"], 3);
    expect(calculateTrend(quarterly, 1)).toBeNull();
  });

  test("annual series: 1Y start is the prior year's observation", () => {
    const annual = periodic("2014-01", "2024-01", i => 40 + i, [], 12);
    const t = calculateTrend(annual, 1)!;
    expect(t.startDate).toBe("2023-01-01");
    expect(t.change).toBe(1);
  });

  test("sparse annual series with no point near the target returns null", () => {
    const obs: Observation[] = [
      { date: "2020-01-01", value: 40 },
      { date: "2024-01-01", value: 42 },
    ];
    expect(calculateTrend(obs, 1)).toBeNull(); // target 2023-01-01, nearest is 3 years away
  });

  test("daily series whose target falls on a weekend uses the nearest business day", () => {
    const daily = businessDaily("2025-06-02", "2026-08-31", i => i); // 2026-08-31 is a Monday
    const t = calculateTrend(daily, 1)!;
    expect(t.endDate).toBe("2026-08-31");
    expect(t.startDate).toBe("2025-09-01"); // 2025-08-31 is a Sunday; Monday (1 day) beats Friday (2 days)
  });

  test("fewer than two observations returns null", () => {
    expect(calculateTrend([{ date: "2026-08-01", value: 1 }], 1)).toBeNull();
    expect(calculateTrend([], 1)).toBeNull();
  });
});

describe("rate series are reported in percentage points", () => {
  test("change is in pp and direction uses a 0.1pp dead band", () => {
    const rate = periodic("2024-08", "2026-08", i => 4.5 - i * 0.05); // falls 0.05pp per month
    const t = calculateTrend(rate, 1, true)!;
    expect(t.unit).toBe("pp");
    expect(t.delta).toBeCloseTo(-0.6, 6);
    expect(t.direction).toBe("↓");
    expect(formatChange(t)).toBe("-0.60pp");
  });

  test("a flat rate series is '→' even though its percent change is not tiny", () => {
    const flat = periodic("2024-08", "2026-08", i => 0.5 + (i % 2) * 0.05); // wobbles 0.05pp around 0.5%
    expect(calculateTrend(flat, 1, true)!.direction).toBe("→");
  });

  test("level series report percent change", () => {
    const t = calculateTrend(periodic("2024-08", "2026-08", i => 300 + i), 1)!;
    expect(t.unit).toBe("%");
    expect(t.startDate).toBe("2025-08-01");
    expect(formatChange(t)).toBe("+3.8%"); // 312 -> 324 = +3.846%
  });

  test("formatChange and formatDelta handle missing or non-finite values", () => {
    expect(formatChange(null)).toBe("—");
    expect(formatDelta(Infinity, "%")).toBe("—");
    expect(formatDelta(0.734, "pp")).toBe("+0.73pp");
  });
});
