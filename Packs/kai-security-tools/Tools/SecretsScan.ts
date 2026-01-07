#!/usr/bin/env bun
/**
 * SecretsScan.ts
 *
 * Scans source code for leaked secrets, API keys, and credentials.
 *
 * Usage:
 *   bun run SecretsScan.ts [options] [directory]
 *
 * Options:
 *   --sarif                  Output in SARIF format for GitHub Security tab
 *   --baseline=<file>        Ignore findings listed in baseline file (e.g., .secretsignore)
 *   --help                   Show this help message
 *
 * Exit codes:
 *   0 - No secrets detected
 *   1 - Secrets found
 *   2 - Execution error
 */

import { existsSync, readdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";

// Types
interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
}

interface Finding {
  file: string;
  line: number;
  column: number;
  secretType: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  snippet: string;
  match: string;
}

interface BaselineEntry {
  file: string;
  line?: number;
  pattern?: string;
}

interface SarifResult {
  $schema: string;
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResultEntry[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: {
    level: "error" | "warning" | "note";
  };
}

interface SarifResultEntry {
  ruleId: string;
  message: { text: string };
  level: "error" | "warning" | "note";
  locations: {
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
        snippet?: { text: string };
      };
    };
  }[];
}

// Secret patterns to detect
const SECRET_PATTERNS: SecretPattern[] = [
  // AWS
  {
    name: "AWS Access Key ID",
    pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    severity: "critical",
    description: "AWS Access Key ID found",
  },
  {
    name: "AWS Secret Access Key",
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    severity: "critical",
    description: "AWS Secret Access Key found",
  },

  // GitHub / GitLab
  {
    name: "GitHub Token",
    pattern: /ghp_[A-Za-z0-9_]{36}/g,
    severity: "critical",
    description: "GitHub Personal Access Token found",
  },
  {
    name: "GitHub OAuth Token",
    pattern: /gho_[A-Za-z0-9_]{36}/g,
    severity: "critical",
    description: "GitHub OAuth Token found",
  },
  {
    name: "GitHub App Token",
    pattern: /ghu_[A-Za-z0-9_]{36}/g,
    severity: "critical",
    description: "GitHub User-to-Server Token found",
  },
  {
    name: "GitHub Server Token",
    pattern: /ghs_[A-Za-z0-9_]{36}/g,
    severity: "critical",
    description: "GitHub Server-to-Server Token found",
  },
  {
    name: "GitHub Refresh Token",
    pattern: /ghr_[A-Za-z0-9_]{36}/g,
    severity: "critical",
    description: "GitHub Refresh Token found",
  },
  {
    name: "GitLab Token",
    pattern: /glpat-[A-Za-z0-9\-_]{20,}/g,
    severity: "critical",
    description: "GitLab Personal Access Token found",
  },

  // AI APIs
  {
    name: "Anthropic API Key",
    pattern: /sk-ant-[a-zA-Z0-9-_]{90,}/g,
    severity: "critical",
    description: "Anthropic API Key found",
  },
  {
    name: "OpenAI API Key",
    pattern: /sk-[A-Za-z0-9]{48,}/g,
    severity: "critical",
    description: "OpenAI API Key found",
  },

  // Google
  {
    name: "Google API Key",
    pattern: /AIza[0-9A-Za-z-_]{35}/g,
    severity: "high",
    description: "Google API Key found",
  },

  // Stripe
  {
    name: "Stripe Secret Key",
    pattern: /sk_live_[0-9a-zA-Z]{24,}/g,
    severity: "critical",
    description: "Stripe Secret Key (Live) found",
  },
  {
    name: "Stripe Publishable Key",
    pattern: /pk_live_[0-9a-zA-Z]{24,}/g,
    severity: "medium",
    description: "Stripe Publishable Key (Live) found",
  },
  {
    name: "Stripe Test Secret Key",
    pattern: /sk_test_[0-9a-zA-Z]{24,}/g,
    severity: "low",
    description: "Stripe Secret Key (Test) found - consider removing from code",
  },

  // Twilio
  {
    name: "Twilio API Key",
    pattern: /SK[0-9a-fA-F]{32}/g,
    severity: "high",
    description: "Twilio API Key found",
  },

  // SendGrid
  {
    name: "SendGrid API Key",
    pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g,
    severity: "critical",
    description: "SendGrid API Key found",
  },

  // Discord
  {
    name: "Discord Token",
    pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}/g,
    severity: "critical",
    description: "Discord Bot/User Token found",
  },

  // Package Registries
  {
    name: "NPM Token",
    pattern: /npm_[A-Za-z0-9]{36}/g,
    severity: "critical",
    description: "NPM Access Token found",
  },
  {
    name: "PyPI Token",
    pattern: /pypi-[A-Za-z0-9_-]{50,}/g,
    severity: "critical",
    description: "PyPI API Token found",
  },
  {
    name: "Docker Hub Token",
    pattern: /dckr_pat_[A-Za-z0-9_-]{56}/g,
    severity: "critical",
    description: "Docker Hub Personal Access Token found",
  },

  // Heroku
  {
    name: "Heroku API Key",
    pattern: /[hH]eroku.*[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
    severity: "high",
    description: "Heroku API Key found",
  },

  // JWT
  {
    name: "JWT Token",
    pattern: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
    severity: "medium",
    description: "JWT Token found - verify it's not a secret token",
  },

  // SSH Keys
  {
    name: "SSH Private Key",
    pattern: /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/g,
    severity: "critical",
    description: "SSH Private Key found",
  },

  // Generic Private Keys
  {
    name: "Private Key",
    pattern: /-----BEGIN (?:PRIVATE KEY|ENCRYPTED PRIVATE KEY)-----/g,
    severity: "critical",
    description: "Private Key found",
  },

  // Slack
  {
    name: "Slack Token",
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*/g,
    severity: "high",
    description: "Slack Token found",
  },
  {
    name: "Slack Webhook",
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+/g,
    severity: "high",
    description: "Slack Webhook URL found",
  },

  // Generic API Keys (common patterns)
  {
    name: "Generic API Key Assignment",
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret|secret[_-]?key)\s*[=:]\s*["']([a-zA-Z0-9_-]{20,})["']/gi,
    severity: "medium",
    description: "Potential API Key assignment found",
  },

  // Database URLs with credentials
  {
    name: "Database URL with Password",
    pattern: /(?:mongodb|postgres|postgresql|mysql|redis|amqp):\/\/[^:]+:[^@]+@[^\/]+/gi,
    severity: "critical",
    description: "Database connection string with credentials found",
  },

  // Password assignments
  {
    name: "Password Assignment",
    pattern: /(?:password|passwd|pwd)\s*[=:]\s*["']([^"']{8,})["']/gi,
    severity: "high",
    description: "Hardcoded password found",
  },
];

