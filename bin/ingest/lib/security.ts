/**
 * Security module for Telegram ingestion pipeline
 *
 * Defenses against:
 * - Prompt injection attacks
 * - Unauthorized access
 * - Command spoofing
 * - Rate limiting bypass
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface SecurityConfig {
  // Allowed sender IDs (empty = allow all in channel)
  allowedSenderIds: string[];

  // Allowed commands (whitelist)
  allowedCommands: string[];

  // Rate limiting
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;

  // Audit logging
  auditLogPath: string;

  // Content sanitization
  sanitizeContent: boolean;
  blockPatterns: RegExp[];
}

const DEFAULT_CONFIG: SecurityConfig = {
  allowedSenderIds: [], // Empty = allow all (channel members only)

  // Whitelist of allowed /commands
  allowedCommands: [
    // Pipeline routing commands
    "note",        // Save as note (default)
    "clip",        // Save article/link for later
    "archive",     // Archive document with naming + Dropbox sync
    "query",       // Search vault
    "help",        // Show help

    // Fabric pattern commands (explicitly trigger patterns)
    "summarize",   // Run summarize pattern
    "summary",     // Alias for summarize
    "wisdom",      // Run extract_wisdom pattern
    "extract-wisdom", // Explicit pattern name
    "article",     // Run extract_article_wisdom
    "article-wisdom", // Explicit pattern name
    "meeting-notes", // Run meeting_notes pattern
    "fetch",       // Fetch URL content (no pattern)
    "tag",         // Force AI tagging

    // Routing/tagging commands (do NOT trigger patterns)
    // Use #1on1 or #meeting as TAGS instead
    "meeting",     // Route as meeting (use #meeting for tag)
    "1on1",        // Route as 1on1 (use #1on1 for tag)

    // Legacy/misc commands
    "transcript",
    "raw",
    "link",
    "idea",
    "todo",
    "bibliography",

    // Vision API commands (photo processing)
    "describe",    // Detailed Vision AI description
    "mermaid",     // Convert diagram to Mermaid syntax
    "ocr",         // Tesseract OCR only (no Vision API)
    "store",       // Save image only, no processing

    // Document storage commands
    "attach",      // Store document with original filename, create linked note
  ],

  // Rate limiting
  maxMessagesPerMinute: 30,
  maxMessagesPerHour: 200,

  // Audit log location
  auditLogPath: join(homedir(), ".cache", "pai-ingest", "audit.log"),

  // Content sanitization
  sanitizeContent: true,
  blockPatterns: [
    // Common prompt injection patterns
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /ignore\s+above/i,
    /disregard\s+(all\s+)?previous/i,
    /forget\s+(all\s+)?previous/i,
    /new\s+instructions:/i,
    /system\s*:\s*you\s+are/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<<SYS>>/i,
    /<\|im_start\|>/i,
    /```\s*system/i,
    // Jailbreak attempts
    /DAN\s+mode/i,
    /developer\s+mode/i,
    /jailbreak/i,
    // Data exfiltration attempts
    /export\s+(all\s+)?(api\s*)?keys/i,
    /send\s+(to|this\s+to)\s+https?:/i,
    /fetch\s+https?:.*\?.*=/i,
  ],
};

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitState {
  minuteCount: number;
  hourCount: number;
  minuteReset: number;
  hourReset: number;
}

let rateLimitState: RateLimitState = {
  minuteCount: 0,
  hourCount: 0,
  minuteReset: Date.now() + 60000,
  hourReset: Date.now() + 3600000,
};

/**
 * Check if rate limit is exceeded
 */
export function checkRateLimit(config: SecurityConfig = DEFAULT_CONFIG): {
  allowed: boolean;
  reason?: string;
} {
  const now = Date.now();

  // Reset counters if window expired
  if (now > rateLimitState.minuteReset) {
    rateLimitState.minuteCount = 0;
    rateLimitState.minuteReset = now + 60000;
  }
  if (now > rateLimitState.hourReset) {
    rateLimitState.hourCount = 0;
    rateLimitState.hourReset = now + 3600000;
  }

  // Check limits
  if (rateLimitState.minuteCount >= config.maxMessagesPerMinute) {
    return { allowed: false, reason: "Rate limit exceeded (per minute)" };
  }
  if (rateLimitState.hourCount >= config.maxMessagesPerHour) {
    return { allowed: false, reason: "Rate limit exceeded (per hour)" };
  }

  // Increment counters
  rateLimitState.minuteCount++;
  rateLimitState.hourCount++;

  return { allowed: true };
}

// ============================================================================
// SENDER VERIFICATION
// ============================================================================

/**
 * Verify sender is allowed
 */
export function verifySender(
  senderId: string | number,
  config: SecurityConfig = DEFAULT_CONFIG
): { allowed: boolean; reason?: string } {
  // If no allowlist configured, allow all (channel membership is the gate)
  if (config.allowedSenderIds.length === 0) {
    return { allowed: true };
  }

  const senderStr = String(senderId);
  if (config.allowedSenderIds.includes(senderStr)) {
    return { allowed: true };
  }

  return { allowed: false, reason: `Sender ${senderStr} not in allowlist` };
}

// ============================================================================
// COMMAND VALIDATION
// ============================================================================

/**
 * Validate commands against whitelist
 */
export function validateCommands(
  commands: string[],
  config: SecurityConfig = DEFAULT_CONFIG
): { valid: string[]; blocked: string[] } {
  const valid: string[] = [];
  const blocked: string[] = [];

  for (const cmd of commands) {
    const normalized = cmd.toLowerCase().trim();
    if (config.allowedCommands.includes(normalized)) {
      valid.push(normalized);
    } else {
      blocked.push(cmd);
    }
  }

  return { valid, blocked };
}

