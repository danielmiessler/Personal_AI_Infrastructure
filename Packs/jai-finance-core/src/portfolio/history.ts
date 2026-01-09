/**
 * Transaction History
 *
 * Records and retrieves all buy/sell transactions.
 * Persists to transactions.json in the configured data directory.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Transaction, TransactionsFile, TransactionType } from './types';

/**
 * Error thrown by TransactionHistory operations.
 */
export class TransactionHistoryError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'TransactionHistoryError';
  }
}

/**
 * Generate a unique transaction ID.
 */
function generateTransactionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `txn_${timestamp}_${random}`;
}

/**
 * Records and retrieves transaction history.
 */
export class TransactionHistory {
  private readonly filePath: string;
  private transactions: Transaction[];

  constructor(dataDir: string) {
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.filePath = join(dataDir, 'transactions.json');
    this.transactions = [];
    this.load();
  }

  /**
   * Load transactions from disk.
   */
  private load(): void {
    if (!existsSync(this.filePath)) {
      this.transactions = [];
      return;
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const data: TransactionsFile = JSON.parse(content);
      this.transactions = data.transactions;
    } catch (error) {
      throw new TransactionHistoryError(
        `Failed to load transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOAD_FAILED'
      );
    }
  }

  /**
   * Save transactions to disk.
   */
  private save(): void {
    try {
      const data: TransactionsFile = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        transactions: this.transactions,
      };

      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new TransactionHistoryError(
        `Failed to save transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED'
      );
    }
  }

  /**
   * Add a new transaction.
   */
  addTransaction(params: {
    type: TransactionType;
    ticker: string;
    shares: number;
    price: number;
    date?: string;
    taxLotId?: string;
    gainLoss?: number;
  }): Transaction {
    const transaction: Transaction = {
      id: generateTransactionId(),
      type: params.type,
      ticker: params.ticker.toUpperCase(),
      shares: params.shares,
      price: params.price,
      date: params.date ?? new Date().toISOString(),
      taxLotId: params.taxLotId,
      gainLoss: params.gainLoss,
    };

    this.transactions.push(transaction);
    this.save();

    return transaction;
  }

  /**
   * Get all transactions, optionally filtered.
   */
  getTransactions(options?: {
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Transaction[] {
    let filtered = [...this.transactions];

    if (options?.type) {
      filtered = filtered.filter((t) => t.type === options.type);
    }

    if (options?.startDate) {
      const startDate = new Date(options.startDate);
      filtered = filtered.filter((t) => new Date(t.date) >= startDate);
    }

    if (options?.endDate) {
      const endDate = new Date(options.endDate);
      filtered = filtered.filter((t) => new Date(t.date) <= endDate);
    }

    // Sort by date descending (most recent first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get all transactions for a specific ticker.
   */
  getTransactionsForTicker(
    ticker: string,
    options?: {
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
    }
  ): Transaction[] {
    const normalizedTicker = ticker.toUpperCase();

    return this.getTransactions(options).filter(
      (t) => t.ticker === normalizedTicker
    );
  }

  /**
   * Get total realized gain/loss across all sell transactions.
   */
  getTotalGainLoss(options?: {
    startDate?: string;
    endDate?: string;
    ticker?: string;
  }): {
    totalGainLoss: number;
    gains: number;
    losses: number;
    transactionCount: number;
  } {
    let sells = this.getTransactions({
      type: 'sell',
      startDate: options?.startDate,
      endDate: options?.endDate,
    });

    if (options?.ticker) {
      const normalizedTicker = options.ticker.toUpperCase();
      sells = sells.filter((t) => t.ticker === normalizedTicker);
    }

    let gains = 0;
    let losses = 0;

    for (const transaction of sells) {
      if (transaction.gainLoss !== undefined) {
        if (transaction.gainLoss >= 0) {
          gains += transaction.gainLoss;
        } else {
          losses += transaction.gainLoss;
        }
      }
    }

    return {
      totalGainLoss: gains + losses,
      gains,
      losses,
      transactionCount: sells.length,
    };
  }

  /**
   * Get a transaction by ID.
   */
  getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  /**
   * Get the most recent transaction for a ticker.
   */
  getLastTransaction(ticker: string): Transaction | undefined {
    const transactions = this.getTransactionsForTicker(ticker);
    return transactions[0]; // Already sorted by date descending
  }

  /**
   * Get transaction summary for a ticker.
   */
  getTickerSummary(ticker: string): {
    totalBought: number;
    totalSold: number;
    totalBuyValue: number;
    totalSellValue: number;
    realizedGainLoss: number;
    firstTransaction: string | null;
    lastTransaction: string | null;
    transactionCount: number;
  } {
    const transactions = this.getTransactionsForTicker(ticker);

    let totalBought = 0;
    let totalSold = 0;
    let totalBuyValue = 0;
    let totalSellValue = 0;
    let realizedGainLoss = 0;

    for (const t of transactions) {
      const value = t.shares * t.price;
      if (t.type === 'buy') {
        totalBought += t.shares;
        totalBuyValue += value;
      } else {
        totalSold += t.shares;
        totalSellValue += value;
        if (t.gainLoss !== undefined) {
          realizedGainLoss += t.gainLoss;
        }
      }
    }

    // Sort chronologically for first/last
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      totalBought,
      totalSold,
      totalBuyValue,
      totalSellValue,
      realizedGainLoss,
      firstTransaction: sorted[0]?.date ?? null,
      lastTransaction: sorted[sorted.length - 1]?.date ?? null,
      transactionCount: transactions.length,
    };
  }

  /**
   * Get year-to-date realized gains/losses.
   */
  getYTDGainLoss(): {
    totalGainLoss: number;
    shortTermGainLoss: number;
    longTermGainLoss: number;
  } {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    // Note: We don't have short/long term distinction in transactions
    // This would need to be tracked at transaction creation time
    // For now, return total only
    const { totalGainLoss } = this.getTotalGainLoss({ startDate: startOfYear });

    return {
      totalGainLoss,
      shortTermGainLoss: 0, // Would need to track this at transaction time
      longTermGainLoss: 0, // Would need to track this at transaction time
    };
  }

  /**
   * Get count of all transactions.
   */
  getTransactionCount(): number {
    return this.transactions.length;
  }

  /**
   * Get all unique tickers that have been traded.
   */
  getTradedTickers(): string[] {
    const tickers = new Set<string>();
    for (const t of this.transactions) {
      tickers.add(t.ticker);
    }
    return Array.from(tickers).sort();
  }
}
