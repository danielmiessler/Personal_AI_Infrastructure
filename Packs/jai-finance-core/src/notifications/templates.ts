/**
 * Message Templates for JAI Finance Core Notifications
 *
 * Template functions for consistent message formatting.
 */

import type {
  Position,
  Recommendation,
  BuyAnalysis,
  PortfolioState,
  Alert,
  Opportunity,
} from './types';

// -----------------------------------------------------------------------------
// Template Data Interfaces
// -----------------------------------------------------------------------------

export interface StopLossTemplateData {
  position: Position;
  currentPrice: number;
  stopLossPrice: number;
  lossPercent: number;
  recommendation: Recommendation;
  policyReference?: string;
}

export interface BuySignalTemplateData {
  ticker: string;
  currentPrice: number;
  buyPrice: number;
  analysis: BuyAnalysis;
  recommendation: Recommendation;
  policyReference?: string;
}

export interface TargetHitTemplateData {
  position: Position;
  currentPrice: number;
  targetPrice: number;
  gainPercent: number;
  recommendation: Recommendation;
  policyReference?: string;
}

export interface BriefTemplateData {
  portfolioState: PortfolioState;
  alerts: Alert[];
  opportunities: Opportunity[];
  date: string;
}

// -----------------------------------------------------------------------------
// Template Functions
// -----------------------------------------------------------------------------

/**
 * Stop loss alert template
 */
export const STOP_LOSS_TEMPLATE = (data: StopLossTemplateData): string => {
  const { position, currentPrice, stopLossPrice, lossPercent, recommendation, policyReference } = data;

  const lines = [
    `**STOP LOSS TRIGGERED: ${position.ticker}**`,
    '',
    `Current Price: $${currentPrice.toFixed(2)}`,
    `Stop Loss: $${stopLossPrice.toFixed(2)}`,
    `Loss: ${lossPercent.toFixed(1)}%`,
    '',
    `Shares Held: ${position.shares}`,
    `Average Cost: $${position.averageCost.toFixed(2)}`,
    '',
    '---',
    '',
    `**Charles Recommendation:** ${recommendation.action}`,
    `Confidence: ${recommendation.confidence}`,
    '',
    recommendation.reasoning,
  ];

  if (policyReference) {
    lines.push('', `Policy: ${policyReference}`);
  }

  return lines.join('\n');
};

/**
 * Buy signal template
 */
export const BUY_SIGNAL_TEMPLATE = (data: BuySignalTemplateData): string => {
  const { ticker, currentPrice, buyPrice, analysis, recommendation, policyReference } = data;

  const discount = ((buyPrice - currentPrice) / buyPrice * 100).toFixed(1);

  const lines = [
    `**BUY SIGNAL: ${ticker}**`,
    '',
    `Current Price: $${currentPrice.toFixed(2)}`,
    `Target Entry: $${buyPrice.toFixed(2)}`,
    `Discount: ${discount}%`,
    '',
    '**Analysis**',
    `Fundamentals: ${analysis.fundamentals}`,
    `Technicals: ${analysis.technicals}`,
  ];

  if (analysis.catalyst) {
    lines.push(`Catalyst: ${analysis.catalyst}`);
  }

  if (analysis.risks.length > 0) {
    lines.push('', '**Risks**');
    analysis.risks.forEach(risk => lines.push(`- ${risk}`));
  }

  lines.push(
    '',
    '---',
    '',
    `**Charles Recommendation:** ${recommendation.action}`,
    `Confidence: ${recommendation.confidence}`,
    '',
    recommendation.reasoning
  );

  if (policyReference) {
    lines.push('', `Policy: ${policyReference}`);
  }

  return lines.join('\n');
};

/**
 * Target hit alert template
 */
export const TARGET_HIT_TEMPLATE = (data: TargetHitTemplateData): string => {
  const { position, currentPrice, targetPrice, gainPercent, recommendation, policyReference } = data;

  const lines = [
    `**TARGET HIT: ${position.ticker}**`,
    '',
    `Current Price: $${currentPrice.toFixed(2)}`,
    `Target Price: $${targetPrice.toFixed(2)}`,
    `Gain: +${gainPercent.toFixed(1)}%`,
    '',
    `Shares Held: ${position.shares}`,
    `Average Cost: $${position.averageCost.toFixed(2)}`,
    `Total Value: $${(position.shares * currentPrice).toFixed(2)}`,
    '',
    '---',
    '',
    `**Charles Recommendation:** ${recommendation.action}`,
    `Confidence: ${recommendation.confidence}`,
    '',
    recommendation.reasoning,
  ];

  if (policyReference) {
    lines.push('', `Policy: ${policyReference}`);
  }

  return lines.join('\n');
};

/**
 * Morning brief template
 */
export const BRIEF_TEMPLATE = (data: BriefTemplateData): string => {
  const { portfolioState, alerts, opportunities, date } = data;
  const { totalValue, cashBalance, dayChange, dayChangePercent, positions } = portfolioState;

  const changeSign = dayChange >= 0 ? '+' : '';
  const changeColor = dayChange >= 0 ? 'green' : 'red';

  const lines = [
    `**Morning Brief - ${date}**`,
    '',
    '**Portfolio Summary**',
    `Total Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `Cash: $${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    `Day Change: ${changeSign}$${Math.abs(dayChange).toFixed(2)} (${changeSign}${dayChangePercent.toFixed(2)}%)`,
    `Positions: ${positions.length}`,
    '',
  ];

  if (alerts.length > 0) {
    lines.push('**Alerts Requiring Attention**');
    alerts.forEach(alert => {
      const urgencyEmoji = getUrgencyIndicator(alert.urgency);
      lines.push(`${urgencyEmoji} [${alert.type}] ${alert.ticker}: ${alert.message}`);
    });
    lines.push('');
  }

  if (opportunities.length > 0) {
    lines.push('**Opportunities**');
    opportunities.forEach(opp => {
      const confIndicator = opp.confidence === 'high' ? '+++' : opp.confidence === 'medium' ? '++' : '+';
      lines.push(`${confIndicator} ${opp.ticker} @ $${opp.currentPrice.toFixed(2)} - ${opp.reason}`);
    });
    lines.push('');
  }

  if (alerts.length === 0 && opportunities.length === 0) {
    lines.push('No alerts or opportunities today. Portfolio is stable.');
  }

  return lines.join('\n');
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function getUrgencyIndicator(urgency: string): string {
  switch (urgency) {
    case 'IMMEDIATE':
      return '[!!!]';
    case 'TODAY':
      return '[!!]';
    case 'SOON':
      return '[!]';
    case 'MONITOR':
      return '[~]';
    default:
      return '[-]';
  }
}
