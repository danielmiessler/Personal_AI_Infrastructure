#!/usr/bin/env bun

/**
 * Synthesis Engine
 *
 * Combines multiple agent perspectives into a coherent decision that's
 * better than any single perspective.
 *
 * Strategies:
 * - consensus: Find common ground across all perspectives
 * - weighted: Weight by domain expertise relevance
 * - facilitator: Designated agent makes final call
 *
 * Usage:
 *   import { synthesize } from './SynthesisEngine';
 *   const result = synthesize(perspectives, { strategy: 'consensus' });
 */

import type { Agent } from './AgentLoader';

// ============================================================================
// Types
// ============================================================================

export type SynthesisStrategy = 'consensus' | 'weighted' | 'facilitator';
export type ConsensusLevel = 'unanimous' | 'strong' | 'moderate' | 'weak' | 'none';

export interface AgentPerspective {
  agent: Agent;
  round: number;
  content: string;
  position: 'approve' | 'block' | 'defer' | 'neutral';
  concerns: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface TradeOff {
  option: string;
  gains: string[];
  losses: string[];
  risk: 'low' | 'medium' | 'high';
}

/**
 * Enhanced trade-off with advocate/opponent tracking
 */
export interface DetailedTradeOff {
  /** The choice being evaluated */
  option: string;
  /** Agents who support this option */
  advocates: string[];
  /** Agents who oppose this option */
  opponents: string[];
  /** Specific benefits extracted from agent content */
  gains: string[];
  /** Specific costs/risks extracted from agent content */
  losses: string[];
  /** Calculated risk from supporter/opponent ratio */
  risk: 'low' | 'medium' | 'high';
  /** Raw risk score for comparison */
  riskScore: number;
}

/**
 * Dissent report for detailed minority opinion documentation
 */
export interface DissentReport {
  /** Total number of dissenting agents */
  dissentCount: number;
  /** Dissenting agents and their positions */
  dissenters: {
    agent: string;
    role: string;
    position: 'block' | 'defer';
    concerns: string[];
    expertise: string[];
    hasVetoPower: boolean;
  }[];
  /** Unique concerns raised by dissenters */
  uniqueConcerns: string[];
  /** Whether any dissenter has veto power */
  hasVetoPower: boolean;
  /** Summary of dissenting position */
  summary: string;
}

/**
 * Options for enhanced confidence calculation
 */
export interface ConfidenceFactors {
  /** Number of unique concerns addressed */
  concernsAddressed: number;
  /** Total unique concerns raised */
  totalConcerns: number;
  /** Number of agents with relevant expertise who agree */
  expertiseAlignmentCount: number;
  /** Total agents with relevant expertise */
  totalRelevantExperts: number;
  /** Number of unresolved conflicts */
  unresolvedConflicts: number;
  /** Topic/domain being discussed */
  domain?: string;
}

export interface SynthesisResult {
  /** The synthesized decision */
  decision: string;
  /** Confidence in the decision (0-1) */
  confidence: number;
  /** Level of consensus achieved */
  consensusLevel: ConsensusLevel;
  /** Explanation of how perspectives were combined */
  rationale: string;
  /** Trade-offs identified */
  tradeoffs: string[];
  /** Trade-off matrix for complex decisions */
  tradeoffMatrix?: TradeOff[];
  /** Detailed trade-off matrix with advocate/opponent tracking */
  detailedTradeoffMatrix?: DetailedTradeOff[];
  /** Action items derived from the synthesis */
  recommendations: string[];
  /** Dissenting opinion if any agent strongly disagrees */
  dissent?: string;
  /** Detailed dissent report */
  dissentReport?: DissentReport;
  /** Contributions from each agent */
  agentContributions: Map<string, string>;
  /** Factors that contributed to confidence calculation */
  confidenceFactors?: ConfidenceFactors;
}

export interface SynthesisOptions {
  /** Strategy for combining perspectives */
  strategy: SynthesisStrategy;
  /** Threshold for detecting conflicts (0-1) */
  conflictThreshold?: number;
  /** Name of facilitator agent (for facilitator strategy) */
  facilitatorName?: string;
  /** Weights for each agent (for weighted strategy) */
  agentWeights?: Map<string, number>;
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze position distribution across perspectives
 */
function analyzePositions(perspectives: AgentPerspective[]): {
  approve: number;
  block: number;
  defer: number;
  neutral: number;
  total: number;
} {
  const counts = { approve: 0, block: 0, defer: 0, neutral: 0, total: perspectives.length };

  for (const p of perspectives) {
    counts[p.position]++;
  }

  return counts;
}

/**
 * Determine consensus level from position distribution
 */
function determineConsensusLevel(
  positions: ReturnType<typeof analyzePositions>
): ConsensusLevel {
  const { approve, block, defer, neutral, total } = positions;

  if (block > 0) {
    return 'none';
  }

  const approveRate = approve / total;

  if (approveRate === 1) {
    return 'unanimous';
  } else if (approveRate >= 0.75) {
    return 'strong';
  } else if (approveRate >= 0.5) {
    return 'moderate';
  } else if (approveRate >= 0.25) {
    return 'weak';
  } else {
    return 'none';
  }
}

/**
 * Calculate confidence score (basic version)
 */
function calculateConfidence(
  perspectives: AgentPerspective[],
  consensusLevel: ConsensusLevel
): number {
  let confidence = 0;

  // Base confidence from consensus level
  switch (consensusLevel) {
    case 'unanimous': confidence = 0.95; break;
    case 'strong': confidence = 0.8; break;
    case 'moderate': confidence = 0.6; break;
    case 'weak': confidence = 0.4; break;
    case 'none': confidence = 0.2; break;
  }

  // Adjust based on number of perspectives
  const perspectiveCount = perspectives.length;
  if (perspectiveCount >= 4) {
    confidence *= 1.1;
  } else if (perspectiveCount <= 2) {
    confidence *= 0.9;
  }

  // Cap at 0.99
  return Math.min(confidence, 0.99);
}

/**
 * Calculate enhanced confidence score with additional factors
 *
 * Factors in:
 * - Number of unique concerns addressed
 * - Agent expertise alignment (agents with relevant expertise agreeing increases confidence)
 * - Conflict resolution status (unresolved conflicts reduce confidence)
 *
 * @param perspectives Array of agent perspectives
 * @param consensusLevel The determined consensus level
 * @param factors Additional factors affecting confidence
 * @returns Enhanced confidence score and the factors used
 */
export function calculateEnhancedConfidence(
  perspectives: AgentPerspective[],
  consensusLevel: ConsensusLevel,
  factors?: Partial<ConfidenceFactors>
): { confidence: number; factors: ConfidenceFactors } {
  // Start with base confidence
  let confidence = calculateConfidence(perspectives, consensusLevel);

  // Initialize factors with defaults
  const computedFactors: ConfidenceFactors = {
    concernsAddressed: factors?.concernsAddressed ?? 0,
    totalConcerns: factors?.totalConcerns ?? countUniqueConcerns(perspectives),
    expertiseAlignmentCount: factors?.expertiseAlignmentCount ?? 0,
    totalRelevantExperts: factors?.totalRelevantExperts ?? 0,
    unresolvedConflicts: factors?.unresolvedConflicts ?? 0,
    domain: factors?.domain
  };

  // Factor 1: Concerns addressed ratio
  // If many concerns were addressed, increase confidence
  if (computedFactors.totalConcerns > 0) {
    const concernsRatio = computedFactors.concernsAddressed / computedFactors.totalConcerns;
    // Add up to 0.1 for fully addressed concerns
    confidence += concernsRatio * 0.1;
  }

  // Factor 2: Expertise alignment
  // If domain experts agree, increase confidence
  if (computedFactors.totalRelevantExperts > 0) {
    const expertAlignment = computedFactors.expertiseAlignmentCount / computedFactors.totalRelevantExperts;
    // Add up to 0.15 for full expert alignment
    confidence += expertAlignment * 0.15;
  } else if (computedFactors.domain) {
    // If we have a domain but no experts on it, slight confidence reduction
    confidence *= 0.95;
  }

  // Factor 3: Unresolved conflicts
  // Each unresolved conflict reduces confidence
  if (computedFactors.unresolvedConflicts > 0) {
    // Reduce by 0.05 per conflict, max 0.25 reduction
    const conflictPenalty = Math.min(computedFactors.unresolvedConflicts * 0.05, 0.25);
    confidence -= conflictPenalty;
  }

  // Cap between 0.05 and 0.99
  confidence = Math.max(0.05, Math.min(confidence, 0.99));

  return {
    confidence,
    factors: computedFactors
  };
}

/**
 * Count unique concerns across all perspectives
 */
function countUniqueConcerns(perspectives: AgentPerspective[]): number {
  const uniqueConcerns = new Set<string>();
  for (const p of perspectives) {
    for (const concern of p.concerns) {
      uniqueConcerns.add(concern.toLowerCase().trim());
    }
  }
  return uniqueConcerns.size;
}

/**
 * Assess expertise alignment for a given domain
 *
 * Checks how many agents with relevant expertise agree with the majority position
 */
export function assessExpertiseAlignment(
  perspectives: AgentPerspective[],
  domain: string
): { alignedCount: number; totalExperts: number; alignedAgents: string[] } {
  const domainLower = domain.toLowerCase();

  // Find agents with relevant expertise
  const relevantExperts = perspectives.filter(p =>
    p.agent.expertise.some(e => e.toLowerCase().includes(domainLower)) ||
    p.agent.role.toLowerCase().includes(domainLower)
  );

  // Determine majority position
  const positions = analyzePositions(perspectives);
  const majorityPosition: 'approve' | 'block' | 'defer' | 'neutral' =
    positions.approve >= positions.block ? 'approve' :
    positions.block > 0 ? 'block' :
    positions.defer > 0 ? 'defer' : 'neutral';

  // Count experts who align with majority
  const alignedExperts = relevantExperts.filter(p => p.position === majorityPosition);

  return {
    alignedCount: alignedExperts.length,
    totalExperts: relevantExperts.length,
    alignedAgents: alignedExperts.map(p => p.agent.name)
  };
}

/**
 * Extract common concerns across perspectives
 */
function findCommonConcerns(perspectives: AgentPerspective[]): string[] {
  const concernCounts = new Map<string, number>();

  for (const p of perspectives) {
    for (const concern of p.concerns) {
      const normalized = concern.toLowerCase().trim();
      concernCounts.set(normalized, (concernCounts.get(normalized) || 0) + 1);
    }
  }

  // Return concerns mentioned by at least 2 agents
  const common: string[] = [];
  for (const [concern, count] of concernCounts) {
    if (count >= 2) {
      common.push(concern);
    }
  }

  return common;
}

/**
 * Extract common recommendations across perspectives
 */
function findCommonRecommendations(perspectives: AgentPerspective[]): string[] {
  const recCounts = new Map<string, number>();

  for (const p of perspectives) {
    for (const rec of p.recommendations) {
      const normalized = rec.toLowerCase().trim();
      recCounts.set(normalized, (recCounts.get(normalized) || 0) + 1);
    }
  }

  // Return recommendations mentioned by at least 2 agents
  const common: string[] = [];
  for (const [rec, count] of recCounts) {
    if (count >= 2) {
      common.push(rec);
    }
  }

  return common;
}

/**
 * Generate trade-off analysis
 */
function generateTradeoffs(perspectives: AgentPerspective[]): string[] {
  const tradeoffs: string[] = [];

  // Look for gains and losses mentioned
  const gains: string[] = [];
  const losses: string[] = [];

  for (const p of perspectives) {
    const contentLower = p.content.toLowerCase();

    // Simple heuristic: look for gain/loss language
    if (contentLower.includes('gain') || contentLower.includes('benefit')) {
      // Extract surrounding context as a gain
      const match = p.content.match(/(?:gain|benefit)[^.]+\./i);
      if (match) gains.push(match[0]);
    }

    if (contentLower.includes('lose') || contentLower.includes('risk') || contentLower.includes('cost')) {
      const match = p.content.match(/(?:lose|risk|cost)[^.]+\./i);
      if (match) losses.push(match[0]);
    }
  }

  // Combine into trade-off statements
  if (gains.length > 0) {
    tradeoffs.push(`Gains: ${gains.slice(0, 3).join('; ')}`);
  }
  if (losses.length > 0) {
    tradeoffs.push(`Risks/Costs: ${losses.slice(0, 3).join('; ')}`);
  }

  return tradeoffs;
}

// ============================================================================
// Synthesis Strategies
// ============================================================================

/**
 * Consensus strategy: Find common ground
 */
function synthesizeConsensus(
  perspectives: AgentPerspective[],
  options: SynthesisOptions
): SynthesisResult {
  const positions = analyzePositions(perspectives);
  const consensusLevel = determineConsensusLevel(positions);
  const confidence = calculateConfidence(perspectives, consensusLevel);

  const commonConcerns = findCommonConcerns(perspectives);
  const commonRecs = findCommonRecommendations(perspectives);
  const tradeoffs = generateTradeoffs(perspectives);

  // Build agent contributions
  const contributions = new Map<string, string>();
  for (const p of perspectives) {
    contributions.set(
      p.agent.name,
      `Position: ${p.position}. ${p.concerns.length > 0 ? `Concerns: ${p.concerns.join(', ')}` : ''}`
    );
  }

  // Build decision based on consensus
  let decision: string;
  let rationale: string;

  if (consensusLevel === 'unanimous' || consensusLevel === 'strong') {
    decision = 'Proceed with the proposed approach';
    rationale = `${positions.approve} of ${positions.total} agents approve. Common ground exists on key concerns.`;
  } else if (consensusLevel === 'moderate') {
    decision = 'Proceed with modifications to address minority concerns';
    rationale = `Moderate consensus (${positions.approve}/${positions.total} approve). Some concerns require attention.`;
  } else if (consensusLevel === 'weak') {
    decision = 'Requires additional discussion before proceeding';
    rationale = `Weak consensus (${positions.approve}/${positions.total} approve). Significant concerns remain.`;
  } else {
    decision = 'Cannot proceed - blocking concerns must be resolved';
    rationale = `No consensus (${positions.block} blocking). Critical issues prevent progress.`;
  }

  // Identify dissent
  const blockers = perspectives.filter(p => p.position === 'block');
  let dissent: string | undefined;

  if (blockers.length > 0) {
    const blocker = blockers[0];
    dissent = `${blocker.agent.name} (${blocker.agent.role}) blocks: ${blocker.concerns.join('; ')}`;
  }

  return {
    decision,
    confidence,
    consensusLevel,
    rationale,
    tradeoffs,
    recommendations: commonRecs.length > 0 ? commonRecs : perspectives.flatMap(p => p.recommendations).slice(0, 5),
    dissent,
    agentContributions: contributions
  };
}

/**
 * Weighted strategy: Weight by domain expertise
 */
function synthesizeWeighted(
  perspectives: AgentPerspective[],
  options: SynthesisOptions
): SynthesisResult {
  const weights = options.agentWeights || new Map();

  // Default weights based on veto power
  for (const p of perspectives) {
    if (!weights.has(p.agent.name)) {
      weights.set(p.agent.name, p.agent.vetoPower ? 1.5 : 1.0);
    }
  }

  // Calculate weighted position scores
  let approveWeight = 0;
  let blockWeight = 0;
  let totalWeight = 0;

  for (const p of perspectives) {
    const weight = weights.get(p.agent.name) || 1.0;
    totalWeight += weight;

    if (p.position === 'approve') {
      approveWeight += weight;
    } else if (p.position === 'block') {
      blockWeight += weight;
    }
  }

  const approveRatio = approveWeight / totalWeight;
  const blockRatio = blockWeight / totalWeight;

  // Determine consensus level from weighted scores
  let consensusLevel: ConsensusLevel;

  if (blockRatio > 0.3) {
    consensusLevel = 'none';
  } else if (approveRatio >= 0.85) {
    consensusLevel = 'strong';
  } else if (approveRatio >= 0.6) {
    consensusLevel = 'moderate';
  } else {
    consensusLevel = 'weak';
  }

  const confidence = calculateConfidence(perspectives, consensusLevel);
  const tradeoffs = generateTradeoffs(perspectives);

  // Build contributions
  const contributions = new Map<string, string>();
  for (const p of perspectives) {
    const weight = weights.get(p.agent.name) || 1.0;
    contributions.set(
      p.agent.name,
      `Weight: ${weight.toFixed(1)}. Position: ${p.position}.`
    );
  }

  // Build decision
  let decision: string;
  let rationale: string;

  if (consensusLevel === 'strong') {
    decision = 'Proceed - weighted analysis supports the approach';
    rationale = `Weighted approval: ${(approveRatio * 100).toFixed(0)}%. Domain experts support this decision.`;
  } else if (consensusLevel === 'moderate') {
    decision = 'Proceed with caution - some expert concerns';
    rationale = `Weighted approval: ${(approveRatio * 100).toFixed(0)}%. Some domain experts have reservations.`;
  } else {
    decision = 'Requires revision - expert concerns are significant';
    rationale = `Weighted approval: ${(approveRatio * 100).toFixed(0)}%. Domain experts have blocking concerns.`;
  }

  // Identify dissent from high-weight agents
  const highWeightBlockers = perspectives.filter(
    p => p.position === 'block' && (weights.get(p.agent.name) || 0) >= 1.0
  );

  let dissent: string | undefined;
  if (highWeightBlockers.length > 0) {
    dissent = highWeightBlockers
      .map(p => `${p.agent.name} (weight ${weights.get(p.agent.name)}): ${p.concerns.join('; ')}`)
      .join('\n');
  }

  return {
    decision,
    confidence,
    consensusLevel,
    rationale,
    tradeoffs,
    recommendations: perspectives.flatMap(p => p.recommendations).slice(0, 5),
    dissent,
    agentContributions: contributions
  };
}

/**
 * Facilitator strategy: Designated agent decides
 */
function synthesizeFacilitator(
  perspectives: AgentPerspective[],
  options: SynthesisOptions
): SynthesisResult {
  // Find facilitator (default to first agent with ProductManager role)
  let facilitator: AgentPerspective | undefined;

  if (options.facilitatorName) {
    facilitator = perspectives.find(
      p => p.agent.name.toLowerCase() === options.facilitatorName!.toLowerCase()
    );
  }

  if (!facilitator) {
    facilitator = perspectives.find(
      p => p.agent.role.toLowerCase().includes('product') ||
           p.agent.role.toLowerCase().includes('manager')
    );
  }

  if (!facilitator) {
    // Fall back to first agent
    facilitator = perspectives[0];
  }

  // Use facilitator's position as the decision
  const decision = facilitator.position === 'approve'
    ? 'Proceed - facilitator approves'
    : facilitator.position === 'block'
      ? 'Blocked - facilitator has concerns'
      : 'Deferred - facilitator requests more information';

  // Collect all concerns and recommendations
  const allConcerns = perspectives.flatMap(p => p.concerns);
  const allRecs = perspectives.flatMap(p => p.recommendations);
  const tradeoffs = generateTradeoffs(perspectives);

  // Build contributions
  const contributions = new Map<string, string>();
  for (const p of perspectives) {
    const isFacilitator = p.agent.name === facilitator.agent.name;
    contributions.set(
      p.agent.name,
      `${isFacilitator ? '[FACILITATOR] ' : ''}Position: ${p.position}. ${p.concerns.join('; ')}`
    );
  }

  // Identify dissent from non-facilitator agents who disagree
  const dissenters = perspectives.filter(
    p => p.agent.name !== facilitator!.agent.name && p.position !== facilitator!.position
  );

  let dissent: string | undefined;
  if (dissenters.length > 0) {
    dissent = `The following agents disagree with facilitator's decision:\n${
      dissenters.map(p => `- ${p.agent.name}: ${p.position}`).join('\n')
    }`;
  }

  return {
    decision,
    confidence: facilitator.position === 'approve' ? 0.7 : 0.5,
    consensusLevel: dissenters.length === 0 ? 'strong' : 'moderate',
    rationale: `Facilitator (${facilitator.agent.name}) made final decision after hearing all perspectives.`,
    tradeoffs,
    recommendations: allRecs.slice(0, 5),
    dissent,
    agentContributions: contributions
  };
}

// ============================================================================
// Main Synthesis Function
// ============================================================================

/**
 * Synthesize agent perspectives into a decision
 *
 * @param perspectives Array of agent perspectives
 * @param options Synthesis configuration
 * @returns Synthesized result
 */
export function synthesize(
  perspectives: AgentPerspective[],
  options: SynthesisOptions
): SynthesisResult {
  if (perspectives.length === 0) {
    return {
      decision: 'No decision - no perspectives provided',
      confidence: 0,
      consensusLevel: 'none',
      rationale: 'No agent perspectives were collected.',
      tradeoffs: [],
      recommendations: [],
      agentContributions: new Map()
    };
  }

  switch (options.strategy) {
    case 'consensus':
      return synthesizeConsensus(perspectives, options);
    case 'weighted':
      return synthesizeWeighted(perspectives, options);
    case 'facilitator':
      return synthesizeFacilitator(perspectives, options);
    default:
      return synthesizeConsensus(perspectives, options);
  }
}

/**
 * Generate a trade-off matrix for complex decisions
 */
export function generateTradeoffMatrix(
  perspectives: AgentPerspective[],
  options: string[]
): TradeOff[] {
  const matrix: TradeOff[] = [];

  for (const option of options) {
    const gains: string[] = [];
    const losses: string[] = [];
    let riskScore = 0;

    // Analyze perspectives for mentions of this option
    for (const p of perspectives) {
      const contentLower = p.content.toLowerCase();
      const optionLower = option.toLowerCase();

      if (contentLower.includes(optionLower)) {
        // This agent commented on this option
        if (p.position === 'approve') {
          gains.push(`${p.agent.name}: supports this approach`);
        } else if (p.position === 'block') {
          losses.push(`${p.agent.name}: has blocking concerns`);
          riskScore += 2;
        } else if (p.position === 'defer') {
          losses.push(`${p.agent.name}: uncertain`);
          riskScore += 1;
        }
      }
    }

    matrix.push({
      option,
      gains,
      losses,
      risk: riskScore >= 4 ? 'high' : riskScore >= 2 ? 'medium' : 'low'
    });
  }

  return matrix;
}

/**
 * Generate a detailed trade-off matrix with advocate/opponent tracking
 *
 * Returns structured TradeOff[] with:
 * - option: The choice being evaluated
 * - advocates: Agents who support this option
 * - opponents: Agents who oppose
 * - gains: Specific benefits (extracted from agent content)
 * - losses: Specific costs/risks
 * - risk: calculated from supporter/opponent ratio
 */
export function generateDetailedTradeoffMatrix(
  perspectives: AgentPerspective[],
  options?: string[]
): DetailedTradeOff[] {
  const matrix: DetailedTradeOff[] = [];

  // If no options provided, extract them from agent content
  const optionsToEvaluate = options || extractOptionsFromContent(perspectives);

  for (const option of optionsToEvaluate) {
    const advocates: string[] = [];
    const opponents: string[] = [];
    const gains: string[] = [];
    const losses: string[] = [];
    let supportScore = 0;
    let opposeScore = 0;

    const optionLower = option.toLowerCase();

    for (const p of perspectives) {
      const contentLower = p.content.toLowerCase();

      // Check if agent mentions this option
      if (!contentLower.includes(optionLower)) {
        continue;
      }

      // Categorize agent as advocate or opponent
      if (p.position === 'approve') {
        advocates.push(p.agent.name);
        supportScore++;

        // Extract gains from supporting agents
        const gainPatterns = [
          /(?:will|would|can)\s+(?:improve|increase|enhance|enable|provide|deliver)[^.]+\./gi,
          /(?:benefit|advantage|gain|improvement)[^.]+\./gi,
          /(?:faster|better|cheaper|easier|simpler)[^.]+\./gi
        ];

        for (const pattern of gainPatterns) {
          const matches = p.content.match(pattern);
          if (matches) {
            gains.push(...matches.slice(0, 2).map(m => `${p.agent.name}: ${m.trim()}`));
          }
        }
      } else if (p.position === 'block') {
        opponents.push(p.agent.name);
        opposeScore += 2; // Blockers count double

        // Extract losses from blocking agents
        for (const concern of p.concerns) {
          losses.push(`${p.agent.name}: ${concern}`);
        }
      } else if (p.position === 'defer') {
        opponents.push(p.agent.name);
        opposeScore++;

        // Deferral indicates uncertainty, which is a risk
        losses.push(`${p.agent.name}: Uncertain/needs more information`);
      }
    }

    // Calculate risk from supporter/opponent ratio
    const totalParticipants = advocates.length + opponents.length;
    let risk: 'low' | 'medium' | 'high' = 'low';
    let riskScore = 0;

    if (totalParticipants > 0) {
      const opposeRatio = opposeScore / (supportScore + opposeScore);
      riskScore = opposeRatio * 10; // 0-10 scale

      if (opposeRatio >= 0.5) {
        risk = 'high';
      } else if (opposeRatio >= 0.25) {
        risk = 'medium';
      } else {
        risk = 'low';
      }
    }

    matrix.push({
      option,
      advocates,
      opponents,
      gains: gains.slice(0, 5), // Limit to top 5
      losses: losses.slice(0, 5),
      risk,
      riskScore
    });
  }

  // Sort by risk score (highest risk first)
  matrix.sort((a, b) => b.riskScore - a.riskScore);

  return matrix;
}

/**
 * Extract potential options/approaches from agent content
 */
function extractOptionsFromContent(perspectives: AgentPerspective[]): string[] {
  const options = new Set<string>();

  // Look for option-indicating patterns
  const optionPatterns = [
    /(?:option|approach|alternative|solution)\s*(?:\d+|[A-C])?\s*[:\-]?\s*([^.]+)/gi,
    /(?:we could|we should|consider|recommend)\s+([^.]+)/gi,
    /(?:propose|suggest)\s+([^.]+)/gi
  ];

  for (const p of perspectives) {
    for (const pattern of optionPatterns) {
      const matches = p.content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10 && match[1].length < 100) {
          options.add(match[1].trim());
        }
      }
    }
  }

