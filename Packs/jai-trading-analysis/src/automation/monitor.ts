/**
 * Market Monitor
 *
 * Monitors portfolio positions for stop losses, price targets, and significant moves.
 */

import type {
  MonitorConfig,
  MonitorAlert,
  MonitorAlertType,
  MonitorAlertData,
  AlertNotifier,
  AutomationDataProvider,
} from './types';
import type { Position, PositionWithValue } from 'jai-finance-core';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CHECK_INTERVAL = 60_000; // 1 minute
const DEFAULT_STOP_LOSS_THRESHOLD = 0.08; // 8%
const DEFAULT_SIGNIFICANT_MOVE = 0.05; // 5%

// =============================================================================
// Market Monitor Class
// =============================================================================

/**
 * Monitors market positions and generates alerts for important events.
 *
 * @example
 * ```ts
 * const monitor = new MarketMonitor(
 *   { tickers: ['AAPL', 'MSFT'], stopLossThreshold: 0.08 },
 *   dataProvider,
 *   discordNotifier
 * );
 *
 * monitor.onAlert((alert) => {
 *   console.log(`Alert: ${alert.message}`);
 * });
 *
 * monitor.start();
 * ```
 */
export class MarketMonitor {
  private config: Required<Omit<MonitorConfig, 'alertWebhook'>> & Pick<MonitorConfig, 'alertWebhook'>;
  private dataProvider: AutomationDataProvider;
  private notifier?: AlertNotifier;
  private intervalId?: ReturnType<typeof setInterval>;
  private isRunning = false;
  private alertCallbacks: Array<(alert: MonitorAlert) => void> = [];
  private lastPrices: Map<string, number> = new Map();
  private positions: Map<string, PositionWithValue> = new Map();

  constructor(
    config: MonitorConfig,
    dataProvider: AutomationDataProvider,
    notifier?: AlertNotifier
  ) {
    this.config = {
      tickers: config.tickers,
      checkInterval: config.checkInterval ?? DEFAULT_CHECK_INTERVAL,
      stopLossThreshold: config.stopLossThreshold ?? DEFAULT_STOP_LOSS_THRESHOLD,
      targetThreshold: config.targetThreshold ?? 0.20,
      significantMoveThreshold: config.significantMoveThreshold ?? DEFAULT_SIGNIFICANT_MOVE,
      alertWebhook: config.alertWebhook,
    };
    this.dataProvider = dataProvider;
    this.notifier = notifier;
  }

  // ---------------------------------------------------------------------------
  // Public Methods
  // ---------------------------------------------------------------------------

  /**
   * Start monitoring positions.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Run immediately, then on interval
    this.runCheck();

    this.intervalId = setInterval(() => {
      this.runCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
  }

  /**
   * Check positions manually (also called on interval).
   */
  async checkPositions(): Promise<MonitorAlert[]> {
    const alerts: MonitorAlert[] = [];

    try {
      const quotes = await this.dataProvider.getQuotes(this.config.tickers);

      for (const [ticker, quote] of quotes) {
        const position = this.positions.get(ticker);
        const lastPrice = this.lastPrices.get(ticker);

        // Check for significant moves from last check
        if (lastPrice !== undefined) {
          const changeFromLast = (quote.price - lastPrice) / lastPrice;

          if (changeFromLast <= -this.config.significantMoveThreshold) {
            alerts.push(this.createAlert('SIGNIFICANT_DROP', ticker, {
              currentPrice: quote.price,
              previousPrice: lastPrice,
              change: quote.price - lastPrice,
              changePercent: changeFromLast * 100,
            }));
          } else if (changeFromLast >= this.config.significantMoveThreshold) {
            alerts.push(this.createAlert('SIGNIFICANT_GAIN', ticker, {
              currentPrice: quote.price,
              previousPrice: lastPrice,
              change: quote.price - lastPrice,
              changePercent: changeFromLast * 100,
            }));
          }
        }

        // Check for volume spikes
        if (quote.avgVolume && quote.volume > quote.avgVolume * 2) {
          alerts.push(this.createAlert('VOLUME_SPIKE', ticker, {
            currentPrice: quote.price,
            volume: quote.volume,
            avgVolume: quote.avgVolume,
          }));
        }

        // Position-specific checks
        if (position) {
          const unrealizedPnLPercent = (quote.price - position.avgCostBasis) / position.avgCostBasis;

          // Check stop loss
          if (unrealizedPnLPercent <= -this.config.stopLossThreshold) {
            alerts.push(this.createAlert('STOP_LOSS_HIT', ticker, {
              currentPrice: quote.price,
              costBasis: position.avgCostBasis,
              unrealizedPnL: (quote.price - position.avgCostBasis) * position.shares,
              changePercent: unrealizedPnLPercent * 100,
              stopLossPrice: position.avgCostBasis * (1 - this.config.stopLossThreshold),
            }));
          } else if (unrealizedPnLPercent <= -(this.config.stopLossThreshold * 0.75)) {
            // Warning at 75% of stop loss threshold
            alerts.push(this.createAlert('STOP_LOSS_WARNING', ticker, {
              currentPrice: quote.price,
              costBasis: position.avgCostBasis,
              unrealizedPnL: (quote.price - position.avgCostBasis) * position.shares,
              changePercent: unrealizedPnLPercent * 100,
              stopLossPrice: position.avgCostBasis * (1 - this.config.stopLossThreshold),
            }));
          }

          // Check target hit
          if (unrealizedPnLPercent >= this.config.targetThreshold) {
            alerts.push(this.createAlert('TARGET_HIT', ticker, {
              currentPrice: quote.price,
              costBasis: position.avgCostBasis,
              unrealizedPnL: (quote.price - position.avgCostBasis) * position.shares,
              changePercent: unrealizedPnLPercent * 100,
              targetPrice: position.avgCostBasis * (1 + this.config.targetThreshold),
            }));
          }
        }

        // Update last price for next check
        this.lastPrices.set(ticker, quote.price);
      }
    } catch (error) {
      console.error('[MarketMonitor] Error checking positions:', error);
    }

    return alerts;
  }

