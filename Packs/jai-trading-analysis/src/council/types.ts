/**
 * Council Module - Type Definitions
 *
 * Types for the investment council - a panel of AI agents with different
 * investment philosophies that debate and reach consensus on trading decisions.
 */

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Investment style that characterizes an agent's approach.
 */
export type InvestmentStyle =
  | 'value'
  | 'growth'
  | 'quantitative'
  | 'risk-focused'
  | 'tax-focused'
  | 'speculative';

/**
 * Profile defining an AI agent's investment personality.
 */
export interface AgentProfile {
  /** Unique agent identifier */
  id: string;
  /** Display name for the agent */
  name: string;
  /** Investment style/approach */
  style: InvestmentStyle;
  /** Primary area of focus */
  focus: string;
  /** System prompt defining the agent's personality and approach */
  systemPrompt: string;
}

// ============================================================================
// Council Input Types
// ============================================================================

/**
 * Trading action being considered.
 */
export type TradingAction = 'BUY' | 'SELL' | 'HOLD';

/**
 * Analysis result passed as context to the council.
 * This is a flexible type to accommodate various analysis outputs.
 */
export interface AnalysisContext {
  /** F-Score (Piotroski) result if available */
  fscore?: {
    score: number;
    maxScore: number;
    components: Record<string, boolean>;
  };
  /** Quality score if available */
  qualityScore?: {
    score: number;
    grade: string;
  };
  /** Dealbreakers found */
  dealbreakers?: string[];
  /** Yellow flags found */
  yellowFlags?: string[];
  /** Positive factors found */
  positiveFactors?: string[];
  /** Momentum analysis if available */
  momentum?: {
    signal: string;
    strength: number;
  };
  /** Current price information */
  price?: {
    current: number;
    targetBuy?: number;
    targetSell?: number;
  };
  /** Any additional analysis data */
  [key: string]: unknown;
}

/**
 * Input to a council session.
 */
export interface CouncilInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Proposed trading action */
  action: TradingAction;
  /** Dollar amount or share quantity (optional) */
  amount?: number;
  /** Whether amount is in dollars (true) or shares (false) */
  amountInDollars?: boolean;
  /** Analysis results providing context for the decision */
  context: AnalysisContext;
}

// ============================================================================
// Agent Opinion Types
// ============================================================================

/**
 * Recommendation from an individual agent.
 */
export type AgentRecommendation = 'APPROVE' | 'REJECT' | 'ABSTAIN';

/**
 * An individual agent's opinion on a proposed trade.
 */
export interface AgentOpinion {
  /** Agent that provided this opinion */
  agentId: string;
  /** Agent's recommendation */
  recommendation: AgentRecommendation;
  /** Confidence level (0-1) */
  confidence: number;
  /** Reasoning behind the recommendation */
  reasoning: string;
  /** Specific concerns raised */
  concerns: string[];
}

// ============================================================================
// Council Result Types
// ============================================================================

/**
 * Overall consensus reached by the council.
 */
export type ConsensusLevel =
  | 'UNANIMOUS'     // All agents agree
  | 'STRONG'        // 80%+ agreement
  | 'MAJORITY'      // 60-79% agreement
  | 'DIVIDED'       // 40-59% agreement
  | 'MINORITY'      // <40% agreement
  | 'NO_QUORUM';    // Not enough opinions

/**
 * Final recommendation from the council.
 */
export type FinalRecommendation = 'PROCEED' | 'REJECT' | 'DEFER';

/**
 * Result of a council session.
 */
export interface CouncilResult {
  /** Level of consensus reached */
  consensus: ConsensusLevel;
  /** Individual opinions from each agent */
  opinions: AgentOpinion[];
  /** Summary of dissenting views if any */
  dissent?: string;
  /** Final recommendation based on all opinions */
  finalRecommendation: FinalRecommendation;
  /** Human-readable summary of the council's decision */
  summary: string;
  /** Conditions that must be met if proceeding */
  conditions?: string[];
  /** Timestamp of the council session */
  timestamp: string;
}

// ============================================================================
// Council Configuration Types
// ============================================================================

/**
 * Configuration for council behavior.
 */
export interface CouncilConfig {
  /** Minimum number of agents required for quorum */
  quorumSize: number;
  /** Threshold for "strong" consensus (0-1) */
  strongConsensusThreshold: number;
  /** Threshold for "majority" consensus (0-1) */
  majorityThreshold: number;
  /** Whether to include detailed reasoning in results */
  includeDetailedReasoning: boolean;
}

/**
 * Default council configuration.
 */
export const DEFAULT_COUNCIL_CONFIG: CouncilConfig = {
  quorumSize: 3,
  strongConsensusThreshold: 0.8,
  majorityThreshold: 0.6,
  includeDetailedReasoning: true,
};
