/**
 * Vision Analysis for Jira Attachments
 *
 * Uses OpenAI Vision API to analyze image attachments in tickets.
 * Checks OPENAI_API_KEY from environment or ~/.claude/.env fallback.
 */

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { Attachment } from "./api";
import type { JiraClient } from "./api";

export interface VisionAnalysis {
  filename: string;
  mimeType: string;
  analysis: string;
  error?: string;
}

export interface VisionConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

/**
 * Load API key from ~/.claude/.env if not in environment
 */
function loadApiKeyFromDotEnv(): string | null {
  const envPath = join(homedir(), ".claude", ".env");
  if (!existsSync(envPath)) return null;

  try {
    const content = readFileSync(envPath, "utf-8");
    const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

/**
 * Get OpenAI API key from environment or ~/.claude/.env
 */
function getApiKey(): string | null {
  return process.env.OPENAI_API_KEY || loadApiKeyFromDotEnv();
}

/**
 * Check if vision analysis is available
 */
export function isVisionAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Get OpenAI API key from environment or fallback
 */
export function getVisionConfig(): VisionConfig | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  return {
    apiKey,
    model: process.env.OPENAI_VISION_MODEL || "gpt-5.2",
    maxTokens: parseInt(process.env.OPENAI_VISION_MAX_TOKENS || "300", 10),
  };
}

/**
 * Analyze a single image using OpenAI Vision API
 */
async function analyzeImage(
  imageBuffer: Buffer,
  mimeType: string,
  filename: string,
  config: VisionConfig
): Promise<string> {
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_completion_tokens: config.maxTokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Describe this image from a Jira ticket attachment (${filename}). Focus on: what it shows, any error messages, UI elements, or technical details visible. Be concise (1-2 sentences).`,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "low", // Use low detail for faster/cheaper analysis
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const result = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  return result.choices[0]?.message?.content || "Unable to analyze image";
}

/**
 * Analyze all image attachments for an issue
 */
export async function analyzeAttachments(
  client: JiraClient,
  issueKey: string,
  config: VisionConfig
): Promise<VisionAnalysis[]> {
  const attachments = await client.getImageAttachments(issueKey);

  if (attachments.length === 0) {
    return [];
  }

  const results: VisionAnalysis[] = [];

  // Process attachments (limit to first 5 to manage costs)
  const toProcess = attachments.slice(0, 5);

  for (const attachment of toProcess) {
    try {
      // Download the image
      const imageBuffer = await client.downloadAttachment(attachment.content);

      // Analyze with vision
      const analysis = await analyzeImage(
        imageBuffer,
        attachment.mimeType,
        attachment.filename,
        config
      );

      results.push({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        analysis,
      });
    } catch (error) {
      results.push({
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        analysis: "",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (attachments.length > 5) {
    results.push({
      filename: `... and ${attachments.length - 5} more images`,
      mimeType: "",
      analysis: "(skipped to limit API costs)",
    });
  }

  return results;
}

/**
 * Format vision analysis for display
 */
export function formatVisionAnalysis(analyses: VisionAnalysis[]): string {
  if (analyses.length === 0) {
    return "No image attachments found.";
  }

  const lines: string[] = [
    `Image Attachments (${analyses.length}):`,
    "─".repeat(40),
  ];

  for (const analysis of analyses) {
    if (analysis.error) {
      lines.push(`  ${analysis.filename} - Error: ${analysis.error}`);
    } else {
      lines.push(`  ${analysis.filename}`);
      lines.push(`    → ${analysis.analysis}`);
    }
  }

  return lines.join("\n");
}
