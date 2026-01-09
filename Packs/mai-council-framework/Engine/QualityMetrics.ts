#!/usr/bin/env bun

/**
 * Quality Metrics
 *
 * Provides quality metrics for council sessions to measure deliberation quality.
 *
 * Metrics include:
 * - Perspective diversity and count
 * - Concern coverage and resolution
 * - Conflict detection and resolution rates
 * - Devil's advocate engagement
 * - Expertise alignment scoring
 * - Overall quality score
 *
 * Usage:
 *   import { calculateQualityMetrics, assessExpertiseAlignment } from './QualityMetrics';
 *   const metrics = calculateQualityMetrics(session);
 */

import type { Agent } from './AgentLoader';
import type { CouncilSession, CouncilRound, AgentPerspective } from '../Adapters/AdapterInterface';
import type { Conflict } from './ConflictResolver';

// ============================================================================
// Types
// ============================================================================

/**
 * Quality metrics for a council session
 */
export interface QualityMetrics {
  /** Number of unique agent perspectives collected */
  perspectiveCount: number;
  /** Number of unique concerns raised across all agents */
  uniqueConcernsRaised: number;
  /** Number of concerns that were addressed (acknowledged by other agents) */
  concernsAddressed: number;
  /** Number of conflicts detected during session */
  conflictsDetected: number;
  /** Number of conflicts that were resolved */
  conflictsResolved: number;
  /** Whether a devil's advocate was engaged in the session */
  devilsAdvocateEngaged: boolean;
  /** Number of discussion rounds held */
  roundCount: number;
  /** Score (0-1) indicating how well agent expertise matched the topic */
  expertiseAlignmentScore: number;
  /** Overall quality score (0-1) */
  qualityScore: number;
  /** Breakdown of how quality score was calculated */
  scoreBreakdown?: QualityScoreBreakdown;
}

/**
 * Breakdown of quality score components
 */
export interface QualityScoreBreakdown {
  /** Score from perspective diversity (0-0.2) */
  perspectiveDiversity: number;
  /** Score from concern coverage (0-0.2) */
  concernCoverage: number;
  /** Score from conflict resolution (0-0.2) */
  conflictResolution: number;
  /** Score from devil's advocate engagement (0-0.15) */
  devilsAdvocate: number;
  /** Score from expertise alignment (0-0.15) */
  expertiseAlignment: number;
  /** Score from round depth (0-0.1) */
  roundDepth: number;
}

/**
 * Options for quality calculation
 */
export interface QualityOptions {
  /** Topic/domain for expertise alignment calculation */
  domain?: string;
  /** Whether devil's advocate was enabled for this session */
  devilsAdvocateEnabled?: boolean;
  /** Minimum perspectives required for full score */
  minPerspectives?: number;
  /** Expected number of rounds for full depth score */
  expectedRounds?: number;
}

// ============================================================================
// Expertise Alignment
// ============================================================================

/**
 * Assess how well agent expertise aligns with the discussion domain
 *
 * @param agents Array of agents in the session
 * @param domain The topic/domain being discussed
 * @returns Score from 0-1 indicating expertise alignment
 */
export function assessExpertiseAlignment(agents: Agent[], domain: string): number {
  if (!domain || agents.length === 0) {
    return 0.5; // Default to neutral if no domain specified
  }

  const domainLower = domain.toLowerCase();
  const domainKeywords = extractDomainKeywords(domainLower);

  let totalAlignment = 0;
  let maxPossibleAlignment = 0;

  for (const agent of agents) {
    // Check expertise match
    let agentAlignment = 0;
    const expertiseLower = agent.expertise.map(e => e.toLowerCase());
    const roleLower = agent.role.toLowerCase();

    // Check if any expertise matches domain keywords
    for (const expertise of expertiseLower) {
      for (const keyword of domainKeywords) {
        if (expertise.includes(keyword) || keyword.includes(expertise)) {
          agentAlignment += 1;
          break;
        }
      }
    }

    // Check if role matches domain
    for (const keyword of domainKeywords) {
      if (roleLower.includes(keyword)) {
        agentAlignment += 0.5;
        break;
      }
    }

    // Check trigger words
    const triggersLower = agent.triggers.map(t => t.toLowerCase());
    for (const trigger of triggersLower) {
      for (const keyword of domainKeywords) {
        if (trigger.includes(keyword)) {
          agentAlignment += 0.5;
          break;
        }
      }
    }

    totalAlignment += Math.min(agentAlignment, 2); // Cap per agent
    maxPossibleAlignment += 2;
  }

  return maxPossibleAlignment > 0 ? totalAlignment / maxPossibleAlignment : 0.5;
}

