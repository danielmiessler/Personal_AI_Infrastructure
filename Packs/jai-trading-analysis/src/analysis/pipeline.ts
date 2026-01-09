/**
 * Analysis Pipeline
 *
 * Main orchestrator that runs all analysis stages and determines
 * the final verdict for a stock.
 */

import type {
  AnalysisDataProvider,
  AnalysisInput,
  AnalysisResult,
  AnalysisStage,
  AnalysisRecommendation,
  AnalysisVerdict,
  DealbreakersResult,
  YellowFlagsResult,
  PositiveFactorsResult,
  FScoreResult,
} from './types';
import type { Policy, PolicyRule } from 'jai-finance-core';

import { runDealbreakers } from './dealbreaker';
import { runYellowFlags } from './yellowflag';
import { runPositiveFactors } from './positivefactor';
import { calculateFScore } from './fscore';

// =============================================================================
// Verdict Thresholds
// =============================================================================

interface VerdictThresholds {
  /** Yellow flag score threshold for HIGH_RISK (50 = 50%) */
  yellowFlagHighRisk: number;
  /** Yellow flag score threshold for MODERATE_RISK */
  yellowFlagModerateRisk: number;
  /** F-Score threshold for HIGH_RISK */
  fScoreHighRisk: number;
  /** F-Score threshold for MODERATE_RISK */
  fScoreModerateRisk: number;
  /** Positive factors score bonus threshold */
  positiveFactorsBonus: number;
}

const DEFAULT_THRESHOLDS: VerdictThresholds = {
  yellowFlagHighRisk: 50,
  yellowFlagModerateRisk: 25,
  fScoreHighRisk: 4,
  fScoreModerateRisk: 6,
  positiveFactorsBonus: 60,
};

// =============================================================================
// Analysis Pipeline Class
// =============================================================================

/**
 * Main analysis pipeline that orchestrates all analysis stages
 */
export class AnalysisPipeline {
  private dataProvider: AnalysisDataProvider;
  private policy: Policy;
  private thresholds: VerdictThresholds;

