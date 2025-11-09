/**
 * Research Confidence Scoring System
 *
 * Calculates confidence scores (0-1) for research results using 4 factors:
 * - Source Quality (40%): Peer-reviewed > Preprint > Media > Blog
 * - Source Count (20%): More sources = higher confidence
 * - Agent Agreement (30%): Cross-agent validation
 * - Specificity (10%): Concrete claims vs vague statements
 */

export interface Source {
  title: string;
  url?: string;
  type: 'peer-reviewed' | 'media' | 'preprint' | 'blog' | 'unknown';
  publication?: string;
  date?: string;
}

export interface ResearchResult {
  agent_id: string;
  agent_type: string;
  query: string;
  content: string;
  sources: Source[];
  confidence?: number;
  agentAgreement?: number;
  validated?: boolean;
}

/**
 * Factor 1: Source Quality Assessment
 * Weights different source types by reliability
 */
function assessSourceQuality(sources: Source[]): number {
  if (sources.length === 0) return 0;

  const qualityWeights = {
    'peer-reviewed': 1.0,
    'preprint': 0.8,
    'media': 0.6,
    'blog': 0.4,
    'unknown': 0.3
  };

  const totalQuality = sources.reduce((sum, source) => {
    return sum + (qualityWeights[source.type] || 0.3);
  }, 0);

  return totalQuality / sources.length;
}

/**
 * Factor 2: Source Count Score
 * More sources generally means better validation
 * Caps at 3 sources (diminishing returns)
 */
function assessSourceCount(sources: Source[]): number {
  return Math.min(sources.length / 3, 1.0);
}

/**
 * Factor 3: Agent Agreement
 * Measures how much other agents agree with this result
 */
function calculateAgentAgreement(
  result: ResearchResult,
  allResults: ResearchResult[]
): number {
  if (allResults.length <= 1) return 0.5; // Neutral if only one agent

  // Simple semantic overlap check
  // In production, this would use embeddings or LLM comparison
  const agreementCount = allResults.filter(other => {
    if (other.agent_id === result.agent_id) return false;
    return hasSemanticOverlap(result.content, other.content);
  }).length;

  return Math.min(agreementCount / (allResults.length - 1), 1.0);
}

/**
 * Factor 4: Specificity Assessment
 * Concrete claims score higher than vague statements
 */
function assessSpecificity(content: string): number {
  // Indicators of specific claims
  const specificityIndicators = {
    numbers: /\d+(\.\d+)?%?/g,
    dates: /\d{4}|\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
    citations: /\[[\d,\s]+\]|\(\d{4}\)/g,
    measurements: /\b\d+\s*(kg|g|mg|km|m|cm|mm|mph|kph|°C|°F)\b/gi,
    precise_language: /\b(specifically|precisely|exactly|demonstrated|measured|observed|found that)\b/gi
  };

  // Indicators of vague claims
  const vaguenessIndicators = {
    hedging: /\b(might|may|could|possibly|perhaps|seems|appears|suggests)\b/gi,
    generalizations: /\b(generally|usually|often|sometimes|typically)\b/gi,
    weasel_words: /\b(some say|many believe|it is said|reportedly)\b/gi
  };

  let specificityScore = 0;

  // Count specificity indicators
  Object.values(specificityIndicators).forEach(pattern => {
    const matches = content.match(pattern);
    specificityScore += matches ? matches.length * 0.1 : 0;
  });

  // Penalize vagueness
  Object.values(vaguenessIndicators).forEach(pattern => {
    const matches = content.match(pattern);
    specificityScore -= matches ? matches.length * 0.05 : 0;
  });

  // Normalize to 0-1 range
  return Math.max(0, Math.min(specificityScore / 5, 1.0));
}

/**
 * Helper: Check for semantic overlap between two texts
 * Simplified version - production would use embeddings
 */
