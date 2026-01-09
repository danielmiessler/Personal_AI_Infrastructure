/**
 * Portfolio State Manager
 *
 * Calculates complete portfolio state including current values,
 * sector allocation, and compliance checks.
 */

import { PositionManager } from './position';
import type {
  ComplianceThresholds,
  PortfolioCompliance,
  PortfolioState,
  PortfolioSummary,
  PositionWithValue,
  SectorAllocation,
  DEFAULT_COMPLIANCE_THRESHOLDS,
} from './types';

/**
 * Price provider interface - must be implemented by the data module.
 */
export interface PriceProvider {
  /**
   * Get current prices for multiple tickers.
   * Returns a map of ticker -> price.
   */
  getCurrentPrices(tickers: string[]): Promise<Map<string, number>>;

  /**
   * Get previous close prices for day change calculation.
   * Returns a map of ticker -> previous close price.
   */
  getPreviousClosePrices?(tickers: string[]): Promise<Map<string, number>>;
}

/**
 * Options for portfolio state calculation.
 */
export interface PortfolioStateOptions {
  /** Current prices (if already fetched, to avoid duplicate calls) */
  currentPrices?: Map<string, number>;
  /** Previous close prices (for day change calculation) */
  previousClosePrices?: Map<string, number>;
  /** Compliance thresholds (uses defaults if not provided) */
  complianceThresholds?: ComplianceThresholds;
}

/**
 * Manages portfolio state calculations.
 */
export class PortfolioStateManager {
  private readonly positionManager: PositionManager;
  private readonly complianceThresholds: ComplianceThresholds;

  constructor(
    dataDir: string,
    options?: {
      complianceThresholds?: Partial<ComplianceThresholds>;
    }
  ) {
    this.positionManager = new PositionManager(dataDir);

    // Merge provided thresholds with defaults
    this.complianceThresholds = {
      maxPositionPercent: options?.complianceThresholds?.maxPositionPercent ?? 0.25,
      maxSectorPercent: options?.complianceThresholds?.maxSectorPercent ?? 0.40,
      minCashReservePercent: options?.complianceThresholds?.minCashReservePercent ?? 0.05,
    };
  }

  /**
   * Get the underlying position manager.
   */
  getPositionManager(): PositionManager {
    return this.positionManager;
  }

  /**
   * Calculate complete portfolio state.
   *
   * @param cashBalance - Current cash available
   * @param priceProvider - Provider to fetch current prices (optional if prices provided in options)
   * @param options - Additional options including pre-fetched prices
   */
  async getState(
    cashBalance: number,
    priceProvider?: PriceProvider,
    options?: PortfolioStateOptions
  ): Promise<PortfolioState> {
    const positions = this.positionManager.getAllPositions();
    const tickers = positions.map((p) => p.ticker);

    // Get current prices
    let currentPrices = options?.currentPrices;
    if (!currentPrices && priceProvider && tickers.length > 0) {
      currentPrices = await priceProvider.getCurrentPrices(tickers);
    }
    currentPrices = currentPrices ?? new Map();

    // Get previous close prices for day change
    let previousClosePrices = options?.previousClosePrices;
    if (!previousClosePrices && priceProvider?.getPreviousClosePrices && tickers.length > 0) {
      previousClosePrices = await priceProvider.getPreviousClosePrices(tickers);
    }
    previousClosePrices = previousClosePrices ?? new Map();

    // Calculate position values
    let totalValue = 0;
    let totalCost = 0;
    let dayChange = 0;

    const positionsWithValue: PositionWithValue[] = [];

    for (const position of positions) {
      const currentPrice = currentPrices.get(position.ticker) ?? 0;
      const previousClose = previousClosePrices.get(position.ticker) ?? currentPrice;

      const marketValue = position.shares * currentPrice;
      const unrealizedPnL = marketValue - position.totalCost;
      const unrealizedPnLPercent =
        position.totalCost > 0 ? (unrealizedPnL / position.totalCost) * 100 : 0;

      const positionDayChange = position.shares * (currentPrice - previousClose);
      dayChange += positionDayChange;

      totalValue += marketValue;
      totalCost += position.totalCost;

      positionsWithValue.push({
        ...position,
        currentPrice,
        marketValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        portfolioPercent: 0, // Will be calculated after we know total
      });
    }

    // Calculate portfolio percentages
    const totalPortfolioValue = totalValue + cashBalance;
    for (const position of positionsWithValue) {
      position.portfolioPercent =
        totalPortfolioValue > 0
          ? (position.marketValue / totalPortfolioValue) * 100
          : 0;
    }

    // Calculate sector allocation
    const sectorAllocation = this.calculateSectorAllocation(
      positionsWithValue,
      totalPortfolioValue
    );

    // Calculate summary
    const unrealizedPnL = totalValue - totalCost;
    const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;
    const dayChangePercent =
      totalValue - dayChange > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    const summary: PortfolioSummary = {
      totalValue,
      totalCost,
      unrealizedPnL,
      unrealizedPnLPercent,
      cashAvailable: cashBalance,
      dayChange,
      dayChangePercent,
    };

    // Check compliance
    const thresholds = options?.complianceThresholds ?? this.complianceThresholds;
    const compliance = this.checkCompliance(
      positionsWithValue,
      sectorAllocation,
      cashBalance,
      totalPortfolioValue,
      thresholds
    );

    return {
      lastUpdated: new Date().toISOString(),
      summary,
      positions: positionsWithValue,
      sectorAllocation,
      compliance,
    };
  }

