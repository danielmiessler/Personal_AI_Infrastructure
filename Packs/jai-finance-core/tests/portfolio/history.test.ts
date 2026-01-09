/**
 * TransactionHistory Tests
 *
 * Tests for transaction recording, querying by date/ticker,
 * and gain/loss summaries.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  TransactionHistory,
  TransactionHistoryError,
} from '../../src/portfolio/history';

const TEST_DATA_DIR = join(import.meta.dir, '.test-data-history');

describe('TransactionHistory', () => {
  let history: TransactionHistory;

  beforeEach(() => {
    // Clean up any existing test data
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
    history = new TransactionHistory(TEST_DATA_DIR);
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should create data directory if it does not exist', () => {
      expect(existsSync(TEST_DATA_DIR)).toBe(true);
    });

    it('should start with no transactions', () => {
      expect(history.getTransactionCount()).toBe(0);
      expect(history.getTransactions()).toEqual([]);
    });

    it('should load existing transactions on initialization', () => {
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });

      const newHistory = new TransactionHistory(TEST_DATA_DIR);
      expect(newHistory.getTransactionCount()).toBe(1);
    });
  });

  describe('addTransaction', () => {
    it('should add a buy transaction with correct properties', () => {
      const transaction = history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });

      expect(transaction.id).toMatch(/^txn_/);
      expect(transaction.type).toBe('buy');
      expect(transaction.ticker).toBe('AAPL');
      expect(transaction.shares).toBe(100);
      expect(transaction.price).toBe(150.0);
      expect(transaction.date).toBe('2024-01-15T10:00:00Z');
    });

    it('should add a sell transaction with gain/loss', () => {
      const transaction = history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 180.0,
        taxLotId: 'lot_abc123',
        gainLoss: 1500,
      });

      expect(transaction.type).toBe('sell');
      expect(transaction.taxLotId).toBe('lot_abc123');
      expect(transaction.gainLoss).toBe(1500);
    });

    it('should normalize ticker to uppercase', () => {
      const transaction = history.addTransaction({
        type: 'buy',
        ticker: 'aapl',
        shares: 100,
        price: 150.0,
      });

      expect(transaction.ticker).toBe('AAPL');
    });

    it('should use current date if not provided', () => {
      const before = new Date();
      const transaction = history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });
      const after = new Date();

      const txDate = new Date(transaction.date);
      expect(txDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(txDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should persist transaction to disk', () => {
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });

      const newHistory = new TransactionHistory(TEST_DATA_DIR);
      expect(newHistory.getTransactionCount()).toBe(1);
    });

    it('should generate unique IDs for each transaction', () => {
      const tx1 = history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });
      const tx2 = history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 50,
        price: 155.0,
      });

      expect(tx1.id).not.toBe(tx2.id);
    });
  });

  describe('getTransactions', () => {
    beforeEach(() => {
      // Add sample transactions
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'MSFT',
        shares: 50,
        price: 300.0,
        date: '2024-02-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 180.0,
        date: '2024-03-15T10:00:00Z',
        gainLoss: 1500,
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'GOOGL',
        shares: 25,
        price: 2500.0,
        date: '2024-04-15T10:00:00Z',
      });
    });

    it('should return all transactions sorted by date descending', () => {
      const transactions = history.getTransactions();

      expect(transactions).toHaveLength(4);
      expect(transactions[0].ticker).toBe('GOOGL'); // Most recent
      expect(transactions[3].ticker).toBe('AAPL'); // Oldest buy
    });

    it('should filter by transaction type', () => {
      const buys = history.getTransactions({ type: 'buy' });
      const sells = history.getTransactions({ type: 'sell' });

      expect(buys).toHaveLength(3);
      expect(sells).toHaveLength(1);
      expect(sells[0].type).toBe('sell');
    });

    it('should filter by start date', () => {
      const transactions = history.getTransactions({
        startDate: '2024-03-01T00:00:00Z',
      });

      expect(transactions).toHaveLength(2); // March and April
      expect(transactions[0].date).toBe('2024-04-15T10:00:00Z');
      expect(transactions[1].date).toBe('2024-03-15T10:00:00Z');
    });

    it('should filter by end date', () => {
      const transactions = history.getTransactions({
        endDate: '2024-02-28T23:59:59Z',
      });

      expect(transactions).toHaveLength(2); // January and February
    });

    it('should filter by date range', () => {
      const transactions = history.getTransactions({
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
      });

      expect(transactions).toHaveLength(2); // February and March
    });

    it('should limit results', () => {
      const transactions = history.getTransactions({ limit: 2 });

      expect(transactions).toHaveLength(2);
      expect(transactions[0].ticker).toBe('GOOGL'); // Most recent
    });

    it('should combine multiple filters', () => {
      const transactions = history.getTransactions({
        type: 'buy',
        startDate: '2024-02-01T00:00:00Z',
        limit: 1,
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('buy');
    });
  });

  describe('getTransactionsForTicker', () => {
    beforeEach(() => {
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 180.0,
        date: '2024-03-15T10:00:00Z',
        gainLoss: 1500,
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'MSFT',
        shares: 50,
        price: 300.0,
        date: '2024-02-15T10:00:00Z',
      });
    });

    it('should return only transactions for specified ticker', () => {
      const aaplTransactions = history.getTransactionsForTicker('AAPL');

      expect(aaplTransactions).toHaveLength(2);
      aaplTransactions.forEach((t) => expect(t.ticker).toBe('AAPL'));
    });

    it('should be case insensitive', () => {
      const transactions = history.getTransactionsForTicker('aapl');

      expect(transactions).toHaveLength(2);
    });

    it('should return empty array for ticker with no transactions', () => {
      const transactions = history.getTransactionsForTicker('GOOGL');

      expect(transactions).toEqual([]);
    });

    it('should support filtering by type', () => {
      const sells = history.getTransactionsForTicker('AAPL', { type: 'sell' });

      expect(sells).toHaveLength(1);
      expect(sells[0].type).toBe('sell');
    });

    it('should support filtering by date range', () => {
      const transactions = history.getTransactionsForTicker('AAPL', {
        startDate: '2024-02-01T00:00:00Z',
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].date).toBe('2024-03-15T10:00:00Z');
    });
  });

  describe('getTotalGainLoss', () => {
    beforeEach(() => {
      // Profitable sell
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 100,
        price: 180.0,
        date: '2024-02-15T10:00:00Z',
        gainLoss: 3000,
      });
      // Losing sell
      history.addTransaction({
        type: 'sell',
        ticker: 'MSFT',
        shares: 50,
        price: 280.0,
        date: '2024-03-15T10:00:00Z',
        gainLoss: -1000,
      });
      // Another profitable sell
      history.addTransaction({
        type: 'sell',
        ticker: 'GOOGL',
        shares: 25,
        price: 2800.0,
        date: '2024-04-15T10:00:00Z',
        gainLoss: 5000,
      });
      // Buy (should be ignored)
      history.addTransaction({
        type: 'buy',
        ticker: 'NVDA',
        shares: 100,
        price: 500.0,
        date: '2024-01-15T10:00:00Z',
      });
    });

    it('should calculate total gain/loss from all sells', () => {
      const result = history.getTotalGainLoss();

      expect(result.totalGainLoss).toBe(7000); // 3000 - 1000 + 5000
      expect(result.gains).toBe(8000); // 3000 + 5000
      expect(result.losses).toBe(-1000);
      expect(result.transactionCount).toBe(3);
    });

    it('should filter by date range', () => {
      const result = history.getTotalGainLoss({
        startDate: '2024-03-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
      });

      expect(result.totalGainLoss).toBe(-1000); // Only MSFT loss
      expect(result.transactionCount).toBe(1);
    });

    it('should filter by ticker', () => {
      const result = history.getTotalGainLoss({ ticker: 'AAPL' });

      expect(result.totalGainLoss).toBe(3000);
      expect(result.transactionCount).toBe(1);
    });

    it('should handle sells without gainLoss', () => {
      history.addTransaction({
        type: 'sell',
        ticker: 'TEST',
        shares: 10,
        price: 100.0,
        date: '2024-05-15T10:00:00Z',
        // No gainLoss field
      });

      const result = history.getTotalGainLoss();

      // Should not change totals
      expect(result.totalGainLoss).toBe(7000);
    });
  });

  describe('getTransactionById', () => {
    it('should find transaction by ID', () => {
      const added = history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });

      const found = history.getTransactionById(added.id);

      expect(found).not.toBeUndefined();
      expect(found!.id).toBe(added.id);
      expect(found!.ticker).toBe('AAPL');
    });

    it('should return undefined for non-existent ID', () => {
      const found = history.getTransactionById('txn_nonexistent');

      expect(found).toBeUndefined();
    });
  });

  describe('getLastTransaction', () => {
    it('should return most recent transaction for ticker', () => {
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 50,
        price: 160.0,
        date: '2024-03-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 25,
        price: 180.0,
        date: '2024-02-15T10:00:00Z',
      });

      const last = history.getLastTransaction('AAPL');

      expect(last).not.toBeUndefined();
      expect(last!.date).toBe('2024-03-15T10:00:00Z');
      expect(last!.shares).toBe(50);
    });

    it('should return undefined for ticker with no transactions', () => {
      const last = history.getLastTransaction('AAPL');

      expect(last).toBeUndefined();
    });
  });

  describe('getTickerSummary', () => {
    beforeEach(() => {
      // First buy
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });
      // Second buy
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 50,
        price: 160.0,
        date: '2024-02-15T10:00:00Z',
      });
      // Partial sell
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 75,
        price: 180.0,
        date: '2024-03-15T10:00:00Z',
        gainLoss: 2250,
      });
    });

    it('should calculate total shares bought', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.totalBought).toBe(150);
    });

    it('should calculate total shares sold', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.totalSold).toBe(75);
    });

    it('should calculate total buy value', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.totalBuyValue).toBe(23000); // 100*150 + 50*160
    });

    it('should calculate total sell value', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.totalSellValue).toBe(13500); // 75*180
    });

    it('should calculate realized gain/loss', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.realizedGainLoss).toBe(2250);
    });

    it('should track first and last transaction dates', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.firstTransaction).toBe('2024-01-15T10:00:00Z');
      expect(summary.lastTransaction).toBe('2024-03-15T10:00:00Z');
    });

    it('should count total transactions', () => {
      const summary = history.getTickerSummary('AAPL');

      expect(summary.transactionCount).toBe(3);
    });

    it('should handle ticker with no transactions', () => {
      const summary = history.getTickerSummary('MSFT');

      expect(summary.totalBought).toBe(0);
      expect(summary.totalSold).toBe(0);
      expect(summary.transactionCount).toBe(0);
      expect(summary.firstTransaction).toBeNull();
      expect(summary.lastTransaction).toBeNull();
    });

    it('should be case insensitive', () => {
      const summary = history.getTickerSummary('aapl');

      expect(summary.transactionCount).toBe(3);
    });
  });

  describe('getYTDGainLoss', () => {
    it('should calculate year-to-date gains and losses', () => {
      const thisYear = new Date().getFullYear();
      const lastYear = thisYear - 1;

      // Last year (should be excluded)
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 100,
        price: 180.0,
        date: `${lastYear}-12-15T10:00:00Z`,
        gainLoss: 5000,
      });
      // This year
      history.addTransaction({
        type: 'sell',
        ticker: 'MSFT',
        shares: 50,
        price: 320.0,
        date: `${thisYear}-02-15T10:00:00Z`,
        gainLoss: 2000,
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'GOOGL',
        shares: 25,
        price: 2400.0,
        date: `${thisYear}-03-15T10:00:00Z`,
        gainLoss: -500,
      });

      const result = history.getYTDGainLoss();

      expect(result.totalGainLoss).toBe(1500); // 2000 - 500
    });

    it('should return zero when no transactions this year', () => {
      const lastYear = new Date().getFullYear() - 1;

      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 100,
        price: 180.0,
        date: `${lastYear}-06-15T10:00:00Z`,
        gainLoss: 5000,
      });

      const result = history.getYTDGainLoss();

      expect(result.totalGainLoss).toBe(0);
    });
  });

  describe('getTransactionCount', () => {
    it('should return 0 for empty history', () => {
      expect(history.getTransactionCount()).toBe(0);
    });

    it('should return correct count', () => {
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'MSFT',
        shares: 50,
        price: 300.0,
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 180.0,
      });

      expect(history.getTransactionCount()).toBe(3);
    });
  });

  describe('getTradedTickers', () => {
    it('should return empty array when no transactions', () => {
      expect(history.getTradedTickers()).toEqual([]);
    });

    it('should return unique tickers sorted alphabetically', () => {
      history.addTransaction({
        type: 'buy',
        ticker: 'MSFT',
        shares: 50,
        price: 300.0,
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 180.0,
      });
      history.addTransaction({
        type: 'buy',
        ticker: 'GOOGL',
        shares: 25,
        price: 2500.0,
      });

      const tickers = history.getTradedTickers();

      expect(tickers).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });
  });

  describe('TransactionHistoryError', () => {
    it('should have correct error properties', () => {
      const error = new TransactionHistoryError('Test error', 'TEST_CODE');

      expect(error.name).toBe('TransactionHistoryError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
    });
  });

  describe('integration scenarios', () => {
    it('should track complete trading lifecycle', () => {
      // Initial purchase
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });

      // Add to position
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 50,
        price: 145.0,
        date: '2024-02-15T10:00:00Z',
      });

      // Partial sale with profit
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 75,
        price: 180.0,
        date: '2024-06-15T10:00:00Z',
        gainLoss: 2625, // 75 * (180 - 145)
      });

      // Another partial sale with profit
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 200.0,
        date: '2024-09-15T10:00:00Z',
        gainLoss: 2500, // 50 * (200 - 150)
      });

      const summary = history.getTickerSummary('AAPL');

      expect(summary.totalBought).toBe(150);
      expect(summary.totalSold).toBe(125);
      expect(summary.realizedGainLoss).toBe(5125);
      expect(summary.transactionCount).toBe(4);

      // Net position: 150 - 125 = 25 shares remaining
      const netShares = summary.totalBought - summary.totalSold;
      expect(netShares).toBe(25);
    });

    it('should support tax reporting queries', () => {
      const thisYear = new Date().getFullYear();

      // Various sells throughout the year
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 100,
        price: 180.0,
        date: `${thisYear}-03-15T10:00:00Z`,
        gainLoss: 3000,
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'MSFT',
        shares: 50,
        price: 280.0,
        date: `${thisYear}-06-15T10:00:00Z`,
        gainLoss: -500,
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'GOOGL',
        shares: 25,
        price: 2800.0,
        date: `${thisYear}-09-15T10:00:00Z`,
        gainLoss: 2000,
      });

      // YTD summary
      const ytd = history.getYTDGainLoss();
      expect(ytd.totalGainLoss).toBe(4500);

      // Per-ticker breakdown
      const aaplGains = history.getTotalGainLoss({ ticker: 'AAPL' });
      const msftGains = history.getTotalGainLoss({ ticker: 'MSFT' });
      const googlGains = history.getTotalGainLoss({ ticker: 'GOOGL' });

      expect(aaplGains.totalGainLoss).toBe(3000);
      expect(msftGains.totalGainLoss).toBe(-500);
      expect(googlGains.totalGainLoss).toBe(2000);
    });

    it('should track multiple tickers independently', () => {
      // AAPL transactions
      history.addTransaction({
        type: 'buy',
        ticker: 'AAPL',
        shares: 100,
        price: 150.0,
        date: '2024-01-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'AAPL',
        shares: 50,
        price: 180.0,
        date: '2024-06-15T10:00:00Z',
        gainLoss: 1500,
      });

      // MSFT transactions
      history.addTransaction({
        type: 'buy',
        ticker: 'MSFT',
        shares: 50,
        price: 300.0,
        date: '2024-02-15T10:00:00Z',
      });
      history.addTransaction({
        type: 'sell',
        ticker: 'MSFT',
        shares: 25,
        price: 280.0,
        date: '2024-07-15T10:00:00Z',
        gainLoss: -500,
      });

      const tickers = history.getTradedTickers();
      expect(tickers).toEqual(['AAPL', 'MSFT']);

      const aaplSummary = history.getTickerSummary('AAPL');
      const msftSummary = history.getTickerSummary('MSFT');

      expect(aaplSummary.realizedGainLoss).toBe(1500);
      expect(msftSummary.realizedGainLoss).toBe(-500);

      const totalGains = history.getTotalGainLoss();
      expect(totalGains.totalGainLoss).toBe(1000);
    });
  });
});
