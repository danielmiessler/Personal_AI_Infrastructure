/**
 * Orchestration Module - Context Builder
 *
 * Builds formatted context strings for Claude prompts, combining
 * portfolio state, market data, alerts, and policy information.
 */

import type { Policy, PortfolioState } from 'jai-finance-core';
import type {
  ContextData,
  PortfolioContext,
  AlertContext,
  PolicyContext,
  QueuedEvent,
  EventType,
} from './types';
import type { AnalysisContext } from '../council/types';

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Builds formatted context strings for Claude prompts.
 *
 * Combines various data sources into coherent context that helps
 * Claude understand the current state and make better decisions.
 */
export class ContextBuilder {
  private readonly portfolio: PortfolioState | null;
  private readonly policy: Policy;

  /**
   * Create a new context builder.
   *
   * @param portfolio - Current portfolio state (can be null if not loaded)
   * @param policy - Investment policy
   */
  constructor(portfolio: PortfolioState | null, policy: Policy) {
    this.portfolio = portfolio;
    this.policy = policy;
  }

  /**
   * Build context for analyzing a specific ticker.
   *
   * @param ticker - Stock symbol being analyzed
   * @param analysisResult - Results from analysis pipeline
   * @returns Formatted context string
   */
  buildAnalysisContext(
    ticker: string,
    analysisResult: AnalysisContext
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Analysis Context for ${ticker}\n`);

    // Current position if held
    if (this.portfolio) {
      const position = this.portfolio.positions.find(
        (p) => p.ticker === ticker
      );
      if (position) {
        sections.push(this.formatPositionContext(position));
      } else {
        sections.push('## Current Position\nNo current position in this stock.\n');
      }
    }

    // Analysis results
    sections.push(this.formatAnalysisResults(analysisResult));

    // Portfolio summary
    if (this.portfolio) {
      sections.push(this.formatPortfolioSummary());
    }

    // Policy constraints
    sections.push(this.formatPolicyConstraints());

    return sections.join('\n');
  }

  /**
   * Build context for making a trading decision.
   *
   * @param action - Proposed action (BUY/SELL/HOLD)
   * @param amount - Dollar amount or share quantity
   * @param analysis - Analysis results
   * @returns Formatted context string
   */
  buildDecisionContext(
    action: string,
    amount: number | undefined,
    analysis: AnalysisContext
  ): string {
    const sections: string[] = [];

    // Header
    sections.push(`# Decision Context: ${action}\n`);

    // Proposed trade
    if (amount !== undefined) {
      sections.push(`## Proposed Trade\n- Action: ${action}\n- Amount: $${amount.toLocaleString()}\n`);
    } else {
      sections.push(`## Proposed Trade\n- Action: ${action}\n- Amount: Not specified\n`);
    }

    // Analysis summary
    sections.push(this.formatAnalysisResults(analysis));

    // Portfolio impact
    if (this.portfolio && amount !== undefined) {
      sections.push(this.formatPortfolioImpact(action, amount));
    }

    // Policy constraints
    sections.push(this.formatPolicyConstraints());

    return sections.join('\n');
  }

  /**
   * Build brief context for morning brief or summary.
   *
   * @param alerts - Pending alerts
   * @param opportunities - Current opportunities
   * @returns Formatted context string
   */
  buildBriefContext(
    alerts: QueuedEvent[],
    opportunities: Array<{ ticker: string; reason: string }>
  ): string {
    const sections: string[] = [];

    // Header with date
    sections.push(`# Morning Brief - ${new Date().toLocaleDateString()}\n`);

    // Portfolio summary
    if (this.portfolio) {
      sections.push(this.formatPortfolioSummary());
    }

    // Pending alerts
    if (alerts.length > 0) {
      sections.push(this.formatAlerts(alerts));
    } else {
      sections.push('## Alerts\nNo pending alerts.\n');
    }

    // Opportunities
    if (opportunities.length > 0) {
      sections.push(this.formatOpportunities(opportunities));
    }

    // Today's focus based on policy schedule
    sections.push(this.formatDailyTasks());

    return sections.join('\n');
  }

  /**
   * Build a ContextData object for structured context passing.
   *
   * @param alerts - Optional pending alerts
   * @returns Structured context data
   */
  buildStructuredContext(alerts?: QueuedEvent[]): ContextData {
    const context: ContextData = {};

    // Portfolio context
    if (this.portfolio) {
      context.portfolio = this.buildPortfolioContext();
    }

    // Market context (basic - would need market data integration for full)
    context.market = {
      status: this.getMarketStatus(),
      timestamp: new Date().toISOString(),
    };

    // Alert context
    if (alerts && alerts.length > 0) {
      context.alerts = this.buildAlertContext(alerts);
    }

    // Policy context
    context.policy = this.buildPolicyContext();

    return context;
  }

