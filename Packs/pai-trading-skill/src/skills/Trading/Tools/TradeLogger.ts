#!/usr/bin/env bun
/**
 * TradeLogger.ts — Ingest broker CSVs, compute stats, generate reviews
 *
 * Primary workflow: ingest DAS Trader-style CSVs from Trade_Review folder,
 * group individual fills into round-trip trades, and write daily YAML logs.
 *
 * Usage:
 *   bun run TradeLogger.ts ingest -d 2026-02-10
 *   bun run TradeLogger.ts stats -d 2026-02-10
 *   bun run TradeLogger.ts stats --range 2026-02-01 2026-02-10
 *   bun run TradeLogger.ts stats --by-setup
 *   bun run TradeLogger.ts review -d 2026-02-10
 *   bun run TradeLogger.ts list -d 2026-02-10
 *   bun run TradeLogger.ts log -t AAPL --side long --entry 150.00 --exit 152.50 --shares 100
 *   bun run TradeLogger.ts migrate
 *   bun run TradeLogger.ts export -d 2026-02-10
 */

import { parseArgs } from "util";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { parse as csvParse } from "csv-parse/sync";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";
import { TradeDB, type DBConfig, type ReviewRecord, type SetupStats, type TimeStats, type AccountTypeStats } from "./TradeDB";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Fill {
  time: string;
  symbol: string;
  side: "B" | "S" | "SS";
  price: number;
  qty: number;
  route: string;
  account: string;
  liqType: string;
  ecnFee: number;
  pnl: number;
}

interface PositionRow {
  symbol: string;
  account: string;
  type: string;
  shares: number;
  avgCost: number;
  realized: number;
  unrealized: number;
}

interface RoundTrip {
  id: string;
  ticker: string;
  side: "long" | "short";
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
  account_type: "live" | "training" | "mixed";
  setup: string | null;
  notes: string | null;
  chart: string | null;
}

interface AccountBreakdown {
  trades: number;
  pnl: number;
  winners: number;
  losers: number;
  win_rate: number;
}

interface DailyLog {
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
    by_account: {
      live: AccountBreakdown;
      training: AccountBreakdown;
    };
  };
  trades: RoundTrip[];
}

// ─── Config ──────────────────────────────────────────────────────────────────

function getSkillDir(): string {
  // When installed, this will be in ~/.claude/skills/Trading/Tools/
  // Walk up from current file to find the Trading skill root
  const scriptDir = import.meta.dir;
  const tradingDir = resolve(scriptDir, "..");
  if (existsSync(join(tradingDir, "SKILL.md"))) {
    return tradingDir;
  }
  // Fallback: assume we're in the pack source
  const packTradingDir = resolve(scriptDir, "..", "..");
  if (existsSync(join(packTradingDir, "Data"))) {
    return packTradingDir;
  }
  return tradingDir;
}

// Config loading is async — see loadConfigAsync() below

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

function parseFillsCsv(csvContent: string): Fill[] {
  // Header: Time,Symbol,Side,Price,Qty,Route,Account,LiqType,ECNFee,P / L,
  // Note: trailing comma on each line, "P / L" has spaces
  const records = csvParse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const fills: Fill[] = [];
  for (const row of records) {
    const time = row["Time"]?.trim();
    const symbol = row["Symbol"]?.trim();
    const side = row["Side"]?.trim();
    const price = parseFloat(row["Price"]);
    const qty = parseInt(row["Qty"], 10);

    if (!time || !symbol || !side || isNaN(price) || isNaN(qty)) continue;

    fills.push({
      time,
      symbol,
      side: side as Fill["side"],
      price,
      qty,
      route: row["Route"]?.trim() || "",
      account: row["Account"]?.trim() || "",
      liqType: row["LiqType"]?.trim() || "",
      ecnFee: parseFloat(row["ECNFee"]) || 0,
      pnl: parseFloat(row["P / L"]) || 0,
    });
  }

  return fills;
}

function parsePositionsCsv(csvContent: string): PositionRow[] {
  const records = csvParse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  const positions: PositionRow[] = [];
  for (const row of records) {
    const symbol = row["Symbol"]?.trim();
    if (!symbol || symbol === "Summary") continue;

    positions.push({
      symbol,
      account: row["Account"]?.trim() || "",
      type: row["Type"]?.trim() || "",
      shares: parseInt(row["Shares"], 10) || 0,
      avgCost: parseFloat(row["Avgcost"]) || 0,
      realized: parseFloat(row["Realized"]) || 0,
      unrealized: parseFloat(row["Unrealized"]) || 0,
    });
  }

  return positions;
}

function parsePositionsSummaryPnl(csvContent: string): number {
  const records = csvParse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  for (const row of records) {
    if (row["Symbol"]?.trim() === "Summary") {
      return parseFloat(row["Realized"]) || 0;
    }
  }
  return 0;
}

// ─── Round-Trip Grouping ─────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]) + (parseInt(parts[2] || "0") / 60);
}

