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
 * @param message - The Telegram message to check
 * @param useTestChannel - If true, use test channel ID (for integration testing). Defaults to false.
 */
export function isFromInbox(message: TelegramMessage, useTestChannel = false): boolean {
  const config = getConfig();
  if (!message.chat?.id) return false;
  // Only use test channel ID when explicitly requested (for test isolation)
  const targetChannelId = useTestChannel && config.testTelegramChannelId
    ? config.testTelegramChannelId
    : config.telegramChannelId;
  return String(message.chat.id) === String(targetChannelId);
}

/**
 * Send a text message to the inbox channel (for testing)
 */
export async function sendToInbox(text: string): Promise<TelegramMessage> {
  const config = getConfig();
  // Use sender token (same bot as iOS shortcuts)
  const url = `https://api.telegram.org/bot${config.telegramSenderBotToken}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChannelId,
      text,
    }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Failed to send message: ${data.description}`);
  }

  return data.result;
}

/**
 * Send a photo to the inbox channel (for testing)
 */
export async function sendPhotoToInbox(
  photoPath: string,
  caption?: string
): Promise<TelegramMessage> {
  const config = getConfig();
  // Use sender token (same bot as iOS shortcuts)
  const url = `https://api.telegram.org/bot${config.telegramSenderBotToken}/sendPhoto`;

  const formData = new FormData();
  formData.append("chat_id", config.telegramChannelId);
  formData.append("photo", Bun.file(photoPath));
  if (caption) {
    formData.append("caption", caption);
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Failed to send photo: ${data.description}`);
  }

  return data.result;
}

/**
 * Send a document to the inbox channel
 */
export async function sendDocumentToInbox(
  documentPath: string,
  caption?: string
): Promise<TelegramMessage> {
  const config = getConfig();
  // Use sender token (same bot as iOS shortcuts)
  const url = `https://api.telegram.org/bot${config.telegramSenderBotToken}/sendDocument`;

  const formData = new FormData();
  formData.append("chat_id", config.telegramChannelId);
  formData.append("document", Bun.file(documentPath));
  if (caption) {
    formData.append("caption", caption);
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Failed to send document: ${data.description}`);
  }

  return data.result;
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
 * Download a file from Telegram or copy a local file
 * Supports "local:" prefix for direct file paths (used by `ingest direct` command)
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

  // Handle local files (for direct ingest without Telegram)
  if (fileId.startsWith("local:")) {
    const localPath = fileId.slice(6); // Remove "local:" prefix
    if (!existsSync(localPath)) {
      throw new Error(`Local file not found: ${localPath}`);
    }
    // Copy to temp directory
    const destPath = join(config.tempDir, filename);
    const content = await Bun.file(localPath).arrayBuffer();
    await Bun.write(destPath, content);
    return destPath;
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

  // URLs are NOT auto-detected as "url" type anymore.
  // URLs are stored as-is unless a command like /article or /wisdom triggers fetch.
  // The "url" type is now only set explicitly when a fetch command is detected.
  return "text";
}

/**
 * Extract text content from message
 */
export function extractText(message: TelegramMessage): string {
  return message.text || message.caption || "";
}

/**
 * Commands that trigger URL fetching
 * When these commands are present AND the message contains a URL, upgrade type to "url"
 */
const URL_FETCH_COMMANDS = ["article", "wisdom", "summarize", "fetch"];

/**
 * Check if message should be treated as URL type (fetch the linked content)
 * Returns true if:
 * 1. Message contains a URL
 * 2. Message contains a command that requires URL fetching (/article, /wisdom, /summarize, /fetch)
 */
export function shouldFetchUrl(message: TelegramMessage): boolean {
  const text = extractText(message);

  // Check for URL presence
  const hasUrl = /https?:\/\/[^\s]+/.test(text);
  if (!hasUrl) return false;

  // Check for fetch-triggering commands
  const commandMatch = text.match(/\/([a-z]+)/gi);
  if (!commandMatch) return false;

  const commands = commandMatch.map(cmd => cmd.slice(1).toLowerCase());
  return commands.some(cmd => URL_FETCH_COMMANDS.includes(cmd));
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
  tags?: string[];        // Tags applied to the processed content
}

export async function sendNotification(options: NotificationOptions): Promise<void> {
  const config = getConfig();

  if (!config.telegramOutboxId) {
    // No outbox configured, silently skip
    console.log("  [Notification] Skipped - TELEGRAM_OUTBOX_ID not configured");
    return;
  }
  console.log(`  [Notification] Sending to Events channel (${config.telegramOutboxId})...`);

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
    // Tags applied to content
    ...(options.tags && options.tags.length > 0 && { tags: options.tags }),
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

  // Use reader bot for notifications (it has admin access to both channels)
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
      console.warn(`  [Notification] Failed: ${data.description}`);
    } else {
      console.log("  [Notification] ✅ Sent to Events channel");
    }
  } catch (error) {
    console.warn(`  [Notification] Error: ${error}`);
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
  const trimmed = text.trim();
  return trimmed === "/help" || trimmed.startsWith("/help ");
}

/**
 * Extract help subcommand (e.g., "concepts" from "/help concepts")
 */
export function extractHelpSubcommand(message: TelegramMessage): string | null {
  const text = message.text || message.caption || "";
  const match = text.trim().match(/^\/help\s+(\w+)/i);
  return match ? match[1].toLowerCase() : null;
}

// Help text for /help tags
const HELP_TAGS = `🏷️ <b>Tag Taxonomy</b>

<b>11 DIMENSIONS:</b>

<b>1. PARA Classification</b>
<code>#para/project</code> - Has deadline, finite
<code>#para/area</code> - Ongoing responsibility
<code>#para/resource</code> - Reference material
<code>#para/archive</code> - Cold storage
Shortcuts: <code>#project</code> <code>#area</code> <code>#resource</code> <code>#archive</code>

<b>2. Project/Area Instance</b> (use with PARA tag)
<code>#project/pai</code> <code>#project/website</code>
<code>#lifeos/knowledge</code> <code>#lifeos/health</code>

<b>3. Note Type (Zettelkasten)</b>
<code>#type/fleeting</code> - Raw capture (24-48h)
<code>#type/literature</code> - From external source
<code>#type/permanent</code> - Your atomic ideas
<code>#type/synthesized</code> - Amalgamated

<b>4. Status (Lifecycle)</b>
<code>#status/inbox</code> - Needs processing
<code>#status/cultivated</code> - Fully processed
<code>#status/archived</code> - Cold storage

<b>5. Source</b>
<code>#source/telegram</code> <code>#source/voice</code> <code>#source/web</code> <code>#source/cli</code>

<b>6. Scope</b>
<code>#scope/work</code> <code>#scope/private</code>
Shortcuts: <code>~work</code> <code>~private</code>
<i>Default: Filing (/file, /archive) auto-sets private</i>

<b>7. Topic</b>
<code>#topic/ai</code> <code>#topic/pkm</code> (free-form)

<b>8. Person</b>
<code>#person/john_smith</code>
Shortcut: <code>@john_smith</code>

<b>9. Format</b>
<code>#format/transcript</code> <code>#format/meeting-notes</code>

<b>10. Session</b>
<code>#session/research-2025-12-20</code>

<b>11. Git</b>
<code>#git/track</code> - Include in version control`;

// Help text for /help para
const HELP_PARA = `📁 <b>PARA Method</b>

<i>"Organize by what you can DO with information, not by topic."</i>

<b>TWO TAGS TOGETHER:</b>
1. PARA classification (actionability)
2. Instance tag (which specific one)

<b>P - Projects</b> (deadline, finite scope)
<code>#para/project</code> + <code>#project/pai</code>
Shortcut: <code>#project</code> → <code>#para/project</code>

<b>A - Areas</b> (ongoing responsibility)
<code>#para/area</code> + <code>#lifeos/health</code>
Shortcut: <code>#area</code> → <code>#para/area</code>

<b>R - Resources</b> (reference material)
<code>#para/resource</code> + <code>#topic/ai</code>
Shortcut: <code>#resource</code> → <code>#para/resource</code>

<b>A - Archive</b> (inactive/completed)
<code>#para/archive</code>
Shortcut: <code>#archive</code> → <code>#para/archive</code>

<b>THE QUESTION:</b>
Has deadline? → Project
Ongoing? → Area
Reference? → Resource
Done? → Archive

📖 <i>Building a Second Brain</i> - Tiago Forte`;

// Help text for /help zettelkasten
const HELP_ZETTELKASTEN = `📝 <b>Zettelkasten Method</b>

<i>"Without the CONNECT layer, you have a filing cabinet. With it, you have a thinking partner."</i>

<b>THE TRANSFORMATION STACK:</b>
CAPTURE → STORE → <b>CONNECT</b> → CREATE
                      ↑
              The magic happens here

<b>NOTE TYPES</b> (intellectual maturity):

<code>#type/fleeting</code> - Raw capture
• Quick thoughts, voice memos
• Process within 24-48h or delete

<code>#type/literature</code> - Summarized
• From external sources
• Key insights extracted

<code>#type/permanent</code> - Your ideas
• One atomic idea per note
• Links to other notes

<code>#type/synthesized</code> - Amalgamated
• Multiple ideas combined
• Created during cultivation

<b>THE LIFECYCLE:</b>
<code>#status/inbox</code> → <code>#status/cultivated</code> → <code>#status/archived</code>
   Capture         Connect &amp; refine      Complete

<b>CULTIVATION PRACTICE:</b>
Daily: Triage inbox (5 min)
Weekly: Connect ideas (30 min)
Monthly: Review areas (1 hour)

<b>KEY INSIGHT:</b>
Fleeting notes are <i>temporary</i>. They either evolve into permanent knowledge or get deleted. This forces processing, not hoarding.

📖 <i>How to Take Smart Notes</i> - Sönke Ahrens`;

/**
 * Send help message explaining available commands and syntax
 */
export async function sendHelpResponse(messageId: number, subcommand?: string | null): Promise<void> {
  const config = getConfig();

  // Route to subcommand help if specified
  let helpText: string;

  if (subcommand === "tags") {
    helpText = HELP_TAGS;
  } else if (subcommand === "para") {
    helpText = HELP_PARA;
  } else if (subcommand === "zettelkasten" || subcommand === "zk") {
    helpText = HELP_ZETTELKASTEN;
  } else if (subcommand) {
    // Unknown subcommand
    helpText = `Unknown help topic: <code>${subcommand}</code>

Available: <code>/help tags</code> <code>/help para</code> <code>/help zettelkasten</code>`;
  } else {
    // Default help
    helpText = `🤖 <b>PAI Ingest Bot</b>

<b>📝 TEXT</b> - Just send, auto-saves with AI tags

<b>🎤 VOICE</b> (m4a, mp3, wav, ogg)
Whisper transcription
"hashtag X" "at person" "scope private"

<b>📄 DOCUMENTS</b> (pdf, docx, txt, md)
<code>/attach</code> - Keep original filename (default)
Caption = filename: "Report #tag" → Report.pdf

<b>📷 PHOTOS</b> (jpg, png, heic, webp)
<code>/describe</code> - Vision AI description
<code>/mermaid</code> - Diagram → code
Default: save only (no OCR)

<b>🔗 URLS</b>
<code>/fetch</code> - Raw content (no pattern)
<code>/clean</code> - Strip HTML noise
<code>/article</code> - Clean + extract wisdom

<b>📁 FILING</b> (any content type)
<code>/file</code> - Rename TYPE-DATE-TITLE, sync to Dropbox
<code>/name Title</code> - Set custom note/archive name
<code>/date 2024-06-15</code> - Backdate (NLP: yesterday, last month, 15th June)
<code>[type:CONTRACT]</code> <code>[category:WORK]</code>

<b>🔮 FABRIC PATTERNS</b> (saves raw + pattern output)
<code>/wisdom</code> <code>/summarize</code> <code>/article</code> <code>/meeting-notes</code>
Any fabric pattern: <code>/[pattern-name]</code>

<b>🏷️ TAGS</b>
PARA: <code>#project</code> <code>#area</code> <code>#resource</code> <code>#archive</code>
Scope: <code>~private</code> <code>~work</code> Type: <code>#type/fleeting</code>
People: <code>@name</code> → <code>#person/name</code>

<b>📊 STATUS</b> (note lifecycle)
<code>#status/inbox</code> → <code>#status/cultivated</code> → <code>#status/archived</code>

<code>/help tags</code> <code>/help para</code> <code>/help zettelkasten</code>

<b>📦 LARGE FILES (&gt;20MB)</b>
<code>[file:name.pdf]</code> + iCloud Drop Buffer

<b>⚙️</b> <code>/query</code> <code>/help</code> <code>/tag</code>`;
  }

  // Send reply to inbox channel (where user sent the message)
  const targetChannel = config.telegramChannelId;
  if (!targetChannel) {
    console.warn("No channel configured for help response");
    return;
  }

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChannel,
        text: helpText,
        reply_to_message_id: messageId,
        parse_mode: "HTML",
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

/**
 * Send error response replying to the failed message in inbox
 */
export async function sendErrorResponse(messageId: number, error: Error | string): Promise<void> {
  const config = getConfig();

  const targetChannel = config.telegramChannelId;
  if (!targetChannel) {
    console.warn("No channel configured for error response");
    return;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorText = `❌ <b>Processing Error</b>

<code>${escapeHtml(errorMessage)}</code>

Message was not ingested. Check logs for details.`;

  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChannel,
        text: errorText,
        reply_to_message_id: messageId,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.warn(`Could not send error response: ${data.description}`);
    }
  } catch (err) {
    console.warn(`Error response failed: ${err}`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
