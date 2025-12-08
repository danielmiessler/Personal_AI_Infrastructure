/**
 * Unit tests for parseSince() function
 *
 * Tests all supported date format parsing:
 * - Relative: "7d", "2w", "1m"
 * - Named: "today", "yesterday", "this week", "this month"
 * - ISO: "2025-12-01"
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { parseSince } from "../../lib/search";

describe("parseSince", () => {
  // Use a fixed "now" for predictable tests
  let originalDate: typeof Date;
  const MOCK_NOW = new Date("2025-12-08T12:00:00.000Z");

  beforeEach(() => {
    // Mock Date.now() for predictable tests
    originalDate = global.Date;
    const MockDate = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(MOCK_NOW.getTime());
        } else {
          // @ts-ignore
          super(...args);
        }
      }
      static now() {
        return MOCK_NOW.getTime();
      }
    } as typeof Date;
    global.Date = MockDate;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  describe("relative formats", () => {
    it("parses '7d' as 7 days ago", () => {
      const result = parseSince("7d");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-01");
    });

    it("parses '2w' as 14 days ago", () => {
      const result = parseSince("2w");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-11-24");
    });

    it("parses '1m' as 30 days ago", () => {
      const result = parseSince("1m");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-11-08");
    });

    it("parses uppercase '7D' as 7 days ago", () => {
      const result = parseSince("7D");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-01");
    });

    it("returns null for invalid relative format", () => {
      expect(parseSince("7x")).toBeNull();
      expect(parseSince("abc")).toBeNull();
      expect(parseSince("")).toBeNull();
    });
  });

  describe("named formats", () => {
    it("parses 'today' as start of today", () => {
      const result = parseSince("today");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-08");
      expect(result!.getHours()).toBe(0);
      expect(result!.getMinutes()).toBe(0);
    });

    it("parses 'yesterday' as start of yesterday", () => {
      const result = parseSince("yesterday");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-07");
    });

    it("parses 'this week' as Monday of current week", () => {
      // 2025-12-08 is a Monday
      const result = parseSince("this week");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-08");
    });

    it("parses 'this month' as first of current month", () => {
      const result = parseSince("this month");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-01");
    });

    it("is case insensitive", () => {
      expect(parseSince("TODAY")).not.toBeNull();
      expect(parseSince("Today")).not.toBeNull();
      expect(parseSince("THIS WEEK")).not.toBeNull();
    });
  });

  describe("ISO date format", () => {
    it("parses valid ISO date 'YYYY-MM-DD'", () => {
      const result = parseSince("2025-12-01");
      expect(result).not.toBeNull();
      expect(result!.toISOString().split("T")[0]).toBe("2025-12-01");
    });

    it("parses past dates", () => {
      const result = parseSince("2024-01-15");
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2024);
      expect(result!.getMonth()).toBe(0); // January
      expect(result!.getDate()).toBe(15);
    });

    it("returns null for invalid ISO format", () => {
      expect(parseSince("2025-13-01")).toBeNull(); // Invalid month
      expect(parseSince("2025-1-1")).toBeNull(); // Missing leading zeros
      expect(parseSince("25-12-01")).toBeNull(); // Short year
    });
  });

  describe("edge cases", () => {
    it("returns null for empty string", () => {
      expect(parseSince("")).toBeNull();
    });

    it("handles whitespace", () => {
      expect(parseSince("  today  ")).not.toBeNull();
      expect(parseSince(" 7d ")).not.toBeNull();
    });

    it("returns null for random strings", () => {
      expect(parseSince("foo")).toBeNull();
      expect(parseSince("last week")).toBeNull(); // Not supported
      expect(parseSince("next month")).toBeNull(); // Not supported
    });
  });
});