function groupFillsIntoRoundTrips(fills: Fill[], date: string, sourceDir: string, trainingPrefix: string = "TR"): RoundTrip[] {
  // Sort fills chronologically (CSV is in reverse order)
  const sorted = [...fills].sort((a, b) => {
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });

  // Group by (symbol, account) for accurate position tracking
  const groups = new Map<string, Fill[]>();
  for (const fill of sorted) {
    const key = `${fill.symbol}|${fill.account}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fill);
  }

  // Track round trips per symbol for numbering
  const symbolRoundTrips = new Map<string, RoundTrip[]>();

  for (const [key, groupFills] of groups) {
    const [symbol] = key.split("|");
    if (!symbolRoundTrips.has(symbol)) symbolRoundTrips.set(symbol, []);

    let position = 0;
    let currentFills: Fill[] = [];

    for (const fill of groupFills) {
      currentFills.push(fill);

      if (fill.side === "B") {
        position += fill.qty;
      } else {
        // S or SS both reduce position
        position -= fill.qty;
      }

      // Round trip complete when position returns to zero
      if (position === 0 && currentFills.length > 0) {
        const rt = buildRoundTrip(currentFills, date, symbol, sourceDir, trainingPrefix);
        if (rt) symbolRoundTrips.get(symbol)!.push(rt);
        currentFills = [];
      }
    }

    // Handle incomplete round trips (position not zero at end of day)
    if (currentFills.length > 0) {
      const rt = buildRoundTrip(currentFills, date, symbol, sourceDir);
      if (rt) symbolRoundTrips.get(symbol)!.push(rt);
    }
  }

  // Sort each symbol's round trips by entry time and assign IDs
  const allRoundTrips: RoundTrip[] = [];
  for (const [symbol, rts] of symbolRoundTrips) {
    rts.sort((a, b) => timeToMinutes(a.entry_time) - timeToMinutes(b.entry_time));
    rts.forEach((rt, i) => {
      rt.id = `${date}-${symbol}-${i + 1}`;
    });
    allRoundTrips.push(...rts);
  }

  // Sort all round trips by entry time
  allRoundTrips.sort((a, b) => timeToMinutes(a.entry_time) - timeToMinutes(b.entry_time));

  return allRoundTrips;
}

function buildRoundTrip(fills: Fill[], date: string, symbol: string, sourceDir: string, trainingPrefix: string = "TR"): RoundTrip | null {
  if (fills.length === 0) return null;

  // Determine direction from first fill
  const firstFill = fills[0];
  const side: "long" | "short" = firstFill.side === "B" ? "long" : "short";

  // Separate entry and exit fills based on direction
  const entryFills = fills.filter(f =>
    side === "long" ? f.side === "B" : (f.side === "S" || f.side === "SS")
  );
  const exitFills = fills.filter(f =>
    side === "long" ? (f.side === "S" || f.side === "SS") : f.side === "B"
  );

  // VWAP entry: sum(price * qty) / sum(qty)
  const entryNotional = entryFills.reduce((sum, f) => sum + f.price * f.qty, 0);
  const entryShares = entryFills.reduce((sum, f) => sum + f.qty, 0);
  const entry_avg = entryShares > 0 ? round2(entryNotional / entryShares) : 0;

  const exitNotional = exitFills.reduce((sum, f) => sum + f.price * f.qty, 0);
  const exitShares = exitFills.reduce((sum, f) => sum + f.qty, 0);
  const exit_avg = exitShares > 0 ? round2(exitNotional / exitShares) : 0;

  const total_shares = Math.max(entryShares, exitShares);

  // Sum P&L from all fills (DAS provides per-fill realized P&L)
  const pnl = round2(fills.reduce((sum, f) => sum + f.pnl, 0));
  const fees = round2(fills.reduce((sum, f) => sum + Math.abs(f.ecnFee), 0));
  const net_pnl = round2(pnl);  // P&L from CSV already includes fee impact

  // Times
  const entry_time = fills[0].time;
  const exit_time = fills[fills.length - 1].time;
  const duration_mins = Math.round(timeToMinutes(exit_time) - timeToMinutes(entry_time));

  // Unique accounts and account type classification
  const accounts = [...new Set(fills.map(f => f.account))];
  const hasTraining = accounts.some(a => a.startsWith(trainingPrefix));
  const hasLive = accounts.some(a => !a.startsWith(trainingPrefix));
  const account_type: "live" | "training" | "mixed" = hasTraining && hasLive
    ? "mixed" : hasTraining ? "training" : "live";

  // Try to find a chart screenshot
  const chart = findChartFile(symbol, date, sourceDir);

  return {
    id: "", // Assigned later
    ticker: symbol,
    side,
    entry_avg,
    exit_avg,
    total_shares,
    pnl,
    fees,
    net_pnl,
    fills: fills.length,
    entry_time,
    exit_time,
    duration_mins: Math.max(duration_mins, 0),
    accounts,
    account_type,
    setup: null,
    notes: null,
    chart,
  };
}

function findChartFile(symbol: string, date: string, sourceDir: string): string | null {
  if (!existsSync(sourceDir)) return null;

  try {
    const files = readdirSync(sourceDir);
    // Look for files matching SYMBOL-DATE-*.jpg or SYMBOL-*.jpg
    const match = files.find(f =>
      f.toLowerCase().startsWith(symbol.toLowerCase()) &&
      (f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"))
    );
    return match || null;
  } catch {
    return null;
  }
}

// ─── Account Breakdown Helper ────────────────────────────────────────────────

function computeAccountBreakdown(trades: RoundTrip[]): { live: AccountBreakdown; training: AccountBreakdown } {
  const live = trades.filter(t => t.account_type === "live");
  const training = trades.filter(t => t.account_type === "training");
  // "mixed" trades count toward both for awareness, but P&L goes to live
  const mixed = trades.filter(t => t.account_type === "mixed");

  const liveAll = [...live, ...mixed];
  const liveWin = liveAll.filter(t => t.net_pnl > 0).length;
  const livePnl = round2(liveAll.reduce((s, t) => s + t.net_pnl, 0));

  const trainingWin = training.filter(t => t.net_pnl > 0).length;
  const trainingLose = training.filter(t => t.net_pnl < 0).length;
  const trainingPnl = round2(training.reduce((s, t) => s + t.net_pnl, 0));

  return {
    live: {
      trades: liveAll.length,
      pnl: livePnl,
      winners: liveWin,
      losers: liveAll.filter(t => t.net_pnl < 0).length,
      win_rate: liveAll.length > 0 ? round2((liveWin / liveAll.length) * 100) : 0,
    },
    training: {
      trades: training.length,
      pnl: trainingPnl,
      winners: trainingWin,
      losers: trainingLose,
      win_rate: training.length > 0 ? round2((trainingWin / training.length) * 100) : 0,
    },
  };
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdIngest(date: string, sourceOverride: string | undefined, dryRun: boolean, outputFmt: string) {
  const { tradeReviewPath, skillDir, trainingPrefix, dbConfig } = await loadConfigAsync();
  const basePath = sourceOverride || tradeReviewPath;

  // Build path: YYYY/MM/YYYY-MM-DD
  const [year, month] = date.split("-");
  const dateDir = join(basePath, year, month, date);

  if (!existsSync(dateDir)) {
    console.error(`Trade_Review folder not found: ${dateDir}`);
    console.error(`Expected structure: ${basePath}/YYYY/MM/YYYY-MM-DD/`);
    process.exit(1);
  }

  // Read trades CSV
  const tradesFile = join(dateDir, `trades-${date}.csv`);
  if (!existsSync(tradesFile)) {
    console.error(`Trades CSV not found: ${tradesFile}`);
    console.error(`Looking for: trades-${date}.csv`);
    process.exit(1);
  }

  const tradesContent = await Bun.file(tradesFile).text();
  const fills = parseFillsCsv(tradesContent);

  if (fills.length === 0) {
    console.log(`No trades found in ${tradesFile}`);
    process.exit(0);
  }

  // Group into round trips
  const roundTrips = groupFillsIntoRoundTrips(fills, date, dateDir, trainingPrefix);

  // Build daily log
  const symbols = [...new Set(roundTrips.map(rt => rt.ticker))];
  const totalPnl = round2(roundTrips.reduce((s, rt) => s + rt.pnl, 0));
  const totalFees = round2(roundTrips.reduce((s, rt) => s + rt.fees, 0));
  const winners = roundTrips.filter(rt => rt.net_pnl > 0).length;
  const losers = roundTrips.filter(rt => rt.net_pnl < 0).length;
  const breakeven = roundTrips.filter(rt => rt.net_pnl === 0).length;
  const byAccount = computeAccountBreakdown(roundTrips);

  const dailyLog: DailyLog = {
    date,
    source: dateDir.replace(/\\/g, "/"),
    summary: {
      total_pnl: totalPnl,
      total_fees: totalFees,
      total_net_pnl: round2(totalPnl),
      total_trades: roundTrips.length,
      winners,
      losers,
      breakeven,
      win_rate: roundTrips.length > 0 ? round2((winners / roundTrips.length) * 100) : 0,
      symbols,
      by_account: byAccount,
    },
    trades: roundTrips,
  };

  // Cross-check with positions CSV
  const positionsFile = join(dateDir, `positions-${date}.csv`);
  if (existsSync(positionsFile)) {
    const posContent = await Bun.file(positionsFile).text();
    const summaryPnl = parsePositionsSummaryPnl(posContent);
    const diff = Math.abs(summaryPnl - totalPnl);
    if (diff > 0.50) {
      console.log(`[WARN] P&L discrepancy: positions summary=$${summaryPnl.toFixed(2)}, computed=$${totalPnl.toFixed(2)} (diff=$${diff.toFixed(2)})`);
    }
  }

  // Output
  if (dryRun) {
    console.log(`\n=== DRY RUN: ${date} ===\n`);
    printSummary(dailyLog);
    printTrades(dailyLog.trades);
    if (outputFmt === "json") {
      console.log("\n" + JSON.stringify(dailyLog, null, 2));
    } else if (outputFmt === "yaml") {
      console.log("\n" + yamlStringify(dailyLog));
    }
    return;
  }

  // Write YAML
  const tradeLogDir = join(skillDir, "Data", "TradeLog");
  mkdirSync(tradeLogDir, { recursive: true });
  const outputPath = join(tradeLogDir, `${date}.yaml`);
  await Bun.write(outputPath, yamlStringify(dailyLog));

  // Write to database
  const db = initDB(skillDir, dbConfig);
  if (db) {
    db.upsertFills(date, fills);
    db.upsertTrades(date, roundTrips);
    db.upsertDailySummary(dailyLog);
    db.close();
  }

  console.log(`\n=== Ingested: ${date} ===\n`);
  printSummary(dailyLog);
  printTrades(dailyLog.trades);
  console.log(`\nWritten to: ${outputPath}`);
  if (db) console.log(`Database:   ${join(skillDir, dbConfig.sqlite_path)}`);
}

interface StatsOptions {
  date?: string;
  week: boolean;
  rangeFrom?: string;
  rangeTo?: string;
  bySetup: boolean;
  byTime: boolean;
  byAccount: boolean;
  symbol?: string;
}

async function cmdStats(opts: StatsOptions) {
  const { skillDir, dbConfig } = await loadConfigAsync();
  const tradeLogDir = join(skillDir, "Data", "TradeLog");
  const db = initDB(skillDir, dbConfig);

  // Determine date range
  let fromDate: string;
  let toDate: string;
  let periodLabel: string;

  if (opts.rangeFrom && opts.rangeTo) {
    fromDate = opts.rangeFrom;
    toDate = opts.rangeTo;
    periodLabel = `${fromDate} to ${toDate}`;
  } else if (opts.week) {
    const today = new Date();
    toDate = formatDate(today);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    fromDate = formatDate(weekAgo);
    periodLabel = "Weekly";
  } else {
    const dateStr = opts.date || formatDate(new Date());
    fromDate = dateStr;
    toDate = dateStr;
    periodLabel = dateStr;
  }

  // Load trades — prefer DB, fallback to YAML
  let allTrades: RoundTrip[];
  let daysTraded: number;

  if (db) {
    const dbTrades = opts.symbol
      ? db.getTradesByDateRange(fromDate, toDate)
        .filter(t => t.ticker === opts.symbol!.toUpperCase())
      : db.getTradesByDateRange(fromDate, toDate);
    allTrades = dbTrades as RoundTrip[];
    const uniqueDates = new Set(dbTrades.map(t => t.date || t.id.slice(0, 10)));
    daysTraded = uniqueDates.size;

    // Handle analytics-only modes (DB required)
    if (opts.bySetup) {
      const stats = db.getStatsBySetup(fromDate, toDate);
      printSetupStats(stats, periodLabel);
      db.close();
      return;
    }
    if (opts.byTime) {
      const stats = db.getStatsByTimeOfDay(fromDate, toDate);
      printTimeStats(stats, periodLabel);
      db.close();
      return;
    }
    if (opts.byAccount) {
      const stats = db.getStatsByAccountType(fromDate, toDate);
      printAccountTypeStats(stats, periodLabel);
      db.close();
      return;
    }

    db.close();
  } else {
    // Fallback: load from YAML files
    if (!existsSync(tradeLogDir)) {
      console.error("No trade log directory found. Run 'ingest' first.");
      process.exit(1);
    }

    if (opts.bySetup || opts.byTime || opts.byAccount) {
      console.error("Analytics breakdowns (--by-setup, --by-time, --by-account) require the database.");
      console.error("Run 'migrate' first to populate the database from existing YAML files.");
      process.exit(1);
    }

    const logs: DailyLog[] = [];
    if (fromDate === toDate) {
      const logFile = join(tradeLogDir, `${fromDate}.yaml`);
      if (!existsSync(logFile)) {
        console.error(`No trade log for ${fromDate}. Run 'ingest -d ${fromDate}' first.`);
        process.exit(1);
      }
      const content = await Bun.file(logFile).text();
      logs.push(yamlParse(content) as DailyLog);
    } else {
      // Load each day in the range
      const current = new Date(fromDate + "T00:00:00");
      const end = new Date(toDate + "T00:00:00");
      while (current <= end) {
        const dateStr = formatDate(current);
        const logFile = join(tradeLogDir, `${dateStr}.yaml`);
        if (existsSync(logFile)) {
          const content = await Bun.file(logFile).text();
          logs.push(yamlParse(content) as DailyLog);
        }
        current.setDate(current.getDate() + 1);
      }
    }

    if (logs.length === 0) {
      console.log("No trade logs found for the specified period.");
      process.exit(0);
    }

    allTrades = logs.flatMap(l => l.trades);
    if (opts.symbol) {
      allTrades = allTrades.filter(t => t.ticker === opts.symbol!.toUpperCase());
    }
    daysTraded = logs.length;
  }

  if (allTrades.length === 0) {
    console.log("No trades found for the specified period.");
    process.exit(0);
  }

  // Aggregate stats
  const totalPnl = round2(allTrades.reduce((s, t) => s + t.net_pnl, 0));
  const totalFees = round2(allTrades.reduce((s, t) => s + t.fees, 0));
  const winners = allTrades.filter(t => t.net_pnl > 0);
  const losers = allTrades.filter(t => t.net_pnl < 0);
  const avgWin = winners.length > 0 ? round2(winners.reduce((s, t) => s + t.net_pnl, 0) / winners.length) : 0;
  const avgLoss = losers.length > 0 ? round2(losers.reduce((s, t) => s + t.net_pnl, 0) / losers.length) : 0;
  const profitFactor = Math.abs(avgLoss) > 0
    ? round2(winners.reduce((s, t) => s + t.net_pnl, 0) / Math.abs(losers.reduce((s, t) => s + t.net_pnl, 0)))
    : Infinity;

  console.log(`\n=== ${periodLabel} Stats ===\n`);
  if (opts.symbol) console.log(`  Symbol:         ${opts.symbol.toUpperCase()}`);
  console.log(`  Days traded:    ${daysTraded}`);
  console.log(`  Total trades:   ${allTrades.length}`);
  console.log(`  Total P&L:      $${totalPnl.toFixed(2)}`);
  console.log(`  Total fees:     $${totalFees.toFixed(2)}`);
  console.log(`  Win rate:       ${allTrades.length > 0 ? ((winners.length / allTrades.length) * 100).toFixed(1) : 0}%`);
  console.log(`  Winners:        ${winners.length}`);
  console.log(`  Losers:         ${losers.length}`);
  console.log(`  Avg win:        $${avgWin.toFixed(2)}`);
  console.log(`  Avg loss:       $${avgLoss.toFixed(2)}`);
  console.log(`  Profit factor:  ${profitFactor === Infinity ? "N/A (no losers)" : profitFactor.toFixed(2)}`);

  // Account breakdown
  const byAccountData = computeAccountBreakdown(allTrades);
  if (byAccountData.live.trades > 0 || byAccountData.training.trades > 0) {
    console.log(`\n  By account:`);
    if (byAccountData.live.trades > 0) {
      const sign = byAccountData.live.pnl >= 0 ? "+" : "";
      console.log(`    LIVE:      ${byAccountData.live.trades} trades  ${sign}$${byAccountData.live.pnl.toFixed(2)}  (${byAccountData.live.win_rate.toFixed(0)}% win rate)`);
    }
    if (byAccountData.training.trades > 0) {
      const sign = byAccountData.training.pnl >= 0 ? "+" : "";
      console.log(`    TRAINING:  ${byAccountData.training.trades} trades  ${sign}$${byAccountData.training.pnl.toFixed(2)}  (${byAccountData.training.win_rate.toFixed(0)}% win rate)`);
    }
  }

  // Per-symbol breakdown
  const bySymbol = new Map<string, { pnl: number; count: number }>();
  for (const t of allTrades) {
    const entry = bySymbol.get(t.ticker) || { pnl: 0, count: 0 };
    entry.pnl = round2(entry.pnl + t.net_pnl);
    entry.count++;
    bySymbol.set(t.ticker, entry);
  }

  console.log(`\n  Per-symbol breakdown:`);
  for (const [sym, data] of [...bySymbol.entries()].sort((a, b) => b[1].pnl - a[1].pnl)) {
    const sign = data.pnl >= 0 ? "+" : "";
    console.log(`    ${sym.padEnd(8)} ${data.count} trades  ${sign}$${data.pnl.toFixed(2)}`);
  }
}

function printSetupStats(stats: SetupStats[], period: string) {
  console.log(`\n=== Stats by Setup: ${period} ===\n`);
  console.log("  " + [
    "Setup".padEnd(22),
    "Trades".padEnd(8),
    "P&L".padEnd(12),
    "Avg P&L".padEnd(12),
    "Win%".padEnd(8),
    "W/L",
  ].join(""));
  console.log("  " + "-".repeat(70));
  for (const s of stats) {
    const sign = s.total_pnl >= 0 ? "+" : "";
    const avgSign = s.avg_pnl >= 0 ? "+" : "";
    console.log("  " + [
      s.setup.padEnd(22),
      String(s.trades).padEnd(8),
      `${sign}$${s.total_pnl.toFixed(2)}`.padEnd(12),
      `${avgSign}$${s.avg_pnl.toFixed(2)}`.padEnd(12),
      `${s.win_rate.toFixed(0)}%`.padEnd(8),
      `${s.winners}/${s.losers}`,
    ].join(""));
  }
  console.log("  " + "-".repeat(70));
}

function printTimeStats(stats: TimeStats[], period: string) {
  console.log(`\n=== Stats by Time of Day: ${period} ===\n`);
  console.log("  " + [
    "Window".padEnd(16),
    "Trades".padEnd(8),
    "P&L".padEnd(12),
    "Avg P&L".padEnd(12),
    "Win%".padEnd(8),
    "W/L",
  ].join(""));
  console.log("  " + "-".repeat(64));
  for (const s of stats) {
    const sign = s.total_pnl >= 0 ? "+" : "";
    const avgSign = s.avg_pnl >= 0 ? "+" : "";
    console.log("  " + [
      s.bucket.padEnd(16),
      String(s.trades).padEnd(8),
      `${sign}$${s.total_pnl.toFixed(2)}`.padEnd(12),
      `${avgSign}$${s.avg_pnl.toFixed(2)}`.padEnd(12),
      `${s.win_rate.toFixed(0)}%`.padEnd(8),
      `${s.winners}/${s.losers}`,
    ].join(""));
  }
  console.log("  " + "-".repeat(64));
}

function printAccountTypeStats(stats: AccountTypeStats[], period: string) {
  console.log(`\n=== Stats by Account Type: ${period} ===\n`);
  console.log("  " + [
    "Type".padEnd(12),
    "Trades".padEnd(8),
    "P&L".padEnd(12),
    "Avg P&L".padEnd(12),
    "Win%".padEnd(8),
    "W/L",
  ].join(""));
  console.log("  " + "-".repeat(60));
  for (const s of stats) {
    const sign = s.total_pnl >= 0 ? "+" : "";
    const avgSign = s.avg_pnl >= 0 ? "+" : "";
    console.log("  " + [
      s.account_type.toUpperCase().padEnd(12),
      String(s.trades).padEnd(8),
      `${sign}$${s.total_pnl.toFixed(2)}`.padEnd(12),
      `${avgSign}$${s.avg_pnl.toFixed(2)}`.padEnd(12),
      `${s.win_rate.toFixed(0)}%`.padEnd(8),
      `${s.winners}/${s.losers}`,
    ].join(""));
  }
  console.log("  " + "-".repeat(60));
}

async function cmdReview(date: string | undefined) {
  const { skillDir, dbConfig } = await loadConfigAsync();
  const dateStr = date || formatDate(new Date());
  const db = initDB(skillDir, dbConfig);

  let log: DailyLog;

  if (db) {
    const trades = db.getTradesByDate(dateStr);
    const summary = db.getDailySummary(dateStr);
    if (trades.length === 0) {
      db.close();
      console.error(`No trades in database for ${dateStr}. Run 'ingest -d ${dateStr}' first.`);
      process.exit(1);
    }
    log = {
      date: dateStr,
      source: summary?.source || "database",
      summary: summary ? {
        total_pnl: summary.total_pnl,
        total_fees: summary.total_fees,
        total_net_pnl: summary.total_net_pnl,
        total_trades: summary.total_trades,
        winners: summary.winners,
        losers: summary.losers,
        breakeven: summary.breakeven,
        win_rate: summary.win_rate,
        symbols: summary.symbols,
        by_account: {
          live: { trades: summary.live_trades, pnl: summary.live_pnl, winners: 0, losers: 0, win_rate: summary.live_win_rate },
          training: { trades: summary.training_trades, pnl: summary.training_pnl, winners: 0, losers: 0, win_rate: summary.training_win_rate },
        },
      } : buildSummaryFromTrades(dateStr, trades as RoundTrip[]),
      trades: trades as RoundTrip[],
    };
    db.close();
  } else {
    const tradeLogDir = join(skillDir, "Data", "TradeLog");
    const logFile = join(tradeLogDir, `${dateStr}.yaml`);
    if (!existsSync(logFile)) {
      console.error(`No trade log for ${dateStr}. Run 'ingest -d ${dateStr}' first.`);
      process.exit(1);
    }
    const content = await Bun.file(logFile).text();
    log = yamlParse(content) as DailyLog;
  }

  console.log(`\n=== Session Review: ${dateStr} ===\n`);
  printSummary(log);

  // Best and worst trades
  const sorted = [...log.trades].sort((a, b) => b.net_pnl - a.net_pnl);

  if (sorted.length > 0) {
    console.log(`\n  Best trade:  ${sorted[0].id} (${sorted[0].ticker}) +$${sorted[0].net_pnl.toFixed(2)}`);
    console.log(`  Worst trade: ${sorted[sorted.length - 1].id} (${sorted[sorted.length - 1].ticker}) $${sorted[sorted.length - 1].net_pnl.toFixed(2)}`);
  }

  // Setup breakdown
  const bySetup = new Map<string, { count: number; pnl: number }>();
  for (const t of log.trades) {
    const setup = t.setup || "(untagged)";
    const entry = bySetup.get(setup) || { count: 0, pnl: 0 };
    entry.count++;
    entry.pnl = round2(entry.pnl + t.net_pnl);
    bySetup.set(setup, entry);
  }

  console.log(`\n  Setup breakdown:`);
  for (const [setup, data] of bySetup) {
    const sign = data.pnl >= 0 ? "+" : "";
    console.log(`    ${setup.padEnd(20)} ${data.count} trades  ${sign}$${data.pnl.toFixed(2)}`);
  }

  // Print all trades
  console.log("");
  printTrades(log.trades);

  // SMB Reflection prompts
  console.log(`\n  === SMB Capital Reflection Questions ===`);
  console.log(`  1. What was your best trade today and why?`);
  console.log(`  2. What was your worst trade today and why?`);
  console.log(`  3. Did you follow your playbook on every trade?`);
  console.log(`  4. What is the one thing you will improve tomorrow?`);
  console.log(`  5. Did you honor your stops and risk rules?`);
  console.log(`  6. Rate your discipline today (1-10):`);
}

async function cmdList(date: string | undefined) {
  const { skillDir, dbConfig } = await loadConfigAsync();
  const dateStr = date || formatDate(new Date());
  const db = initDB(skillDir, dbConfig);

  let trades: RoundTrip[];

  if (db) {
    trades = db.getTradesByDate(dateStr) as RoundTrip[];
    db.close();
    if (trades.length === 0) {
      console.error(`No trades in database for ${dateStr}. Run 'ingest -d ${dateStr}' first.`);
      process.exit(1);
    }
  } else {
    const tradeLogDir = join(skillDir, "Data", "TradeLog");
    const logFile = join(tradeLogDir, `${dateStr}.yaml`);
    if (!existsSync(logFile)) {
      console.error(`No trade log for ${dateStr}. Run 'ingest -d ${dateStr}' first.`);
      process.exit(1);
    }
    const content = await Bun.file(logFile).text();
    const log = yamlParse(content) as DailyLog;
    trades = log.trades;
  }

  console.log(`\n=== Trades: ${dateStr} ===\n`);
  printTrades(trades);
}

async function cmdLog(
  ticker: string,
  side: string,
  entry: number,
  exit: number,
  shares: number,
  stop: number | undefined,
  setup: string | undefined,
  notes: string | undefined,
) {
  const { skillDir, dbConfig } = await loadConfigAsync();
  const date = formatDate(new Date());
  const tradeLogDir = join(skillDir, "Data", "TradeLog");
  mkdirSync(tradeLogDir, { recursive: true });

  const logFile = join(tradeLogDir, `${date}.yaml`);
  let log: DailyLog;

  if (existsSync(logFile)) {
    const content = await Bun.file(logFile).text();
    log = yamlParse(content) as DailyLog;
  } else {
    log = {
      date,
      source: "manual",
      summary: {
        total_pnl: 0, total_fees: 0, total_net_pnl: 0,
        total_trades: 0, winners: 0, losers: 0, breakeven: 0,
        win_rate: 0, symbols: [],
        by_account: {
          live: { trades: 0, pnl: 0, winners: 0, losers: 0, win_rate: 0 },
          training: { trades: 0, pnl: 0, winners: 0, losers: 0, win_rate: 0 },
        },
      },
      trades: [],
    };
  }

  const sideTyped: "long" | "short" = side === "short" ? "short" : "long";
  const pnl = sideTyped === "long"
    ? round2((exit - entry) * shares)
    : round2((entry - exit) * shares);

  const existingCount = log.trades.filter(t => t.ticker === ticker.toUpperCase()).length;
  const newTrade: RoundTrip = {
    id: `${date}-${ticker.toUpperCase()}-${existingCount + 1}`,
    ticker: ticker.toUpperCase(),
    side: sideTyped,
    entry_avg: entry,
    exit_avg: exit,
    total_shares: shares,
    pnl,
    fees: 0,
    net_pnl: pnl,
    fills: 0,
    entry_time: new Date().toTimeString().slice(0, 8),
    exit_time: new Date().toTimeString().slice(0, 8),
    duration_mins: 0,
    accounts: ["manual"],
    account_type: "live" as const,
    setup: setup || null,
    notes: notes || null,
    chart: null,
  };

  log.trades.push(newTrade);

  // Recompute summary
  const allPnl = round2(log.trades.reduce((s, t) => s + t.net_pnl, 0));
  const allFees = round2(log.trades.reduce((s, t) => s + t.fees, 0));
  const w = log.trades.filter(t => t.net_pnl > 0).length;
  const l = log.trades.filter(t => t.net_pnl < 0).length;
  const be = log.trades.filter(t => t.net_pnl === 0).length;

  log.summary = {
    total_pnl: allPnl,
    total_fees: allFees,
    total_net_pnl: allPnl,
    total_trades: log.trades.length,
    winners: w,
    losers: l,
    breakeven: be,
    win_rate: log.trades.length > 0 ? round2((w / log.trades.length) * 100) : 0,
    symbols: [...new Set(log.trades.map(t => t.ticker))],
  };

  await Bun.write(logFile, yamlStringify(log));

  // Write to database
  const db = initDB(skillDir, dbConfig);
  if (db) {
    db.upsertTrades(date, [newTrade]);
    db.upsertDailySummary(log);
    db.close();
  }

  console.log(`\nLogged: ${newTrade.id}`);
  console.log(`  ${sideTyped.toUpperCase()} ${shares} ${ticker.toUpperCase()} @ ${entry} \u2192 ${exit}`);
  console.log(`  P&L: $${pnl.toFixed(2)}`);
  console.log(`\nWritten to: ${logFile}`);
}

// ─── Migrate & Export ─────────────────────────────────────────────────────────

function buildSummaryFromTrades(date: string, trades: RoundTrip[]): DailyLog["summary"] {
  const totalPnl = round2(trades.reduce((s, t) => s + t.pnl, 0));
  const totalFees = round2(trades.reduce((s, t) => s + t.fees, 0));
  const winners = trades.filter(t => t.net_pnl > 0).length;
  const losers = trades.filter(t => t.net_pnl < 0).length;
  const breakeven = trades.filter(t => t.net_pnl === 0).length;
  const byAccount = computeAccountBreakdown(trades);

  return {
    total_pnl: totalPnl,
    total_fees: totalFees,
    total_net_pnl: round2(totalPnl),
    total_trades: trades.length,
    winners,
    losers,
    breakeven,
    win_rate: trades.length > 0 ? round2((winners / trades.length) * 100) : 0,
    symbols: [...new Set(trades.map(t => t.ticker))],
    by_account: byAccount,
  };
}

async function cmdMigrate() {
  const { skillDir, dbConfig } = await loadConfigAsync();
  const tradeLogDir = join(skillDir, "Data", "TradeLog");

  if (!existsSync(tradeLogDir)) {
    console.error("No TradeLog directory found. Nothing to migrate.");
    process.exit(1);
  }

  const db = initDB(skillDir, dbConfig);
  if (!db) {
    console.error("Database not configured. Check RiskRules.yaml database section.");
    process.exit(1);
  }

  // Find all YAML files in TradeLog directory
  const files = readdirSync(tradeLogDir).filter(f => f.endsWith(".yaml"));
  if (files.length === 0) {
    console.log("No YAML files found in TradeLog directory.");
    db.close();
    process.exit(0);
  }

  console.log(`\n=== Migrating ${files.length} YAML files to database ===\n`);

  let totalTrades = 0;
  let totalDays = 0;

  for (const file of files.sort()) {
    const filePath = join(tradeLogDir, file);
    const content = await Bun.file(filePath).text();
    const log = yamlParse(content) as DailyLog;

    if (!log.date || !log.trades) {
      console.log(`  SKIP  ${file} (invalid format)`);
      continue;
    }

    db.upsertTrades(log.date, log.trades);
    db.upsertDailySummary(log);
    totalTrades += log.trades.length;
    totalDays++;
    console.log(`  OK    ${file} — ${log.trades.length} trades`);
  }

  db.close();

  console.log(`\n  Migrated: ${totalDays} days, ${totalTrades} trades`);
  console.log(`  Database: ${join(skillDir, dbConfig.sqlite_path)}`);
}

async function cmdExport(date: string | undefined) {
  const { skillDir, dbConfig } = await loadConfigAsync();

  const db = initDB(skillDir, dbConfig);
  if (!db) {
    console.error("Database not configured. Check RiskRules.yaml database section.");
    process.exit(1);
  }

  const dateStr = date || formatDate(new Date());
  const trades = db.getTradesByDate(dateStr) as RoundTrip[];
  const summary = db.getDailySummary(dateStr);

  if (trades.length === 0) {
    console.error(`No trades in database for ${dateStr}.`);
    db.close();
    process.exit(1);
  }

  const dailyLog: DailyLog = {
    date: dateStr,
    source: summary?.source || "database-export",
    summary: summary ? {
      total_pnl: summary.total_pnl,
      total_fees: summary.total_fees,
      total_net_pnl: summary.total_net_pnl,
      total_trades: summary.total_trades,
      winners: summary.winners,
      losers: summary.losers,
      breakeven: summary.breakeven,
      win_rate: summary.win_rate,
      symbols: summary.symbols,
      by_account: {
        live: { trades: summary.live_trades, pnl: summary.live_pnl, winners: 0, losers: 0, win_rate: summary.live_win_rate },
        training: { trades: summary.training_trades, pnl: summary.training_pnl, winners: 0, losers: 0, win_rate: summary.training_win_rate },
      },
    } : buildSummaryFromTrades(dateStr, trades),
    trades,
  };

  db.close();

  const tradeLogDir = join(skillDir, "Data", "TradeLog");
  mkdirSync(tradeLogDir, { recursive: true });
  const outputPath = join(tradeLogDir, `${dateStr}.yaml`);
  await Bun.write(outputPath, yamlStringify(dailyLog));

  console.log(`\nExported ${trades.length} trades for ${dateStr}`);
  console.log(`Written to: ${outputPath}`);
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

function printSummary(log: DailyLog) {
  const s = log.summary;
  console.log(`  Date:          ${log.date}`);
  console.log(`  Source:        ${log.source}`);
  console.log(`  Symbols:       ${s.symbols.join(", ")}`);
  console.log(`  Total trades:  ${s.total_trades}`);
  console.log(`  Total P&L:     $${s.total_pnl.toFixed(2)}`);
  console.log(`  Win rate:      ${s.win_rate.toFixed(1)}% (${s.winners}W / ${s.losers}L / ${s.breakeven}BE)`);

  // Account breakdown
  if (s.by_account) {
    const { live, training } = s.by_account;
    if (live.trades > 0 || training.trades > 0) {
      console.log(`\n  By account:`);
      if (live.trades > 0) {
        const sign = live.pnl >= 0 ? "+" : "";
        console.log(`    LIVE:      ${live.trades} trades  ${sign}$${live.pnl.toFixed(2)}  (${live.win_rate.toFixed(0)}% win rate)`);
      }
      if (training.trades > 0) {
        const sign = training.pnl >= 0 ? "+" : "";
        console.log(`    TRAINING:  ${training.trades} trades  ${sign}$${training.pnl.toFixed(2)}  (${training.win_rate.toFixed(0)}% win rate)`);
      }
    }
  }
}

function printTrades(trades: RoundTrip[]) {
  console.log("  Trades:");
  console.log("  " + "-".repeat(100));
  console.log("  " + [
    "ID".padEnd(22),
    "Acct".padEnd(6),
    "Side".padEnd(6),
    "Shares".padEnd(8),
    "Entry".padEnd(10),
    "Exit".padEnd(10),
    "P&L".padEnd(12),
    "Time".padEnd(15),
    "Setup",
  ].join(""));
  console.log("  " + "-".repeat(100));

  for (const t of trades) {
    const pnlStr = (t.net_pnl >= 0 ? "+" : "") + "$" + t.net_pnl.toFixed(2);
    const timeStr = `${t.entry_time}-${t.exit_time}`;
    const acctTag = t.account_type === "training" ? "TRAIN" : t.account_type === "mixed" ? "MIX" : "LIVE";
    console.log("  " + [
      t.id.padEnd(22),
      acctTag.padEnd(6),
      t.side.padEnd(6),
      String(t.total_shares).padEnd(8),
      t.entry_avg.toFixed(2).padEnd(10),
      t.exit_avg.toFixed(2).padEnd(10),
      pnlStr.padEnd(12),
      timeStr.padEnd(15),
      t.setup || "",
    ].join(""));
  }
  console.log("  " + "-".repeat(100));
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadConfigAsync(): Promise<{
  tradeReviewPath: string;
  skillDir: string;
  trainingPrefix: string;
  dbConfig: DBConfig;
}> {
  const skillDir = getSkillDir();
  const riskRulesPath = join(skillDir, "Data", "RiskRules.yaml");

  let tradeReviewPath = "C:/Users/David/OneDrive/Documents/Trade_Review";
  let trainingPrefix = "TR";
  let dbConfig: DBConfig = {
    provider: "sqlite",
    sqlite_path: "Data/trades.db",
    postgres_url: "",
  };

  if (existsSync(riskRulesPath)) {
    const content = await Bun.file(riskRulesPath).text();
    const rules = yamlParse(content);
    if (rules?.config?.trade_review_path) {
      tradeReviewPath = rules.config.trade_review_path;
    }
    if (rules?.config?.training_account_prefix) {
      trainingPrefix = rules.config.training_account_prefix;
    }
    if (rules?.database) {
      dbConfig = {
        provider: rules.database.provider || "sqlite",
        sqlite_path: rules.database.sqlite_path || "Data/trades.db",
        postgres_url: rules.database.postgres_url || "",
      };
    }
  }

  return { tradeReviewPath, skillDir, trainingPrefix, dbConfig };
}

function initDB(skillDir: string, dbConfig: DBConfig): TradeDB | null {
  if (dbConfig.provider !== "sqlite") return null;
  const dbPath = join(skillDir, dbConfig.sqlite_path);
  return new TradeDB(dbPath);
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
TradeLogger — Ingest broker CSVs, compute stats, generate reviews

Usage:
  bun run TradeLogger.ts <command> [options]

Commands:
  ingest    Ingest broker CSV from Trade_Review folder into YAML + database
  stats     Show daily/weekly/range statistics (P&L, win rate, profit factor)
  review    Generate end-of-day review with SMB reflection questions
  list      List trades for a date
  log       Manual trade entry (fallback if no broker export)
  migrate   Import existing YAML trade logs into the database
  export    Export database data to YAML (backup/portability)

Options for 'ingest':
  -d, --date <YYYY-MM-DD>    Date to ingest (defaults to today)
  --source <path>             Trade_Review base dir (overrides config)
  --dry-run                   Parse and show results without writing
  -o, --output <fmt>          Output format: text (default), json, yaml

Options for 'stats':
  -d, --date <YYYY-MM-DD>    Date (defaults to today)
  --week                      Show weekly aggregate stats
  --range <from> <to>         Custom date range (YYYY-MM-DD YYYY-MM-DD)
  --by-setup                  Breakdown by playbook setup (requires DB)
  --by-time                   Breakdown by time-of-day buckets (requires DB)
  --by-account                Breakdown by live vs training (requires DB)
  --symbol <TICKER>           Filter stats to a single symbol

Options for 'review':
  -d, --date <YYYY-MM-DD>    Date (defaults to today)

Options for 'list':
  -d, --date <YYYY-MM-DD>    Date (defaults to today)

Options for 'log':
  -t, --ticker <TICKER>       Stock ticker (required)
  --side <long|short>          Trade direction (default: long)
  --entry <price>              Entry price (required)
  --exit <price>               Exit price (required)
  --shares <qty>               Number of shares (required)
  --stop <price>               Stop price (optional)
  --setup <name>               Playbook setup name (optional)
  --notes <text>               Trade notes (optional)

Options for 'export':
  -d, --date <YYYY-MM-DD>    Date to export (defaults to today)

Examples:
  bun run TradeLogger.ts ingest -d 2026-02-10
  bun run TradeLogger.ts ingest -d 2026-02-10 --dry-run
  bun run TradeLogger.ts stats -d 2026-02-10
  bun run TradeLogger.ts stats --week
  bun run TradeLogger.ts stats --range 2026-02-01 2026-02-10
  bun run TradeLogger.ts stats --by-setup
  bun run TradeLogger.ts stats --by-time --range 2026-01-01 2026-02-10
  bun run TradeLogger.ts stats --symbol DDOG
  bun run TradeLogger.ts review -d 2026-02-10
  bun run TradeLogger.ts list -d 2026-02-10
  bun run TradeLogger.ts log -t AAPL --side long --entry 150 --exit 152.50 --shares 100
  bun run TradeLogger.ts migrate
  bun run TradeLogger.ts export -d 2026-02-10
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  // Remove command from args for parseArgs
  const restArgs = args.slice(1);

  switch (command) {
    case "ingest": {
      const { values } = parseArgs({
        args: restArgs,
        options: {
          date: { type: "string", short: "d" },
          source: { type: "string" },
          "dry-run": { type: "boolean", default: false },
          output: { type: "string", short: "o", default: "text" },
        },
        allowPositionals: false,
      });
      await cmdIngest(
        values.date || formatDate(new Date()),
        values.source,
        values["dry-run"] || false,
        values.output || "text",
      );
      break;
    }

    case "stats": {
      const { values, positionals } = parseArgs({
        args: restArgs,
        options: {
          date: { type: "string", short: "d" },
          week: { type: "boolean", default: false },
          range: { type: "string", multiple: true },
          "by-setup": { type: "boolean", default: false },
          "by-time": { type: "boolean", default: false },
          "by-account": { type: "boolean", default: false },
          symbol: { type: "string" },
        },
        allowPositionals: true,
      });

      // Parse --range: accepts either --range FROM TO or --range FROM --range TO
      let rangeFrom: string | undefined;
      let rangeTo: string | undefined;
      if (values.range && values.range.length >= 2) {
        rangeFrom = values.range[0];
        rangeTo = values.range[1];
      } else if (values.range && values.range.length === 1) {
        rangeFrom = values.range[0];
        rangeTo = positionals[0]; // second value as positional
      }

      await cmdStats({
        date: values.date,
        week: values.week || false,
        rangeFrom,
        rangeTo,
        bySetup: values["by-setup"] || false,
        byTime: values["by-time"] || false,
        byAccount: values["by-account"] || false,
        symbol: values.symbol,
      });
      break;
    }

    case "review": {
      const { values } = parseArgs({
        args: restArgs,
        options: {
          date: { type: "string", short: "d" },
        },
        allowPositionals: false,
      });
      await cmdReview(values.date);
      break;
    }

    case "list": {
      const { values } = parseArgs({
        args: restArgs,
        options: {
          date: { type: "string", short: "d" },
        },
        allowPositionals: false,
      });
      await cmdList(values.date);
      break;
    }

    case "log": {
      const { values } = parseArgs({
        args: restArgs,
        options: {
          ticker: { type: "string", short: "t" },
          side: { type: "string", default: "long" },
          entry: { type: "string" },
          exit: { type: "string" },
          shares: { type: "string" },
          stop: { type: "string" },
          setup: { type: "string" },
          notes: { type: "string" },
        },
        allowPositionals: false,
      });

      if (!values.ticker || !values.entry || !values.exit || !values.shares) {
        console.error("Missing required options: --ticker, --entry, --exit, --shares");
        process.exit(1);
      }

      await cmdLog(
        values.ticker,
        values.side || "long",
        parseFloat(values.entry),
        parseFloat(values.exit),
        parseInt(values.shares, 10),
        values.stop ? parseFloat(values.stop) : undefined,
        values.setup,
        values.notes,
      );
      break;
    }

    case "migrate": {
      await cmdMigrate();
      break;
    }

    case "export": {
      const { values } = parseArgs({
        args: restArgs,
        options: {
          date: { type: "string", short: "d" },
        },
        allowPositionals: false,
      });
      await cmdExport(values.date);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

await main();
