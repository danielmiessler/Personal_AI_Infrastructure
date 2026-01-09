/**
 * Enhanced Insider Transaction Analysis
 *
 * Provides context-aware insider transaction analysis:
 * - Who is buying/selling (CEO vs random VP)
 * - Transaction patterns (one-off vs systematic)
 * - Buy/sell ratios over time
 * - Signals that actually matter vs noise
 *
 * Key insight: Not all insider transactions are meaningful.
 * - 10b5-1 planned sales = often noise
 * - Discretionary purchases by executives = strong signal
 * - CEO buying = very bullish
 * - Multiple executives selling = concerning
 */

import type { InsiderTransaction } from './types';

// =============================================================================
// Types
// =============================================================================

export type InsiderRole = 'CEO' | 'CFO' | 'COO' | 'DIRECTOR' | 'VP' | 'OFFICER' | 'MAJOR_SHAREHOLDER' | 'OTHER';

export type TransactionSignificance = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOISE';

export interface EnhancedInsiderTransaction extends InsiderTransaction {
  /** Inferred role of the insider */
  role: InsiderRole;
  /** How significant this transaction is */
  significance: TransactionSignificance;
  /** Percentage of holdings traded */
  percentOfHoldings?: number;
  /** Is this likely a planned 10b5-1 sale? */
  likelyPlanned: boolean;
  /** Context notes explaining the transaction */
  context: string;
}

export interface InsiderSentiment {
  /** Overall sentiment: bullish, bearish, or neutral */
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
  /** Confidence in the sentiment (0-100) */
  confidence: number;
  /** Summary of insider activity */
  summary: string;
  /** Detailed findings */
  findings: string[];
  /** Key transactions worth noting */
  keyTransactions: EnhancedInsiderTransaction[];
  /** Statistics */
  stats: {
    totalBuys: number;
    totalSells: number;
    buyValue: number;
    sellValue: number;
    uniqueBuyers: number;
    uniqueSellers: number;
    executiveBuys: number;
    executiveSells: number;
    lastBuyDate?: Date;
    lastSellDate?: Date;
  };
}

// =============================================================================
// Role Detection
// =============================================================================

/**
 * Infer insider role from name and title
 */
function inferRole(name: string, title: string): InsiderRole {
  const combined = `${name} ${title}`.toLowerCase();

  // C-Suite
  if (combined.includes('chief executive') || combined.includes('ceo') || combined.includes('president')) {
    return 'CEO';
  }
  if (combined.includes('chief financial') || combined.includes('cfo') || combined.includes('treasurer')) {
    return 'CFO';
  }
  if (combined.includes('chief operating') || combined.includes('coo')) {
    return 'COO';
  }

  // Directors
  if (combined.includes('director') || combined.includes('board')) {
    return 'DIRECTOR';
  }

  // VPs and Officers
  if (combined.includes('vice president') || combined.includes('vp ') || combined.includes(' vp')) {
    return 'VP';
  }
  if (combined.includes('officer') || combined.includes('secretary') || combined.includes('controller')) {
    return 'OFFICER';
  }

  // Major shareholders
  if (combined.includes('10% owner') || combined.includes('beneficial owner') || combined.includes('shareholder')) {
    return 'MAJOR_SHAREHOLDER';
  }

  return 'OTHER';
}

/**
 * Calculate significance of a transaction
 */
function calculateSignificance(
  transaction: InsiderTransaction,
  role: InsiderRole,
  percentOfHoldings?: number
): TransactionSignificance {
  const { transactionType, value } = transaction;

  // Purchases are generally more significant than sales
  // (Sales can be for many reasons; purchases are almost always bullish)
  const isPurchase = transactionType === 'BUY';

  // C-Suite transactions are most significant
  const isExecutive = role === 'CEO' || role === 'CFO' || role === 'COO';
  const isDirector = role === 'DIRECTOR';

  // Large transactions are more significant
  const isLargeValue = value > 100000;
  const isVeryLarge = value > 500000;

  // Large percentage trades are significant
  const isLargePercent = percentOfHoldings !== undefined && percentOfHoldings > 10;

  // Score the significance
  if (isPurchase) {
    // Purchases are almost always meaningful
    if (isExecutive || isVeryLarge) return 'HIGH';
    if (isDirector || isLargeValue) return 'MEDIUM';
    return 'LOW';
  } else {
    // Sales need more context
    if (isExecutive && (isLargePercent || isVeryLarge)) return 'HIGH';
    if (isDirector && isLargePercent) return 'MEDIUM';
    if (isLargePercent && isLargeValue) return 'MEDIUM';
    // Most sales are noise (tax, diversification, 10b5-1 plans)
    return 'LOW';
  }
}

/**
 * Detect if a sale is likely a planned 10b5-1 sale
 * These are pre-scheduled and don't indicate insider sentiment
 */
