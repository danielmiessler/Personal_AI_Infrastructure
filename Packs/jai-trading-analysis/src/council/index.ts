/**
 * Council Module
 *
 * Investment council system for AI-assisted decision making.
 * Multiple agents with different investment philosophies debate
 * and reach consensus on trading decisions.
 */

// Types
export type {
  AgentProfile,
  InvestmentStyle,
  TradingAction,
  AnalysisContext,
  CouncilInput,
  AgentRecommendation,
  AgentOpinion,
  ConsensusLevel,
  FinalRecommendation,
  CouncilResult,
  CouncilConfig,
} from './types';

export { DEFAULT_COUNCIL_CONFIG } from './types';

// Agents
export { loadAgent, isValidAgentId, getAllAgents, getAgentsByStyle, AGENT_IDS } from './agents';
export type { AgentId } from './agents';

// Orchestrator
export { CouncilOrchestrator } from './orchestrator';
