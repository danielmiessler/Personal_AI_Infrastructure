/**
 * Test Specifications Index
 *
 * Exports all test specs for use by the test runner.
 */

export { scopeSpecs, scopeIngestSpecs, scopeIngestionSpecs, scopeRetrievalSpecs } from "./scope.spec";
export { dateSpecs, dateIngestSpecs } from "./date.spec";
export { archiveSpecs, archiveIngestSpecs } from "./archive.spec";
export { regressionSpecs, regressionIngestSpecs } from "./regression.spec";
export { tagMatchingSpecs } from "./tag-matching.spec";

import { scopeIngestSpecs } from "./scope.spec";
import { dateIngestSpecs } from "./date.spec";
import { archiveIngestSpecs } from "./archive.spec";
import { regressionIngestSpecs } from "./regression.spec";
import { tagMatchingSpecs } from "./tag-matching.spec";
import type { TestSpec, TestCategory } from "../framework/types";

// =============================================================================
// All Specs
// =============================================================================

/** All test specs that can be run through the ingest pipeline */
export const allIngestSpecs: TestSpec[] = [
  ...scopeIngestSpecs,
  ...dateIngestSpecs,
  ...archiveIngestSpecs,
  ...regressionIngestSpecs,
  ...tagMatchingSpecs,
];

/** Get specs by category */
export function getSpecsByCategory(category: TestCategory): TestSpec[] {
  return allIngestSpecs.filter(spec => spec.category === category);
}

/** Get spec by ID */
export function getSpecById(id: string): TestSpec | undefined {
  return allIngestSpecs.find(spec => spec.id === id);
}

/** Get all spec IDs */
export function getAllSpecIds(): string[] {
  return allIngestSpecs.map(spec => spec.id);
}

// =============================================================================
// Summary Statistics
// =============================================================================

export function getSpecSummary(): {
  total: number;
  byCategory: Record<TestCategory, number>;
  byType: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const spec of allIngestSpecs) {
    byCategory[spec.category] = (byCategory[spec.category] || 0) + 1;
    byType[spec.input.type] = (byType[spec.input.type] || 0) + 1;
  }

  return {
    total: allIngestSpecs.length,
    byCategory: byCategory as Record<TestCategory, number>,
    byType,
  };
}