/**
 * Extract keywords from a domain string
 */
function extractDomainKeywords(domain: string): string[] {
  // Split on common separators and filter short words
  const words = domain.split(/[\s,\-_\/]+/).filter(w => w.length >= 3);

  // Add common domain synonyms
  const synonyms: Record<string, string[]> = {
    security: ['security', 'auth', 'encryption', 'vulnerability', 'threat'],
    performance: ['performance', 'speed', 'optimization', 'latency', 'throughput'],
    testing: ['testing', 'test', 'qa', 'quality', 'validation'],
    architecture: ['architecture', 'design', 'structure', 'system'],
    database: ['database', 'db', 'sql', 'data', 'storage'],
    api: ['api', 'rest', 'graphql', 'endpoint', 'integration'],
    frontend: ['frontend', 'ui', 'ux', 'interface', 'client'],
    backend: ['backend', 'server', 'service', 'api'],
    devops: ['devops', 'deploy', 'ci', 'cd', 'infrastructure'],
    cloud: ['cloud', 'aws', 'azure', 'gcp', 'kubernetes']
  };

  const keywords = new Set(words);

  // Add synonyms for matched words
  for (const word of words) {
    for (const [key, syns] of Object.entries(synonyms)) {
      if (word === key || syns.includes(word)) {
        syns.forEach(s => keywords.add(s));
      }
    }
  }

  return Array.from(keywords);
}

// ============================================================================
// Concern Analysis
// ============================================================================

/**
 * Analyze concerns raised and addressed across perspectives
 */
function analyzeConcerns(perspectives: AgentPerspective[]): {
  raised: number;
  addressed: number;
  concerns: Map<string, { raisedBy: string[]; addressedBy: string[] }>;
} {
  const concernMap = new Map<string, { raisedBy: string[]; addressedBy: string[] }>();

  // Collect all concerns
  for (const p of perspectives) {
    for (const concern of p.concerns) {
      const normalized = concern.toLowerCase().trim();
      if (!concernMap.has(normalized)) {
        concernMap.set(normalized, { raisedBy: [], addressedBy: [] });
      }
      concernMap.get(normalized)!.raisedBy.push(p.agent.name);
    }
  }

  // Check which concerns were addressed (mentioned by other agents)
  for (const p of perspectives) {
    const contentLower = p.content.toLowerCase();

    for (const [concern, data] of concernMap) {
      // Skip if this agent raised the concern
      if (data.raisedBy.includes(p.agent.name)) {
        continue;
      }

      // Check if this agent's content addresses the concern
      const concernWords = concern.split(/\s+/).filter(w => w.length >= 4);
      const matchCount = concernWords.filter(w => contentLower.includes(w)).length;

      if (matchCount >= Math.ceil(concernWords.length * 0.5)) {
        data.addressedBy.push(p.agent.name);
      }
    }
  }

  // Count unique concerns and those addressed
  let addressed = 0;
  for (const data of concernMap.values()) {
    if (data.addressedBy.length > 0) {
      addressed++;
    }
  }

  return {
    raised: concernMap.size,
    addressed,
    concerns: concernMap
  };
}

// ============================================================================
// Quality Score Calculation
// ============================================================================