// Files and directories to skip
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "vendor",
  "dist",
  "build",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".tox",
  ".mypy_cache",
  ".pytest_cache",
  "coverage",
  ".nyc_output",
  ".next",
  ".nuxt",
  ".cache",
]);

const SKIP_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".mp3",
  ".mp4",
  ".avi",
  ".mov",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".bin",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".pyc",
  ".pyo",
  ".class",
  ".o",
  ".obj",
  ".lock",
]);

// Parse command line arguments
function parseArgs(): {
  directory: string;
  sarif: boolean;
  baseline: string | null;
  help: boolean;
} {
  const args = process.argv.slice(2);
  let directory = process.cwd();
  let sarif = false;
  let baseline: string | null = null;
  let help = false;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--sarif") {
      sarif = true;
    } else if (arg.startsWith("--baseline=")) {
      baseline = arg.split("=")[1];
    } else if (!arg.startsWith("-")) {
      directory = resolve(arg);
    }
  }

  return { directory, sarif, baseline, help };
}

// Show help message
function showHelp(): void {
  console.log(`
SecretsScan - Detect leaked secrets in source code

Usage:
  bun run SecretsScan.ts [options] [directory]

Options:
  --sarif                  Output in SARIF format for GitHub Security tab
  --baseline=<file>        Ignore findings listed in baseline file
  --help, -h               Show this help message

Examples:
  bun run SecretsScan.ts
  bun run SecretsScan.ts /path/to/project
  bun run SecretsScan.ts --sarif > results.sarif
  bun run SecretsScan.ts --baseline=.secretsignore
  bun run SecretsScan.ts --sarif --baseline=.secretsignore /path/to/project

Baseline File Format (.secretsignore):
  # Comments start with #
  # Ignore specific file:line
  src/config.example.ts:15

  # Ignore all matches in a directory
  tests/fixtures/*

  # Ignore pattern in specific files
  *.test.ts:mock_api_key

Detected Secret Types:
  - AWS Access Keys & Secret Keys
  - GitHub/GitLab Tokens
  - Anthropic/OpenAI API Keys
  - Google API Keys
  - Stripe Keys (live & test)
  - Twilio API Keys
  - SendGrid API Keys
  - Discord Tokens
  - NPM/PyPI/Docker Hub Tokens
  - Heroku API Keys
  - JWT Tokens
  - SSH & Private Keys
  - Slack Tokens & Webhooks
  - Database URLs with credentials
  - Generic API key patterns
  - High entropy strings

Exit Codes:
  0 - No secrets detected
  1 - Secrets found
  2 - Execution error
`);
}

