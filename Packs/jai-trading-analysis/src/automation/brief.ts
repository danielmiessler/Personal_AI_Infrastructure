/**
 * Morning Brief Generator
 *
 * Generates comprehensive morning briefs summarizing portfolio status,
 * alerts, opportunities, and market overview.
 */

import type {
  MorningBriefConfig,
  MorningBrief,
  BriefPosition,
  BriefAlert,
  BriefOpportunity,
  MarketOverview,
  AutomationDataProvider,
} from './types';
import type { PortfolioState, PositionWithValue, Policy } from 'jai-finance-core';

// =============================================================================
// Constants
// =============================================================================

const INDEX_TICKERS = {
  sp500: 'SPY',
  nasdaq: 'QQQ',
  dow: 'DIA',
  vix: 'VIX',
} as const;

// =============================================================================
// Morning Brief Generation
// =============================================================================

/**
 * Generate a comprehensive morning brief.
 *
 * @param config - Brief configuration
 * @param dataProvider - Market data provider
 * @param portfolio - Current portfolio state
 * @param policy - Investment policy (optional, for target/stop calculations)
 * @returns Complete morning brief
 *
 * @example
 * ```ts
 * const brief = await generateMorningBrief(
 *   { portfolioPath: './positions.json', policyPath: './policy.yaml' },
 *   yahooClient,
 *   portfolioState
 * );
 *
 * console.log(brief.summary);
 * console.log(`Alerts: ${brief.alerts.length}`);
 * ```
 */
