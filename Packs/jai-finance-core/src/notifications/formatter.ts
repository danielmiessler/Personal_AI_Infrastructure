/**
 * Notification Formatter for JAI Finance Core
 *
 * Formats financial events into Discord-ready notification payloads.
 */

import type {
  DiscordEmbed,
  NotificationAction,
  Position,
  Policy,
  Recommendation,
  BuyAnalysis,
  PortfolioState,
  Alert,
  Opportunity,
} from './types';

import {
  STOP_LOSS_TEMPLATE,
  BUY_SIGNAL_TEMPLATE,
  TARGET_HIT_TEMPLATE,
  BRIEF_TEMPLATE,
} from './templates';

// -----------------------------------------------------------------------------
// Color Constants
// -----------------------------------------------------------------------------

/** Colors for Discord embeds */
export const EMBED_COLORS = {
  RED: 0xff0000,      // Sell alerts, stop losses
  GREEN: 0x00ff00,    // Buy signals, positive
  YELLOW: 0xffff00,   // Warnings, attention needed
  BLUE: 0x0099ff,     // Info, briefs
} as const;

// -----------------------------------------------------------------------------
// Formatted Payload Interface
// -----------------------------------------------------------------------------

export interface FormattedPayload {
  content?: string;
  embeds: DiscordEmbed[];
  actions: NotificationAction[];
}

// -----------------------------------------------------------------------------
// NotificationFormatter Class
// -----------------------------------------------------------------------------

/**
 * Formats financial events into notification payloads
 */
export class NotificationFormatter {
  private policy: Policy;

  constructor(policy: Policy) {
    this.policy = policy;
  }

  /**
   * Format a stop loss alert
   */
  formatStopLossAlert(
    position: Position,
    currentPrice: number,
    recommendation: Recommendation
  ): FormattedPayload {
    const stopLossPrice = position.stopLossPrice ?? this.calculateStopLoss(position.averageCost);
    const lossPercent = ((position.averageCost - currentPrice) / position.averageCost) * 100;
    const policyRule = this.findPolicyRule(recommendation.policyRuleId);

    const description = STOP_LOSS_TEMPLATE({
      position,
      currentPrice,
      stopLossPrice,
      lossPercent,
      recommendation,
      policyReference: policyRule?.name,
    });

    const embed: DiscordEmbed = {
      title: `STOP LOSS: ${position.ticker}`,
      description,
      color: EMBED_COLORS.RED,
      fields: [
        { name: 'Current Price', value: `$${currentPrice.toFixed(2)}`, inline: true },
        { name: 'Stop Loss', value: `$${stopLossPrice.toFixed(2)}`, inline: true },
        { name: 'Loss', value: `${lossPercent.toFixed(1)}%`, inline: true },
        { name: 'Shares', value: position.shares.toString(), inline: true },
        { name: 'Avg Cost', value: `$${position.averageCost.toFixed(2)}`, inline: true },
        { name: 'Recommendation', value: recommendation.action, inline: true },
      ],
      footer: policyRule ? { text: `Policy: ${policyRule.name}` } : undefined,
      timestamp: new Date().toISOString(),
    };

    const actions: NotificationAction[] = [
      { id: `sell_${position.ticker}`, label: 'Sell Now', style: 'danger' },
      { id: `hold_${position.ticker}`, label: 'Hold', style: 'secondary' },
      { id: `review_${position.ticker}`, label: 'Review Position', style: 'primary' },
    ];

    return {
      content: `Stop loss triggered for **${position.ticker}**`,
      embeds: [embed],
      actions,
    };
  }

  /**
   * Format a buy signal
   */
  formatBuySignal(
    ticker: string,
    currentPrice: number,
    buyPrice: number,
    analysis: BuyAnalysis,
    recommendation: Recommendation
  ): FormattedPayload {
    const policyRule = this.findPolicyRule(recommendation.policyRuleId);
    const discount = ((buyPrice - currentPrice) / buyPrice) * 100;

    const description = BUY_SIGNAL_TEMPLATE({
      ticker,
      currentPrice,
      buyPrice,
      analysis,
      recommendation,
      policyReference: policyRule?.name,
    });

    const fields = [
      { name: 'Current Price', value: `$${currentPrice.toFixed(2)}`, inline: true },
      { name: 'Target Entry', value: `$${buyPrice.toFixed(2)}`, inline: true },
      { name: 'Discount', value: `${discount.toFixed(1)}%`, inline: true },
      { name: 'Fundamentals', value: analysis.fundamentals, inline: false },
      { name: 'Technicals', value: analysis.technicals, inline: false },
    ];

    if (analysis.catalyst) {
      fields.push({ name: 'Catalyst', value: analysis.catalyst, inline: false });
    }

    if (analysis.risks.length > 0) {
      fields.push({ name: 'Risks', value: analysis.risks.join('\n'), inline: false });
    }

    fields.push({
      name: 'Charles Says',
      value: `**${recommendation.action}** (${recommendation.confidence})\n${recommendation.reasoning}`,
      inline: false,
    });

    const embed: DiscordEmbed = {
      title: `BUY SIGNAL: ${ticker}`,
      color: EMBED_COLORS.GREEN,
      fields,
      footer: policyRule ? { text: `Policy: ${policyRule.name}` } : undefined,
      timestamp: new Date().toISOString(),
    };

    const actions: NotificationAction[] = [
      { id: `buy_${ticker}`, label: 'Buy Now', style: 'success' },
      { id: `watch_${ticker}`, label: 'Add to Watchlist', style: 'primary' },
      { id: `dismiss_${ticker}`, label: 'Dismiss', style: 'secondary' },
    ];

    return {
      content: `Buy signal detected for **${ticker}**`,
      embeds: [embed],
      actions,
    };
  }

