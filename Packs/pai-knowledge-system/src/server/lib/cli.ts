/**
 * CLI Utilities Library
 *
 * Provides colored output, interactive prompts, and formatting helpers
 * for consistent command-line interface across all scripts.
 */

import chalk from "chalk";
import type inquirer from "inquirer";

// Prompt types
export type PromptChoice = string;
export type PromptChoices = PromptChoice[];

// Checkbox choice
export interface CheckboxChoice {
  name: string;
  value: string;
  checked?: boolean;
}

// Select choice
export interface SelectChoice {
  name: string;
  value: string;
}

/**
 * CLI Output class for consistent formatting
 */
export class CLIOutput {
  /**
   * Print a header/section title
   */
  static header(title: string, width = 50): void {
    const line = "═".repeat(width);
    console.log();
    console.log(chalk.blue(line));
    console.log(chalk.blue.bold(title));
    console.log(chalk.blue(line));
    console.log();
  }

  /**
   * Print a step/section header
   */
  static step(text: string): void {
    console.log();
    console.log(chalk.green.bold(`▶ ${text}`));
    console.log();
  }

  /**
   * Print a sub-step
   */
  static substep(text: string): void {
    console.log(chalk.cyan(`  → ${text}`));
  }

  /**
   * Print a success message
   */
  static success(text: string): void {
    console.log(`${chalk.green.bold("✓")} ${text}`);
  }

  /**
   * Print an error message
   */
  static error(text: string): void {
    console.error(`${chalk.red.bold("✗")} ${text}`);
  }

  /**
   * Print a warning message
   */
  static warning(text: string): void {
    console.log(`${chalk.yellow.bold("⚠")} ${text}`);
  }

  /**
   * Print an info message
   */
  static info(text: string): void {
    console.log(chalk.gray(text));
  }

  /**
   * Print a dimmed/subtle message
   */
  static dim(text: string): void {
    console.log(chalk.dim(text));
  }

  /**
   * Print a key-value pair
   */
  static kv(key: string, value: string): void {
    console.log(`${chalk.cyan(key)}: ${chalk.white(value)}`);
  }

  /**
   * Print a blank line
   */
  static blank(): void {
    console.log();
  }

  /**
   * Print a separator line
   */
  static separator(char = "─", width = 50): void {
    console.log(chalk.gray(char.repeat(width)));
  }

  /**
   * Print a bulleted list
   */
  static list(items: string[], indent = 0): void {
    const prefix = " ".repeat(indent);
    items.forEach((item) => {
      console.log(`${prefix}${chalk.gray("•")} ${item}`);
    });
  }

  /**
   * Print a numbered list
   */
  static numberedList(items: string[], start = 1): void {
    items.forEach((item, index) => {
      const num = chalk.cyan(`${start + index})`);
      console.log(`  ${num} ${item}`);
    });
  }