// Parse baseline file
function parseBaseline(baselinePath: string): BaselineEntry[] {
  const entries: BaselineEntry[] = [];

  if (!existsSync(baselinePath)) {
    return entries;
  }

  try {
    const content = require("fs").readFileSync(baselinePath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Parse file:line format
      const colonIndex = trimmed.lastIndexOf(":");
      if (colonIndex > 0) {
        const file = trimmed.substring(0, colonIndex);
        const rest = trimmed.substring(colonIndex + 1);

        // Check if it's a line number
        const lineNum = parseInt(rest, 10);
        if (!isNaN(lineNum)) {
          entries.push({ file, line: lineNum });
        } else {
          // It's a pattern
          entries.push({ file, pattern: rest });
        }
      } else {
        // Just a file/glob pattern
        entries.push({ file: trimmed });
      }
    }
  } catch (error) {
    console.error(`Warning: Could not parse baseline file: ${error}`);
  }

  return entries;
}

// Check if a finding should be ignored based on baseline
function isIgnored(
  finding: Finding,
  baseDir: string,
  baseline: BaselineEntry[]
): boolean {
  if (baseline.length === 0) {
    return false;
  }

  const relativePath = relative(baseDir, finding.file);

  for (const entry of baseline) {
    // Check glob patterns
    if (entry.file.includes("*")) {
      const regexPattern = entry.file
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*");
      const regex = new RegExp(`^${regexPattern}$`);

      if (regex.test(relativePath)) {
        // If there's a pattern requirement, check it
        if (entry.pattern) {
          if (finding.match.includes(entry.pattern)) {
            return true;
          }
        } else if (!entry.line) {
          // No pattern or line, ignore all matches in this file
          return true;
        }
      }
    }

    // Check exact file match
    if (entry.file === relativePath || entry.file === finding.file) {
      if (entry.line !== undefined) {
        // Specific line
        if (finding.line === entry.line) {
          return true;
        }
      } else if (entry.pattern) {
        // Pattern match
        if (finding.match.includes(entry.pattern)) {
          return true;
        }
      } else {
        // Ignore all in file
        return true;
      }
    }
  }

  return false;
}

// Calculate Shannon entropy
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;

  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// Check for high entropy strings (potential secrets)