  return Array.from(options).slice(0, 5); // Limit to 5 options
}

/**
 * Generate a detailed dissent report for minority opinion documentation
 *
 * Provides comprehensive documentation of dissenting views including:
 * - Who dissents and their positions
 * - Their specific concerns
 * - Their relevant expertise
 * - Whether they have veto power
 */
export function generateDissentReport(
  perspectives: AgentPerspective[]
): DissentReport {
  // Find dissenting agents (blockers and deferring agents)
  const dissenters = perspectives.filter(
    p => p.position === 'block' || p.position === 'defer'
  );

  // Collect unique concerns from dissenters
  const uniqueConcerns = new Set<string>();
  for (const d of dissenters) {
    for (const concern of d.concerns) {
      uniqueConcerns.add(concern);
    }
  }

  // Check for veto power
  const hasVetoPower = dissenters.some(d => d.agent.vetoPower);

  // Build dissenter details
  const dissenterDetails = dissenters.map(d => ({
    agent: d.agent.name,
    role: d.agent.role,
    position: d.position as 'block' | 'defer',
    concerns: d.concerns,
    expertise: d.agent.expertise,
    hasVetoPower: d.agent.vetoPower
  }));

  // Generate summary
  let summary: string;
  if (dissenters.length === 0) {
    summary = 'No dissenting opinions recorded.';
  } else if (hasVetoPower) {
    const vetoAgent = dissenters.find(d => d.agent.vetoPower);
    summary = `VETO ACTIVE: ${vetoAgent?.agent.name} (${vetoAgent?.agent.role}) blocks this decision. ` +
      `Their concerns must be addressed before proceeding.`;
  } else if (dissenters.every(d => d.position === 'defer')) {
    summary = `${dissenters.length} agent(s) deferred, citing need for more information: ` +
      `${dissenters.map(d => d.agent.name).join(', ')}.`;
  } else {
    const blockers = dissenters.filter(d => d.position === 'block');
    const deferrers = dissenters.filter(d => d.position === 'defer');
    summary = `${blockers.length} blocking, ${deferrers.length} deferring. ` +
      `Key concerns: ${Array.from(uniqueConcerns).slice(0, 3).join('; ')}.`;
  }

  return {
    dissentCount: dissenters.length,
    dissenters: dissenterDetails,
    uniqueConcerns: Array.from(uniqueConcerns),
    hasVetoPower,
    summary
  };
}

// ============================================================================
// Export
// ============================================================================

export {
  analyzePositions,
  determineConsensusLevel,
  calculateConfidence,
  findCommonConcerns,
  findCommonRecommendations,
  countUniqueConcerns
};