  /**
   * Print a table (simple 2-column)
   */
  static table(rows: [string, string][]): void {
    const maxKeyLength = Math.max(...rows.map(([key]) => key.length));
    rows.forEach(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(`  ${chalk.cyan(paddedKey)}  ${chalk.white(value)}`);
    });
  }

  /**
   * Print a code block
   */
  static code(text: string, language = ""): void {
    console.log();
    if (language) {
      console.log(chalk.dim(`${language}:`));
    }
    console.log(chalk.gray(text));
  }

  /**
   * Clear the terminal
   */
  static clear(): void {
    console.clear();
  }

  /**
   * Print a box
   */
  static box(lines: string[], title = ""): void {
    const maxLength = Math.max(...lines.map((line) => line.length), title.length);
    const horizontal = "─".repeat(maxLength + 2);

    console.log();
    console.log(chalk.gray(`┌${horizontal}┐`));

    if (title) {
      const paddedTitle = title.padEnd(maxLength);
      console.log(chalk.gray(`│ ${chalk.white.bold(paddedTitle)} │`));
      console.log(chalk.gray(`├${horizontal}┤`));
    }

    lines.forEach((line) => {
      const paddedLine = line.padEnd(maxLength);
      console.log(chalk.gray(`│ ${chalk.white(paddedLine)} │`));
    });

    console.log(chalk.gray(`└${horizontal}┘`));
    console.log();
  }

  /**
   * Print a spinner placeholder (for async operations)
   * Note: For actual spinners, use a library like ora or cli-spinners
   */
  static spinner(text: string): void {
    console.log(chalk.cyan(`⟳ ${text}`));
  }

  /**
   * Print a URL
   */
  static url(label: string, url: string): void {
    console.log(`  ${chalk.cyan(label)}: ${chalk.blue.underline(url)}`);
  }

  /**
   * Print command hint
   */
  static hint(command: string): void {
    console.log(chalk.dim(`  $ ${command}`));
  }

  /**
   * Print multiple hints
   */
  static hints(commands: string[]): void {
    commands.forEach((cmd) => this.hint(cmd));
  }

  /**
   * Print emoji with text
   */
  static emoji(emoji: string, text: string): void {
    console.log(`${emoji} ${text}`);
  }

  /**
   * Print progress (percentage)
   */
  static progress(current: number, total: number, label = ""): void {
    const percentage = Math.round((current / total) * 100);
    const bar = "█".repeat(Math.floor(percentage / 5)) + "░".repeat(20 - Math.floor(percentage / 5));
    const text = label ? `${label} ` : "";

    console.log(
      `${text}[${chalk.green(bar)}] ${chalk.cyan(percentage)}% (${current}/${total})`
    );
  }

  /**
   * Print JSON output (pretty-printed)
   */
  static json(data: unknown, pretty = true): void {
    if (pretty) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(JSON.stringify(data));
    }
  }

  /**
   * Print error details
   */
  static errorDetails(error: Error | unknown): void {
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
      if (error.stack) {
        console.error(chalk.dim(error.stack));
      }
    } else {
      console.error(chalk.red(String(error)));
    }
  }
}

/**
 * CLI Prompts class for interactive input
 */
export class CLIPrompts {
  private inquirer: typeof inquirer;

  constructor(inquirerModule: typeof inquirer) {
    this.inquirer = inquirerModule;
  }

  /**
   * Prompt for text input
   */
  async input(message: string, defaultValue = ""): Promise<string> {
    const answers = await this.inquirer.prompt<{ value: string }>([
      {
        type: "input",
        name: "value",
        message,
        default: defaultValue,
      },
    ]);
    return answers.value;
  }

  /**
   * Prompt for password (hidden input)
   */
  async password(message: string): Promise<string> {
    const answers = await this.inquirer.prompt<{ value: string }>([
      {
        type: "password",
        name: "value",
        message,
      },
    ]);
    return answers.value;
  }

  /**
   * Prompt for confirmation (yes/no)
   */
  async confirm(message: string, defaultValue = false): Promise<boolean> {
    const answers = await this.inquirer.prompt<{ value: boolean }>([
      {
        type: "confirm",
        name: "value",
        message,
        default: defaultValue,
      },
    ]);
    return answers.value;
  }

  /**
   * Prompt for single choice selection
   */
  async select(message: string, choices: SelectChoice[], defaultValue?: string): Promise<string> {
    const answers = await this.inquirer.prompt<{ value: string }>([
      {
        type: "list",
        name: "value",
        message,
        choices,
        default: defaultValue,
      },
    ]);
    return answers.value;
  }

  /**
   * Prompt for multiple choice selection (checkboxes)
   */
  async multiselect(message: string, choices: CheckboxChoice[]): Promise<string[]> {
    const answers = await this.inquirer.prompt<{ value: string[] }>([
      {
        type: "checkbox",
        name: "value",
        message,
        choices,
      },
    ]);
    return answers.value;
  }

  /**
   * Prompt for number input
   */
  async number(message: string, defaultValue?: number): Promise<number> {
    const answers = await this.inquirer.prompt<{ value: number }>([
      {
        type: "number",
        name: "value",
        message,
        default: defaultValue,
      },
    ]);
    return answers.value;
  }

