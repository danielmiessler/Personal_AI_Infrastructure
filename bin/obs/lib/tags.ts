/**
 * Tag functionality for obs CLI
 * - List all tags in vault
 * - Add/remove tags from notes
 * - Suggest tags based on content
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { getConfig, validateVault } from "./config";
import { parseNote, parseNoteContent, generateFrontmatter } from "./parse";
import { loadSearchIndex } from "./index";

/**
 * List all tags in the vault with optional counts
 */
export async function listTags(showCounts: boolean = false): Promise<Record<string, number>> {
  validateVault();
  const config = getConfig();
  const vaultPath = config.vaultPath;

  const tagCounts: Record<string, number> = {};

  async function walkDir(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories and _meta
      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const note = await parseNote(fullPath);
          for (const tag of note.tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        } catch (error) {
          // Skip files that can't be parsed
        }
      }
    }
  }

  await walkDir(vaultPath);

  return tagCounts;
}

/**
 * Get tag suggestions for a note based on content
 */
export async function suggestTags(content: string): Promise<string[]> {
  const suggestions: string[] = [];

  // Detect people names (simple pattern matching)
  // TODO: Make this configurable via ~/.config/pai/people.json
  // Example format: { "patterns": [{ "pattern": "John Smith", "tag": "john_smith" }] }
  //
  // These are example entries - customize for your contacts:
  const peoplePatterns = [
    /\b(John|Jon)\s+Smith\b/i,
    /\b(Jane)\s+Doe\b/i,
    /\b(Bob|Robert)\s+Johnson\b/i,
    /\b(Alice)\s+Williams\b/i,
    /\b(Mike|Michael)\s+Brown\b/i,
  ];

  const peopleTagMap: Record<string, string> = {
    john: "john_smith",
    jon: "john_smith",
    jane: "jane_doe",
    bob: "bob_johnson",
    robert: "bob_johnson",
    alice: "alice_williams",
    mike: "mike_brown",
    michael: "mike_brown",
  };

  for (const pattern of peoplePatterns) {
    if (pattern.test(content)) {
      const match = content.match(pattern);
      if (match) {
        const firstName = match[1].toLowerCase();
        const tag = peopleTagMap[firstName];
        if (tag && !suggestions.includes(tag)) {
          suggestions.push(tag);
        }
      }
    }
  }

  // Detect project keywords
  const projectPatterns: [RegExp, string][] = [
    [/\bEEA\b.*?(2024|24)/i, "project/eea24"],
    [/\bplanning\b.*?scheduling/i, "project/planning-scheduling"],
    [/\btech\s+trends\b.*?(2024|24)/i, "project/tech_trends_2024"],
    [/\bnear.?real.?time.*?data/i, "project/near-realtime-data-platform"],
    [/\bedtech\b/i, "project/edtech"],
  ];

  for (const [pattern, tag] of projectPatterns) {
    if (pattern.test(content) && !suggestions.includes(tag)) {
      suggestions.push(tag);
    }
  }

  // Detect content types
  if (/meeting|attendees|agenda|action items/i.test(content)) {
    suggestions.push("meeting-notes");
  }
  if (/1\s*on\s*1|one.on.one/i.test(content)) {
    suggestions.push("1on1");
  }
  if (/phone\s*call|called|speaking with/i.test(content)) {
    suggestions.push("phone-call");
  }
  if (/book|author|reading|isbn/i.test(content)) {
    suggestions.push("bibliography");
  }

  // Detect topics
  const topicPatterns: [RegExp, string][] = [
    [/\bAI\b|artificial intelligence|machine learning|LLM|GPT/i, "ai"],
    [/\bgenerative AI\b|genAI|gen AI/i, "genai"],
    [/\bnetwork\b|infrastructure|grid/i, "network"],
    [/\bLV\b|low voltage/i, "lv-data"],
    [/\bboard\b|governance/i, "board"],
    [/\bcontract/i, "contracting"],
  ];

  for (const [pattern, tag] of topicPatterns) {
    if (pattern.test(content) && !suggestions.includes(tag)) {
      suggestions.push(tag);
    }
  }

  return suggestions;
}

/**
 * Resolve note selector to file path
 * Accepts:
 *   - Index from last search (e.g., "3")
 *   - Note name (e.g., "2025-12-08-Context-Management")
 *   - Full path
 */
