/**
 * Parse Obsidian note frontmatter and content
 */

import { readFile } from "fs/promises";

export interface ParsedNote {
  frontmatter: Record<string, unknown>;
  tags: string[];           // All tags (frontmatter + inline)
  frontmatterTags: string[]; // Only frontmatter tags (for type detection)
  date?: string;
  content: string;
  rawContent: string;
}

/**
 * Parse a note file and extract frontmatter and content
 */
export async function parseNote(filePath: string): Promise<ParsedNote> {
  const rawContent = await readFile(filePath, "utf-8");
  return parseNoteContent(rawContent);
}

/**
 * Parse note content string
 */
export function parseNoteContent(rawContent: string): ParsedNote {
  const result: ParsedNote = {
    frontmatter: {},
    tags: [],
    frontmatterTags: [],
    content: rawContent,
    rawContent,
  };

  // Check for YAML frontmatter
  if (rawContent.startsWith("---")) {
    const endIndex = rawContent.indexOf("---", 3);
    if (endIndex !== -1) {
      const frontmatterStr = rawContent.slice(3, endIndex).trim();
      result.content = rawContent.slice(endIndex + 3).trim();

      // Parse YAML frontmatter manually (simple parser)
      result.frontmatter = parseSimpleYaml(frontmatterStr);

      // Extract tags from frontmatter
      if (result.frontmatter.tags) {
        if (Array.isArray(result.frontmatter.tags)) {
          result.tags = result.frontmatter.tags.map(String);
        } else if (typeof result.frontmatter.tags === "string") {
          // Handle space-separated tags on single line
          result.tags = result.frontmatter.tags.split(/\s+/).filter(Boolean);
        }
      }

      // Extract date from frontmatter
      if (result.frontmatter.generation_date) {
        result.date = String(result.frontmatter.generation_date);
      }

      // Save frontmatter-only tags before merging with inline tags
      result.frontmatterTags = [...result.tags];
    }
  }

  // Also look for inline tags in content (#tag)
  const inlineTags = extractInlineTags(result.content);
  result.tags = [...new Set([...result.tags, ...inlineTags])];

  return result;
}

/**
 * Simple YAML parser for frontmatter
 */
function parseSimpleYaml(yamlStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yamlStr.split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Array item
    if (trimmed.startsWith("- ")) {
      if (currentKey && currentArray) {
        currentArray.push(trimmed.slice(2).trim());
      }
      continue;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex !== -1) {
      // Save previous array if exists
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }

      currentKey = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      if (value) {
        // Inline value
        result[currentKey] = value;
        currentArray = null;
      } else {
        // Might be followed by array
        currentArray = [];
      }
    }
  }

  // Save last array if exists
  if (currentKey && currentArray && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Extract inline tags from content (#tag format)
 */
function extractInlineTags(content: string): string[] {
  // Must start with letter or underscore, not hyphen (excludes markdown anchors like #-updates)
  const tagRegex = /#([a-zA-Z_][a-zA-Z0-9_\-/]*)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    // Exclude common false positives
    const tag = match[1];
    if (
      !tag.match(/^\d+$/) &&                    // pure numbers
      !["", "todo"].includes(tag.toLowerCase()) && // reserved words
      !tag.includes("--") &&                    // likely markdown/CSS
      tag.length < 50                           // sanity check
    ) {
      tags.push(tag);
    }
  }

  return [...new Set(tags)];
}

/**
 * Generate YAML frontmatter string
 */
export function generateFrontmatter(data: Record<string, unknown>): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}
