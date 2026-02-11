#!/usr/bin/env bun
/**
 * TradeDB.ts — SQLite database layer for trade data (Postgres-ready schema)
 *
 * Provides persistent storage for fills, round-trip trades, daily summaries,
 * and session reviews. Uses bun:sqlite (built-in, synchronous, zero deps).
 *
 * Schema is designed for easy migration to PostgreSQL:
 *   - AUTOINCREMENT → SERIAL
 *   - datetime('now') → NOW()
 *   - TEXT for JSON → JSONB
 *   - Standard indexes work identically
 *
 * Usage:
 *   import { TradeDB } from "./TradeDB";
 *   const db = new TradeDB("Data/trades.db");
 *   db.upsertFills("2026-02-10", fills);
 *   db.close();
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

// Input types (structurally compatible with TradeLogger.ts Fill/RoundTrip/DailyLog)

export interface DBFill {
  time: string;
  symbol: string;
  side: string;
  price: number;
  qty: number;
  route: string;
  account: string;
  liqType: string;
  ecnFee: number;
  pnl: number;
}

export interface DBRoundTrip {
  id: string;
  date?: string;
  ticker: string;
  side: string;
  entry_avg: number;
  exit_avg: number;
  total_shares: number;
  pnl: number;
  fees: number;
  net_pnl: number;
  fills: number;
  entry_time: string;
  exit_time: string;
  duration_mins: number;
  accounts: string[];
  account_type: string;
  setup: string | null;
  notes: string | null;
  chart: string | null;
}

export interface DBDailyLog {
  date: string;
  source: string;
  summary: {
    total_pnl: number;
    total_fees: number;
    total_net_pnl: number;
    total_trades: number;
    winners: number;
    losers: number;
    breakeven: number;
    win_rate: number;
    symbols: string[];
    by_account?: {
      live: { trades: number; pnl: number; winners: number; losers: number; win_rate: number };
      training: { trades: number; pnl: number; winners: number; losers: number; win_rate: number };
    };
  };
  trades: DBRoundTrip[];
}

// Output types for analytics queries

export interface DailySummaryRow {
  date: string;
  source: string | null;
  total_pnl: number;
  total_fees: number;
  total_net_pnl: number;
  total_trades: number;
  winners: number;
  losers: number;
  breakeven: number;
  win_rate: number;
  symbols: string[];
  live_trades: number;
  live_pnl: number;
  live_win_rate: number;
  training_trades: number;
  training_pnl: number;
  training_win_rate: number;
}

export interface SetupStats {
  setup: string;
  trades: number;
  total_pnl: number;
  avg_pnl: number;
  winners: number;
  losers: number;
  win_rate: number;
}

export interface TimeStats {
  bucket: string;
  trades: number;
  total_pnl: number;
  avg_pnl: number;
  winners: number;
  losers: number;
  win_rate: number;
}

export interface AccountTypeStats {
  account_type: string;
  trades: number;
  total_pnl: number;
  avg_pnl: number;
  winners: number;
  losers: number;
  win_rate: number;
}

export interface ReviewRecord {
  date: string;
  type: string;
  best_trade_id: string | null;
  worst_trade_id: string | null;
  best_trade_why: string | null;
  worst_trade_why: string | null;
  followed_playbook: string | null;
  improve_tomorrow: string | null;
  honored_stops: string | null;
  discipline_rating: number | null;
  goals: string[] | null;
}

export interface DBConfig {
  provider: string;
  sqlite_path: string;
  postgres_url: string;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL,
  route TEXT,
  account TEXT NOT NULL,
  liq_type TEXT,
  ecn_fee REAL DEFAULT 0,
  pnl REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, time, symbol, side, price, qty, account)
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  ticker TEXT NOT NULL,
  side TEXT NOT NULL,
  entry_avg REAL NOT NULL,
  exit_avg REAL NOT NULL,
  total_shares INTEGER NOT NULL,
  pnl REAL NOT NULL,
  fees REAL DEFAULT 0,
  net_pnl REAL NOT NULL,
  fills INTEGER NOT NULL,
  entry_time TEXT NOT NULL,
  exit_time TEXT NOT NULL,
  duration_mins INTEGER DEFAULT 0,
  accounts TEXT NOT NULL,
  account_type TEXT NOT NULL,
  setup TEXT,
  notes TEXT,
  chart TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
CREATE INDEX IF NOT EXISTS idx_trades_ticker ON trades(ticker);
CREATE INDEX IF NOT EXISTS idx_trades_setup ON trades(setup);
CREATE INDEX IF NOT EXISTS idx_trades_account_type ON trades(account_type);

CREATE TABLE IF NOT EXISTS daily_summaries (
  date TEXT PRIMARY KEY,
  source TEXT,
  total_pnl REAL NOT NULL,
  total_fees REAL DEFAULT 0,
  total_net_pnl REAL NOT NULL,
  total_trades INTEGER NOT NULL,
  winners INTEGER DEFAULT 0,
  losers INTEGER DEFAULT 0,
  breakeven INTEGER DEFAULT 0,
  win_rate REAL DEFAULT 0,
  symbols TEXT NOT NULL,
  live_trades INTEGER DEFAULT 0,
  live_pnl REAL DEFAULT 0,
  live_win_rate REAL DEFAULT 0,
  training_trades INTEGER DEFAULT 0,
  training_pnl REAL DEFAULT 0,
  training_win_rate REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'daily',
  best_trade_id TEXT,
  worst_trade_id TEXT,
  best_trade_why TEXT,
  worst_trade_why TEXT,
  followed_playbook TEXT,
  improve_tomorrow TEXT,
  honored_stops TEXT,
  discipline_rating INTEGER,
  goals TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, type)
);
`;

// ─── Implementation ──────────────────────────────────────────────────────────

export class TradeDB {
  private db: Database;

  constructor(dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode=WAL");
    this.db.exec("PRAGMA foreign_keys=ON");
    this.init();
  }

  init(): void {
    this.db.exec(SCHEMA_SQL);
  }

  close(): void {
    this.db.close();
  }

  // ─── Writes ──────────────────────────────────────────────────────────

  upsertFills(date: string, fills: DBFill[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO fills (date, time, symbol, side, price, qty, route, account, liq_type, ecn_fee, pnl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = this.db.transaction((items: DBFill[]) => {
      for (const f of items) {
        stmt.run(date, f.time, f.symbol, f.side, f.price, f.qty, f.route, f.account, f.liqType, f.ecnFee, f.pnl);
      }
    });
    tx(fills);
  }

  upsertTrades(date: string, trades: DBRoundTrip[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO trades
        (id, date, ticker, side, entry_avg, exit_avg, total_shares, pnl, fees, net_pnl,
         fills, entry_time, exit_time, duration_mins, accounts, account_type,
         setup, notes, chart, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    const tx = this.db.transaction((items: DBRoundTrip[]) => {
      for (const t of items) {
        stmt.run(
          t.id, date, t.ticker, t.side, t.entry_avg, t.exit_avg, t.total_shares,
          t.pnl, t.fees, t.net_pnl, t.fills, t.entry_time, t.exit_time,
          t.duration_mins, JSON.stringify(t.accounts), t.account_type,
          t.setup, t.notes, t.chart,
        );
      }
    });
    tx(trades);
  }

  upsertDailySummary(log: DBDailyLog): void {
    const s = log.summary;
    this.db.prepare(`
      INSERT OR REPLACE INTO daily_summaries
        (date, source, total_pnl, total_fees, total_net_pnl, total_trades,
         winners, losers, breakeven, win_rate, symbols,
         live_trades, live_pnl, live_win_rate,
         training_trades, training_pnl, training_win_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.date, log.source,
      s.total_pnl, s.total_fees, s.total_net_pnl, s.total_trades,
      s.winners, s.losers, s.breakeven, s.win_rate,
      JSON.stringify(s.symbols),
      s.by_account?.live.trades ?? 0,
      s.by_account?.live.pnl ?? 0,
      s.by_account?.live.win_rate ?? 0,
      s.by_account?.training.trades ?? 0,
      s.by_account?.training.pnl ?? 0,
      s.by_account?.training.win_rate ?? 0,
    );
  }

  upsertReview(review: ReviewRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO reviews
        (date, type, best_trade_id, worst_trade_id, best_trade_why, worst_trade_why,
         followed_playbook, improve_tomorrow, honored_stops, discipline_rating, goals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      review.date, review.type,
      review.best_trade_id, review.worst_trade_id,
      review.best_trade_why, review.worst_trade_why,
      review.followed_playbook, review.improve_tomorrow,
      review.honored_stops, review.discipline_rating,
      review.goals ? JSON.stringify(review.goals) : null,
    );
  }

  // ─── Reads ───────────────────────────────────────────────────────────

  getTradesByDate(date: string): DBRoundTrip[] {
    const rows = this.db.prepare(
      "SELECT * FROM trades WHERE date = ? ORDER BY entry_time"
    ).all(date) as any[];
    return rows.map(rowToTrade);
  }

  getTradesByDateRange(from: string, to: string): DBRoundTrip[] {
    const rows = this.db.prepare(
      "SELECT * FROM trades WHERE date BETWEEN ? AND ? ORDER BY date, entry_time"
    ).all(from, to) as any[];
    return rows.map(rowToTrade);
  }

  getTradesBySymbol(symbol: string, limit?: number): DBRoundTrip[] {
    if (limit) {
      const rows = this.db.prepare(
        "SELECT * FROM trades WHERE ticker = ? ORDER BY date DESC, entry_time DESC LIMIT ?"
      ).all(symbol, limit) as any[];
      return rows.map(rowToTrade);
    }
    const rows = this.db.prepare(
      "SELECT * FROM trades WHERE ticker = ? ORDER BY date DESC, entry_time DESC"
    ).all(symbol) as any[];
    return rows.map(rowToTrade);
  }

  getDailySummary(date: string): DailySummaryRow | null {
    const row = this.db.prepare(
      "SELECT * FROM daily_summaries WHERE date = ?"
    ).get(date) as any;
    if (!row) return null;
    return rowToSummary(row);
  }

  getDailySummaries(from: string, to: string): DailySummaryRow[] {
    const rows = this.db.prepare(
      "SELECT * FROM daily_summaries WHERE date BETWEEN ? AND ? ORDER BY date"
    ).all(from, to) as any[];
    return rows.map(rowToSummary);
  }

  getReview(date: string, type: string = "daily"): ReviewRecord | null {
    const row = this.db.prepare(
      "SELECT * FROM reviews WHERE date = ? AND type = ?"
    ).get(date, type) as any;
    if (!row) return null;
    return {
      date: row.date,
      type: row.type,
      best_trade_id: row.best_trade_id,
      worst_trade_id: row.worst_trade_id,
      best_trade_why: row.best_trade_why,
      worst_trade_why: row.worst_trade_why,
      followed_playbook: row.followed_playbook,
      improve_tomorrow: row.improve_tomorrow,
      honored_stops: row.honored_stops,
      discipline_rating: row.discipline_rating,
      goals: row.goals ? JSON.parse(row.goals) : null,
    };
  }

  // ─── Analytics ───────────────────────────────────────────────────────

  getStatsBySetup(from?: string, to?: string): SetupStats[] {
    let sql = `
      SELECT
        COALESCE(setup, '(untagged)') as setup,
        COUNT(*) as trades,
        SUM(net_pnl) as total_pnl,
        AVG(net_pnl) as avg_pnl,
        SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winners,
        SUM(CASE WHEN net_pnl < 0 THEN 1 ELSE 0 END) as losers
      FROM trades
    `;
    const params: string[] = [];
    if (from && to) {
      sql += " WHERE date BETWEEN ? AND ?";
      params.push(from, to);
    }
    sql += " GROUP BY COALESCE(setup, '(untagged)') ORDER BY total_pnl DESC";

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      setup: r.setup,
      trades: r.trades,
      total_pnl: round2(r.total_pnl),
      avg_pnl: round2(r.avg_pnl),
      winners: r.winners,
      losers: r.losers,
      win_rate: r.trades > 0 ? round2((r.winners / r.trades) * 100) : 0,
    }));
  }

  getStatsByTimeOfDay(from?: string, to?: string): TimeStats[] {
    let sql = `
      SELECT
        CASE
          WHEN entry_time < '10:00' THEN '09:30-10:00'
          WHEN entry_time < '10:30' THEN '10:00-10:30'
          WHEN entry_time < '11:00' THEN '10:30-11:00'
          WHEN entry_time < '11:30' THEN '11:00-11:30'
          WHEN entry_time < '12:00' THEN '11:30-12:00'
          WHEN entry_time < '13:00' THEN '12:00-13:00'
          WHEN entry_time < '14:00' THEN '13:00-14:00'
          WHEN entry_time < '15:00' THEN '14:00-15:00'
          WHEN entry_time < '15:30' THEN '15:00-15:30'
          ELSE '15:30-16:00'
        END as bucket,
        COUNT(*) as trades,
        SUM(net_pnl) as total_pnl,
        AVG(net_pnl) as avg_pnl,
        SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winners,
        SUM(CASE WHEN net_pnl < 0 THEN 1 ELSE 0 END) as losers
      FROM trades
    `;
    const params: string[] = [];
    if (from && to) {
      sql += " WHERE date BETWEEN ? AND ?";
      params.push(from, to);
    }
    sql += " GROUP BY bucket ORDER BY bucket";

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      bucket: r.bucket,
      trades: r.trades,
      total_pnl: round2(r.total_pnl),
      avg_pnl: round2(r.avg_pnl),
      winners: r.winners,
      losers: r.losers,
      win_rate: r.trades > 0 ? round2((r.winners / r.trades) * 100) : 0,
    }));
  }

  getStatsByAccountType(from?: string, to?: string): AccountTypeStats[] {
    let sql = `
      SELECT
        account_type,
        COUNT(*) as trades,
        SUM(net_pnl) as total_pnl,
        AVG(net_pnl) as avg_pnl,
        SUM(CASE WHEN net_pnl > 0 THEN 1 ELSE 0 END) as winners,
        SUM(CASE WHEN net_pnl < 0 THEN 1 ELSE 0 END) as losers
      FROM trades
    `;
    const params: string[] = [];
    if (from && to) {
      sql += " WHERE date BETWEEN ? AND ?";
      params.push(from, to);
    }
    sql += " GROUP BY account_type ORDER BY total_pnl DESC";

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(r => ({
      account_type: r.account_type,
      trades: r.trades,
      total_pnl: round2(r.total_pnl),
      avg_pnl: round2(r.avg_pnl),
      winners: r.winners,
      losers: r.losers,
      win_rate: r.trades > 0 ? round2((r.winners / r.trades) * 100) : 0,
    }));
  }

  // ─── Utilities ───────────────────────────────────────────────────────

  /** Get all distinct dates that have trade data */
  getDates(): string[] {
    const rows = this.db.prepare(
      "SELECT DISTINCT date FROM trades ORDER BY date"
    ).all() as any[];
    return rows.map(r => r.date);
  }

  /** Get total row counts for diagnostics */
  getCounts(): { fills: number; trades: number; summaries: number; reviews: number } {
    const fills = (this.db.prepare("SELECT COUNT(*) as n FROM fills").get() as any).n;
    const trades = (this.db.prepare("SELECT COUNT(*) as n FROM trades").get() as any).n;
    const summaries = (this.db.prepare("SELECT COUNT(*) as n FROM daily_summaries").get() as any).n;
    const reviews = (this.db.prepare("SELECT COUNT(*) as n FROM reviews").get() as any).n;
    return { fills, trades, summaries, reviews };
  }
}

