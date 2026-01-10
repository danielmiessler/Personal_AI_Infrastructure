#!/usr/bin/env bun
/**
 * FeedManager - CLI tool for managing threat intelligence feed sources
 *
 * Usage:
 *   bun run FeedManager.ts list                           # List all feeds
 *   bun run FeedManager.ts list --category malware        # Filter by category
 *   bun run FeedManager.ts add --name "..." --url "..." --category apt --format json
 *   bun run FeedManager.ts remove --name "My Feed"
 *   bun run FeedManager.ts enable --name "My Feed"
 *   bun run FeedManager.ts disable --name "My Feed"
 *   bun run FeedManager.ts test --name "My Feed"          # Test connection
 *   bun run FeedManager.ts test --all                     # Test all feeds
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { parse, stringify } from "yaml";
import { join, dirname } from "path";

// ============================================
// Types
// ============================================

export type FeedCategory =
  | "malware"
  | "phishing"
  | "c2"
  | "apt"
  | "general"
  | "iocs"
  | "reputation"
  | "infrastructure"
  | "government"
  | "blog";

export type FeedFormat = "json" | "xml" | "csv" | "rss" | "txt" | "html" | "markdown";

export type UpdateFrequency = "hourly" | "daily" | "weekly" | "on_demand";

export type TLP = "clear" | "green" | "amber" | "red";

export interface Feed {
  name: string;
  description?: string;
  url: string;
  category: FeedCategory;
  format: FeedFormat;
  api_key_env: string | null;
  update_frequency: UpdateFrequency;
  enabled: boolean;
  priority: number; // 1-10
  tlp: TLP;
  ioc_types?: string[];
  rate_limit?: string;
  added?: string;
  last_checked?: string | null;
  notes?: string;
}

export interface FeedConfig {
  version: string;
  last_updated: string;
  feeds: Feed[];
  settings?: {
    default_update_frequency: UpdateFrequency;
    max_concurrent_fetches: number;
    request_timeout: number;
    retry_attempts: number;
    retry_delay: number;
    cache_ttl: number;
    storage_path: string;
    max_iocs_per_feed: number;
    retention_days: number;
    notify_on_critical: boolean;
    notify_on_high: boolean;
    notification_channels: string[];
  };
  categories?: Array<{
    name: string;
    description: string;
    color: string;
  }>;
}

export interface TestResult {
  name: string;
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  apiKeyValid?: boolean;
  parseable?: boolean;
  sampleData?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================
// Configuration Path Resolution
// ============================================

const DEFAULT_CONFIG_PATH = join(dirname(import.meta.path), "..", "Data", "TISources.yaml");

let configPath = DEFAULT_CONFIG_PATH;

export function setConfigPath(path: string): void {
  configPath = path;
}

export function getConfigPath(): string {
  return configPath;
}

// ============================================
// Core Functions
// ============================================

/**
 * Load the feed configuration from YAML file
 */
export function loadConfig(): FeedConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, "utf-8");
  const config = parse(content) as FeedConfig;

  if (!config.feeds) {
    config.feeds = [];
  }

  return config;
}

/**
 * Save the feed configuration to YAML file
 */
export function saveConfig(config: FeedConfig): void {
  config.last_updated = new Date().toISOString().split("T")[0];
  const content = stringify(config, { lineWidth: 0 });
  writeFileSync(configPath, content, "utf-8");
}

/**
 * Validate a feed object
 */
export function validateFeed(feed: Partial<Feed>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!feed.name || feed.name.trim() === "") {
    errors.push({ field: "name", message: "Name is required" });
  }

  if (!feed.url || feed.url.trim() === "") {
    errors.push({ field: "url", message: "URL is required" });
  } else {
    try {
      new URL(feed.url);
    } catch {
      errors.push({ field: "url", message: "Invalid URL format" });
    }
  }

  const validCategories: FeedCategory[] = [
    "malware", "phishing", "c2", "apt", "general",
    "iocs", "reputation", "infrastructure", "government", "blog"
  ];
  if (!feed.category || !validCategories.includes(feed.category)) {
    errors.push({
      field: "category",
      message: `Category must be one of: ${validCategories.join(", ")}`
    });
  }

  const validFormats: FeedFormat[] = ["json", "xml", "csv", "rss", "txt", "html", "markdown"];
  if (!feed.format || !validFormats.includes(feed.format)) {
    errors.push({
      field: "format",
      message: `Format must be one of: ${validFormats.join(", ")}`
    });
  }

  if (feed.priority !== undefined && (feed.priority < 1 || feed.priority > 10)) {
    errors.push({ field: "priority", message: "Priority must be between 1 and 10" });
  }

  const validTlp: TLP[] = ["clear", "green", "amber", "red"];
  if (feed.tlp && !validTlp.includes(feed.tlp)) {
    errors.push({
      field: "tlp",
      message: `TLP must be one of: ${validTlp.join(", ")}`
    });
  }

  return errors;
}

