/**
 * Content processing pipeline for ingest CLI
 * Handles: transcription, document extraction, fabric patterns, saving
 */

import { exec } from "child_process";
import { promisify } from "util";
import { join, basename } from "path";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { getConfig } from "./config";
import { loadProfile, generateTags, generateFilename, type ProcessingProfile } from "./profiles";
import {
  type TelegramMessage,
  type ContentType,
  downloadFile,
  extractText,
  extractUrl,
} from "./telegram";
import {
  performSecurityCheck,
  validateCommands,
  sanitizeContent,
  auditLog,
  type SecurityCheckResult,
} from "./security";

const execAsync = promisify(exec);

export interface ProcessedContent {
  title: string;
  rawContent: string;
  processedContent?: string;
  tags: string[];
  source: "telegram";
  contentType: ContentType;
  scope?: ScopeType;         // private or work (for context separation)
  sourceFile?: string;       // Original source filename for traceability
  sourceMetadata?: SourceMetadata;  // Device/user/source tracking
  pipeline?: PipelineType;   // Which pipeline processed this
  archiveName?: string;      // Generated archive filename (if archive pipeline)
  originalFilePath?: string; // Path to original file (for Dropbox sync)
  messageDate?: number;      // Original Telegram message timestamp (Unix)
}

/**
 * Source metadata for multi-device/multi-user tracking
 * Parsed from [key:value] syntax in message captions
 */
export interface SourceMetadata {
  source?: string;          // e.g., "clipboard-share", "photo-capture", "voice-memo"
  device?: string;          // e.g., "iphone", "ipad", "mac"
  user?: string;            // e.g., "andreas", "magdalena"
  type?: string;            // e.g., "RECEIPT", "CONTRACT", "DOCUMENT"
  category?: string;        // e.g., "HOME", "WORK", "CAR"
  processor?: string;       // e.g., "pandoc", "marker", "llamaparse"
  date?: string;            // Document date: YYYY-MM-DD (for historic documents)
}

/**
 * Scope types for context separation
 * - private: Personal documents, home, health, car (excluded from default queries)
 * - work: Professional documents (default query scope)
 */
export type ScopeType = "private" | "work";

/**
 * Inline hint patterns for share-with-hints workflow
 * Supports iOS Shortcuts / macOS Share menu integration
 */
export interface InlineHints {
  tags: string[];           // #tag or #project/name
  people: string[];         // @firstname_lastname or @name
  commands: string[];       // /summarize, /transcript, /meeting
  scope?: ScopeType;        // ~private or ~work
  metadata: SourceMetadata; // [key:value] pairs for source tracking
  cleanedContent: string;   // Content with hints removed
}

/**
 * Pipeline types for Layer 2 routing
 */
export type PipelineType = "note" | "clip" | "archive" | "receipt" | "default";

/**
 * Archive naming pattern for detecting pre-named files
 * Matches: CONTRACT - 20240208 - Description...
 */
const ARCHIVE_NAME_PATTERN = /^(CONTRACT|RECEIPT|CORRESPONDANCE|DOCUMENT|REPORT)\s*-\s*\d{8}\s*-/i;

/**
 * Check if filename already follows archive naming convention
 */
export function shouldPreserveArchiveName(filename: string): boolean {
  return ARCHIVE_NAME_PATTERN.test(filename);
}

/**
 * Generate archive filename following convention:
 * {TYPE} - {YYYYMMDD} - {Description} ({Details}) - {CATEGORY}.{ext}
 */
export function generateArchiveName(options: {
  type: string;           // RECEIPT, CONTRACT, DOCUMENT, etc.
  date: Date;
  description: string;
  details?: string;
  category: string;       // HOME, WORK, CAR, etc.
  extension: string;
}): string {
  const dateStr = options.date.toISOString().slice(0, 10).replace(/-/g, "");
  const desc = sanitizeArchiveFilename(options.description);
  const cat = options.category.toUpperCase();
  const type = options.type.toUpperCase();
  const ext = options.extension.replace(/^\./, "");

  if (options.details) {
    const details = sanitizeArchiveFilename(options.details);
    return `${type} - ${dateStr} - ${desc} (${details}) - ${cat}.${ext}`;
  }

  return `${type} - ${dateStr} - ${desc} - ${cat}.${ext}`;
}

/**
 * Sanitize text for use in archive filename
 */