  /**
   * Format a target hit alert
   */
  formatTargetHitAlert(
    position: Position,
    currentPrice: number,
    targetPrice: number
  ): FormattedPayload {
    const gainPercent = ((currentPrice - position.averageCost) / position.averageCost) * 100;
    const totalValue = position.shares * currentPrice;
    const totalGain = (currentPrice - position.averageCost) * position.shares;

    const recommendation: Recommendation = {
      action: 'REVIEW',
      confidence: 'medium',
      reasoning: `Position has reached target price. Consider taking profits or adjusting target.`,
    };

    const description = TARGET_HIT_TEMPLATE({
      position,
      currentPrice,
      targetPrice,
      gainPercent,
      recommendation,
    });

    const embed: DiscordEmbed = {
      title: `TARGET HIT: ${position.ticker}`,
      description,
      color: EMBED_COLORS.GREEN,
      fields: [
        { name: 'Current Price', value: `$${currentPrice.toFixed(2)}`, inline: true },
        { name: 'Target Price', value: `$${targetPrice.toFixed(2)}`, inline: true },
        { name: 'Gain', value: `+${gainPercent.toFixed(1)}%`, inline: true },
        { name: 'Shares', value: position.shares.toString(), inline: true },
        { name: 'Total Value', value: `$${totalValue.toFixed(2)}`, inline: true },
        { name: 'Total Gain', value: `+$${totalGain.toFixed(2)}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    const actions: NotificationAction[] = [
      { id: `sell_${position.ticker}`, label: 'Take Profits', style: 'success' },
      { id: `partial_${position.ticker}`, label: 'Sell Half', style: 'primary' },
      { id: `raise_target_${position.ticker}`, label: 'Raise Target', style: 'secondary' },
    ];

    return {
      content: `Target hit for **${position.ticker}** - up ${gainPercent.toFixed(1)}%!`,
      embeds: [embed],
      actions,
    };
  }

  /**
   * Format a morning brief
   */
  formatMorningBrief(
    portfolioState: PortfolioState,
    alerts: Alert[],
    opportunities: Opportunity[]
  ): FormattedPayload {
    const date = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const description = BRIEF_TEMPLATE({
      portfolioState,
      alerts,
      opportunities,
      date,
    });

    const { totalValue, cashBalance, dayChange, dayChangePercent, positions } = portfolioState;
    const changeSign = dayChange >= 0 ? '+' : '';

    const fields = [
      { name: 'Total Value', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, inline: true },
      { name: 'Cash', value: `$${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, inline: true },
      { name: 'Day Change', value: `${changeSign}$${Math.abs(dayChange).toFixed(2)} (${changeSign}${dayChangePercent.toFixed(2)}%)`, inline: true },
      { name: 'Positions', value: positions.length.toString(), inline: true },
    ];

    if (alerts.length > 0) {
      const urgentCount = alerts.filter(a => a.urgency === 'IMMEDIATE' || a.urgency === 'TODAY').length;
      fields.push({
        name: 'Alerts',
        value: `${alerts.length} total (${urgentCount} urgent)`,
        inline: true,
      });
    }

    if (opportunities.length > 0) {
      const highConfCount = opportunities.filter(o => o.confidence === 'high').length;
      fields.push({
        name: 'Opportunities',
        value: `${opportunities.length} found (${highConfCount} high confidence)`,
        inline: true,
      });
    }

    // Determine embed color based on day performance and alerts
    let color: number = EMBED_COLORS.BLUE;
    if (alerts.some(a => a.urgency === 'IMMEDIATE')) {
      color = EMBED_COLORS.RED;
    } else if (dayChangePercent < -2) {
      color = EMBED_COLORS.YELLOW;
    } else if (dayChangePercent > 2) {
      color = EMBED_COLORS.GREEN;
    }

    const embed: DiscordEmbed = {
      title: `Morning Brief - ${new Date().toLocaleDateString()}`,
      description,
      color,
      fields,
      footer: { text: 'JAI Investment System' },
      timestamp: new Date().toISOString(),
    };

    const actions: NotificationAction[] = [
      { id: 'view_portfolio', label: 'View Portfolio', style: 'primary' },
      { id: 'view_alerts', label: 'View All Alerts', style: 'secondary' },
    ];

    if (opportunities.length > 0) {
      actions.push({ id: 'view_opportunities', label: 'View Opportunities', style: 'success' });
    }

    return {
      embeds: [embed],
      actions,
    };
  }

  // ---------------------------------------------------------------------------
  // Private Helper Methods
  // ---------------------------------------------------------------------------

  /**
   * Calculate default stop loss based on policy
   */
  private calculateStopLoss(averageCost: number): number {
    const stopLossPercent = this.policy.stopLossPercent ?? 10;
    return averageCost * (1 - stopLossPercent / 100);
  }

  /**
   * Find a policy rule by ID
   */
  private findPolicyRule(ruleId?: string) {
    if (!ruleId) return undefined;
    return this.policy.rules.find(r => r.id === ruleId);
  }
}