function findHighEntropyStrings(
  content: string,
  filePath: string,
  lineNumber: number,
  line: string
): Finding[] {
  const findings: Finding[] = [];

  // Look for base64-like strings in assignments
  const assignmentPattern =
    /(?:key|secret|token|password|credential|auth)\s*[=:]\s*["']([A-Za-z0-9+/=]{40,})["']/gi;
  let match;

  while ((match = assignmentPattern.exec(line)) !== null) {
    const potentialSecret = match[1];

    // Calculate entropy
    const entropy = calculateEntropy(potentialSecret);

    // High entropy threshold (random strings typically have entropy > 4.5)
    if (entropy > 4.5) {
      findings.push({
        file: filePath,
        line: lineNumber,
        column: match.index + 1,
        secretType: "High Entropy String",
        severity: "medium",
        description: `High entropy string found (entropy: ${entropy.toFixed(2)})`,
        snippet: line.trim().substring(0, 100),
        match: potentialSecret.substring(0, 20) + "...",
      });
    }
  }

  return findings;
}

// Get all files recursively
function getFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    try {
      const entries = readdirSync(currentDir);

      for (const entry of entries) {
        // Skip hidden files and directories (except specific ones)
        if (entry.startsWith(".") && entry !== ".env") {
          continue;
        }

        // Skip excluded directories
        if (SKIP_DIRS.has(entry)) {
          continue;
        }

        const fullPath = join(currentDir, entry);

        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (stat.isFile()) {
            // Skip by extension
            const ext = entry.substring(entry.lastIndexOf(".")).toLowerCase();
            if (SKIP_EXTENSIONS.has(ext)) {
              continue;
            }

            // Skip large files (> 1MB)
            if (stat.size > 1024 * 1024) {
              continue;
            }

            files.push(fullPath);
          }
        } catch {
          // Skip files we can't stat
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(dir);
  return files;
}

// Scan a single file for secrets
async function scanFile(filePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  try {
    const content = await Bun.file(filePath).text();
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Skip lines that look like they're in comments explaining what NOT to do
      if (
        line.includes("example") ||
        line.includes("EXAMPLE") ||
        line.includes("placeholder") ||
        line.includes("PLACEHOLDER") ||
        line.includes("your-") ||
        line.includes("YOUR_") ||
        line.includes("xxx") ||
        line.includes("XXX")
      ) {
        continue;
      }

      // Check all secret patterns
      for (const pattern of SECRET_PATTERNS) {
        // Reset regex state
        pattern.pattern.lastIndex = 0;

        let match;
        while ((match = pattern.pattern.exec(line)) !== null) {
          const matchText = match[0];

          // Skip if it looks like a test/example value
          if (
            matchText.includes("test") ||
            matchText.includes("example") ||
            matchText.includes("dummy") ||
            matchText.includes("fake") ||
            matchText.includes("mock")
          ) {
            continue;
          }

          findings.push({
            file: filePath,
            line: lineNumber,
            column: match.index + 1,
            secretType: pattern.name,
            severity: pattern.severity,
            description: pattern.description,
            snippet: line.trim().substring(0, 100),
            match:
              matchText.length > 20
                ? matchText.substring(0, 20) + "..."
                : matchText,
          });
        }
      }

      // Check for high entropy strings
      const entropyFindings = findHighEntropyStrings(
        content,
        filePath,
        lineNumber,
        line
      );
      findings.push(...entropyFindings);
    }
  } catch {
    // Skip files we can't read
  }

  return findings;
}

// Convert severity to SARIF level
function severityToSarifLevel(
  severity: string
): "error" | "warning" | "note" {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    default:
      return "note";
  }
}