/**
 * Add a new feed to the configuration
 */
export function addFeed(feed: Feed): void {
  const config = loadConfig();

  // Check for duplicate name
  const existingFeed = config.feeds.find(
    f => f.name.toLowerCase() === feed.name.toLowerCase()
  );
  if (existingFeed) {
    throw new Error(`Feed with name "${feed.name}" already exists`);
  }

  // Validate
  const errors = validateFeed(feed);
  if (errors.length > 0) {
    throw new Error(
      `Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join("; ")}`
    );
  }

  // Set defaults
  feed.added = feed.added || new Date().toISOString().split("T")[0];
  feed.last_checked = feed.last_checked ?? null;
  feed.enabled = feed.enabled ?? true;
  feed.priority = feed.priority ?? 5;
  feed.tlp = feed.tlp ?? "clear";
  feed.api_key_env = feed.api_key_env ?? null;

  config.feeds.push(feed);
  saveConfig(config);
}

/**
 * Remove a feed by name
 */
export function removeFeed(name: string): void {
  const config = loadConfig();

  const index = config.feeds.findIndex(
    f => f.name.toLowerCase() === name.toLowerCase()
  );

  if (index === -1) {
    throw new Error(`Feed "${name}" not found`);
  }

  config.feeds.splice(index, 1);
  saveConfig(config);
}

/**
 * Enable a feed by name
 */
export function enableFeed(name: string): void {
  const config = loadConfig();

  const feed = config.feeds.find(
    f => f.name.toLowerCase() === name.toLowerCase()
  );

  if (!feed) {
    throw new Error(`Feed "${name}" not found`);
  }

  feed.enabled = true;
  saveConfig(config);
}

/**
 * Disable a feed by name
 */
export function disableFeed(name: string): void {
  const config = loadConfig();

  const feed = config.feeds.find(
    f => f.name.toLowerCase() === name.toLowerCase()
  );

  if (!feed) {
    throw new Error(`Feed "${name}" not found`);
  }

  feed.enabled = false;
  saveConfig(config);
}

/**
 * List feeds, optionally filtered by category
 */
export function listFeeds(category?: string): Feed[] {
  const config = loadConfig();

  if (category) {
    return config.feeds.filter(
      f => f.category.toLowerCase() === category.toLowerCase()
    );
  }

  return config.feeds;
}

/**
 * Get a single feed by name
 */
