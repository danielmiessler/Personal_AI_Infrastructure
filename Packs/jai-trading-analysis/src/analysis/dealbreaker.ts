/**
 * Dealbreaker Analysis
 *
 * Hard-fail checks that automatically disqualify a stock.
 * If any dealbreaker fails, the stock should be avoided.
 */

import type {
  AnalysisDataProvider,
  DealbreakersResult,
  DealbreakersDetail,
  DealbreakerId,
  InsiderTransaction,
  SECFilingData,
  FinancialsData,
  NewsItem,
} from './types';
import type { Policy } from 'jai-finance-core';

// =============================================================================
// Dealbreaker Definitions
// =============================================================================

interface DealbreakCheck {
  id: DealbreakerId;
  name: string;
  description: string;
  check: (context: CheckContext) => Promise<DealbreakersDetail>;
}

interface CheckContext {
  ticker: string;
  financials: FinancialsData;
  filings: SECFilingData[];
  insiderTxns: InsiderTransaction[];
  news: NewsItem[];
  policy: Policy;
}

// =============================================================================
// Check Implementations
// =============================================================================

/**
 * SEC Investigation: Check for any SEC enforcement actions or investigations
 */
async function checkSECInvestigation(ctx: CheckContext): Promise<DealbreakersDetail> {
  const secEnforcementForms = ['SC 13D', 'SC 13G', '8-K'];
  const enforcementKeywords = ['investigation', 'enforcement', 'subpoena', 'SEC inquiry', 'securities fraud'];

  // Check recent 8-K filings for enforcement-related items
  const recentFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return filingDate >= oneYearAgo && secEnforcementForms.includes(f.form);
  });

  const evidence: string[] = [];
  let failed = false;

  for (const filing of recentFilings) {
    const descLower = (filing.description || '').toLowerCase();
    const itemsStr = (filing.items || []).join(' ').toLowerCase();

    for (const keyword of enforcementKeywords) {
      if (descLower.includes(keyword) || itemsStr.includes(keyword)) {
        failed = true;
        evidence.push(`${filing.form} filed ${filing.filingDate.toISOString().split('T')[0]}: ${filing.description}`);
        break;
      }
    }
  }

  // Also check news for SEC investigation mentions
  const secNews = ctx.news.filter((n) => {
    const headlineLower = n.headline.toLowerCase();
    return enforcementKeywords.some((kw) => headlineLower.includes(kw));
  });

  for (const item of secNews.slice(0, 3)) {
    evidence.push(`News: "${item.headline}" (${item.source})`);
    failed = true;
  }

  return {
    id: 'SEC_INVESTIGATION',
    name: 'SEC Investigation',
    passed: !failed,
    finding: failed
      ? 'Potential SEC investigation or enforcement action detected'
      : 'No SEC investigation indicators found',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Recent Restatement: Check for financial restatements in past 2 years
 */
async function checkRecentRestatement(ctx: CheckContext): Promise<DealbreakersDetail> {
  const restatementForms = ['10-K/A', '10-Q/A', '8-K'];
  const restatementKeywords = ['restatement', 'restated', 'correction', 'material weakness', 'internal control'];

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const evidence: string[] = [];
  let failed = false;

  const relevantFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    return (
      filingDate >= twoYearsAgo &&
      (restatementForms.includes(f.form) || f.form.includes('/A'))
    );
  });

  for (const filing of relevantFilings) {
    const descLower = (filing.description || '').toLowerCase();
    for (const keyword of restatementKeywords) {
      if (descLower.includes(keyword)) {
        failed = true;
        evidence.push(`${filing.form}: ${filing.description}`);
        break;
      }
    }
  }

  return {
    id: 'RECENT_RESTATEMENT',
    name: 'Recent Restatement',
    passed: !failed,
    finding: failed
      ? 'Financial restatement detected in past 2 years'
      : 'No recent financial restatements found',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Auditor Change: Check for recent auditor changes (red flag for financial issues)
 */
async function checkAuditorChange(ctx: CheckContext): Promise<DealbreakersDetail> {
  const auditorKeywords = ['auditor', 'independent registered public accounting firm', 'audit engagement'];
  const changeKeywords = ['dismissal', 'resignation', 'replaced', 'changed', 'terminated'];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const evidence: string[] = [];
  let failed = false;

  // 8-K Item 4.01 is specifically about auditor changes
  const auditorFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    return (
      filingDate >= oneYearAgo &&
      f.form === '8-K' &&
      (f.items?.includes('4.01') || (f.description || '').toLowerCase().includes('auditor'))
    );
  });

  for (const filing of auditorFilings) {
    failed = true;
    evidence.push(`8-K Item 4.01 filed ${filing.filingDate.toISOString().split('T')[0]}: Auditor change`);
  }

  // Fallback: Check news for auditor change mentions
  if (!failed) {
    const auditorNews = ctx.news.filter((n) => {
      const headlineLower = n.headline.toLowerCase();
      return (
        auditorKeywords.some((ak) => headlineLower.includes(ak)) &&
        changeKeywords.some((ck) => headlineLower.includes(ck))
      );
    });

    for (const item of auditorNews.slice(0, 2)) {
      failed = true;
      evidence.push(`News: "${item.headline}"`);
    }
  }

  return {
    id: 'AUDITOR_CHANGE',
    name: 'Auditor Change',
    passed: !failed,
    finding: failed
      ? 'Recent auditor change detected'
      : 'No recent auditor changes found',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Significant Dilution: Check for >20% increase in shares outstanding
 */
async function checkSignificantDilution(ctx: CheckContext): Promise<DealbreakersDetail> {
  const DILUTION_THRESHOLD = 0.20; // 20%

  const currentShares = ctx.financials.sharesOutstanding;
  const priorShares = ctx.financials.sharesOutstandingPriorYear;

  if (!currentShares || !priorShares || priorShares === 0) {
    return {
      id: 'SIGNIFICANT_DILUTION',
      name: 'Significant Dilution',
      passed: true,
      finding: 'Insufficient data to check share dilution',
    };
  }

  const dilutionPercent = (currentShares - priorShares) / priorShares;
  const failed = dilutionPercent > DILUTION_THRESHOLD;

  return {
    id: 'SIGNIFICANT_DILUTION',
    name: 'Significant Dilution',
    passed: !failed,
    finding: failed
      ? `Shares outstanding increased ${(dilutionPercent * 100).toFixed(1)}% YoY (threshold: ${DILUTION_THRESHOLD * 100}%)`
      : `Share count change: ${(dilutionPercent * 100).toFixed(1)}% YoY (within acceptable range)`,
    evidence: failed
      ? [`Prior: ${priorShares.toLocaleString()} shares`, `Current: ${currentShares.toLocaleString()} shares`]
      : undefined,
  };
}

/**
 * Going Concern: Check for going concern warnings in filings
 */
async function checkGoingConcern(ctx: CheckContext): Promise<DealbreakersDetail> {
  const goingConcernKeywords = ['going concern', 'substantial doubt', 'ability to continue', 'liquidity concern'];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const evidence: string[] = [];
  let failed = false;

  // Check 10-K and 10-Q filings
  const annualFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    return filingDate >= oneYearAgo && (f.form === '10-K' || f.form === '10-Q');
  });

  for (const filing of annualFilings) {
    const descLower = (filing.description || '').toLowerCase();
    for (const keyword of goingConcernKeywords) {
      if (descLower.includes(keyword)) {
        failed = true;
        evidence.push(`${filing.form}: Contains going concern language`);
        break;
      }
    }
  }

  // Check news for going concern mentions
  const concernNews = ctx.news.filter((n) => {
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return goingConcernKeywords.some((kw) => combined.includes(kw));
  });

  for (const item of concernNews.slice(0, 2)) {
    failed = true;
    evidence.push(`News: "${item.headline}"`);
  }

  return {
    id: 'GOING_CONCERN',
    name: 'Going Concern',
    passed: !failed,
    finding: failed
      ? 'Going concern warning detected'
      : 'No going concern warnings found',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Major Impairment: Check for significant asset writedowns or impairments
 */
async function checkMajorImpairment(ctx: CheckContext): Promise<DealbreakersDetail> {
  const impairmentKeywords = ['impairment', 'writedown', 'write-down', 'write-off', 'goodwill impairment'];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const evidence: string[] = [];
  let failed = false;

  // Check 8-K filings (Item 2.06 is specifically for impairments)
  const impairmentFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    return (
      filingDate >= oneYearAgo &&
      f.form === '8-K' &&
      (f.items?.includes('2.06') || impairmentKeywords.some((kw) => (f.description || '').toLowerCase().includes(kw)))
    );
  });

  for (const filing of impairmentFilings) {
    failed = true;
    evidence.push(`8-K filed ${filing.filingDate.toISOString().split('T')[0]}: Asset impairment`);
  }

  // Check news for major impairment announcements
  const impairmentNews = ctx.news.filter((n) => {
    const headlineLower = n.headline.toLowerCase();
    return impairmentKeywords.some((kw) => headlineLower.includes(kw));
  });

  for (const item of impairmentNews.slice(0, 2)) {
    failed = true;
    evidence.push(`News: "${item.headline}"`);
  }

  return {
    id: 'MAJOR_IMPAIRMENT',
    name: 'Major Impairment',
    passed: !failed,
    finding: failed
      ? 'Major asset impairment detected'
      : 'No major impairments found',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Dividend Cut: Check for dividend reduction or suspension
 */
async function checkDividendCut(ctx: CheckContext): Promise<DealbreakersDetail> {
  const dividendKeywords = ['dividend cut', 'dividend reduction', 'dividend suspension', 'suspended dividend'];

  const evidence: string[] = [];
  let failed = false;

  // Check news for dividend cuts
  const dividendNews = ctx.news.filter((n) => {
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return dividendKeywords.some((kw) => combined.includes(kw));
  });

  for (const item of dividendNews.slice(0, 2)) {
    failed = true;
    evidence.push(`News: "${item.headline}"`);
  }

  // Also check 8-K filings for dividend announcements
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const dividendFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    const descLower = (f.description || '').toLowerCase();
    return (
      filingDate >= sixMonthsAgo &&
      f.form === '8-K' &&
      (descLower.includes('dividend') && (descLower.includes('suspend') || descLower.includes('reduc')))
    );
  });

  for (const filing of dividendFilings) {
    failed = true;
    evidence.push(`8-K: Dividend change announcement`);
  }

  return {
    id: 'DIVIDEND_CUT',
    name: 'Dividend Cut',
    passed: !failed,
    finding: failed
      ? 'Dividend cut or suspension detected'
      : 'No dividend cuts detected',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Debt Covenant Violation: Check for covenant breaches or waivers
 */
async function checkDebtCovenantViolation(ctx: CheckContext): Promise<DealbreakersDetail> {
  const covenantKeywords = ['covenant violation', 'covenant breach', 'covenant waiver', 'debt default', 'credit agreement'];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const evidence: string[] = [];
  let failed = false;

  // Check 8-K filings for covenant issues
  const covenantFilings = ctx.filings.filter((f) => {
    const filingDate = new Date(f.filingDate);
    const descLower = (f.description || '').toLowerCase();
    return (
      filingDate >= oneYearAgo &&
      f.form === '8-K' &&
      covenantKeywords.some((kw) => descLower.includes(kw))
    );
  });

  for (const filing of covenantFilings) {
    failed = true;
    evidence.push(`8-K: Potential covenant issue`);
  }

  // Check news
  const covenantNews = ctx.news.filter((n) => {
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return covenantKeywords.some((kw) => combined.includes(kw));
  });

  for (const item of covenantNews.slice(0, 2)) {
    failed = true;
    evidence.push(`News: "${item.headline}"`);
  }

  return {
    id: 'DEBT_COVENANT_VIOLATION',
    name: 'Debt Covenant Violation',
    passed: !failed,
    finding: failed
      ? 'Debt covenant violation or waiver detected'
      : 'No debt covenant issues detected',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Insider Dumping: Check for significant insider selling
 */
async function checkInsiderDumping(ctx: CheckContext): Promise<DealbreakersDetail> {
  const DUMPING_THRESHOLD = 0.25; // 25% of holdings sold
  const MIN_TRANSACTIONS = 3; // Multiple insiders selling

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentTxns = ctx.insiderTxns.filter((t) => {
    return new Date(t.date) >= threeMonthsAgo;
  });

  const sells = recentTxns.filter((t) => t.transactionType === 'SELL');
  const buys = recentTxns.filter((t) => t.transactionType === 'BUY');

  const totalSellValue = sells.reduce((sum, t) => sum + t.value, 0);
  const totalBuyValue = buys.reduce((sum, t) => sum + t.value, 0);

  const uniqueSellers = new Set(sells.map((t) => t.name)).size;

  const evidence: string[] = [];
  let failed = false;

  // Flag if multiple insiders are selling and sell value >> buy value
  if (uniqueSellers >= MIN_TRANSACTIONS && totalSellValue > totalBuyValue * 5) {
    failed = true;
    evidence.push(`${uniqueSellers} insiders sold in past 3 months`);
    evidence.push(`Total sell value: $${totalSellValue.toLocaleString()}`);
    evidence.push(`Total buy value: $${totalBuyValue.toLocaleString()}`);
  }

  // Check for any single large sale (> 25% of holdings)
  for (const sale of sells) {
    if (sale.sharesOwnedAfter !== undefined) {
      const sharesBefore = sale.shares + sale.sharesOwnedAfter;
      const percentSold = sale.shares / sharesBefore;
      if (percentSold > DUMPING_THRESHOLD) {
        failed = true;
        evidence.push(`${sale.name} sold ${(percentSold * 100).toFixed(0)}% of holdings`);
      }
    }
  }

  return {
    id: 'INSIDER_DUMPING',
    name: 'Insider Dumping',
    passed: !failed,
    finding: failed
      ? 'Significant insider selling detected'
      : 'No concerning insider selling patterns',
    evidence: evidence.length > 0 ? evidence : undefined,
  };
}

/**
 * Revenue Cliff: Check for >30% revenue decline
 * Also includes sanity check for implausible values that suggest data quality issues
 */
async function checkRevenueCliff(ctx: CheckContext): Promise<DealbreakersDetail> {
  const CLIFF_THRESHOLD = -0.30; // -30%
  const SANITY_MIN = -5.00; // -500% is implausible - flag as data quality issue
  const SANITY_MAX = 10.00; // +1000% is implausible

  const revenueGrowth = ctx.financials.revenueGrowth;

  if (revenueGrowth === undefined || revenueGrowth === null) {
    return {
      id: 'REVENUE_CLIFF',
      name: 'Revenue Cliff',
      passed: true,
      finding: 'Insufficient revenue data for analysis',
    };
  }

  // Sanity check: flag implausible values as potential data quality issues
  if (revenueGrowth < SANITY_MIN || revenueGrowth > SANITY_MAX) {
    return {
      id: 'REVENUE_CLIFF',
      name: 'Revenue Cliff',
      passed: true, // Don't fail on suspicious data - needs manual review
      finding: `DATA QUALITY WARNING: Revenue change of ${(revenueGrowth * 100).toFixed(1)}% seems implausible - manual verification recommended`,
      evidence: [
        `Reported value: ${(revenueGrowth * 100).toFixed(1)}%`,
        `Sanity range: ${SANITY_MIN * 100}% to ${SANITY_MAX * 100}%`,
        'This may indicate a data source error, fiscal period mismatch, or accounting change',
      ],
    };
  }

  const failed = revenueGrowth < CLIFF_THRESHOLD;

  return {
    id: 'REVENUE_CLIFF',
    name: 'Revenue Cliff',
    passed: !failed,
    finding: failed
      ? `Revenue declined ${(revenueGrowth * 100).toFixed(1)}% (threshold: ${CLIFF_THRESHOLD * 100}%)`
      : `Revenue growth: ${(revenueGrowth * 100).toFixed(1)}%`,
    evidence: failed
      ? [`Year-over-year revenue change: ${(revenueGrowth * 100).toFixed(1)}%`]
      : undefined,
  };
}

/**
 * Negative FCF Trend: Check for 3+ consecutive years of negative free cash flow
 */
async function checkNegativeFCFTrend(ctx: CheckContext): Promise<DealbreakersDetail> {
  const currentFCF = ctx.financials.freeCashFlow;
  const priorFCF = ctx.financials.freeCashFlowPriorYear;
  const twoYearsAgoFCF = ctx.financials.freeCashFlow2YearsAgo;

  const evidence: string[] = [];

  // Need at least 3 years of data
  if (currentFCF === undefined || priorFCF === undefined) {
    return {
      id: 'NEGATIVE_FCF_TREND',
      name: 'Negative FCF Trend',
      passed: true,
      finding: 'Insufficient FCF history for trend analysis',
    };
  }

  // Check if we have 3 years and all are negative
  let consecutiveNegative = 0;
  const fcfValues = [twoYearsAgoFCF, priorFCF, currentFCF].filter((v) => v !== undefined) as number[];

  let allNegative = true;
  for (const fcf of fcfValues) {
    if (fcf < 0) {
      consecutiveNegative++;
      evidence.push(`FCF: $${(fcf / 1_000_000).toFixed(0)}M`);
    } else {
      allNegative = false;
    }
  }

  const failed = fcfValues.length >= 2 && allNegative && consecutiveNegative >= 2;

  return {
    id: 'NEGATIVE_FCF_TREND',
    name: 'Negative FCF Trend',
    passed: !failed,
    finding: failed
      ? `Persistent negative free cash flow (${consecutiveNegative} periods)`
      : 'No persistent negative FCF trend',
    evidence: failed ? evidence : undefined,
  };
}

// =============================================================================
// Dealbreaker Registry
// =============================================================================

const DEALBREAKER_CHECKS: DealbreakCheck[] = [
  { id: 'SEC_INVESTIGATION', name: 'SEC Investigation', description: 'Check for SEC enforcement actions', check: checkSECInvestigation },
  { id: 'RECENT_RESTATEMENT', name: 'Recent Restatement', description: 'Check for financial restatements', check: checkRecentRestatement },
  { id: 'AUDITOR_CHANGE', name: 'Auditor Change', description: 'Check for auditor changes', check: checkAuditorChange },
  { id: 'SIGNIFICANT_DILUTION', name: 'Significant Dilution', description: 'Check for >20% share dilution', check: checkSignificantDilution },
  { id: 'GOING_CONCERN', name: 'Going Concern', description: 'Check for going concern warnings', check: checkGoingConcern },
  { id: 'MAJOR_IMPAIRMENT', name: 'Major Impairment', description: 'Check for asset impairments', check: checkMajorImpairment },
  { id: 'DIVIDEND_CUT', name: 'Dividend Cut', description: 'Check for dividend cuts', check: checkDividendCut },
  { id: 'DEBT_COVENANT_VIOLATION', name: 'Debt Covenant Violation', description: 'Check for covenant breaches', check: checkDebtCovenantViolation },
  { id: 'INSIDER_DUMPING', name: 'Insider Dumping', description: 'Check for insider selling', check: checkInsiderDumping },
  { id: 'REVENUE_CLIFF', name: 'Revenue Cliff', description: 'Check for >30% revenue decline', check: checkRevenueCliff },
  { id: 'NEGATIVE_FCF_TREND', name: 'Negative FCF Trend', description: 'Check for persistent negative FCF', check: checkNegativeFCFTrend },
];

// =============================================================================
// Main Export
// =============================================================================

/**
 * Run all dealbreaker checks for a stock
 *
 * @param ticker - Stock ticker symbol
 * @param dataProvider - Data provider for market data
 * @param policy - Investment policy for rule references
 * @returns DealbreakersResult with all check results
 */
export async function runDealbreakers(
  ticker: string,
  dataProvider: AnalysisDataProvider,
  policy: Policy
): Promise<DealbreakersResult> {
  // Fetch all required data in parallel
  const [financials, filings, insiderTxns, news] = await Promise.all([
    dataProvider.getFinancials(ticker),
    dataProvider.getSECFilings(ticker),
    dataProvider.getInsiderTransactions(ticker),
    dataProvider.getNews(ticker),
  ]);

  const context: CheckContext = {
    ticker,
    financials,
    filings,
    insiderTxns,
    news,
    policy,
  };

  // Run all checks in parallel
  const detailPromises = DEALBREAKER_CHECKS.map((check) => check.check(context));
  const details = await Promise.all(detailPromises);

  const failed = details.filter((d) => !d.passed).map((d) => d.id);
  const checked = details.map((d) => d.id);

  return {
    passed: failed.length === 0,
    failed,
    checked,
    details,
  };
}

export { DealbreakersResult };
