// Work-session state served by /api/algorithm (+ SSE mirror).
//
// 2026-07-14 agents-dashboard redesign: modes, effort tiers, presets, and the
// per-phase ceremony are gone. A session is either TRACKED (an ISA backs it —
// claims close on evidence, the climb is the story) or UNTRACKED (liveness
// only). `phase` survives as a coarse lifecycle signal (the values actually
// written today: an active value at start, learn/complete at close).

// `phase` is whatever the ISA declared, uppercased — current vocabulary or a
// retired station name from an old row. Nothing switches on the literal: it is
// resolved through PHASE_TO_ASCENT in LIFEOS/TOOLS/ascent.ts, so an unknown
// value degrades to a real state instead of falling off a switch. Typed as a
// plain string for exactly that reason (2026-07-27 unification).
export type AlgorithmPhase = string;

// ── Live activity (2026-07-22) — derived from tool-activity.jsonl server-side ──

export type { ActivityClass } from '../../../../TOOLS/ascent';
import type { ActivityClass } from '../../../../TOOLS/ascent';

/** One minute of tool calls, bucketed by class (e/b/v/d/o keys keep frames small). */
export interface RibbonBucket {
  t: number;
  e: number;
  b: number;
  v: number;
  d: number;
  o: number;
}

export interface ActivitySummary {
  /** Dominant class over the last ~3 min of tool calls; null when quiet. */
  state: ActivityClass | null;
  lastTool: string | null;
  lastTs: number | null;
  /** Per-minute buckets for the last ~30 min, oldest first. */
  ribbon: RibbonBucket[];
}

/** ISC adds/closes folded from the climb points. */
export interface IscDeltas {
  addedTotal: number;
  closedTotal: number;
  added1h: number;
  closed1h: number;
}

export interface AlgorithmCriterion {
  id: string;
  description: string;
  type: 'criterion' | 'anti-criterion';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  evidence?: string;
}

export interface AlgorithmAgent {
  name: string;
  agentType: string;
  status: 'active' | 'idle' | 'completed';
  task?: string;
}

/** One step of a run's ascent: claims closed / total at a moment in time. */
export interface ClimbPoint {
  ts: number;
  done: number;
  total: number;
}

export interface RatingPulse {
  value: number;
  timestamp: number;
  message?: string;
}

export interface AlgorithmState {
  active: boolean;
  sessionId: string;
  taskDescription: string;
  currentPhase: AlgorithmPhase;
  phaseStartedAt: number;
  algorithmStartedAt: number;
  criteria: AlgorithmCriterion[];
  agents: AlgorithmAgent[];
  capabilities: string[];
  progress: { done: number; total: number };
  rawTask?: string;
  /** Intent snippet extracted from ISA body — shown when no criteria are parseable */
  intent?: string;
  /** Non-null when the ISASync parser could not extract ISCs from the ISA */
  criteriaParseWarning?: 'missing-section' | 'empty-section' | 'all-dropped';
  /** ISA iteration (1 = first run; 2+ = reopened/rework) */
  iteration?: number;
  reworkCount?: number;
  /** An ISA backs this session — claims, evidence, the climb */
  tracked: boolean;
  /** Ascent history folded from work-events.jsonl */
  climb: ClimbPoint[];
  /** Live tool-stream state — present when the session has recent tool calls */
  activity?: ActivitySummary;
  /** ISC adds/closes folded from climb points — present on tracked runs with data */
  iscDeltas?: IscDeltas;
  ratings?: RatingPulse[];
  sessionUUID?: string;
  completedAt?: number;
}

export interface AlgorithmApiResponse {
  algorithms: AlgorithmState[];
  active: boolean;
  pulseStrip?: RatingPulse[];
}
