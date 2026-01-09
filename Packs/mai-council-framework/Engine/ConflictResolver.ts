#!/usr/bin/env bun

/**
 * Conflict Resolver
 *
 * Detects conflicts between agent perspectives and suggests resolutions.
 *
 * Conflict Types:
 * - direct: Mutually exclusive positions (must choose one)
 * - priority: Different rankings of same options
 * - scope: Different definitions of "done"
 *
 * Usage:
 *   import { detectConflicts, resolveConflicts } from './ConflictResolver';
 *   const conflicts = detectConflicts(perspectives, 0.3);
 *   await resolveConflicts(conflicts, perspectives);
 */

import type { Agent } from './AgentLoader';

// ============================================================================
// Types
// ============================================================================

export type ConflictType = 'direct' | 'priority' | 'scope' | 'semantic';
export type ConflictSeverity = 'critical' | 'major' | 'minor';
export type ConflictStance = 'collaborative' | 'assertive' | 'analytical';

/**
 * Agent stance analysis result
 */
export interface AgentStanceAnalysis {
  agent: string;
  stance: ConflictStance;
  indicators: string[];
}

/**
 * Semantic conflict patterns - opposing phrases that indicate disagreement
 */
const SEMANTIC_CONFLICT_PATTERNS: { positive: string[]; negative: string[] }[] = [
  {
    positive: ['must have', 'required', 'essential', 'critical', 'mandatory'],
    negative: ['out of scope', 'not needed', 'unnecessary', 'defer', "won't have", 'nice to have']
  },
  {
    positive: ['proceed immediately', 'urgent', 'high priority', 'now'],
    negative: ['wait', 'delay', 'later', 'low priority', 'not urgent']
  },
  {
    positive: ['proven approach', 'established', 'standard', 'conventional'],
    negative: ['innovative', 'new approach', 'experimental', 'cutting edge']
  },
  {
    positive: ['comprehensive', 'thorough', 'complete coverage'],
    negative: ['minimal', 'mvp', 'basic', 'simplified']
  }
];

