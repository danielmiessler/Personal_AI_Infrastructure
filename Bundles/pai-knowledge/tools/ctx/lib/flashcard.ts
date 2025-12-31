/**
 * Flashcard Cultivation Module - Interactive Review Mode
 *
 * Provides flashcard-style review of captured notes with tag editing
 * and connection suggestions.
 *
 * TASK-FLASH-001: Implement ctx cultivate review command
 * TASK-FLASH-002: Subset selection filters
 * TASK-FLASH-003: Flashcard display renderer
 * TASK-FLASH-004: Inline tag editing
 * TASK-FLASH-005: Connection suggestion engine
 */

import { searchNotes, SearchResult, parseSince, ScopeFilter } from "./search";
import { semanticSearch, SemanticSearchOptions } from "./embed";
import { validateTags, TaxonomySchema } from "./taxonomy";
import { readNote } from "./read";
import { addTagToNote, removeTagFromNote } from "./tags";
import { basename } from "path";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface FilterOptions {
  since?: Date;         // Filter by capture date
  session?: string;     // Filter by session tag
  source?: string;      // Filter by source dimension (e.g., "telegram")
  tag?: string[];       // Filter by tags (AND logic)
  limit?: number;       // Maximum notes to review
  scope?: ScopeFilter;  // Scope filter (work/private/all)
}

export interface FlashcardNote {
  name: string;
  path: string;
  content: string;      // Full note content
  preview: string;      // First ~500 chars for display
  tags: string[];
  captureDate?: Date;
  mtime: Date;
}

export interface FlashcardSession {
  notes: FlashcardNote[];
  currentIndex: number;
  completed: string[];   // Note paths marked as done
  skipped: string[];     // Note paths skipped
}

