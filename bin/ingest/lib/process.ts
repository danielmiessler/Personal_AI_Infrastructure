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
  sourceFile?: string;       // Original source filename for traceability
  sourceMetadata?: SourceMetadata;  // Device/user/source tracking
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
}

/**
 * Inline hint patterns for share-with-hints workflow
 * Supports iOS Shortcuts / macOS Share menu integration
 */
export interface InlineHints {
  tags: string[];           // #tag or #project/name
  people: string[];         // @firstname_lastname or @name
  commands: string[];       // /summarize, /transcript, /meeting
  metadata: SourceMetadata; // [key:value] pairs for source tracking
  cleanedContent: string;   // Content with hints removed
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
  const tags: string[] = [];
  const people: string[] = [];
  const commands: string[] = [];
  const metadata: SourceMetadata = {};

  // Extract metadata: [key:value] pairs
  // Supports: [source:clipboard-share][device:iphone][user:andreas]
  const metadataPattern = /\[([a-zA-Z_]+):([^\]]+)\]/g;
  let match;
  while ((match = metadataPattern.exec(text)) !== null) {
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
    }
  }

  // Extract hashtags: #tag or #project/name (supports / in tags)
  // Must be at word boundary or start of line
  const tagPattern = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9_/-]*)/gm;
  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1]);
  }

  // Extract mentions: @name or @firstname_lastname
  // Must be at word boundary or start of line
  const mentionPattern = /(?:^|\s)@([a-zA-Z][a-zA-Z0-9_]*)/gm;
  while ((match = mentionPattern.exec(text)) !== null) {
    people.push(match[1]);
  }

  // Extract commands: /command ONLY at start of line or after whitespace
  // NOT in URLs (http://..., https://...)
  const commandPattern = /(?:^|\s)\/([a-zA-Z][a-zA-Z0-9_-]*)(?=\s|$)/gm;
  while ((match = commandPattern.exec(text)) !== null) {
    commands.push(match[1]);
  }

  // Remove hints from content (clean version)
  // Be careful not to corrupt URLs
  let cleaned = text
    .replace(/\[[a-zA-Z_]+:[^\]]+\]/g, " ")  // Remove [key:value] metadata
    .replace(/(?:^|\s)#[a-zA-Z][a-zA-Z0-9_/-]*/gm, " ")
    .replace(/(?:^|\s)@[a-zA-Z][a-zA-Z0-9_]*/gm, " ")
    .replace(/(?:^|\s)\/[a-zA-Z][a-zA-Z0-9_-]*(?=\s|$)/gm, " ")
    .replace(/^\s*\n/gm, "")  // Remove empty lines
    .replace(/\s+/g, " ")     // Normalize whitespace
    .trim();

  return {
    tags,
    people,
    commands,
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
      const photoResult = await processPhoto(message, config.tempDir, hints);
      rawContent = photoResult.content;
      suggestedTitle = photoResult.title;
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

  // Step 3: Apply fabric patterns if configured
  const patterns = profile.processing.patterns[contentType] || [];
  const results: ProcessedContent[] = [];

  // Always create raw note
  // Include source metadata if present
  const hasMetadata = Object.keys(hints.metadata).length > 0;

  results.push({
    title: suggestedTitle,
    rawContent,
    tags,
    source: "telegram",
    contentType,
    ...(hasMetadata && { sourceMetadata: hints.metadata }),
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
 */
async function processAudio(
  message: TelegramMessage,
  tempDir: string
): Promise<{ content: string; title: string }> {
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
    const content = transcriptLines.join("\n").trim();

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

    return { content, title };
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
  hints?: InlineHints
): Promise<{ content: string; title: string }> {
  const photo = message.photo;
  if (!photo || photo.length === 0) throw new Error("No photo in message");

  // Get largest photo
  const largest = photo[photo.length - 1];
  const filename = `photo_${message.message_id}.jpg`;
  const filePath = await downloadFile(largest.file_id, filename);
  const config = getConfig();

  const caption = message.caption || "";
  const commands = hints?.commands || [];

  try {
    // /store - Just save image reference, no processing
    if (commands.includes("store")) {
      const imagePath = await saveImageToVault(filePath, config.vaultPath, message.message_id);
      return {
        content: `![Image](${imagePath})\n\n${caption}`,
        title: "Image",
      };
    }

    // /ocr - Tesseract OCR only
    if (commands.includes("ocr") || (!caption && !config.openaiApiKey)) {
      return await processPhotoWithOCR(filePath, caption);
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
        title = await generateAITitle(visionResult, config.openaiApiKey);
      } catch {
        title = "Image Analysis";
      }

      return {
        content: `![Image](${imagePath})\n\n**Prompt:** ${prompt}\n\n**Analysis:**\n${visionResult}`,
        title,
      };
    }

    // Fallback to OCR if no API key
    return await processPhotoWithOCR(filePath, caption);

  } finally {
    await unlink(filePath).catch(() => {});
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
      model: "gpt-4o",
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
      max_tokens: 2000,
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
 * Generate a descriptive title using GPT-4o-mini
 */
async function generateAITitle(transcript: string, apiKey: string): Promise<string> {
  // Use first ~2000 chars to keep costs low
  const sample = transcript.slice(0, 2000);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate a short, descriptive title (max 60 chars) for this transcript. Focus on the main topic or purpose. Return ONLY the title, no quotes or punctuation at the end.",
        },
        {
          role: "user",
          content: sample,
        },
      ],
      max_tokens: 30,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const title = data.choices[0]?.message?.content?.trim() || "Audio Recording";

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

  // Generate frontmatter with source metadata
  const meta = processed.sourceMetadata;
  const frontmatter = [
    "---",
    `generation_date: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    "tags:",
    ...processed.tags.map((t) => `  - ${t}`),
    `source: telegram`,
    ...(processed.sourceFile ? [`source_file: "${processed.sourceFile}"`] : []),
    // Source metadata fields (only include if present)
    ...(meta?.source ? [`source_shortcut: ${meta.source}`] : []),
    ...(meta?.device ? [`source_device: ${meta.device}`] : []),
    ...(meta?.user ? [`source_user: ${meta.user}`] : []),
    ...(meta?.type ? [`document_type: ${meta.type}`] : []),
    ...(meta?.category ? [`document_category: ${meta.category}`] : []),
    "---",
  ].join("\n");

  const content = isWisdom && processed.processedContent
    ? processed.processedContent
    : processed.rawContent;

  await Bun.write(filePath, `${frontmatter}\n\n${content}`);

  return filePath;
}