  // ===========================================================================
  // Private Formatting Methods
  // ===========================================================================

  private formatPositionContext(position: {
    ticker: string;
    shares: number;
    avgCostBasis: number;
    currentPrice?: number;
    unrealizedPnL?: number;
    unrealizedPnLPercent?: number;
    portfolioPercent?: number;
  }): string {
    const lines = [
      '## Current Position',
      `- Shares: ${position.shares}`,
      `- Avg Cost: $${position.avgCostBasis.toFixed(2)}`,
    ];

    if (position.currentPrice !== undefined) {
      lines.push(`- Current Price: $${position.currentPrice.toFixed(2)}`);
    }

    if (position.unrealizedPnL !== undefined) {
      const sign = position.unrealizedPnL >= 0 ? '+' : '';
      lines.push(`- Unrealized P/L: ${sign}$${position.unrealizedPnL.toFixed(2)}`);
    }

    if (position.unrealizedPnLPercent !== undefined) {
      const sign = position.unrealizedPnLPercent >= 0 ? '+' : '';
      lines.push(`- Return: ${sign}${position.unrealizedPnLPercent.toFixed(1)}%`);
    }

    if (position.portfolioPercent !== undefined) {
      lines.push(`- Portfolio Weight: ${position.portfolioPercent.toFixed(1)}%`);
    }

    return lines.join('\n') + '\n';
  }

  private formatAnalysisResults(analysis: AnalysisContext): string {
    const lines = ['## Analysis Results'];

    // F-Score
    if (analysis.fscore) {
      lines.push(`- F-Score: ${analysis.fscore.score}/${analysis.fscore.maxScore}`);
    }

    // Quality Score
    if (analysis.qualityScore) {
      lines.push(`- Quality: ${analysis.qualityScore.grade} (${analysis.qualityScore.score})`);
    }

    // Price info
    if (analysis.price) {
      lines.push(`- Current Price: $${analysis.price.current.toFixed(2)}`);
      if (analysis.price.targetBuy) {
        lines.push(`- Target Buy Price: $${analysis.price.targetBuy.toFixed(2)}`);
      }
    }

    // Momentum
    if (analysis.momentum) {
      lines.push(`- Momentum: ${analysis.momentum.signal} (strength: ${analysis.momentum.strength})`);
    }

    // Dealbreakers
    if (analysis.dealbreakers && analysis.dealbreakers.length > 0) {
      lines.push(`- DEALBREAKERS: ${analysis.dealbreakers.join(', ')}`);
    }

    // Yellow flags
    if (analysis.yellowFlags && analysis.yellowFlags.length > 0) {
      lines.push(`- Caution Flags: ${analysis.yellowFlags.join(', ')}`);
    }

    // Positive factors
    if (analysis.positiveFactors && analysis.positiveFactors.length > 0) {
      lines.push(`- Positives: ${analysis.positiveFactors.join(', ')}`);
    }

    return lines.join('\n') + '\n';
  }

  private formatPortfolioSummary(): string {
    if (!this.portfolio) return '';

    const s = this.portfolio.summary;
    const lines = [
      '## Portfolio Summary',
      `- Total Value: $${s.totalValue.toLocaleString()}`,
      `- Cash Available: $${s.cashAvailable.toLocaleString()}`,
      `- Positions: ${this.portfolio.positions.length}`,
    ];

    if (s.unrealizedPnL !== 0) {
      const sign = s.unrealizedPnL >= 0 ? '+' : '';
      lines.push(`- Unrealized P/L: ${sign}$${s.unrealizedPnL.toLocaleString()}`);
    }

    if (s.dayChange !== 0) {
      const sign = s.dayChange >= 0 ? '+' : '';
      lines.push(`- Today: ${sign}$${s.dayChange.toLocaleString()} (${sign}${s.dayChangePercent.toFixed(1)}%)`);
    }

    return lines.join('\n') + '\n';
  }

  private formatPortfolioImpact(action: string, amount: number): string {
    if (!this.portfolio) return '';

    const totalValue = this.portfolio.summary.totalValue;
    const percentOfPortfolio = (amount / totalValue) * 100;
    const maxAllowed = this.policy.constraints.max_single_position * 100;

    const lines = [
      '## Portfolio Impact',
      `- Trade Size: $${amount.toLocaleString()} (${percentOfPortfolio.toFixed(1)}% of portfolio)`,
      `- Max Position Allowed: ${maxAllowed.toFixed(0)}%`,
    ];

    if (action === 'BUY') {
      const cashAfter = this.portfolio.summary.cashAvailable - amount;
      const minCash = totalValue * this.policy.constraints.cash_reserve;
      lines.push(`- Cash After Trade: $${cashAfter.toLocaleString()}`);
      lines.push(`- Min Cash Required: $${minCash.toLocaleString()}`);

      if (cashAfter < minCash) {
        lines.push('- WARNING: Would violate cash reserve requirement');
      }
    }

    return lines.join('\n') + '\n';
  }

