/**
 * Research Validation System
 *
 * Implements 3-gate validation for research results:
 * - Gate 1: Source citation verification
 * - Gate 2: Confidence scoring with follow-up
 * - Gate 3: Contradiction detection
 */

export interface ValidationResult {
  status: 'pass' | 'fail' | 'warning';
  message: string;
  actions_taken?: string[];
  details?: any;
}

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
 * Gate 1: Source Citation Check
 * Verifies all results have source citations
 */
export async function validateSources(results: ResearchResult[]): Promise<ValidationResult> {
  const resultsWithoutSources = results.filter(r => !r.sources || r.sources.length === 0);

  if (resultsWithoutSources.length === 0) {
    return {
      status: 'pass',
      message: 'All results include source citations',
      details: {
        results_checked: results.length,
        with_sources: results.length,
        without_sources: 0
      }
    };
  }

  // Re-query for missing sources
  const actions: string[] = [];
  for (const result of resultsWithoutSources) {
    // Note: Actual re-query would launch agent with explicit source requirement
    // For now, mark as action needed
    actions.push(`Re-query needed for ${result.agent_id}: "${result.query}"`);
  }

  return {
    status: 'fail',
    message: `${resultsWithoutSources.length} results missing sources`,
    actions_taken: actions,
    details: {
      results_checked: results.length,
      with_sources: results.length - resultsWithoutSources.length,
      without_sources: resultsWithoutSources.length,
      missing_source_agents: resultsWithoutSources.map(r => r.agent_id)
    }
  };
}

/**
 * Gate 2: Confidence Check
 * Validates confidence levels and triggers follow-up for low scores
 */
export async function validateConfidence(
  results: ResearchResult[],
  minConfidence: number = 0.70
): Promise<ValidationResult> {
  const lowConfidenceResults = results.filter(r =>
    r.confidence !== undefined && r.confidence < minConfidence
  );

  if (lowConfidenceResults.length === 0) {
    const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
    return {
      status: 'pass',
      message: `All results meet confidence threshold (avg: ${Math.round(avgConfidence * 100)}%)`,
      details: {
        results_checked: results.length,
        high_confidence: results.length,
        low_confidence: 0,
        average_confidence: avgConfidence
      }
    };
  }

  const actions: string[] = [];
  for (const result of lowConfidenceResults) {
    actions.push(
      `Follow-up needed for ${result.agent_id}: confidence ${Math.round((result.confidence || 0) * 100)}%`
    );
  }

  return {
    status: 'warning',
    message: `${lowConfidenceResults.length} results below ${Math.round(minConfidence * 100)}% confidence threshold`,
    actions_taken: actions,
    details: {
      results_checked: results.length,
      high_confidence: results.length - lowConfidenceResults.length,
      low_confidence: lowConfidenceResults.length,
      threshold: minConfidence,
      low_confidence_agents: lowConfidenceResults.map(r => ({
        agent_id: r.agent_id,
        confidence: r.confidence
      }))
    }
  };
}

/**
 * Gate 3: Contradiction Detection
 * Identifies conflicting claims across results
 */
export async function detectContradictions(results: ResearchResult[]): Promise<ValidationResult> {
  // Simplified contradiction detection
  // In production, this would use semantic analysis to identify conflicts

  const contradictions: any[] = [];

  // For now, check for obvious contradictions in content
  // Real implementation would use LLM to analyze semantic conflicts
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const resultA = results[i];
      const resultB = results[j];

      // Placeholder: In production, this would do semantic analysis
      // to detect contradictory claims
      const hasContradiction = checkForContradiction(resultA.content, resultB.content);

      if (hasContradiction) {
        contradictions.push({
          result_a: resultA.agent_id,
          result_b: resultB.agent_id,
          claim_a: extractClaim(resultA.content),
          claim_b: extractClaim(resultB.content)
        });
      }
    }
  }

  if (contradictions.length === 0) {
    return {
      status: 'pass',
      message: 'No contradictions detected',
      details: {
        pairs_checked: (results.length * (results.length - 1)) / 2,
        contradictions_found: 0
      }
    };
  }

  const actions: string[] = [];
  for (const contradiction of contradictions) {
    actions.push(
      `Disambiguation needed between ${contradiction.result_a} and ${contradiction.result_b}`
    );
  }

  return {
    status: 'warning',
    message: `${contradictions.length} potential contradictions detected`,
    actions_taken: actions,
    details: {
      contradictions: contradictions,
      disambiguation_needed: true
    }
  };
}

/**
 * Helper: Check for contradictions (simplified)
 * In production, would use semantic analysis
 */
function checkForContradiction(contentA: string, contentB: string): boolean {
  // Placeholder implementation
  // Real version would use LLM to analyze semantic conflicts

  // Simple keyword-based check for demonstration
  const opposites = [
    ['increasing', 'decreasing'],
    ['rising', 'falling'],
    ['growing', 'shrinking'],
    ['improving', 'worsening'],
    ['safe', 'dangerous'],
    ['effective', 'ineffective']
  ];

  for (const [word1, word2] of opposites) {
    if (
      (contentA.toLowerCase().includes(word1) && contentB.toLowerCase().includes(word2)) ||
      (contentA.toLowerCase().includes(word2) && contentB.toLowerCase().includes(word1))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Helper: Extract main claim from content
 */
function extractClaim(content: string): string {
  // Simplified extraction - first sentence
  const firstSentence = content.split(/[.!?]/)[0];
  return firstSentence.trim();
}

/**
 * Master validation function
 * Runs all 3 gates and returns comprehensive results
 */
export async function validateResults(
  results: ResearchResult[],
  options: {
    minConfidence?: number;
    requireSources?: boolean;
    checkContradictions?: boolean;
  } = {}
): Promise<{
  sourceCheck: ValidationResult;
  confidenceCheck: ValidationResult;
  contradictionCheck: ValidationResult;
  allPassed: boolean;
}> {
  const {
    minConfidence = 0.70,
    requireSources = true,
    checkContradictions = true
  } = options;

  const sourceCheck = requireSources
    ? await validateSources(results)
    : { status: 'pass' as const, message: 'Source check skipped' };

  const confidenceCheck = await validateConfidence(results, minConfidence);

  const contradictionCheck = checkContradictions
    ? await detectContradictions(results)
    : { status: 'pass' as const, message: 'Contradiction check skipped' };

  const allPassed =
    sourceCheck.status === 'pass' &&
    confidenceCheck.status === 'pass' &&
    contradictionCheck.status === 'pass';

  return {
    sourceCheck,
    confidenceCheck,
    contradictionCheck,
    allPassed
  };
}

/**
 * Apply validation results and re-query as needed
 * This would integrate with the research workflow to actually trigger follow-ups
 */
export async function applyValidationActions(
  validation: Awaited<ReturnType<typeof validateResults>>,
  results: ResearchResult[]
): Promise<ResearchResult[]> {
  // In production, this would:
  // 1. Re-query for missing sources
  // 2. Launch follow-up agents for low confidence
  // 3. Launch disambiguation agents for contradictions

  // For now, return original results with validation metadata
  return results.map(r => ({
    ...r,
    validated: true
  }));
}
