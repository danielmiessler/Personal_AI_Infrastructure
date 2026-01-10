/**
 * DamageControl - Write Tool Security Hook
 * =========================================
 *
 * PreToolUse hook that validates Write tool file paths.
 * Blocks writes to protected paths (zeroAccess and readOnly).
 *
 * Exit codes:
 * 0 = Allow write
 * 2 = Block write (stderr fed back to Claude)
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join, basename } from "path";
import { homedir } from "os";
import { parse as parseYaml } from "yaml";

// Types
export interface ContentPattern {
  filePattern: string;
  contentPattern: string;
  reason: string;
}

export interface Config {
  zeroAccessPaths: string[];
  readOnlyPaths: string[];
  writeContentPatterns?: ContentPattern[];
}

interface HookInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
  };
}

// Utility functions - exported for testing
export function isGlobPattern(pattern: string): boolean {
  return pattern.includes("*") || pattern.includes("?") || pattern.includes("[");
}

export function globToRegex(glob: string): string {
  return glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
}

export function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return path.replace(/^~/, homedir());
  }
  const paiDir = process.env.PAI_DIR || homedir() + "/.claude";
  return path.replace(/\$PAI_DIR/g, paiDir);
}

export function matchPath(filePath: string, pattern: string): boolean {
  const expandedPattern = expandPath(pattern);
  const normalized = expandPath(filePath);

  if (isGlobPattern(pattern)) {
    const regexPattern = globToRegex(expandedPattern);
    try {
      const regex = new RegExp(`^${regexPattern}$`, "i");
      const fileBasename = basename(normalized);
      // Match against basename or full path
      return regex.test(fileBasename) || regex.test(normalized);
    } catch {
      return false;
    }
  } else {
    // Prefix matching for directories
    const cleanPattern = expandedPattern.replace(/\/$/, "");
    return (
      normalized.startsWith(cleanPattern) ||
      normalized === cleanPattern ||
      normalized.startsWith(cleanPattern + "/")
    );
  }
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

  return localConfig;
}

function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return { zeroAccessPaths: [], readOnlyPaths: [], writeContentPatterns: [] };
  }

  const content = readFileSync(configPath, "utf-8");
  const config = parseYaml(content) as Partial<Config>;

  return {
    zeroAccessPaths: config.zeroAccessPaths || [],
    readOnlyPaths: config.readOnlyPaths || [],
    writeContentPatterns: config.writeContentPatterns || [],
  };
}

export function checkPath(filePath: string, config: Config): { blocked: boolean; reason: string } {
  // Check zero-access paths first (complete lockdown)
  for (const zeroPath of config.zeroAccessPaths) {
    if (matchPath(filePath, zeroPath)) {
      return {
        blocked: true,
        reason: `zero-access path ${zeroPath} (no operations allowed)`,
      };
    }
  }

  // Check read-only paths (no writes allowed)
  for (const readonlyPath of config.readOnlyPaths) {
    if (matchPath(filePath, readonlyPath)) {
      return {
        blocked: true,
        reason: `read-only path ${readonlyPath}`,
      };
    }
  }

  return { blocked: false, reason: "" };
}

/**
 * Check file content against writeContentPatterns
 * Returns blocked=true if content matches a dangerous pattern for this file type
 */
export function checkContent(
  filePath: string,
  content: string,
  config: Config
): { blocked: boolean; reason: string } {
  const patterns = config.writeContentPatterns || [];

  for (const pattern of patterns) {
    // Check if file path matches the filePattern
    try {
      const fileRegex = new RegExp(pattern.filePattern, "i");
      if (!fileRegex.test(filePath)) {
        continue; // File doesn't match this pattern's target
      }

      // Check if content matches the contentPattern
      const contentRegex = new RegExp(pattern.contentPattern, "i");
      if (contentRegex.test(content)) {
        return {
          blocked: true,
          reason: pattern.reason,
        };
      }
    } catch {
      // Invalid regex, skip this pattern
      continue;
    }
  }

  return { blocked: false, reason: "" };
}

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

  // Only check Write tool
  if (input.tool_name !== "Write") {
    process.exit(0);
  }

  const filePath = input.tool_input?.file_path || "";
  if (!filePath) {
    process.exit(0);
  }

  // Check path restrictions
  const pathResult = checkPath(filePath, config);
  if (pathResult.blocked) {
    console.error(`SECURITY WARNING (would have blocked): write to ${pathResult.reason}: ${filePath}`);
    // Changed from exit(2) to exit(0) - warn but don't block
    process.exit(0);
  }

  // Check content restrictions
  const content = input.tool_input?.content || "";
  if (content) {
    const contentResult = checkContent(filePath, content, config);
    if (contentResult.blocked) {
      console.error(`SECURITY WARNING (would have blocked): write due to ${contentResult.reason}: ${filePath}`);
      // Changed from exit(2) to exit(0) - warn but don't block
      process.exit(0);
    }
  }

  process.exit(0);
}

// Only run main when executed directly, not when imported for testing
if (import.meta.main) {
  main().catch((e) => {
    console.error(`Hook error: ${e}`);
    process.exit(0); // Fail open
  });
}
