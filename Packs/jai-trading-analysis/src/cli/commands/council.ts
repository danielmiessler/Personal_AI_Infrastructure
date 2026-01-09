/**
 * Council Command
 *
 * Convene the investment council for multi-perspective analysis.
 */

import {
  header,
  subheader,
  colorVerdict,
  colorPercent,
  formatCurrency,
  green,
  red,
  yellow,
  cyan,
  gray,
  bold,
  error,
  info,
  spinner,
  box,
} from '../format';

// =============================================================================
// Types
// =============================================================================

interface CouncilOptions {
  question?: string;
  agents?: string;
  json?: boolean;
}

interface AgentOpinion {
  agent: string;
  role: string;
  verdict: string;
  confidence: number;
  reasoning: string;
  keyPoints: string[];
}

interface CouncilDecision {
  ticker: string;
  question: string;
  consensus: string;
  consensusConfidence: number;
  opinions: AgentOpinion[];
  finalRecommendation: string;
  actionItems: string[];
}

// =============================================================================
// Agent Definitions
// =============================================================================

const AGENTS = {
  charles: {
    name: 'Charles',
    role: 'Chief Investment Officer',
    style: 'Conservative, policy-focused',
  },
  warren: {
    name: 'Warren',
    role: 'Value Analyst',
    style: 'Long-term, fundamental analysis',
  },
  cathy: {
    name: 'Cathy',
    role: 'Growth Analyst',
    style: 'Innovation-focused, high conviction',
  },
  risk: {
    name: 'Risk Manager',
    role: 'Risk Assessment',
    style: 'Cautious, downside-focused',
  },
  quant: {
    name: 'Quant',
    role: 'Quantitative Analyst',
    style: 'Data-driven, statistical',
  },
};

// =============================================================================
// Command Implementation
// =============================================================================