  constructor(
    dataProvider: AnalysisDataProvider,
    policy: Policy,
    thresholds?: Partial<VerdictThresholds>
  ) {
    this.dataProvider = dataProvider;
    this.policy = policy;
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Run full analysis on a single ticker
   */
  async analyze(ticker: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Run all stages in parallel
    const [dealbreakers, yellowFlags, positiveFactors, fScore] = await Promise.all([
      runDealbreakers(ticker, this.dataProvider, this.policy),
      runYellowFlags(ticker, this.dataProvider, this.policy),
      runPositiveFactors(ticker, this.dataProvider, this.policy),
      calculateFScore(ticker, this.dataProvider, this.policy),
    ]);

    // Convert to AnalysisStage format
    const stages = this.buildStages(dealbreakers, yellowFlags, positiveFactors, fScore);

    // Determine verdict
    const verdict = this.determineVerdict(dealbreakers, yellowFlags, positiveFactors, fScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      ticker,
      verdict,
      dealbreakers,
      yellowFlags,
      positiveFactors,
      fScore
    );

    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(dealbreakers, yellowFlags, positiveFactors, fScore);

    return {
      ticker,
      verdict,
      stages,
      recommendations,
      analyzedAt: new Date(),
      confidenceScore,
    };
  }

  /**
   * Run analysis on multiple tickers in parallel
   */
  async analyzeMultiple(tickers: string[]): Promise<AnalysisResult[]> {
    return Promise.all(tickers.map((ticker) => this.analyze(ticker)));
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Build AnalysisStage array from individual results
   */
  private buildStages(
    dealbreakers: DealbreakersResult,
    yellowFlags: YellowFlagsResult,
    positiveFactors: PositiveFactorsResult,
    fScore: FScoreResult
  ): AnalysisStage[] {
    return [
      {
        name: 'dealbreakers',
        passed: dealbreakers.passed,
        score: dealbreakers.passed ? 100 : 0,
        details: dealbreakers.details.map((d) =>
          `${d.id}: ${d.passed ? 'PASSED' : 'FAILED'} - ${d.finding}`
        ),
        policyRuleId: this.findPolicyRuleId('dealbreakers'),
      },
      {
        name: 'yellowFlags',
        passed: yellowFlags.score < this.thresholds.yellowFlagModerateRisk,
        score: 100 - yellowFlags.score, // Invert so higher = better
        details: yellowFlags.flags
          .filter((f) => f.triggered)
          .map((f) => `${f.name} (weight: ${f.weight}): ${f.finding}`),
        policyRuleId: this.findPolicyRuleId('yellowFlags'),
      },
      {
        name: 'positiveFactors',
        passed: positiveFactors.score >= 30, // At least 30% of positive factors present
        score: positiveFactors.score,
        details: positiveFactors.factors
          .filter((f) => f.present)
          .map((f) => `${f.name} (weight: ${f.weight}): ${f.finding}`),
        policyRuleId: this.findPolicyRuleId('positiveFactors'),
      },
      {
        name: 'fScore',
        passed: fScore.score >= this.thresholds.fScoreModerateRisk,
        score: Math.round((fScore.score / 9) * 100),
        details: fScore.components.map((c) =>
          `${c.name}: ${c.passed ? 'PASSED' : 'FAILED'}${
            c.currentValue !== undefined ? ` (${formatValue(c.currentValue)})` : ''
          }`
        ),
        policyRuleId: this.findPolicyRuleId('fScore'),
      },
    ];
  }

  /**
   * Determine final verdict based on all stage results
   *
   * Verdict Logic:
   * - AVOID: Any dealbreaker failed
   * - HIGH_RISK: yellowFlags > 50 OR fScore < 4
   * - MODERATE_RISK: yellowFlags > 25 OR fScore < 6
   * - BUY: All checks pass well (with bonus for strong positives)
   */
  private determineVerdict(
    dealbreakers: DealbreakersResult,
    yellowFlags: YellowFlagsResult,
    positiveFactors: PositiveFactorsResult,
    fScore: FScoreResult
  ): AnalysisVerdict {
    // Hard fail on dealbreakers
    if (!dealbreakers.passed) {
      return 'AVOID';
    }

    // Check for HIGH_RISK conditions
    if (
      yellowFlags.score > this.thresholds.yellowFlagHighRisk ||
      fScore.score < this.thresholds.fScoreHighRisk
    ) {
      return 'HIGH_RISK';
    }

    // Check for MODERATE_RISK conditions
    if (
      yellowFlags.score > this.thresholds.yellowFlagModerateRisk ||
      fScore.score < this.thresholds.fScoreModerateRisk
    ) {
      // Strong positive factors can offset moderate risk
      if (positiveFactors.score >= this.thresholds.positiveFactorsBonus) {
        // Upgrade to BUY if strong positives outweigh moderate concerns
        return 'BUY';
      }
      return 'MODERATE_RISK';
    }

    // All checks pass well
    return 'BUY';
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private generateRecommendations(
    ticker: string,
    verdict: AnalysisVerdict,
    dealbreakers: DealbreakersResult,
    yellowFlags: YellowFlagsResult,
    positiveFactors: PositiveFactorsResult,
    fScore: FScoreResult
  ): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    // Overall recommendation based on verdict
    recommendations.push(this.getVerdictRecommendation(ticker, verdict, fScore));

    // Add dealbreaker warnings
    if (!dealbreakers.passed) {
      for (const detail of dealbreakers.details.filter((d) => !d.passed)) {
        recommendations.push({
          type: 'warning',
          summary: `Dealbreaker: ${detail.name}`,
          detail: detail.finding,
          policyRuleId: this.findDealbreakePolicyRuleId(detail.id),
          priority: 1,
        });
      }
    }

    // Add significant yellow flags
    const significantFlags = yellowFlags.flags.filter((f) => f.triggered && f.weight >= 15);
    for (const flag of significantFlags) {
      recommendations.push({
        type: 'warning',
        summary: flag.name,
        detail: flag.finding || 'Warning flag triggered',
        policyRuleId: this.findYellowFlagPolicyRuleId(flag.id),
        priority: 2,
      });
    }

    // Add positive highlights
    const strongPositives = positiveFactors.factors.filter((f) => f.present && f.weight >= 15);
    for (const factor of strongPositives) {
      recommendations.push({
        type: 'info',
        summary: `Positive: ${factor.name}`,
        detail: factor.finding || 'Positive factor present',
        policyRuleId: this.findPositiveFactorPolicyRuleId(factor.id),
        priority: 3,
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get main recommendation based on verdict
   */
  private getVerdictRecommendation(
    ticker: string,
    verdict: AnalysisVerdict,
    fScore: FScoreResult
  ): AnalysisRecommendation {
    switch (verdict) {
      case 'BUY':
        return {
          type: 'action',
          summary: `${ticker} passes analysis - consider buying`,
          detail: `F-Score: ${fScore.score}/9 (${fScore.interpretation}). Stock meets investment criteria.`,
          policyRuleId: this.findPolicyRuleId('entry'),
          priority: 1,
        };
      case 'MODERATE_RISK':
        return {
          type: 'warning',
          summary: `${ticker} has moderate risk factors`,
          detail: `F-Score: ${fScore.score}/9 (${fScore.interpretation}). Review yellow flags before investing.`,
          policyRuleId: this.findPolicyRuleId('hold'),
          priority: 1,
        };
      case 'HIGH_RISK':
        return {
          type: 'warning',
          summary: `${ticker} has significant risk factors`,
          detail: `F-Score: ${fScore.score}/9 (${fScore.interpretation}). Multiple warning signs present.`,
          policyRuleId: this.findPolicyRuleId('exit'),
          priority: 1,
        };
      case 'AVOID':
        return {
          type: 'warning',
          summary: `${ticker} triggered dealbreaker(s) - avoid`,
          detail: 'One or more hard-fail criteria were met. Do not invest.',
          policyRuleId: this.findPolicyRuleId('exit'),
          priority: 1,
        };
    }
  }

  /**
   * Calculate overall confidence in the analysis
   * Based on data completeness and clarity of signals
   */
  private calculateConfidence(
    dealbreakers: DealbreakersResult,
    yellowFlags: YellowFlagsResult,
    positiveFactors: PositiveFactorsResult,
    fScore: FScoreResult
  ): number {
    let confidence = 100;

    // Deduct for incomplete data in F-Score
    const fScoreDataPoints = fScore.components.filter(
      (c) => c.currentValue !== undefined
    ).length;
    const fScoreCompleteness = fScoreDataPoints / 9;
    confidence -= (1 - fScoreCompleteness) * 20;

    // Deduct for mixed signals (high yellow flags but also high positives)
    if (yellowFlags.score > 30 && positiveFactors.score > 50) {
      confidence -= 15; // Mixed signals reduce confidence
    }

    // Boost for clear signals
    if (dealbreakers.passed && yellowFlags.score < 15 && fScore.score >= 7) {
      confidence += 10; // Clear positive signal
    }
    if (!dealbreakers.passed) {
      confidence = Math.min(confidence, 80); // Cap confidence when dealbreakers fail
    }

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Find policy rule ID by category
   */
  private findPolicyRuleId(category: string): string | undefined {
    const rules = this.policy.rules;
    let ruleSet: PolicyRule[] = [];

    switch (category) {
      case 'entry':
        ruleSet = rules.entry;
        break;
      case 'exit':
        ruleSet = rules.exit;
        break;
      case 'hold':
        ruleSet = rules.hold;
        break;
      default:
        // Look for a rule with matching name in all categories
        ruleSet = [...rules.entry, ...rules.exit, ...rules.hold];
        const match = ruleSet.find((r) =>
          r.name.toLowerCase().includes(category.toLowerCase())
        );
        return match?.id;
    }

    return ruleSet[0]?.id;
  }

  private findDealbreakePolicyRuleId(dealbreakerId: string): string | undefined {
    // Map dealbreaker IDs to policy rule IDs
    // These would be defined in the policy YAML
    const ruleMap: Record<string, string> = {
      SEC_INVESTIGATION: 'rule-avoid-sec-investigation',
      RECENT_RESTATEMENT: 'rule-avoid-restatements',
      AUDITOR_CHANGE: 'rule-avoid-auditor-change',
      SIGNIFICANT_DILUTION: 'rule-max-dilution',
      GOING_CONCERN: 'rule-avoid-going-concern',
      MAJOR_IMPAIRMENT: 'rule-avoid-impairments',
      DIVIDEND_CUT: 'rule-dividend-stability',
      DEBT_COVENANT_VIOLATION: 'rule-debt-covenants',
      INSIDER_DUMPING: 'rule-insider-activity',
      REVENUE_CLIFF: 'rule-revenue-stability',
      NEGATIVE_FCF_TREND: 'rule-fcf-positive',
    };
    return ruleMap[dealbreakerId];
  }

  private findYellowFlagPolicyRuleId(flagId: string): string | undefined {
    const ruleMap: Record<string, string> = {
      HIGH_PE: 'rule-valuation-pe',
      DECLINING_MARGINS: 'rule-margin-stability',
      REVENUE_DECELERATION: 'rule-growth-consistency',
      INVENTORY_BUILDUP: 'rule-working-capital',
      RECEIVABLES_GROWTH: 'rule-collection-quality',
      EXECUTIVE_DEPARTURES: 'rule-management-stability',
      GUIDANCE_LOWERED: 'rule-guidance-reliability',
      SHORT_INTEREST_HIGH: 'rule-short-interest',
    };
    return ruleMap[flagId];
  }

  private findPositiveFactorPolicyRuleId(factorId: string): string | undefined {
    const ruleMap: Record<string, string> = {
      STRONG_MOAT: 'rule-moat-strength',
      RECURRING_REVENUE: 'rule-revenue-quality',
      PRICING_POWER: 'rule-pricing-power',
      MARGIN_EXPANSION: 'rule-margin-expansion',
      NEW_PRODUCT_CYCLE: 'rule-innovation',
      INSIDER_BUYING: 'rule-insider-confidence',
      DIVIDEND_GROWTH: 'rule-dividend-growth',
      SHARE_BUYBACKS: 'rule-capital-allocation',
    };
    return ruleMap[factorId];
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatValue(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  if (Math.abs(value) < 1) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(2);
}
