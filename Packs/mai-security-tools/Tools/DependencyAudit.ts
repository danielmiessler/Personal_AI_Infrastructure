#!/usr/bin/env bun
/**
 * DependencyAudit.ts
 *
 * Scans project dependencies for known vulnerabilities (CVEs) across multiple package managers.
 *
 * Supported package managers:
 * - npm (package-lock.json)
 * - pnpm (pnpm-lock.yaml)
 * - yarn (yarn.lock)
 * - pip (requirements.txt)
 * - poetry (poetry.lock)
 * - cargo (Cargo.lock)
 * - go (go.sum)
 *
 * Usage:
 *   bun run DependencyAudit.ts [options] [directory]
 *
 * Options:
 *   --fail-on=<severity>   Fail if vulnerabilities at or above severity (critical|high|medium|low)
 *   --sarif                Output in SARIF format for GitHub Security tab
 *   --help                 Show this help message
 *
 * Exit codes:
 *   0 - No vulnerabilities at or above threshold
 *   1 - Vulnerabilities found at or above threshold
 *   2 - Audit tool not installed or execution error
 */

import { existsSync } from "fs";
import { join, resolve } from "path";

// Types
interface Vulnerability {
  id: string;
  package: string;
  version: string;
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  title: string;
  description: string;
  url?: string;
  fixedIn?: string;
}

interface AuditResult {
  packageManager: string;
  vulnerabilities: Vulnerability[];
  error?: string;
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
  helpUri?: string;
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
      region?: { startLine: number };
    };
  }[];
}

// Severity ordering for comparison
const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

// Parse command line arguments
function parseArgs(): {
  directory: string;
  failOn: string | null;
  sarif: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  let directory = process.cwd();
  let failOn: string | null = null;
  let sarif = false;
  let help = false;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--sarif") {
      sarif = true;
    } else if (arg.startsWith("--fail-on=")) {
      failOn = arg.split("=")[1].toLowerCase();
      if (!["critical", "high", "medium", "low"].includes(failOn)) {
        console.error(
          `Invalid severity: ${failOn}. Use: critical, high, medium, low`
        );
        process.exit(2);
      }
    } else if (!arg.startsWith("-")) {
      directory = resolve(arg);
    }
  }

  return { directory, failOn, sarif, help };
}

// Show help message
function showHelp(): void {
  console.log(`
DependencyAudit - Scan dependencies for known vulnerabilities

Usage:
  bun run DependencyAudit.ts [options] [directory]

Options:
  --fail-on=<severity>   Fail if vulnerabilities at or above severity
                         Values: critical, high, medium, low
  --sarif                Output in SARIF format for GitHub Security tab
  --help, -h             Show this help message

Examples:
  bun run DependencyAudit.ts
  bun run DependencyAudit.ts /path/to/project
  bun run DependencyAudit.ts --fail-on=high
  bun run DependencyAudit.ts --sarif > results.sarif
  bun run DependencyAudit.ts --fail-on=critical --sarif /path/to/project

Supported Package Managers:
  - npm (package-lock.json)
  - pnpm (pnpm-lock.yaml)
  - yarn (yarn.lock)
  - pip (requirements.txt)
  - poetry (poetry.lock)
  - cargo (Cargo.lock)
  - go (go.sum)

Exit Codes:
  0 - No vulnerabilities at or above threshold
  1 - Vulnerabilities found at or above threshold
  2 - Audit tool not installed or execution error
`);
}

// Detect package manager
function detectPackageManager(
  dir: string
): { manager: string; lockFile: string } | null {
  const lockFiles = [
    { manager: "pnpm", lockFile: "pnpm-lock.yaml" },
    { manager: "yarn", lockFile: "yarn.lock" },
    { manager: "npm", lockFile: "package-lock.json" },
    { manager: "poetry", lockFile: "poetry.lock" },
    { manager: "pip", lockFile: "requirements.txt" },
    { manager: "cargo", lockFile: "Cargo.lock" },
    { manager: "go", lockFile: "go.sum" },
  ];

  for (const { manager, lockFile } of lockFiles) {
    if (existsSync(join(dir, lockFile))) {
      return { manager, lockFile };
    }
  }

  // Check for package.json without lock file (npm fallback)
  if (existsSync(join(dir, "package.json"))) {
    return { manager: "npm", lockFile: "package.json" };
  }

  return null;
}

