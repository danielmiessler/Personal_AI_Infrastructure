/**
 * CLI Module
 *
 * Command-line interface for JAI Trading Analysis.
 */

// Main CLI entry point
export { } from './jai';

// Commands
export {
  analyzeCommand,
  screenCommand,
  portfolioCommand,
  buyCommand,
  sellCommand,
  councilCommand,
  briefCommand,
  watchlistCommand,
} from './commands';

// Formatting utilities
export {
  colors,
  colorize,
  green,
  red,
  yellow,
  cyan,
  gray,
  bold,
  dim,
  colorVerdict,
  formatCurrency,
  formatPercent,
  formatNumber,
  colorPercent,
  colorPnL,
  table,
  box,
  spinner,
  success,
  warn,
  error,
  info,
  header,
  subheader,
} from './format';
