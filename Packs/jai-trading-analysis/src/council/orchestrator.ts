/**
 * Council Module - Orchestrator
 *
 * Orchestrates council sessions where multiple AI agents debate and
 * reach consensus on trading decisions.
 */

import type { Policy } from 'jai-finance-core';
import { ClaudeOrchestrator } from '../orchestration/claude';
import { loadAgent, type AgentId, AGENT_IDS } from './agents';
import type {
  CouncilInput,
  CouncilResult,
  AgentOpinion,
  AgentRecommendation,
  ConsensusLevel,
  FinalRecommendation,
  CouncilConfig,
  AgentProfile,
} from './types';
import { DEFAULT_COUNCIL_CONFIG } from './types';

// ============================================================================
// Council Orchestrator
// ============================================================================

/**
 * Orchestrates council sessions for investment decisions.
 *
 * The council is a panel of AI agents with different investment philosophies
 * that analyze proposed trades and reach consensus on whether to proceed.
 */
export class CouncilOrchestrator {
  private readonly claude: ClaudeOrchestrator;
  private readonly policy: Policy;
  private readonly config: CouncilConfig;

  /**
   * Create a new council orchestrator.
   *
   * @param claudeClient - Claude orchestrator for AI queries
   * @param policy - Investment policy for context
   * @param config - Council configuration (optional)
   */
  constructor(
    claudeClient: ClaudeOrchestrator,
    policy: Policy,
    config: Partial<CouncilConfig> = {}
  ) {
    this.claude = claudeClient;
    this.policy = policy;
    this.config = { ...DEFAULT_COUNCIL_CONFIG, ...config };
  }

  /**
   * Convene the council to evaluate a proposed trade.
   *
   * @param input - The trade being evaluated
   * @param agents - Specific agents to consult (optional, defaults based on input)
   * @returns Council result with consensus and recommendations
   */
  async convene(
    input: CouncilInput,
    agents?: AgentId[]
  ): Promise<CouncilResult> {
    const selectedAgents = agents ?? this.getDefaultAgents(input);

    // Validate we have enough agents for quorum
    if (selectedAgents.length < this.config.quorumSize) {
      return this.createNoQuorumResult(input, selectedAgents.length);
    }

    // Get opinion from each agent in parallel
    const opinions = await Promise.all(
      selectedAgents.map((agentId) =>
        this.runAgentAnalysis(agentId, input)
      )
    );

    // Synthesize consensus from all opinions
    return this.synthesizeConsensus(input, opinions);
  }

  /**
   * Determine which agents should be consulted based on the input.
   *
   * @param input - The trade being evaluated
   * @returns List of agent IDs to consult
   */
  getDefaultAgents(input: CouncilInput): AgentId[] {
    const agents: AgentId[] = ['warren', 'quentin', 'marcus'];

    // Add nova for growth-related analysis
    if (input.context.qualityScore || input.context.momentum) {
      agents.push('nova');
    }

    // Add taxley for sell decisions (tax implications matter)
    if (input.action === 'SELL') {
      agents.push('taxley');
    }

    // Add penelope only for penny stocks (price < $5)
    const currentPrice = input.context.price?.current;
    if (currentPrice !== undefined && currentPrice < 5) {
      agents.push('penelope');
    }

    return agents;
  }