  /**
   * Register a callback for alerts.
   */
  onAlert(callback: (alert: MonitorAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Update tracked positions.
   */
  setPositions(positions: PositionWithValue[]): void {
    this.positions.clear();
    for (const pos of positions) {
      this.positions.set(pos.ticker, pos);
    }
  }

  /**
   * Add a ticker to monitor.
   */
  addTicker(ticker: string): void {
    if (!this.config.tickers.includes(ticker)) {
      this.config.tickers.push(ticker);
    }
  }

  /**
   * Remove a ticker from monitoring.
   */
  removeTicker(ticker: string): void {
    const index = this.config.tickers.indexOf(ticker);
    if (index !== -1) {
      this.config.tickers.splice(index, 1);
      this.lastPrices.delete(ticker);
      this.positions.delete(ticker);
    }
  }

  /**
   * Get current monitoring status.
   */
  getStatus(): { isRunning: boolean; tickers: string[]; lastCheck?: string } {
    return {
      isRunning: this.isRunning,
      tickers: [...this.config.tickers],
    };
  }

  // ---------------------------------------------------------------------------
  // Private Methods
  // ---------------------------------------------------------------------------

  private async runCheck(): Promise<void> {
    const alerts = await this.checkPositions();

    // Notify callbacks
    for (const alert of alerts) {
      for (const callback of this.alertCallbacks) {
        try {
          callback(alert);
        } catch (error) {
          console.error('[MarketMonitor] Error in alert callback:', error);
        }
      }
    }

    // Send to notifier if configured
    if (this.notifier && alerts.length > 0) {
      try {
        await this.notifier.notifyBatch(alerts);
      } catch (error) {
        console.error('[MarketMonitor] Error sending notifications:', error);
      }
    }
  }

  private createAlert(
    type: MonitorAlertType,
    ticker: string,
    data: MonitorAlertData
  ): MonitorAlert {
    const severity = this.getSeverity(type);
    const message = this.formatMessage(type, ticker, data);

    return {
      type,
      ticker,
      message,
      data,
      timestamp: new Date().toISOString(),
      severity,
    };
  }

  private getSeverity(type: MonitorAlertType): 'critical' | 'warning' | 'info' {
    switch (type) {
      case 'STOP_LOSS_HIT':
        return 'critical';
      case 'STOP_LOSS_WARNING':
      case 'SIGNIFICANT_DROP':
        return 'warning';
      case 'TARGET_HIT':
      case 'SIGNIFICANT_GAIN':
      case 'VOLUME_SPIKE':
      case 'PRICE_ALERT':
        return 'info';
      default:
        return 'info';
    }
  }

  private formatMessage(type: MonitorAlertType, ticker: string, data: MonitorAlertData): string {
    const price = data.currentPrice?.toFixed(2) ?? 'N/A';
    const changePercent = data.changePercent?.toFixed(2) ?? 'N/A';

    switch (type) {
      case 'STOP_LOSS_HIT':
        return `STOP LOSS HIT: ${ticker} at $${price} (${changePercent}% loss). Consider selling.`;
      case 'STOP_LOSS_WARNING':
        return `Stop Loss Warning: ${ticker} at $${price} (${changePercent}% loss). Approaching stop loss.`;
      case 'TARGET_HIT':
        return `TARGET HIT: ${ticker} at $${price} (+${changePercent}%). Consider taking profits.`;
      case 'SIGNIFICANT_DROP':
        return `Significant Drop: ${ticker} down ${changePercent}% to $${price}.`;
      case 'SIGNIFICANT_GAIN':
        return `Significant Gain: ${ticker} up ${changePercent}% to $${price}.`;
      case 'VOLUME_SPIKE':
        return `Volume Spike: ${ticker} trading at ${data.volume?.toLocaleString()} vs avg ${data.avgVolume?.toLocaleString()}.`;
      case 'PRICE_ALERT':
        return `Price Alert: ${ticker} at $${price}.`;
      default:
        return `Alert for ${ticker}: $${price}`;
    }
  }
}