function hasSemanticOverlap(text1: string, text2: string): boolean {
  // Extract key terms (simplified - would use NLP in production)
  const extractKeyTerms = (text: string): Set<string> => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4); // Only meaningful words

    // Remove common stop words
    const stopWords = new Set(['there', 'their', 'about', 'would', 'which', 'these', 'those', 'could', 'should']);
    return new Set(words.filter(w => !stopWords.has(w)));
  };

  const terms1 = extractKeyTerms(text1);
  const terms2 = extractKeyTerms(text2);

  // Calculate Jaccard similarity
  const intersection = new Set([...terms1].filter(x => terms2.has(x)));
  const union = new Set([...terms1, ...terms2]);

  const similarity = intersection.size / union.size;

  // Consider overlap if similarity > 30%
  return similarity > 0.3;
}

/**
 * Master Confidence Calculation
 * Combines all 4 factors with weighted average
 */
export function calculateConfidence(
  result: ResearchResult,
  allResults: ResearchResult[] = []
): number {
  // Factor 1: Source Quality (40% weight)
  const sourceQuality = assessSourceQuality(result.sources);

  // Factor 2: Source Count (20% weight)
  const sourceCountScore = assessSourceCount(result.sources);

  // Factor 3: Agent Agreement (30% weight)
  const agentAgreement = calculateAgentAgreement(result, allResults);

  // Factor 4: Specificity (10% weight)
  const specificity = assessSpecificity(result.content);

  // Weighted average
  const confidence =
    sourceQuality * 0.4 +
    sourceCountScore * 0.2 +
    agentAgreement * 0.3 +
    specificity * 0.1;

  return Math.max(0, Math.min(confidence, 1.0)); // Clamp to 0-1
}

/**
 * Calculate confidence for all results
 * Includes cross-agent agreement analysis
 */
export function calculateAllConfidences(
  results: ResearchResult[]
): ResearchResult[] {
  return results.map(result => ({
    ...result,
    confidence: calculateConfidence(result, results),
    agentAgreement: calculateAgentAgreement(result, results)
  }));
}

/**
 * Get confidence breakdown for transparency
 */
export interface ConfidenceBreakdown {
  overall: number;
  factors: {
    sourceQuality: number;
    sourceCount: number;
    agentAgreement: number;
    specificity: number;
  };
  interpretation: string;
}

export function getConfidenceBreakdown(
  result: ResearchResult,
  allResults: ResearchResult[] = []
): ConfidenceBreakdown {
  const sourceQuality = assessSourceQuality(result.sources);
  const sourceCount = assessSourceCount(result.sources);
  const agentAgreement = calculateAgentAgreement(result, allResults);
  const specificity = assessSpecificity(result.content);

  const overall = calculateConfidence(result, allResults);

  let interpretation: string;
  if (overall >= 0.8) {
    interpretation = 'High confidence - well-sourced, specific, validated';
  } else if (overall >= 0.6) {
    interpretation = 'Medium confidence - adequate sources, some validation';
  } else if (overall >= 0.4) {
    interpretation = 'Low confidence - limited sources or vague claims';
  } else {
    interpretation = 'Very low confidence - needs follow-up research';
  }

  return {
    overall,
    factors: {
      sourceQuality,
      sourceCount,
      agentAgreement,
      specificity
    },
    interpretation
  };
}

/**
 * Confidence Thresholds
 * Can be customized per user
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.70,      // Auto-accept threshold
  MEDIUM: 0.50,    // Review recommended
  LOW: 0.30,       // Follow-up required
  CRITICAL: 0.00   // Re-query needed
};

/**
 * Determine action based on confidence level
 */
export function getRecommendedAction(confidence: number): {
  action: 'accept' | 'review' | 'follow-up' | 're-query';
  reason: string;
} {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return {
      action: 'accept',
      reason: 'High confidence - result meets quality threshold'
    };
  } else if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return {
      action: 'review',
      reason: 'Medium confidence - manual review recommended'
    };
  } else if (confidence >= CONFIDENCE_THRESHOLDS.LOW) {
    return {
      action: 'follow-up',
      reason: 'Low confidence - additional research needed'
    };
  } else {
    return {
      action: 're-query',
      reason: 'Very low confidence - result should be re-generated'
    };
  }
}