// Check if a command exists
async function commandExists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", cmd], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

// Normalize severity string
function normalizeSeverity(
  sev: string
): "critical" | "high" | "medium" | "low" | "unknown" {
  const normalized = sev.toLowerCase();
  if (normalized === "critical") return "critical";
  if (normalized === "high") return "high";
  if (normalized === "medium" || normalized === "moderate") return "medium";
  if (normalized === "low") return "low";
  return "unknown";
}

// Run npm audit
async function runNpmAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  try {
    const proc = Bun.spawn(["npm", "audit", "--json"], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    if (stdout.trim()) {
      const data = JSON.parse(stdout);

      if (data.vulnerabilities) {
        for (const [pkgName, info] of Object.entries(
          data.vulnerabilities as Record<string, any>
        )) {
          vulnerabilities.push({
            id: info.via?.[0]?.source || `npm-${pkgName}`,
            package: pkgName,
            version: info.range || "unknown",
            severity: normalizeSeverity(info.severity || "unknown"),
            title: info.via?.[0]?.title || `Vulnerability in ${pkgName}`,
            description:
              info.via?.[0]?.title || `Vulnerability found in ${pkgName}`,
            url: info.via?.[0]?.url,
            fixedIn: info.fixAvailable?.version,
          });
        }
      }
    }

    return { packageManager: "npm", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "npm",
      vulnerabilities: [],
      error: `npm audit failed: ${error}`,
    };
  }
}

// Run pnpm audit
async function runPnpmAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  if (!(await commandExists("pnpm"))) {
    return {
      packageManager: "pnpm",
      vulnerabilities: [],
      error:
        "pnpm is not installed. Install it with: npm install -g pnpm",
    };
  }

  try {
    const proc = Bun.spawn(["pnpm", "audit", "--json"], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    if (stdout.trim()) {
      const data = JSON.parse(stdout);

      if (data.advisories) {
        for (const [id, advisory] of Object.entries(
          data.advisories as Record<string, any>
        )) {
          vulnerabilities.push({
            id: String(id),
            package: advisory.module_name,
            version: advisory.vulnerable_versions || "unknown",
            severity: normalizeSeverity(advisory.severity || "unknown"),
            title: advisory.title || `Vulnerability in ${advisory.module_name}`,
            description: advisory.overview || advisory.title,
            url: advisory.url,
            fixedIn: advisory.patched_versions,
          });
        }
      }
    }

    return { packageManager: "pnpm", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "pnpm",
      vulnerabilities: [],
      error: `pnpm audit failed: ${error}`,
    };
  }
}

// Run yarn audit
async function runYarnAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  if (!(await commandExists("yarn"))) {
    return {
      packageManager: "yarn",
      vulnerabilities: [],
      error:
        "yarn is not installed. Install it with: npm install -g yarn",
    };
  }

  try {
    const proc = Bun.spawn(["yarn", "audit", "--json"], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    // Yarn outputs NDJSON (one JSON object per line)
    const lines = stdout.trim().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.type === "auditAdvisory" && data.data?.advisory) {
          const advisory = data.data.advisory;
          vulnerabilities.push({
            id: String(advisory.id),
            package: advisory.module_name,
            version: advisory.vulnerable_versions || "unknown",
            severity: normalizeSeverity(advisory.severity || "unknown"),
            title: advisory.title || `Vulnerability in ${advisory.module_name}`,
            description: advisory.overview || advisory.title,
            url: advisory.url,
            fixedIn: advisory.patched_versions,
          });
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return { packageManager: "yarn", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "yarn",
      vulnerabilities: [],
      error: `yarn audit failed: ${error}`,
    };
  }
}

