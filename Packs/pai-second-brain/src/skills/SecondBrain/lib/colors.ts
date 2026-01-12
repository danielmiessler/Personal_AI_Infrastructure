/**
 * ANSI color utilities for CLI output
 * Shared across all SecondBrain tools
 */

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
} as const;

export type ColorName = keyof typeof colors;

/** Colorize text with ANSI codes */
export const c = (color: ColorName, text: string): string =>
  `${colors[color]}${text}${colors.reset}`;

/** Print a header line */
export const header = (text: string, width = 60): string => {
  const line = "═".repeat(width);
  return `${line}\n${text.padStart((width + text.length) / 2).padEnd(width)}\n${line}`;
};

/** Print a divider */
export const divider = (width = 60): string => "─".repeat(width);
