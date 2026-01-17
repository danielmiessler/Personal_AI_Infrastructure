/**
 * Ideal State Utilities
 * Shared functions for reading/writing IdealState.jsonl in work items
 * Part of THE ALGORITHM's nervous system for dynamic success criteria tracking
 */

import { existsSync, readFileSync, appendFileSync, readdirSync } from 'fs';
import { join } from 'path';

// DEBUG flag - set DEBUG_HOOKS=true to see informational output
const DEBUG = process.env.DEBUG_HOOKS === 'true';

export type AlgorithmPhase = 'OBSERVE' | 'THINK' | 'PLAN' | 'BUILD' | 'EXECUTE' | 'VERIFY' | 'LEARN';
export type EffortLevel = 'Skip' | 'Fast' | 'Standard' | 'Deep' | 'Excellence';
export type StateUpdateTrigger = 'initial' | 'new_info' | 'constraint_discovered' | 'phase_feedback' | 'user_interrupt' | 'agent_finding';

export type CriterionStatus = 'pending' | 'pass' | 'fail' | 'adjusted';

// ============================================================
// DIMENSION TYPES - The core unit of ideal state
// From THEALGORITHM.md: "A dimension is one aspect of what ideal looks like"
// ============================================================

export type DimensionType = 'Functional' | 'Quality' | 'Scope' | 'Implicit' | 'Verification';
export type DiscoveryType = 'EXPLICIT' | 'INFERRED' | 'UNKNOWN' | 'HIDDEN';
export type DimensionStatus = 'unknown' | 'resolved' | 'in_progress' | 'achieved' | 'not_achieved' | 'adjusted';

/**
 * Dimension: One aspect of what "ideal" looks like
 *
 * From THEALGORITHM.md:
 * - Functional: What must work?
 * - Quality: How well must it work?
 * - Scope: What's in/out?
 * - Implicit: What's assumed but unstated?
 * - Verification: How will we prove it?
 */
export interface Dimension {
  id: string;                        // DIM-FUNC-1, DIM-QUAL-2, etc.
  type: DimensionType;
  description: string;               // What does ideal look like for this aspect?

  // Discovery - how and when was this dimension found?
  discovery_type: DiscoveryType;     // EXPLICIT (user said it), INFERRED, UNKNOWN, HIDDEN
  discovered_in: AlgorithmPhase;     // Usually OBSERVE or THINK
  resolved_in?: AlgorithmPhase;      // When was UNKNOWN resolved? (usually THINK)

  // Status tracking
  status: DimensionStatus;
  status_reason?: string;            // Why this status? (especially for adjusted/not_achieved)

  // Linkage - which criteria prove/protect this dimension?
  criteria_ids?: string[];           // Success criteria that prove this dimension
  anti_criteria_ids?: string[];      // Anti-criteria that protect this dimension

  // Achievement (populated in VERIFY)
  achieved_at?: string;
  achievement_evidence?: string;     // How was it proven? (screenshot, test output, etc.)
}

export interface SuccessCriterion {
  id: string;                      // CRIT-FUNC-1, etc.
  dimension_id?: string;           // Links back to dimension (DIM-FUNC-1) - traceability
  criterion: string;
  metric: string;
  target: any;
  weight: number;
  status: CriterionStatus;
  actual?: any;                    // Measured value during VERIFY
  adjusted_reason?: string;        // Why target was adjusted (if applicable)
}

export interface Constraint {
  type: 'must' | 'should' | 'could';
  description: string;
  verifiable: boolean;
}

/**
 * Anti-Criterion: Things to AVOID
 * Extracted from user input ("don't", "avoid", "never") or discovered through research
 */
export interface AntiCriterion {
  id: string;                      // ANTI-1, ANTI-2, etc.
  dimension_id?: string;           // Which dimension does this protect?
  description: string;             // What to avoid
  source: 'user_input' | 'research' | 'preference' | 'history_failure';
  severity: 'must_avoid' | 'should_avoid' | 'prefer_avoid';
  status: 'active' | 'violated' | 'overridden';
  violated_reason?: string;        // If we violated it, why?
}

