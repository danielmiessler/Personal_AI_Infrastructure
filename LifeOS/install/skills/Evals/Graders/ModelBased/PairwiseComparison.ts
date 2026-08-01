/**
 * Pairwise Comparison Grader
 * Compare output against a reference with position swapping to reduce bias
 */

import { BaseGrader, registerGrader, type GraderContext } from '../Base.ts';
import type { GraderConfig, GraderResult, PairwiseComparisonParams } from '../../Types/index.ts';
import { inference, type InferenceLevel } from '../../../../LIFEOS/TOOLS/Inference.ts';
import { judgeLevelForModel } from './JudgeLevel.ts';
import { readFileSync, existsSync } from 'fs';

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
    const results: { position: string; winner: 'A' | 'B' | 'tie'; reasoning: string }[] = [];

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
      });
    }

    // Aggregate results
    const outputWins = results.filter(r => r.winner === 'A').length;
    const referenceWins = results.filter(r => r.winner === 'B').length;
    const ties = results.filter(r => r.winner === 'tie').length;

    let score: number;
    let aggregateWinner: string;

    if (outputWins > referenceWins) {
      score = 1.0;
      aggregateWinner = 'output';
    } else if (referenceWins > outputWins) {
      score = 0.0;
      aggregateWinner = 'reference';
    } else {
      score = 0.5;
      aggregateWinner = 'tie';
    }

    // For the score, also consider partial wins
    if (positionSwap && results.length === 2) {
      score = (outputWins + ties * 0.5) / 2;
    }

    const passed = score >= 0.5;

    return this.createResult(score, passed, performance.now() - start, {
      reasoning: `${aggregateWinner} wins (output: ${outputWins}, reference: ${referenceWins}, ties: ${ties})`,
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
  ): Promise<{ winner: 'A' | 'B' | 'tie'; reasoning: string }> {
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
      return {
        winner: 'tie',
        reasoning: `Comparison error: ${e}`,
      };
    }
  }
}

registerGrader('pairwise_comparison', PairwiseComparisonGrader);