function sanitizeArchiveFilename(text: string): string {
  return text
    .replace(/[<>:"/\\|?*]/g, "")  // Remove invalid chars
    .replace(/\s+/g, " ")           // Normalize whitespace
    .trim()
    .slice(0, 80);                  // Limit length
}

/**
 * Parse natural language date from dictated text
 * Returns YYYY-MM-DD string or undefined if not detected
 *
 * Supported patterns:
 * - "dated 15th June" / "dated June 15th" / "dated 15 June 2024"
 * - "from June 15th" / "from 15th June"
 * - "date 2024-06-15" / "date 15/06/2024"
 * - "this is from last month" / "from last week"
 * - Month names: January, February, etc. (full and abbreviated)
 */
export function parseDictatedDate(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Month name mappings
  const monthNames: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  // Pattern: "dated 15th June 2024" or "from June 15 2024" or "date 15 June"
  const dateWithMonthPattern = /(?:dated?|from)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{4})?/i;
  const monthFirstPattern = /(?:dated?|from)\s+(?:the\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?/i;

  let match = dateWithMonthPattern.exec(lowerText);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2].toLowerCase();
    const month = monthNames[monthStr.slice(0, 3)] ?? monthNames[monthStr];
    const year = match[3] ? parseInt(match[3], 10) : currentYear;
    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString().slice(0, 10);
    }
  }

  match = monthFirstPattern.exec(lowerText);
  if (match) {
    const monthStr = match[1].toLowerCase();
    const day = parseInt(match[2], 10);
    const month = monthNames[monthStr.slice(0, 3)] ?? monthNames[monthStr];
    const year = match[3] ? parseInt(match[3], 10) : currentYear;
    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      return date.toISOString().slice(0, 10);
    }
  }

  // Pattern: "date 2024-06-15" or "dated 2024-06-15"
  const isoPattern = /(?:dated?|from)\s+(\d{4})-(\d{2})-(\d{2})/i;
  match = isoPattern.exec(lowerText);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  // Pattern: "date 15/06/2024" or "dated 15/6/24"
  const slashPattern = /(?:dated?|from)\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i;
  match = slashPattern.exec(lowerText);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    let year = match[3];
    if (year.length === 2) {
      year = (parseInt(year, 10) > 50 ? "19" : "20") + year;
    }
    return `${year}-${month}-${day}`;
  }

  // Pattern: "from last month" / "last month's"
  if (/(?:from\s+)?last\s+month/i.test(lowerText)) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth.toISOString().slice(0, 10);
  }

  // Pattern: "from last week"
  if (/(?:from\s+)?last\s+week/i.test(lowerText)) {
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return lastWeek.toISOString().slice(0, 10);
  }

  // Pattern: "from yesterday"
  if (/(?:from\s+)?yesterday/i.test(lowerText)) {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return yesterday.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Determine pipeline from commands
 */
export function determinePipeline(commands: string[]): PipelineType {
  if (commands.includes("archive")) return "archive";
  if (commands.includes("receipt")) return "receipt";
  if (commands.includes("clip")) return "clip";
  if (commands.includes("note")) return "note";
  return "default";
}

/**
 * Map of command names to fabric pattern names
 * Commands can be typed as /summarize or spoken as "forward slash summarize"
 *
 * NOTE: Only EXPLICIT pattern names trigger processing.
 * Commands like /1on1 are for TAGGING (use #1on1), not pattern execution.
 * Use /meeting-notes or /meeting to explicitly request the pattern.
 */
const FABRIC_PATTERN_COMMANDS: Record<string, string> = {
  // Summarization patterns
  "summarize": "summarize",
  "summary": "summarize",

  // Wisdom extraction patterns
  "wisdom": "extract_wisdom",
  "extract-wisdom": "extract_wisdom",

  // Article-specific patterns
  "article": "extract_article_wisdom",
  "article-wisdom": "extract_article_wisdom",

  // Meeting patterns - explicit names only
  // NOTE: /1on1 is NOT here - use #1on1 as a tag instead
  "meeting-notes": "meeting_notes",
};

/**
 * Determine which fabric patterns to run based on explicit commands
 * Returns array of pattern names to run, or empty if no pattern commands found
 */
export function determineRequestedPatterns(commands: string[]): string[] {
  const patterns: string[] = [];

  for (const cmd of commands) {
    const pattern = FABRIC_PATTERN_COMMANDS[cmd.toLowerCase()];
    if (pattern && !patterns.includes(pattern)) {
      patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Detect dictated pipeline intent from caption
 * Maps natural language phrases to pipeline types (archive, receipt)
 * Returns pipeline type if detected, null otherwise
 */
export function detectDictatedPipelineIntent(caption: string | undefined): { pipeline: PipelineType; metadata?: { type?: string; category?: string } } | null {
  if (!caption) return null;

  const lowerCaption = caption.toLowerCase();

  // Receipt patterns
  const receiptPatterns = [
    /\b(receipt|invoice|bill|purchase|expense)\b/,
    /\b(save\s*(this\s*)?(receipt|invoice|bill))\b/,
    /\b(store\s*(this\s*)?(receipt|invoice|bill))\b/,
    /\b(bought|purchased|paid)\b/,
  ];

  for (const pattern of receiptPatterns) {
    if (pattern.test(lowerCaption)) {
      console.log(`  Detected dictated pipeline intent: "receipt" from caption`);

      // Detect document type for receipt pipeline
      let type: string | undefined;
      if (/\b(invoice|tax\s*invoice)\b/.test(lowerCaption)) type = "INVOICE";
      else if (/\b(receipt)\b/.test(lowerCaption)) type = "RECEIPT";
      else if (/\b(bill)\b/.test(lowerCaption)) type = "BILL";
      else if (/\b(expense)\b/.test(lowerCaption)) type = "EXPENSE";

      // Detect category
      let category: string | undefined;
      if (/\b(home|house|property)\b/.test(lowerCaption)) category = "HOME";
      else if (/\b(work|job|office|business)\b/.test(lowerCaption)) category = "WORK";
      else if (/\b(car|vehicle|auto|fuel|gas)\b/.test(lowerCaption)) category = "CAR";
      else if (/\b(health|medical|doctor|hospital)\b/.test(lowerCaption)) category = "HEALTH";

      return { pipeline: "receipt", metadata: { type, category } };
    }
  }

  // Archive patterns with optional category detection
  const archivePatterns = [
    /\b(archive|file|store|save)\s*(this\s*)?(document|contract|agreement|paper|file)?\b/,
    /\b(important\s*document)\b/,
    /\b(contract|agreement|lease|deed|certificate|license|permit)\b/,
    /\b(keep\s*(this|for)\s*(records?|files?))\b/,
  ];

  for (const pattern of archivePatterns) {
    if (pattern.test(lowerCaption)) {
      console.log(`  Detected dictated pipeline intent: "archive" from caption`);

      // Try to detect document type
      let type: string | undefined;
      if (/\b(contract|agreement)\b/.test(lowerCaption)) type = "CONTRACT";
      else if (/\b(lease)\b/.test(lowerCaption)) type = "LEASE";
      else if (/\b(certificate|license|permit)\b/.test(lowerCaption)) type = "CERTIFICATE";
      else if (/\b(deed|title)\b/.test(lowerCaption)) type = "DEED";

      // Try to detect category
      let category: string | undefined;
      if (/\b(home|house|property|real\s*estate)\b/.test(lowerCaption)) category = "HOME";
      else if (/\b(work|job|employment|office)\b/.test(lowerCaption)) category = "WORK";
      else if (/\b(car|vehicle|auto)\b/.test(lowerCaption)) category = "CAR";
      else if (/\b(health|medical|doctor|hospital)\b/.test(lowerCaption)) category = "HEALTH";

      return { pipeline: "archive", metadata: { type, category } };
    }
  }

  return null;
}

/**
 * Detect document type from Vision AI or extracted content
 * Scans content for keywords that indicate document type
 * Returns type string (INVOICE, RECEIPT, CONTRACT, etc.) or undefined
 */
export function detectDocumentTypeFromContent(content: string): string | undefined {
  const lowerContent = content.toLowerCase();

  // Check for specific document types in order of specificity
  // Invoice/Tax Invoice
  if (/\b(tax\s*invoice|invoice\s*(number|no|#|date)?)\b/.test(lowerContent)) {
    return "INVOICE";
  }
  // Receipt
  if (/\b(receipt|payment\s*received|thank\s*you\s*for\s*your\s*(purchase|payment))\b/.test(lowerContent)) {
    return "RECEIPT";
  }
  // Contract/Agreement
  if (/\b(contract|agreement|terms\s*and\s*conditions|hereby\s*agree)\b/.test(lowerContent)) {
    return "CONTRACT";
  }
  // Certificate
  if (/\b(certificate|certification|certified|this\s*is\s*to\s*certify)\b/.test(lowerContent)) {
    return "CERTIFICATE";
  }
  // Correspondence/Letter
  if (/\b(dear\s+(sir|madam|mr|mrs|ms)|regards|sincerely|to\s*whom\s*it\s*may\s*concern)\b/.test(lowerContent)) {
    return "CORRESPONDANCE";
  }
  // Bill (utility bills, etc.)
  if (/\b(bill|amount\s*due|due\s*date|account\s*number)\b/.test(lowerContent)) {
    return "BILL";
  }

  return undefined;
}

/**
 * Detect dictated intent from caption for document processing
 * Maps natural language phrases to fabric patterns
 * Returns pattern name if intent detected, null otherwise
 */
export function detectDictatedDocumentIntent(caption: string | undefined): string | null {
  if (!caption) return null;

  const lowerCaption = caption.toLowerCase();

  // Intent patterns mapped to fabric patterns
  const intentPatterns: Array<{ patterns: RegExp[]; fabricPattern: string }> = [
    {
      patterns: [
        /\b(summarize|summarise|summary|sum up|give me a summary)\b/,
        /\b(tldr|tl;dr|too long)\b/,
      ],
      fabricPattern: "summarize",
    },
    {
      patterns: [
        /\b(extract\s*(the\s*)?(wisdom|insights|learnings|takeaways))\b/,
        /\b(key\s*(points|ideas|insights|takeaways|learnings))\b/,
        /\b(main\s*(points|ideas|insights|takeaways))\b/,
        /\b(what.*(learn|take away|important))\b/,
      ],
      fabricPattern: "extract_wisdom",
    },
    {
      patterns: [
        /\b(extract\s*(the\s*)?(article|content))\b/,
        /\b(article\s*wisdom)\b/,
      ],
      fabricPattern: "extract_article_wisdom",
    },
    {
      patterns: [
        /\b(analyze|analyse|analysis)\b/,
        /\b(break\s*down)\b/,
      ],
      fabricPattern: "analyze_paper",
    },
  ];

  for (const { patterns, fabricPattern } of intentPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(lowerCaption)) {
        console.log(`  Detected dictated intent: "${fabricPattern}" from caption`);
        return fabricPattern;
      }
    }
  }

  return null;
}

/**
 * AI Intent Extraction Result
 */
export interface IntentResult {
  pipeline: PipelineType;
  confidence: number;
  metadata: {
    type?: string;      // RECEIPT, CONTRACT, DOCUMENT
    category?: string;  // HOME, WORK, CAR
    vendor?: string;    // For receipts
    amount?: number;    // For receipts
  };
  suggestedTags: string[];
  reasoning: string;
}

/**
 * Extract intent from natural language caption using LLM
 *
 * Used when no explicit /command is detected.
 * Returns pipeline routing and extracted metadata.
 */
export async function extractIntent(
  caption: string,
  contentType: string,
  filename?: string,
  apiKey?: string
): Promise<IntentResult | null> {
  if (!apiKey) return null;
  if (!caption || caption.trim().length < 10) return null;

  const prompt = `Analyze this message and extract the user's intent for document processing.

Message: "${caption}"
Content type: ${contentType}
Filename: ${filename || "unknown"}

Return JSON with:
{
  "pipeline": "note" | "clip" | "archive" | "receipt",
  "confidence": 0.0-1.0,
  "metadata": {
    "type": "RECEIPT" | "CONTRACT" | "DOCUMENT" | null,
    "category": "HOME" | "WORK" | "CAR" | "HEALTH" | null,
    "vendor": "string or null",
    "amount": "number or null"
  },
  "suggestedTags": ["tag1", "tag2"],
  "reasoning": "brief explanation"
}

Guidelines:
- "archive" pipeline: contracts, important documents, legal papers
- "receipt" pipeline: purchase receipts, invoices, expense-related
- "clip" pipeline: articles, links, content to read later
- "note" pipeline: ideas, meeting notes, general text

Return ONLY valid JSON, no markdown code blocks.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",  // Fast, low-cost model for intent extraction
        messages: [
          { role: "system", content: "You extract document processing intent from natural language. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 300,
        // Note: temperature not supported by gpt-5-mini, uses default (1)
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`Intent extraction API error: ${response.status} - ${errorBody}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) return null;

    // Parse JSON response
    const result = JSON.parse(content) as IntentResult;

    // Validate pipeline
    const validPipelines = ["note", "clip", "archive", "receipt"];
    if (!validPipelines.includes(result.pipeline)) {
      result.pipeline = "default";
    }

    return result;
  } catch (e) {
    console.warn(`Intent extraction failed: ${e}`);
    return null;
  }
}

/**
 * Confidence threshold for automatic intent-based routing
 */
const INTENT_CONFIDENCE_THRESHOLD = 0.8;

/**
 * Sync file to Dropbox archive folder
 */
export async function syncToDropbox(
  sourcePath: string,
  archiveName: string
): Promise<string | null> {
  const config = getConfig();

  if (!config.dropboxArchivePath) {
    console.warn("Dropbox archive path not configured, skipping sync");
    return null;
  }

  // Ensure directory exists
  if (!existsSync(config.dropboxArchivePath)) {
    try {
      await mkdir(config.dropboxArchivePath, { recursive: true });
    } catch (error) {
      console.warn(`Could not create Dropbox directory: ${error}`);
      return null;
    }
  }

  const destPath = join(config.dropboxArchivePath, archiveName);

  try {
    // Copy file to Dropbox
    const data = await Bun.file(sourcePath).arrayBuffer();
    await Bun.write(destPath, data);
    console.log(`  Synced to Dropbox: ${destPath}`);
    return destPath;
  } catch (error) {
    console.warn(`Dropbox sync failed: ${error}`);
    return null;
  }
}

/**
 * Extract inline hints from message text
 *
 * Supported formats:
 *   #tag               → tags: ["tag"]
 *   #project/name      → tags: ["project/name"]
 *   @john_doe          → people: ["john_doe"]
 *   @john              → people: ["john"]
 *   /transcript        → commands: ["transcript"]
 *   /meeting-notes     → commands: ["meeting-notes"]
 *
 * Example message:
 *   "#project/pai @ed_overy /meeting-notes
 *    Notes from our weekly sync about the ingest pipeline"
 *
 * Results in:
 *   tags: ["project/pai"]
 *   people: ["ed_overy"]
 *   commands: ["meeting-notes"]
 *   cleanedContent: "Notes from our weekly sync about the ingest pipeline"
 */
export function extractInlineHints(text: string): InlineHints {
  return extractHints(text, false);
}

/**
 * Extract spoken hints from transcribed audio
 *
 * Supports Wispr Flow / dictation style spoken hints:
 *   "hashtag project pai" → #project/pai (if slash follows)
 *   "hashtag meeting notes" → #meeting-notes
 *   "at john" → @john
 *   "at ed overy" → @ed_overy
 *   "forward slash archive" → /archive
 *   "slash summary" → /summary
 *
 * Also supports natural prefix hints at start of recording:
 *   "This is about the data platform project with Ed Overy..."
 *   → No extraction, but passed to AI for intent parsing
 */
export function extractSpokenHints(transcript: string): InlineHints {
  return extractHints(transcript, true);
}

/**
 * Merge two InlineHints objects, deduplicating arrays
 */
export function mergeHints(base: InlineHints, additional: InlineHints): InlineHints {
  return {
    tags: [...new Set([...base.tags, ...additional.tags])],
    people: [...new Set([...base.people, ...additional.people])],
    commands: [...new Set([...base.commands, ...additional.commands])],
    scope: additional.scope || base.scope,  // Additional takes precedence
    metadata: { ...base.metadata, ...additional.metadata },
    cleanedContent: additional.cleanedContent || base.cleanedContent,
  };
}

/**
 * Core hint extraction with optional spoken mode
 */
function extractHints(text: string, spokenMode: boolean): InlineHints {
  const tags: string[] = [];
  const people: string[] = [];
  const commands: string[] = [];
  const metadata: SourceMetadata = {};
  let scope: ScopeType | undefined;
  let workingText = text;

  // In spoken mode, first convert spoken patterns to symbol form
  // This allows the standard extraction to work on both modes
  if (spokenMode) {
    // "hashtag <word>" or "hashtag <word> <word>" → #word or #word-word
    // Matches: "hashtag project", "hashtag meeting notes", "hashtag project slash pai"
    workingText = workingText.replace(
      /\b(?:hash\s*tag|hashtag)\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+(?:slash\s+)?[a-zA-Z][a-zA-Z0-9]*)?)\b/gi,
      (match, captured) => {
        // Convert "project slash pai" → "project/pai", "meeting notes" → "meeting-notes"
        const normalized = captured
          .replace(/\s+slash\s+/gi, "/")
          .replace(/\s+/g, "-")
          .toLowerCase();
        return ` #${normalized}`;
      }
    );

    // "at <name>" or "at <first> <last>" → @name or @first_last
    // Matches: "at john", "at ed overy", "at john doe"
    workingText = workingText.replace(
      /\bat\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*)?)\b/gi,
      (match, captured) => {
        // Check it's not "at the", "at a", "at this", etc.
        const words = captured.toLowerCase().split(/\s+/);
        const skipWords = ["the", "a", "an", "this", "that", "my", "your", "our", "their", "some", "any", "all", "no", "first", "last", "least", "most"];
        if (skipWords.includes(words[0])) {
          return match; // Keep original, not a mention
        }
        const normalized = captured.replace(/\s+/g, "_").toLowerCase();
        return ` @${normalized}`;
      }
    );

    // "forward slash <command>" or "slash <command>" → /command
    // Matches: "forward slash archive", "slash summary", "forward slash meeting notes"
    workingText = workingText.replace(
      /\b(?:forward\s+)?slash\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*)?)\b/gi,
      (match, captured) => {
        const normalized = captured.replace(/\s+/g, "-").toLowerCase();
        return ` /${normalized}`;
      }
    );

    // Spoken scope: "scope private", "scope work", "tilde private", "tilde work"
    workingText = workingText.replace(
      /\b(?:scope|tilde)\s+(private|work|personal)\b/gi,
      (match, captured) => {
        const normalized = captured.toLowerCase() === "personal" ? "private" : captured.toLowerCase();
        return ` ~${normalized}`;
      }
    );

    // Natural language scope detection:
    // "this is personal" / "this is private" → ~private
    // "for work" / "work related" → ~work
    if (/\b(this\s+is\s+(personal|private)|personal\s+(matter|stuff|thing)|private\s+(matter|stuff|thing)|my\s+personal)\b/i.test(workingText)) {
      if (!scope) {
        scope = "private";
        console.log(`  Detected dictated scope intent: "private" from natural language`);
      }
    }
    if (/\b(for\s+work|work\s+(related|stuff|thing)|business\s+(related|matter)|professional)\b/i.test(workingText)) {
      if (!scope) {
        scope = "work";
        console.log(`  Detected dictated scope intent: "work" from natural language`);
      }
    }

    // Natural language date detection:
    // "dated 15th June", "from last month", "from yesterday"
    const dictatedDate = parseDictatedDate(workingText);
    if (dictatedDate) {
      metadata.date = dictatedDate;
      console.log(`  Detected dictated document date: ${dictatedDate}`);
    }
  }

  // Extract metadata: [key:value] pairs
  // Supports: [source:clipboard-share][device:iphone][user:andreas]
  const metadataPattern = /\[([a-zA-Z_]+):([^\]]+)\]/g;
  let match;
  while ((match = metadataPattern.exec(workingText)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();

    // Map to known metadata fields
    switch (key) {
      case "source":
        metadata.source = value;
        break;
      case "device":
        metadata.device = value;
        break;
      case "user":
        metadata.user = value;
        break;
      case "type":
        metadata.type = value.toUpperCase();  // Normalize to uppercase
        break;
      case "category":
        metadata.category = value.toUpperCase();  // Normalize to uppercase
        break;
      case "processor":
        metadata.processor = value.toLowerCase();
        break;
      case "date":
        // Validate date format (YYYY-MM-DD or DD/MM/YYYY)
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          metadata.date = value;
          console.log(`  Extracted document date: ${value}`);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
          // Convert DD/MM/YYYY to YYYY-MM-DD
          const parts = value.split("/");
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          let year = parts[2];
          if (year.length === 2) {
            year = (parseInt(year, 10) > 50 ? "19" : "20") + year;
          }
          metadata.date = `${year}-${month}-${day}`;
          console.log(`  Extracted document date: ${metadata.date}`);
        }
        break;
    }
  }

  // Extract hashtags: #tag or #project/name (supports / in tags)
  // Must be at word boundary or start of line
  const tagPattern = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/gm;
  while ((match = tagPattern.exec(workingText)) !== null) {
    tags.push(match[1]);
  }

  // Extract mentions: @name, @firstname_lastname, or @First Last
  // Must be at word boundary or start of line
  // Supports: @ed_overy, @Ed, @Ed Overy (normalized to ed_overy)
  const mentionPattern = /(?:^|\s)@([a-zA-Z][a-zA-Z0-9_]*(?:\s+[a-zA-Z][a-zA-Z0-9_]*)?)/gm;
  while ((match = mentionPattern.exec(workingText)) !== null) {
    // Normalize: "Ed Overy" → "ed_overy", "Ed" → "ed"
    const normalized = match[1].replace(/\s+/g, "_").toLowerCase();
    people.push(normalized);
  }

  // Extract commands: /command ONLY at start of line or after whitespace
  // NOT in URLs (http://..., https://...)
  const commandPattern = /(?:^|\s)\/([a-zA-Z][a-zA-Z0-9_-]*)(?=\s|$)/gm;
  while ((match = commandPattern.exec(workingText)) !== null) {
    commands.push(match[1]);
  }

  // Extract scope: ~private or ~work
  const scopePattern = /(?:^|\s)~(private|work)\b/gi;
  while ((match = scopePattern.exec(workingText)) !== null) {
    const detectedScope = match[1].toLowerCase() as ScopeType;
    if (!scope) {
      scope = detectedScope;
      console.log(`  Extracted scope hint: "${scope}"`);
    }
  }

  // Remove hints from content (clean version)
  // Be careful not to corrupt URLs
  let cleaned = workingText
    .replace(/\[[a-zA-Z_]+:[^\]]+\]/g, " ")  // Remove [key:value] metadata
    .replace(/(?:^|\s)#[a-zA-Z][a-zA-Z0-9_/-]*/gm, " ")
    .replace(/(?:^|\s)@[a-zA-Z][a-zA-Z0-9_]*(?:\s+[a-zA-Z][a-zA-Z0-9_]*)?,?/gm, " ")  // @First Last or @name
    .replace(/(?:^|\s)\/[a-zA-Z][a-zA-Z0-9_-]*(?=\s|$)/gm, " ")
    .replace(/(?:^|\s)~(private|work)\b/gi, " ")  // Remove ~scope hints
    .replace(/^\s*\n/gm, "")  // Remove empty lines
    .replace(/\s+/g, " ")     // Normalize whitespace
    .trim();

  return {
    tags,
    people,
    commands,
    scope,
    metadata,
    cleanedContent: cleaned,
  };
}

