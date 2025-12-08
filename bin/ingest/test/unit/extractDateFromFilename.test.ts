/**
 * Unit tests for extractDateFromFilename function
 * 
 * Tests date extraction from various filename patterns:
 * - YYYY_MM_DD_ (underscore format, common in transcripts)
 * - YYYY-MM-DD- (dash format, common in notes)
 * - YYYYMMDD (compact format)
 */

import { describe, it, expect } from "bun:test";
import { extractDateFromFilename } from "../../lib/process";

describe("extractDateFromFilename", () => {
  describe("underscore format (YYYY_MM_DD_)", () => {
    it("extracts date from transcript-style filename", () => {
      expect(extractDateFromFilename("2025_09_30_Compliance_Integration_Discovery_Transcript.docx"))
        .toBe("2025-09-30");
    });

    it("extracts date from simple underscore filename", () => {
      expect(extractDateFromFilename("2024_01_15_Meeting_Notes.pdf"))
        .toBe("2024-01-15");
    });

    it("handles filename with just date prefix", () => {
      expect(extractDateFromFilename("2023_12_25_Document.txt"))
        .toBe("2023-12-25");
    });
  });

  describe("dash format (YYYY-MM-DD-)", () => {
    it("extracts date from note-style filename", () => {
      expect(extractDateFromFilename("2025-12-08-Meeting-Notes.md"))
        .toBe("2025-12-08");
    });

    it("extracts date from dash-separated filename", () => {
      expect(extractDateFromFilename("2024-06-15-Project-Kickoff.docx"))
        .toBe("2024-06-15");
    });
  });

  describe("compact format (YYYYMMDD)", () => {
    it("extracts date from compact format at start", () => {
      expect(extractDateFromFilename("20250930_transcript.docx"))
        .toBe("2025-09-30");
    });

    it("extracts date from archive-style filename", () => {
      // Archive format: TYPE - YYYYMMDD - Description.ext
      expect(extractDateFromFilename("CONTRACT - 20240208 - Employment Agreement.pdf"))
        .toBe("2024-02-08");
    });

    it("extracts date from receipt archive filename", () => {
      expect(extractDateFromFilename("RECEIPT - 20241115 - Amazon Order - HOME.pdf"))
        .toBe("2024-11-15");
    });
  });

  describe("invalid or missing dates", () => {
    it("returns null for filename without date", () => {
      expect(extractDateFromFilename("Meeting_Notes.docx")).toBeNull();
      expect(extractDateFromFilename("document.pdf")).toBeNull();
      expect(extractDateFromFilename("some-random-file.txt")).toBeNull();
    });

    it("returns null for invalid date values", () => {
      // Month 13 doesn't exist
      expect(extractDateFromFilename("2025_13_01_Invalid.docx")).toBeNull();
      // Day 32 doesn't exist
      expect(extractDateFromFilename("2025-01-32-Invalid.md")).toBeNull();
    });

    it("returns null for partial date patterns", () => {
      expect(extractDateFromFilename("2025_09_Document.docx")).toBeNull();
      expect(extractDateFromFilename("2025-12-Document.md")).toBeNull();
    });

    it("returns null for date-like numbers in middle of filename", () => {
      // Should not match dates embedded in the middle without separator
      expect(extractDateFromFilename("Document202509Title.docx")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles empty filename", () => {
      expect(extractDateFromFilename("")).toBeNull();
    });

    it("handles filename with only extension", () => {
      expect(extractDateFromFilename(".docx")).toBeNull();
    });

    it("prefers start-of-filename dates", () => {
      // Should find the date at the start, not one that might be embedded
      expect(extractDateFromFilename("2025_01_01_Report_2024_12_31.docx"))
        .toBe("2025-01-01");
    });
  });
});