export function getFeed(name: string): Feed | undefined {
  const config = loadConfig();
  return config.feeds.find(
    f => f.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Test a feed connection and validate response
 */
export async function testFeed(name: string): Promise<TestResult> {
  const feed = getFeed(name);

  if (!feed) {
    return {
      name,
      success: false,
      error: `Feed "${name}" not found`
    };
  }

  const result: TestResult = {
    name: feed.name,
    success: false
  };

  // Check API key if required
  if (feed.api_key_env) {
    const apiKey = process.env[feed.api_key_env];
    result.apiKeyValid = !!apiKey;
    if (!apiKey) {
      result.error = `API key not found in environment variable: ${feed.api_key_env}`;
      return result;
    }
  }

  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      "User-Agent": "PAI-CTI-FeedManager/1.0"
    };

    // Add API key to headers if required
    if (feed.api_key_env) {
      const apiKey = process.env[feed.api_key_env];
      if (apiKey) {
        // Common API key header patterns
        if (feed.url.includes("alienvault")) {
          headers["X-OTX-API-KEY"] = apiKey;
        } else if (feed.url.includes("virustotal")) {
          headers["x-apikey"] = apiKey;
        } else if (feed.url.includes("shodan")) {
          // Shodan uses query param, handled below
        } else if (feed.url.includes("urlscan")) {
          headers["API-Key"] = apiKey;
        } else {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }
    }

    let url = feed.url;
    // Handle Shodan API key as query param
    if (feed.api_key_env === "PAI_CTI_SHODAN_API_KEY" && process.env.PAI_CTI_SHODAN_API_KEY) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}key=${process.env.PAI_CTI_SHODAN_API_KEY}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    result.responseTime = Date.now() - startTime;
    result.statusCode = response.status;

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    // Try to parse the response
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    try {
      if (feed.format === "json" || contentType.includes("json")) {
        // Parse full response first to validate, then store sample
        const parsed = JSON.parse(text);
        result.parseable = true;
        // Store sample (truncate for display)
        if (typeof parsed === "object" && parsed !== null) {
          const keys = Object.keys(parsed).slice(0, 3);
          result.sampleData = keys.length > 0
            ? `Object with keys: ${keys.join(", ")}${Object.keys(parsed).length > 3 ? "..." : ""}`
            : parsed;
        } else {
          result.sampleData = String(parsed).substring(0, 200);
        }
      } else if (feed.format === "xml" || feed.format === "rss" || contentType.includes("xml")) {
        result.parseable = text.includes("<?xml") || text.includes("<rss") || text.includes("<feed") || text.includes("<");
        result.sampleData = text.substring(0, 500);
      } else if (feed.format === "csv") {
        const lines = text.split("\n").slice(0, 5);
        result.parseable = lines.length > 0;
        result.sampleData = lines;
      } else if (feed.format === "html" || contentType.includes("html")) {
        // HTML format (blog sites, threat reports)
        result.parseable = text.includes("<html") || text.includes("<body") || text.includes("<div") || text.includes("<p");
        // Extract title if present
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : "Untitled";
        result.sampleData = `HTML page: "${title}" (${text.length} bytes)`;
      } else if (feed.format === "markdown") {
        // Markdown format (Browser skill returns markdown from web pages)
        // Check for common markdown elements
        result.parseable = text.includes("#") || text.includes("*") || text.includes("-") || text.includes("[") || text.length > 0;
        // Extract first heading if present
        const headingMatch = text.match(/^#+ (.+)$/m);
        const title = headingMatch ? headingMatch[1].trim() : "Content";
        const wordCount = text.split(/\s+/).length;
        result.sampleData = `Markdown: "${title}" (~${wordCount} words)`;
      } else {
        // txt format
        const lines = text.split("\n").filter(l => l.trim()).slice(0, 5);
        result.parseable = lines.length > 0;
        result.sampleData = lines;
      }
    } catch (parseError) {
      result.parseable = false;
      result.error = `Failed to parse response as ${feed.format}`;
    }

    result.success = result.statusCode === 200 && result.parseable !== false;

  } catch (err) {
    result.responseTime = Date.now() - startTime;
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

/**
 * Test all enabled feeds
 */
export async function testAllFeeds(): Promise<TestResult[]> {
  const feeds = listFeeds();
  const enabledFeeds = feeds.filter(f => f.enabled);

  const results: TestResult[] = [];

  for (const feed of enabledFeeds) {
    const result = await testFeed(feed.name);
    results.push(result);
  }

  return results;
}

// ============================================
// CLI Output Formatting
// ============================================

function formatFeedList(feeds: Feed[]): void {
  if (feeds.length === 0) {
    console.log("No feeds found.");
    return;
  }

  console.log(`\nFound ${feeds.length} feed(s):\n`);
  console.log("%-30s %-12s %-8s %-8s %-7s".replace(/%(-?\d+)s/g, (_, w) => {
    const width = parseInt(w);
    return width > 0 ? "".padEnd(width) : "".padStart(-width);
  }));
  console.log(
    "NAME".padEnd(30) +
    "CATEGORY".padEnd(12) +
    "FORMAT".padEnd(8) +
    "ENABLED".padEnd(8) +
    "PRIORITY"
  );
  console.log("-".repeat(73));

  for (const feed of feeds) {
    console.log(
      feed.name.substring(0, 28).padEnd(30) +
      feed.category.padEnd(12) +
      feed.format.padEnd(8) +
      (feed.enabled ? "Yes" : "No").padEnd(8) +
      String(feed.priority)
    );
  }
  console.log();
}

function formatTestResult(result: TestResult): void {
  const status = result.success ? "[OK]" : "[FAIL]";
  const statusColor = result.success ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";

  console.log(`${statusColor}${status}${reset} ${result.name}`);

  if (result.statusCode) {
    console.log(`     Status: ${result.statusCode}`);
  }
  if (result.responseTime) {
    console.log(`     Response Time: ${result.responseTime}ms`);
  }
  if (result.apiKeyValid !== undefined) {
    console.log(`     API Key: ${result.apiKeyValid ? "Valid" : "Missing/Invalid"}`);
  }
  if (result.parseable !== undefined) {
    console.log(`     Parseable: ${result.parseable ? "Yes" : "No"}`);
  }
  if (result.error) {
    console.log(`     Error: ${result.error}`);
  }
  console.log();
}

// ============================================
// CLI Command Handler
// ============================================

function printUsage(): void {
  console.log(`
Feed Manager - CLI tool for managing threat intelligence feeds

Usage:
  bun run FeedManager.ts <command> [options]

Commands:
  list                              List all feeds
    --category <category>           Filter by category

  add                               Add a new feed
    --name <name>                   Feed name (required)
    --url <url>                     Feed URL (required)
    --category <category>           Feed category (required)
    --format <format>               Feed format (required)
    --api-key-env <env_var>         Environment variable for API key
    --update-frequency <freq>       Update frequency (default: daily)
    --priority <1-10>               Priority (default: 5)
    --tlp <clear|green|amber|red>   TLP classification (default: clear)
    --description <desc>            Feed description

  remove                            Remove a feed
    --name <name>                   Feed name (required)

  enable                            Enable a feed
    --name <name>                   Feed name (required)

  disable                           Disable a feed
    --name <name>                   Feed name (required)

  test                              Test feed connection
    --name <name>                   Feed name to test
    --all                           Test all enabled feeds

Categories: malware, phishing, c2, apt, general, iocs, reputation, infrastructure, government, blog
Formats: json, xml, csv, rss, txt, html, markdown
`);
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith("--")) {
        result[key] = nextArg;
        i++;
      } else {
        result[key] = true;
      }
    } else if (!result._command) {
      result._command = arg;
    }
  }

  return result;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const command = args._command as string;

  if (!command || command === "help" || args.help) {
    printUsage();
    process.exit(0);
  }

  try {
    switch (command) {
      case "list": {
        const category = args.category as string | undefined;
        const feeds = listFeeds(category);
        formatFeedList(feeds);
        break;
      }

      case "add": {
        if (!args.name || !args.url || !args.category || !args.format) {
          console.error("Error: --name, --url, --category, and --format are required");
          process.exit(1);
        }

        const feed: Feed = {
          name: args.name as string,
          url: args.url as string,
          category: args.category as FeedCategory,
          format: args.format as FeedFormat,
          api_key_env: (args["api-key-env"] as string) || null,
          update_frequency: (args["update-frequency"] as UpdateFrequency) || "daily",
          enabled: true,
          priority: args.priority ? parseInt(args.priority as string, 10) : 5,
          tlp: (args.tlp as TLP) || "clear",
          description: args.description as string | undefined
        };

        addFeed(feed);
        console.log(`Feed "${feed.name}" added successfully.`);
        break;
      }

      case "remove": {
        if (!args.name) {
          console.error("Error: --name is required");
          process.exit(1);
        }
        removeFeed(args.name as string);
        console.log(`Feed "${args.name}" removed successfully.`);
        break;
      }

      case "enable": {
        if (!args.name) {
          console.error("Error: --name is required");
          process.exit(1);
        }
        enableFeed(args.name as string);
        console.log(`Feed "${args.name}" enabled successfully.`);
        break;
      }

      case "disable": {
        if (!args.name) {
          console.error("Error: --name is required");
          process.exit(1);
        }
        disableFeed(args.name as string);
        console.log(`Feed "${args.name}" disabled successfully.`);
        break;
      }

      case "test": {
        if (args.all) {
          console.log("\nTesting all enabled feeds...\n");
          const results = await testAllFeeds();

          for (const result of results) {
            formatTestResult(result);
          }

          const passed = results.filter(r => r.success).length;
          const failed = results.length - passed;
          console.log(`\nSummary: ${passed} passed, ${failed} failed out of ${results.length} feeds`);
        } else if (args.name) {
          console.log(`\nTesting feed "${args.name}"...\n`);
          const result = await testFeed(args.name as string);
          formatTestResult(result);
        } else {
          console.error("Error: --name or --all is required");
          process.exit(1);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// Run CLI if this is the main module
if (import.meta.main) {
  main();
}