export interface ProcessResult {
  success: boolean;
  content?: ProcessedContent[];
  securityBlocked?: boolean;
  securityWarnings?: string[];
  error?: string;
}

/**
 * Process a Telegram message through the pipeline
 */
export async function processMessage(
  message: TelegramMessage,
  contentType: ContentType,
  profile: ProcessingProfile
): Promise<ProcessResult> {
  const config = getConfig();

  // Ensure temp directory exists
  if (!existsSync(config.tempDir)) {
    await mkdir(config.tempDir, { recursive: true });
  }

  // Step 0: Extract inline hints from message text/caption
  // Supports share-with-hints workflow from iOS Shortcuts / macOS Share menu
  const messageText = extractText(message);
  const hints = extractInlineHints(messageText);

  // Step 0.5: SECURITY CHECK
  const securityCheck = performSecurityCheck(
    message.message_id,
    message.from?.id,
    messageText,
    hints.commands
  );

  if (!securityCheck.allowed) {
    console.warn(`⚠️  Security blocked message ${message.message_id}: ${securityCheck.reasons.join(", ")}`);
    auditLog({
      timestamp: new Date().toISOString(),
      messageId: message.message_id,
      senderId: message.from?.id,
      contentType,
      action: "blocked",
      reason: securityCheck.reasons.join("; "),
      hints: {
        tags: hints.tags,
        people: hints.people,
        commands: hints.commands,
        blockedCommands: securityCheck.blockedCommands || [],
      },
    });
    return {
      success: false,
      securityBlocked: true,
      securityWarnings: securityCheck.warnings,
      error: securityCheck.reasons.join("; "),
    };
  }

  // Log warnings but continue
  if (securityCheck.warnings.length > 0) {
    console.warn(`⚠️  Security warnings for message ${message.message_id}: ${securityCheck.warnings.join(", ")}`);
  }

  // Use sanitized content and validated commands
  const sanitizedText = securityCheck.sanitizedContent || messageText;
  const validCommands = securityCheck.validCommands || [];
  hints.commands = validCommands; // Replace with validated commands only

  // Step 1: Extract raw content based on type
  let rawContent: string;
  let suggestedTitle: string;

  switch (contentType) {
    case "voice":
    case "audio":
      const audioResult = await processAudio(message, config.tempDir);
      rawContent = audioResult.content;
      suggestedTitle = audioResult.title;
      // Merge spoken hints (from transcript) with caption hints
      // This supports both: Shortcut with metadata AND direct Voice Memos with spoken hints
      if (audioResult.spokenHints) {
        const merged = mergeHints(hints, audioResult.spokenHints);
        hints.tags = merged.tags;
        hints.people = merged.people;
        hints.metadata = merged.metadata;
        // Note: We keep hints.cleanedContent from caption, not transcript
        // The transcript content is already in rawContent

        // Validate any new commands from spoken hints
        const newSpokenCommands = audioResult.spokenHints.commands.filter(
          cmd => !validCommands.includes(cmd)
        );
        if (newSpokenCommands.length > 0) {
          const spokenCmdValidation = validateCommands(newSpokenCommands);
          // Add valid spoken commands to the list
          validCommands.push(...spokenCmdValidation.filter(c => !validCommands.includes(c)));
          hints.commands = validCommands;
        }
      }
      break;

    case "document":
      // Check if archive pipeline to preserve original file for Dropbox sync
      const docPipeline = determinePipeline(validCommands);
      const keepForArchive = docPipeline === "archive" || docPipeline === "receipt";
      const docResult = await processDocument(message, config.tempDir, keepForArchive);
      rawContent = docResult.content;
      suggestedTitle = docResult.title;
      // Store original path for Dropbox sync (will be used later if archive pipeline)
      if (docResult.originalPath) {
        (message as any)._originalFilePath = docResult.originalPath;
      }
      break;

    case "url":
      const urlResult = await processUrl(message);
      rawContent = urlResult.content;
      suggestedTitle = urlResult.title;
      break;

    case "photo":
      // Check if archive pipeline to preserve original file for Dropbox sync
      // Check both explicit commands AND dictated intent from caption
      let photoPipeline = determinePipeline(validCommands);
      if (photoPipeline === "default") {
        const dictatedPhotoIntent = detectDictatedPipelineIntent(messageText);
        if (dictatedPhotoIntent) {
          photoPipeline = dictatedPhotoIntent.pipeline;
        }
      }
      const keepPhotoForArchive = photoPipeline === "archive" || photoPipeline === "receipt";
      const photoResult = await processPhoto(message, config.tempDir, hints, keepPhotoForArchive);
      rawContent = photoResult.content;
      suggestedTitle = photoResult.title;
      // Store original path for Dropbox sync (will be used later if archive pipeline)
      if (photoResult.filePath && keepPhotoForArchive) {
        (message as any)._originalFilePath = photoResult.filePath;
      }
      break;

    case "text":
    default:
      // Use cleaned content (hints removed) for text messages
      rawContent = hints.cleanedContent || messageText;
      suggestedTitle = generateTitleFromText(rawContent);
      break;
  }

  // Step 2: Generate tags (profile defaults + inline hints)
  const baseTags = generateTags(profile, {
    contentType,
    source: "telegram",
    isRaw: true,
    isWisdom: false,
  });

  // Merge inline hints with base tags
  const tags = [
    ...baseTags,
    ...hints.tags,
    ...hints.people,  // @name becomes a tag
  ];

  // Step 2b: Determine pipeline from commands
  let pipeline = determinePipeline(validCommands);
  let intentResult: IntentResult | null = null;

  // Step 2b.0: If no explicit command, try dictated pipeline intent (archive/receipt)
  if (pipeline === "default") {
    const dictatedPipeline = detectDictatedPipelineIntent(messageText);
    if (dictatedPipeline) {
      pipeline = dictatedPipeline.pipeline;
      // Apply detected metadata
      if (dictatedPipeline.metadata?.type && !hints.metadata.type) {
        hints.metadata.type = dictatedPipeline.metadata.type;
      }
      if (dictatedPipeline.metadata?.category && !hints.metadata.category) {
        hints.metadata.category = dictatedPipeline.metadata.category;
      }
    }
  }

  // Step 2b.1: If still no pipeline, try AI intent parsing
  if (pipeline === "default" && config.openaiApiKey) {
    const filename = message.document?.file_name || message.audio?.file_name;
    intentResult = await extractIntent(
      messageText,
      contentType,
      filename,
      config.openaiApiKey
    );

    if (intentResult && intentResult.confidence >= INTENT_CONFIDENCE_THRESHOLD) {
      pipeline = intentResult.pipeline;
      console.log(`  AI intent: ${pipeline} (confidence: ${(intentResult.confidence * 100).toFixed(0)}%)`);
      console.log(`    Reasoning: ${intentResult.reasoning}`);

      // Apply AI-extracted metadata if not already set
      if (intentResult.metadata.type && !hints.metadata.type) {
        hints.metadata.type = intentResult.metadata.type;
      }
      if (intentResult.metadata.category && !hints.metadata.category) {
        hints.metadata.category = intentResult.metadata.category;
      }

      // Add AI-suggested tags
      for (const tag of intentResult.suggestedTags || []) {
        if (!tags.includes(tag) && !hints.tags.includes(tag)) {
          tags.push(tag);
        }
      }
    } else if (intentResult) {
      console.log(`  AI intent: ${intentResult.pipeline} (low confidence: ${(intentResult.confidence * 100).toFixed(0)}%, using default)`);
    }
  }

  // Step 2c: For archive pipeline, generate archive name and track original file
  let archiveName: string | undefined;
  let originalFilePath: string | undefined = (message as any)._originalFilePath;

  if (pipeline === "archive" || pipeline === "receipt") {
    // Check if source file already has proper archive naming
    const sourceFilename = message.document?.file_name || "";

    if (shouldPreserveArchiveName(sourceFilename)) {
      // Preserve the existing archive name
      archiveName = sourceFilename;
      console.log(`  Preserving archive name: ${archiveName}`);
    } else {
      // Generate new archive name from metadata
      // Try to detect document type from: 1) caption intent, 2) Vision AI content analysis, 3) default
      let docType = hints.metadata.type;
      if (!docType && rawContent) {
        const detectedType = detectDocumentTypeFromContent(rawContent);
        if (detectedType) {
          console.log(`  Detected document type from content: ${detectedType}`);
          docType = detectedType;
        }
      }
      docType = docType || "DOCUMENT";
      const category = hints.metadata.category || "MISC";
      // Get extension from: 1) document filename, 2) original file path (for photos), 3) content type
      let ext = sourceFilename.split(".").pop();
      if (!ext && originalFilePath) {
        ext = originalFilePath.split(".").pop();
      }
      if (!ext) {
        ext = contentType === "photo" ? "jpg" : "pdf";
      }

      // Use document date from metadata if provided, otherwise use today
      const archiveDate = hints.metadata.date
        ? new Date(hints.metadata.date + "T00:00:00")  // Parse YYYY-MM-DD
        : new Date();

      archiveName = generateArchiveName({
        type: docType,
        date: archiveDate,
        description: suggestedTitle,
        category,
        extension: ext,
      });
      console.log(`  Generated archive name: ${archiveName}${hints.metadata.date ? ` (using document date: ${hints.metadata.date})` : ""}`);
    }

    // Add archive-specific tags
    tags.push("archive");
    if (pipeline === "receipt") {
      tags.push("receipt");
    }
  }

  // Step 3: Determine fabric patterns to apply
  // Priority: 1) Explicit commands (/summarize, /wisdom), 2) Dictated intent from caption, 3) Profile defaults
  const requestedPatterns = determineRequestedPatterns(validCommands);

  // For documents, also check for dictated intent in caption (e.g., "summarize this")
  const dictatedIntent = contentType === "document"
    ? detectDictatedDocumentIntent(hints.cleanedContent || message.caption)
    : null;

  let patterns: string[];
  let hasExplicitPatternRequest: boolean;

  if (requestedPatterns.length > 0) {
    // User used explicit commands like /summarize, /wisdom
    patterns = requestedPatterns;
    hasExplicitPatternRequest = true;
  } else if (dictatedIntent) {
    // User dictated intent like "summarize this document"
    patterns = [dictatedIntent];
    hasExplicitPatternRequest = true;
  } else {
    // Fall back to profile defaults (but documents skip this due to skipAutoPatterns)
    patterns = profile.processing.patterns[contentType] || [];
    hasExplicitPatternRequest = false;
  }
  const results: ProcessedContent[] = [];

  // Determine scope:
  // 1. Explicit hint from user (~private, ~work)
  // 2. Auto-detect from pipeline (archive/receipt → private)
  // 3. Default to work for all other pipelines
  //
  // Security model: No tag = private (excluded from context)
  // Must explicitly have scope/work to be included in default queries
  let scope: ScopeType = hints.scope || "work";  // Default to work
  const isArchivePipeline = pipeline === "archive" || pipeline === "receipt";

  if (isArchivePipeline && !hints.scope) {
    scope = "private";
    console.log(`  Auto-set scope to "private" for ${pipeline} pipeline`);
  } else if (!hints.scope) {
    console.log(`  Default scope: "work"`);
  }

  // Always add scope tag (explicit is better)
  tags.push(`scope/${scope}`);

  // Always create raw note
  // Include source metadata if present
  const hasMetadata = Object.keys(hints.metadata).length > 0;

  results.push({
    title: suggestedTitle,
    rawContent,
    tags,
    source: "telegram",
    contentType,
    scope,
    pipeline,
    messageDate: message.date,
    ...(archiveName && { archiveName }),
    ...(originalFilePath && { originalFilePath }),
    ...(hasMetadata && { sourceMetadata: hints.metadata }),
  });

  // If paired output, also create processed version
  // Skip auto-patterns for:
  // - clip pipeline (clips are already summaries/snippets)
  // - archive/receipt pipeline (straight-through archiving, no processing)
  // - document content (PDFs/DOCX should just be extracted, not auto-summarized)
  // BUT: Always run if user explicitly requested patterns via command (/wisdom, /summarize)
  const skipAutoPatterns = (pipeline === "clip" || isArchivePipeline || contentType === "document") && !hasExplicitPatternRequest;
  if (profile.processing.pairedOutput && patterns.length > 0 && !skipAutoPatterns) {
    if (hasExplicitPatternRequest) {
      console.log(`  Running requested pattern(s): ${patterns.join(", ")}`);
    }
    try {
      const processedContent = await applyFabricPatterns(rawContent, patterns);
      const wisdomTags = generateTags(profile, {
        contentType,
        source: "telegram",
        isRaw: false,
        isWisdom: true,
      });

      // Add scope tag to wisdom output too
      if (scope) {
        wisdomTags.push(`scope/${scope}`);
      }

      results.push({
        title: suggestedTitle,
        rawContent,
        processedContent,
        tags: wisdomTags,
        source: "telegram",
        contentType,
        scope,
        pipeline,
        messageDate: message.date,
        ...(archiveName && { archiveName }),
        ...(originalFilePath && { originalFilePath }),
        ...(hasMetadata && { sourceMetadata: hints.metadata }),
      });
    } catch (error) {
      console.warn(`Warning: Fabric processing failed: ${error}`);
    }
  }

  // Audit log successful processing
  auditLog({
    timestamp: new Date().toISOString(),
    messageId: message.message_id,
    senderId: message.from?.id,
    contentType,
    action: "processed",
    tags: tags,
    hints: {
      tags: hints.tags,
      people: hints.people,
      commands: validCommands,
      blockedCommands: securityCheck.blockedCommands || [],
    },
  });

  return {
    success: true,
    content: results,
    securityWarnings: securityCheck.warnings,
  };
}