export async function councilCommand(
  ticker: string,
  options: CouncilOptions
): Promise<void> {
  const normalizedTicker = ticker.toUpperCase();
  const question = options.question || `Should we invest in ${normalizedTicker}?`;

  // Parse agent list
  const selectedAgents = options.agents
    ? options.agents.split(',').map(a => a.trim().toLowerCase())
    : ['charles', 'warren', 'cathy', 'risk'];

  console.log(header('Investment Council'));
  console.log('');
  console.log(`  Ticker:   ${bold(normalizedTicker)}`);
  console.log(`  Question: ${cyan(question)}`);
  console.log(`  Agents:   ${selectedAgents.map(a => AGENTS[a as keyof typeof AGENTS]?.name || a).join(', ')}`);
  console.log('');

  const loading = spinner('Convening council...');

  try {
    const decision = await conveneCouncil(normalizedTicker, question, selectedAgents);
    loading.stop();

    if (options.json) {
      console.log(JSON.stringify(decision, null, 2));
      return;
    }

    printCouncilDecision(decision);
  } catch (err) {
    loading.stop();
    error(`Council failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// =============================================================================
// Council Logic
// =============================================================================

async function conveneCouncil(
  ticker: string,
  question: string,
  agents: string[]
): Promise<CouncilDecision> {
  // In production, this would call the CouncilOrchestrator
  // For now, return mock data with simulated delay

  const opinions: AgentOpinion[] = [];

  for (const agentId of agents) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const opinion = await getAgentOpinion(agentId, ticker, question);
    if (opinion) {
      opinions.push(opinion);
    }
  }

  // Calculate consensus
  const verdicts = opinions.map(o => o.verdict);
  const buyCount = verdicts.filter(v => v === 'BUY').length;
  const holdCount = verdicts.filter(v => v === 'HOLD').length;
  const avoidCount = verdicts.filter(v => v === 'AVOID' || v === 'SELL').length;

  let consensus: string;
  if (buyCount > opinions.length / 2) consensus = 'BUY';
  else if (avoidCount > opinions.length / 2) consensus = 'AVOID';
  else consensus = 'HOLD';

  const avgConfidence = opinions.reduce((sum, o) => sum + o.confidence, 0) / opinions.length;

  return {
    ticker,
    question,
    consensus,
    consensusConfidence: avgConfidence,
    opinions,
    finalRecommendation: generateFinalRecommendation(consensus, avgConfidence, ticker),
    actionItems: generateActionItems(consensus, opinions),
  };
}

async function getAgentOpinion(
  agentId: string,
  ticker: string,
  question: string
): Promise<AgentOpinion | null> {
  const agent = AGENTS[agentId as keyof typeof AGENTS];
  if (!agent) return null;

  // Mock agent-specific analysis
  const mockOpinions: Record<string, () => AgentOpinion> = {
    charles: () => ({
      agent: agent.name,
      role: agent.role,
      verdict: getMockVerdict(ticker, 'conservative'),
      confidence: 75 + Math.floor(Math.random() * 15),
      reasoning: `Based on our investment policy and risk parameters, ${ticker} ${getMockVerdict(ticker, 'conservative') === 'BUY' ? 'meets' : 'does not meet'} our criteria.`,
      keyPoints: [
        'Aligns with diversification goals',
        'Position size within limits',
        'Stop loss levels defined',
      ],
    }),
    warren: () => ({
      agent: agent.name,
      role: agent.role,
      verdict: getMockVerdict(ticker, 'value'),
      confidence: 70 + Math.floor(Math.random() * 20),
      reasoning: `Looking at intrinsic value, ${ticker} trades ${Math.random() > 0.5 ? 'below' : 'above'} our estimated fair value.`,
      keyPoints: [
        'Strong balance sheet',
        'Consistent earnings history',
        'Durable competitive advantage',
      ],
    }),
    cathy: () => ({
      agent: agent.name,
      role: agent.role,
      verdict: getMockVerdict(ticker, 'growth'),
      confidence: 65 + Math.floor(Math.random() * 25),
      reasoning: `${ticker} represents ${Math.random() > 0.5 ? 'significant' : 'moderate'} innovation exposure in its sector.`,
      keyPoints: [
        'Disruptive technology potential',
        'Expanding addressable market',
        'Strong R&D investment',
      ],
    }),
    risk: () => ({
      agent: agent.name,
      role: agent.role,
      verdict: getMockVerdict(ticker, 'risk'),
      confidence: 80 + Math.floor(Math.random() * 15),
      reasoning: `Risk assessment for ${ticker} shows ${Math.random() > 0.5 ? 'manageable' : 'elevated'} downside exposure.`,
      keyPoints: [
        'Beta within acceptable range',
        'Correlation to existing positions',
        'Liquidity adequate for position size',
      ],
    }),
    quant: () => ({
      agent: agent.name,
      role: agent.role,
      verdict: getMockVerdict(ticker, 'quant'),
      confidence: 72 + Math.floor(Math.random() * 18),
      reasoning: `Quantitative signals for ${ticker} are ${Math.random() > 0.5 ? 'positive' : 'mixed'} based on momentum and mean reversion models.`,
      keyPoints: [
        'RSI indicates overbought/oversold',
        'Moving average trend analysis',
        'Volume patterns supportive',
      ],
    }),
  };

  const generator = mockOpinions[agentId];
  return generator ? generator() : null;
}

// =============================================================================
// Output Formatting
// =============================================================================

function printCouncilDecision(decision: CouncilDecision): void {
  // Consensus box
  const consensusColor = colorVerdict(decision.consensus);
  console.log(box('Consensus', [
    `Verdict:    ${consensusColor}`,
    `Confidence: ${decision.consensusConfidence.toFixed(0)}%`,
    '',
    decision.finalRecommendation,
  ].join('\n'), 50));

  // Individual opinions
  console.log(subheader('Agent Opinions'));

  for (const opinion of decision.opinions) {
    const verdictColor = colorVerdict(opinion.verdict);
    console.log('');
    console.log(`  ${bold(opinion.agent)} ${gray(`(${opinion.role})`)}`);
    console.log(`  Verdict: ${verdictColor} | Confidence: ${opinion.confidence}%`);
    console.log(`  ${gray(opinion.reasoning)}`);
    console.log('');
    for (const point of opinion.keyPoints) {
      console.log(`    ${cyan('-')} ${point}`);
    }
  }

  // Action items
  if (decision.actionItems.length > 0) {
    console.log(subheader('Recommended Actions'));
    for (let i = 0; i < decision.actionItems.length; i++) {
      console.log(`  ${i + 1}. ${decision.actionItems[i]}`);
    }
  }

  console.log('');
  console.log(gray('---'));
  console.log(gray('Council decision is advisory. Final decision rests with the investor.'));
}

// =============================================================================
// Helper Functions
// =============================================================================

function getMockVerdict(ticker: string, style: string): string {
  // Different agents have different biases
  const hash = ticker.charCodeAt(0) + ticker.length;

  switch (style) {
    case 'conservative':
      return hash % 3 === 0 ? 'BUY' : hash % 3 === 1 ? 'HOLD' : 'HOLD';
    case 'value':
      return hash % 4 === 0 ? 'BUY' : hash % 4 === 1 ? 'BUY' : 'HOLD';
    case 'growth':
      return hash % 3 === 0 ? 'BUY' : hash % 3 === 1 ? 'BUY' : 'HOLD';
    case 'risk':
      return hash % 4 === 0 ? 'HOLD' : hash % 4 === 1 ? 'AVOID' : 'HOLD';
    case 'quant':
      return hash % 3 === 0 ? 'BUY' : hash % 3 === 1 ? 'HOLD' : 'HOLD';
    default:
      return 'HOLD';
  }
}

function generateFinalRecommendation(consensus: string, confidence: number, ticker: string): string {
  if (consensus === 'BUY' && confidence >= 75) {
    return `Strong buy signal for ${ticker}. Consider initiating or adding to position.`;
  } else if (consensus === 'BUY') {
    return `Moderate buy signal for ${ticker}. Consider small initial position.`;
  } else if (consensus === 'AVOID' && confidence >= 75) {
    return `Strong avoid signal for ${ticker}. Do not initiate new positions.`;
  } else if (consensus === 'AVOID') {
    return `Caution advised for ${ticker}. Wait for better entry or fundamentals.`;
  } else {
    return `Mixed signals for ${ticker}. Hold existing positions, no new action recommended.`;
  }
}

function generateActionItems(consensus: string, opinions: AgentOpinion[]): string[] {
  const items: string[] = [];

  if (consensus === 'BUY') {
    items.push('Run full analysis with "jai analyze" command');
    items.push('Calculate optimal position size based on policy');
    items.push('Set stop loss and target prices before entry');
  } else if (consensus === 'AVOID') {
    items.push('Review existing positions for this ticker');
    items.push('Check for correlated positions in portfolio');
    items.push('Consider alternatives in the same sector');
  } else {
    items.push('Add to watchlist for future monitoring');
    items.push('Set price alert for potential entry point');
    items.push('Re-evaluate after next earnings report');
  }

  // Add risk-specific items if risk agent dissented
  const riskOpinion = opinions.find(o => o.role === 'Risk Assessment');
  if (riskOpinion && riskOpinion.verdict !== consensus) {
    items.push('Address risk concerns before proceeding');
  }

  return items;
}
