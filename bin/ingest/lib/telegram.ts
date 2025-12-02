/**
 * Telegram Bot API client for message ingestion
 */

import { getConfig } from "./config";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

export interface TelegramMessage {
  message_id: number;
  date: number;
  chat?: { id: number };  // Chat/channel ID
  from?: { id: number };  // Sender ID
  text?: string;
  voice?: TelegramVoice;
  audio?: TelegramAudio;
  document?: TelegramDocument;
  photo?: TelegramPhoto[];
  caption?: string;
}

interface TelegramVoice {
  file_id: string;
  duration: number;
  mime_type?: string;
}

interface TelegramAudio {
  file_id: string;
  duration: number;
  title?: string;
  performer?: string;
  file_name?: string;
  mime_type?: string;
}

interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
}

interface TelegramPhoto {
  file_id: string;
  width: number;
  height: number;
}

interface TelegramUpdate {
  update_id: number;
  channel_post?: TelegramMessage;
  message?: TelegramMessage;
}

interface TelegramFile {
  file_id: string;
  file_path: string;
}

/**
 * Get updates from Telegram Bot API
 */
export async function getUpdates(offset?: number): Promise<TelegramUpdate[]> {
  const config = getConfig();
  const url = new URL(`https://api.telegram.org/bot${config.telegramBotToken}/getUpdates`);

  if (offset) {
    url.searchParams.set("offset", offset.toString());
  }
  url.searchParams.set("timeout", "30");

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }

  return data.result;
}

/**
 * Check if a message is from the inbox channel
 */
export function isFromInbox(message: TelegramMessage): boolean {
  const config = getConfig();
  if (!message.chat?.id) return false;
  return String(message.chat.id) === String(config.telegramChannelId);
}

/**
 * Get file info from Telegram
 */
async function getFile(fileId: string): Promise<TelegramFile> {
  const config = getConfig();
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/getFile?file_id=${fileId}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Failed to get file info: ${data.description}`);
  }

  return data.result;
}

/**
 * Download a file from Telegram
 */
export async function downloadFile(
  fileId: string,
  filename: string
): Promise<string> {
  const config = getConfig();

  // Ensure temp directory exists
  if (!existsSync(config.tempDir)) {
    await mkdir(config.tempDir, { recursive: true });
  }

  // Get file path from Telegram
  const file = await getFile(fileId);
  const downloadUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;

  // Download file
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const filePath = join(config.tempDir, filename);

  await Bun.write(filePath, buffer);

  return filePath;
}

/**
 * Add reaction to a message
 */
export async function setReaction(
  messageId: number,
  emoji: string
): Promise<void> {
  const config = getConfig();

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/setMessageReaction`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChannelId,
      message_id: messageId,
      reaction: [{ type: "emoji", emoji }],
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    // Reactions might not be supported in all chats, don't throw
    console.warn(`Could not set reaction: ${data.description}`);
  }
}

/**
 * Classify content type from a Telegram message
 */
export type ContentType = "voice" | "audio" | "document" | "photo" | "url" | "text";

export function classifyContent(message: TelegramMessage): ContentType {
  if (message.voice) return "voice";
  if (message.audio) return "audio";
  if (message.document) return "document";
  if (message.photo && message.photo.length > 0) return "photo";

  const text = message.text || message.caption || "";

  // Check for URLs
  const urlPattern = /https?:\/\/[^\s]+/;
  if (urlPattern.test(text)) return "url";

  return "text";
}

/**
 * Extract text content from message
 */
export function extractText(message: TelegramMessage): string {
  return message.text || message.caption || "";
}

/**
 * Extract URL from message text
 */