// ============================================================================
// CONTENT SANITIZATION
// ============================================================================

export interface SanitizationResult {
  safe: boolean;
  sanitizedContent: string;
  blockedPatterns: string[];
  warnings: string[];
}

/**
 * Sanitize content for prompt injection attempts
 */
export function sanitizeContent(
  content: string,
  config: SecurityConfig = DEFAULT_CONFIG
): SanitizationResult {
  if (!config.sanitizeContent) {
    return {
      safe: true,
      sanitizedContent: content,
      blockedPatterns: [],
      warnings: [],
    };
  }

  const blockedPatterns: string[] = [];
  const warnings: string[] = [];
  let sanitized = content;

  // Check for blocked patterns
  for (const pattern of config.blockPatterns) {
    if (pattern.test(content)) {
      const match = content.match(pattern);
      blockedPatterns.push(match?.[0] || pattern.source);

      // Replace the pattern with a warning marker
      sanitized = sanitized.replace(
        pattern,
        "[CONTENT BLOCKED: potential injection]"
      );
    }
  }

  // Additional heuristics
  // Check for suspiciously long base64-like strings (potential encoded payloads)
  const base64Pattern = /[A-Za-z0-9+/=]{100,}/g;
  if (base64Pattern.test(content)) {
    warnings.push("Contains long base64-like string");
  }

  // Check for excessive special characters (potential obfuscation)
  const specialCharRatio =
    (content.match(/[^\w\s.,!?'"()-]/g)?.length || 0) / content.length;
  if (specialCharRatio > 0.3 && content.length > 50) {
    warnings.push("High ratio of special characters");
  }

  return {
    safe: blockedPatterns.length === 0,
    sanitizedContent: sanitized,
    blockedPatterns,
    warnings,
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export interface AuditEntry {
  timestamp: string;
  messageId: number;
  senderId?: string | number;
  contentType: string;
  action: "processed" | "blocked" | "rate_limited" | "sanitized";
  reason?: string;
  tags?: string[];
  hints?: {
    tags: string[];
    people: string[];
    commands: string[];
    blockedCommands: string[];
  };
}

/**
 * Write audit log entry
 */
export function auditLog(
  entry: AuditEntry,
  config: SecurityConfig = DEFAULT_CONFIG
): void {
  try {
    const logLine = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    // Ensure directory exists
    const logDir = join(config.auditLogPath, "..");
    if (!existsSync(logDir)) {
      require("fs").mkdirSync(logDir, { recursive: true });
    }

    appendFileSync(config.auditLogPath, logLine + "\n");
  } catch (error) {
    console.warn("Failed to write audit log:", error);
  }
}

/**
 * Read recent audit entries
 */
export function readAuditLog(
  limit: number = 100,
  config: SecurityConfig = DEFAULT_CONFIG
): AuditEntry[] {
  try {
    if (!existsSync(config.auditLogPath)) {
      return [];
    }

    const content = readFileSync(config.auditLogPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    return lines
      .slice(-limit)
      .map((line) => JSON.parse(line) as AuditEntry)
      .reverse();
  } catch (error) {
    console.warn("Failed to read audit log:", error);
    return [];
  }
}

// ============================================================================
// SECURITY CHECK (all-in-one)
// ============================================================================

export interface SecurityCheckResult {
  allowed: boolean;
  reasons: string[];
  sanitizedContent?: string;
  validCommands?: string[];
  blockedCommands?: string[];
  warnings: string[];
}

/**
 * Perform all security checks on a message
 */
export function performSecurityCheck(
  messageId: number,
  senderId: string | number | undefined,
  content: string,
  commands: string[],
  config: SecurityConfig = DEFAULT_CONFIG
): SecurityCheckResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // 1. Rate limiting
  const rateCheck = checkRateLimit(config);
  if (!rateCheck.allowed) {
    auditLog({
      timestamp: new Date().toISOString(),
      messageId,
      senderId,
      contentType: "unknown",
      action: "rate_limited",
      reason: rateCheck.reason,
    });
    return {
      allowed: false,
      reasons: [rateCheck.reason!],
      warnings: [],
    };
  }

  // 2. Sender verification
  if (senderId !== undefined) {
    const senderCheck = verifySender(senderId, config);
    if (!senderCheck.allowed) {
      auditLog({
        timestamp: new Date().toISOString(),
        messageId,
        senderId,
        contentType: "unknown",
        action: "blocked",
        reason: senderCheck.reason,
      });
      return {
        allowed: false,
        reasons: [senderCheck.reason!],
        warnings: [],
      };
    }
  }

  // 3. Command validation
  const cmdCheck = validateCommands(commands, config);
  if (cmdCheck.blocked.length > 0) {
    warnings.push(`Blocked commands: ${cmdCheck.blocked.join(", ")}`);
  }

  // 4. Content sanitization
  const sanitizeCheck = sanitizeContent(content, config);
  if (!sanitizeCheck.safe) {
    reasons.push(`Blocked patterns: ${sanitizeCheck.blockedPatterns.join(", ")}`);
  }
  warnings.push(...sanitizeCheck.warnings);

  // If content was sanitized but not fully blocked, still allow with warnings
  const allowed = sanitizeCheck.safe || sanitizeCheck.blockedPatterns.length < 3;

  return {
    allowed,
    reasons,
    sanitizedContent: sanitizeCheck.sanitizedContent,
    validCommands: cmdCheck.valid,
    blockedCommands: cmdCheck.blocked,
    warnings,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DEFAULT_CONFIG };
export type { SecurityConfig as Config };