/**
 * Calculate comprehensive quality metrics for a council session
 *
 * @param session The council session to evaluate
 * @param options Additional options for calculation
 * @returns Quality metrics with overall score
 */
export function calculateQualityMetrics(
  session: CouncilSession,
  options?: QualityOptions
): QualityMetrics {
  const opts: Required<QualityOptions> = {
    domain: options?.domain || '',
    devilsAdvocateEnabled: options?.devilsAdvocateEnabled ?? true,
    minPerspectives: options?.minPerspectives ?? 3,
    expectedRounds: options?.expectedRounds ?? 2
  };

  // Collect all perspectives across all rounds
  const allPerspectives: AgentPerspective[] = session.rounds.flatMap(r => r.perspectives);

  // Count unique agents
  const uniqueAgents = new Set(allPerspectives.map(p => p.agent.name));
  const perspectiveCount = uniqueAgents.size;

  // Analyze concerns
  const concernAnalysis = analyzeConcerns(allPerspectives);

  // Collect and analyze conflicts
  const allConflicts: Conflict[] = session.rounds.flatMap(r => r.conflicts);
  const conflictsDetected = allConflicts.length;
  const conflictsResolved = allConflicts.filter(c => c.resolved).length;

  // Check for devil's advocate engagement (heuristic: look for challenging language)
  const devilsAdvocateEngaged = allPerspectives.some(p => {
    const contentLower = p.content.toLowerCase();
    return (
      contentLower.includes("devil's advocate") ||
      contentLower.includes('playing devil') ||
      contentLower.includes('challenge this') ||
      contentLower.includes('counterpoint') ||
      contentLower.includes('on the other hand')
    );
  });

  // Calculate expertise alignment
  const expertiseAlignmentScore = assessExpertiseAlignment(session.roster, opts.domain);

  // Calculate component scores
  const breakdown = calculateScoreBreakdown({
    perspectiveCount,
    minPerspectives: opts.minPerspectives,
    concernsRaised: concernAnalysis.raised,
    concernsAddressed: concernAnalysis.addressed,
    conflictsDetected,
    conflictsResolved,
    devilsAdvocateEngaged,
    devilsAdvocateEnabled: opts.devilsAdvocateEnabled,
    roundCount: session.rounds.length,
    expectedRounds: opts.expectedRounds,
    expertiseAlignmentScore
  });

  // Calculate overall quality score
  const qualityScore =
    breakdown.perspectiveDiversity +
    breakdown.concernCoverage +
    breakdown.conflictResolution +
    breakdown.devilsAdvocate +
    breakdown.expertiseAlignment +
    breakdown.roundDepth;

  return {
    perspectiveCount,
    uniqueConcernsRaised: concernAnalysis.raised,
    concernsAddressed: concernAnalysis.addressed,
    conflictsDetected,
    conflictsResolved,
    devilsAdvocateEngaged,
    roundCount: session.rounds.length,
    expertiseAlignmentScore,
    qualityScore: Math.min(qualityScore, 1), // Cap at 1.0
    scoreBreakdown: breakdown
  };
}

/**
 * Calculate individual score components
 */
