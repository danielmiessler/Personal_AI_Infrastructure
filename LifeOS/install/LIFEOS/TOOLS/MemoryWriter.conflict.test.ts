/**
 * Conflict-rule tests.
 *
 * The regression that motivated this: a memory file held three incompatible answers
 * to one question (which days a recurring activity happens). A curation write
 * collapsed them by picking one, and the pick was wrong and marked ~explicit, which
 * later reads as "the principal stated this". The rule must catch that shape and must
 * NOT catch ordinary supersession, where the principal simply states a new value.
 *
 * Fixtures are deliberately neutral: this file ships publicly, so it carries no real
 * names, relationships, or personal measurements.
 */
import { expect, test, describe } from "bun:test";
import { detectValueConflicts } from "./MemoryWriter.ts";

describe("detectValueConflicts", () => {
  test("catches the motivating regression: prior disagreed, reviewer picked", () => {
    const prior = [
      "PREFERENCE: attends class on Monday, Thursday, and Friday ~explicit",
      "PREFERENCE: attends class on Monday and Friday evenings ~explicit",
    ];
    const next = [
      "PREFERENCE: attends class Monday and Friday evenings, working toward the next grade ~explicit",
    ];
    const conflicts = detectValueConflicts(prior, next);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("weekday");
    expect(conflicts[0].values.incoming).toEqual(["friday", "monday"]);
  });

  test("ignores ordinary supersession — one prior value, new value stated", () => {
    const prior = ["PREFERENCE: target load for the main lift is 100kg ~explicit"];
    const next = ["PREFERENCE: target load for the main lift is 105kg ~explicit"];
    expect(detectValueConflicts(prior, next)).toHaveLength(0);
  });

  test("ignores unchanged entries — the reviewer declined to resolve", () => {
    const prior = [
      "PREFERENCE: attends class on Monday and Friday ~explicit",
      "PREFERENCE: attends class on Monday, Thursday and Friday ~explicit",
    ];
    expect(detectValueConflicts(prior, prior)).toHaveLength(0);
  });

  test("ignores entries with no closed-vocabulary value", () => {
    const prior = ["ROLE: works at Acme ~explicit", "ROLE: works at Globex ~explicit"];
    const next = ["ROLE: works at Initech ~explicit"];
    expect(detectValueConflicts(prior, next)).toHaveLength(0);
  });

  test("a single prior value is supersession, not a guess", () => {
    const prior = [
      "PREFERENCE: attends class on Monday and Friday ~explicit",
      "PREFERENCE: attends class on Monday, Thursday and Friday ~explicit",
      "ROLE: office days are Wednesday and Thursday ~explicit",
    ];
    const next = ["ROLE: office days are Tuesday and Thursday ~explicit"];
    expect(detectValueConflicts(prior, next)).toHaveLength(0);
  });

  test("catches ambiguous quantities too", () => {
    const prior = [
      "PREFERENCE: daily supplement dose is 40g ~explicit",
      "PREFERENCE: daily supplement dose is 60g ~explicit",
    ];
    const next = ["PREFERENCE: daily supplement dose is 40g ~explicit"];
    const conflicts = detectValueConflicts(prior, next);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].kind).toBe("quantity:g");
  });

  test("does not compare across units — 7h is not a rival of 40g", () => {
    const prior = [
      "PREFERENCE: daily supplement dose is 40g and minimum rest is 7h ~explicit",
      "PREFERENCE: daily supplement dose is 60g and minimum rest is 7h ~explicit",
    ];
    const next = ["PREFERENCE: daily supplement dose is 40g and minimum rest is 7h ~explicit"];
    const kinds = detectValueConflicts(prior, next).map((c) => c.kind);
    expect(kinds).toContain("quantity:g");
    expect(kinds).not.toContain("quantity:h");
  });

  // KNOWN FALSE POSITIVE, recorded rather than wished away.
  //
  // Entries can share two content words while being about different things — a
  // Saturday planning session and a Monday errand are not rival answers to one
  // question. Token overlap cannot separate them; only meaning can, and asking a
  // model for meaning is the defect this rule exists to remove.
  //
  // Measured by replaying a real 186 -> 45 curation: 4 flags, 2 true (including the
  // motivating regression, plus a genuine review-day conflict that had gone
  // unnoticed), 2 false. The cost of a false positive is bounded — the entry
  // survives verbatim and only its provenance drops to ~inferred, which the next
  // explicit statement restores. The cost of a false negative is a wrong value
  // carrying "the principal stated this" indefinitely. That asymmetry is why this is
  // tuned to over-flag.
  test("known false positive: entries sharing two words but not a topic", () => {
    const prior = [
      "RELATION: partner recurring Saturday planning session ~explicit",
      "RELATION: partner planning appointments affecting Monday ~explicit",
    ];
    const next = ["RELATION: partner recurring Saturday planning session at home ~explicit"];
    expect(detectValueConflicts(prior, next)).toHaveLength(1);
  });
});
