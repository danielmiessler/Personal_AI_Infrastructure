/**
 * ============================================================================
 * ISC RESULT — structured verdict contract between loop workers and the parent
 * ============================================================================
 *
 * PURPOSE:
 * A parallel loop worker reports whether its criterion passed over stdout. The
 * parent checks the criterion's box in the ISA on that report, so the signal
 * has to be something a *failing* worker cannot emit while narrating its
 * failure in prose. Substring matching is not that: "RESULT: ISC-3 FAIL: I
 * could not make ISC-3 PASS" contains a pass-shaped substring and describes a
 * failure.
 *
 * THE CONTRACT:
 *   ISC_RESULT v1 id=<criterion-id> verdict=PASS
 *   ISC_RESULT v1 id=<criterion-id> verdict=FAIL reason=<one line>
 *   ISC_REGRESSION v1 id=<criterion-id> verdict=PASS
 *   ISC_REGRESSION v1 id=<criterion-id> verdict=FAIL reason=<one line>
 *
 * A verdict line must occupy a whole line, start at column 0, and match the
 * grammar exactly. Prose mentioning a criterion id near the word PASS never
 * parses. The worker prompt (see buildWorkerPrompt in algorithm.ts) states the
 * contract as `verdict=PASS|FAIL`, so no complete, valid PASS line appears
 * anywhere in the prompt — a worker echoing its instructions cannot produce
 * one.
 *
 * FAIL-CLOSED RULES — a criterion is PASS only when all of these hold:
 *   - the worker exited 0 (a crashed, killed, or timed-out worker never passes,
 *     whatever its stdout contains — its stdout is truncated by definition and
 *     its verification steps may never have run),
 *   - at least one well-formed ISC_RESULT PASS line names the criterion,
 *   - no ISC_RESULT or ISC_REGRESSION FAIL line names the criterion,
 *   - no line in the output opened with a sentinel and then failed to parse.
 * Anything else — absent, malformed, or contradictory signal — is not a pass.
 */

export const ISC_RESULT_SENTINEL = "ISC_RESULT v1";
export const ISC_REGRESSION_SENTINEL = "ISC_REGRESSION v1";

const RESULT_RE = /^ISC_RESULT v1 id=(\S+) verdict=(PASS|FAIL)(?: reason=(.*))?$/;
const REGRESSION_RE = /^ISC_REGRESSION v1 id=(\S+) verdict=(PASS|FAIL)(?: reason=(.*))?$/;

/** Verdict for one criterion, from one worker's run. Only "PASS" checks a box. */
export type IscVerdict = "PASS" | "FAIL" | "CRASHED" | "NO_SIGNAL" | "AMBIGUOUS";

export interface WorkerVerdicts {
  /** ids with a well-formed ISC_RESULT PASS line */
  passed: Set<string>;
  /** ids with a well-formed ISC_RESULT FAIL line */
  failed: Set<string>;
  /** ids a regression check reported as still passing */
  regressionPassed: Set<string>;
  /** ids a regression check reported as broken */
  regressionFailed: Set<string>;
  /** a line opened with a sentinel but did not match the grammar */
  malformed: boolean;
}

/**
 * Parse every verdict line out of a worker's stdout. Lines that do not begin
 * with a sentinel are ignored; lines that begin with one and do not match the
 * grammar set `malformed`, which fails the whole run closed.
 */
export function parseWorkerOutput(stdout: string): WorkerVerdicts {
  const verdicts: WorkerVerdicts = {
    passed: new Set(),
    failed: new Set(),
    regressionPassed: new Set(),
    regressionFailed: new Set(),
    malformed: false,
  };

  for (const rawLine of stdout.split("\n")) {
    // Tolerate CRLF and trailing spaces only — leading whitespace means the
    // line is quoted, indented, or inside a list, not a machine record.
    const line = rawLine.replace(/[\r\t ]+$/, "");
    const isResult = line.startsWith(ISC_RESULT_SENTINEL);
    const isRegression = line.startsWith(ISC_REGRESSION_SENTINEL);
    if (!isResult && !isRegression) continue;

    const match = (isResult ? RESULT_RE : REGRESSION_RE).exec(line);
    // A PASS carries no reason — trailing text on a PASS line is ambiguity.
    if (!match || (match[2] === "PASS" && match[3] !== undefined)) {
      verdicts.malformed = true;
      continue;
    }

    const [, id, verdict] = match;
    if (isResult) {
      (verdict === "PASS" ? verdicts.passed : verdicts.failed).add(id);
    } else {
      (verdict === "PASS" ? verdicts.regressionPassed : verdicts.regressionFailed).add(id);
    }
  }

  return verdicts;
}

/**
 * Decide one criterion's verdict from a worker run. Exit code is a necessary
 * condition for PASS; see the fail-closed rules in the module header.
 */
export function judgeCriterion(
  criterionId: string,
  run: { stdout: string; exitCode: number },
): IscVerdict {
  if (run.exitCode !== 0) return "CRASHED";

  const verdicts = parseWorkerOutput(run.stdout);
  if (verdicts.malformed) return "AMBIGUOUS";

  const claimsPass = verdicts.passed.has(criterionId);
  const claimsFail = verdicts.failed.has(criterionId) || verdicts.regressionFailed.has(criterionId);

  if (claimsPass && claimsFail) return "AMBIGUOUS";
  if (claimsFail) return "FAIL";
  if (claimsPass) return "PASS";
  return "NO_SIGNAL";
}

/** The verdict contract, rendered for the worker prompt. Keeps prompt and parser in sync. */
export function iscResultContract(criterionId: string): string {
  return `${ISC_RESULT_SENTINEL} id=${criterionId} verdict=PASS|FAIL reason=<one line, FAIL only>`;
}

/** The regression-check contract, rendered for the worker prompt. */
export function iscRegressionContract(): string {
  return `${ISC_REGRESSION_SENTINEL} id=<other-criterion-id> verdict=PASS|FAIL`;
}
