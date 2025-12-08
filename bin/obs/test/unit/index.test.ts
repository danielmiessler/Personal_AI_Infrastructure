/**
 * Unit tests for index formatting and selection parsing
 *
 * Tests:
 * - parseSelection() for various selection formats
 * - toIndexedResults() conversion
 * - formatIndexTable() output formatting
 */

import { describe, it, expect } from "bun:test";
import {
  parseSelection,
  toIndexedResults,
  toSemanticIndexedResults,
  formatIndexTable,
} from "../../lib/index";
import { SearchResult } from "../../lib/search";

describe("parseSelection", () => {
  describe("single numbers", () => {
    it("parses single number", () => {
      expect(parseSelection("1", 10)).toEqual([1]);
      expect(parseSelection("5", 10)).toEqual([5]);
    });

    it("ignores numbers above max", () => {
      expect(parseSelection("15", 10)).toEqual([]);
    });

    it("ignores zero and negative numbers", () => {
      expect(parseSelection("0", 10)).toEqual([]);
      expect(parseSelection("-1", 10)).toEqual([]);
    });
  });

  describe("comma-separated lists", () => {
    it("parses comma-separated numbers", () => {
      expect(parseSelection("1,2,3", 10)).toEqual([1, 2, 3]);
      expect(parseSelection("1,5,10", 10)).toEqual([1, 5, 10]);
    });

    it("handles spaces around commas", () => {
      expect(parseSelection("1, 2, 3", 10)).toEqual([1, 2, 3]);
      expect(parseSelection(" 1 , 2 , 3 ", 10)).toEqual([1, 2, 3]);
    });

    it("deduplicates repeated numbers", () => {
      expect(parseSelection("1,1,2,2", 10)).toEqual([1, 2]);
    });

    it("filters out invalid numbers", () => {
      expect(parseSelection("1,15,2", 10)).toEqual([1, 2]);
    });
  });

  describe("ranges", () => {
    it("parses simple range", () => {
      expect(parseSelection("1-5", 10)).toEqual([1, 2, 3, 4, 5]);
    });

    it("caps range at max", () => {
      expect(parseSelection("8-15", 10)).toEqual([8, 9, 10]);
    });

    it("handles single-element range", () => {
      expect(parseSelection("5-5", 10)).toEqual([5]);
    });
  });

  describe("mixed selections", () => {
    it("parses mix of numbers and ranges", () => {
      expect(parseSelection("1,3-5,10", 10)).toEqual([1, 3, 4, 5, 10]);
    });

    it("deduplicates overlapping selections", () => {
      expect(parseSelection("1-5,3-7", 10)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  });

  describe("all keyword", () => {
    it("parses 'all' as complete range", () => {
      expect(parseSelection("all", 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it("is case insensitive", () => {
      expect(parseSelection("ALL", 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(parseSelection("All", 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  describe("edge cases", () => {
    it("handles empty selection", () => {
      expect(parseSelection("", 10)).toEqual([]);
    });

    it("handles invalid input gracefully", () => {
      expect(parseSelection("abc", 10)).toEqual([]);
      expect(parseSelection("1-", 10)).toEqual([]);
    });
  });
});

describe("toIndexedResults", () => {
  const mockResults: SearchResult[] = [
    {
      name: "2025-12-08-Meeting-Notes",
      path: "/vault/2025-12-08-Meeting-Notes.md",
      tags: ["meeting-notes", "project/pai", "scope/work"],
      date: "2025-12-08 10:00",
      captureDate: new Date("2025-12-08T10:00:00"),
      mtime: new Date("2025-12-08T10:00:00"),
      birthtime: new Date("2025-12-08T10:00:00"),
    },
    {
      name: "2025-12-07-Transcript",
      path: "/vault/2025-12-07-Transcript.md",
      tags: ["transcript", "incoming", "raw", "scope/work"],
      date: "2025-12-07 15:00",
      captureDate: new Date("2025-12-07T15:00:00"),
      mtime: new Date("2025-12-07T15:00:00"),
      birthtime: new Date("2025-12-07T15:00:00"),
    },
  ];

  it("converts search results to indexed format", () => {
    const indexed = toIndexedResults(mockResults);

    expect(indexed).toHaveLength(2);
    expect(indexed[0].index).toBe(1);
    expect(indexed[1].index).toBe(2);
  });

  it("extracts date from captureDate", () => {
    const indexed = toIndexedResults(mockResults);

    expect(indexed[0].date).toBe("2025-12-08");
    expect(indexed[1].date).toBe("2025-12-07");
  });

  it("detects content type from tags", () => {
    const indexed = toIndexedResults(mockResults);

    expect(indexed[0].type).toBe("meeting");  // has meeting-notes tag
    expect(indexed[1].type).toBe("transcript");  // has transcript tag
  });

  it("filters out scope and incoming tags", () => {
    const indexed = toIndexedResults(mockResults);

    expect(indexed[0].tags).not.toContain("scope/work");
    expect(indexed[1].tags).not.toContain("incoming");
    expect(indexed[1].tags).not.toContain("raw");
  });

  it("supports custom start index", () => {
    const indexed = toIndexedResults(mockResults, 10);

    expect(indexed[0].index).toBe(10);
    expect(indexed[1].index).toBe(11);
  });
});

describe("toSemanticIndexedResults", () => {
  const mockSemanticResults = [
    {
      noteName: "2025-12-08-API-Design",
      notePath: "/vault/2025-12-08-API-Design.md",
      similarity: 0.89,
      content: "This document describes the API design patterns used in the project.",
      tags: ["note", "project/api"],
    },
    {
      noteName: "2025-12-07-Architecture",
      notePath: "/vault/2025-12-07-Architecture.md",
      similarity: 0.75,
      content: "Architecture overview and system design considerations.",
      tags: ["wisdom"],
    },
  ];

  it("converts semantic results to indexed format", () => {
    const indexed = toSemanticIndexedResults(mockSemanticResults);

    expect(indexed).toHaveLength(2);
    expect(indexed[0].index).toBe(1);
    expect(indexed[0].similarity).toBe(0.89);
    expect(indexed[1].similarity).toBe(0.75);
  });

  it("includes excerpt from content", () => {
    const indexed = toSemanticIndexedResults(mockSemanticResults);

    expect(indexed[0].excerpt).toContain("API design patterns");
    expect(indexed[0].excerpt!.length).toBeLessThanOrEqual(80);
  });

  it("detects type from tags", () => {
    const indexed = toSemanticIndexedResults(mockSemanticResults);

    expect(indexed[0].type).toBe("note");
    expect(indexed[1].type).toBe("wisdom");
  });
});

describe("formatIndexTable", () => {
  const mockTagMatches = [
    {
      index: 1,
      name: "2025-12-08-Meeting-Notes",
      path: "/vault/test.md",
      date: "2025-12-08",
      type: "meeting",
      tags: ["project/pai", "meeting-notes"],
    },
  ];

  const mockSemanticMatches = [
    {
      index: 2,
      name: "2025-12-07-Related-Note",
      path: "/vault/related.md",
      date: "2025-12-07",
      type: "note",
      tags: ["project/pai"],
      similarity: 0.85,
      excerpt: "Related content excerpt here",
    },
  ];

  it("formats tag matches section", () => {
    const output = formatIndexTable(mockTagMatches, [], "test query");

    expect(output).toContain("Search Results");
    expect(output).toContain("TAG MATCHES (1 notes)");
    expect(output).toContain("2025-12-08");
    expect(output).toContain("meeting");
  });

  it("formats semantic matches section", () => {
    const output = formatIndexTable([], mockSemanticMatches, "test query");

    expect(output).toContain("SEMANTIC MATCHES (1 notes)");
    expect(output).toContain("85%");
    expect(output).toContain("2025-12-07");
  });

  it("includes load instructions", () => {
    const output = formatIndexTable(mockTagMatches, mockSemanticMatches, "test");

    expect(output).toContain("Load options:");
    expect(output).toContain("obs load all");
    expect(output).toContain("obs load 1,2,5");
    expect(output).toContain("obs load 1-5");
    expect(output).toContain("obs load --type transcript");
  });

  it("handles both sections together", () => {
    const output = formatIndexTable(mockTagMatches, mockSemanticMatches, "combined");

    expect(output).toContain("TAG MATCHES");
    expect(output).toContain("SEMANTIC MATCHES");
  });
});