// Generate SARIF output
function generateSarif(findings: Finding[], baseDir: string): SarifResult {
  const rules: SarifRule[] = [];
  const results: SarifResultEntry[] = [];
  const seenRules = new Set<string>();

  for (const finding of findings) {
    const ruleId = finding.secretType.replace(/\s+/g, "-").toLowerCase();

    // Add rule if not already added
    if (!seenRules.has(ruleId)) {
      seenRules.add(ruleId);
      rules.push({
        id: ruleId,
        name: finding.secretType,
        shortDescription: { text: finding.description },
        fullDescription: { text: finding.description },
        defaultConfiguration: {
          level: severityToSarifLevel(finding.severity),
        },
      });
    }

    // Add result
    results.push({
      ruleId,
      message: {
        text: `${finding.severity.toUpperCase()}: ${finding.description}`,
      },
      level: severityToSarifLevel(finding.severity),
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: relative(baseDir, finding.file),
            },
            region: {
              startLine: finding.line,
              startColumn: finding.column,
              snippet: { text: finding.snippet },
            },
          },
        },
      ],
    });
  }

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "SecretsScan",
            version: "1.0.0",
            informationUri:
              "https://github.com/your-org/kai-security-tools",
            rules,
          },
        },
        results,
      },
    ],
  };
}

// Print human-readable output
function printResults(findings: Finding[], baseDir: string): void {
  console.log("\n=== Secrets Scan Results ===\n");

  if (findings.length === 0) {
    console.log("No secrets detected.\n");
    return;
  }

  // Group by severity
  const bySeverity: Record<string, Finding[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  for (const finding of findings) {
    bySeverity[finding.severity].push(finding);
  }

  // Print summary
  console.log("Summary:");
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High:     ${bySeverity.high.length}`);
  console.log(`  Medium:   ${bySeverity.medium.length}`);
  console.log(`  Low:      ${bySeverity.low.length}`);
  console.log(`  Total:    ${findings.length}\n`);

  // Print details
  for (const severity of ["critical", "high", "medium", "low"]) {
    const severityFindings = bySeverity[severity];
    if (severityFindings.length === 0) continue;

    console.log(`--- ${severity.toUpperCase()} ---`);
    for (const finding of severityFindings) {
      const relativePath = relative(baseDir, finding.file);
      console.log(`  [${finding.secretType}] ${relativePath}:${finding.line}`);
      console.log(`    ${finding.description}`);
      console.log(`    Match: ${finding.match}`);
      console.log(`    Context: ${finding.snippet}`);
      console.log("");
    }
  }
}

// Main function
async function main(): Promise<void> {
  const { directory, sarif, baseline, help } = parseArgs();

  if (help) {
    showHelp();
    process.exit(0);
  }

  // Check if directory exists
  if (!existsSync(directory)) {
    console.error(`Error: Directory not found: ${directory}`);
    process.exit(2);
  }

  // Parse baseline if provided
  let baselineEntries: BaselineEntry[] = [];
  if (baseline) {
    const baselinePath = resolve(directory, baseline);
    baselineEntries = parseBaseline(baselinePath);
    if (!sarif && baselineEntries.length > 0) {
      console.log(`Loaded ${baselineEntries.length} baseline entries from ${baseline}`);
    }
  }

  // Get all files
  const files = getFiles(directory);

  if (!sarif) {
    console.log(`Scanning ${files.length} files...`);
  }

  // Scan all files
  const allFindings: Finding[] = [];

  for (const file of files) {
    const findings = await scanFile(file);
    allFindings.push(...findings);
  }

  // Filter out ignored findings
  const filteredFindings = allFindings.filter(
    (f) => !isIgnored(f, directory, baselineEntries)
  );

  // Deduplicate findings (same file, line, type)
  const seen = new Set<string>();
  const uniqueFindings = filteredFindings.filter((f) => {
    const key = `${f.file}:${f.line}:${f.secretType}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  // Output results
  if (sarif) {
    console.log(JSON.stringify(generateSarif(uniqueFindings, directory), null, 2));
  } else {
    printResults(uniqueFindings, directory);

    if (uniqueFindings.length > 0) {
      console.log("Recommendations:");
      console.log("  1. Remove secrets from source code");
      console.log("  2. Use environment variables or secret managers");
      console.log("  3. Rotate any exposed credentials immediately");
      console.log("  4. Add false positives to .secretsignore baseline file");
      console.log("");
    }
  }

  // Exit with appropriate code
  if (uniqueFindings.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(2);
});
