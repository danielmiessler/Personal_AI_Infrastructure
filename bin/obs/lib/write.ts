/**
 * Write note functionality for obs CLI
 */

import { join } from "path";
import { existsSync } from "fs";
import { getConfig, validateVault } from "./config";
import { generateFrontmatter } from "./parse";

export interface WriteOptions {
  title: string;
  tags: string[];
  content: string;
  date?: Date;
}

/**
 * Write a new note to the vault
 */
export async function writeNote(options: WriteOptions): Promise<string> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  const date = options.date || new Date();
  const dateStr = formatDate(date);
  const timeStr = formatDateTime(date);

  // Generate filename: YYYY-MM-DD-Title.md
  const sanitizedTitle = sanitizeFilename(options.title);
  let filename = `${dateStr}-${sanitizedTitle}.md`;
  let filePath = join(vaultPath, filename);

  // Handle filename collisions
  let counter = 1;
  while (existsSync(filePath)) {
    filename = `${dateStr}-${sanitizedTitle}-${counter}.md`;
    filePath = join(vaultPath, filename);
    counter++;
  }

  // Generate frontmatter
  const frontmatter = generateFrontmatter({
    generation_date: timeStr,
    tags: options.tags.length > 0 ? options.tags : ["incoming"],
  });

  // Combine frontmatter and content
  const noteContent = options.content
    ? `${frontmatter}\n\n${options.content}`
    : `${frontmatter}\n\n# ${options.title}\n\n`;

  // Write file
  await Bun.write(filePath, noteContent);

  return filePath;
}

/**
 * Sanitize a string for use as filename
 */
function sanitizeFilename(title: string): string {
  return title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date as YYYY-MM-DD HH:MM
 */
function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateStr} ${hours}:${minutes}`;
}
