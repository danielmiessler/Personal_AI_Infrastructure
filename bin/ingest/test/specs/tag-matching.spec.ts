/**
 * Tag Matching Test Specifications
 *
 * Tests for fuzzy tag matching of transcribed (non-deterministic) hints.
 * - Deterministic hints (caption hashtags) are kept as-is
 * - Non-deterministic hints (transcribed audio) are fuzzy-matched to vault tags
 * - Unmatched tags are kept but note gets pending-review tag
 *
 * Reference: lib/tag-matcher.ts
 */

import type { TestSpec } from "../framework/types";

// =============================================================================
// Tag Matching Tests
// =============================================================================

export const tagMatchingSpecs: TestSpec[] = [
  {
    id: "TEST-TAG-001",
    name: "Fuzzy matching spoken hashtag to existing vault tag",
    category: "tag-matching",
    fixture: "voice/TEST-INGv2-130.json", // "hashtag project pai spoken in audio"
    input: {
      type: "voice",
      description: "Voice memo with spoken 'hashtag project pai' - Whisper transcribes inaccurately",
      spokenKeywords: ["hashtag project pai"],
    },
    expected: {
      // Fuzzy matching corrects transcription to existing vault tag
      // Whisper transcribes "project pai" as "ProjectPiNodes" → fuzzy match → "projectpie" (71%)
      // Note: vault has "projectpie" from earlier transcriptions, not "project/pai"
      tags: ["projectpie"],
      verboseOutput: ["Fuzzy matched tag:"],
    },
    meta: {
      docRef: "tag-matcher.ts",
      notes: "Matches to 'projectpie' which exists in vault. To match 'project/pai', that tag must be added to vault.",
    },
  },

  {
    id: "TEST-TAG-002",
    name: "Fuzzy matching spoken person to existing vault tag",
    category: "tag-matching",
    fixture: "voice/TEST-INGv2-131.json", // "at ed overy spoken in audio"
    input: {
      type: "voice",
      description: "Voice memo with spoken 'at ed overy' - fuzzy matches to existing person in vault",
      spokenKeywords: ["at ed overy"],
    },
    expected: {
      // Vault has 'ed_overy' as a person tag (42 people tags in vault)
      // Fuzzy matching successfully matches the spoken mention
      // People mentions appear in tags array in output
      tags: ["ed_overy"],
    },
    meta: {
      docRef: "tag-matcher.ts",
      notes: "Vault has 'ed_overy' in person tags, so fuzzy match succeeds. No pending-review needed.",
    },
  },

  {
    id: "TEST-TAG-003",
    name: "Caption tags are deterministic (no fuzzy matching)",
    category: "tag-matching",
    fixture: "tag-matching/TEST-TAG-003.json",
    input: {
      type: "text",
      description: "Text message with hashtag that doesn't exist in vault",
      example: "#nonexistent_tag_xyz Testing caption tag",
    },
    expected: {
      // Caption hashtags are kept exactly as written - no fuzzy matching
      tags: ["nonexistent_tag_xyz"],
      excludeTags: ["pending-review"], // Caption tags don't trigger pending-review
    },
    meta: {
      docRef: "tag-matcher.ts",
      notes: "Deterministic hints from caption are trusted as-is - user typed them intentionally",
    },
  },
];
