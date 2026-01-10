/**
 * Council Command
 *
 * Convene the investment council for multi-perspective analysis.
 * Uses real stock analysis and agent personas to generate perspectives.
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  header,
  subheader,
  colorVerdict,
  formatCurrency,
  formatPercent,
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
import { RealDataProvider } from '../../analysis/data-provider';
import { AnalysisPipeline } from '../../analysis/pipeline';
import { PolicyLoader, DEFAULT_POLICY } from 'jai-finance-core';
import type { Policy } from 'jai-finance-core';
import type { AnalysisResult, AnalysisVerdict } from '../../analysis/types';

// =============================================================================
// Types
// =============================================================================

interface CouncilOptions {
  question?: string;
  agents?: string;
  json?: boolean;
  detailed?: boolean;
}

interface AgentDefinition {
  name: string;
  role: string;
  style: string;
  focus: string[];
  vetoPower: boolean;
}

interface AgentPerspective {
  agent: AgentDefinition;
  verdict: 'BUY' | 'HOLD' | 'AVOID' | 'DEFER';
  confidence: number;
  reasoning: string;
  keyPoints: string[];
  concerns: string[];
  position: 'approve' | 'block' | 'defer';
}

interface CouncilDecision {
  ticker: string;
  currentPrice: number;
  question: string;
  consensus: 'BUY' | 'HOLD' | 'AVOID' | 'MIXED';
  consensusConfidence: number;
  perspectives: AgentPerspective[];
  analysisVerdict: AnalysisVerdict;
  finalRecommendation: string;
  actionItems: string[];
  vetoes: string[];
}

// =============================================================================
// Agent Definitions (Investment Council)
// =============================================================================

const INVESTMENT_AGENTS: Record<string, AgentDefinition> = {
  warren: {
    name: 'Warren',
    role: 'Value Investment Analyst',
    style: 'Patient, disciplined, quality-focused',
    focus: ['intrinsic value', 'competitive moat', 'margin of safety', 'management quality'],
    vetoPower: true,
  },
  quentin: {
    name: 'Quentin',
    role: 'Quantitative Analyst',
    style: 'Data-driven, systematic, probability-focused',
    focus: ['technical indicators', 'statistical analysis', 'factor models', 'momentum'],
    vetoPower: false,
  },
  nova: {
    name: 'Nova',
    role: 'Growth Investment Analyst',
    style: 'Optimistic, forward-looking, conviction-driven',
    focus: ['revenue growth', 'TAM expansion', 'innovation', 'market disruption'],
    vetoPower: false,
  },
  marcus: {
    name: 'Marcus',
    role: 'Risk Manager',
    style: 'Cautious, systematic, capital-preservation-focused',
    focus: ['position sizing', 'portfolio risk', 'stop loss', 'correlation'],
    vetoPower: true,
  },
  taxley: {
    name: 'Taxley',
    role: 'Tax Strategy Analyst',
    style: 'Detail-oriented, rules-focused, optimization-minded',
    focus: ['capital gains', 'wash sales', 'holding period', 'tax efficiency'],
    vetoPower: false,
  },
  penelope: {
    name: 'Penelope',
    role: 'Small Cap Specialist',
    style: 'Skeptical, due-diligence-focused, fraud-aware',
    focus: ['penny stocks', 'liquidity', 'SEC filings', 'pump detection'],
    vetoPower: true,
  },
};

const DEFAULT_ROSTER = ['warren', 'quentin', 'nova', 'marcus'];

// =============================================================================
// Configuration
// =============================================================================

const CONFIG_DIR = join(homedir(), '.config', 'jai');
const POLICY_FILE = join(CONFIG_DIR, 'policy.yaml');
const POSITIONS_FILE = join(CONFIG_DIR, 'positions.json');

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
  const selectedAgentIds = options.agents
    ? options.agents.split(',').map(a => a.trim().toLowerCase())
    : DEFAULT_ROSTER;

  // Add Penelope for penny stocks
  const isPennyStock = await checkIfPennyStock(normalizedTicker);
  if (isPennyStock && !selectedAgentIds.includes('penelope')) {
    selectedAgentIds.push('penelope');
  }

  const selectedAgents = selectedAgentIds
    .map(id => INVESTMENT_AGENTS[id])
    .filter(Boolean);

  console.log(header('Investment Council'));
  console.log('');
  console.log(`  Ticker:   ${bold(normalizedTicker)}`);
  console.log(`  Question: ${cyan(question)}`);
  console.log(`  Council:  ${selectedAgents.map(a => a.name).join(', ')}`);
  console.log('');

  const loading = spinner('Running analysis and convening council...');

  try {
    const decision = await conveneCouncil(normalizedTicker, question, selectedAgents, options);
    loading.stop();

    if (options.json) {
      console.log(JSON.stringify(decision, null, 2));
      return;
    }

    printCouncilDecision(decision, options.detailed);
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
  agents: AgentDefinition[],
  options: CouncilOptions
): Promise<CouncilDecision> {
  // Initialize data provider
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not set. Run: source ~/.config/jai/load-secrets.sh');
  }

  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: true,
  });

  // Load policy
  let policy: Policy;
  if (existsSync(POLICY_FILE)) {
    const loader = new PolicyLoader(POLICY_FILE);
    policy = loader.load();
  } else {
    policy = DEFAULT_POLICY;
  }

  // Run full analysis
  const pipeline = new AnalysisPipeline(dataProvider, policy);
  const analysis = await pipeline.analyze(ticker);

  // Get current price
  const quote = await dataProvider.getQuote(ticker);

  // Check if we already own this position
  const existingPosition = await getExistingPosition(ticker);

  // Generate perspectives from each agent
  const perspectives: AgentPerspective[] = [];
  const vetoes: string[] = [];

  for (const agent of agents) {
    const perspective = generateAgentPerspective(
      agent,
      analysis,
      quote.price,
      existingPosition,
      question
    );
    perspectives.push(perspective);

    // Track vetoes
    if (perspective.position === 'block' && agent.vetoPower) {
      vetoes.push(`${agent.name}: ${perspective.concerns[0] || 'Blocked without specific reason'}`);
    }
  }

  // Calculate consensus
  const { consensus, confidence } = calculateConsensus(perspectives, vetoes);

  return {
    ticker,
    currentPrice: quote.price,
    question,
    consensus,
    consensusConfidence: confidence,
    perspectives,
    analysisVerdict: analysis.verdict,
    finalRecommendation: generateFinalRecommendation(consensus, confidence, ticker, vetoes),
    actionItems: generateActionItems(consensus, perspectives, ticker),
    vetoes,
  };
}

// =============================================================================
// Agent Perspective Generation
// =============================================================================

function generateAgentPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult,
  currentPrice: number,
  existingPosition: { shares: number; avgCost: number } | null,
  question: string
): AgentPerspective {
  // Generate perspective based on agent's focus areas and analysis data
  switch (agent.name) {
    case 'Warren':
      return generateWarrenPerspective(agent, analysis, currentPrice);
    case 'Quentin':
      return generateQuentinPerspective(agent, analysis);
    case 'Nova':
      return generateNovaPerspective(agent, analysis);
    case 'Marcus':
      return generateMarcusPerspective(agent, analysis, existingPosition);
    case 'Taxley':
      return generateTaxleyPerspective(agent, analysis, existingPosition);
    case 'Penelope':
      return generatePenelopePerspective(agent, analysis, currentPrice);
    default:
      return generateDefaultPerspective(agent, analysis);
  }
}

function generateWarrenPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult,
  price: number
): AgentPerspective {
  const keyPoints: string[] = [];
  const concerns: string[] = [];

  // Check F-Score (quality indicator)
  const fScoreStage = analysis.stages.find(s => s.name === 'fScore');
  const fScore = fScoreStage ? Math.round(fScoreStage.score * 9 / 100) : 0;

  if (fScore >= 7) {
    keyPoints.push(`Strong financial health (F-Score: ${fScore}/9)`);
  } else if (fScore >= 5) {
    keyPoints.push(`Adequate financial health (F-Score: ${fScore}/9)`);
  } else {
    concerns.push(`Weak financial health (F-Score: ${fScore}/9)`);
  }

  // Check for moat
  const positiveStage = analysis.stages.find(s => s.name === 'positiveFactors');
  if (positiveStage && positiveStage.score >= 70) {
    keyPoints.push('Strong competitive moat identified');
  } else if (positiveStage && positiveStage.score >= 40) {
    keyPoints.push('Moderate competitive position');
  } else {
    concerns.push('Weak or unclear competitive moat');
  }

  // Check dealbreakers
  const dealbreakers = analysis.stages.find(s => s.name === 'dealbreaker');
  if (dealbreakers && !dealbreakers.passed) {
    concerns.push('Fundamental dealbreakers present');
  }

  // Determine verdict
  let verdict: 'BUY' | 'HOLD' | 'AVOID' | 'DEFER';
  let position: 'approve' | 'block' | 'defer';
  let confidence: number;

  if (analysis.verdict === 'AVOID' || concerns.length >= 2) {
    verdict = 'AVOID';
    position = 'block';
    confidence = 80;
  } else if (analysis.verdict === 'BUY' && keyPoints.length >= 2) {
    verdict = 'BUY';
    position = 'approve';
    confidence = 75 + Math.min(keyPoints.length * 5, 15);
  } else {
    verdict = 'HOLD';
    position = 'defer';
    confidence = 60;
  }

  return {
    agent,
    verdict,
    confidence,
    reasoning: `From a value perspective, ${analysis.verdict === 'BUY' ? 'this looks like a quality business' : 'I have concerns about the fundamentals'}. ${keyPoints.length > 0 ? keyPoints[0] + '.' : ''} ${concerns.length > 0 ? 'However, ' + concerns[0].toLowerCase() + '.' : ''}`,
    keyPoints,
    concerns,
    position,
  };
}

function generateQuentinPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult
): AgentPerspective {
  const keyPoints: string[] = [];
  const concerns: string[] = [];

  // Check timing signals
  const timing = analysis.timing;
  if (timing) {
    if (timing.action === 'BUY_NOW' || timing.action === 'ACCUMULATE') {
      keyPoints.push(`Technical timing favorable: ${timing.action}`);
    } else if (timing.action === 'WAIT_TO_BUY') {
      concerns.push('Technical timing suggests waiting');
    } else if (timing.action === 'SELL_NOW' || timing.action === 'REDUCE') {
      concerns.push(`Negative technical signals: ${timing.action}`);
    }

    // RSI
    if (timing.rsi !== undefined) {
      if (timing.rsi < 30) {
        keyPoints.push(`Oversold conditions (RSI: ${timing.rsi.toFixed(0)})`);
      } else if (timing.rsi > 70) {
        concerns.push(`Overbought conditions (RSI: ${timing.rsi.toFixed(0)})`);
      }
    }

    // Trend
    if (timing.trend) {
      if (timing.trend === 'STRONG_UP' || timing.trend === 'UP') {
        keyPoints.push(`Positive trend: ${timing.trend}`);
      } else if (timing.trend === 'DOWN' || timing.trend === 'STRONG_DOWN') {
        concerns.push(`Negative trend: ${timing.trend}`);
      }
    }
  }

  // Confidence score from analysis
  keyPoints.push(`Analysis confidence: ${analysis.confidenceScore}%`);

  let verdict: 'BUY' | 'HOLD' | 'AVOID' | 'DEFER';
  let position: 'approve' | 'block' | 'defer';
  let confidence: number;

  if (timing?.action === 'BUY_NOW' && concerns.length === 0) {
    verdict = 'BUY';
    position = 'approve';
    confidence = 75;
  } else if (timing?.action === 'SELL_NOW' || concerns.length >= 2) {
    verdict = 'AVOID';
    position = 'defer';
    confidence = 70;
  } else {
    verdict = 'HOLD';
    position = 'defer';
    confidence = 60;
  }

  return {
    agent,
    verdict,
    confidence,
    reasoning: `The data shows ${keyPoints.length > concerns.length ? 'favorable' : 'mixed'} quantitative signals. ${keyPoints[0] || 'No strong signals detected.'} ${concerns.length > 0 ? 'However, ' + concerns[0].toLowerCase() + '.' : ''}`,
    keyPoints,
    concerns,
    position,
  };
}

function generateNovaPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult
): AgentPerspective {
  const keyPoints: string[] = [];
  const concerns: string[] = [];

  // Check for growth indicators
  const positiveStage = analysis.stages.find(s => s.name === 'positiveFactors');
  if (positiveStage) {
    if (positiveStage.score >= 70) {
      keyPoints.push('Strong growth catalysts identified');
    } else if (positiveStage.score >= 40) {
      keyPoints.push('Some growth potential present');
    } else {
      concerns.push('Limited growth catalysts');
    }
  }

  // Check recommendation reasoning for growth signals
  for (const rec of analysis.recommendations) {
    if (rec.summary.toLowerCase().includes('growth') ||
        rec.summary.toLowerCase().includes('revenue') ||
        rec.summary.toLowerCase().includes('expansion')) {
      keyPoints.push(rec.summary);
      break;
    }
  }

  // Always optimistic about quality companies
  if (analysis.verdict === 'BUY') {
    keyPoints.push('Fundamentals support growth investment thesis');
  }

  let verdict: 'BUY' | 'HOLD' | 'AVOID' | 'DEFER';
  let position: 'approve' | 'block' | 'defer';
  let confidence: number;

  if (analysis.verdict === 'BUY' && keyPoints.length >= 2) {
    verdict = 'BUY';
    position = 'approve';
    confidence = 80;
  } else if (analysis.verdict === 'AVOID') {
    verdict = 'HOLD';
    position = 'defer';
    confidence = 55;
  } else {
    verdict = 'BUY';
    position = 'approve';
    confidence = 65;
  }

  return {
    agent,
    verdict,
    confidence,
    reasoning: `From a growth perspective, ${keyPoints.length > 0 ? keyPoints[0].toLowerCase() : 'the opportunity exists'}. The future potential ${concerns.length > 0 ? 'is tempered by ' + concerns[0].toLowerCase() : 'looks promising'}.`,
    keyPoints,
    concerns,
    position,
  };
}

function generateMarcusPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult,
  existingPosition: { shares: number; avgCost: number } | null
): AgentPerspective {
  const keyPoints: string[] = [];
  const concerns: string[] = [];

  // Check for risk factors
  const yellowFlagStage = analysis.stages.find(s => s.name === 'yellowFlag');
  if (yellowFlagStage && !yellowFlagStage.passed) {
    concerns.push('Multiple risk flags detected');
  }

  // Check dealbreakers
  const dealbreakers = analysis.stages.find(s => s.name === 'dealbreaker');
  if (dealbreakers && !dealbreakers.passed) {
    concerns.push('Critical risk: Dealbreaker conditions present');
  }

  // Position sizing recommendation
  if (analysis.verdict === 'BUY') {
    keyPoints.push('Risk parameters within policy limits');
    keyPoints.push('Recommend standard position sizing (3-5% of portfolio)');
  } else if (analysis.verdict === 'MODERATE_RISK') {
    keyPoints.push('Elevated risk requires reduced position size');
    concerns.push('Recommend half-size position (1-2% of portfolio)');
  }

  // Existing position considerations
  if (existingPosition) {
    keyPoints.push(`Existing position: ${existingPosition.shares} shares @ $${existingPosition.avgCost.toFixed(2)}`);
    concerns.push('Adding may increase concentration risk');
  }

  let verdict: 'BUY' | 'HOLD' | 'AVOID' | 'DEFER';
  let position: 'approve' | 'block' | 'defer';
  let confidence: number;

  if (analysis.verdict === 'AVOID' || concerns.some(c => c.includes('Critical'))) {
    verdict = 'AVOID';
    position = 'block';
    confidence = 85;
  } else if (concerns.length >= 2) {
    verdict = 'HOLD';
    position = 'defer';
    confidence = 70;
  } else {
    verdict = analysis.verdict === 'BUY' ? 'BUY' : 'HOLD';
    position = analysis.verdict === 'BUY' ? 'approve' : 'defer';
    confidence = 75;
  }

  return {
    agent,
    verdict,
    confidence,
    reasoning: `From a risk management standpoint, ${concerns.length > 0 ? concerns[0].toLowerCase() : 'the risk profile is acceptable'}. ${keyPoints.length > 0 ? keyPoints[0] + '.' : ''}`,
    keyPoints,
    concerns,
    position,
  };
}

function generateTaxleyPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult,
  existingPosition: { shares: number; avgCost: number } | null
): AgentPerspective {
  const keyPoints: string[] = [];
  const concerns: string[] = [];

  if (existingPosition) {
    // Check for tax implications on existing position
    keyPoints.push('Existing position - consider tax lot selection on any trades');
    keyPoints.push('Check holding period before selling (long-term vs short-term rates)');
  } else {
    keyPoints.push('New position - no immediate tax implications');
    keyPoints.push('Establish cost basis documentation');
  }

  // General tax advice
  keyPoints.push('Ensure 30-day wash sale window is clear if harvesting losses');

  return {
    agent,
    verdict: 'DEFER',
    confidence: 70,
    reasoning: `From a tax perspective, ${existingPosition ? 'the existing position requires careful consideration of holding periods and lot selection' : 'a new position has no immediate tax implications'}. Standard tax-efficient practices apply.`,
    keyPoints,
    concerns,
    position: 'defer',
  };
}

function generatePenelopePerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult,
  price: number
): AgentPerspective {
  const keyPoints: string[] = [];
  const concerns: string[] = [];
  const isPenny = price < 5;

  if (isPenny) {
    concerns.push(`Penny stock territory ($${price.toFixed(2)})`);
    concerns.push('Enhanced due diligence required');
    concerns.push('Verify SEC filings are current');
    concerns.push('Check for pump-and-dump indicators');
  } else {
    keyPoints.push(`Price ($${price.toFixed(2)}) above penny stock threshold`);
    keyPoints.push('Standard due diligence applies');
  }

  // Check for red flags
  const dealbreakers = analysis.stages.find(s => s.name === 'dealbreaker');
  if (dealbreakers && !dealbreakers.passed) {
    concerns.push('Fundamental red flags detected - increased scrutiny needed');
  }

  let verdict: 'BUY' | 'HOLD' | 'AVOID' | 'DEFER';
  let position: 'approve' | 'block' | 'defer';
  let confidence: number;

  if (isPenny && concerns.length >= 3) {
    verdict = 'AVOID';
    position = 'block';
    confidence = 85;
  } else if (isPenny) {
    verdict = 'HOLD';
    position = 'defer';
    confidence = 60;
  } else {
    verdict = analysis.verdict === 'BUY' ? 'BUY' : 'HOLD';
    position = 'defer';
    confidence = 70;
  }

  return {
    agent,
    verdict,
    confidence,
    reasoning: isPenny
      ? `This is a penny stock requiring enhanced scrutiny. ${concerns[0]}. I recommend thorough verification of SEC filings and company legitimacy before proceeding.`
      : `Not a penny stock - standard analysis applies. ${keyPoints[0]}.`,
    keyPoints,
    concerns,
    position,
  };
}

function generateDefaultPerspective(
  agent: AgentDefinition,
  analysis: AnalysisResult
): AgentPerspective {
  return {
    agent,
    verdict: analysis.verdict === 'BUY' ? 'BUY' : analysis.verdict === 'AVOID' ? 'AVOID' : 'HOLD',
    confidence: analysis.confidenceScore,
    reasoning: `Based on the analysis, verdict is ${analysis.verdict}.`,
    keyPoints: analysis.recommendations.map(r => r.summary),
    concerns: [],
    position: analysis.verdict === 'BUY' ? 'approve' : 'defer',
  };
}

// =============================================================================
// Consensus Calculation
// =============================================================================

function calculateConsensus(
  perspectives: AgentPerspective[],
  vetoes: string[]
): { consensus: 'BUY' | 'HOLD' | 'AVOID' | 'MIXED'; confidence: number } {
  // If any veto, consensus cannot be BUY
  if (vetoes.length > 0) {
    return { consensus: 'AVOID', confidence: 80 };
  }

  const buyCount = perspectives.filter(p => p.verdict === 'BUY').length;
  const holdCount = perspectives.filter(p => p.verdict === 'HOLD' || p.verdict === 'DEFER').length;
  const avoidCount = perspectives.filter(p => p.verdict === 'AVOID').length;

  const total = perspectives.length;
  const avgConfidence = perspectives.reduce((sum, p) => sum + p.confidence, 0) / total;

  if (buyCount > total / 2) {
    return { consensus: 'BUY', confidence: avgConfidence };
  } else if (avoidCount > total / 2) {
    return { consensus: 'AVOID', confidence: avgConfidence };
  } else if (holdCount > total / 2) {
    return { consensus: 'HOLD', confidence: avgConfidence };
  } else {
    return { consensus: 'MIXED', confidence: avgConfidence * 0.8 };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function checkIfPennyStock(ticker: string): Promise<boolean> {
  try {
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    if (!finnhubApiKey) return false;

    const dataProvider = new RealDataProvider({
      finnhubApiKey,
      enableCache: true,
    });

    const quote = await dataProvider.getQuote(ticker);
    return quote.price < 5;
  } catch {
    return false;
  }
}

async function getExistingPosition(ticker: string): Promise<{ shares: number; avgCost: number } | null> {
  try {
    if (!existsSync(POSITIONS_FILE)) return null;

    const content = await Bun.file(POSITIONS_FILE).text();
    const data = JSON.parse(content);

    const position = data.positions?.find((p: { ticker: string }) => p.ticker === ticker);
    if (!position) return null;

    return {
      shares: position.shares,
      avgCost: position.avgCostBasis || position.costBasis || 0,
    };
  } catch {
    return null;
  }
}

function generateFinalRecommendation(
  consensus: string,
  confidence: number,
  ticker: string,
  vetoes: string[]
): string {
  if (vetoes.length > 0) {
    return `Council has BLOCKED this investment. ${vetoes[0]}`;
  }

  switch (consensus) {
    case 'BUY':
      return confidence >= 75
        ? `Strong consensus to BUY ${ticker}. Proceed with position sizing per policy.`
        : `Moderate consensus to BUY ${ticker}. Consider smaller initial position.`;
    case 'AVOID':
      return `Council recommends AVOIDING ${ticker}. Multiple concerns raised.`;
    case 'HOLD':
      return `Council suggests WAITING on ${ticker}. Monitor for better entry or clarity.`;
    case 'MIXED':
      return `Council is DIVIDED on ${ticker}. No clear consensus - consider more research.`;
    default:
      return `Review individual perspectives for ${ticker}.`;
  }
}

function generateActionItems(
  consensus: string,
  perspectives: AgentPerspective[],
  ticker: string
): string[] {
  const items: string[] = [];

  if (consensus === 'BUY') {
    items.push(`Calculate position size for ${ticker} per policy (max 15%)`);
    items.push('Set stop-loss at 8% below entry');
    items.push('Document cost basis for tax tracking');
  } else if (consensus === 'AVOID') {
    items.push(`Add ${ticker} to watchlist for future review`);
    items.push('Review concerns raised by council');
  } else {
    items.push(`Set price alert for ${ticker}`);
    items.push('Re-evaluate after next earnings report');
  }

  // Add agent-specific action items
  for (const p of perspectives) {
    if (p.concerns.length > 0 && p.agent.vetoPower) {
      items.push(`Address ${p.agent.name}'s concern: ${p.concerns[0]}`);
    }
  }

  return items.slice(0, 5); // Limit to 5 items
}

// =============================================================================
// Output Formatting
// =============================================================================

function printCouncilDecision(decision: CouncilDecision, detailed?: boolean): void {
  // Analysis context
  console.log(subheader('Analysis Context'));
  console.log(`  Current Price:    ${formatCurrency(decision.currentPrice)}`);
  console.log(`  Analysis Verdict: ${colorVerdict(decision.analysisVerdict)}`);
  console.log('');

  // Vetoes (if any)
  if (decision.vetoes.length > 0) {
    console.log(subheader('Vetoes'));
    for (const veto of decision.vetoes) {
      console.log(`  ${red('BLOCKED')} ${veto}`);
    }
    console.log('');
  }

  // Consensus box
  const consensusColor = decision.consensus === 'BUY' ? green :
                         decision.consensus === 'AVOID' ? red :
                         decision.consensus === 'MIXED' ? yellow : gray;

  console.log(box('Council Consensus', [
    `Verdict:    ${consensusColor(decision.consensus)}`,
    `Confidence: ${decision.consensusConfidence.toFixed(0)}%`,
    '',
    decision.finalRecommendation,
  ].join('\n'), 55));

  // Individual perspectives
  console.log(subheader('Agent Perspectives'));

  for (const perspective of decision.perspectives) {
    const verdictColor = perspective.verdict === 'BUY' ? green :
                         perspective.verdict === 'AVOID' ? red :
                         yellow;
    const positionIcon = perspective.position === 'approve' ? green('APPROVE') :
                         perspective.position === 'block' ? red('BLOCK') :
                         gray('DEFER');

    console.log('');
    console.log(`  ${bold(perspective.agent.name)} ${gray(`(${perspective.agent.role})`)}`);
    console.log(`  Position: ${positionIcon} | Verdict: ${verdictColor(perspective.verdict)} | Confidence: ${perspective.confidence}%`);
    console.log(`  ${gray(perspective.reasoning)}`);

    if (detailed) {
      if (perspective.keyPoints.length > 0) {
        console.log('');
        for (const point of perspective.keyPoints) {
          console.log(`    ${green('+')} ${point}`);
        }
      }
      if (perspective.concerns.length > 0) {
        for (const concern of perspective.concerns) {
          console.log(`    ${yellow('!')} ${concern}`);
        }
      }
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