export function extractUrl(message: TelegramMessage): string | null {
  const text = extractText(message);
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Send a notification to the PAI Outbox Channel
 *
 * Used to notify about completed processing, with optional Obsidian deep link.
 * Supports Markdown formatting for Telegram.
 */
/**
 * Notification severity levels with visual indicators
 */
export type NotificationSeverity = "info" | "success" | "warning" | "error";

/**
 * Severity icons for visual indication in Events channel
 */
const SEVERITY_ICONS: Record<NotificationSeverity, string> = {
  info: "ℹ️",      // Informational
  success: "✅",   // Successful completion
  warning: "⚠️",   // Warning/partial success
  error: "❌",     // Error/failure
};

export interface NotificationOptions {
  messageId: number;
  status: "success" | "failed";
  severity?: NotificationSeverity;  // Override default severity
  contentType: ContentType;
  title: string;
  originalFilename?: string;  // Original source filename
  outputPaths?: string[];     // Full paths to output files
  dropboxPath?: string;       // Dropbox sync path (for archive pipeline)
  pipeline?: string;          // Which pipeline processed this
  error?: string;
  obsidianVaultName?: string;  // Vault name for Obsidian URI
  // Source metadata from iOS/macOS shortcuts
  sourceMetadata?: {
    source?: string;      // shortcut name (clipboard-share, voice-memo)
    device?: string;      // iphone, ipad, mac
    user?: string;        // user identifier
    type?: string;        // document type (CONTRACT, RECEIPT)
    category?: string;    // category (HOME, WORK)
  };
}

export async function sendNotification(options: NotificationOptions): Promise<void> {
  const config = getConfig();

  if (!config.telegramOutboxId) {
    // No outbox configured, silently skip
    return;
  }

  // Determine severity: use explicit override, or derive from status
  // Successful processing = info (routine), failed = error (needs attention)
  const severity: NotificationSeverity = options.severity ||
    (options.status === "failed" ? "error" : "info");
  const emoji = SEVERITY_ICONS[severity];
  const statusText = options.status === "success" ? "Processed" : "Failed";

  // Build structured event payload for downstream routing (PagerDuty, etc.)
  const eventPayload = {
    event_type: "pai.ingest",
    status: options.status,
    severity,
    content_type: options.contentType,
    pipeline: options.pipeline || "default",
    title: options.title,
    message_id: options.messageId,
    timestamp: new Date().toISOString(),
    source: "pai-ingest",
    ...(options.originalFilename && { original_filename: options.originalFilename }),
    ...(options.outputPaths && {
      output_files: options.outputPaths.map(p => p.split("/").pop()),
      output_paths: options.outputPaths,
    }),
    ...(options.dropboxPath && { dropbox_path: options.dropboxPath }),
    ...(options.error && { error: options.error.slice(0, 500) }),
    // Source metadata from iOS/macOS shortcuts
    ...(options.sourceMetadata && Object.keys(options.sourceMetadata).length > 0 && {
      source_metadata: {
        ...(options.sourceMetadata.source && { shortcut: options.sourceMetadata.source }),
        ...(options.sourceMetadata.device && { device: options.sourceMetadata.device }),
        ...(options.sourceMetadata.user && { user: options.sourceMetadata.user }),
        ...(options.sourceMetadata.type && { document_type: options.sourceMetadata.type }),
        ...(options.sourceMetadata.category && { document_category: options.sourceMetadata.category }),
      },
    }),
  };

  // Build human-readable message parts
  const pipelineLabel = options.pipeline ? ` (${options.pipeline})` : "";
  const parts: string[] = [
    `${emoji} *${statusText}*: ${options.contentType}${pipelineLabel}`,
    `📝 ${escapeMarkdown(options.title)}`,
  ];

  if (options.status === "success" && options.outputPaths && options.outputPaths.length > 0) {
    // Just show filenames without paths - cleaner display
    const filenames = options.outputPaths
      .map(p => p.split("/").pop()?.replace(/\.md$/, ""))  // Remove .md extension for notes
      .filter(Boolean)
      .map(f => escapeMarkdown(f || ""))
      .join(", ");
    parts.push(`📂 ${filenames}`);
  }

  // Show Dropbox sync for archive pipeline
  if (options.dropboxPath) {
    const dropboxFilename = options.dropboxPath.split("/").pop() || "synced";
    parts.push(`☁️ Dropbox: ${dropboxFilename}`);
  }

  if (options.status === "failed" && options.error) {
    parts.push(`⚠️ ${escapeMarkdown(options.error.slice(0, 200))}`);
  }

  parts.push(`🔗 Message ID: ${options.messageId}`);
  parts.push("");
  parts.push("```json");
  parts.push(JSON.stringify(eventPayload, null, 2));
  parts.push("```");

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramOutboxId,
        text: parts.join("\n"),
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`Could not send notification: ${data.description}`);
    }
  } catch (error) {
    console.warn(`Notification error: ${error}`);
  }
}

/**
 * Escape special characters for Telegram Markdown
 */