/**
 * Process voice/audio message via whisper.cpp
 *
 * Supports two input modes:
 * 1. Via iOS Shortcut: Metadata in caption, hints from caption
 * 2. Direct from Voice Memos: Spoken hints in audio (Wispr Flow style)
 *
 * Returns transcript with spoken hints extracted and cleaned.
 */
async function processAudio(
  message: TelegramMessage,
  tempDir: string
): Promise<{ content: string; title: string; spokenHints?: InlineHints }> {
  const fileId = message.voice?.file_id || message.audio?.file_id;
  if (!fileId) throw new Error("No audio file in message");

  // Get original extension from audio metadata
  const originalName = message.audio?.file_name || "";
  const ext = originalName.split(".").pop()?.toLowerCase() || "ogg";
  const filename = `audio_${message.message_id}.${ext}`;
  const filePath = await downloadFile(fileId, filename);
  const wavPath = filePath.replace(/\.[^.]+$/, ".wav");

  try {
    // Convert to WAV format (16kHz mono) for whisper.cpp
    await execAsync(
      `ffmpeg -y -i "${filePath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`,
      { timeout: 120000 }
    );

    // Use whisper.cpp for transcription
    // Prioritize large-v3 model, fallback to medium
    const whisperBin = "/Users/andreas/Documents/src/whisper.cpp/whisper-cpp";
    const modelDir = "/Users/andreas/Documents/src/whisper.cpp/models";
    const model = existsSync(`${modelDir}/ggml-large-v3.bin`)
      ? `${modelDir}/ggml-large-v3.bin`
      : `${modelDir}/ggml-medium.bin`;

    const { stdout } = await execAsync(
      `"${whisperBin}" -m "${model}" -f "${wavPath}" --no-timestamps -l auto`,
      { timeout: 600000 } // 10 min timeout for long audio
    );

    // Extract transcript from whisper output (skip header lines)
    const lines = stdout.split("\n");
    const transcriptLines = lines.filter(
      (line) =>
        !line.startsWith("whisper_") &&
        !line.startsWith("main:") &&
        !line.startsWith("system_info:") &&
        line.trim().length > 0
    );
    const rawTranscript = transcriptLines.join("\n").trim();

    // Extract spoken hints from transcript (Wispr Flow style)
    // This detects patterns like "hashtag project", "at john", "forward slash archive"
    const spokenHints = extractSpokenHints(rawTranscript);
    const hasSpokenHints = spokenHints.tags.length > 0 ||
      spokenHints.people.length > 0 ||
      spokenHints.commands.length > 0;

    // Use cleaned content (with spoken hints removed) as the final transcript
    const content = hasSpokenHints ? spokenHints.cleanedContent : rawTranscript;

    if (hasSpokenHints) {
      console.log(`    Extracted spoken hints: ${spokenHints.tags.length} tags, ${spokenHints.people.length} people, ${spokenHints.commands.length} commands`);
    }

    // Generate title using AI if available, otherwise fallback to filename/defaults
    const config = getConfig();
    let title: string;

    console.log(`    DEBUG: API key set: ${!!config.openaiApiKey}, content length: ${content.length}`);
    if (config.openaiApiKey && content.length > 20) {
      // Use AI to generate a descriptive title from the transcript
      try {
        console.log(`    Generating AI title from ${content.length} chars...`);
        title = await generateAITitle(content, config.openaiApiKey);
        console.log(`    AI title: "${title}"`);
      } catch (e) {
        console.warn(`    AI title generation failed: ${e}`);
        title = getFallbackAudioTitle(message, originalName);
      }
    } else {
      console.log(`    Using fallback title (no API key: ${!config.openaiApiKey}, content < 100: ${content.length < 100})`);
      title = getFallbackAudioTitle(message, originalName);
    }

    return {
      content,
      title,
      ...(hasSpokenHints && { spokenHints }),
    };
  } finally {
    // Cleanup temp files
    await unlink(filePath).catch(() => {});
    await unlink(wavPath).catch(() => {});
  }
}

