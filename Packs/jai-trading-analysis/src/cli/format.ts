/**
 * CLI Formatting Utilities
 *
 * Colors, tables, and output formatting for the JAI CLI.
 */

// =============================================================================
// ANSI Color Codes
// =============================================================================

export const colors = {
  // Reset
  reset: '\x1b[0m',

  // Regular colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bold colors
  boldRed: '\x1b[1;31m',
  boldGreen: '\x1b[1;32m',
  boldYellow: '\x1b[1;33m',
  boldBlue: '\x1b[1;34m',
  boldMagenta: '\x1b[1;35m',
  boldCyan: '\x1b[1;36m',
  boldWhite: '\x1b[1;37m',

  // Backgrounds
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',

  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
} as const;

// =============================================================================
// Color Helper Functions
// =============================================================================

export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function green(text: string): string {
  return colorize(text, 'green');
}

export function red(text: string): string {
  return colorize(text, 'red');
}

export function yellow(text: string): string {
  return colorize(text, 'yellow');
}

export function cyan(text: string): string {
  return colorize(text, 'cyan');
}

export function gray(text: string): string {
  return colorize(text, 'gray');
}

export function bold(text: string): string {
  return colorize(text, 'bold');
}

export function dim(text: string): string {
  return colorize(text, 'dim');
}

// =============================================================================
// Verdict Colors
// =============================================================================

export type Verdict = 'BUY' | 'HOLD' | 'SELL' | 'AVOID' | 'MODERATE_RISK' | 'LOW_RISK' | 'HIGH_RISK';

export function colorVerdict(verdict: Verdict | string): string {
  const upperVerdict = verdict.toUpperCase();

  switch (upperVerdict) {
    case 'BUY':
    case 'LOW_RISK':
      return colorize(verdict, 'boldGreen');
    case 'HOLD':
    case 'MODERATE_RISK':
      return colorize(verdict, 'boldYellow');
    case 'SELL':
    case 'AVOID':
    case 'HIGH_RISK':
      return colorize(verdict, 'boldRed');
    default:
      return verdict;
  }
}

// =============================================================================
// Number Formatting
// =============================================================================

export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function colorPercent(value: number, decimals = 2): string {
  const formatted = formatPercent(value, decimals);
  if (value > 0) return green(formatted);
  if (value < 0) return red(formatted);
  return formatted;
}

export function colorPnL(value: number): string {
  const formatted = formatCurrency(value);
  if (value > 0) return green(formatted);
  if (value < 0) return red(formatted);
  return formatted;
}

// =============================================================================
// Table Formatting
// =============================================================================

export interface TableColumn {
  header: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export function table(columns: TableColumn[], rows: string[][]): string {
  // Calculate column widths
  const widths = columns.map((col, i) => {
    if (col.width) return col.width;
    const dataWidths = rows.map(row => stripAnsi(row[i] || '').length);
    return Math.max(col.header.length, ...dataWidths);
  });

  // Create header
  const header = columns.map((col, i) => padCell(col.header, widths[i], col.align || 'left')).join('  ');
  const separator = widths.map(w => '-'.repeat(w)).join('  ');

  // Create rows
  const dataRows = rows.map(row =>
    columns.map((col, i) => padCell(row[i] || '', widths[i], col.align || 'left')).join('  ')
  );

  return [header, separator, ...dataRows].join('\n');
}

function padCell(text: string, width: number, align: 'left' | 'right' | 'center'): string {
  const textLength = stripAnsi(text).length;
  const padding = width - textLength;

  if (padding <= 0) return text;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    case 'left':
    default:
      return text + ' '.repeat(padding);
  }
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

// =============================================================================
// Box Drawing
// =============================================================================

export function box(title: string, content: string, width = 60): string {
  const lines: string[] = [];

  // Top border with title
  const titlePadded = ` ${title} `;
  const topLeft = titlePadded.length + 2;
  const topRight = width - topLeft - 2;
  lines.push(`+${'-'.repeat(topLeft - 1)}${bold(titlePadded)}${'-'.repeat(Math.max(0, topRight))}+`);

  // Content lines
  const contentLines = content.split('\n');
  for (const line of contentLines) {
    const stripped = stripAnsi(line);
    const padding = width - stripped.length - 4;
    lines.push(`| ${line}${' '.repeat(Math.max(0, padding))} |`);
  }

  // Bottom border
  lines.push(`+${'-'.repeat(width - 2)}+`);

  return lines.join('\n');
}

// =============================================================================
// Progress and Status
// =============================================================================

export function spinner(message: string): { stop: (finalMessage?: string) => void } {
  const frames = ['|', '/', '-', '\\'];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${frames[i]} ${message}`);
    i = (i + 1) % frames.length;
  }, 100);

  return {
    stop(finalMessage?: string) {
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(message.length + 10) + '\r');
      if (finalMessage) {
        console.log(finalMessage);
      }
    },
  };
}

export function success(message: string): void {
  console.log(green('OK') + ' ' + message);
}

export function warn(message: string): void {
  console.log(yellow('WARN') + ' ' + message);
}

export function error(message: string): void {
  console.log(red('ERROR') + ' ' + message);
}

export function info(message: string): void {
  console.log(cyan('INFO') + ' ' + message);
}

// =============================================================================
// Section Headers
// =============================================================================

export function header(text: string): string {
  return `\n${bold(text)}\n${'='.repeat(text.length)}`;
}

export function subheader(text: string): string {
  return `\n${cyan(text)}\n${'-'.repeat(text.length)}`;
}