  /**
   * Run analysis with a single agent.
   */
  private async runAgentAnalysis(
    agentId: AgentId,
    input: CouncilInput
  ): Promise<AgentOpinion> {
    const agent = loadAgent(agentId);
    const prompt = this.buildAgentPrompt(agent, input);

    try {
      const response = await this.claude.query({
        systemPrompt: agent.systemPrompt,
        prompt,
        jsonMode: true,
      });

      if (response.parsed) {
        return this.parseAgentResponse(agentId, response.parsed);
      }

      // Fallback if JSON parsing failed
      return this.createAbstainOpinion(agentId, 'Failed to parse response');
    } catch (error) {
      // Agent failed - return abstain opinion
      return this.createAbstainOpinion(
        agentId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Build the prompt for an agent to evaluate the trade.
   */
  private buildAgentPrompt(agent: AgentProfile, input: CouncilInput): string {
    const contextJson = JSON.stringify(input.context, null, 2);
    const policyConstraints = this.formatPolicyConstraints();

    return `
You are evaluating a proposed ${input.action} trade for ${input.ticker}.

${input.amount ? `Proposed amount: ${input.amountInDollars ? '$' : ''}${input.amount}${input.amountInDollars ? '' : ' shares'}` : 'Amount not specified'}

## Analysis Context
${contextJson}

## Investment Policy Constraints
${policyConstraints}

## Your Task
Evaluate this trade from your perspective as ${agent.name} (${agent.focus}).

Respond with a JSON object in this exact format:
{
  "recommendation": "APPROVE" | "REJECT" | "ABSTAIN",
  "confidence": <number between 0 and 1>,
  "reasoning": "<your detailed reasoning in 2-3 sentences>",
  "concerns": ["<concern 1>", "<concern 2>", ...]
}

Consider:
1. Does this trade align with sound investment principles from your perspective?
2. What are the key risks or concerns?
3. What would need to be true for this to be a good trade?
`;
  }

  /**
   * Format policy constraints for inclusion in prompts.
   */
  private formatPolicyConstraints(): string {
    const c = this.policy.constraints;
    return `
- Maximum single position: ${(c.max_single_position * 100).toFixed(0)}%
- Maximum sector concentration: ${(c.max_sector_concentration * 100).toFixed(0)}%
- Cash reserve requirement: ${(c.cash_reserve * 100).toFixed(0)}%
- Penny stock limit: ${(c.penny_stock_max * 100).toFixed(0)}%
${c.single_stock_stop_loss ? `- Stop loss threshold: ${(c.single_stock_stop_loss * 100).toFixed(0)}%` : ''}
`.trim();
  }

  /**
   * Parse the response from an agent into an AgentOpinion.
   */
  private parseAgentResponse(
    agentId: string,
    parsed: unknown
  ): AgentOpinion {
    const data = parsed as Record<string, unknown>;

    // Validate recommendation
    const recommendation = this.validateRecommendation(data.recommendation);

    // Validate confidence
    let confidence = Number(data.confidence);
    if (isNaN(confidence) || confidence < 0 || confidence > 1) {
      confidence = 0.5;
    }

    // Extract reasoning
    const reasoning =
      typeof data.reasoning === 'string' ? data.reasoning : 'No reasoning provided';

    // Extract concerns
    const concerns = Array.isArray(data.concerns)
      ? data.concerns.filter((c): c is string => typeof c === 'string')
      : [];

    return {
      agentId,
      recommendation,
      confidence,
      reasoning,
      concerns,
    };
  }

  /**
   * Validate and normalize a recommendation value.
   */
  private validateRecommendation(value: unknown): AgentRecommendation {
    if (value === 'APPROVE' || value === 'REJECT' || value === 'ABSTAIN') {
      return value;
    }
    return 'ABSTAIN';
  }

  /**
   * Create an abstain opinion for an agent that failed or couldn't respond.
   */
  private createAbstainOpinion(agentId: string, reason: string): AgentOpinion {
    return {
      agentId,
      recommendation: 'ABSTAIN',
      confidence: 0,
      reasoning: `Agent abstained: ${reason}`,
      concerns: [],
    };
  }

  /**
   * Synthesize consensus from all agent opinions.
   */
  private synthesizeConsensus(
    input: CouncilInput,
    opinions: AgentOpinion[]
  ): CouncilResult {
    // Filter out abstentions for consensus calculation
    const validOpinions = opinions.filter(
      (o) => o.recommendation !== 'ABSTAIN'
    );

    // Check quorum
    if (validOpinions.length < this.config.quorumSize) {
      return this.createNoQuorumResult(input, validOpinions.length);
    }

    // Calculate approval rate
    const approvals = validOpinions.filter(
      (o) => o.recommendation === 'APPROVE'
    );
    const approvalRate = approvals.length / validOpinions.length;

    // Determine consensus level
    const consensus = this.determineConsensus(approvalRate);

    // Determine final recommendation
    const finalRecommendation = this.determineFinalRecommendation(
      consensus,
      approvalRate
    );

    // Build dissent summary if not unanimous
    const dissent = this.buildDissentSummary(opinions, finalRecommendation);

    // Build summary
    const summary = this.buildSummary(
      input,
      consensus,
      finalRecommendation,
      opinions
    );

    // Extract conditions from concerns
    const conditions = this.extractConditions(opinions, finalRecommendation);

    return {
      consensus,
      opinions,
      dissent,
      finalRecommendation,
      summary,
      conditions,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Determine consensus level based on approval rate.
   */
  private determineConsensus(approvalRate: number): ConsensusLevel {
    if (approvalRate === 1) return 'UNANIMOUS';
    if (approvalRate >= this.config.strongConsensusThreshold) return 'STRONG';
    if (approvalRate >= this.config.majorityThreshold) return 'MAJORITY';
    if (approvalRate >= 0.4) return 'DIVIDED';
    return 'MINORITY';
  }

  /**
   * Determine final recommendation based on consensus.
   */
  private determineFinalRecommendation(
    consensus: ConsensusLevel,
    approvalRate: number
  ): FinalRecommendation {
    switch (consensus) {
      case 'UNANIMOUS':
      case 'STRONG':
        return approvalRate > 0.5 ? 'PROCEED' : 'REJECT';
      case 'MAJORITY':
        return approvalRate > 0.5 ? 'PROCEED' : 'REJECT';
      case 'DIVIDED':
        return 'DEFER';
      case 'MINORITY':
      case 'NO_QUORUM':
        return 'DEFER';
      default:
        return 'DEFER';
    }
  }

  /**
   * Build a summary of dissenting opinions.
   */
  private buildDissentSummary(
    opinions: AgentOpinion[],
    finalRecommendation: FinalRecommendation
  ): string | undefined {
    const dissenters = opinions.filter((o) => {
      if (o.recommendation === 'ABSTAIN') return false;
      if (finalRecommendation === 'PROCEED') {
        return o.recommendation === 'REJECT';
      }
      if (finalRecommendation === 'REJECT') {
        return o.recommendation === 'APPROVE';
      }
      return false;
    });

    if (dissenters.length === 0) return undefined;

    const summaries = dissenters.map(
      (d) => `${d.agentId}: ${d.reasoning}`
    );
    return summaries.join(' | ');
  }

  /**
   * Build a human-readable summary of the council decision.
   */
  private buildSummary(
    input: CouncilInput,
    consensus: ConsensusLevel,
    recommendation: FinalRecommendation,
    opinions: AgentOpinion[]
  ): string {
    const approveCount = opinions.filter(
      (o) => o.recommendation === 'APPROVE'
    ).length;
    const rejectCount = opinions.filter(
      (o) => o.recommendation === 'REJECT'
    ).length;
    const abstainCount = opinions.filter(
      (o) => o.recommendation === 'ABSTAIN'
    ).length;

    const voteBreakdown = `${approveCount} approve, ${rejectCount} reject${abstainCount > 0 ? `, ${abstainCount} abstain` : ''}`;

    let action: string;
    switch (recommendation) {
      case 'PROCEED':
        action = `Council recommends PROCEEDING with ${input.action} on ${input.ticker}`;
        break;
      case 'REJECT':
        action = `Council recommends REJECTING ${input.action} on ${input.ticker}`;
        break;
      case 'DEFER':
        action = `Council is divided on ${input.action} for ${input.ticker} - recommend DEFERRING`;
        break;
    }

    return `${action}. Consensus: ${consensus} (${voteBreakdown}).`;
  }

  /**
   * Extract actionable conditions from agent concerns.
   */
  private extractConditions(
    opinions: AgentOpinion[],
    recommendation: FinalRecommendation
  ): string[] | undefined {
    if (recommendation !== 'PROCEED') return undefined;

    // Collect concerns from agents who approved but had reservations
    const conditions: string[] = [];
    for (const opinion of opinions) {
      if (opinion.recommendation === 'APPROVE' && opinion.concerns.length > 0) {
        conditions.push(...opinion.concerns.slice(0, 2)); // Limit per agent
      }
    }

    // Also include top concerns from dissenters
    for (const opinion of opinions) {
      if (opinion.recommendation === 'REJECT' && opinion.concerns.length > 0) {
        conditions.push(opinion.concerns[0]);
      }
    }

    return conditions.length > 0 ? Array.from(new Set(conditions)) : undefined;
  }

  /**
   * Create a no-quorum result.
   */
  private createNoQuorumResult(
    input: CouncilInput,
    validCount: number
  ): CouncilResult {
    return {
      consensus: 'NO_QUORUM',
      opinions: [],
      finalRecommendation: 'DEFER',
      summary: `Council cannot reach quorum for ${input.action} on ${input.ticker}. Only ${validCount} of ${this.config.quorumSize} required votes available.`,
      timestamp: new Date().toISOString(),
    };
  }
}