/**
 * Process document via marker
 */
async function processDocument(
  message: TelegramMessage,
  tempDir: string,
  keepOriginal: boolean = false  // For archive pipeline: keep file for Dropbox sync
): Promise<{ content: string; title: string; originalPath?: string }> {
  const doc = message.document;
  if (!doc) throw new Error("No document in message");

  const filename = doc.file_name || `doc_${message.message_id}`;
  const filePath = await downloadFile(doc.file_id, filename);
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  try {
    let content: string;

    // Route based on file type
    if (ext === "pdf") {
      // PDF: Use marker_single with explicit output directory
      // marker creates a subdirectory named after the file, then puts .md inside
      const outputDir = filePath.replace(/\.pdf$/i, "_marker_output");
      const baseName = filePath.split("/").pop()?.replace(/\.pdf$/i, "") || "output";

      await execAsync(`marker_single "${filePath}" --output_dir "${outputDir}"`, {
        timeout: 300000, // 5 min timeout (first run may download models)
      });

      // Find the .md file in marker's output structure
      const markerOutputDir = `${outputDir}/${baseName}`;
      const mdPath = `${markerOutputDir}/${baseName}.md`;
      content = await Bun.file(mdPath).text();

      // Cleanup marker output directory
      await execAsync(`rm -rf "${outputDir}"`).catch(() => {});
    } else if (ext === "rtf") {
      // RTF: May contain HTML - try multiple extraction strategies
      // First, read raw content to detect HTML
      const rawContent = await Bun.file(filePath).text();
      console.log(`    RTF size: ${rawContent.length} bytes`);
      console.log(`    RTF preview: ${rawContent.slice(0, 200).replace(/\n/g, "\\n")}`);

      // DEBUG: Keep a copy of the RTF for inspection
      const debugPath = filePath.replace(/\.rtf$/i, ".debug.rtf");
      await Bun.write(debugPath, rawContent);
      console.log(`    DEBUG: RTF saved to ${debugPath}`);

      // Check for HTML embedded in RTF (iOS shortcuts often embed HTML in \htmlrtf blocks)
      const hasHtml = rawContent.includes("<html") || rawContent.includes("<body") ||
                      rawContent.includes("<p>") || rawContent.includes("\\htmlrtf");
      console.log(`    Has HTML: ${hasHtml}`);

      if (hasHtml) {
        // RTF contains HTML - extract HTML and convert to markdown
        // Try multiple patterns for extracting HTML from RTF
        let htmlContent: string | null = null;

        // Pattern 1: Full HTML document
        const fullHtmlMatch = rawContent.match(/<html[^>]*>[\s\S]*<\/html>/i);
        if (fullHtmlMatch) {
          htmlContent = fullHtmlMatch[0];
          console.log(`    Found full HTML document (${htmlContent.length} bytes)`);
        }

        // Pattern 2: Body content only
        if (!htmlContent) {
          const bodyMatch = rawContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
          if (bodyMatch) {
            htmlContent = `<html><body>${bodyMatch[1]}</body></html>`;
            console.log(`    Found body content (${htmlContent.length} bytes)`);
          }
        }

        // Pattern 3: Any HTML-like content (paragraphs, divs, etc.)
        if (!htmlContent) {
          const htmlFragments = rawContent.match(/<(?:p|div|span|a|h[1-6]|ul|ol|li)[^>]*>[\s\S]*?<\/(?:p|div|span|a|h[1-6]|ul|ol|li)>/gi);
          if (htmlFragments && htmlFragments.length > 0) {
            htmlContent = `<html><body>${htmlFragments.join("\n")}</body></html>`;
            console.log(`    Found ${htmlFragments.length} HTML fragments`);
          }
        }

        if (htmlContent) {
          // Write temp HTML file and convert with pandoc
          const htmlPath = filePath.replace(/\.rtf$/i, ".html");
          await Bun.write(htmlPath, htmlContent);
          const { stdout } = await execAsync(`pandoc -f html -t markdown "${htmlPath}"`);
          content = stdout.trim();
          console.log(`    Converted HTML to markdown (${content.length} chars)`);
          await unlink(htmlPath).catch(() => {});
        } else {
          // Fallback: use pandoc on RTF directly with HTML reader
          console.log(`    No HTML extracted, trying pandoc -f html`);
          try {
            const { stdout } = await execAsync(`pandoc -f html -t markdown "${filePath}"`);
            content = stdout.trim();
          } catch {
            // Last resort: pandoc on RTF
            const { stdout } = await execAsync(`pandoc -t markdown "${filePath}"`);
            content = stdout.trim();
          }
        }
      } else {
        // Standard RTF - convert to markdown
        console.log(`    Standard RTF, using pandoc -f rtf`);
        const { stdout } = await execAsync(`pandoc -f rtf -t markdown "${filePath}"`);
        content = stdout.trim();
      }
    } else if (ext === "html" || ext === "htm") {
      // HTML: Convert to markdown
      const { stdout } = await execAsync(`pandoc -f html -t markdown "${filePath}"`);
      content = stdout.trim();
    } else if (ext === "docx" || ext === "doc") {
      // Word docs: Use pandoc
      const { stdout } = await execAsync(`pandoc -t markdown "${filePath}"`);
      content = stdout.trim();
    } else if (ext === "txt" || ext === "md") {
      // Plain text or markdown: Read directly
      const rawText = await Bun.file(filePath).text();

      // Check if txt file contains HTML (common from iOS clipboard)
      // Detect both full HTML documents AND HTML fragments with styled tags
      const isHtmlDocument = rawText.includes("<!DOCTYPE html") || rawText.includes("<html") ||
          (rawText.includes("<body") && rawText.includes("</body>"));
      const isHtmlFragment = rawText.includes('style="') &&
          (rawText.includes("<a ") || rawText.includes("<span") || rawText.includes("<div"));

      if (isHtmlDocument || isHtmlFragment) {
        console.log(`    Detected HTML in .${ext} file, converting to markdown`);
        const htmlPath = filePath.replace(/\.(txt|md)$/i, ".html");

        // Wrap fragments in proper HTML document for pandoc
        const htmlContent = isHtmlFragment && !isHtmlDocument
          ? `<!DOCTYPE html><html><body>${rawText}</body></html>`
          : rawText;
        await Bun.write(htmlPath, htmlContent);

        // Use pandoc to convert to markdown (preserves links, adds {style} attrs we strip later)
        const { stdout } = await execAsync(`pandoc -f html -t markdown --wrap=none "${htmlPath}"`);

        // Clean up pandoc output - remove style attributes and fix bracket issues
        let cleanContent = stdout
          .replace(/\{[^}]*style="[^"]*"[^}]*\}/g, '')  // Remove {style="..."} attributes
          .replace(/\{[^}]*\}/g, '')                     // Remove any remaining {...} attributes
          .replace(/\[\[([^\]]+)\]\]/g, '[$1]')          // Fix double brackets [[text]] -> [text]
          .replace(/\[\]\s*/g, '')                       // Remove empty brackets []
          .replace(/\\\n/g, '\n')                        // Remove escaped newlines
          .replace(/\\'/g, "'")                          // Unescape apostrophes
          .replace(/\n{3,}/g, '\n\n')                    // Collapse multiple newlines
          .trim();

        // Remove standalone [text] that aren't part of links (no following ](url))
        cleanContent = cleanContent.replace(/\[([^\]]+)\](?!\()/g, '$1');

        // Clean tracking URLs in markdown links - extract actual destination
        cleanContent = cleanContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
          // Check if it's a tracking URL with encoded destination (e.g., tldrnewsletter, bit.ly wrappers)
          // Pattern: https://tracker.com/.../https:%2F%2Factual-url.com%2Fpath
          const encodedDestMatch = url.match(/https?:%2F%2F[^/]+/);
          if (encodedDestMatch) {
            // Extract everything from the encoded URL start to the end or next path segment
            const startIdx = url.indexOf(encodedDestMatch[0]);
            // Find where the encoded URL ends (at /1/ or similar tracking suffix)
            const remainder = url.slice(startIdx);
            const endMatch = remainder.match(/\/\d+\//);
            const encodedUrl = endMatch ? remainder.slice(0, endMatch.index) : remainder;
            try {
              let cleanUrl = decodeURIComponent(encodedUrl);
              // Remove UTM parameters for cleaner links
              cleanUrl = cleanUrl.replace(/[?&]utm_[^&]*/g, '').replace(/\?$/, '');
              return `[${text}](${cleanUrl})`;
            } catch {
              // If decode fails, keep original
            }
          }
          return match;
        });

        content = cleanContent;
        await unlink(htmlPath).catch(() => {});
      } else {
        content = rawText;
      }
    } else {
      // Unknown format: Try pandoc plain text extraction
      const { stdout } = await execAsync(`pandoc -t plain "${filePath}"`);
      content = stdout.trim();
    }

    const title = doc.file_name?.replace(/\.[^.]+$/, "") || generateTitleFromText(content);

    return {
      content,
      title,
      ...(keepOriginal && { originalPath: filePath }),
    };
  } catch (error) {
    // Fallback to simple text extraction if all else fails
    console.warn(`Document processing failed, trying raw read: ${error}`);
    try {
      const rawContent = await Bun.file(filePath).text();
      // Strip any obvious HTML tags for plain text
      const plainContent = rawContent
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        content: plainContent,
        title: doc.file_name?.replace(/\.[^.]+$/, "") || "Document",
        ...(keepOriginal && { originalPath: filePath }),
      };
    } catch {
      throw error; // Re-throw original error
    }
  } finally {
    // Only delete original if not keeping for archive sync
    if (!keepOriginal) {
      await unlink(filePath).catch(() => {});
    }
  }
}