function escapeMarkdown(text: string): string {
  // Escape markdown special chars and & to prevent HTML entity parsing issues
  return text.replace(/[_*[\]()~`>#+\-=|{}.!&]/g, "\\$&");
}

/**
 * Reply to a message with an Obsidian link to the created note
 */
export async function replyWithObsidianLink(
  messageId: number,
  outputPaths: string[],
  vaultName?: string
): Promise<void> {
  const config = getConfig();

  if (!vaultName || outputPaths.length === 0) {
    return;
  }

  // Build plain text with filenames only
  const filenames = outputPaths.map(path => {
    const filename = path.split("/").pop()?.replace(/\.md$/, "") || path;
    return `📄 ${filename}`;
  });

  const text = `✅ Processed:\n${filenames.join("\n")}`;

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChannelId,
        text: text,
        reply_to_message_id: messageId,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`Could not reply to message: ${data.description}`);
    }
  } catch (error) {
    console.warn(`Reply error: ${error}`);
  }
}

/**
 * Check if message is a query command
 */
export function isQueryCommand(message: TelegramMessage): boolean {
  const text = message.text || message.caption || "";
  return text.trim().startsWith("/query ");
}

/**
 * Extract query text from a /query command
 */
export function extractQueryText(message: TelegramMessage): string {
  const text = message.text || message.caption || "";
  return text.replace(/^\/query\s+/, "").trim();
}

/**
 * Query result for Telegram response
 */
export interface TelegramQueryResult {
  title: string;
  source: string;
  preview?: string;
  relevance?: number;
}

/**
 * Send query results as a reply to a Telegram message
 */
export async function sendQueryResponse(
  messageId: number,
  query: string,
  results: TelegramQueryResult[]
): Promise<void> {
  const config = getConfig();

  if (!config.telegramChannelId) {
    return;
  }

  let text: string;

  if (results.length === 0) {
    text = `🔍 No results found for: "${query}"`;
  } else {
    const lines: string[] = [
      `🔍 Results for: "${query}"`,
      "",
    ];

    // Group by source
    const bySource = new Map<string, TelegramQueryResult[]>();
    for (const r of results) {
      const existing = bySource.get(r.source) || [];
      existing.push(r);
      bySource.set(r.source, existing);
    }

    const sourceIcons: Record<string, string> = {
      "semantic": "🧠",
      "tag": "🏷️",
      "dropbox": "☁️",
      "vault-archive": "📂",
    };

    for (const [source, sourceResults] of bySource) {
      const icon = sourceIcons[source] || "📄";
      lines.push(`${icon} *${source.toUpperCase()}*`);

      for (const r of sourceResults.slice(0, 5)) {
        const relevance = r.relevance ? ` (${Math.round(r.relevance * 100)}%)` : "";
        lines.push(`  • ${r.title}${relevance}`);
      }

      if (sourceResults.length > 5) {
        lines.push(`  ... and ${sourceResults.length - 5} more`);
      }
      lines.push("");
    }

    text = lines.join("\n");
  }

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChannelId,
        text,
        reply_to_message_id: messageId,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`Could not send query response: ${data.description}`);
    }
  } catch (error) {
    console.warn(`Query response error: ${error}`);
  }
}

/**
 * Check if message is a help command
 */
export function isHelpCommand(message: TelegramMessage): boolean {
  const text = message.text || message.caption || "";
  return text.trim() === "/help" || text.trim().startsWith("/help ");
}

/**
 * Send help message explaining available commands and syntax
 */
export async function sendHelpResponse(messageId: number): Promise<void> {
  const config = getConfig();

  const helpText = `🤖 *PAI Ingest Bot - Help*

*Pipeline Commands:*
\`/note\` - Save as a note (default)
\`/clip\` - Save article/link for later
\`/archive\` - Archive document with naming
\`/receipt\` - Archive as receipt
\`/query <text>\` - Search your vault
\`/help\` - Show this help

*Fabric Pattern Commands:*
\`/summarize\` - Run summarize pattern
\`/wisdom\` - Run extract\\_wisdom pattern
\`/article\` - Run extract\\_article\\_wisdom
\`/meeting-notes\` - Run meeting\\_notes pattern

_Note: Use #1on1 as a TAG, not /1on1 command_

*Tags & Mentions:*
\`#project/name\` - Add project tag
\`#meeting-notes\` - Add any tag
\`@person\` or \`@First Last\` - Tag a person

*Metadata (for shortcuts):*
\`[source:shortcut-name]\` - Track source
\`[device:iphone]\` - Track device
\`[user:name]\` - Track user
\`[type:CONTRACT]\` - Document type
\`[category:WORK]\` - Category (HOME/WORK)

*Scope (context separation):*
\`~private\` - Mark as personal/private
\`~work\` - Mark as professional (default)
_Say "scope private" or "this is personal"_
_Archive/receipt → auto ~private_
_All other pipelines → auto ~work_
_Only ~work notes in default context queries_

*Photo Commands:*
\`/describe\` - Vision AI description
\`/mermaid\` - Convert to diagram
\`/ocr\` - Text extraction only
\`/store\` - Save without processing
_Or use any caption as Vision AI prompt_
_e.g., "Extract text" or "What is this?"_

*Document Commands (PDF/DOCX):*
_Documents are extracted to markdown by default_
_Add caption for processing intent:_
• "summarize" or "tldr" → summarize
• "key points" or "extract wisdom" → extract\\_wisdom
• "analyze" or "break down" → analyze\\_paper

*Dictated Intent (voice captions):*
_Say your intent naturally and it will be detected:_
• "archive this", "file this", "save this contract"
• "save this receipt", "expense report", "invoice"
_Auto-detects type from caption + Vision AI content:_
_INVOICE, RECEIPT, BILL, CONTRACT, LEASE, CERTIFICATE_
_Auto-detects category (HOME, WORK, CAR, HEALTH)_

*Spoken Hints (voice memos):*
Say "hashtag project name" → #project-name
Say "at person name" → @person\\_name
Say "forward slash summarize" → /summarize

*Examples:*
• \`/wisdom #project/pai Voice memo to extract insights\`
• \`/summarize This long article needs condensing\`
• \`/archive [type:CONTRACT] Lease agreement\`
• \`/query What did I discuss with Ed?\`
• "Archive this lease for the house" → archive + LEASE + HOME
• "Save this receipt from Amazon" → receipt pipeline`;

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChannelId,
        text: helpText,
        reply_to_message_id: messageId,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`Could not send help response: ${data.description}`);
    }
  } catch (error) {
    console.warn(`Help response error: ${error}`);
  }
}