  /**
   * Calculate sector allocation from positions.
   */
  private calculateSectorAllocation(
    positions: PositionWithValue[],
    totalPortfolioValue: number
  ): SectorAllocation[] {
    const sectorMap = new Map<string, number>();

    for (const position of positions) {
      const sector = position.sector ?? 'Unknown';
      const current = sectorMap.get(sector) ?? 0;
      sectorMap.set(sector, current + position.marketValue);
    }

    const allocations: SectorAllocation[] = [];
    for (const [sector, value] of sectorMap) {
      allocations.push({
        sector,
        value,
        percent: totalPortfolioValue > 0 ? (value / totalPortfolioValue) * 100 : 0,
      });
    }

    // Sort by value descending
    return allocations.sort((a, b) => b.value - a.value);
  }

  /**
   * Check portfolio compliance against thresholds.
   */
  private checkCompliance(
    positions: PositionWithValue[],
    sectorAllocation: SectorAllocation[],
    cashBalance: number,
    totalPortfolioValue: number,
    thresholds: ComplianceThresholds
  ): PortfolioCompliance {
    // Check max position size
    const maxPositionViolation = positions.some(
      (p) => p.portfolioPercent / 100 > thresholds.maxPositionPercent
    );

    // Check sector concentration
    const sectorConcentrationViolation = sectorAllocation.some(
      (s) => s.percent / 100 > thresholds.maxSectorPercent
    );

    // Check cash reserve
    const cashPercent =
      totalPortfolioValue > 0 ? cashBalance / totalPortfolioValue : 1;
    const cashReserveViolation = cashPercent < thresholds.minCashReservePercent;

    return {
      maxPositionViolation,
      sectorConcentrationViolation,
      cashReserveViolation,
    };
  }

  /**
   * Get positions that violate the max position size.
   */
  async getOversizedPositions(
    cashBalance: number,
    priceProvider?: PriceProvider,
    options?: PortfolioStateOptions
  ): Promise<PositionWithValue[]> {
    const state = await this.getState(cashBalance, priceProvider, options);
    const thresholds = options?.complianceThresholds ?? this.complianceThresholds;

    return state.positions.filter(
      (p) => p.portfolioPercent / 100 > thresholds.maxPositionPercent
    );
  }

  /**
   * Get sectors that exceed concentration limits.
   */
  async getOverconcentratedSectors(
    cashBalance: number,
    priceProvider?: PriceProvider,
    options?: PortfolioStateOptions
  ): Promise<SectorAllocation[]> {
    const state = await this.getState(cashBalance, priceProvider, options);
    const thresholds = options?.complianceThresholds ?? this.complianceThresholds;

    return state.sectorAllocation.filter(
      (s) => s.percent / 100 > thresholds.maxSectorPercent
    );
  }

  /**
   * Calculate how much needs to be added to meet cash reserve requirement.
   */
  async getCashDeficit(
    cashBalance: number,
    priceProvider?: PriceProvider,
    options?: PortfolioStateOptions
  ): Promise<number> {
    const state = await this.getState(cashBalance, priceProvider, options);
    const thresholds = options?.complianceThresholds ?? this.complianceThresholds;

    const totalPortfolioValue = state.summary.totalValue + cashBalance;
    const requiredCash = totalPortfolioValue * thresholds.minCashReservePercent;

    const deficit = requiredCash - cashBalance;
    return deficit > 0 ? deficit : 0;
  }

  /**
   * Get a quick summary without fetching prices (uses stored cost basis only).
   */
  getQuickSummary(): {
    positionCount: number;
    totalCostBasis: number;
    tickers: string[];
  } {
    const positions = this.positionManager.getAllPositions();

    return {
      positionCount: positions.length,
      totalCostBasis: positions.reduce((sum, p) => sum + p.totalCost, 0),
      tickers: positions.map((p) => p.ticker),
    };
  }
}