/**
 * Process URL by fetching content via Jina AI Reader
 *
 * Uses Jina AI (r.jina.ai) for clean markdown extraction.
 * Falls back to basic fetch if Jina fails.
 * YouTube URLs use fabric's yt command for transcript.
 */
async function processUrl(
  message: TelegramMessage
): Promise<{ content: string; title: string }> {
  const config = getConfig();
  const url = extractUrl(message);
  if (!url) throw new Error("No URL in message");

  try {
    // YouTube: Use fabric's yt command for transcript
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const { stdout } = await execAsync(`yt "${url}"`, { timeout: 60000 });
      return {
        content: stdout.trim(),
        title: generateTitleFromText(stdout.trim()),
      };
    }

    // All other URLs: Use Jina AI Reader for clean markdown
    const jinaContent = await fetchWithJina(url, config.jinaApiKey);

    if (jinaContent) {
      // Extract title from Jina's markdown (usually first # heading)
      const titleMatch = jinaContent.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]?.trim() || generateTitleFromText(jinaContent);

      return {
        content: `Source: ${url}\n\n${jinaContent}`,
        title,
      };
    }

    // Fallback: Basic fetch if Jina fails
    console.warn("Jina fetch failed, falling back to basic fetch");
    return await fetchWithBasicMethod(url);

  } catch (error) {
    console.warn(`URL processing error: ${error}`);
    // Return URL as content if all methods fail
    return {
      content: `URL: ${url}\n\n(Content could not be fetched)`,
      title: "Link",
    };
  }
}