  private formatPolicyConstraints(): string {
    const c = this.policy.constraints;
    return `## Policy Constraints
- Max Position Size: ${(c.max_single_position * 100).toFixed(0)}%
- Max Sector Concentration: ${(c.max_sector_concentration * 100).toFixed(0)}%
- Cash Reserve: ${(c.cash_reserve * 100).toFixed(0)}%
- Penny Stock Limit: ${(c.penny_stock_max * 100).toFixed(0)}%
${c.single_stock_stop_loss ? `- Stop Loss: ${(c.single_stock_stop_loss * 100).toFixed(0)}%` : ''}
`;
  }

  private formatAlerts(alerts: QueuedEvent[]): string {
    const lines = ['## Pending Alerts'];

    // Group by type
    const byType = alerts.reduce((acc, alert) => {
      if (!acc[alert.type]) acc[alert.type] = [];
      acc[alert.type].push(alert);
      return acc;
    }, {} as Record<EventType, QueuedEvent[]>);

    for (const [type, typeAlerts] of Object.entries(byType)) {
      lines.push(`\n### ${type} (${typeAlerts.length})`);
      for (const alert of typeAlerts.slice(0, 5)) {
        lines.push(`- ${alert.ticker}: ${alert.data.trigger || 'Alert triggered'}`);
      }
      if (typeAlerts.length > 5) {
        lines.push(`- ... and ${typeAlerts.length - 5} more`);
      }
    }

    return lines.join('\n') + '\n';
  }

  private formatOpportunities(
    opportunities: Array<{ ticker: string; reason: string }>
  ): string {
    const lines = ['## Opportunities'];

    for (const opp of opportunities.slice(0, 10)) {
      lines.push(`- ${opp.ticker}: ${opp.reason}`);
    }

    if (opportunities.length > 10) {
      lines.push(`- ... and ${opportunities.length - 10} more`);
    }

    return lines.join('\n') + '\n';
  }

  private formatDailyTasks(): string {
    const tasks = this.policy.schedule.daily;
    if (!tasks || tasks.length === 0) return '';

    return `## Daily Tasks
${tasks.map((t) => `- ${t}`).join('\n')}
`;
  }

  // ===========================================================================
  // Private Context Building Methods
  // ===========================================================================

  private buildPortfolioContext(): PortfolioContext {
    if (!this.portfolio) {
      return {
        totalValue: 0,
        cashAvailable: 0,
        positionCount: 0,
      };
    }

    const topPositions = this.portfolio.positions
      .sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))
      .slice(0, 5)
      .map((p) => ({
        ticker: p.ticker,
        value: p.marketValue || 0,
        percent: p.portfolioPercent || 0,
      }));

    return {
      totalValue: this.portfolio.summary.totalValue,
      cashAvailable: this.portfolio.summary.cashAvailable,
      positionCount: this.portfolio.positions.length,
      topPositions,
    };
  }

  private buildAlertContext(alerts: QueuedEvent[]): AlertContext {
    const counts = alerts.reduce(
      (acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      },
      {} as Record<EventType, number>
    );

    // Find most urgent (critical > high > normal > low)
    const priorityOrder: QueuedEvent['priority'][] = ['critical', 'high', 'normal', 'low'];
    let mostUrgent: QueuedEvent | undefined;
    for (const priority of priorityOrder) {
      mostUrgent = alerts.find((a) => a.priority === priority);
      if (mostUrgent) break;
    }

    return {
      counts,
      mostUrgent,
    };
  }

  private buildPolicyContext(): PolicyContext {
    const c = this.policy.constraints;
    return {
      maxPositionPercent: c.max_single_position,
      maxSectorPercent: c.max_sector_concentration,
      minCashReserve: c.cash_reserve,
      keyRules: this.policy.rules.entry.slice(0, 3).map((r) => r.name),
    };
  }

  private getMarketStatus(): 'open' | 'closed' | 'pre-market' | 'after-hours' {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const day = now.getDay();

    // Weekend
    if (day === 0 || day === 6) return 'closed';

    // Market hours in ET (simplified - doesn't account for holidays)
    const timeMinutes = hour * 60 + minute;

    if (timeMinutes < 4 * 60) return 'closed'; // Before 4 AM
    if (timeMinutes < 9.5 * 60) return 'pre-market'; // 4 AM - 9:30 AM
    if (timeMinutes < 16 * 60) return 'open'; // 9:30 AM - 4 PM
    if (timeMinutes < 20 * 60) return 'after-hours'; // 4 PM - 8 PM
    return 'closed'; // After 8 PM
  }
}
