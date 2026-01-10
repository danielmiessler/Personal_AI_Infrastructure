/**
 * DamageControl - Bash Tool Security Hook
 * ========================================
 *
 * PreToolUse hook that validates bash commands against security patterns.
 * Blocks dangerous commands and protects sensitive file paths.
 *
 * Exit codes:
 * 0 = Allow command
 * 0 + JSON output = Trigger permission dialog (ask patterns)
 * 2 = Block command (stderr fed back to Claude)
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { parse as parseYaml } from "yaml";

// Types
interface Pattern {
  pattern: string;
  reason: string;
  ask?: boolean;
}

interface Config {
  bashToolPatterns: Pattern[];
  zeroAccessPaths: string[];
  readOnlyPaths: string[];
  noDeletePaths: string[];
}

interface HookInput {
  tool_name: string;
  tool_input: {
    command?: string;
    [key: string]: unknown;
  };
}

interface CheckResult {
  blocked: boolean;
  ask: boolean;
  reason: string;
}

// Operation detection patterns
const WRITE_PATTERNS = [/>\s*\S+/, /tee\s+\S+/];
const EDIT_PATTERNS = [/sed\s+-i/, /perl\s+-i/, /awk\s+-i/];
const MOVE_COPY_PATTERNS = [/\bmv\s+/, /\bcp\s+/];
const DELETE_PATTERNS = [/\brm\s+/, /\bunlink\s+/, /\brmdir\s+/];
const PERMISSION_PATTERNS = [/\bchmod\s+/, /\bchown\s+/];

// Utility functions
function isGlobPattern(pattern: string): boolean {
  return pattern.includes("*") || pattern.includes("?") || pattern.includes("[");
}

function globToRegex(glob: string): string {
  return glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^\\s/]*")
    .replace(/\?/g, "[^\\s/]");
}

function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return path.replace(/^~/, homedir());
  }
  // Expand $PAI_DIR if present
  const paiDir = process.env.PAI_DIR || homedir() + "/.claude";
  return path.replace(/\$PAI_DIR/g, paiDir);
}

function matchPath(testPath: string, pattern: string): boolean {
  const expandedPattern = expandPath(pattern);
  const normalizedPath = expandPath(testPath);

  if (isGlobPattern(pattern)) {
    // Glob pattern matching
    const regexPattern = globToRegex(expandedPattern);
    try {
      const regex = new RegExp(regexPattern, "i");
      // Match against basename or full path
      const basename = normalizedPath.split("/").pop() || "";
      return regex.test(basename) || regex.test(normalizedPath);
    } catch {
      return false;
    }
  } else {
    // Prefix/exact matching
    const cleanPattern = expandedPattern.replace(/\/$/, "");
    return (
      normalizedPath.startsWith(cleanPattern) ||
      normalizedPath === cleanPattern ||
      normalizedPath.startsWith(cleanPattern + "/")
    );
  }
}

function extractPathsFromCommand(command: string): string[] {
  const paths: string[] = [];

  // First, strip out content that is text/messages, not actual file paths being operated on.
  // This prevents false positives when commit messages mention paths like "/root/.claude"
  //
  // SECURITY NOTE: This only affects which paths are checked against readOnlyPaths etc.
  // Dangerous command patterns (rm -rf, etc.) are checked BEFORE this on the full command.
  let commandWithoutMessages = command
    // Git commit messages: -m "..." or -m '...' or --message="..."
    .replace(/(?:-m|--message)\s*=?\s*"[^"]*"/g, "")
    .replace(/(?:-m|--message)\s*=?\s*'[^']*'/g, "")
    // Heredoc-style messages: -m "$(cat <<'EOF' ... EOF)"
    // Match the whole $(...) construct for -m flags
    .replace(/(?:-m|--message)\s*=?\s*"\$\(cat\s+<<[^)]+\)"/g, "")
    // Also handle unquoted heredoc style
    .replace(/(?:-m|--message)\s*=?\s*\$\(cat\s+<<[\s\S]*?EOF[\s\S]*?\)/g, "");

  // Common path patterns in commands
  const pathPatterns = [
    // Absolute paths
    /(?:^|\s)(\/[\w./-]+)/g,
    // Home directory paths
    /(?:^|\s)(~[\w./-]*)/g,
    // Relative paths with common prefixes
    /(?:^|\s)(\.\.?\/[\w./-]+)/g,
    // Quoted paths (only after stripping messages)
    /"([^"]+)"/g,
    /'([^']+)'/g,
  ];

  for (const pattern of pathPatterns) {
    let match;
    while ((match = pattern.exec(commandWithoutMessages)) !== null) {
      const path = match[1];
      if (path && !path.startsWith("-") && path.length > 1) {
        paths.push(path);
      }
    }
  }

  return [...new Set(paths)]; // Deduplicate
}

function detectOperation(command: string): string[] {
  const operations: string[] = [];

  if (DELETE_PATTERNS.some((p) => p.test(command))) {
    operations.push("delete");
  }
  if (WRITE_PATTERNS.some((p) => p.test(command))) {
    operations.push("write");
  }
  if (EDIT_PATTERNS.some((p) => p.test(command))) {
    operations.push("edit");
  }
  if (MOVE_COPY_PATTERNS.some((p) => p.test(command))) {
    operations.push("write");
  }
  if (PERMISSION_PATTERNS.some((p) => p.test(command))) {
    operations.push("permission");
  }

  return operations.length > 0 ? operations : ["read"];
}

// Config loading
function getConfigPath(): string {
  // 1. Check PAI_DIR skills location
  const paiDir = process.env.PAI_DIR;
  if (paiDir) {
    const paiConfig = join(paiDir, "skills", "DamageControl", "patterns.yaml");
    if (existsSync(paiConfig)) {
      return paiConfig;
    }
  }

  // 2. Check project hooks directory
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (projectDir) {
    const projectConfig = join(projectDir, ".claude", "hooks", "damage-control", "patterns.yaml");
    if (existsSync(projectConfig)) {
      return projectConfig;
    }
  }

  // 3. Check script's own directory (for skill location)
  const scriptDir = dirname(Bun.main);
  const localConfig = join(scriptDir, "..", "patterns.yaml");
  if (existsSync(localConfig)) {
    return localConfig;
  }

  // 4. Direct sibling
  const siblingConfig = join(scriptDir, "patterns.yaml");
  if (existsSync(siblingConfig)) {
    return siblingConfig;
  }

  return localConfig; // Default, even if it doesn't exist
}

function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    console.error(`Warning: Config not found at ${configPath}`);
    return {
      bashToolPatterns: [],
      zeroAccessPaths: [],
      readOnlyPaths: [],
      noDeletePaths: [],
    };
  }

  const content = readFileSync(configPath, "utf-8");
  const config = parseYaml(content) as Partial<Config>;

  return {
    bashToolPatterns: config.bashToolPatterns || [],
    zeroAccessPaths: config.zeroAccessPaths || [],
    readOnlyPaths: config.readOnlyPaths || [],
    noDeletePaths: config.noDeletePaths || [],
  };
}

// Main validation logic
function checkCommand(command: string, config: Config): CheckResult {
  const reasons: string[] = [];
  let shouldAsk = false;

  // 1. Check bash command patterns
  for (const pattern of config.bashToolPatterns) {
    try {
      const regex = new RegExp(pattern.pattern, "i");
      if (regex.test(command)) {
        if (pattern.ask) {
          shouldAsk = true;
          reasons.push(pattern.reason);
        } else {
          return {
            blocked: true,
            ask: false,
            reason: pattern.reason,
          };
        }
      }
    } catch (e) {
      console.error(`Invalid regex pattern: ${pattern.pattern}`);
    }
  }

  // 2. Extract paths and check against path restrictions
  const paths = extractPathsFromCommand(command);
  const operations = detectOperation(command);

  for (const path of paths) {
    // Check zero-access paths (block all operations)
    for (const zeroPath of config.zeroAccessPaths) {
      if (matchPath(path, zeroPath)) {
        return {
          blocked: true,
          ask: false,
          reason: `zero-access path ${zeroPath} (no operations allowed)`,
        };
      }
    }

    // Check read-only paths (block write/edit/delete)
    if (operations.some((op) => ["write", "edit", "delete", "permission"].includes(op))) {
      for (const readOnlyPath of config.readOnlyPaths) {
        if (matchPath(path, readOnlyPath)) {
          return {
            blocked: true,
            ask: false,
            reason: `read-only path ${readOnlyPath}`,
          };
        }
      }
    }

    // Check no-delete paths (block delete only)
    if (operations.includes("delete")) {
      for (const noDeletePath of config.noDeletePaths) {
        if (matchPath(path, noDeletePath)) {
          return {
            blocked: true,
            ask: false,
            reason: `no-delete path ${noDeletePath}`,
          };
        }
      }
    }
  }

  // 3. Return ask result if any ask patterns matched
  if (shouldAsk && reasons.length > 0) {
    return {
      blocked: false,
      ask: true,
      reason: reasons.join(", "),
    };
  }

  return {
    blocked: false,
    ask: false,
    reason: "",
  };
}

// Main entry point
async function main(): Promise<void> {
  const config = loadConfig();

  // Read JSON from stdin
  let inputText = "";
  for await (const chunk of Bun.stdin.stream()) {
    inputText += new TextDecoder().decode(chunk);
  }

  let input: HookInput;
  try {
    input = JSON.parse(inputText);
  } catch (e) {
    console.error(`Error: Invalid JSON input: ${e}`);
    process.exit(1);
  }

  // Only check Bash tool
  if (input.tool_name !== "Bash") {
    process.exit(0);
  }

  const command = input.tool_input?.command || "";
  if (!command) {
    process.exit(0);
  }

  const result = checkCommand(command, config);

  if (result.blocked) {
    console.error(`SECURITY WARNING (would have blocked): ${result.reason}: ${command}`);
    // Changed from exit(2) to exit(0) - warn but don't block
    process.exit(0);
  }

  if (result.ask) {
    // Output JSON for ask dialog
    console.log(JSON.stringify({ action: "ask", reason: result.reason }));
    process.exit(0);
  }

  // Allow command
  process.exit(0);
}

// Only run main when executed directly
if (import.meta.main) {
  main().catch((e) => {
    console.error(`Hook error: ${e}`);
    process.exit(0); // Fail open to avoid blocking all commands
  });
}

// Export for testing
export {
  isGlobPattern,
  globToRegex,
  expandPath,
  matchPath,
  extractPathsFromCommand,
  detectOperation,
  checkCommand,
  loadConfig,
  type Config,
  type CheckResult,
};