/**
 * IdealState: THE central artifact of THE ALGORITHM
 *
 * This is not just a data structure. This is what we hill-climb toward.
 * All 7 phases exist to discover, refine, achieve, and verify this.
 *
 * Structure:
 * - dimensions[]: The aspects of what "ideal" looks like (discovered OBSERVE, refined THINK)
 * - success_criteria[]: How we prove dimensions are achieved (defined BUILD, verified VERIFY)
 * - anti_criteria[]: What we must avoid (extracted throughout)
 * - fidelity: How well did we capture the TRUE ideal? (evaluated LEARN)
 */
export interface IdealState {
  // Core description
  description: string;

  // THE DIMENSIONS - the primary structure of ideal state
  // Each dimension is an aspect of what "done" looks like
  dimensions?: Dimension[];

  // Operationalized criteria (link back to dimensions via dimension_id)
  success_criteria: SuccessCriterion[];
  anti_criteria: AntiCriterion[];
  constraints: Constraint[];

  // Effort and quality
  effort_level: EffortLevel;
  quality_threshold: number;

  // Version and timing
  version: number;
  last_updated: string;

  // Phase tracking
  current_phase?: AlgorithmPhase;
  phase_started_at?: string;

  // Fidelity tracking (LEARN phase) - how well did we capture the TRUE ideal?
  fidelity?: {
    score?: number;              // 0-1, how well did we understand what the user actually wanted?
    feedback?: string;           // User feedback on whether we got it right
    missed_dimensions?: string[]; // Dimensions we should have discovered but didn't
    wrong_dimensions?: string[];  // Dimensions we thought mattered but didn't
  };

  // Achievement summary (populated in VERIFY)
  achievement?: {
    total_dimensions: number;
    achieved: number;
    adjusted: number;
    not_achieved: number;
    unknown: number;
  };
}

export interface StateUpdate {
  timestamp: string;
  version: number;
  trigger: StateUpdateTrigger;
  phase: AlgorithmPhase;
  changes: Partial<IdealState>;
  reason: string;
}

export interface CriteriaProgress {
  [criterionId: string]: {
    status: CriterionStatus;
    target: any;
    actual?: any;
  };
}

export interface GapMetrics {
  overall: number;  // 0-1, 0 = at ideal
  trend: 'improving' | 'stable' | 'worsening';
  criteria_progress: CriteriaProgress;  // NEW: Per-criterion progress
}

const CLAUDE_DIR = process.env.PAI_DIR || process.env.HOME + '/.claude';
const WORK_DIR = join(CLAUDE_DIR, 'MEMORY', 'Work');

/**
 * Find the most recent active work directory
 */
export function findActiveWorkDir(): string | null {
  try {
    if (!existsSync(WORK_DIR)) return null;

    const entries = readdirSync(WORK_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'Signals')
      .map(d => ({ name: d.name, path: join(WORK_DIR, d.name) }))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (entries.length === 0) return null;

    // Return most recent that isn't harvested
    for (const entry of entries) {
      const workMdPath = join(entry.path, 'Work.md');
      if (existsSync(workMdPath)) {
        const content = readFileSync(workMdPath, 'utf-8');
        if (!content.includes('harvested: true')) {
          return entry.path;
        }
      }
    }

    // Fallback to most recent
    return entries[0].path;
  } catch {
    return null;
  }
}

/**
 * Get the IdealState.jsonl path for a work directory
 */
export function getIdealStatePath(workDir: string): string {
  return join(workDir, 'IdealState.jsonl');
}

/**
 * Read the current ideal state (last entry in jsonl)
 */
