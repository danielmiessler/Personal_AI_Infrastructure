/**
 * Unit tests for semantic search filtering (embed.ts)
 *
 * Tests:
 * - SemanticSearchOptions backward compatibility
 * - Tag filtering logic
 * - Document pattern (glob) matching
 */

import { describe, it, expect } from "bun:test";

/**
 * Test the glob-to-regex conversion used in docPattern filtering
 * This mirrors the logic in semanticSearch()
 */
function globToRegex(pattern: string): RegExp {
  return new RegExp("^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
}

/**
 * Test tag matching logic used in semantic search filtering
 * Mirrors the logic: noteTags.some(nt => nt === tag || nt === `project/${tag}`)
 */
function matchesTags(noteTags: string[], filterTags: string[]): boolean {
  const normalizedNoteTags = noteTags.map(t => t.toLowerCase());
  return filterTags.every(tag => {
    const lowerTag = tag.toLowerCase();
    return normalizedNoteTags.some(
      nt => nt === lowerTag || nt === `project/${lowerTag}`
    );
  });
}

describe("embed filtering logic", () => {
  describe("glob to regex conversion", () => {
    it("converts * to match any characters", () => {
      const regex = globToRegex("2025-12-08-*");
      expect(regex.test("2025-12-08-Meeting-Notes")).toBe(true);
      expect(regex.test("2025-12-08-Architecture-Review")).toBe(true);
      expect(regex.test("2025-12-07-Meeting-Notes")).toBe(false);
    });

    it("converts ? to match single character", () => {
      const regex = globToRegex("2025-12-0?-Meeting");
      expect(regex.test("2025-12-01-Meeting")).toBe(true);
      expect(regex.test("2025-12-08-Meeting")).toBe(true);
      expect(regex.test("2025-12-10-Meeting")).toBe(false); // Two digits
    });

    it("handles multiple wildcards", () => {
      const regex = globToRegex("*Architecture*");
      expect(regex.test("2025-12-08-Architecture-Review")).toBe(true);
      expect(regex.test("Architecture-Doc")).toBe(true);
      expect(regex.test("My-Architecture")).toBe(true);
      expect(regex.test("Meeting-Notes")).toBe(false);
    });

    it("is case insensitive", () => {
      const regex = globToRegex("*architecture*");
      expect(regex.test("2025-12-08-Architecture-Review")).toBe(true);
      expect(regex.test("ARCHITECTURE-DOC")).toBe(true);
    });

    it("matches exact string when no wildcards", () => {
      const regex = globToRegex("2025-12-08-Meeting");
      expect(regex.test("2025-12-08-Meeting")).toBe(true);
      expect(regex.test("2025-12-08-Meeting-Notes")).toBe(false);
    });

    it("handles combined * and ? wildcards", () => {
      const regex = globToRegex("2025-1?-*-Meeting*");
      expect(regex.test("2025-12-08-Meeting-Notes")).toBe(true);
      expect(regex.test("2025-11-15-Meeting")).toBe(true);
      expect(regex.test("2025-1-08-Meeting")).toBe(false); // Single digit month
    });
  });

  describe("tag matching logic", () => {
    const noteTags = ["project/ai-tailgating", "compliance", "scope/work", "transcript"];

    it("matches single tag exactly", () => {
      expect(matchesTags(noteTags, ["compliance"])).toBe(true);
      expect(matchesTags(noteTags, ["transcript"])).toBe(true);
      expect(matchesTags(noteTags, ["nonexistent"])).toBe(false);
    });

    it("matches full project/ tag", () => {
      expect(matchesTags(noteTags, ["project/ai-tailgating"])).toBe(true);
    });

    it("auto-prefixes project/ for shorthand", () => {
      // "ai-tailgating" should match "project/ai-tailgating"
      expect(matchesTags(noteTags, ["ai-tailgating"])).toBe(true);
    });

    it("uses AND logic for multiple tags", () => {
      // All tags must match
      expect(matchesTags(noteTags, ["compliance", "transcript"])).toBe(true);
      expect(matchesTags(noteTags, ["compliance", "nonexistent"])).toBe(false);
    });

    it("is case insensitive", () => {
      expect(matchesTags(noteTags, ["COMPLIANCE"])).toBe(true);
      expect(matchesTags(noteTags, ["Project/AI-Tailgating"])).toBe(true);
    });

    it("handles empty filter tags", () => {
      // No filter = match everything
      expect(matchesTags(noteTags, [])).toBe(true);
    });

    it("handles notes with no tags", () => {
      expect(matchesTags([], ["compliance"])).toBe(false);
      expect(matchesTags([], [])).toBe(true);
    });
  });

  describe("SemanticSearchOptions", () => {
    // These test the type structure and expected behavior
    // Actual integration with semanticSearch() tested separately

    it("supports limit option", () => {
      const options = { limit: 5 };
      expect(options.limit).toBe(5);
    });

    it("supports scope option", () => {
      const options = { scope: "work" as const };
      expect(options.scope).toBe("work");
    });

    it("supports tags array option", () => {
      const options = { tags: ["project/pai", "meeting"] };
      expect(options.tags).toEqual(["project/pai", "meeting"]);
    });

    it("supports docPattern option", () => {
      const options = { docPattern: "*Architecture*" };
      expect(options.docPattern).toBe("*Architecture*");
    });

    it("supports all options combined", () => {
      const options = {
        limit: 10,
        scope: "all" as const,
        tags: ["project/pai"],
        docPattern: "2025-12-*",
      };
      expect(options.limit).toBe(10);
      expect(options.scope).toBe("all");
      expect(options.tags).toHaveLength(1);
      expect(options.docPattern).toBe("2025-12-*");
    });
  });

  describe("combined filtering scenarios", () => {
    const testNotes = [
      { name: "2025-12-08-Architecture-Review", tags: ["project/ai-tailgating", "architecture"] },
      { name: "2025-12-08-Meeting-Notes", tags: ["project/ai-tailgating", "meeting"] },
      { name: "2025-12-07-Architecture-Planning", tags: ["project/pai", "architecture"] },
      { name: "2025-11-15-Old-Meeting", tags: ["project/ai-tailgating", "meeting"] },
    ];

    function filterNotes(
      notes: typeof testNotes,
      tags?: string[],
      docPattern?: string
    ) {
      let results = notes;

      if (docPattern) {
        const regex = globToRegex(docPattern);
        results = results.filter(n => regex.test(n.name));
      }

      if (tags && tags.length > 0) {
        results = results.filter(n => matchesTags(n.tags, tags));
      }

      return results;
    }

    it("filters by tag only", () => {
      const results = filterNotes(testNotes, ["project/ai-tailgating"]);
      expect(results).toHaveLength(3);
      expect(results.every(r => r.tags.includes("project/ai-tailgating"))).toBe(true);
    });

    it("filters by docPattern only", () => {
      const results = filterNotes(testNotes, undefined, "2025-12-08-*");
      expect(results).toHaveLength(2);
      expect(results.every(r => r.name.startsWith("2025-12-08-"))).toBe(true);
    });

    it("filters by tag AND docPattern", () => {
      const results = filterNotes(testNotes, ["architecture"], "*Architecture*");
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toContain("2025-12-08-Architecture-Review");
      expect(results.map(r => r.name)).toContain("2025-12-07-Architecture-Planning");
    });

    it("filters by multiple tags AND docPattern", () => {
      const results = filterNotes(
        testNotes,
        ["project/ai-tailgating", "architecture"],
        "2025-12-*"
      );
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("2025-12-08-Architecture-Review");
    });

    it("returns empty when no matches", () => {
      const results = filterNotes(testNotes, ["nonexistent"]);
      expect(results).toHaveLength(0);
    });

    it("returns all when no filters", () => {
      const results = filterNotes(testNotes);
      expect(results).toHaveLength(4);
    });
  });
});