function isLikelyPlannedSale(
  transaction: InsiderTransaction,
  allTransactions: InsiderTransaction[]
): boolean {
  if (transaction.transactionType !== 'SELL') return false;

  // Look for patterns suggesting 10b5-1 plan:
  // 1. Regular, predictable sales (same person, similar amounts, regular intervals)
  // 2. Sales at round numbers
  // 3. Sales that happen regardless of price movements

  const samePersonTxns = allTransactions.filter(
    t => t.name === transaction.name && t.transactionType === 'SELL'
  );

  // If this person sells frequently (3+ times in data), likely planned
  if (samePersonTxns.length >= 3) {
    return true;
  }

  // If shares are a round number, might be planned
  if (transaction.shares % 1000 === 0 && transaction.shares > 0) {
    return true;
  }

  return false;
}

/**
 * Generate context explanation for a transaction
 */
function generateContext(
  transaction: EnhancedInsiderTransaction,
  allTransactions: InsiderTransaction[]
): string {
  const { role, transactionType, significance, likelyPlanned, value, shares, name } = transaction;

  const parts: string[] = [];

  // Who
  parts.push(`${name} (${role})`);

  // What
  if (transactionType === 'BUY') {
    parts.push(`purchased ${shares.toLocaleString()} shares ($${value.toLocaleString()})`);
  } else {
    parts.push(`sold ${shares.toLocaleString()} shares ($${value.toLocaleString()})`);
  }

  // Why it matters (or doesn't)
  if (transactionType === 'BUY') {
    if (role === 'CEO' || role === 'CFO') {
      parts.push('- BULLISH: Executive buying with their own money indicates confidence');
    } else if (role === 'DIRECTOR') {
      parts.push('- Positive: Board member showing confidence');
    }
  } else {
    if (likelyPlanned) {
      parts.push('- Likely 10b5-1 planned sale (low significance)');
    } else if (significance === 'HIGH') {
      parts.push('- CONCERNING: Large discretionary sale by executive');
    } else {
      parts.push('- Common: May be for taxes, diversification, or personal reasons');
    }
  }

  return parts.join(' ');
}

// =============================================================================
// Main Analysis
// =============================================================================

/**
 * Analyze insider transactions with full context
 */
export function analyzeInsiderTransactions(
  transactions: InsiderTransaction[],
  lookbackMonths: number = 6
): InsiderSentiment {
  // Filter to recent transactions
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  const recentTxns = transactions.filter(t => new Date(t.date) >= cutoffDate);

  if (recentTxns.length === 0) {
    return {
      sentiment: 'NEUTRAL',
      confidence: 30,
      summary: 'No insider transactions in the past 6 months',
      findings: ['Insufficient insider activity data'],
      keyTransactions: [],
      stats: {
        totalBuys: 0,
        totalSells: 0,
        buyValue: 0,
        sellValue: 0,
        uniqueBuyers: 0,
        uniqueSellers: 0,
        executiveBuys: 0,
        executiveSells: 0,
      },
    };
  }

  // Enhance transactions with context
  const enhanced: EnhancedInsiderTransaction[] = recentTxns.map(t => {
    const role = inferRole(t.name, t.title);
    const percentOfHoldings = t.sharesOwnedAfter
      ? (t.shares / (t.shares + t.sharesOwnedAfter)) * 100
      : undefined;
    const significance = calculateSignificance(t, role, percentOfHoldings);
    const likelyPlanned = isLikelyPlannedSale(t, transactions);

    const enhancedTxn: EnhancedInsiderTransaction = {
      ...t,
      role,
      significance,
      percentOfHoldings,
      likelyPlanned,
      context: '', // Will be filled in below
    };

    enhancedTxn.context = generateContext(enhancedTxn, transactions);
    return enhancedTxn;
  });

  // Calculate statistics
  const buys = enhanced.filter(t => t.transactionType === 'BUY');
  const sells = enhanced.filter(t => t.transactionType === 'SELL');
  const executiveRoles: InsiderRole[] = ['CEO', 'CFO', 'COO'];

  const stats = {
    totalBuys: buys.length,
    totalSells: sells.length,
    buyValue: buys.reduce((sum, t) => sum + t.value, 0),
    sellValue: sells.reduce((sum, t) => sum + t.value, 0),
    uniqueBuyers: new Set(buys.map(t => t.name)).size,
    uniqueSellers: new Set(sells.map(t => t.name)).size,
    executiveBuys: buys.filter(t => executiveRoles.includes(t.role)).length,
    executiveSells: sells.filter(t => executiveRoles.includes(t.role) && !t.likelyPlanned).length,
    lastBuyDate: buys.length > 0 ? new Date(Math.max(...buys.map(t => new Date(t.date).getTime()))) : undefined,
    lastSellDate: sells.length > 0 ? new Date(Math.max(...sells.map(t => new Date(t.date).getTime()))) : undefined,
  };

  // Identify key transactions (high significance or notable)
  const keyTransactions = enhanced
    .filter(t => t.significance === 'HIGH' || t.significance === 'MEDIUM')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Determine overall sentiment
  const { sentiment, confidence, findings } = determineSentiment(enhanced, stats);

  // Generate summary
  const summary = generateSummary(sentiment, stats, keyTransactions);

  return {
    sentiment,
    confidence,
    summary,
    findings,
    keyTransactions,
    stats,
  };
}

