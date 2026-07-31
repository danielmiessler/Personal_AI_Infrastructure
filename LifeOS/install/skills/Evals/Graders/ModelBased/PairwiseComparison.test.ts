import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { aggregatePairwise, PairwiseComparisonGrader, type ComparisonResult } from './PairwiseComparison.ts';
import type { GraderContext } from '../Base.ts';

const comparison = (
  position: string,
  winner: 'A' | 'B' | 'tie',
  errored = false,
): ComparisonResult => ({ position, winner, reasoning: 'because', errored });

describe('aggregatePairwise', () => {
  test('output winning both positions scores 1', () => {
    const { score } = aggregatePairwise(
      [comparison('output_first', 'A'), comparison('reference_first', 'A')],
      true,
    );
    expect(score).toBe(1);
  });

  test('reference winning both positions scores 0', () => {
    const { score } = aggregatePairwise(
      [comparison('output_first', 'B'), comparison('reference_first', 'B')],
      true,
    );
    expect(score).toBe(0);
  });

  test('a genuine split still scores 0.5', () => {
    const { score } = aggregatePairwise(
      [comparison('output_first', 'A'), comparison('reference_first', 'B')],
      true,
    );
    expect(score).toBe(0.5);
  });

  test('a genuine tie from a judge that answered still scores 0.5', () => {
    const { score, winner } = aggregatePairwise(
      [comparison('output_first', 'tie'), comparison('reference_first', 'tie')],
      true,
    );
    expect(score).toBe(0.5);
    expect(winner).toBe('tie');
  });

  // The defect: a judge that never answered used to be indistinguishable from
  // one that answered "tie", so a total judge outage scored 0.5 and PASSED.
  test('a judge that errored is not a tie', () => {
    const { score, winner } = aggregatePairwise(
      [comparison('output_first', 'tie', true), comparison('reference_first', 'tie', true)],
      true,
    );
    expect(score).toBe(0);
    expect(winner).toBe('error');
  });

  test('one errored comparison fails the whole grade', () => {
    // The swap exists to cancel position bias; scoring on the surviving half
    // would report a debiased result that was never debiased.
    const { score } = aggregatePairwise(
      [comparison('output_first', 'A'), comparison('reference_first', 'tie', true)],
      true,
    );
    expect(score).toBe(0);
  });

  test('errors fail closed without position swap too', () => {
    const { score } = aggregatePairwise([comparison('output_first', 'tie', true)], false);
    expect(score).toBe(0);
  });
});

/**
 * The aggregator above is a pure function fed hand-built inputs. These drive the
 * real grader instead, because the defect this file exists to prevent lived in the
 * WIRING — whether compare() actually marks a failed judge — not in the scoring.
 * Without them, deleting `errored: true` from compare()'s catch restores the
 * original fail-open bug with the whole suite still green.
 */
describe('PairwiseComparisonGrader.grade with an unreachable judge', () => {
  const INFERENCE = '../../../../LIFEOS/TOOLS/Inference.ts';

  type JudgeReply = { success: boolean; output?: string; error?: string };
  const DOWN: JudgeReply = { success: false, error: 'judge unreachable' };
  const WINS_A: JudgeReply = { success: true, output: 'REASONING: better\nWINNER: A' };

  // A judge outage as the code actually sees it: compare() throws on !result.success.
  // Indirected through `replies` so a case can fail one call and not the other.
  let replies: JudgeReply[] = [];
  mock.module(INFERENCE, () => ({
    inference: async () => replies.shift() ?? DOWN,
  }));

  beforeEach(() => { replies = []; });
  afterAll(() => { mock.restore(); });

  const context = (): GraderContext => ({
    task_id: 'task-1',
    trial_id: 'trial-1',
    output: 'the output under evaluation',
    transcript: {
      task_id: 'task-1',
      trial_id: 'trial-1',
      started_at: new Date(0).toISOString(),
      turns: [],
      tool_calls: [],
      metrics: {} as never,
    },
  });

  const grade = (position_swap: boolean) => new PairwiseComparisonGrader({
    type: 'pairwise_comparison',
    params: { reference: 'a reference answer', position_swap },
  }).grade(context());

  test('fails closed instead of scoring a tie', async () => {
    const result = await grade(true);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  test('says the judge errored rather than reporting a verdict', async () => {
    const result = await grade(true);
    expect(result.reasoning).toContain('judge error');
    expect(result.reasoning).not.toContain('tie wins');
  });

  test('fails closed without position swap too', async () => {
    const result = await grade(false);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  // Covers the swap arm specifically. The all-calls-fail cases above short-circuit
  // on the FIRST comparison, so they pass even if the second arm drops its flag —
  // only a half-outage reaches that line.
  test('a judge that dies after the first comparison also fails closed', async () => {
    replies = [WINS_A, DOWN];
    const result = await grade(true);

    // Without the second arm's flag this scores (1 + 0.5)/2 = 0.75 and PASSES.
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });
});
