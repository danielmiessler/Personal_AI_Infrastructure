import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";

describe("GenerateSummary", () => {
  const testDir = join(tmpdir(), `pai-generate-summary-test-${Date.now()}`);
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mkdirSync(join(testDir, "skills"), { recursive: true });
    mkdirSync(join(testDir, "history"), { recursive: true });
    process.env.PAI_DIR = testDir;
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}

    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);

    // Clear module cache
    const modulePath = require.resolve("../GenerateSummary");
    delete require.cache[modulePath];
  });

  describe("parseJsonlEntries", () => {
    test("parses JSONL content correctly", () => {
      const { parseJsonlEntries } = require("../GenerateSummary");

      const content = `{"timestamp":"2026-01-01T10:00:00Z","skill":"Brainstorming"}
{"timestamp":"2026-01-02T10:00:00Z","skill":"ExecutingPlans"}
{"timestamp":"2026-01-03T10:00:00Z","skill":"Brainstorming"}`;

      const entries = parseJsonlEntries(content);

      expect(entries.length).toBe(3);
      expect(entries[0].skill).toBe("Brainstorming");
      expect(entries[1].skill).toBe("ExecutingPlans");
    });

    test("handles empty lines gracefully", () => {
      const { parseJsonlEntries } = require("../GenerateSummary");

      const content = `{"skill":"Test1"}

{"skill":"Test2"}
`;

      const entries = parseJsonlEntries(content);
      expect(entries.length).toBe(2);
    });

    test("handles malformed JSON lines", () => {
      const { parseJsonlEntries } = require("../GenerateSummary");

      const content = `{"skill":"Valid"}
{invalid json
{"skill":"AlsoValid"}`;

      const entries = parseJsonlEntries(content);
      expect(entries.length).toBe(2);
      expect(entries[0].skill).toBe("Valid");
      expect(entries[1].skill).toBe("AlsoValid");
    });

    test("handles empty content", () => {
      const { parseJsonlEntries } = require("../GenerateSummary");

      const entries = parseJsonlEntries("");
      expect(entries.length).toBe(0);
    });
  });

  describe("aggregateBySkill", () => {
    test("counts skill invocations correctly", () => {
      const { aggregateBySkill } = require("../GenerateSummary");

      const entries = [
        { skill: "Brainstorming" },
        { skill: "ExecutingPlans" },
        { skill: "Brainstorming" },
        { skill: "Brainstorming" },
        { skill: "WritingPlans" },
      ];

      const counts = aggregateBySkill(entries);

      expect(counts.get("Brainstorming")).toBe(3);
      expect(counts.get("ExecutingPlans")).toBe(1);
      expect(counts.get("WritingPlans")).toBe(1);
    });

    test("handles empty entries array", () => {
      const { aggregateBySkill } = require("../GenerateSummary");

      const counts = aggregateBySkill([]);
      expect(counts.size).toBe(0);
    });
  });

  describe("filterByDateRange", () => {
    test("filters entries within date range", () => {
      const { filterByDateRange } = require("../GenerateSummary");

      const entries = [
        { skill: "A", timestamp: "2026-01-01T10:00:00Z" },
        { skill: "B", timestamp: "2026-01-05T10:00:00Z" },
        { skill: "C", timestamp: "2026-01-10T10:00:00Z" },
      ];

      const filtered = filterByDateRange(entries, new Date("2026-01-03"), new Date("2026-01-07"));

      expect(filtered.length).toBe(1);
      expect(filtered[0].skill).toBe("B");
    });

    test("includes entries on boundary dates", () => {
      const { filterByDateRange } = require("../GenerateSummary");

      const entries = [
        { skill: "A", timestamp: "2026-01-05T00:00:00Z" },
        { skill: "B", timestamp: "2026-01-05T12:00:00Z" },
        { skill: "C", timestamp: "2026-01-05T23:59:59Z" },
      ];

      const filtered = filterByDateRange(
        entries,
        new Date("2026-01-05T00:00:00Z"),
        new Date("2026-01-05T23:59:59Z")
      );

      expect(filtered.length).toBe(3);
    });

    test("returns empty array when no matches", () => {
      const { filterByDateRange } = require("../GenerateSummary");

      const entries = [{ skill: "A", timestamp: "2026-01-01T10:00:00Z" }];

      const filtered = filterByDateRange(
        entries,
        new Date("2026-02-01"),
        new Date("2026-02-28")
      );

      expect(filtered.length).toBe(0);
    });
  });
});
