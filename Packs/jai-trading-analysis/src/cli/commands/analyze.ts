/**
 * Analyze Command
 *
 * Runs full analysis on one or more tickers using the real analysis pipeline.
 * Now includes technical analysis for timing signals.
 */

import {
  header,
  subheader,
  table,
  colorVerdict,
  colorPercent,
  formatCurrency,
  green,
  red,
  yellow,
  cyan,
  bold,
  gray,
  error,
  spinner,
  box,
} from '../format';

import { AnalysisPipeline } from '../../analysis/pipeline';
import { RealDataProvider } from '../../analysis/data-provider';
import { runTechnicalAnalysis } from '../../analysis/technical';
import { analyzeInsiderTransactions } from '../../analysis/insider';
import type { AnalysisResult, AnalysisVerdict } from '../../analysis/types';
import type { TimingSignal, TimingAction, TechnicalIndicators } from '../../analysis/technical';
import type { InsiderSentiment } from '../../analysis/insider';
import { PolicyLoader } from 'jai-finance-core';

// =============================================================================
// Types
// =============================================================================

interface AnalyzeOptions {
  detailed?: boolean;
  json?: boolean;
  cache?: boolean;
  position?: boolean; // User owns this position
  timing?: boolean;   // Include timing analysis
}

// =============================================================================
// Command Implementation
// =============================================================================

