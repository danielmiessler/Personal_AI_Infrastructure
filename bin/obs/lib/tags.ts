/**
 * Tag listing functionality for obs CLI
 */

import { readdir } from "fs/promises";
import { join } from "path";
import { getConfig, validateVault } from "./config";
import { parseNote } from "./parse";

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