// Run pip-audit
async function runPipAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  if (!(await commandExists("pip-audit"))) {
    return {
      packageManager: "pip",
      vulnerabilities: [],
      error:
        "pip-audit is not installed. Install it with: pip install pip-audit",
    };
  }

  try {
    const proc = Bun.spawn(
      ["pip-audit", "-r", "requirements.txt", "--format", "json"],
      {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    if (stdout.trim()) {
      const data = JSON.parse(stdout);

      if (Array.isArray(data)) {
        for (const item of data) {
          for (const vuln of item.vulns || []) {
            vulnerabilities.push({
              id: vuln.id || `pip-${item.name}`,
              package: item.name,
              version: item.version || "unknown",
              severity: normalizeSeverity(vuln.fix_versions ? "high" : "medium"),
              title: `${vuln.id} in ${item.name}`,
              description: vuln.description || `Vulnerability in ${item.name}`,
              url: vuln.id ? `https://nvd.nist.gov/vuln/detail/${vuln.id}` : undefined,
              fixedIn: vuln.fix_versions?.join(", "),
            });
          }
        }
      }
    }

    return { packageManager: "pip", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "pip",
      vulnerabilities: [],
      error: `pip-audit failed: ${error}`,
    };
  }
}

// Run poetry audit (via pip-audit with poetry export)
async function runPoetryAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  if (!(await commandExists("poetry"))) {
    return {
      packageManager: "poetry",
      vulnerabilities: [],
      error:
        "poetry is not installed. Install it from: https://python-poetry.org",
    };
  }

  if (!(await commandExists("pip-audit"))) {
    return {
      packageManager: "poetry",
      vulnerabilities: [],
      error:
        "pip-audit is not installed. Install it with: pip install pip-audit",
    };
  }

  try {
    // Export poetry dependencies to requirements format
    const exportProc = Bun.spawn(
      ["poetry", "export", "-f", "requirements.txt", "--without-hashes"],
      {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const requirements = await new Response(exportProc.stdout).text();
    await exportProc.exited;

    if (!requirements.trim()) {
      return { packageManager: "poetry", vulnerabilities: [] };
    }

    // Write to temp file and audit
    const tempFile = join(dir, ".poetry-requirements-audit.txt");
    await Bun.write(tempFile, requirements);

    try {
      const auditProc = Bun.spawn(
        ["pip-audit", "-r", tempFile, "--format", "json"],
        {
          cwd: dir,
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const stdout = await new Response(auditProc.stdout).text();
      await auditProc.exited;

      if (stdout.trim()) {
        const data = JSON.parse(stdout);

        if (Array.isArray(data)) {
          for (const item of data) {
            for (const vuln of item.vulns || []) {
              vulnerabilities.push({
                id: vuln.id || `poetry-${item.name}`,
                package: item.name,
                version: item.version || "unknown",
                severity: normalizeSeverity(vuln.fix_versions ? "high" : "medium"),
                title: `${vuln.id} in ${item.name}`,
                description: vuln.description || `Vulnerability in ${item.name}`,
                url: vuln.id
                  ? `https://nvd.nist.gov/vuln/detail/${vuln.id}`
                  : undefined,
                fixedIn: vuln.fix_versions?.join(", "),
              });
            }
          }
        }
      }
    } finally {
      // Cleanup temp file
      try {
        await Bun.file(tempFile).exists() &&
          (await Bun.spawn(["rm", tempFile]).exited);
      } catch {
        // Ignore cleanup errors
      }
    }

    return { packageManager: "poetry", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "poetry",
      vulnerabilities: [],
      error: `poetry audit failed: ${error}`,
    };
  }
}

// Run cargo audit
async function runCargoAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  if (!(await commandExists("cargo"))) {
    return {
      packageManager: "cargo",
      vulnerabilities: [],
      error:
        "cargo is not installed. Install Rust from: https://rustup.rs",
    };
  }

  if (!(await commandExists("cargo-audit"))) {
    return {
      packageManager: "cargo",
      vulnerabilities: [],
      error:
        "cargo-audit is not installed. Install it with: cargo install cargo-audit",
    };
  }

  try {
    const proc = Bun.spawn(["cargo", "audit", "--json"], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    if (stdout.trim()) {
      const data = JSON.parse(stdout);

      if (data.vulnerabilities?.list) {
        for (const vuln of data.vulnerabilities.list) {
          vulnerabilities.push({
            id: vuln.advisory?.id || `cargo-unknown`,
            package: vuln.package?.name || "unknown",
            version: vuln.package?.version || "unknown",
            severity: normalizeSeverity(
              vuln.advisory?.informational ? "low" : "high"
            ),
            title:
              vuln.advisory?.title ||
              `Vulnerability in ${vuln.package?.name}`,
            description:
              vuln.advisory?.description ||
              vuln.advisory?.title ||
              "No description",
            url: vuln.advisory?.url,
            fixedIn: vuln.versions?.patched?.join(", "),
          });
        }
      }
    }

    return { packageManager: "cargo", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "cargo",
      vulnerabilities: [],
      error: `cargo audit failed: ${error}`,
    };
  }
}

// Run go vulnerabilities check
async function runGoAudit(dir: string): Promise<AuditResult> {
  const vulnerabilities: Vulnerability[] = [];

  if (!(await commandExists("go"))) {
    return {
      packageManager: "go",
      vulnerabilities: [],
      error: "go is not installed. Install it from: https://go.dev",
    };
  }

  try {
    // Try govulncheck first
    const hasGovulncheck = await commandExists("govulncheck");

    if (hasGovulncheck) {
      const proc = Bun.spawn(["govulncheck", "-json", "./..."], {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = await new Response(proc.stdout).text();
      await proc.exited;

      // Parse NDJSON output
      const lines = stdout.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.vulnerability) {
            const v = data.vulnerability;
            vulnerabilities.push({
              id: v.osv?.id || `go-unknown`,
              package: v.osv?.affected?.[0]?.package?.name || "unknown",
              version: "affected",
              severity: normalizeSeverity(
                v.osv?.database_specific?.severity || "medium"
              ),
              title: v.osv?.summary || "Go vulnerability",
              description: v.osv?.details || v.osv?.summary || "No description",
              url: v.osv?.id
                ? `https://pkg.go.dev/vuln/${v.osv.id}`
                : undefined,
              fixedIn: v.osv?.affected?.[0]?.ranges?.[0]?.events?.find(
                (e: any) => e.fixed
              )?.fixed,
            });
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    } else {
      // Fallback: try go mod audit if available
      const proc = Bun.spawn(["go", "list", "-m", "-json", "all"], {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
      });

      await proc.exited;

      return {
        packageManager: "go",
        vulnerabilities: [],
        error:
          "govulncheck is not installed. Install it with: go install golang.org/x/vuln/cmd/govulncheck@latest",
      };
    }

    return { packageManager: "go", vulnerabilities };
  } catch (error) {
    return {
      packageManager: "go",
      vulnerabilities: [],
      error: `go audit failed: ${error}`,
    };
  }
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
function generateSarif(result: AuditResult): SarifResult {
  const rules: SarifRule[] = [];
  const results: SarifResultEntry[] = [];
  const seenRules = new Set<string>();

  for (const vuln of result.vulnerabilities) {
    // Add rule if not already added
    if (!seenRules.has(vuln.id)) {
      seenRules.add(vuln.id);
      rules.push({
        id: vuln.id,
        name: vuln.title,
        shortDescription: { text: vuln.title },
        fullDescription: { text: vuln.description },
        helpUri: vuln.url,
        defaultConfiguration: {
          level: severityToSarifLevel(vuln.severity),
        },
      });
    }

    // Add result
    results.push({
      ruleId: vuln.id,
      message: {
        text: `${vuln.severity.toUpperCase()}: ${vuln.title} in ${vuln.package}@${vuln.version}${vuln.fixedIn ? `. Fixed in: ${vuln.fixedIn}` : ""}`,
      },
      level: severityToSarifLevel(vuln.severity),
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri:
                result.packageManager === "npm" ||
                result.packageManager === "pnpm" ||
                result.packageManager === "yarn"
                  ? "package.json"
                  : result.packageManager === "pip"
                    ? "requirements.txt"
                    : result.packageManager === "poetry"
                      ? "pyproject.toml"
                      : result.packageManager === "cargo"
                        ? "Cargo.toml"
                        : "go.mod",
            },
            region: { startLine: 1 },
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
            name: "DependencyAudit",
            version: "1.0.0",
            informationUri:
              "https://github.com/your-org/mai-security-tools",
            rules,
          },
        },
        results,
      },
    ],
  };
}

// Print human-readable output
function printResults(result: AuditResult): void {
  console.log(`\n=== ${result.packageManager.toUpperCase()} Audit Results ===\n`);

  if (result.error) {
    console.error(`Error: ${result.error}\n`);
    return;
  }

  if (result.vulnerabilities.length === 0) {
    console.log("No vulnerabilities found.\n");
    return;
  }

  // Group by severity
  const bySeverity: Record<string, Vulnerability[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
    unknown: [],
  };

  for (const vuln of result.vulnerabilities) {
    bySeverity[vuln.severity].push(vuln);
  }

  // Print summary
  console.log("Summary:");
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High:     ${bySeverity.high.length}`);
  console.log(`  Medium:   ${bySeverity.medium.length}`);
  console.log(`  Low:      ${bySeverity.low.length}`);
  console.log(`  Unknown:  ${bySeverity.unknown.length}`);
  console.log(`  Total:    ${result.vulnerabilities.length}\n`);

  // Print details
  for (const severity of ["critical", "high", "medium", "low", "unknown"]) {
    const vulns = bySeverity[severity];
    if (vulns.length === 0) continue;

    console.log(`--- ${severity.toUpperCase()} ---`);
    for (const vuln of vulns) {
      console.log(`  [${vuln.id}] ${vuln.package}@${vuln.version}`);
      console.log(`    ${vuln.title}`);
      if (vuln.fixedIn) {
        console.log(`    Fixed in: ${vuln.fixedIn}`);
      }
      if (vuln.url) {
        console.log(`    More info: ${vuln.url}`);
      }
      console.log("");
    }
  }
}

// Check if vulnerabilities exceed threshold
function exceedsThreshold(
  vulnerabilities: Vulnerability[],
  threshold: string
): boolean {
  const thresholdOrder = SEVERITY_ORDER[threshold] || 0;

  for (const vuln of vulnerabilities) {
    const vulnOrder = SEVERITY_ORDER[vuln.severity] || 0;
    if (vulnOrder >= thresholdOrder) {
      return true;
    }
  }

  return false;
}

// Main function
async function main(): Promise<void> {
  const { directory, failOn, sarif, help } = parseArgs();

  if (help) {
    showHelp();
    process.exit(0);
  }

  // Check if directory exists
  if (!existsSync(directory)) {
    console.error(`Error: Directory not found: ${directory}`);
    process.exit(2);
  }

  // Detect package manager
  const detected = detectPackageManager(directory);

  if (!detected) {
    console.error(
      "Error: No supported package manager lock file found in:",
      directory
    );
    console.error(
      "Supported: package-lock.json, pnpm-lock.yaml, yarn.lock, requirements.txt, poetry.lock, Cargo.lock, go.sum"
    );
    process.exit(2);
  }

  // Run appropriate audit
  let result: AuditResult;

  switch (detected.manager) {
    case "npm":
      result = await runNpmAudit(directory);
      break;
    case "pnpm":
      result = await runPnpmAudit(directory);
      break;
    case "yarn":
      result = await runYarnAudit(directory);
      break;
    case "pip":
      result = await runPipAudit(directory);
      break;
    case "poetry":
      result = await runPoetryAudit(directory);
      break;
    case "cargo":
      result = await runCargoAudit(directory);
      break;
    case "go":
      result = await runGoAudit(directory);
      break;
    default:
      console.error(`Error: Unsupported package manager: ${detected.manager}`);
      process.exit(2);
  }

  // Handle errors
  if (result.error && result.vulnerabilities.length === 0) {
    console.error(`Error: ${result.error}`);
    process.exit(2);
  }

  // Output results
  if (sarif) {
    console.log(JSON.stringify(generateSarif(result), null, 2));
  } else {
    printResults(result);
  }

  // Check threshold
  if (failOn && exceedsThreshold(result.vulnerabilities, failOn)) {
    if (!sarif) {
      console.error(
        `\nFailed: Found vulnerabilities at or above ${failOn} severity`
      );
    }
    process.exit(1);
  }

  // Warn if there are vulnerabilities but no threshold set
  if (result.vulnerabilities.length > 0 && !failOn && !sarif) {
    console.log(
      "Note: Use --fail-on=<severity> to fail CI on specific severity levels"
    );
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(2);
});
