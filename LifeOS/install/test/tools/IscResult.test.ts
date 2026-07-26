import { describe, expect, test } from "bun:test";
import { judgeCriterion, parseWorkerOutput } from "../../LIFEOS/TOOLS/IscResult";

// The detection rule this contract replaces: a bare substring test on the
// worker's stdout. Reproduced verbatim so the false positives below are pinned
// as regressions rather than described in a comment.
const legacyDetect = (stdout: string, cId: string): boolean =>
  stdout.includes(`RESULT: ${cId} PASS`) || stdout.includes(`${cId} PASS`);

const pass = (id: string) => `ISC_RESULT v1 id=${id} verdict=PASS`;
const fail = (id: string, reason: string) => `ISC_RESULT v1 id=${id} verdict=FAIL reason=${reason}`;

describe("judgeCriterion — prose is never a pass", () => {
  // Both strings satisfy the legacy substring test while describing a failure.
  const falsePositives = [
    "RESULT: ISC-3 FAIL: I could not make ISC-3 PASS despite two attempts",
    "Verified whether ISC-3 PASSES: it does not.",
  ];

  for (const stdout of falsePositives) {
    test(`rejects: ${stdout.slice(0, 40)}...`, () => {
      expect(legacyDetect(stdout, "ISC-3")).toBe(true);  // the bug being fixed
      expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).not.toBe("PASS");
    });
  }

  test("a full failure report with a structured FAIL line is a FAIL", () => {
    const stdout = [
      "I tried two approaches. Neither made ISC-3 PASS.",
      fail("ISC-3", "verification command exits 1"),
    ].join("\n");
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("FAIL");
  });

  test("no verdict line at all is NO_SIGNAL, not a pass", () => {
    const stdout = "Done. Everything looks good.";
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("NO_SIGNAL");
  });

  test("an indented or quoted verdict line does not count", () => {
    for (const stdout of [`  ${pass("ISC-3")}`, `> ${pass("ISC-3")}`, `\`${pass("ISC-3")}\``]) {
      expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("NO_SIGNAL");
    }
  });

  test("the prompt's own contract template is not a passing signal", () => {
    const stdout = "ISC_RESULT v1 id=ISC-3 verdict=PASS|FAIL reason=<one line, FAIL only>";
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).not.toBe("PASS");
  });
});

describe("judgeCriterion — genuine verdicts", () => {
  test("a genuine pass", () => {
    const stdout = ["Ran the verify command, exit 0.", pass("ISC-3")].join("\n");
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("PASS");
  });

  test("a pass line for a different criterion does not pass this one", () => {
    expect(judgeCriterion("ISC-3", { stdout: pass("ISC-4"), exitCode: 0 })).toBe("NO_SIGNAL");
  });

  test("id matching is exact, not prefix", () => {
    expect(judgeCriterion("ISC-3", { stdout: pass("ISC-30"), exitCode: 0 })).toBe("NO_SIGNAL");
  });

  test("CRLF line endings and trailing spaces are tolerated", () => {
    const stdout = `some log\r\n${pass("ISC-3")}  \r\n`;
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("PASS");
  });
});

describe("judgeCriterion — a worker that did not exit cleanly never passes", () => {
  const stdout = ["Verified the fix.", pass("ISC-3")].join("\n");

  test("non-zero exit is CRASHED even with a well-formed PASS line", () => {
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 1 })).toBe("CRASHED");
  });

  test("a killed worker (SIGKILL/timeout) is CRASHED", () => {
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 137 })).toBe("CRASHED");
  });
});

describe("judgeCriterion — ambiguity fails closed", () => {
  test("both PASS and FAIL for the same id is AMBIGUOUS", () => {
    const stdout = [pass("ISC-3"), fail("ISC-3", "flaky on rerun")].join("\n");
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("AMBIGUOUS");
  });

  test("a malformed verdict line poisons the run", () => {
    const stdout = ["ISC_RESULT v1 id=ISC-3 verdict=MAYBE", pass("ISC-3")].join("\n");
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("AMBIGUOUS");
  });

  test("a PASS line carrying trailing text is malformed, not a pass", () => {
    const stdout = "ISC_RESULT v1 id=ISC-3 verdict=PASS reason=well, mostly";
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("AMBIGUOUS");
  });

  test("a regression FAIL for the worker's own id overrides its PASS", () => {
    const stdout = [pass("ISC-3"), "ISC_REGRESSION v1 id=ISC-3 verdict=FAIL"].join("\n");
    expect(judgeCriterion("ISC-3", { stdout, exitCode: 0 })).toBe("AMBIGUOUS");
  });
});

describe("parseWorkerOutput — regression lines", () => {
  test("collects regression verdicts separately from the primary result", () => {
    const stdout = [
      pass("ISC-3"),
      "ISC_REGRESSION v1 id=ISC-1 verdict=PASS",
      "ISC_REGRESSION v1 id=ISC-2 verdict=FAIL reason=build breaks",
    ].join("\n");
    const verdicts = parseWorkerOutput(stdout);
    expect([...verdicts.passed]).toEqual(["ISC-3"]);
    expect([...verdicts.regressionPassed]).toEqual(["ISC-1"]);
    expect([...verdicts.regressionFailed]).toEqual(["ISC-2"]);
    expect(verdicts.malformed).toBe(false);
  });

  test("prose about a regression check is not a regression verdict", () => {
    const stdout = "REGRESSION_CHECK: ISC-2 PASS — well, it PASSES in spirit";
    const verdicts = parseWorkerOutput(stdout);
    expect(verdicts.regressionPassed.size).toBe(0);
    expect(verdicts.regressionFailed.size).toBe(0);
  });

  test("a malformed regression line is flagged", () => {
    expect(parseWorkerOutput("ISC_REGRESSION v1 ISC-2 PASS").malformed).toBe(true);
  });
});