// ─── Row Converters (module-level for use as callbacks) ──────────────────────

function rowToTrade(row: any): DBRoundTrip {
  return {
    id: row.id,
    date: row.date,
    ticker: row.ticker,
    side: row.side,
    entry_avg: row.entry_avg,
    exit_avg: row.exit_avg,
    total_shares: row.total_shares,
    pnl: row.pnl,
    fees: row.fees,
    net_pnl: row.net_pnl,
    fills: row.fills,
    entry_time: row.entry_time,
    exit_time: row.exit_time,
    duration_mins: row.duration_mins,
    accounts: JSON.parse(row.accounts),
    account_type: row.account_type,
    setup: row.setup,
    notes: row.notes,
    chart: row.chart,
  };
}

function rowToSummary(row: any): DailySummaryRow {
  return {
    date: row.date,
    source: row.source,
    total_pnl: row.total_pnl,
    total_fees: row.total_fees,
    total_net_pnl: row.total_net_pnl,
    total_trades: row.total_trades,
    winners: row.winners,
    losers: row.losers,
    breakeven: row.breakeven,
    win_rate: row.win_rate,
    symbols: JSON.parse(row.symbols),
    live_trades: row.live_trades,
    live_pnl: row.live_pnl,
    live_win_rate: row.live_win_rate,
    training_trades: row.training_trades,
    training_pnl: row.training_pnl,
    training_win_rate: row.training_win_rate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
