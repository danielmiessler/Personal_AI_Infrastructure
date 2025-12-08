/**
 * Integration tests for obs search date filters
 *
 * Tests --since, --modified, and --created filters against
 * an ephemeral test vault with controlled dates.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { createTestVault, TestVault, getDaysAgo } from "../setup";
import { searchNotes, SearchOptions } from "../../lib/search";
import { TEST_NOTES } from "../fixtures/notes";

describe("search date filters", () => {
  let vault: TestVault;
  let originalVaultPath: string | undefined;

  beforeAll(() => {
    vault = createTestVault();
    originalVaultPath = process.env.OBSIDIAN_VAULT_PATH;
    process.env.OBSIDIAN_VAULT_PATH = vault.path;
  });

  afterAll(() => {
    if (originalVaultPath !== undefined) {
      process.env.OBSIDIAN_VAULT_PATH = originalVaultPath;
    } else {
      delete process.env.OBSIDIAN_VAULT_PATH;
    }
    vault.cleanup();
  });

  describe("--since filter (capture date from frontmatter)", () => {
    it("returns all recent work notes with --since 7d --scope all", async () => {
      const results = await searchNotes({
        tags: [],
        since: getDaysAgo(7),
        scope: "all",
      });

      // Should include notes captured in last 7 days
      // recent-work (0d), no-scope (3d), modified-recently (1d mtime, but 23d capture date - excluded)
      // no-frontmatter-date (2d mtime, no capture date - uses mtime fallback)
      // incoming-work (1d)
      expect(results.length).toBeGreaterThanOrEqual(3);

      const names = results.map((r) => r.name);
      expect(names).toContain("2025-12-08-Recent-Work-Note");
      expect(names).toContain("2025-12-07-Incoming-Work");
    });

    it("returns only today's notes with --since today --scope all", async () => {
      const results = await searchNotes({
        tags: [],
        since: getDaysAgo(0),
        scope: "all",
      });

      // Only "recent-work" was captured today
      const names = results.map((r) => r.name);
      expect(names).toContain("2025-12-08-Recent-Work-Note");
      expect(names).not.toContain("2025-11-08-Month-Old-Private");
    });

    it("combines --since with tag filter", async () => {
      const results = await searchNotes({
        tags: ["project/test"],
        since: getDaysAgo(7),
        scope: "all",
      });

      // Only project/test notes from last 7 days
      const allHaveTag = results.every((r) =>
        r.tags.some((t) => t.includes("project/test"))
      );
      expect(allHaveTag).toBe(true);
    });
  });

  describe("--modified filter (file mtime)", () => {
    it("finds recently modified files regardless of capture date", async () => {
      const results = await searchNotes({
        tags: [],
        modified: getDaysAgo(2),
        scope: "all",
      });

      // Should include all files modified in last 2 days
      // This includes "modified-recently" which has old capture date but recent mtime
      const names = results.map((r) => r.name);
      expect(names).toContain("2025-12-08-Recent-Work-Note"); // mtime 0d
      expect(names).toContain("2025-11-15-Modified-Recently"); // mtime 1d
      expect(names).toContain("2025-12-07-Incoming-Work"); // mtime 1d
    });

    it("excludes files with older modification times", async () => {
      const results = await searchNotes({
        tags: [],
        modified: getDaysAgo(2),
        scope: "all",
      });

      const names = results.map((r) => r.name);
      // 7-day old and 30-day old files should be excluded
      expect(names).not.toContain("2025-12-01-Week-Old-Work");
      expect(names).not.toContain("2025-11-08-Month-Old-Private");
      expect(names).not.toContain("2025-09-01-Very-Old-Note");
    });
  });

  describe("--scope filter interaction", () => {
    it("default scope=work excludes private and unscoped notes", async () => {
      const results = await searchNotes({
        tags: [],
        // Default scope is "work"
      });

      const names = results.map((r) => r.name);
      // Should NOT include private or no-scope notes
      expect(names).not.toContain("2025-11-08-Month-Old-Private");
      expect(names).not.toContain("2025-12-05-No-Scope-Tag");
    });

    it("scope=private only shows private notes", async () => {
      const results = await searchNotes({
        tags: [],
        scope: "private",
      });

      // Should include private and unscoped notes
      const names = results.map((r) => r.name);
      expect(names).toContain("2025-11-08-Month-Old-Private");
      expect(names).toContain("2025-12-05-No-Scope-Tag");

      // Should NOT include work-scoped notes
      expect(names).not.toContain("2025-12-08-Recent-Work-Note");
    });

    it("scope=all shows everything", async () => {
      const results = await searchNotes({
        tags: [],
        scope: "all",
      });

      // Should have all test notes
      expect(results.length).toBe(TEST_NOTES.length);
    });
  });

  describe("combined filters", () => {
    it("combines --since, --scope, and --tag", async () => {
      const results = await searchNotes({
        tags: ["project/test"],
        since: getDaysAgo(14),
        scope: "work",
      });

      // Only work-scoped project/test notes from last 2 weeks
      for (const result of results) {
        expect(result.tags).toContain("scope/work");
        expect(result.tags.some((t) => t.includes("project/test"))).toBe(true);
      }
    });

    it("returns empty array when filters have no overlap", async () => {
      const results = await searchNotes({
        tags: ["nonexistent-tag"],
        since: getDaysAgo(1),
        scope: "work",
      });

      expect(results.length).toBe(0);
    });
  });

  describe("sort order", () => {
    it("results are sorted by capture date (most recent first)", async () => {
      const results = await searchNotes({
        tags: [],
        scope: "all",
      });

      // Verify descending order by capture date
      for (let i = 1; i < results.length; i++) {
        const prevDate = results[i - 1].captureDate || results[i - 1].mtime;
        const currDate = results[i].captureDate || results[i].mtime;
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });
  });

  describe("--recent limit", () => {
    it("limits results to specified count", async () => {
      const results = await searchNotes({
        tags: [],
        scope: "all",
        recent: 3,
      });

      expect(results.length).toBe(3);
    });

    it("returns fewer if not enough notes match", async () => {
      const results = await searchNotes({
        tags: ["meeting"], // Only "recent-work" has this tag
        scope: "all",
        recent: 10,
      });

      expect(results.length).toBeLessThan(10);
    });
  });
});
