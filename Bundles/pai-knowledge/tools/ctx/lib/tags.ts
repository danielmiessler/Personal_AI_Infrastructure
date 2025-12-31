/**
 * Tag functionality for ctx CLI
 * - List all tags in vault
 * - Add/remove tags from notes
 * - Suggest tags based on content
 */

import { readdir, readFile, writeFile } from "fs/promises";
import { join, basename } from "path";
import { getConfig, validateVault } from "./config";
import { parseNote, parseNoteContent, generateFrontmatter } from "./parse";
import { loadSearchIndex } from "./index";
import { resolveNoteRef } from "./sweep-session";
import {
  listTagsWithCounts,
  listTagsByPrefix,
  isTagIndexAvailable,
  updateNoteTagsInIndex,
} from "./tag-index";

/**
 * List all tags in the vault with optional counts
 * Uses tag index if available for much faster performance
 */
export async function listTags(
  showCounts: boolean = false,
  options?: { prefix?: string; noIndex?: boolean }
): Promise<Record<string, number>> {
  validateVault();

  // Try to use tag index for fast lookup
  const useTagIndex = !options?.noIndex && await isTagIndexAvailable();

  if (useTagIndex) {
    // Fast path: use indexed tag counts
    const tagList = options?.prefix
      ? await listTagsByPrefix(options.prefix)
      : await listTagsWithCounts();

    const tagCounts: Record<string, number> = {};
    for (const { tag, count } of tagList) {
      tagCounts[tag] = count;
    }
    return tagCounts;
  }

  // Fallback: scan all files
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
            // Apply prefix filter if specified
            if (!options?.prefix || tag.startsWith(options.prefix)) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
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

  // People name detection is now handled by @mentions in content
  // e.g., "@john_smith" or "#person/john_smith"
  // See tools/ingest/lib/process.ts for inline mention extraction

  // Detect project keywords
  // Add your own project patterns here
  const projectPatterns: [RegExp, string][] = [
    // Example patterns - customize for your projects:
    // [/\bmy-project\b/i, "project/my-project"],
    // [/\bquarterly\s+review\b.*?(2024|25)/i, "project/quarterly-review"],
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
 * PARA Classification - score content against PARA categories
 *
 * TODO: Add LLM-based classification using `claude -p` or OpenAI inference.
 * This pattern-matching approach is a fast fallback for when LLM is not available.
 * LLM classification would provide much more accurate categorization.
 *
 * Future enhancement:
 *   const llmResult = await runInference({
 *     prompt: `Classify this note into PARA (Project/Area/Resource/Archive): ${content}`,
 *     backend: config.inference?.backend || "claude"  // or "openai"
 *   });
 */
export interface ParaSuggestion {
  category: "project" | "area" | "resource" | "archive";
  confidence: number;
  reason: string;
}

export function suggestParaClassification(content: string, existingTags: string[]): ParaSuggestion[] {
  // Check if already has a PARA tag
  const existingPara = existingTags.find(t => t.startsWith("para/"));
  if (existingPara) {
    const category = existingPara.split("/")[1] as ParaSuggestion["category"];
    return [{
      category,
      confidence: 100,
      reason: `Already classified as ${existingPara}`,
    }];
  }

  const scores: Record<string, { score: number; reasons: string[] }> = {
    project: { score: 0, reasons: [] },
    area: { score: 0, reasons: [] },
    resource: { score: 0, reasons: [] },
    archive: { score: 0, reasons: [] },
  };

  const contentLower = content.toLowerCase();

  // PROJECT indicators: deadlines, tasks, goals, milestones
  const projectPatterns: [RegExp, string, number][] = [
    [/\bdeadline\b/i, "deadline mentioned", 30],
    [/\bdue date\b|\bdue by\b/i, "due date mentioned", 25],
    [/\bgoal[s]?\b/i, "goals mentioned", 20],
    [/\bmilestone\b/i, "milestone mentioned", 25],
    [/\btask\b|\btodo\b|\bto-do\b/i, "tasks mentioned", 15],
    [/\bdeliverable\b/i, "deliverables mentioned", 25],
    [/\bQ[1-4]\b|quarter/i, "quarterly reference", 20],
    [/\b202[4-9]\b.*\bgoal\b|\bgoal\b.*\b202[4-9]\b/i, "dated goal", 25],
    [/\bproject\b.*\bplan\b|\bplan\b.*\bproject\b/i, "project plan", 30],
    [/\bstatus\b.*\bupdate\b|\bprogress\b/i, "status/progress tracking", 15],
  ];

  // AREA indicators: ongoing, maintenance, routine, responsibility
  const areaPatterns: [RegExp, string, number][] = [
    [/\bhealth\b|\bfitness\b|\bexercise\b/i, "health topic", 25],
    [/\bfinance\b|\bbudget\b|\binvestment\b/i, "finance topic", 25],
    [/\bcareer\b|\bprofessional\b/i, "career development", 25],
    [/\brelationship\b|\bfamily\b/i, "relationships", 20],
    [/\broutine\b|\bdaily\b|\bweekly\b/i, "routine/recurring", 20],
    [/\bmaintenance\b|\bupkeep\b/i, "maintenance", 20],
    [/\bresponsibility\b|\bresponsibilities\b/i, "responsibilities", 25],
    [/\bongoing\b|\bcontinuous\b/i, "ongoing nature", 15],
    [/\bstandard\b.*\bprocess\b|\bprocess\b.*\bstandard\b/i, "standard process", 20],
  ];

  // RESOURCE indicators: reference, how-to, article, guide
  const resourcePatterns: [RegExp, string, number][] = [
    [/\bhow to\b|\bhowto\b/i, "how-to content", 30],
    [/\bguide\b|\btutorial\b/i, "guide/tutorial", 30],
    [/\breference\b/i, "reference material", 25],
    [/\bdocumentation\b|\bdocs\b/i, "documentation", 25],
    [/\barticle\b|\bpost\b/i, "article/post", 15],
    [/\btemplate\b/i, "template", 25],
    [/\bexample\b|\bsample\b/i, "examples", 15],
    [/\bresearch\b|\bstudy\b/i, "research/study", 20],
    [/\bbest practice\b/i, "best practices", 25],
    [/\bcheatsheet\b|\bcheat sheet\b/i, "cheatsheet", 30],
  ];

  // ARCHIVE indicators: completed, old, deprecated, historical
  const archivePatterns: [RegExp, string, number][] = [
    [/\bcompleted\b|\bdone\b|\bfinished\b/i, "completed", 30],
    [/\barchive[d]?\b/i, "archive mention", 25],
    [/\bdeprecated\b|\bobsolete\b/i, "deprecated", 30],
    [/\bhistorical\b|\blegacy\b/i, "historical", 25],
    [/\bold\b.*\bversion\b|\bversion\b.*\bold\b/i, "old version", 20],
    [/\bno longer\b/i, "no longer relevant", 25],
    [/\bclosed\b|\bended\b/i, "closed/ended", 20],
    [/\b201[0-9]\b/i, "old year reference", 15],
  ];

  // Score each category
  for (const [pattern, reason, points] of projectPatterns) {
    if (pattern.test(contentLower)) {
      scores.project.score += points;
      scores.project.reasons.push(reason);
    }
  }

  for (const [pattern, reason, points] of areaPatterns) {
    if (pattern.test(contentLower)) {
      scores.area.score += points;
      scores.area.reasons.push(reason);
    }
  }

  for (const [pattern, reason, points] of resourcePatterns) {
    if (pattern.test(contentLower)) {
      scores.resource.score += points;
      scores.resource.reasons.push(reason);
    }
  }

  for (const [pattern, reason, points] of archivePatterns) {
    if (pattern.test(contentLower)) {
      scores.archive.score += points;
      scores.archive.reasons.push(reason);
    }
  }

  // Also check existing tags for hints
  for (const tag of existingTags) {
    if (tag.includes("howto") || tag.includes("guide") || tag.includes("format/howto")) {
      scores.resource.score += 30;
      scores.resource.reasons.push("tagged as howto/guide");
    }
    if (tag.includes("project/")) {
      scores.project.score += 30;
      scores.project.reasons.push("has project/* tag");
    }
    if (tag.startsWith("status/archived") || tag.startsWith("status/done")) {
      scores.archive.score += 40;
      scores.archive.reasons.push("has archived/done status");
    }
    if (tag.includes("article") || tag.includes("document")) {
      scores.resource.score += 15;
      scores.resource.reasons.push("tagged as article/document");
    }
  }

  // Convert to suggestions, sorted by confidence
  const suggestions: ParaSuggestion[] = Object.entries(scores)
    .filter(([, data]) => data.score > 0)
    .map(([category, data]) => ({
      category: category as ParaSuggestion["category"],
      confidence: Math.min(data.score, 100), // Cap at 100
      reason: data.reasons.slice(0, 2).join(", "), // Top 2 reasons
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3); // Top 3 suggestions

  // If no strong signals, return neutral suggestion
  if (suggestions.length === 0) {
    return [{
      category: "resource",
      confidence: 20,
      reason: "No clear signals - default to resource",
    }];
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

  // Check if it's a numeric index - try sweep session first, then search index
  const indexNum = parseInt(selector, 10);
  if (!isNaN(indexNum) && indexNum > 0) {
    // Try sweep session first (supports "ctx tag add 1 topic/ai" during sweep)
    const sessionPath = resolveNoteRef(selector, config.vaultPath);
    if (sessionPath) {
      return sessionPath;
    }

    // Fall back to last search index
    const searchIndex = await loadSearchIndex();
    if (!searchIndex) {
      throw new Error("No previous search found. Run 'ctx search' or 'ctx sweep' first to use index numbers.");
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
 * Updates tag index automatically
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

  // Update tag index
  await updateNoteTagsInIndex(notePath);

  return { added: true, notePath };
}

/**
 * Remove a tag from a note's frontmatter
 * Returns true if tag was removed, false if not present
 * Updates tag index automatically
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

  // Update tag index
  await updateNoteTagsInIndex(notePath);

  return { removed: true, notePath };
}
