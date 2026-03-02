// ============================================================================
// pai-governance-guard — PROPOSE Phase
// Parse Claude Code tool calls into structured ActionIntent
// ============================================================================

import { stableStringify, sha256Hex } from "./canonical";
import type { ActionIntent, ActionType, HookInput } from "./types";

// -- Destructive command patterns --
const DESTRUCTIVE_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*[rf]|--recursive|--force)/,
  /\brm\b.*\s+\//, // rm targeting root-relative paths
  /\bdrop\s+(table|database|schema|index)\b/i,
  /\btruncate\s+table\b/i,
  /\bformat\b.*\b[a-zA-Z]:\\/i,
  /\bgit\s+(reset\s+--hard|clean\s+-[a-zA-Z]*f|push\s+--force|branch\s+-D)/,
  /\b(shutdown|reboot|halt|poweroff)\b/,
  /\bdd\s+.*\bof=/,
  /\bmkfs\b/,
  />\s*\/dev\/sd[a-z]/,
];

// -- Network command patterns --
const NETWORK_PATTERNS = [
  /\b(curl|wget|http|fetch)\b/,
  /\bssh\b/,
  /\bscp\b/,
  /\brsync\b.*:/,
  /\bnc\b/,
  /\btelnet\b/,
  /\bftp\b/,
  /\bnmap\b/,
  /\bping\b/,
  /https?:\/\//,
];

// -- Credential access patterns --
const CREDENTIAL_PATTERNS = [
  /\.env\b/,
  /credentials?\b/i,
  /\bsecrets?\b/i,
  /\bpassw(or)?d/i,
  /\btoken\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\.pem$/,
  /\.key$/,
  /id_rsa/,
  /id_ed25519/,
  /\.aws\//,
  /\.ssh\//,
  /\.gnupg\//,
  /\.npmrc$/,
  /\.pypirc$/,
  /\.netrc$/,
];

// -- Read-only command patterns --
const READ_PATTERNS = [
  /^\s*(cat|head|tail|less|more|wc|file|stat)\b/,
  /^\s*(ls|dir|find|tree|du|df)\b/,
  /^\s*(grep|rg|ag|ack)\b/,
  /^\s*(type|which|where|whereis)\b/,
  /^\s*git\s+(log|show|diff|status|branch(?!\s+-D))\b/,
];

// -- Package manager / build patterns --
const EXECUTE_PATTERNS = [
  /^\s*(npm|yarn|pnpm|bun|npx)\s/,
  /^\s*(pip|pip3|python|python3)\s/,
  /^\s*(cargo|rustc|rustup)\s/,
  /^\s*(go|go\s+run|go\s+build)\s/,
  /^\s*(make|cmake)\b/,
  /^\s*(node|deno|tsx|ts-node)\s/,
];

/**
 * PROPOSE: Parse a Claude Code hook input into a structured ActionIntent.
 *
 * Classifies the tool call by action type (read/write/execute/network/
 * destructive/credential/unknown) and extracts the target.
 */
export function propose(input: HookInput): ActionIntent {
  const actionType = classifyAction(input.tool_name, input.tool_input);
  const target = extractTarget(input.tool_name, input.tool_input);
  const contentHash = sha256Hex(stableStringify(input.tool_input));

  return {
    tool_name: input.tool_name,
    action_type: actionType,
    target,
    raw_input: input.tool_input,
    content_hash: contentHash,
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
  };
}

/**
 * Classify a tool call into an ActionType.
 * Order matters: destructive > credential > network > read > execute > write > unknown
 */
export function classifyAction(
  toolName: string,
  toolInput: Record<string, unknown>
): ActionType {
  const name = toolName.toLowerCase();

  // -- Tool-specific classification --

  if (name === "bash") {
    const command = String(toolInput.command ?? "");
    return classifyBashCommand(command);
  }

  if (name === "read" || name === "glob" || name === "grep") {
    // Check if reading credential files
    const target = extractTarget(toolName, toolInput);
    if (matchesAny(target, CREDENTIAL_PATTERNS)) return "credential";
    return "read";
  }

  if (name === "write" || name === "edit" || name === "multiedit" || name === "notebookedit") {
    const target = extractTarget(toolName, toolInput);
    if (matchesAny(target, CREDENTIAL_PATTERNS)) return "credential";
    return "write";
  }

  if (name === "webfetch" || name === "websearch") {
    return "network";
  }

  // MCP tools — default to unknown for governance evaluation
  if (name.startsWith("mcp__")) {
    return "unknown";
  }

  // Task/TodoWrite/AskUserQuestion — safe operations
  if (name === "task" || name === "todowrite" || name === "askuserquestion") {
    return "read";
  }

  return "unknown";
}

function classifyBashCommand(command: string): ActionType {
  // Check in priority order
  if (matchesAny(command, DESTRUCTIVE_PATTERNS)) return "destructive";
  if (matchesAny(command, CREDENTIAL_PATTERNS)) return "credential";
  if (matchesAny(command, NETWORK_PATTERNS)) return "network";
  if (matchesAny(command, READ_PATTERNS)) return "read";
  if (matchesAny(command, EXECUTE_PATTERNS)) return "execute";

  // Commands with output redirection are writes
  if (/[>|]/.test(command)) return "write";

  return "execute";
}

/**
 * Extract the primary target from a tool call.
 * For Bash: the command string. For file tools: the file path. For web: the URL.
 */
export function extractTarget(
  toolName: string,
  toolInput: Record<string, unknown>
): string {
  const name = toolName.toLowerCase();

  if (name === "bash") {
    return String(toolInput.command ?? "");
  }

  if (name === "read" || name === "write") {
    return String(toolInput.file_path ?? toolInput.path ?? "");
  }

  if (name === "edit" || name === "multiedit") {
    return String(toolInput.file_path ?? "");
  }

  if (name === "glob") {
    return String(toolInput.pattern ?? "");
  }

  if (name === "grep") {
    return String(toolInput.pattern ?? "");
  }

  if (name === "webfetch") {
    return String(toolInput.url ?? "");
  }

  if (name === "websearch") {
    return String(toolInput.query ?? "");
  }

  if (name === "notebookedit") {
    return String(toolInput.notebook_path ?? "");
  }

  // Fallback: serialize all input keys
  return Object.keys(toolInput).join(",");
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  for (const p of patterns) {
    if (p.test(text)) return true;
  }
  return false;
}