/**
 * Determine overall insider sentiment
 */
function determineSentiment(
  transactions: EnhancedInsiderTransaction[],
  stats: InsiderSentiment['stats']
): { sentiment: InsiderSentiment['sentiment']; confidence: number; findings: string[] } {
  const findings: string[] = [];
  let bullishPoints = 0;
  let bearishPoints = 0;

  // Executive purchases are very bullish
  if (stats.executiveBuys > 0) {
    bullishPoints += stats.executiveBuys * 3;
    findings.push(`${stats.executiveBuys} executive purchase(s) - strong bullish signal`);
  }

  // Executive selling (non-planned) is concerning
  if (stats.executiveSells > 0) {
    bearishPoints += stats.executiveSells * 2;
    findings.push(`${stats.executiveSells} executive sale(s) - potential concern`);
  }

  // Overall buy/sell ratio
  if (stats.totalBuys > stats.totalSells && stats.buyValue > stats.sellValue) {
    bullishPoints += 2;
    findings.push(`Net buying: ${stats.totalBuys} buys vs ${stats.totalSells} sells`);
  } else if (stats.totalSells > stats.totalBuys * 2) {
    bearishPoints += 1;
    findings.push(`Heavy selling: ${stats.totalSells} sells vs ${stats.totalBuys} buys`);
  }

  // Multiple unique buyers is bullish
  if (stats.uniqueBuyers >= 3) {
    bullishPoints += 2;
    findings.push(`${stats.uniqueBuyers} different insiders buying - cluster buy signal`);
  }

  // Multiple unique sellers (excluding planned) is concerning
  const discretionarySells = transactions.filter(
    t => t.transactionType === 'SELL' && !t.likelyPlanned && t.significance !== 'LOW'
  );
  const uniqueDiscretionarySellers = new Set(discretionarySells.map(t => t.name)).size;

  if (uniqueDiscretionarySellers >= 3) {
    bearishPoints += 2;
    findings.push(`${uniqueDiscretionarySellers} different insiders selling (discretionary) - potential concern`);
  }

  // Check for high-significance transactions
  const highSigBuys = transactions.filter(t => t.transactionType === 'BUY' && t.significance === 'HIGH');
  const highSigSells = transactions.filter(t => t.transactionType === 'SELL' && t.significance === 'HIGH');

  if (highSigBuys.length > 0) {
    bullishPoints += highSigBuys.length * 2;
  }
  if (highSigSells.length > 0) {
    bearishPoints += highSigSells.length * 2;
  }

  // Determine sentiment
  let sentiment: InsiderSentiment['sentiment'];
  let confidence: number;

  const netScore = bullishPoints - bearishPoints;

  if (netScore >= 4) {
    sentiment = 'BULLISH';
    confidence = Math.min(90, 60 + netScore * 5);
  } else if (netScore <= -4) {
    sentiment = 'BEARISH';
    confidence = Math.min(90, 60 + Math.abs(netScore) * 5);
  } else if (bullishPoints > 0 && bearishPoints > 0) {
    sentiment = 'MIXED';
    confidence = 50;
  } else {
    sentiment = 'NEUTRAL';
    confidence = 40;
  }

  if (findings.length === 0) {
    findings.push('No significant insider activity patterns detected');
  }

  return { sentiment, confidence, findings };
}

/**
 * Generate human-readable summary
 */
function generateSummary(
  sentiment: InsiderSentiment['sentiment'],
  stats: InsiderSentiment['stats'],
  keyTransactions: EnhancedInsiderTransaction[]
): string {
  const parts: string[] = [];

  // Overall sentiment
  switch (sentiment) {
    case 'BULLISH':
      parts.push('Insider sentiment is BULLISH.');
      break;
    case 'BEARISH':
      parts.push('Insider sentiment is BEARISH - potential concern.');
      break;
    case 'MIXED':
      parts.push('Insider sentiment is MIXED - conflicting signals.');
      break;
    case 'NEUTRAL':
      parts.push('Insider sentiment is NEUTRAL - no strong signals.');
      break;
  }

  // Key stats
  if (stats.totalBuys > 0 || stats.totalSells > 0) {
    parts.push(`${stats.totalBuys} buy(s) ($${(stats.buyValue / 1000).toFixed(0)}K), ${stats.totalSells} sell(s) ($${(stats.sellValue / 1000).toFixed(0)}K) in past 6 months.`);
  }

  // Highlight key transaction
  if (keyTransactions.length > 0) {
    const mostRecent = keyTransactions[0];
    parts.push(`Most notable: ${mostRecent.name} (${mostRecent.role}) ${mostRecent.transactionType === 'BUY' ? 'bought' : 'sold'} $${(mostRecent.value / 1000).toFixed(0)}K.`);
  }

  return parts.join(' ');
}

export { EnhancedInsiderTransaction as InsiderTransactionEnhanced };