/**
 * Fetch URL content using Jina AI Reader
 * Returns clean markdown or null if failed
 */
async function fetchWithJina(url: string, apiKey?: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
    const headers: Record<string, string> = {
      "Accept": "text/markdown",
    };

    // Add API key if available (for higher rate limits)
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetch(jinaUrl, {
      headers,
      signal: AbortSignal.timeout(30000),  // 30 second timeout
    });

    if (!response.ok) {
      console.warn(`Jina returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const content = await response.text();

    // Jina returns an error message if it can't process the URL
    if (content.includes("Failed to fetch") || content.length < 100) {
      return null;
    }

    return content;
  } catch (error) {
    console.warn(`Jina fetch error: ${error}`);
    return null;
  }
}

/**
 * Fallback: Basic fetch with HTML stripping
 */
async function fetchWithBasicMethod(url: string): Promise<{ content: string; title: string }> {
  const response = await fetch(url);
  const html = await response.text();

  // Simple extraction - strip HTML tags
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try to extract title from HTML
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname;

  return {
    content: `Source: ${url}\n\n${text.slice(0, 10000)}`,
    title,
  };
}

/**
 * Process photo via Vision AI or OCR
 *
 * Processing modes (based on caption):
 *   - No caption: Pass-through with basic OCR
 *   - /ocr: Tesseract OCR only
 *   - /store: Just save image link, no processing
 *   - /describe: Vision AI description
 *   - /mermaid: Vision AI → Mermaid diagram
 *   - Other caption: Use caption as Vision AI prompt
 */
async function processPhoto(
  message: TelegramMessage,
  tempDir: string,
  hints?: InlineHints,
  keepForArchive: boolean = false
): Promise<{ content: string; title: string; filePath?: string }> {
  const photo = message.photo;
  if (!photo || photo.length === 0) throw new Error("No photo in message");

  // Get largest photo
  const largest = photo[photo.length - 1];
  const filename = `photo_${message.message_id}.jpg`;
  const filePath = await downloadFile(largest.file_id, filename);
  const config = getConfig();

  // Track if we should return the file path for archive sync
  let returnFilePath = keepForArchive;

  const caption = message.caption || "";
  const commands = hints?.commands || [];

  try {
    // /store - Just save image reference, no processing
    if (commands.includes("store")) {
      const imagePath = await saveImageToVault(filePath, config.vaultPath, message.message_id);
      return {
        content: `![Image](${imagePath})\n\n${caption}`,
        title: "Image",
        ...(returnFilePath && { filePath }),
      };
    }

    // /ocr - Tesseract OCR only
    if (commands.includes("ocr") || (!caption && !config.openaiApiKey)) {
      const ocrResult = await processPhotoWithOCR(filePath, caption);
      return {
        ...ocrResult,
        ...(returnFilePath && { filePath }),
      };
    }

    // Vision AI processing (if API key available)
    if (config.openaiApiKey) {
      // Determine the prompt
      let prompt: string;

      if (commands.includes("describe")) {
        prompt = "Describe this image in detail. What do you see?";
      } else if (commands.includes("mermaid")) {
        prompt = "Extract the diagram, flowchart, or structure from this image and convert it to Mermaid diagram syntax. IMPORTANT: Escape special characters in node labels - use quotes around text containing parentheses, brackets, or special chars (e.g., use A[\"Maximo (EAM)\"] not A[Maximo (EAM)]). Return only the Mermaid code block.";
      } else if (caption && hints?.cleanedContent) {
        // Use cleaned caption (without commands/tags) as the prompt
        prompt = hints.cleanedContent;
      } else if (caption) {
        prompt = caption;
      } else {
        // Default: describe the image
        prompt = "Describe this image briefly. If it contains text, extract it. If it's a diagram, describe its structure.";
      }

      let visionResult = await processPhotoWithVision(filePath, prompt, config.openaiApiKey);

      // Post-process mermaid output to escape parentheses in node labels
      // Apply fix if /mermaid command used OR if output contains mermaid code blocks
      const hasMermaidContent = visionResult.includes("```mermaid");
      if (commands.includes("mermaid") || hasMermaidContent) {
        console.log("    Applying Mermaid syntax fix...");
        const beforeFix = visionResult;
        visionResult = fixMermaidSyntax(visionResult);
        if (beforeFix !== visionResult) {
          console.log("    Mermaid fix applied - escaped parentheses in node labels");
        }
      }

      // Save image to vault for reference
      const imagePath = await saveImageToVault(filePath, config.vaultPath, message.message_id);

      // Generate AI title from vision result
      let title: string;
      try {
        title = await generateAITitle(visionResult, config.openaiApiKey, "image");
        console.log(`    AI title generated: "${title}"`);
      } catch (err) {
        console.warn(`    AI title generation failed: ${err}`);
        title = "Image Analysis";
      }

      return {
        content: `![Image](${imagePath})\n\n**Prompt:** ${prompt}\n\n**Analysis:**\n${visionResult}`,
        title,
        ...(returnFilePath && { filePath }),
      };
    }

    // Fallback to OCR if no API key
    const ocrResult = await processPhotoWithOCR(filePath, caption);
    return {
      ...ocrResult,
      ...(returnFilePath && { filePath }),
    };

  } finally {
    // Only delete file if not keeping for archive
    if (!returnFilePath) {
      await unlink(filePath).catch(() => {});
    }
  }
}

/**
 * Process photo with tesseract OCR
 */
async function processPhotoWithOCR(
  filePath: string,
  caption: string
): Promise<{ content: string; title: string }> {
  try {
    const { stdout } = await execAsync(`tesseract "${filePath}" stdout`, {
      timeout: 30000,
    });

    const content = stdout.trim();
    if (content.length > 50) {
      return {
        content: `[Image with text]\n\n${content}`,
        title: "Screenshot",
      };
    }

    return {
      content: `[Image: ${caption || "No caption"}]`,
      title: "Image",
    };
  } catch {
    return {
      content: `[Image: ${caption || "No caption"}]`,
      title: "Image",
    };
  }
}

/**
 * Process photo with OpenAI Vision API (GPT-4o)
 */