  /**
   * Prompt for number selection from list
   */
  async numberSelect(
    message: string,
    choices: { name: string; value: number }[],
    defaultValue?: number
  ): Promise<number> {
    const answers = await this.inquirer.prompt<{ value: number }>([
      {
        type: "list",
        name: "value",
        message,
        choices,
        default: defaultValue,
      },
    ]);
    return answers.value;
  }
}

/**
 * Validation helpers
 */
export class Validators {
  /**
   * Validate non-empty string
   */
  static nonEmpty(value: string): boolean | string {
    if (!value || value.trim().length === 0) {
      return "This field is required";
    }
    return true;
  }

  /**
   * Validate number is positive
   */
  static positive(value: number): boolean | string {
    if (value <= 0) {
      return "Must be a positive number";
    }
    return true;
  }

  /**
   * Validate number is in range
   */
  static range(min: number, max: number) {
    return (value: number): boolean | string => {
      if (value < min || value > max) {
        return `Must be between ${min} and ${max}`;
      }
      return true;
    };
  }

  /**
   * Validate URL format
   */
  static url(value: string): boolean | string {
    try {
      new URL(value);
      return true;
    } catch {
      return "Must be a valid URL";
    }
  }

  /**
   * Validate API key format (basic check)
   */
  static apiKey(value: string): boolean | string {
    if (!value || value.trim().length === 0) {
      return "API key is required";
    }
    if (value.length < 10) {
      return "API key seems too short";
    }
    return true;
  }
}

/**
 * Formatting helpers
 */
export class Formatters {
  /**
   * Format bytes to human-readable size
   */
  static bytes(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Format duration in seconds to human-readable time
   */
  static duration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
  }

  /**
   * Format date to relative time (e.g., "2 hours ago")
   */
  static relativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "just now";
  }

  /**
   * Format percentage
   */
  static percentage(value: number, total: number): string {
    const pct = Math.round((value / total) * 100);
    return `${pct}%`;
  }

  /**
   * Pad text to width
   */
  static pad(text: string, width: number, align: "left" | "right" | "center" = "left"): string {
    if (text.length >= width) return text;

    const padding = width - text.length;

    switch (align) {
      case "left":
        return text + " ".repeat(padding);
      case "right":
        return " ".repeat(padding) + text;
      case "center":
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return " ".repeat(left) + text + " ".repeat(right);
    }
  }

  /**
   * Truncate text to max length
   */
  static truncate(text: string, maxLength: number, suffix = "..."): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Mask sensitive text (e.g., API keys)
   */
  static mask(text: string, visibleChars = 4, maskChar = "•"): string {
    if (text.length <= visibleChars) return text;
    const start = text.substring(0, visibleChars);
    const end = text.substring(text.length - 4);
    const masked = maskChar.repeat(Math.max(0, text.length - visibleChars - 4));
    return `${start}${masked}${end}`;
  }
}

/**
 * Export shorthand functions for convenience
 */
export const cli = {
  header: CLIOutput.header,
  step: CLIOutput.step,
  substep: CLIOutput.substep,
  success: CLIOutput.success,
  error: CLIOutput.error,
  warning: CLIOutput.warning,
  info: CLIOutput.info,
  dim: CLIOutput.dim,
  blank: CLIOutput.blank,
  separator: CLIOutput.separator,
  clear: CLIOutput.clear,
  url: CLIOutput.url,
  kv: CLIOutput.kv,
  list: CLIOutput.list,
  table: CLIOutput.table,
  hint: CLIOutput.hint,
  hints: CLIOutput.hints,
};

export const fmt = {
  bytes: Formatters.bytes,
  duration: Formatters.duration,
  relativeTime: Formatters.relativeTime,
  percentage: Formatters.percentage,
  pad: Formatters.pad,
  truncate: Formatters.truncate,
  mask: Formatters.mask,
};

export const validate = {
  nonEmpty: Validators.nonEmpty,
  positive: Validators.positive,
  range: Validators.range,
  url: Validators.url,
  apiKey: Validators.apiKey,
};