export interface ConnectionSuggestion {
  noteName: string;
  notePath: string;
  reason: string;
  score: number;        // Similarity score (0-1)
  sharedTags?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Zettelkasten Types (REQ-ZK-001 through REQ-ZK-005)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * REQ-ZK-001: Connection type prompts for linking notes
 */
export type ConnectionType = 'supports' | 'contradicts' | 'extends' | 'new-branch';

/**
 * Zettelkasten prompt types for cultivation workflow
 */
export interface ZettelkastenPrompt {
  type: 'connection' | 'atomic' | 'insight' | 'contradiction';
  note: FlashcardNote;
  suggestion?: ConnectionSuggestion;
  options?: string[];
}

/**
 * Extended connection suggestion with Zettelkasten metadata
 */
export interface ZettelkastenConnection extends ConnectionSuggestion {
  suggestedType?: ConnectionType;  // AI-suggested connection type
  insight?: string;                 // User's insight on the connection
}

/**
 * REQ-ZK-002: Multi-idea detection result
 */
export interface AtomicAnalysis {
  hasMultipleIdeas: boolean;
  ideaCount: number;
  splitSuggestions?: string[];  // Suggested titles/topics for splitting
  reason: string;               // Why we think this has multiple ideas
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Management
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Start a flashcard review session with filtered notes
 */
export async function startFlashcardSession(filter: FilterOptions): Promise<FlashcardSession> {
  // Build search options
  const searchOpts: any = {
    tags: filter.tag || [],
    scope: filter.scope || "work",
    recent: filter.limit,
  };

  // Add source filter if provided (e.g., "telegram" → "source/telegram")
  if (filter.source) {
    searchOpts.tags.push(`source/${filter.source}`);
  }

  // Add session filter if provided (e.g., "2025-12-15" → "session/2025-12-15")
  if (filter.session) {
    searchOpts.tags.push(`session/${filter.session}`);
  }

  // Add since filter
  if (filter.since) {
    searchOpts.since = filter.since;
  }

  // Search notes
  const results = await searchNotes(searchOpts);

  // Load full content for each note
  const notes: FlashcardNote[] = [];
  for (const result of results) {
    const content = await readNote(result.path);
    const preview = content.substring(0, 500) + (content.length > 500 ? "..." : "");

    notes.push({
      name: result.name,
      path: result.path,
      content,
      preview,
      tags: result.tags,
      captureDate: result.captureDate,
      mtime: result.mtime,
    });
  }

  return {
    notes,
    currentIndex: 0,
    completed: [],
    skipped: [],
  };
}

/**
 * Start a flashcard review session from a list of paths
 * Used by sweep when results are already available
 */
export async function startFlashcardSessionFromPaths(paths: string[]): Promise<FlashcardSession> {
  const notes: FlashcardNote[] = [];

  for (const path of paths) {
    const content = await readNote(path);
    const preview = content.substring(0, 500) + (content.length > 500 ? "..." : "");
    const name = basename(path).replace(/\.md$/, "");

    // Extract tags from frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let tags: string[] = [];
    if (frontmatterMatch) {
      const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1].split(",").map(t => t.trim().replace(/['"]/g, ""));
      }
    }

    notes.push({
      name,
      path,
      content,
      preview,
      tags,
      mtime: new Date(),
    });
  }

  return {
    notes,
    currentIndex: 0,
    completed: [],
    skipped: [],
  };
}

/**
 * Get the current note in the session
 */
export function getCurrentNote(session: FlashcardSession): FlashcardNote | null {
  if (session.currentIndex >= session.notes.length) {
    return null;
  }
  return session.notes[session.currentIndex];
}

/**
 * Move to next note
 */
export function nextNote(session: FlashcardSession): boolean {
  if (session.currentIndex < session.notes.length - 1) {
    session.currentIndex++;
    return true;
  }
  return false;
}

/**
 * Move to previous note
 */
export function prevNote(session: FlashcardSession): boolean {
  if (session.currentIndex > 0) {
    session.currentIndex--;
    return true;
  }
  return false;
}

/**
 * Mark current note as completed
 */
export function markCompleted(session: FlashcardSession): void {
  const note = getCurrentNote(session);
  if (note) {
    session.completed.push(note.path);
  }
}

/**
 * Mark current note as skipped
 */
export function markSkipped(session: FlashcardSession): void {
  const note = getCurrentNote(session);
  if (note) {
    session.skipped.push(note.path);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Display Rendering
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render flashcard display for current note
 */
export function renderFlashcard(session: FlashcardSession): string {
  const note = getCurrentNote(session);
  if (!note) {
    return "No more notes to review!";
  }

  const position = `${session.currentIndex + 1}/${session.notes.length}`;
  const separator = "═".repeat(67);
  const divider = "─".repeat(67);

  const lines: string[] = [];
  lines.push(separator);
  lines.push(`  REVIEW [${position}]  │  ${note.name}`);
  lines.push(separator);
  lines.push("");
  lines.push(`  ${note.preview.replace(/\n/g, "\n  ")}`);
  lines.push("");
  lines.push(divider);
  lines.push(`  TAGS: ${note.tags.join(", ")}`);
  lines.push(divider);
  lines.push(`  [n]ext  [p]rev  [t]ags  [l]ink  [s]kip  [d]one  [q]uit`);
  lines.push(separator);

  return lines.join("\n");
}

/**
 * Render flashcard with connection suggestions (LEGACY - use renderZettelkastenFlashcard)
 */
export function renderFlashcardWithConnections(
  session: FlashcardSession,
  connections: ConnectionSuggestion[]
): string {
  const note = getCurrentNote(session);
  if (!note) {
    return "No more notes to review!";
  }

  const position = `${session.currentIndex + 1}/${session.notes.length}`;
  const separator = "═".repeat(67);
  const divider = "─".repeat(67);

  const lines: string[] = [];
  lines.push(separator);
  lines.push(`  REVIEW [${position}]  │  ${note.name}`);
  lines.push(separator);
  lines.push("");
  lines.push(`  ${note.preview.replace(/\n/g, "\n  ")}`);
  lines.push("");
  lines.push(divider);
  lines.push(`  TAGS: ${note.tags.join(", ")}`);
  lines.push(divider);

  if (connections.length > 0) {
    lines.push(`  CONNECTIONS (suggested):`);
    const topConnections = connections.slice(0, 5);
    for (const conn of topConnections) {
      const score = Math.round(conn.score * 100);
      if (conn.sharedTags && conn.sharedTags.length > 0) {
        lines.push(`    → ${conn.noteName} (shared: ${conn.sharedTags.join(", ")})`);
      } else {
        lines.push(`    → ${conn.noteName} (semantic: ${score}%)`);
      }
    }
    lines.push(divider);
  }

  lines.push(`  [n]ext  [p]rev  [t]ags  [l]ink  [s]kip  [d]one  [q]uit`);
  lines.push(separator);

  return lines.join("\n");
}

/**
 * REQ-ZK-005: Render flashcard with Zettelkasten intelligence
 * Includes atomic warnings, connection type prompts, and keyboard shortcuts
 */
export function renderZettelkastenFlashcard(
  session: FlashcardSession,
  connections: ConnectionSuggestion[],
  atomicAnalysis?: AtomicAnalysis
): string {
  const note = getCurrentNote(session);
  if (!note) {
    return "No more notes to review!";
  }

  const position = `${session.currentIndex + 1}/${session.notes.length}`;
  const separator = "═".repeat(67);
  const divider = "─".repeat(67);

  const lines: string[] = [];
  lines.push(separator);
  lines.push(`  REVIEW [${position}]  │  ${note.name}`);
  lines.push(separator);
  lines.push("");
  lines.push(`  ${note.preview.replace(/\n/g, "\n  ")}`);
  lines.push("");
  lines.push(divider);
  lines.push(`  TAGS: ${note.tags.join(", ")}`);
  lines.push(divider);

  // REQ-ZK-002: Atomic note warning
  if (atomicAnalysis && atomicAnalysis.hasMultipleIdeas) {
    lines.push(`  ⚠️  This note contains multiple ideas. Consider splitting.`);
    lines.push(`      Reason: ${atomicAnalysis.reason}`);
    lines.push(`      Detected ideas: ~${atomicAnalysis.ideaCount}`);
    lines.push(divider);
  }

  // REQ-ZK-001: Connection prompts with suggested types
  if (connections.length > 0) {
    const topConnection = connections[0];
    const suggestedType = suggestConnectionType(note, topConnection);

    lines.push(`  CONNECTION: ${topConnection.noteName}`);
    lines.push(`  Does this SUPPORT, CONTRADICT, or EXTEND your understanding?`);
    lines.push(`  Suggested: [${suggestedType.toUpperCase()}]`);

    if (connections.length > 1) {
      lines.push(``);
      lines.push(`  Other connections (${connections.length - 1} more):`);
      for (const conn of connections.slice(1, 4)) {
        const score = Math.round(conn.score * 100);
        lines.push(`    → ${conn.noteName} (${score}%)`);
      }
    }
    lines.push(divider);
  }

  // REQ-ZK-005: Extended keyboard shortcuts
  lines.push(`  [L]ink  [T]ag  [N]ew  [S]plit  [A]rchive  [D]efer  [Q]uit`);
  lines.push(separator);

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// Connection Suggestions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Suggest connections based on tags and semantic similarity
 */
export async function suggestConnections(
  note: FlashcardNote,
  allNotes?: SearchResult[]
): Promise<ConnectionSuggestion[]> {
  const suggestions: ConnectionSuggestion[] = [];

  // If allNotes not provided, search for all work-scoped notes
  if (!allNotes) {
    allNotes = await searchNotes({
      tags: [],
      scope: "work",
    });
  }

  // 1. Find notes with shared tags
  for (const other of allNotes) {
    if (other.path === note.path) continue; // Skip self

    const sharedTags = note.tags.filter((t) => other.tags.includes(t));
    if (sharedTags.length > 0) {
      suggestions.push({
        noteName: other.name,
        notePath: other.path,
        reason: `Shared tags: ${sharedTags.join(", ")}`,
        score: sharedTags.length / Math.max(note.tags.length, other.tags.length),
        sharedTags,
      });
    }
  }

  // 2. Semantic search for similar content
  try {
    // Use first 500 chars as query
    const query = note.content.substring(0, 500);
    const semanticResults = await semanticSearch(query, {
      limit: 5,
      scope: "work",
    });

    for (const result of semanticResults) {
      if (result.path === note.path) continue; // Skip self

      // Check if already added by tag matching
      const existing = suggestions.find((s) => s.notePath === result.path);
      if (!existing) {
        suggestions.push({
          noteName: basename(result.path, ".md"),
          notePath: result.path,
          reason: `Semantic similarity: ${Math.round(result.similarity * 100)}%`,
          score: result.similarity,
        });
      }
    }
  } catch (error) {
    // Semantic search may fail if embeddings not built
    // Continue with tag-based suggestions only
  }

  // Sort by score (descending)
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tag Editing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interactive tag editing for a note
 * Returns updated tags list
 */
export async function editTags(
  note: FlashcardNote,
  taxonomy: TaxonomySchema
): Promise<string[]> {
  // This is a non-interactive version that validates tags
  // The interactive version will be implemented in the CLI handler
  const validation = validateTags(note.tags, taxonomy);

  return note.tags;
}

/**
 * Add a tag to a note (updates file)
 */
export async function addTag(note: FlashcardNote, tag: string): Promise<void> {
  await addTagToNote(note.path, tag);
  if (!note.tags.includes(tag)) {
    note.tags.push(tag);
  }
}

/**
 * Remove a tag from a note (updates file)
 */
export async function removeTag(note: FlashcardNote, tag: string): Promise<void> {
  await removeTagFromNote(note.path, tag);
  const index = note.tags.indexOf(tag);
  if (index !== -1) {
    note.tags.splice(index, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Zettelkasten Intelligence (REQ-ZK-001 through REQ-ZK-005)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * REQ-ZK-002: Detect if a note contains multiple distinct ideas
 *
 * Heuristics:
 * - More than 3 paragraph breaks suggests multiple topics
 * - Multiple H2/H3 headings indicate distinct sections
 * - Long numbered/bulleted lists with substantial items
 * - Word count > 500 with topic shifts
 */
export function detectMultipleIdeas(content: string): AtomicAnalysis {
  // Count paragraphs (double newlines)
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  const paragraphCount = paragraphs.length;

  // Count headings (H2/H3)
  const headings = content.match(/^#{2,3}\s+.+$/gm) || [];
  const headingCount = headings.length;

  // Count substantial list items (more than 50 chars each)
  const listItems = content.match(/^[\-\*\d]+[\.\)]\s+.{50,}$/gm) || [];
  const substantialListItems = listItems.length;

  // Word count
  const wordCount = content.split(/\s+/).length;

  // Detect topic shifts (looking for transition words followed by new topics)
  const transitionWords = /\b(however|furthermore|additionally|moreover|conversely|alternatively|meanwhile)\b/gi;
  const topicShifts = (content.match(transitionWords) || []).length;

  // Decision logic
  let hasMultipleIdeas = false;
  let ideaCount = 1;
  const reasons: string[] = [];

  if (paragraphCount > 3) {
    hasMultipleIdeas = true;
    ideaCount = Math.max(ideaCount, Math.ceil(paragraphCount / 2));
    reasons.push(`${paragraphCount} distinct paragraphs`);
  }

  if (headingCount >= 2) {
    hasMultipleIdeas = true;
    ideaCount = Math.max(ideaCount, headingCount);
    reasons.push(`${headingCount} section headings`);
  }

  if (substantialListItems >= 4) {
    hasMultipleIdeas = true;
    ideaCount = Math.max(ideaCount, Math.ceil(substantialListItems / 2));
    reasons.push(`${substantialListItems} substantial list items`);
  }

  if (wordCount > 500 && topicShifts >= 2) {
    hasMultipleIdeas = true;
    reasons.push(`${wordCount} words with ${topicShifts} topic shifts`);
  }

  return {
    hasMultipleIdeas,
    ideaCount,
    reason: reasons.length > 0 ? reasons.join("; ") : "Single focused idea",
  };
}

/**
 * REQ-ZK-002: Generate suggestions for splitting a multi-idea note
 * Returns potential titles/topics for atomic notes
 */
export function generateAtomicSplitSuggestion(content: string): string[] {
  const suggestions: string[] = [];

  // Extract H2/H3 headings as potential split points
  const headings = content.match(/^#{2,3}\s+(.+)$/gm);
  if (headings) {
    suggestions.push(...headings.map(h => h.replace(/^#{2,3}\s+/, "").trim()));
  }

  // Extract first sentence of each paragraph as potential topics
  if (suggestions.length === 0) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
    for (const para of paragraphs.slice(0, 5)) {
      // Get first sentence (up to . ! or ?)
      const firstSentence = para.match(/^[^.!?]+[.!?]/);
      if (firstSentence) {
        const topic = firstSentence[0].trim().substring(0, 60);
        suggestions.push(topic);
      }
    }
  }

  return suggestions.slice(0, 5); // Return max 5 suggestions
}

/**
 * REQ-ZK-003: Create a wiki-link with connection type and optional insight
 */
export async function createLinkWithInsight(
  fromNote: FlashcardNote,
  toNote: ConnectionSuggestion,
  type: ConnectionType,
  insight?: string
): Promise<void> {
  const { writeFile, readFile } = await import("fs/promises");

  // Format the link with metadata
  let linkText = `[[${toNote.noteName}]]`;

  // Add connection type and insight
  const metadata: string[] = [];
  metadata.push(`[${type}]`);
  if (insight && insight.trim().length > 0) {
    metadata.push(insight.trim());
  }

  if (metadata.length > 0) {
    linkText += ` - ${metadata.join(" ")}`;
  }

  // Read current content
  const currentContent = await readFile(fromNote.path, "utf-8");

  // Check if note already has a "Related Notes" or "Links" section
  const hasRelatedSection = /^#{1,3}\s+(Related Notes?|Links?|Connections?)\s*$/im.test(currentContent);

  let updatedContent: string;

  if (hasRelatedSection) {
    // Add to existing section (after the heading)
    updatedContent = currentContent.replace(
      /^(#{1,3}\s+(?:Related Notes?|Links?|Connections?)\s*$)/im,
      `$1\n- ${linkText}`
    );
  } else {
    // Add new "Related Notes" section at the end
    updatedContent = currentContent.trim() + `\n\n## Related Notes\n\n- ${linkText}\n`;
  }

  // Write updated content
  await writeFile(fromNote.path, updatedContent, "utf-8");

  // Update in-memory note
  fromNote.content = updatedContent;
}

/**
 * REQ-ZK-004: Generate synthesis note outline for contradicting notes
 */
export function generateSynthesisOutline(noteA: FlashcardNote, noteB: FlashcardNote): string {
  const date = new Date().toISOString().split('T')[0];
  const title = `Synthesis: ${noteA.name} vs ${noteB.name}`;

  return `# ${title}

**Created:** ${date}
**Type:** Synthesis Note

## Overview

This note explores the tension between two perspectives:
- **[[${noteA.name}]]**
- **[[${noteB.name}]]**

## Perspective A: ${noteA.name}

${noteA.preview}

**Key claims:**
- [Extract key claim 1]
- [Extract key claim 2]

## Perspective B: ${noteB.name}

${noteB.preview}

**Key claims:**
- [Extract key claim 1]
- [Extract key claim 2]

## Points of Tension

1. **[Tension point 1]**
   - Perspective A: ...
   - Perspective B: ...

2. **[Tension point 2]**
   - Perspective A: ...
   - Perspective B: ...

## Synthesis

[Your analysis of how these perspectives can be reconciled, which is more accurate, or under what conditions each applies]

## Personal Insight

[What do I believe after examining both perspectives?]

## Tags

#type/synthesis #status/draft

## Related Notes

- [[${noteA.name}]] - [contradicts]
- [[${noteB.name}]] - [contradicts]
`;
}

/**
 * REQ-ZK-001: Suggest connection type based on content similarity and tags
 */
export function suggestConnectionType(
  fromNote: FlashcardNote,
  toNote: ConnectionSuggestion
): ConnectionType {
  // If they share many tags, likely "supports" or "extends"
  if (toNote.sharedTags && toNote.sharedTags.length >= 2) {
    return toNote.score > 0.8 ? "supports" : "extends";
  }

  // High semantic similarity suggests "supports"
  if (toNote.score > 0.85) {
    return "supports";
  }

  // Medium similarity suggests "extends"
  if (toNote.score > 0.7) {
    return "extends";
  }

  // Lower similarity might be a new branch
  return "new-branch";
}

// ═══════════════════════════════════════════════════════════════════════════
// Filter Parsing
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse CLI arguments into FilterOptions
 */
export function parseFilterOptions(args: string[]): FilterOptions {
  const options: FilterOptions = {};

  // Parse --since
  const sinceIdx = args.findIndex((a) => a === "--since");
  if (sinceIdx !== -1 && args[sinceIdx + 1]) {
    const since = parseSince(args[sinceIdx + 1]);
    if (since) {
      options.since = since;
    }
  }

  // Parse --session
  const sessionIdx = args.findIndex((a) => a === "--session");
  if (sessionIdx !== -1 && args[sessionIdx + 1]) {
    options.session = args[sessionIdx + 1];
  }

  // Parse --source
  const sourceIdx = args.findIndex((a) => a === "--source");
  if (sourceIdx !== -1 && args[sourceIdx + 1]) {
    options.source = args[sourceIdx + 1];
  }

  // Parse --tag (can have multiple)
  options.tag = [];
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--tag" || args[i] === "-t") && args[i + 1]) {
      options.tag.push(args[i + 1]);
      i++; // Skip next arg
    }
  }

  // Parse --limit
  const limitIdx = args.findIndex((a) => a === "--limit" || a === "-l");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    options.limit = parseInt(args[limitIdx + 1], 10);
  }

  // Parse --scope
  const scopeIdx = args.findIndex((a) => a === "--scope");
  if (scopeIdx !== -1 && args[scopeIdx + 1]) {
    const scope = args[scopeIdx + 1];
    if (scope === "work" || scope === "private" || scope === "all") {
      options.scope = scope;
    }
  }

  return options;
}