export async function analyzeCommand(
  tickers: string[],
  options: AnalyzeOptions
): Promise<void> {
  const normalizedTickers = tickers.map(t => t.toUpperCase());

  // Check for Finnhub API key
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    error('FINNHUB_API_KEY environment variable not set');
    console.log(gray('Run: source ~/.config/jai/load-secrets.sh'));
    return;
  }

  // Initialize data provider and pipeline
  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: options.cache !== false,
  });

  // Load policy
  let policy;
  try {
    const policyLoader = new PolicyLoader('~/.config/jai/policy.yaml');
    policy = await policyLoader.load();
  } catch (err) {
    // Use default policy if not found
    policy = getDefaultPolicy();
  }

  const pipeline = new AnalysisPipeline(dataProvider, policy);

  // Default to including timing analysis
  const includeTiming = options.timing !== false;

  if (options.json) {
    const results = [];
    for (const ticker of normalizedTickers) {
      const result = await pipeline.analyze(ticker);
      let timing = null;
      let insiderSentiment = null;

      if (includeTiming) {
        try {
          const priceHistory = await dataProvider.getPriceHistory(ticker, '1y');
          const technicalResult = await runTechnicalAnalysis(
            ticker,
            priceHistory,
            result.verdict,
            options.position || false
          );
          timing = technicalResult;
        } catch {
          // Timing not critical
        }

        try {
          const insiderTxns = await dataProvider.getInsiderTransactions(ticker);
          insiderSentiment = analyzeInsiderTransactions(insiderTxns);
        } catch {
          // Insider data not critical
        }
      }

      results.push({ ...result, timing, insiderSentiment });
    }
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log(header('JAI Stock Analysis'));
  console.log(gray(`Analyzing ${normalizedTickers.length} ticker(s)...`));
  if (options.position) {
    console.log(gray('(Position mode: analyzing as existing holdings)\n'));
  } else {
    console.log('');
  }

  for (const ticker of normalizedTickers) {
    const loading = spinner(`Analyzing ${ticker}...`);

    try {
      const result = await pipeline.analyze(ticker);

      // Get technical analysis
      let timingSignal: TimingSignal | null = null;
      let indicators: TechnicalIndicators | null = null;
      let insiderSentiment: InsiderSentiment | null = null;

      if (includeTiming) {
        try {
          const priceHistory = await dataProvider.getPriceHistory(ticker, '1y');
          const technicalResult = await runTechnicalAnalysis(
            ticker,
            priceHistory,
            result.verdict,
            options.position || false
          );
          timingSignal = technicalResult.signal;
          indicators = technicalResult.indicators;
        } catch (err) {
          // Technical analysis not critical - continue without it
        }

        try {
          const insiderTxns = await dataProvider.getInsiderTransactions(ticker);
          insiderSentiment = analyzeInsiderTransactions(insiderTxns);
        } catch {
          // Insider data not critical
        }
      }

      loading.stop();
      await printAnalysisResult(
        result,
        dataProvider,
        timingSignal,
        indicators,
        insiderSentiment,
        options.detailed,
        options.position
      );
    } catch (err) {
      loading.stop();
      error(`Failed to analyze ${ticker}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// =============================================================================
// Output Formatting
// =============================================================================

async function printAnalysisResult(
  result: AnalysisResult,
  dataProvider: RealDataProvider,
  timingSignal: TimingSignal | null,
  indicators: TechnicalIndicators | null,
  insiderSentiment: InsiderSentiment | null,
  detailed?: boolean,
  ownsPosition?: boolean
): Promise<void> {
  // Get current quote for price info
  let currentPrice = 0;

  try {
    const quote = await dataProvider.getQuote(result.ticker);
    currentPrice = quote.price;
  } catch {
    // Price info not critical
  }

  const verdictColor = colorVerdict(result.verdict);

  // Build main info lines
  const mainLines = [
    `Verdict: ${verdictColor}`,
    `Score:   ${result.confidenceScore}/100`,
  ];

  // Add timing signal if available (the key new feature!)
  if (timingSignal) {
    mainLines.push('');
    mainLines.push(`${bold('ACTION:')} ${colorTimingAction(timingSignal.action)}`);
    mainLines.push(`Confidence: ${timingSignal.confidence}%`);
  }

  mainLines.push('');
  mainLines.push(`Current: ${formatCurrency(currentPrice)}`);

  // Add technical levels if available
  if (indicators) {
    mainLines.push(`50-day MA: ${formatCurrency(indicators.sma50)}`);
    mainLines.push(`RSI(14): ${indicators.rsi14.toFixed(0)} ${rsiLabel(indicators.rsi14)}`);
    mainLines.push(`Trend: ${indicators.trend}`);
  }

  // Add suggested levels from timing signal
  if (timingSignal?.suggestedEntry) {
    mainLines.push('');
    mainLines.push(`Entry: ${formatCurrency(timingSignal.suggestedEntry)}`);
    if (timingSignal.suggestedStopLoss) {
      mainLines.push(`Stop:  ${formatCurrency(timingSignal.suggestedStopLoss)}`);
    }
    if (timingSignal.suggestedTarget) {
      mainLines.push(`Target: ${formatCurrency(timingSignal.suggestedTarget)}`);
    }
  }

  // Main result box
  console.log(box(result.ticker, mainLines.join('\n')));

  // Timing Reasoning (most important for actionability)
  if (timingSignal && timingSignal.reasoning.length > 0) {
    console.log(subheader('Timing Analysis'));
    for (const reason of timingSignal.reasoning) {
      console.log(`  ${cyan('>')} ${reason}`);
    }

    // Show bullish/bearish factors
    if (detailed) {
      if (timingSignal.technicalFactors.bullish.length > 0) {
        console.log(gray('\n  Bullish factors:'));
        for (const factor of timingSignal.technicalFactors.bullish) {
          console.log(`    ${green('+')} ${factor}`);
        }
      }
      if (timingSignal.technicalFactors.bearish.length > 0) {
        console.log(gray('\n  Bearish factors:'));
        for (const factor of timingSignal.technicalFactors.bearish) {
          console.log(`    ${red('-')} ${factor}`);
        }
      }
    }
  }

  // Insider Sentiment
  if (insiderSentiment) {
    console.log(subheader('Insider Activity'));
    console.log(`  ${colorInsiderSentiment(insiderSentiment.sentiment)} (${insiderSentiment.confidence}% confidence)`);
    console.log(`  ${gray(insiderSentiment.summary)}`);

    if (detailed && insiderSentiment.keyTransactions.length > 0) {
      console.log(gray('\n  Key transactions:'));
      for (const txn of insiderSentiment.keyTransactions.slice(0, 3)) {
        const typeColor = txn.transactionType === 'BUY' ? green : red;
        console.log(`    ${typeColor(txn.transactionType)} ${txn.name} (${txn.role}): $${(txn.value / 1000).toFixed(0)}K`);
      }
    }
  }

  // Dealbreakers
  const dealbreakersStage = result.stages.find(s => s.name === 'dealbreakers');
  if (dealbreakersStage && !dealbreakersStage.passed) {
    console.log(subheader('Dealbreakers'));
    for (const detail of dealbreakersStage.details) {
      if (detail.includes('FAILED') || detail.includes('WARNING')) {
        console.log(`  ${red('[X]')} ${detail.split(' - ')[1] || detail}`);
      }
    }
  }

  // Yellow Flags
  const yellowFlagsStage = result.stages.find(s => s.name === 'yellowFlags');
  if (yellowFlagsStage && yellowFlagsStage.details.length > 0) {
    console.log(subheader('Yellow Flags'));
    for (const detail of yellowFlagsStage.details) {
      console.log(`  ${yellow('[!]')} ${detail.split(':')[0]}`);
    }
  }

  // Positive Factors
  const positiveStage = result.stages.find(s => s.name === 'positiveFactors');
  if (positiveStage && positiveStage.details.length > 0) {
    console.log(subheader('Positive Factors'));
    for (const detail of positiveStage.details) {
      console.log(`  ${green('[+]')} ${detail.split(':')[0]}`);
    }
  }

  if (detailed) {
    // Extract scores from stages
    const fScoreStage = result.stages.find(s => s.name === 'fScore');
    const qualityStage = result.stages.find(s => s.name === 'positiveFactors');
    const fScore = fScoreStage ? Math.round(fScoreStage.score / 100 * 9) : 0;
    const qualityScore = qualityStage?.score || 0;

    console.log(subheader('Detailed Scores'));
    console.log(table(
      [
        { header: 'Metric', width: 20 },
        { header: 'Score', width: 10, align: 'right' as const },
        { header: 'Rating', width: 15 },
      ],
      [
        ['F-Score', `${fScore}/9`, scoreRating(fScore, 9)],
        ['Quality Score', `${qualityScore}/100`, scoreRating(qualityScore, 100)],
        ['Confidence', `${result.confidenceScore}/100`, scoreRating(result.confidenceScore, 100)],
      ]
    ));

    if (indicators) {
      console.log(subheader('Technical Indicators'));
      console.log(table(
        [
          { header: 'Indicator', width: 20 },
          { header: 'Value', width: 15, align: 'right' as const },
          { header: 'Signal', width: 15 },
        ],
        [
          ['SMA (20)', formatCurrency(indicators.sma20), currentPrice > indicators.sma20 ? green('Above') : red('Below')],
          ['SMA (50)', formatCurrency(indicators.sma50), currentPrice > indicators.sma50 ? green('Above') : red('Below')],
          ['SMA (200)', formatCurrency(indicators.sma200), currentPrice > indicators.sma200 ? green('Above') : red('Below')],
          ['RSI (14)', indicators.rsi14.toFixed(1), rsiLabel(indicators.rsi14)],
          ['MACD', indicators.macd.histogram.toFixed(3), indicators.macd.histogram > 0 ? green('Bullish') : red('Bearish')],
          ['Volume Trend', '', indicators.volumeTrend],
        ]
      ));
    }
  }

  console.log('');
}

function colorTimingAction(action: TimingAction): string {
  switch (action) {
    case 'BUY_NOW':
      return green(bold('BUY NOW'));
    case 'ACCUMULATE':
      return green('ACCUMULATE');
    case 'WAIT_TO_BUY':
      return yellow('WAIT TO BUY');
    case 'HOLD':
      return cyan('HOLD');
    case 'REDUCE':
      return yellow('REDUCE');
    case 'SELL_NOW':
      return red(bold('SELL NOW'));
  }
}

function colorInsiderSentiment(sentiment: InsiderSentiment['sentiment']): string {
  switch (sentiment) {
    case 'BULLISH':
      return green('BULLISH');
    case 'BEARISH':
      return red('BEARISH');
    case 'MIXED':
      return yellow('MIXED');
    case 'NEUTRAL':
      return gray('NEUTRAL');
  }
}

function rsiLabel(rsi: number): string {
  if (rsi < 30) return green('Oversold');
  if (rsi > 70) return red('Overbought');
  if (rsi > 50) return gray('Bullish');
  return gray('Bearish');
}

function scoreRating(score: number, max: number): string {
  const percent = score / max;
  if (percent >= 0.8) return green('Excellent');
  if (percent >= 0.6) return green('Good');
  if (percent >= 0.4) return yellow('Fair');
  if (percent >= 0.2) return yellow('Poor');
  return red('Very Poor');
}

function getDefaultPolicy() {
  return {
    meta: {
      name: 'Default Policy',
      version: '1.0.0',
      last_review: new Date().toISOString().split('T')[0],
      next_review: new Date().toISOString().split('T')[0],
    },
    objectives: {
      primary: 'Capital preservation with growth',
      secondary: ['Long-term wealth building'],
      tactical: ['Buy quality on dips'],
      target_return: 0.12,
    },
    constraints: {
      max_single_position: 0.15,
      penny_stock_max: 0.05,
      max_sector_concentration: 0.30,
      cash_reserve: 0.05,
    },
    rules: {
      entry: [{ id: 'E1', name: 'Quality Gate', rule: 'F-Score >= 6' }],
      exit: [{ id: 'X1', name: 'Stop Loss', rule: 'Sell if down 8%' }],
      hold: [{ id: 'H1', name: 'Review', rule: 'Review quarterly' }],
    },
    schedule: {
      daily: ['Morning brief'],
      weekly: ['Watchlist review'],
      monthly: ['Performance review'],
      quarterly: ['Policy review'],
    },
    escalation: {
      auto_approve: ['Trades under $1K'],
      notify_and_wait: ['Stop loss triggers'],
      requires_discussion: ['New position over $5K'],
    },
    notifications: {
      channels: ['discord'],
      preferences: {
        enabled: ['morning_brief', 'stop_loss_alert'],
      },
    },
  };
}