async function processPhotoWithVision(
  filePath: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  // Read image and convert to base64
  const imageData = await Bun.file(filePath).arrayBuffer();
  const base64Image = Buffer.from(imageData).toString("base64");

  // Detect mime type from extension
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.1",  // Vision API for image analysis
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vision API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response from Vision API";
}

/**
 * Save image to vault attachments folder
 */
async function saveImageToVault(
  sourcePath: string,
  vaultPath: string,
  messageId: number
): Promise<string> {
  const attachmentsDir = join(vaultPath, "attachments");

  // Ensure attachments directory exists
  if (!existsSync(attachmentsDir)) {
    await mkdir(attachmentsDir, { recursive: true });
  }

  const ext = sourcePath.split(".").pop() || "jpg";
  const date = new Date().toISOString().split("T")[0];
  const destFilename = `${date}-telegram-${messageId}.${ext}`;
  const destPath = join(attachmentsDir, destFilename);

  // Copy file
  const data = await Bun.file(sourcePath).arrayBuffer();
  await Bun.write(destPath, data);

  // Return relative path for markdown
  return `attachments/${destFilename}`;
}

/**
 * Apply fabric patterns to content
 */
async function applyFabricPatterns(
  content: string,
  patterns: string[]
): Promise<string> {
  let result = content;

  for (const pattern of patterns) {
    const { stdout } = await execAsync(
      `echo "${escapeShell(result)}" | fabric -p ${pattern}`,
      { timeout: 60000 }
    );
    result = stdout.trim();
  }

  return result;
}

/**
 * Generate a title from text content
 */
function generateTitleFromText(text: string): string {
  // Take first line or first 50 chars
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= 60) return firstLine;
  return firstLine.slice(0, 57) + "...";
}

/**
 * Generate a descriptive title using GPT-5-mini
 */
async function generateAITitle(
  content: string,
  apiKey: string,
  contentType: "transcript" | "image" | "document" = "transcript"
): Promise<string> {
  // Use first ~2000 chars to keep costs low
  const sample = content.slice(0, 2000);

  const prompts: Record<string, { system: string; fallback: string }> = {
    transcript: {
      system: "Generate a short, descriptive title (max 60 chars) for this transcript. Focus on the main topic or purpose. Return ONLY the title, no quotes or punctuation at the end.",
      fallback: "Audio Recording",
    },
    image: {
      system: "Generate a short, descriptive title (max 60 chars) for this image analysis. Focus on the main subject or content. Return ONLY the title, no quotes or punctuation at the end.",
      fallback: "Image",
    },
    document: {
      system: "Generate a short, descriptive title (max 60 chars) for this document. Focus on the main topic. Return ONLY the title, no quotes or punctuation at the end.",
      fallback: "Document",
    },
  };

  const { system, fallback } = prompts[contentType];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.1",  // Title generation - needs quality model (5-mini returns empty)
      messages: [
        { role: "system", content: system },
        { role: "user", content: sample },
      ],
      max_completion_tokens: 30,
      // Note: temperature not supported by gpt-5-mini, uses default (1)
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.warn(`Title generation API error: ${response.status} - ${errorBody}`);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const rawTitle = data.choices[0]?.message?.content?.trim();
  console.log(`    Raw title from API: "${rawTitle}"`);
  const title = rawTitle || fallback;

  // Clean up: remove quotes and filesystem-unsafe characters, limit length
  return title
    .replace(/^["']|["']$/g, "")
    .replace(/[<>:"/\\|?*!@#$%^&()[\]{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/**
 * Fallback title for audio when AI is unavailable
 */
function getFallbackAudioTitle(message: TelegramMessage, originalName: string): string {
  if (message.audio?.title) {
    return message.audio.title;
  } else if (originalName && originalName !== "") {
    return originalName.replace(/\.[^.]+$/, "");
  } else if (message.voice) {
    const duration = message.voice.duration || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return mins > 0 ? `Voice Note (${mins}m ${secs}s)` : `Voice Note (${secs}s)`;
  }
  return "Audio Recording";
}

/**
 * Escape string for shell
 */
function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''").replace(/"/g, '\\"');
}

/**
 * Fix Mermaid syntax by escaping parentheses in node labels
 * Converts A[Maximo (EAM)] to A["Maximo (EAM)"]
 * Also handles A(Text (with parens)) -> A["Text (with parens)"]
 */
function fixMermaidSyntax(content: string): string {
  // First, fix square bracket nodes with parentheses in labels
  let result = content.replace(
    /(\s*)(\w+)\[([^\]"]*\([^)]*\)[^\]"]*)\]/g,
    (match, space, nodeId, label) => `${space}${nodeId}["${label}"]`
  );

  // Also fix round bracket nodes that have nested parentheses
  // Pattern: A(Text (inner)) - the outer () is node shape, inner () breaks it
  // Convert to A["Text (inner)"] using square brackets with quotes
  result = result.replace(
    /(\s*)(\w+)\(([^)"]*\([^)]*\)[^)"]*)\)/g,
    (match, space, nodeId, label) => `${space}${nodeId}["${label}"]`
  );

  return result;
}

/**
 * Result of saving to vault (includes Dropbox path for archive pipeline)
 */
export interface SaveResult {
  vaultPath: string;
  dropboxPath?: string;
}

/**
 * Embed a newly created note for semantic search
 * Uses dynamic import to avoid circular dependencies
 */
async function embedNewNote(notePath: string): Promise<void> {
  try {
    const { embedNote } = await import("../../obs/lib/embed");
    await embedNote(notePath, { verbose: false });
  } catch {
    // Embedding is optional - silently fail
  }
}

/**
 * Save processed content to vault
 */
export async function saveToVault(
  processed: ProcessedContent,
  profile: ProcessingProfile,
  isWisdom: boolean = false
): Promise<SaveResult> {
  const config = getConfig();

  // Determine output subfolder based on pipeline
  const isArchivePipeline = processed.pipeline === "archive" || processed.pipeline === "receipt";
  const subfolder = isArchivePipeline ? "archive" : "";

  // Use document date from metadata if provided, otherwise use current date
  const noteDate = processed.sourceMetadata?.date
    ? new Date(processed.sourceMetadata.date + "T00:00:00")
    : new Date();

  if (processed.sourceMetadata?.date) {
    console.log(`  Using document date for filename: ${processed.sourceMetadata.date}`);
  }

  const filename = generateFilename(profile, {
    title: processed.title,
    date: noteDate,
    source: "telegram",
    suffix: isWisdom ? "wisdom" : "raw",
  });

  // Build path with optional subfolder
  const outputDir = subfolder ? join(config.vaultPath, subfolder) : config.vaultPath;
  const filePath = join(outputDir, filename);

  // Ensure subfolder exists
  if (subfolder && !existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // For archive pipeline: sync original file to Dropbox FIRST (so we can include link in markdown)
  let dropboxPath: string | undefined;
  if (isArchivePipeline && processed.originalFilePath && processed.archiveName) {
    const syncResult = await syncToDropbox(processed.originalFilePath, processed.archiveName);
    if (syncResult) {
      dropboxPath = syncResult;
    }
  }

  // Generate frontmatter with source metadata
  const meta = processed.sourceMetadata;
  const receivedDate = processed.messageDate
    ? new Date(processed.messageDate * 1000).toISOString().slice(0, 16).replace("T", " ")
    : undefined;
  const frontmatter = [
    "---",
    `generation_date: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    ...(receivedDate ? [`received_date: ${receivedDate}`] : []),
    "tags:",
    ...processed.tags.map((t) => `  - ${t}`),
    `source: telegram`,
    ...(processed.pipeline ? [`pipeline: ${processed.pipeline}`] : []),
    ...(processed.sourceFile ? [`source_file: "${processed.sourceFile}"`] : []),
    ...(processed.archiveName ? [`archive_name: "${processed.archiveName}"`] : []),
    ...(dropboxPath ? [`archive_path: "${dropboxPath}"`] : []),
    // Source metadata fields (only include if present)
    ...(meta?.source ? [`source_shortcut: ${meta.source}`] : []),
    ...(meta?.device ? [`source_device: ${meta.device}`] : []),
    ...(meta?.user ? [`source_user: ${meta.user}`] : []),
    ...(meta?.type ? [`document_type: ${meta.type}`] : []),
    ...(meta?.category ? [`document_category: ${meta.category}`] : []),
    ...(meta?.date ? [`document_date: ${meta.date}`] : []),
    "---",
  ].join("\n");

  // Build content with Dropbox link for archive pipeline
  let content = isWisdom && processed.processedContent
    ? processed.processedContent
    : processed.rawContent;

  // Add Dropbox link at top of content for archive items
  if (dropboxPath) {
    const dropboxLink = `📎 **Original:** [${processed.archiveName}](file://${dropboxPath.replace(/ /g, "%20")})\n\n`;
    content = dropboxLink + content;
  }

  await Bun.write(filePath, `${frontmatter}\n\n${content}`);

  // Embed the new note for semantic search (fire-and-forget, non-blocking)
  embedNewNote(filePath).catch(() => {
    // Silently ignore embedding errors - search will work when batch rebuild runs
  });

  return { vaultPath: filePath, dropboxPath };
}
