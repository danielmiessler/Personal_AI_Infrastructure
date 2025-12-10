/**
 * Ingest Pipeline Tests
 *
 * Bun test integration for the ingest pipeline.
 * Run with: bun test
 */

import { describe, it, expect, beforeAll } from "bun:test";
import { runTest } from "./framework/runner";
import { fixtureExists } from "./framework/capture";
import { scopeIngestSpecs } from "./specs/scope.spec";
import { dateIngestSpecs } from "./specs/date.spec";
import { archiveIngestSpecs } from "./specs/archive.spec";
import { regressionIngestSpecs } from "./specs/regression.spec";
import type { TestSpec } from "./framework/types";

// =============================================================================
// Test Helper
// =============================================================================

function runSpecTests(specs: TestSpec[], suiteName: string) {
  describe(suiteName, () => {
    for (const spec of specs) {
      // Skip tests without fixtures
      const hasFixture = fixtureExists(spec.id);

      if (!hasFixture) {
        it.skip(`${spec.id}: ${spec.name} (no fixture)`, () => {});
        continue;
      }

      // Skip tests marked as skip
      if (spec.meta?.skip) {
        it.skip(`${spec.id}: ${spec.name} (${spec.meta.skip})`, () => {});
        continue;
      }

      it(`${spec.id}: ${spec.name}`, async () => {
        const result = await runTest(spec.id, { verbose: false });

        if (!result.passed) {
          const failedChecks = result.checks
            .filter(c => !c.passed)
            .map(c => `${c.name}: ${c.error || "failed"}`)
            .join("\n  ");

          throw new Error(
            `Test failed:\n  ${failedChecks}${result.error ? `\n  Error: ${result.error}` : ""}`
          );
        }

        expect(result.passed).toBe(true);
      });
    }
  });
}

// =============================================================================
// Test Suites
// =============================================================================

describe("Ingest Pipeline Tests", () => {
  // Scope Tests
  runSpecTests(scopeIngestSpecs, "Scope Tests");

  // Date Tests
  runSpecTests(dateIngestSpecs, "Date Tests");

  // Archive Tests
  runSpecTests(archiveIngestSpecs, "Archive Tests");

  // Regression Tests
  runSpecTests(regressionIngestSpecs, "Regression Tests");
});

// =============================================================================
// Unit Tests (no fixtures needed)
// =============================================================================

describe("Unit Tests", () => {
  describe("Spec Loading", () => {
    it("should load all specs", async () => {
      const { allIngestSpecs } = await import("./specs");
      expect(allIngestSpecs.length).toBeGreaterThan(0);
    });

    it("should have unique test IDs", async () => {
      const { allIngestSpecs } = await import("./specs");
      const ids = allIngestSpecs.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have valid fixture paths", async () => {
      const { allIngestSpecs } = await import("./specs");
      for (const spec of allIngestSpecs) {
        expect(spec.fixture).toMatch(/^(scope|date|archive|regression)\//);
        expect(spec.fixture).toEndWith(".json");
      }
    });
  });

  describe("Spec Counts", () => {
    it("should have scope tests", async () => {
      const { getSpecsByCategory } = await import("./specs");
      const scopeSpecs = getSpecsByCategory("scope");
      expect(scopeSpecs.length).toBeGreaterThan(5);
    });

    it("should have date tests", async () => {
      const { getSpecsByCategory } = await import("./specs");
      const dateSpecs = getSpecsByCategory("date");
      expect(dateSpecs.length).toBeGreaterThan(5);
    });

    it("should have archive tests", async () => {
      const { getSpecsByCategory } = await import("./specs");
      const archiveSpecs = getSpecsByCategory("archive");
      expect(archiveSpecs.length).toBeGreaterThan(3);
    });

    it("should have regression tests", async () => {
      const { getSpecsByCategory } = await import("./specs");
      const regressionSpecs = getSpecsByCategory("regression");
      expect(regressionSpecs.length).toBeGreaterThan(5);
    });
  });
});