export async function generateMorningBrief(
  config: MorningBriefConfig,
  dataProvider: AutomationDataProvider,
  portfolio: PortfolioState,
  policy?: Policy
): Promise<MorningBrief> {
  const now = new Date();
  const positions: BriefPosition[] = [];
  const alerts: BriefAlert[] = [];
  const opportunities: BriefOpportunity[] = [];

  // Default policy values
  const stopLossPercent = policy?.constraints?.single_stock_stop_loss ?? 0.08;
  const targetPercent = policy?.objectives?.target_return ?? 0.20;

  // ---------------------------------------------------------------------------
  // Process Positions
  // ---------------------------------------------------------------------------

  for (const pos of portfolio.positions) {
    const stopLossPrice = pos.avgCostBasis * (1 - stopLossPercent);
    const targetPrice = pos.avgCostBasis * (1 + targetPercent);

    const stopLossDistance = ((pos.currentPrice - stopLossPrice) / pos.currentPrice) * 100;
    const targetDistance = ((targetPrice - pos.currentPrice) / pos.currentPrice) * 100;

    const posAlerts: string[] = [];

    // Check for stop loss proximity
    if (pos.unrealizedPnLPercent <= -stopLossPercent * 100) {
      posAlerts.push('STOP LOSS HIT');
      alerts.push({
        type: 'STOP_LOSS_HIT',
        ticker: pos.ticker,
        message: `${pos.ticker} has hit stop loss at ${pos.unrealizedPnLPercent.toFixed(1)}% loss`,
        severity: 'critical',
        action: 'Consider selling immediately',
      });
    } else if (stopLossDistance < 3) {
      posAlerts.push('Near stop loss');
      alerts.push({
        type: 'STOP_LOSS_WARNING',
        ticker: pos.ticker,
        message: `${pos.ticker} is ${stopLossDistance.toFixed(1)}% from stop loss`,
        severity: 'warning',
        action: 'Monitor closely',
      });
    }

    // Check for target hit
    if (pos.unrealizedPnLPercent >= targetPercent * 100) {
      posAlerts.push('TARGET HIT');
      alerts.push({
        type: 'TARGET_HIT',
        ticker: pos.ticker,
        message: `${pos.ticker} has hit target at +${pos.unrealizedPnLPercent.toFixed(1)}%`,
        severity: 'info',
        action: 'Consider taking profits',
      });
    }

    positions.push({
      ticker: pos.ticker,
      shares: pos.shares,
      currentPrice: pos.currentPrice,
      costBasis: pos.avgCostBasis,
      marketValue: pos.marketValue,
      unrealizedPnL: pos.unrealizedPnL,
      unrealizedPnLPercent: pos.unrealizedPnLPercent,
      stopLossDistance,
      targetDistance,
      alerts: posAlerts,
    });
  }

  // ---------------------------------------------------------------------------
  // Check Compliance
  // ---------------------------------------------------------------------------

  if (portfolio.compliance.maxPositionViolation) {
    alerts.push({
      type: 'POLICY_VIOLATION',
      ticker: 'PORTFOLIO',
      message: 'Position size exceeds maximum allowed',
      severity: 'warning',
      action: 'Consider rebalancing',
    });
  }

  if (portfolio.compliance.sectorConcentrationViolation) {
    alerts.push({
      type: 'POLICY_VIOLATION',
      ticker: 'PORTFOLIO',
      message: 'Sector concentration exceeds maximum allowed',
      severity: 'warning',
      action: 'Consider diversifying',
    });
  }

  if (portfolio.compliance.cashReserveViolation) {
    alerts.push({
      type: 'POLICY_VIOLATION',
      ticker: 'PORTFOLIO',
      message: 'Cash reserve below minimum',
      severity: 'warning',
      action: 'Consider raising cash',
    });
  }

  // ---------------------------------------------------------------------------
  // Check Watchlist for Opportunities
  // ---------------------------------------------------------------------------

  if (config.includeOpportunities && config.watchlist?.length) {
    try {
      const quotes = await dataProvider.getQuotes(config.watchlist);

      for (const [ticker, quote] of quotes) {
        // Simple opportunity detection: near 52-week low or significant pullback
        // In a real implementation, this would use the timing module's buyPrice calculation
        const distanceFromLow = quote.changePercent; // Simplified

        if (distanceFromLow <= -10) {
          opportunities.push({
            ticker,
            currentPrice: quote.price,
            buyPrice: quote.price * 0.95, // Simplified target
            distanceFromBuy: 5,
            reason: `Down ${Math.abs(distanceFromLow).toFixed(1)}% - potential buying opportunity`,
            confidence: distanceFromLow <= -20 ? 'high' : 'medium',
          });
        }
      }
    } catch (error) {
      console.error('[Brief] Error checking watchlist:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Get Market Overview
  // ---------------------------------------------------------------------------

  let marketOverview: MarketOverview | undefined;

  if (config.includeMarketOverview !== false) {
    try {
      const [sp500, nasdaq, dow, vix] = await Promise.all([
        dataProvider.getIndexData('SPY'),
        dataProvider.getIndexData('QQQ'),
        dataProvider.getIndexData('DIA'),
        dataProvider.getIndexData('VIX'),
      ]);

      // Determine overall sentiment
      const avgChange = (sp500.changePercent + nasdaq.changePercent + dow.changePercent) / 3;
      let sentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';
      if (avgChange > 0.5) sentiment = 'bullish';
      else if (avgChange < -0.5) sentiment = 'bearish';

      // High VIX is bearish
      if (vix.price > 25) sentiment = 'bearish';

      marketOverview = {
        sp500: {
          price: sp500.price,
          change: sp500.price * (sp500.changePercent / 100),
          changePercent: sp500.changePercent,
        },
        nasdaq: {
          price: nasdaq.price,
          change: nasdaq.price * (nasdaq.changePercent / 100),
          changePercent: nasdaq.changePercent,
        },
        dow: {
          price: dow.price,
          change: dow.price * (dow.changePercent / 100),
          changePercent: dow.changePercent,
        },
        vix: {
          value: vix.price,
          change: vix.changePercent,
        },
        sentiment,
      };
    } catch (error) {
      console.error('[Brief] Error getting market overview:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // Generate Summary
  // ---------------------------------------------------------------------------

  const summary = generateSummary(portfolio, alerts, opportunities, marketOverview);

  // ---------------------------------------------------------------------------
  // Return Complete Brief
  // ---------------------------------------------------------------------------

  return {
    date: now.toISOString().split('T')[0],
    summary,
    positions,
    alerts,
    opportunities,
    marketOverview,
    portfolioSummary: {
      totalValue: portfolio.summary.totalValue,
      totalCost: portfolio.summary.totalCost,
      unrealizedPnL: portfolio.summary.unrealizedPnL,
      unrealizedPnLPercent: portfolio.summary.unrealizedPnLPercent,
      cashAvailable: portfolio.summary.cashAvailable,
      dayChange: portfolio.summary.dayChange,
      dayChangePercent: portfolio.summary.dayChangePercent,
    },
    generatedAt: now.toISOString(),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a human-readable summary of the brief.
 */
function generateSummary(
  portfolio: PortfolioState,
  alerts: BriefAlert[],
  opportunities: BriefOpportunity[],
  marketOverview?: MarketOverview
): string {
  const parts: string[] = [];

  // Portfolio status
  const pnlDirection = portfolio.summary.unrealizedPnL >= 0 ? 'up' : 'down';
  const pnlAmount = Math.abs(portfolio.summary.unrealizedPnL).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  parts.push(
    `Portfolio is ${pnlDirection} ${pnlAmount} (${portfolio.summary.unrealizedPnLPercent.toFixed(1)}%).`
  );

  // Day change
  if (portfolio.summary.dayChange !== 0) {
    const dayDirection = portfolio.summary.dayChange >= 0 ? 'up' : 'down';
    parts.push(
      `${dayDirection.charAt(0).toUpperCase() + dayDirection.slice(1)} $${Math.abs(portfolio.summary.dayChange).toFixed(2)} today.`
    );
  }

  // Critical alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  if (criticalAlerts.length > 0) {
    parts.push(`${criticalAlerts.length} CRITICAL alert(s) requiring attention.`);
  }

  // Market sentiment
  if (marketOverview) {
    const sentimentText =
      marketOverview.sentiment === 'bullish'
        ? 'Markets are up'
        : marketOverview.sentiment === 'bearish'
          ? 'Markets are down'
          : 'Markets are flat';
    parts.push(sentimentText + '.');
  }

  // Opportunities
  if (opportunities.length > 0) {
    parts.push(`${opportunities.length} potential buying opportunity(ies) on watchlist.`);
  }

  return parts.join(' ');
}

/**
 * Format a morning brief for console output.
 */
export function formatBriefForConsole(brief: MorningBrief): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('='.repeat(60));
  lines.push(`  MORNING BRIEF - ${brief.date}`);
  lines.push('='.repeat(60));
  lines.push('');

  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(40));
  lines.push(brief.summary);
  lines.push('');

  // Portfolio Summary
  lines.push('PORTFOLIO');
  lines.push('-'.repeat(40));
  lines.push(`  Total Value:    $${brief.portfolioSummary.totalValue.toLocaleString()}`);
  lines.push(`  Total Cost:     $${brief.portfolioSummary.totalCost.toLocaleString()}`);
  lines.push(`  Unrealized P&L: $${brief.portfolioSummary.unrealizedPnL.toLocaleString()} (${brief.portfolioSummary.unrealizedPnLPercent.toFixed(1)}%)`);
  lines.push(`  Cash Available: $${brief.portfolioSummary.cashAvailable.toLocaleString()}`);
  lines.push(`  Day Change:     $${brief.portfolioSummary.dayChange.toFixed(2)} (${brief.portfolioSummary.dayChangePercent.toFixed(2)}%)`);
  lines.push('');

  // Alerts
  if (brief.alerts.length > 0) {
    lines.push('ALERTS');
    lines.push('-'.repeat(40));
    for (const alert of brief.alerts) {
      const prefix =
        alert.severity === 'critical' ? '[!]' :
        alert.severity === 'warning' ? '[*]' : '[ ]';
      lines.push(`  ${prefix} ${alert.ticker}: ${alert.message}`);
      if (alert.action) {
        lines.push(`      Action: ${alert.action}`);
      }
    }
    lines.push('');
  }

  // Positions
  lines.push('POSITIONS');
  lines.push('-'.repeat(40));
  lines.push('  Ticker   Price      Value      P&L');
  lines.push('  ' + '-'.repeat(36));
  for (const pos of brief.positions) {
    const pnlSign = pos.unrealizedPnL >= 0 ? '+' : '';
    lines.push(
      `  ${pos.ticker.padEnd(8)} $${pos.currentPrice.toFixed(2).padStart(7)}  $${pos.marketValue.toLocaleString().padStart(8)}  ${pnlSign}${pos.unrealizedPnLPercent.toFixed(1)}%`
    );
  }
  lines.push('');

  // Market Overview
  if (brief.marketOverview) {
    lines.push('MARKET OVERVIEW');
    lines.push('-'.repeat(40));
    const mo = brief.marketOverview;
    const formatIndex = (name: string, data: { price: number; changePercent: number }) => {
      const sign = data.changePercent >= 0 ? '+' : '';
      return `  ${name.padEnd(8)} $${data.price.toFixed(2).padStart(8)}  ${sign}${data.changePercent.toFixed(2)}%`;
    };
    lines.push(formatIndex('S&P 500', mo.sp500));
    lines.push(formatIndex('NASDAQ', mo.nasdaq));
    lines.push(formatIndex('DOW', mo.dow));
    lines.push(`  ${'VIX'.padEnd(8)} ${mo.vix.value.toFixed(2).padStart(9)}  ${mo.vix.change >= 0 ? '+' : ''}${mo.vix.change.toFixed(2)}%`);
    lines.push(`  Sentiment: ${mo.sentiment.toUpperCase()}`);
    lines.push('');
  }

  // Opportunities
  if (brief.opportunities.length > 0) {
    lines.push('OPPORTUNITIES');
    lines.push('-'.repeat(40));
    for (const opp of brief.opportunities) {
      lines.push(`  ${opp.ticker}: $${opp.currentPrice.toFixed(2)} - ${opp.reason}`);
      lines.push(`      Confidence: ${opp.confidence}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push(`Generated: ${brief.generatedAt}`);
  lines.push('');

  return lines.join('\n');
}