export function readIdealState(workDir: string): IdealState | null {
  try {
    const filePath = getIdealStatePath(workDir);
    if (!existsSync(filePath)) return null;

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const lastLine = lines[lines.length - 1];
    const update = JSON.parse(lastLine) as StateUpdate;

    // Build current state by applying all updates
    let state: IdealState = {
      description: '',
      dimensions: [],
      success_criteria: [],
      anti_criteria: [],
      constraints: [],
      effort_level: 'Standard',
      quality_threshold: 0.8,
      version: 0,
      last_updated: '',
    };

    for (const line of lines) {
      const u = JSON.parse(line) as StateUpdate;
      state = { ...state, ...u.changes, version: u.version, last_updated: u.timestamp };
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Append a state update to IdealState.jsonl
 */
export function appendStateUpdate(
  workDir: string,
  trigger: StateUpdateTrigger,
  phase: AlgorithmPhase,
  changes: Partial<IdealState>,
  reason: string
): void {
  try {
    const filePath = getIdealStatePath(workDir);
    const currentState = readIdealState(workDir);
    const version = currentState ? currentState.version + 1 : 1;

    const update: StateUpdate = {
      timestamp: new Date().toISOString(),
      version,
      trigger,
      phase,
      changes,
      reason,
    };

    appendFileSync(filePath, JSON.stringify(update) + '\n');
  } catch (e) {
    if (DEBUG) console.error('Failed to append state update:', e);
  }
}

/**
 * Create initial IdealState.jsonl for a new work item
 */
export function createInitialIdealState(
  workDir: string,
  description: string,
  effortLevel: EffortLevel
): void {
  const initialState: Partial<IdealState> = {
    description,
    dimensions: [],
    success_criteria: [],
    anti_criteria: [],
    constraints: [],
    effort_level: effortLevel,
    quality_threshold: effortLevel === 'Excellence' ? 0.95 : effortLevel === 'Deep' ? 0.9 : 0.8,
  };

  appendStateUpdate(workDir, 'initial', 'OBSERVE', initialState, 'Work item created');
}

// ============================================================
// Extracted Dimension Types (from Classifier)
// ============================================================

export interface ExtractedDimension {
  type: DimensionType;
  description: string;
  discovery_type: DiscoveryType;
}

export interface ExtractedAntiCriterion {
  description: string;
  source_phrase?: string;
  severity: 'must_avoid' | 'should_avoid' | 'prefer_avoid';
}

export interface DimensionExtraction {
  dimensions: ExtractedDimension[];
  anti_criteria: ExtractedAntiCriterion[];
}

/**
 * Create initial IdealState with PRE-POPULATED dimensions and anti-criteria
 * This is the enhanced version called by Classifier after extraction
 */
export function createInitialIdealStateWithDimensions(
  workDir: string,
  description: string,
  effortLevel: EffortLevel,
  extraction?: DimensionExtraction | null
): void {
  // Track dimension type counts for ID generation
  const typeCounts: Record<string, number> = {
    Functional: 0,
    Quality: 0,
    Scope: 0,
    Implicit: 0,
    Verification: 0,
  };

  // Convert extracted dimensions to full Dimension objects with IDs
  const dimensions: Dimension[] = (extraction?.dimensions || []).map((d) => {
    typeCounts[d.type] = (typeCounts[d.type] || 0) + 1;
    const typePrefix = d.type.slice(0, 4).toUpperCase(); // FUNC, QUAL, SCOP, IMPL, VERI
    const id = `DIM-${typePrefix}-${typeCounts[d.type]}`;

    return {
      id,
      type: d.type,
      description: d.description,
      discovery_type: d.discovery_type,
      discovered_in: 'OBSERVE' as AlgorithmPhase,
      status: d.discovery_type === 'UNKNOWN' ? 'unknown' as DimensionStatus : 'resolved' as DimensionStatus,
    };
  });

  // Convert extracted anti-criteria to full AntiCriterion objects
  const anti_criteria: AntiCriterion[] = (extraction?.anti_criteria || []).map((ac, i) => ({
    id: `ANTI-${i + 1}`,
    description: ac.description,
    source: 'user_input' as const,
    severity: ac.severity,
    status: 'active' as const,
  }));

  const initialState: Partial<IdealState> = {
    description,
    dimensions,
    success_criteria: [],
    anti_criteria,
    constraints: [],
    effort_level: effortLevel,
    quality_threshold: effortLevel === 'Excellence' ? 0.95 : effortLevel === 'Deep' ? 0.9 : 0.8,
    current_phase: 'OBSERVE',
    phase_started_at: new Date().toISOString(),
  };

  const dimCount = dimensions.length;
  const antiCount = anti_criteria.length;
  const unknownCount = dimensions.filter(d => d.status === 'unknown').length;

  appendStateUpdate(
    workDir,
    'initial',
    'OBSERVE',
    initialState,
    `Work item created with ${dimCount} dimensions (${unknownCount} UNKNOWN), ${antiCount} anti-criteria`
  );
}

// ============================================================
// Dimension Management Functions
// ============================================================

/**
 * Add a dimension to ideal state (typically OBSERVE or THINK phase)
 */
export function addDimension(
  workDir: string,
  dimension: Omit<Dimension, 'status'>
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const newDimension: Dimension = {
    ...dimension,
    status: dimension.discovery_type === 'UNKNOWN' ? 'unknown' : 'resolved',
  };

  const updatedDimensions = [...(state.dimensions || []), newDimension];

  appendStateUpdate(workDir, 'new_info', state.current_phase || 'OBSERVE', {
    dimensions: updatedDimensions,
  }, `Added dimension: ${dimension.id} (${dimension.type})`);
}

/**
 * Resolve an UNKNOWN dimension (THINK phase)
 */
export function resolveDimension(
  workDir: string,
  dimensionId: string,
  resolvedDescription: string
): void {
  const state = readIdealState(workDir);
  if (!state || !state.dimensions) return;

  const updatedDimensions = state.dimensions.map(d =>
    d.id === dimensionId
      ? {
          ...d,
          description: resolvedDescription,
          discovery_type: 'INFERRED' as DiscoveryType,  // Was UNKNOWN, now resolved
          resolved_in: state.current_phase || 'THINK',
          status: 'resolved' as DimensionStatus,
        }
      : d
  );

  appendStateUpdate(workDir, 'phase_feedback', state.current_phase || 'THINK', {
    dimensions: updatedDimensions,
  }, `Resolved dimension ${dimensionId}`);
}

/**
 * Mark a dimension as achieved (VERIFY phase)
 */
export function achieveDimension(
  workDir: string,
  dimensionId: string,
  evidence: string
): void {
  const state = readIdealState(workDir);
  if (!state || !state.dimensions) return;

  const updatedDimensions = state.dimensions.map(d =>
    d.id === dimensionId
      ? {
          ...d,
          status: 'achieved' as DimensionStatus,
          achieved_at: new Date().toISOString(),
          achievement_evidence: evidence,
        }
      : d
  );

  // Update achievement summary
  const achieved = updatedDimensions.filter(d => d.status === 'achieved').length;
  const adjusted = updatedDimensions.filter(d => d.status === 'adjusted').length;
  const not_achieved = updatedDimensions.filter(d => d.status === 'not_achieved').length;
  const unknown = updatedDimensions.filter(d => d.status === 'unknown').length;

  appendStateUpdate(workDir, 'phase_feedback', 'VERIFY', {
    dimensions: updatedDimensions,
    achievement: {
      total_dimensions: updatedDimensions.length,
      achieved,
      adjusted,
      not_achieved,
      unknown,
    },
  }, `Dimension ${dimensionId} achieved`);
}

/**
 * Mark a dimension as not achieved (VERIFY phase)
 */
export function failDimension(
  workDir: string,
  dimensionId: string,
  reason: string
): void {
  const state = readIdealState(workDir);
  if (!state || !state.dimensions) return;

  const updatedDimensions = state.dimensions.map(d =>
    d.id === dimensionId
      ? {
          ...d,
          status: 'not_achieved' as DimensionStatus,
          status_reason: reason,
        }
      : d
  );

  appendStateUpdate(workDir, 'phase_feedback', 'VERIFY', {
    dimensions: updatedDimensions,
  }, `Dimension ${dimensionId} not achieved: ${reason}`);
}

/**
 * Update fidelity score (LEARN phase)
 */
export function updateFidelity(
  workDir: string,
  score: number,
  feedback?: string,
  missedDimensions?: string[],
  wrongDimensions?: string[]
): void {
  appendStateUpdate(workDir, 'phase_feedback', 'LEARN', {
    fidelity: {
      score,
      feedback,
      missed_dimensions: missedDimensions,
      wrong_dimensions: wrongDimensions,
    },
  }, `Fidelity score: ${score}`);
}

/**
 * Get all dimensions with a specific status
 */
export function getDimensionsByStatus(workDir: string, status: DimensionStatus): Dimension[] {
  const state = readIdealState(workDir);
  if (!state || !state.dimensions) return [];
  return state.dimensions.filter(d => d.status === status);
}

/**
 * Get unresolved (UNKNOWN) dimensions that need THINK phase
 */
export function getUnresolvedDimensions(workDir: string): Dimension[] {
  return getDimensionsByStatus(workDir, 'unknown');
}

/**
 * Calculate gap metrics between current and ideal state
 * Uses criteria-based calculation when success_criteria are populated,
 * otherwise falls back to version-based heuristic
 */
export function calculateGap(workDir: string): GapMetrics {
  const state = readIdealState(workDir);
  if (!state) {
    return { overall: 1.0, trend: 'stable', criteria_progress: {} };
  }

  // Build criteria progress map
  const criteria_progress: CriteriaProgress = {};
  for (const c of state.success_criteria) {
    criteria_progress[c.id] = {
      status: c.status,
      target: c.target,
      actual: c.actual,
    };
  }

  // If we have success criteria, use them for gap calculation
  if (state.success_criteria.length > 0) {
    const totalWeight = state.success_criteria.reduce((sum, c) => sum + c.weight, 0);
    const achievedWeight = state.success_criteria
      .filter(c => c.status === 'pass' || c.status === 'adjusted')
      .reduce((sum, c) => sum + c.weight, 0);

    const overall = totalWeight > 0 ? 1 - (achievedWeight / totalWeight) : 1.0;

    // Trend based on comparison with previous state
    // For now, simplified: if any criteria passed recently, improving
    const passingCount = state.success_criteria.filter(c => c.status === 'pass' || c.status === 'adjusted').length;
    const trend = passingCount > 0 ? 'improving' : 'stable';

    return { overall, trend, criteria_progress };
  }

  // Fallback to version-based heuristic when no criteria defined
  const progressFactor = Math.min(state.version / 10, 0.8);
  const overall = 1.0 - progressFactor;
  const trend = state.version > 3 ? 'improving' : 'stable';

  return { overall, trend, criteria_progress };
}

/**
 * Check if a tool call aligns with current phase (decision gate logic)
 */
export function toolAlignsWithPhase(toolName: string, phase: AlgorithmPhase): boolean {
  // Most tools are fine in any phase
  // This is where we could add phase-specific blocking logic
  const phaseToolMap: Record<AlgorithmPhase, string[]> = {
    OBSERVE: ['Read', 'Glob', 'Grep', 'Task', 'WebFetch', 'WebSearch'],
    THINK: ['Task', 'Read'], // Spawning agents for thinking
    PLAN: ['Read', 'Task', 'TodoWrite'],
    BUILD: ['Read', 'TodoWrite'],
    EXECUTE: ['Write', 'Edit', 'Bash', 'Task', 'Read', 'Glob', 'Grep'],
    VERIFY: ['Read', 'Bash', 'Task', 'Glob', 'Grep'],
    LEARN: ['Read', 'Write', 'Edit'],
  };

  // Allow all tools for now - this is a soft recommendation
  // In future, could make this stricter
  return true;
}

// ============================================================
// NEW: Phase and Criteria Management Functions
// ============================================================

/**
 * Update the current phase in IdealState
 * Called when TodoWrite marks a phase todo as in_progress
 */
export function updateCurrentPhase(workDir: string, phase: AlgorithmPhase): void {
  appendStateUpdate(workDir, 'phase_feedback', phase, {
    current_phase: phase,
    phase_started_at: new Date().toISOString(),
  }, `Entered ${phase} phase`);
}

/**
 * Update a criterion's status and optionally its actual value
 */
export function updateCriterionStatus(
  workDir: string,
  criterionId: string,
  status: CriterionStatus,
  actual?: any
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const updatedCriteria = state.success_criteria.map(c =>
    c.id === criterionId
      ? { ...c, status, ...(actual !== undefined && { actual }) }
      : c
  );

  appendStateUpdate(workDir, 'phase_feedback', state.current_phase || 'VERIFY', {
    success_criteria: updatedCriteria,
  }, `Updated criterion ${criterionId}: ${status}`);
}

/**
 * Dynamically adjust a criterion's target when a constraint is discovered
 * Example: BUILD sets target 0.85, EXECUTE discovers API max is 0.78
 */
export function adjustCriterion(
  workDir: string,
  criterionId: string,
  newTarget: any,
  reason: string
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const updatedCriteria = state.success_criteria.map(c =>
    c.id === criterionId
      ? { ...c, target: newTarget, status: 'adjusted' as CriterionStatus, adjusted_reason: reason }
      : c
  );

  appendStateUpdate(workDir, 'constraint_discovered', state.current_phase || 'EXECUTE', {
    success_criteria: updatedCriteria,
  }, `Adjusted criterion ${criterionId}: ${reason}`);
}

/**
 * Add a new success criterion (typically during BUILD phase)
 */
export function addSuccessCriterion(
  workDir: string,
  criterion: Omit<SuccessCriterion, 'status'>
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const newCriterion: SuccessCriterion = {
    ...criterion,
    status: 'pending',
  };

  const updatedCriteria = [...state.success_criteria, newCriterion];

  appendStateUpdate(workDir, 'phase_feedback', 'BUILD', {
    success_criteria: updatedCriteria,
  }, `Added criterion: ${criterion.criterion}`);
}

/**
 * Get the current phase from IdealState
 */
export function getCurrentPhase(workDir: string): AlgorithmPhase | null {
  const state = readIdealState(workDir);
  return state?.current_phase || null;
}

// ============================================================
// Anti-Criteria Management Functions
// ============================================================

/**
 * Add an anti-criterion (something to AVOID)
 * Can be called during any phase when avoidance signals are discovered:
 * - OBSERVE: Extracted from user input ("don't", "avoid", "never")
 * - THINK: Discovered through research (common mistakes for this task type)
 * - EXECUTE: Discovered through agent findings
 */
export function addAntiCriterion(
  workDir: string,
  antiCriterion: Omit<AntiCriterion, 'status'>
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const newAntiCriterion: AntiCriterion = {
    ...antiCriterion,
    status: 'active',
  };

  const updatedAntiCriteria = [...state.anti_criteria, newAntiCriterion];

  appendStateUpdate(workDir, 'new_info', state.current_phase || 'OBSERVE', {
    anti_criteria: updatedAntiCriteria,
  }, `Added anti-criterion: ${antiCriterion.description}`);
}

/**
 * Mark an anti-criterion as violated (we did the thing we shouldn't have)
 * Should trigger a loop-back or at minimum a documented deviation
 */
export function violateAntiCriterion(
  workDir: string,
  antiCriterionId: string,
  reason: string
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const updatedAntiCriteria = state.anti_criteria.map(ac =>
    ac.id === antiCriterionId
      ? { ...ac, status: 'violated' as const, violated_reason: reason }
      : ac
  );

  appendStateUpdate(workDir, 'constraint_discovered', state.current_phase || 'VERIFY', {
    anti_criteria: updatedAntiCriteria,
  }, `Violated anti-criterion ${antiCriterionId}: ${reason}`);
}

/**
 * Override an anti-criterion (conscious decision to ignore it with justification)
 * Different from violation - this is intentional, not accidental
 */
export function overrideAntiCriterion(
  workDir: string,
  antiCriterionId: string,
  reason: string
): void {
  const state = readIdealState(workDir);
  if (!state) return;

  const updatedAntiCriteria = state.anti_criteria.map(ac =>
    ac.id === antiCriterionId
      ? { ...ac, status: 'overridden' as const, violated_reason: reason }
      : ac
  );

  appendStateUpdate(workDir, 'user_interrupt', state.current_phase || 'EXECUTE', {
    anti_criteria: updatedAntiCriteria,
  }, `Overrode anti-criterion ${antiCriterionId}: ${reason}`);
}

/**
 * Check if any anti-criteria have been violated
 * Used in VERIFY phase to ensure we didn't build what we were told to avoid
 */
export function checkAntiCriteriaViolations(workDir: string): AntiCriterion[] {
  const state = readIdealState(workDir);
  if (!state) return [];

  return state.anti_criteria.filter(ac => ac.status === 'violated');
}

/**
 * Get all active anti-criteria (useful for EXECUTE phase awareness)
 */
export function getActiveAntiCriteria(workDir: string): AntiCriterion[] {
  const state = readIdealState(workDir);
  if (!state) return [];

  return state.anti_criteria.filter(ac => ac.status === 'active');
}
