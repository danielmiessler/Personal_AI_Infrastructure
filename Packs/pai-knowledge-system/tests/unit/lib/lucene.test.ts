/**
 * Tests for Lucene sanitization utilities
 */

import { describe, test, expect } from "bun:test";
import {
  luceneSanitize,
  luceneSanitizeMany,
  needsEscaping,
  sanitizeGroupId,
  sanitizeGroupIds,
  sanitizeSearchQuery,
} from "../../../src/server/lib/lucene";

describe("luceneSanitize", () => {
  test("should wrap simple strings in quotes", () => {
    expect(luceneSanitize("simple")).toBe('"simple"');
  });

  test("should escape hyphens", () => {
    expect(luceneSanitize("pai-threat-intel")).toBe('"pai-threat-intel"');
  });

  test("should escape backslashes", () => {
    expect(luceneSanitize("path\\to\\file")).toBe('"path\\\\to\\\\file"');
  });

  test("should escape double quotes", () => {
    expect(luceneSanitize('user "quoted" text')).toBe('"user \\"quoted\\" text"');
  });

  test("should handle empty strings", () => {
    expect(luceneSanitize("")).toBe('""');
  });

  test("should escape multiple special characters", () => {
    expect(luceneSanitize("test-with+special&chars")).toBe('"test-with+special&chars"');
  });
});

describe("luceneSanitizeMany", () => {
  test("should sanitize array of strings", () => {
    const input = ["group-1", "group-2", "group-3"];
    const expected = ['"group-1"', '"group-2"', '"group-3"'];
    expect(luceneSanitizeMany(input)).toEqual(expected);
  });

  test("should handle empty array", () => {
    expect(luceneSanitizeMany([])).toEqual([]);
  });
});

describe("needsEscaping", () => {
  test("should return true for strings with hyphens", () => {
    expect(needsEscaping("pai-threat")).toBe(true);
  });

  test("should return true for strings with other special chars", () => {
    expect(needsEscaping("test+plus")).toBe(true);
    expect(needsEscaping("test&amp")).toBe(true);
    expect(needsEscaping('test"quote"')).toBe(true);
  });

  test("should return true for RediSearch-specific special chars", () => {
    expect(needsEscaping("@field")).toBe(true);
    expect(needsEscaping("#tag")).toBe(true);
    expect(needsEscaping("$var")).toBe(true);
    expect(needsEscaping("50%")).toBe(true);
    expect(needsEscaping("a<b")).toBe(true);
    expect(needsEscaping("a>b")).toBe(true);
    expect(needsEscaping("a=b")).toBe(true);
  });

  test("should return false for simple alphanumeric strings", () => {
    expect(needsEscaping("simple")).toBe(false);
    expect(needsEscaping("Simple123")).toBe(false);
    expect(needsEscaping("test_with_underscore")).toBe(false);
  });
});

describe("sanitizeGroupId", () => {
  test("should convert hyphens to underscores (WORKAROUND)", () => {
    expect(sanitizeGroupId("pai-threat-intel")).toBe("pai_threat_intel");
    expect(sanitizeGroupId("test-group")).toBe("test_group");
    expect(sanitizeGroupId("my-knowledge-base")).toBe("my_knowledge_base");
  });

  test("should leave underscores unchanged", () => {
    expect(sanitizeGroupId("test_group")).toBe("test_group");
    expect(sanitizeGroupId("pai_knowledge_system")).toBe("pai_knowledge_system");
  });

  test("should leave alphanumeric unchanged", () => {
    expect(sanitizeGroupId("Group123")).toBe("Group123");
    expect(sanitizeGroupId("simple")).toBe("simple");
  });

  test("should return undefined for undefined input", () => {
    expect(sanitizeGroupId(undefined)).toBeUndefined();
  });

  test("should handle empty string", () => {
    expect(sanitizeGroupId("")).toBe("");
  });

  test("should return invalid group_ids as-is (with warning)", () => {
    expect(sanitizeGroupId("invalid@group")).toBe("invalid@group");
    expect(sanitizeGroupId("group with spaces")).toBe("group with spaces");
  });
});

describe("sanitizeGroupIds", () => {
  test("should convert hyphens to underscores in all group_ids", () => {
    const input = ["group-1", "group-2", "test_group"];
    const expected = ["group_1", "group_2", "test_group"];
    expect(sanitizeGroupIds(input)).toEqual(expected);
  });

  test("should return undefined for undefined input", () => {
    expect(sanitizeGroupIds(undefined)).toBeUndefined();
  });

  test("should return undefined for empty array", () => {
    expect(sanitizeGroupIds([])).toBeUndefined();
  });
});

describe("sanitizeSearchQuery", () => {
  test("should escape hyphens in queries", () => {
    expect(sanitizeSearchQuery("pai-threat-intel")).toBe("pai\\-threat\\-intel");
  });

  test("should escape multiple special characters", () => {
    const result = sanitizeSearchQuery("test+with&special|chars");
    expect(result).toContain("\\+");
    expect(result).toContain("\\&");
    expect(result).toContain("\\|");
  });

  test("should escape backslashes", () => {
    expect(sanitizeSearchQuery("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  test("should escape double quotes", () => {
    expect(sanitizeSearchQuery('user "quoted" text')).toBe('user \\"quoted\\" text');
  });

  test("should handle empty strings", () => {
    expect(sanitizeSearchQuery("")).toBe("");
  });

  test("should escape wildcard characters", () => {
    expect(sanitizeSearchQuery("test*query?")).toBe("test\\*query\\?");
  });

  test("should escape parentheses", () => {
    expect(sanitizeSearchQuery("(test)")).toBe("\\(test\\)");
  });

  test("should escape RediSearch-specific special characters", () => {
    expect(sanitizeSearchQuery("@field")).toBe("\\@field");
    expect(sanitizeSearchQuery("#tag")).toBe("\\#tag");
    expect(sanitizeSearchQuery("$var")).toBe("\\$var");
    expect(sanitizeSearchQuery("50%")).toBe("50\\%");
    expect(sanitizeSearchQuery("a<b")).toBe("a\\<b");
    expect(sanitizeSearchQuery("a>b")).toBe("a\\>b");
    expect(sanitizeSearchQuery("a=b")).toBe("a\\=b");
  });

  test("should escape combined RediSearch special chars", () => {
    const result = sanitizeSearchQuery("@user:#admin=$price<100");
    expect(result).toBe("\\@user\\:\\#admin\\=\\$price\\<100");
  });
});