export async function resolveNotePath(selector: string): Promise<string> {
  validateVault();
  const config = getConfig();

  // Check if it's a numeric index from last search
  const indexNum = parseInt(selector, 10);
  if (!isNaN(indexNum) && indexNum > 0) {
    const searchIndex = await loadSearchIndex();
    if (!searchIndex) {
      throw new Error("No previous search found. Run 'obs search' first to use index numbers.");
    }

    const allResults = [...searchIndex.tagMatches, ...searchIndex.semanticMatches];
    const result = allResults.find(r => r.index === indexNum);
    if (!result) {
      throw new Error(`Index ${indexNum} not found in last search results (max: ${allResults.length})`);
    }
    return result.path;
  }

  // Check if it's a full path
  if (selector.startsWith("/") || selector.includes("/")) {
    return selector;
  }

  // Search for note by name in vault
  const noteName = selector.endsWith(".md") ? selector.slice(0, -3) : selector;
  const matchingPath = await findNoteByName(config.vaultPath, noteName);

  if (!matchingPath) {
    throw new Error(`Note not found: ${selector}`);
  }

  return matchingPath;
}

/**
 * Find a note by name in the vault (recursive search)
 */
async function findNoteByName(vaultPath: string, noteName: string): Promise<string | null> {
  async function walkDir(dir: string): Promise<string | null> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip hidden directories and _meta
      if (entry.name.startsWith(".") || entry.name === "_meta" || entry.name === "attachments") {
        continue;
      }

      if (entry.isDirectory()) {
        const found = await walkDir(fullPath);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const baseName = basename(entry.name, ".md");
        // Match exactly or fuzzy match (contains)
        if (baseName === noteName || baseName.toLowerCase().includes(noteName.toLowerCase())) {
          return fullPath;
        }
      }
    }
    return null;
  }

  return walkDir(vaultPath);
}

/**
 * Add a tag to a note's frontmatter
 * Returns true if tag was added, false if already present
 */
export async function addTagToNote(notePath: string, tag: string): Promise<{ added: boolean; notePath: string }> {
  const rawContent = await readFile(notePath, "utf-8");
  const parsed = parseNoteContent(rawContent);

  // Check if tag already exists
  if (parsed.tags.includes(tag)) {
    return { added: false, notePath };
  }

  // Get existing frontmatter tags (or empty array)
  const existingTags = Array.isArray(parsed.frontmatter.tags)
    ? parsed.frontmatter.tags as string[]
    : typeof parsed.frontmatter.tags === "string"
      ? (parsed.frontmatter.tags as string).split(/\s+/).filter(Boolean)
      : [];

  // Add new tag
  const newTags = [...existingTags, tag];

  // Rebuild frontmatter
  const newFrontmatter = {
    ...parsed.frontmatter,
    tags: newTags,
  };

  // Generate new content
  const newContent = generateFrontmatter(newFrontmatter) + "\n\n" + parsed.content;

  // Write back
  await writeFile(notePath, newContent, "utf-8");

  return { added: true, notePath };
}

/**
 * Remove a tag from a note's frontmatter
 * Returns true if tag was removed, false if not present
 */
export async function removeTagFromNote(notePath: string, tag: string): Promise<{ removed: boolean; notePath: string }> {
  const rawContent = await readFile(notePath, "utf-8");
  const parsed = parseNoteContent(rawContent);

  // Get existing frontmatter tags
  const existingTags = Array.isArray(parsed.frontmatter.tags)
    ? parsed.frontmatter.tags as string[]
    : typeof parsed.frontmatter.tags === "string"
      ? (parsed.frontmatter.tags as string).split(/\s+/).filter(Boolean)
      : [];

  // Check if tag exists
  if (!existingTags.includes(tag)) {
    return { removed: false, notePath };
  }

  // Remove tag
  const newTags = existingTags.filter(t => t !== tag);

  // Rebuild frontmatter
  const newFrontmatter = {
    ...parsed.frontmatter,
    tags: newTags,
  };

  // Generate new content
  const newContent = generateFrontmatter(newFrontmatter) + "\n\n" + parsed.content;

  // Write back
  await writeFile(notePath, newContent, "utf-8");

  return { removed: true, notePath };
}