export interface AgentPerspective {
  agent: Agent;
  round: number;
  content: string;
  position: 'approve' | 'block' | 'defer' | 'neutral';
  concerns: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface Conflict {
  /** Unique identifier */
  id: string;
  /** Type of conflict */
  type: ConflictType;
  /** Severity level */
  severity: ConflictSeverity;
  /** Description of the conflict */
  description: string;
  /** Agents involved */
  agents: string[];
  /** The perspectives causing the conflict */
  perspectives: AgentPerspective[];
  /** Whether this conflict has been resolved */
  resolved: boolean;
  /** Resolution description if resolved */
  resolution?: string;
  /** Suggested resolution approach */
  suggestedResolution?: string;
}

export interface ConflictResolution {
  conflict: Conflict;
  strategy: 'compromise' | 'prioritize' | 'defer' | 'phased';
  description: string;
  acceptedBy: string[];
  rejectedBy: string[];
}

// ============================================================================
// Agent Stance Analysis
// ============================================================================

/**
 * Analyze an agent's conflict stance based on their personality and content
 *
 * @param agent The agent to analyze
 * @param content Optional content to analyze for stance indicators
 * @returns The detected conflict stance
 */
export function analyzeAgentStance(agent: Agent, content?: string): AgentStanceAnalysis {
  const indicators: string[] = [];
  let collaborativeScore = 0;
  let assertiveScore = 0;
  let analyticalScore = 0;

  // Analyze personality traits
  const personalityLower = agent.personality.map(p => p.toLowerCase());

  // Collaborative indicators
  const collaborativeTraits = ['diplomatic', 'consensus-building', 'empathetic', 'flexible', 'open-minded', 'team-oriented'];
  for (const trait of collaborativeTraits) {
    if (personalityLower.some(p => p.includes(trait))) {
      collaborativeScore++;
      indicators.push(`personality: ${trait}`);
    }
  }

  // Assertive indicators
  const assertiveTraits = ['direct', 'confident', 'decisive', 'firm', 'proactive', 'bold'];
  for (const trait of assertiveTraits) {
    if (personalityLower.some(p => p.includes(trait))) {
      assertiveScore++;
      indicators.push(`personality: ${trait}`);
    }
  }

  // Analytical indicators
  const analyticalTraits = ['methodical', 'detail-oriented', 'systematic', 'logical', 'thorough', 'cautious', 'risk-aware'];
  for (const trait of analyticalTraits) {
    if (personalityLower.some(p => p.includes(trait))) {
      analyticalScore++;
      indicators.push(`personality: ${trait}`);
    }
  }

  // Analyze content if provided
  if (content) {
    const contentLower = content.toLowerCase();

    // Collaborative language
    if (contentLower.includes('we could') || contentLower.includes('perhaps') || contentLower.includes('consider')) {
      collaborativeScore++;
      indicators.push('language: collaborative');
    }

    // Assertive language
    if (contentLower.includes('must') || contentLower.includes('should') || contentLower.includes('require')) {
      assertiveScore++;
      indicators.push('language: assertive');
    }

    // Analytical language
    if (contentLower.includes('analyze') || contentLower.includes('data') || contentLower.includes('evidence')) {
      analyticalScore++;
      indicators.push('language: analytical');
    }
  }

  // Veto power suggests assertive stance
  if (agent.vetoPower) {
    assertiveScore += 2;
    indicators.push('has veto power');
  }

  // Determine dominant stance
  let stance: ConflictStance = 'collaborative'; // default
  const maxScore = Math.max(collaborativeScore, assertiveScore, analyticalScore);

  if (maxScore === analyticalScore && analyticalScore > 0) {
    stance = 'analytical';
  } else if (maxScore === assertiveScore && assertiveScore > 0) {
    stance = 'assertive';
  } else if (collaborativeScore > 0) {
    stance = 'collaborative';
  }

  return {
    agent: agent.name,
    stance,
    indicators
  };
}

/**
 * Compare conflict stances between agents to assess potential for resolution
 */
export function compareAgentStances(
  perspectives: AgentPerspective[]
): Map<string, AgentStanceAnalysis> {
  const stances = new Map<string, AgentStanceAnalysis>();

  for (const p of perspectives) {
    stances.set(p.agent.name, analyzeAgentStance(p.agent, p.content));
  }

  return stances;
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Generate a unique conflict ID
 */
function generateConflictId(): string {
  return `conflict-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

/**
 * Detect direct conflicts (mutually exclusive positions)
 *
 * Enhanced to consider agent conflict stances when determining severity
 */
function detectDirectConflicts(
  perspectives: AgentPerspective[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Get stance analysis for all agents
  const stances = compareAgentStances(perspectives);

  // Find agents with blocking positions
  const blockers = perspectives.filter(p => p.position === 'block');
  const approvers = perspectives.filter(p => p.position === 'approve');

  // If there are both blockers and approvers, that's a direct conflict
  if (blockers.length > 0 && approvers.length > 0) {
    // Determine severity based on agent stances
    // Assertive blockers + assertive approvers = critical (hard to resolve)
    // Analytical or collaborative participants = potentially easier to resolve
    const blockerStances = blockers.map(p => stances.get(p.agent.name)?.stance || 'collaborative');
    const approverStances = approvers.map(p => stances.get(p.agent.name)?.stance || 'collaborative');

    const hasAssertiveBlocker = blockerStances.includes('assertive');
    const hasAssertiveApprover = approverStances.includes('assertive');
    const hasAnalytical = [...blockerStances, ...approverStances].includes('analytical');

    let severity: ConflictSeverity = 'major'; // default

    if (hasAssertiveBlocker && hasAssertiveApprover) {
      severity = 'critical'; // Two assertive parties - hard to resolve
    } else if (hasAnalytical) {
      severity = 'major'; // Analytical party can help mediate
    } else if (blockerStances.every(s => s === 'collaborative') && approverStances.every(s => s === 'collaborative')) {
      severity = 'major'; // Both sides open to compromise
    } else {
      severity = 'critical'; // Default to critical for safety
    }

    // Always critical if any blocker has veto power
    if (blockers.some(p => p.agent.vetoPower)) {
      severity = 'critical';
    }

    conflicts.push({
      id: generateConflictId(),
      type: 'direct',
      severity,
      description: `${blockers.map(p => p.agent.name).join(', ')} block while ${approvers.map(p => p.agent.name).join(', ')} approve`,
      agents: [...blockers, ...approvers].map(p => p.agent.name),
      perspectives: [...blockers, ...approvers],
      resolved: false,
      suggestedResolution: hasAnalytical
        ? 'Engage analytical agent to facilitate data-driven resolution'
        : 'Identify specific blocking concerns and find compromise that addresses them'
    });
  }

  // Check for agents with veto power exercising it
  for (const blocker of blockers) {
    if (blocker.agent.vetoPower) {
      conflicts.push({
        id: generateConflictId(),
        type: 'direct',
        severity: 'critical',
        description: `${blocker.agent.name} (${blocker.agent.role}) exercises veto: ${blocker.concerns.join('; ')}`,
        agents: [blocker.agent.name],
        perspectives: [blocker],
        resolved: false,
        suggestedResolution: `Address ${blocker.agent.name}'s veto criteria: ${blocker.agent.vetoCriteria || 'blocking concerns'}`
      });
    }
  }

  return conflicts;
}

