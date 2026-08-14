/**
 * Pairwise Comparison Grader
 * Compare output against a reference with position swapping to reduce bias
 */

import { BaseGrader, registerGrader, type GraderContext } from '../Base.ts';
import type { GraderConfig, GraderResult, PairwiseComparisonParams } from '../../Types/index.ts';
import { inference, type InferenceLevel } from '../../../../LIFEOS/TOOLS/Inference.ts';
import { judgeLevelForModel } from './JudgeLevel.ts';
import { readFileSync, existsSync } from 'fs';

// ported from public PR #1731, @asdf8675309
export interface ComparisonResult {
  position: string;
  winner: 'A' | 'B' | 'tie';
  reasoning: string;
  /** The judge call itself failed; the winner field carries no verdict. */
  errored?: boolean;
}

/**
 * Turn per-position verdicts into a score.
 *
 * A judge that never answered is not a tie. Both are recorded as `tie` for the
 * winner tally, so without the `errored` flag an outage scored (0 + 2*0.5)/2 =
 * 0.5, and `passed = score >= 0.5` made that a PASS — every task in the suite
 * passing on the strength of a judge that was down. The sibling model-based
 * graders already return 0 when their judge throws; this makes pairwise agree.
 *
 * One failed comparison fails the grade rather than scoring on the survivor:
 * the swap exists to cancel position bias, so half of it is not a debiased
 * result, it is a biased one wearing a debiased result's score.
 */
export function aggregatePairwise(
  results: ComparisonResult[],
  positionSwap: boolean,
): { score: number; winner: string; outputWins: number; referenceWins: number; ties: number } {
  const outputWins = results.filter(r => r.winner === 'A').length;
  const referenceWins = results.filter(r => r.winner === 'B').length;
  const ties = results.filter(r => r.winner === 'tie').length;

  if (results.some(r => r.errored)) {
    return { score: 0, winner: 'error', outputWins, referenceWins, ties };
  }

  let score: number;
  let winner: string;

  if (outputWins > referenceWins) {
    score = 1.0;
    winner = 'output';
  } else if (referenceWins > outputWins) {
    score = 0.0;
    winner = 'reference';
  } else {
    score = 0.5;
    winner = 'tie';
  }

  // For the score, also consider partial wins
  if (positionSwap && results.length === 2) {
    score = (outputWins + ties * 0.5) / 2;
  }

  return { score, winner, outputWins, referenceWins, ties };
}

export class PairwiseComparisonGrader extends BaseGrader {
  type = 'pairwise_comparison' as const;
  category = 'model_based' as const;

  async grade(context: GraderContext): Promise<GraderResult> {
    const start = performance.now();
    const params = this.config.params as PairwiseComparisonParams;

    // Load reference
    let reference = params.reference;
    if (existsSync(params.reference)) {
      reference = readFileSync(params.reference, 'utf-8');
    }

    if (!reference) {
      return this.createResult(0, false, performance.now() - start, {
        reasoning: 'No reference output available',
      });
    }

    // Judge level derives from the registry (tier-based, so version bumps don't
    // silently demote every judge) and CAPS at high — uplevel routing is the
    // Advisor's door alone. See JudgeLevel.ts for both defects this replaced.
    const level: InferenceLevel = judgeLevelForModel(params.judge_model);
    const positionSwap = params.position_swap ?? true;

    // Run comparison(s)
    const results: ComparisonResult[] = [];

    // First comparison: Output = A, Reference = B
    const result1 = await this.compare(context.output, reference, level, params.criteria);
    results.push({ position: 'output_first', ...result1 });

    if (positionSwap) {
      // Second comparison: Reference = A, Output = B
      const result2 = await this.compare(reference, context.output, level, params.criteria);
      // Flip winner since positions are swapped
      const flippedWinner = result2.winner === 'A' ? 'B' : result2.winner === 'B' ? 'A' : 'tie';
      results.push({
        position: 'reference_first',
        winner: flippedWinner as 'A' | 'B' | 'tie',
        reasoning: result2.reasoning,
        errored: result2.errored,
      });
    }

    const { score, winner: aggregateWinner, outputWins, referenceWins, ties } =
      aggregatePairwise(results, positionSwap);

    const passed = score >= 0.5;

    return this.createResult(score, passed, performance.now() - start, {
      reasoning: aggregateWinner === 'error'
        ? `judge error (output: ${outputWins}, reference: ${referenceWins}, ties: ${ties})`
        : `${aggregateWinner} wins (output: ${outputWins}, reference: ${referenceWins}, ties: ${ties})`,
      details: {
        results,
        position_swap: positionSwap,
        inference_level: level,
        criteria: params.criteria,
      },
    });
  }

  private async compare(
    outputA: string,
    outputB: string,
    level: InferenceLevel,
    criteria?: string[]
  ): Promise<Omit<ComparisonResult, 'position'>> {
    const criteriaText = criteria?.length
      ? `Focus on these criteria:\n${criteria.map(c => `- ${c}`).join('\n')}`
      : 'Consider overall quality, accuracy, clarity, and helpfulness.';

    const systemPrompt = `You are comparing two outputs to determine which is better.

${criteriaText}

Respond in this format:
REASONING: <your analysis comparing A and B>
WINNER: A or B or TIE

Be objective. Consider both outputs fairly.`;

    const userPrompt = `## Output A

${outputA}

## Output B

${outputB}

Compare these outputs and determine which is better.`;

    try {
      const result = await inference({
        systemPrompt,
        userPrompt,
        level,
        timeout: 30000,
      });

      if (!result.success) {
        throw new Error(result.error || 'Inference failed');
      }

      const text = result.output;

      const winnerMatch = text.match(/WINNER:\s*(A|B|TIE)/i);
      const reasoningMatch = text.match(/REASONING:\s*([\s\S]*?)(?=WINNER:|$)/i);

      const winner = winnerMatch?.[1]?.toUpperCase() === 'A' ? 'A'
        : winnerMatch?.[1]?.toUpperCase() === 'B' ? 'B'
        : 'tie';

      return {
        winner,
        reasoning: reasoningMatch?.[1]?.trim() ?? text,
      };
    } catch (e) {
      // `tie` keeps the winner field a valid verdict shape; `errored` is what
      // tells the aggregator this comparison produced no verdict at all.
      return {
        winner: 'tie',
        reasoning: `Comparison error: ${e}`,
        errored: true,
      };
    }
  }
}

registerGrader('pairwise_comparison', PairwiseComparisonGrader);
