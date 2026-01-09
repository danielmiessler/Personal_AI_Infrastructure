#!/usr/bin/env bun
/**
 * JAI CLI - Joey's AI Investment Assistant
 *
 * Command-line interface for trading analysis, screening, and automation.
 */

import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze';
import { screenCommand } from './commands/screen';
import { portfolioCommand } from './commands/portfolio';
import { buyCommand, sellCommand } from './commands/trade';
import { councilCommand } from './commands/council';
import { briefCommand, watchlistCommand } from './commands/automation';
import { bold, cyan, gray } from './format';

// =============================================================================
// Version and Description
// =============================================================================

const VERSION = '1.0.0';
const DESCRIPTION = `
${bold('JAI - Joey\'s AI Investment Assistant')}

A comprehensive trading analysis toolkit with policy-driven decision making.

${cyan('Features:')}
  - Full stock analysis with dealbreakers and scoring
  - Screening for growth, value, and sector opportunities
  - Portfolio tracking and compliance monitoring
  - Morning briefs and automated alerts
  - Council-based decision making with multiple AI perspectives
`;

// =============================================================================
// Main Program
// =============================================================================

const program = new Command();

program
  .name('jai')
  .version(VERSION)
  .description(DESCRIPTION)
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true,
  });

// =============================================================================
// Analysis Commands
// =============================================================================

program
  .command('analyze')
  .description('Run full analysis on one or more tickers')
  .argument('<tickers...>', 'Stock ticker(s) to analyze')
  .option('-d, --detailed', 'Show detailed analysis breakdown')
  .option('-j, --json', 'Output as JSON')
  .option('--no-cache', 'Bypass data cache')
  .option('-p, --position', 'Analyze as existing position (affects timing signals)')
  .option('--no-timing', 'Skip technical timing analysis')
  .action(analyzeCommand);

program
  .command('screen')
  .description('Screen stocks by strategy')
  .argument('<type>', 'Screen type: growth, value, sectors, dividend')
  .option('-l, --limit <n>', 'Maximum results to show', '10')
  .option('-s, --sector <sector>', 'Filter by sector')
  .option('-j, --json', 'Output as JSON')
  .action(screenCommand);

// =============================================================================
// Portfolio Commands
// =============================================================================

program
  .command('portfolio')
  .description('Show current portfolio positions')
  .option('-d, --detailed', 'Show detailed position info')
  .option('-c, --compliance', 'Show compliance status only')
  .option('-j, --json', 'Output as JSON')
  .action(portfolioCommand);

program
  .command('brief')
  .description('Generate morning brief')
  .option('-s, --send', 'Send to Discord')
  .option('-j, --json', 'Output as JSON')
  .action(briefCommand);

program
  .command('watchlist')
  .description('Manage watchlist')
  .argument('[action]', 'Action: add, remove, show (default: show)')
  .argument('[ticker]', 'Ticker to add/remove')
  .action(watchlistCommand);

// =============================================================================
// Trade Commands
// =============================================================================

program
  .command('buy')
  .description('Get buy recommendation for a stock')
  .argument('<ticker>', 'Stock ticker')
  .argument('<amount>', 'Dollar amount or share count (e.g., "$5000" or "100")')
  .option('-p, --price <price>', 'Limit price (default: current price)')
  .option('--execute', 'Execute the trade (paper trading by default)')
  .action(buyCommand);

program
  .command('sell')
  .description('Get sell recommendation for a position')
  .argument('<ticker>', 'Stock ticker')
  .argument('<shares>', 'Number of shares or "all"')
  .option('-p, --price <price>', 'Limit price (default: current price)')
  .option('--execute', 'Execute the trade (paper trading by default)')
  .option('--method <method>', 'Tax lot selection: FIFO, LIFO, HIFO', 'FIFO')
  .action(sellCommand);

// =============================================================================
// Council Command
// =============================================================================

program
  .command('council')
  .description('Convene the investment council for a decision')
  .argument('<ticker>', 'Stock ticker to discuss')
  .option('-q, --question <question>', 'Specific question for the council')
  .option('-a, --agents <agents>', 'Comma-separated agent names')
  .option('-j, --json', 'Output as JSON')
  .action(councilCommand);

// =============================================================================
// Help Text Customization
// =============================================================================

program.addHelpText('after', `
${gray('Examples:')}
  ${gray('$')} jai analyze AAPL MSFT GOOGL
  ${gray('$')} jai screen growth --limit 20
  ${gray('$')} jai portfolio --detailed
  ${gray('$')} jai buy AAPL "$5000"
  ${gray('$')} jai sell TSLA 50 --method HIFO
  ${gray('$')} jai council NVDA --question "Should I add to my position?"
  ${gray('$')} jai brief --send

${gray('Configuration:')}
  Policy file:    ~/.config/jai/policy.yaml
  Portfolio:      ~/.config/jai/positions.json
  Watchlist:      ~/.config/jai/watchlist.json

${gray('For more information, visit:')}
  https://github.com/jbarkley/jai-trading-analysis
`);

// =============================================================================
// Parse and Run
// =============================================================================

program.parse();
