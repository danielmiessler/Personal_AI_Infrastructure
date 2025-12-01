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

const execAsync = promisify(exec);

export interface ProcessedContent {
  title: string;
  rawContent: string;
  processedContent?: string;
  tags: string[];
  source: "telegram";
  contentType: ContentType;
}

/**
 * Process a Telegram message through the pipeline
 */
export async function processMessage(
  message: TelegramMessage,
  contentType: ContentType,
  profile: ProcessingProfile
): Promise<ProcessedContent[]> {
  const config = getConfig();

  // Ensure temp directory exists
  if (!existsSync(config.tempDir)) {
    await mkdir(config.tempDir, { recursive: true });
  }

  // Step 1: Extract raw content based on type
  let rawContent: string;
  let suggestedTitle: string;

  switch (contentType) {
    case "voice":
    case "audio":
      const audioResult = await processAudio(message, config.tempDir);
      rawContent = audioResult.content;
      suggestedTitle = audioResult.title;
      break;

    case "document":
      const docResult = await processDocument(message, config.tempDir);
      rawContent = docResult.content;
      suggestedTitle = docResult.title;
      break;

    case "url":
      const urlResult = await processUrl(message);
      rawContent = urlResult.content;
      suggestedTitle = urlResult.title;
      break;

    case "photo":
      const photoResult = await processPhoto(message, config.tempDir);
      rawContent = photoResult.content;
      suggestedTitle = photoResult.title;
      break;

    case "text":
    default:
      rawContent = extractText(message);
      suggestedTitle = generateTitleFromText(rawContent);
      break;
  }

  // Step 2: Generate tags
  const tags = generateTags(profile, {
    contentType,
    source: "telegram",
    isRaw: true,
    isWisdom: false,
  });

  // Step 3: Apply fabric patterns if configured
  const patterns = profile.processing.patterns[contentType] || [];
  const results: ProcessedContent[] = [];

  // Always create raw note
  results.push({
    title: suggestedTitle,
    rawContent,
    tags,
    source: "telegram",
    contentType,
  });

  // If paired output, also create processed version
  if (profile.processing.pairedOutput && patterns.length > 0) {
    try {
      const processedContent = await applyFabricPatterns(rawContent, patterns);
      const wisdomTags = generateTags(profile, {
        contentType,
        source: "telegram",
        isRaw: false,
        isWisdom: true,
      });

      results.push({
        title: suggestedTitle,
        rawContent,
        processedContent,
        tags: wisdomTags,
        source: "telegram",
        contentType,
      });
    } catch (error) {
      console.warn(`Warning: Fabric processing failed: ${error}`);
    }
  }

  return results;
}

/**
 * Process voice/audio message via ts (transcription)
 */
async function processAudio(
  message: TelegramMessage,
  tempDir: string
): Promise<{ content: string; title: string }> {
  const fileId = message.voice?.file_id || message.audio?.file_id;
  if (!fileId) throw new Error("No audio file in message");

  const filename = `audio_${message.message_id}.ogg`;
  const filePath = await downloadFile(fileId, filename);

  try {
    // Call ts for transcription
    const { stdout } = await execAsync(`ts "${filePath}"`, {
      timeout: 300000, // 5 min timeout for long audio
    });

    const content = stdout.trim();
    const title = generateTitleFromText(content);

    return { content, title };
  } finally {
    // Cleanup temp file
    await unlink(filePath).catch(() => {});
  }
}

/**
 * Process document via marker
 */
async function processDocument(
  message: TelegramMessage,
  tempDir: string
): Promise<{ content: string; title: string }> {
  const doc = message.document;
  if (!doc) throw new Error("No document in message");

  const filename = doc.file_name || `doc_${message.message_id}`;
  const filePath = await downloadFile(doc.file_id, filename);
  const outputPath = join(tempDir, `${basename(filename, ".*")}.md`);

  try {
    // Call marker for document extraction
    await execAsync(`marker_single "${filePath}" "${outputPath}"`, {
      timeout: 120000, // 2 min timeout
    });

    const content = await Bun.file(outputPath).text();
    const title = doc.file_name?.replace(/\.[^.]+$/, "") || generateTitleFromText(content);

    return { content, title };
  } catch (error) {
    // Fallback to simple text extraction if marker fails
    console.warn(`Marker failed, trying pandoc: ${error}`);
    const { stdout } = await execAsync(`pandoc -t plain "${filePath}"`);
    return {
      content: stdout.trim(),
      title: doc.file_name?.replace(/\.[^.]+$/, "") || "Document",
    };
  } finally {
    await unlink(filePath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Process URL by fetching content
 */
async function processUrl(
  message: TelegramMessage
): Promise<{ content: string; title: string }> {
  const url = extractUrl(message);
  if (!url) throw new Error("No URL in message");

  try {
    // Try using fabric's yt command for YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const { stdout } = await execAsync(`yt "${url}"`, { timeout: 60000 });
      return {
        content: stdout.trim(),
        title: generateTitleFromText(stdout.trim()),
      };
    }

    // For other URLs, use curl + readability or just fetch
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
  } catch (error) {
    // Return URL as content if fetch fails
    return {
      content: `URL: ${url}\n\n(Content could not be fetched)`,
      title: "Link",
    };
  }
}

/**
 * Process photo via OCR/description
 */
async function processPhoto(
  message: TelegramMessage,
  tempDir: string
): Promise<{ content: string; title: string }> {
  const photo = message.photo;
  if (!photo || photo.length === 0) throw new Error("No photo in message");

  // Get largest photo
  const largest = photo[photo.length - 1];
  const filename = `photo_${message.message_id}.jpg`;
  const filePath = await downloadFile(largest.file_id, filename);

  try {
    // Try tesseract for OCR
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

    // If no text found, just note it's an image
    return {
      content: `[Image: ${message.caption || "No caption"}]`,
      title: "Image",
    };
  } catch {
    return {
      content: `[Image: ${message.caption || "No caption"}]`,
      title: "Image",
    };
  } finally {
    await unlink(filePath).catch(() => {});
  }
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
 * Escape string for shell
 */
function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''").replace(/"/g, '\\"');
}

/**
 * Save processed content to vault
 */
export async function saveToVault(
  processed: ProcessedContent,
  profile: ProcessingProfile,
  isWisdom: boolean = false
): Promise<string> {
  const config = getConfig();

  const filename = generateFilename(profile, {
    title: processed.title,
    date: new Date(),
    source: "telegram",
    suffix: isWisdom ? "wisdom" : "raw",
  });

  const filePath = join(config.vaultPath, filename);

  // Generate frontmatter
  const frontmatter = [
    "---",
    `generation_date: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    "tags:",
    ...processed.tags.map((t) => `  - ${t}`),
    `source: telegram`,
    "---",
  ].join("\n");

  const content = isWisdom && processed.processedContent
    ? processed.processedContent
    : processed.rawContent;

  await Bun.write(filePath, `${frontmatter}\n\n${content}`);

  return filePath;
}