/**
 * Detect priority conflicts (different rankings)
 */
function detectPriorityConflicts(
  perspectives: AgentPerspective[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Look for conflicting recommendations
  const recommendationAgents = new Map<string, string[]>();

  for (const p of perspectives) {
    for (const rec of p.recommendations) {
      const normalized = rec.toLowerCase().trim();

      // Look for priority language
      const mustHave = normalized.includes('must have') || normalized.includes('critical') || normalized.includes('required');
      const shouldHave = normalized.includes('should have') || normalized.includes('important');
      const couldHave = normalized.includes('could have') || normalized.includes('nice to have');
      const wontHave = normalized.includes("won't have") || normalized.includes('defer') || normalized.includes('out of scope');

      // Record the agent's priority for this topic
      const topic = normalized.split(' ').slice(0, 3).join(' '); // First 3 words as topic

      if (!recommendationAgents.has(topic)) {
        recommendationAgents.set(topic, []);
      }

      const priority = mustHave ? 'must' : shouldHave ? 'should' : couldHave ? 'could' : wontHave ? 'wont' : 'unknown';
      recommendationAgents.get(topic)!.push(`${p.agent.name}:${priority}`);
    }
  }

  // Find topics with conflicting priorities
  for (const [topic, agentPriorities] of recommendationAgents) {
    const hasMust = agentPriorities.some(ap => ap.includes(':must'));
    const hasWont = agentPriorities.some(ap => ap.includes(':wont'));

    if (hasMust && hasWont) {
      const mustAgents = agentPriorities.filter(ap => ap.includes(':must')).map(ap => ap.split(':')[0]);
      const wontAgents = agentPriorities.filter(ap => ap.includes(':wont')).map(ap => ap.split(':')[0]);

      conflicts.push({
        id: generateConflictId(),
        type: 'priority',
        severity: 'major',
        description: `Priority conflict on "${topic}": ${mustAgents.join(', ')} say "must have", ${wontAgents.join(', ')} say "won't have"`,
        agents: [...mustAgents, ...wontAgents],
        perspectives: perspectives.filter(p =>
          mustAgents.includes(p.agent.name) || wontAgents.includes(p.agent.name)
        ),
        resolved: false,
        suggestedResolution: 'Use phased approach: implement in MVP or defer to v1.1 based on risk analysis'
      });
    }
  }

  return conflicts;
}

/**
 * Detect scope conflicts (different definitions of done)
 */
function detectScopeConflicts(
  perspectives: AgentPerspective[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Look for timeline/scope disagreements in content
  const timelinePatterns: { agent: string; weeks: number; content: string }[] = [];

  for (const p of perspectives) {
    const contentLower = p.content.toLowerCase();

    // Look for timeline mentions
    const weekMatch = contentLower.match(/(\d+)\s*weeks?/);
    const dayMatch = contentLower.match(/(\d+)\s*days?/);
    const hourMatch = contentLower.match(/(\d+)\s*hours?/);

    let weeks = 0;
    if (weekMatch) {
      weeks = parseInt(weekMatch[1], 10);
    } else if (dayMatch) {
      weeks = parseInt(dayMatch[1], 10) / 5; // Convert days to weeks
    } else if (hourMatch) {
      weeks = parseInt(hourMatch[1], 10) / 40; // Convert hours to weeks
    }

    if (weeks > 0) {
      timelinePatterns.push({
        agent: p.agent.name,
        weeks,
        content: p.content.substring(0, 100)
      });
    }
  }

  // Check for significant timeline disagreements (more than 2x difference)
  if (timelinePatterns.length >= 2) {
    const minWeeks = Math.min(...timelinePatterns.map(t => t.weeks));
    const maxWeeks = Math.max(...timelinePatterns.map(t => t.weeks));

    if (maxWeeks > minWeeks * 2) {
      const shortAgent = timelinePatterns.find(t => t.weeks === minWeeks);
      const longAgent = timelinePatterns.find(t => t.weeks === maxWeeks);

      conflicts.push({
        id: generateConflictId(),
        type: 'scope',
        severity: 'major',
        description: `Scope conflict: ${shortAgent?.agent} estimates ${minWeeks.toFixed(1)} weeks, ${longAgent?.agent} estimates ${maxWeeks.toFixed(1)} weeks`,
        agents: timelinePatterns.map(t => t.agent),
        perspectives: perspectives.filter(p =>
          timelinePatterns.some(t => t.agent === p.agent.name)
        ),
        resolved: false,
        suggestedResolution: 'Align on scope definition: what\'s included in MVP vs what can be deferred'
      });
    }
  }

  // Look for coverage/quality disagreements
  const coveragePatterns: { agent: string; coverage: number }[] = [];

  for (const p of perspectives) {
    const contentLower = p.content.toLowerCase();
    const coverageMatch = contentLower.match(/(\d+)%?\s*coverage/);

    if (coverageMatch) {
      coveragePatterns.push({
        agent: p.agent.name,
        coverage: parseInt(coverageMatch[1], 10)
      });
    }
  }

  if (coveragePatterns.length >= 2) {
    const minCoverage = Math.min(...coveragePatterns.map(c => c.coverage));
    const maxCoverage = Math.max(...coveragePatterns.map(c => c.coverage));

    if (maxCoverage - minCoverage >= 20) {
      conflicts.push({
        id: generateConflictId(),
        type: 'scope',
        severity: 'minor',
        description: `Coverage disagreement: targets range from ${minCoverage}% to ${maxCoverage}%`,
        agents: coveragePatterns.map(c => c.agent),
        perspectives: perspectives.filter(p =>
          coveragePatterns.some(c => c.agent === p.agent.name)
        ),
        resolved: false,
        suggestedResolution: 'Use risk-based coverage: higher coverage for critical paths, lower for utilities'
      });
    }
  }

  return conflicts;
}

/**
 * Detect semantic conflicts using keyword matching
 *
 * Identifies contradicting statements like "must have" vs "out of scope"
 * across agent perspectives.
 */
export function detectSemanticConflicts(
  perspectives: AgentPerspective[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  // For each semantic pattern pair, check if different agents use opposing terms
  for (const pattern of SEMANTIC_CONFLICT_PATTERNS) {
    const positiveAgents: { agent: string; phrase: string; context: string }[] = [];
    const negativeAgents: { agent: string; phrase: string; context: string }[] = [];

    for (const p of perspectives) {
      const contentLower = p.content.toLowerCase();

      // Check for positive phrases
      for (const phrase of pattern.positive) {
        if (contentLower.includes(phrase)) {
          // Extract context around the phrase
          const phraseIndex = contentLower.indexOf(phrase);
          const contextStart = Math.max(0, phraseIndex - 30);
          const contextEnd = Math.min(p.content.length, phraseIndex + phrase.length + 50);
          const context = p.content.substring(contextStart, contextEnd);

          positiveAgents.push({
            agent: p.agent.name,
            phrase,
            context: context.trim()
          });
          break; // Only record one match per agent per pattern
        }
      }

      // Check for negative phrases
      for (const phrase of pattern.negative) {
        if (contentLower.includes(phrase)) {
          const phraseIndex = contentLower.indexOf(phrase);
          const contextStart = Math.max(0, phraseIndex - 30);
          const contextEnd = Math.min(p.content.length, phraseIndex + phrase.length + 50);
          const context = p.content.substring(contextStart, contextEnd);

          negativeAgents.push({
            agent: p.agent.name,
            phrase,
            context: context.trim()
          });
          break;
        }
      }
    }

    // If we have agents on both sides, that's a semantic conflict
    if (positiveAgents.length > 0 && negativeAgents.length > 0) {
      // Ensure they're different agents
      const positiveNames = new Set(positiveAgents.map(a => a.agent));
      const conflictingNegatives = negativeAgents.filter(a => !positiveNames.has(a.agent));

      if (conflictingNegatives.length > 0) {
        const positiveContext = positiveAgents[0];
        const negativeContext = conflictingNegatives[0];

        conflicts.push({
          id: generateConflictId(),
          type: 'semantic',
          severity: 'major',
          description: `Semantic conflict: "${positiveContext.phrase}" (${positiveContext.agent}) vs "${negativeContext.phrase}" (${negativeContext.agent})`,
          agents: [
            ...positiveAgents.map(a => a.agent),
            ...conflictingNegatives.map(a => a.agent)
          ],
          perspectives: perspectives.filter(p =>
            positiveNames.has(p.agent.name) ||
            conflictingNegatives.some(n => n.agent === p.agent.name)
          ),
          resolved: false,
          suggestedResolution: `Clarify intent: ${positiveContext.agent} said "${positiveContext.context}" while ${negativeContext.agent} said "${negativeContext.context}"`
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detect all conflicts in perspectives
 *
 * @param perspectives Array of agent perspectives
 * @param threshold Sensitivity threshold for conflict detection (0-1)
 * @returns Array of detected conflicts
 */
export function detectConflicts(
  perspectives: AgentPerspective[],
  threshold: number = 0.3
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Detect different types of conflicts
  conflicts.push(...detectDirectConflicts(perspectives));
  conflicts.push(...detectPriorityConflicts(perspectives));
  conflicts.push(...detectScopeConflicts(perspectives));
  conflicts.push(...detectSemanticConflicts(perspectives));

  // Filter by threshold if applicable
  // Lower threshold = more sensitive = more conflicts detected
  if (threshold < 0.5) {
    // Keep all conflicts at low threshold
    return conflicts;
  } else {
    // Only keep major and critical conflicts at high threshold
    return conflicts.filter(c => c.severity === 'critical' || c.severity === 'major');
  }
}

// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * Suggest resolutions for a conflict
 */
function suggestResolutions(conflict: Conflict): string[] {
  const suggestions: string[] = [];

  switch (conflict.type) {
    case 'direct':
      suggestions.push('Identify minimum acceptable criteria for blocking agent');
      suggestions.push('Propose phased approach: address blocking concerns in MVP, defer others');
      suggestions.push('Find compromise that partially addresses all perspectives');
      break;

    case 'priority':
      suggestions.push('Use MoSCoW prioritization with explicit criteria');
      suggestions.push('Defer lower-priority items to next release');
      suggestions.push('Assess business impact vs technical effort for each option');
      break;

    case 'scope':
      suggestions.push('Define explicit scope document with inclusion/exclusion list');
      suggestions.push('Use time-boxing: ship what can be done in X weeks');
      suggestions.push('Risk-based scoping: include high-risk items, defer low-risk');
      break;
  }

  return suggestions;
}

/**
 * Attempt to resolve conflicts
 *
 * @param conflicts Array of conflicts to resolve
 * @param perspectives Original perspectives for reference
 * @returns Updated conflicts with resolution attempts
 */
export async function resolveConflicts(
  conflicts: Conflict[],
  perspectives: AgentPerspective[]
): Promise<Conflict[]> {
  for (const conflict of conflicts) {
    // Generate suggestions
    const suggestions = suggestResolutions(conflict);
    conflict.suggestedResolution = suggestions[0];

    // For direct conflicts with veto, mark as requiring manual resolution
    if (conflict.type === 'direct' && conflict.severity === 'critical') {
      const vetoingAgents = conflict.perspectives.filter(
        p => p.position === 'block' && p.agent.vetoPower
      );

      if (vetoingAgents.length > 0) {
        conflict.suggestedResolution = `VETO ACTIVE: Must address ${vetoingAgents.map(p => p.agent.name).join(', ')}'s concerns before proceeding`;
      }
    }

    // Attempt automatic resolution for scope conflicts
    if (conflict.type === 'scope' && conflict.severity === 'minor') {
      conflict.resolution = 'Suggested: Use risk-based approach with differentiated targets';
      conflict.resolved = true;
    }
  }

  return conflicts;
}

/**
 * Devil's advocate rotation history tracker
 */
export interface DevilsAdvocateHistory {
  /** Complete history of all advocates in order */
  history: string[];
  /** Count of times each agent has served as advocate */
  counts: Map<string, number>;
}

/**
 * Create a new devil's advocate history tracker
 */
export function createAdvocateHistory(): DevilsAdvocateHistory {
  return {
    history: [],
    counts: new Map()
  };
}

/**
 * Record a devil's advocate selection in history
 */
export function recordAdvocateSelection(
  history: DevilsAdvocateHistory,
  agentName: string
): void {
  history.history.push(agentName);
  history.counts.set(agentName, (history.counts.get(agentName) || 0) + 1);
}

/**
 * Designate a "devil's advocate" for a round
 *
 * Enhanced to:
 * - Properly track rotation history using DevilsAdvocateHistory
 * - Prefer agents with analytical conflict stance (better at critical evaluation)
 * - Consider approvers who can challenge their own position
 * - Balance rotation across all agents fairly
 *
 * @param perspectives Current perspectives
 * @param history Devil's advocate history tracker (optional, falls back to previousAdvocates)
 * @param previousAdvocates Legacy: List of agents who recently played devil's advocate
 * @returns Name of agent to serve as devil's advocate
 */
export function selectDevilsAdvocate(
  perspectives: AgentPerspective[],
  historyOrPrevious?: DevilsAdvocateHistory | string[],
  previousAdvocates: string[] = []
): string | null {
  if (perspectives.length === 0) {
    return null;
  }

  // Handle both new history object and legacy string array
  let history: DevilsAdvocateHistory;
  if (Array.isArray(historyOrPrevious)) {
    // Legacy mode: convert string array to history
    history = createAdvocateHistory();
    for (const name of historyOrPrevious) {
      recordAdvocateSelection(history, name);
    }
  } else if (historyOrPrevious) {
    history = historyOrPrevious;
  } else {
    // Create from legacy previousAdvocates
    history = createAdvocateHistory();
    for (const name of previousAdvocates) {
      recordAdvocateSelection(history, name);
    }
  }

  // Get stance analysis for all agents
  const stances = compareAgentStances(perspectives);

  // Find agents who haven't been devil's advocate recently
  // "Recently" = in the last N rounds where N = number of agents - 1
  const recentWindow = Math.max(1, perspectives.length - 1);
  const recentAdvocates = history.history.slice(-recentWindow);
  const candidates = perspectives.filter(
    p => !recentAdvocates.includes(p.agent.name)
  );

  // If all have been advocates recently, find the one with fewest total times
  const eligibleCandidates = candidates.length > 0 ? candidates : perspectives;

  // Sort candidates by selection criteria:
  // 1. Analytical stance (highest priority for devil's advocate)
  // 2. Lower selection count (fair rotation)
  // 3. Approvers (can challenge their own position)
  const scoredCandidates = eligibleCandidates.map(p => {
    const stance = stances.get(p.agent.name);
    let score = 0;

    // Prefer analytical stance (+10 points) - best at critical evaluation
    if (stance?.stance === 'analytical') {
      score += 10;
    }

    // Prefer agents selected fewer times (+5 points per difference from max)
    const selectCount = history.counts.get(p.agent.name) || 0;
    const maxCount = Math.max(...Array.from(history.counts.values()), 0);
    score += (maxCount - selectCount) * 5;

    // Prefer approvers who will challenge their own position (+3 points)
    if (p.position === 'approve') {
      score += 3;
    }

    // Slight preference for assertive stance too (will push back strongly)
    if (stance?.stance === 'assertive') {
      score += 2;
    }

    return { perspective: p, score };
  });

  // Sort by score descending
  scoredCandidates.sort((a, b) => b.score - a.score);

  return scoredCandidates[0]?.perspective.agent.name || null;
}

/**
 * Generate a conflict summary for reporting
 */
export function summarizeConflicts(conflicts: Conflict[]): string {
  if (conflicts.length === 0) {
    return 'No conflicts detected.';
  }

  const lines: string[] = [];
  lines.push(`${conflicts.length} conflict(s) detected:`);
  lines.push('');

  const critical = conflicts.filter(c => c.severity === 'critical');
  const major = conflicts.filter(c => c.severity === 'major');
  const minor = conflicts.filter(c => c.severity === 'minor');

  if (critical.length > 0) {
    lines.push('**CRITICAL:**');
    for (const c of critical) {
      lines.push(`  - ${c.description}`);
      if (c.suggestedResolution) {
        lines.push(`    Resolution: ${c.suggestedResolution}`);
      }
    }
    lines.push('');
  }

  if (major.length > 0) {
    lines.push('**Major:**');
    for (const c of major) {
      lines.push(`  - ${c.description}`);
    }
    lines.push('');
  }

  if (minor.length > 0) {
    lines.push('**Minor:**');
    for (const c of minor) {
      lines.push(`  - ${c.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Check if conflicts prevent proceeding
 */
export function hasBlockingConflicts(conflicts: Conflict[]): boolean {
  return conflicts.some(
    c => c.severity === 'critical' && !c.resolved
  );
}

// ============================================================================
// Export
// ============================================================================

export {
  detectDirectConflicts,
  detectPriorityConflicts,
  detectScopeConflicts,
  suggestResolutions
};