function calculateScoreBreakdown(params: {
  perspectiveCount: number;
  minPerspectives: number;
  concernsRaised: number;
  concernsAddressed: number;
  conflictsDetected: number;
  conflictsResolved: number;
  devilsAdvocateEngaged: boolean;
  devilsAdvocateEnabled: boolean;
  roundCount: number;
  expectedRounds: number;
  expertiseAlignmentScore: number;
}): QualityScoreBreakdown {
  // Perspective diversity (0-0.2)
  // Full score at minPerspectives, scales linearly
  const perspectiveDiversity = Math.min(
    params.perspectiveCount / params.minPerspectives,
    1
  ) * 0.2;

  // Concern coverage (0-0.2)
  // Based on ratio of addressed to raised concerns
  let concernCoverage = 0;
  if (params.concernsRaised > 0) {
    concernCoverage = (params.concernsAddressed / params.concernsRaised) * 0.2;
  } else {
    // No concerns raised - could be good (no issues) or bad (shallow discussion)
    concernCoverage = 0.1; // Neutral
  }

  // Conflict resolution (0-0.2)
  // High score for detecting and resolving conflicts
  let conflictResolution = 0;
  if (params.conflictsDetected > 0) {
    const resolutionRate = params.conflictsResolved / params.conflictsDetected;
    conflictResolution = resolutionRate * 0.15;
    // Bonus for detecting conflicts (indicates thorough discussion)
    conflictResolution += 0.05;
  } else {
    // No conflicts detected - could mean consensus or shallow discussion
    conflictResolution = 0.1; // Neutral
  }

  // Devil's advocate (0-0.15)
  let devilsAdvocate = 0;
  if (params.devilsAdvocateEnabled) {
    if (params.devilsAdvocateEngaged) {
      devilsAdvocate = 0.15; // Full score for engagement
    } else {
      devilsAdvocate = 0.05; // Partial score - enabled but not clearly engaged
    }
  } else {
    devilsAdvocate = 0.075; // Neutral if not enabled
  }

  // Expertise alignment (0-0.15)
  const expertiseAlignment = params.expertiseAlignmentScore * 0.15;

  // Round depth (0-0.1)
  // Full score at expectedRounds, bonus for more rounds
  const roundDepth = Math.min(
    params.roundCount / params.expectedRounds,
    1.2 // Allow 20% bonus for extra rounds
  ) * 0.1;

  return {
    perspectiveDiversity,
    concernCoverage,
    conflictResolution,
    devilsAdvocate,
    expertiseAlignment,
    roundDepth: Math.min(roundDepth, 0.1) // Cap at max
  };
}

// ============================================================================
// Quality Thresholds
// ============================================================================

/**
 * Quality level based on score
 */
export type QualityLevel = 'excellent' | 'good' | 'adequate' | 'poor';

/**
 * Determine quality level from score
 */
export function getQualityLevel(score: number): QualityLevel {
  if (score >= 0.8) return 'excellent';
  if (score >= 0.6) return 'good';
  if (score >= 0.4) return 'adequate';
  return 'poor';
}

/**
 * Check if quality meets a threshold
 */
export function meetsQualityThreshold(metrics: QualityMetrics, threshold: number): boolean {
  return metrics.qualityScore >= threshold;
}

/**
 * Get recommendations for improving quality
 */
export function getQualityRecommendations(metrics: QualityMetrics): string[] {
  const recommendations: string[] = [];
  const breakdown = metrics.scoreBreakdown;

  if (!breakdown) {
    return ['Unable to provide recommendations without score breakdown'];
  }

  // Check each component and suggest improvements
  if (breakdown.perspectiveDiversity < 0.15) {
    recommendations.push('Include more diverse agent perspectives for better coverage');
  }

  if (breakdown.concernCoverage < 0.15 && metrics.uniqueConcernsRaised > 0) {
    recommendations.push('Ensure raised concerns are explicitly addressed in discussion');
  }

  if (breakdown.conflictResolution < 0.1 && metrics.conflictsDetected > 0) {
    recommendations.push('Focus on resolving detected conflicts before concluding');
  }

  if (breakdown.devilsAdvocate < 0.1) {
    recommendations.push('Engage devil\'s advocate more actively to challenge assumptions');
  }

  if (breakdown.expertiseAlignment < 0.1) {
    recommendations.push('Include agents with domain expertise more relevant to the topic');
  }

  if (breakdown.roundDepth < 0.08) {
    recommendations.push('Allow for additional discussion rounds for deeper deliberation');
  }

  return recommendations;
}

// ============================================================================
// Export
// ============================================================================

export {
  extractDomainKeywords,
  analyzeConcerns,
  calculateScoreBreakdown
};
