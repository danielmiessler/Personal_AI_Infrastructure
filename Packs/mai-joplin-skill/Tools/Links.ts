#!/usr/bin/env bun
/**
 * Joplin Links Tool
 * Extract links and backlinks from notes
 *
 * Usage:
 *   bun run Links.ts get_links <note_id>
 *
 * Link formats detected:
 *   [link text](:/targetNoteId) - Link to note
 *   [link text](:/targetNoteId#section-slug) - Link to specific section
 */

import {
  joplinApi,
  joplinApiPaginated,
  JoplinNote,
  outputJson,
  outputError,
  parseArgs,
  isValidId,
} from './Client.ts';

const USAGE = `Usage:
  bun run Links.ts get_links <note_id>`;

interface OutgoingLink {
  text: string;
  target_id: string;
  target_title: string | null;
  section_slug: string | null;
  line_number: number;
  line_content: string;
}

interface Backlink {
  source_id: string;
  source_title: string;
  text: string;
  section_slug: string | null;
  line_number: number;
  line_content: string;
}

/**
 * Extract all outgoing links from note content
 */
function extractOutgoingLinks(body: string): Array<{
  text: string;
  targetId: string;
  sectionSlug: string | null;
  lineNumber: number;
  lineContent: string;
}> {
  const links: Array<{
    text: string;
    targetId: string;
    sectionSlug: string | null;
    lineNumber: number;
    lineContent: string;
  }> = [];

  const lines = body.split('\n');
  // Pattern: [text](:/noteId) or [text](:/noteId#section)
  const linkPattern = /\[([^\]]+)\]\(:\/([a-f0-9]{32})(?:#([a-z0-9-]+))?\)/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(line)) !== null) {
      links.push({
        text: match[1],
        targetId: match[2],
        sectionSlug: match[3] || null,
        lineNumber: i + 1,
        lineContent: line,
      });
    }
  }

  return links;
}

/**
 * Find all backlinks to a note
 */
async function findBacklinks(noteId: string): Promise<Backlink[]> {
  const backlinks: Backlink[] = [];

  // Search for notes containing links to this note
  // We need to search for the pattern :/noteId
  const searchResults = await joplinApiPaginated<JoplinNote>('/search', {
    params: {
      query: `:/${noteId}`,
      fields: 'id,title,body',
    },
  });

  for (const note of searchResults) {
    if (note.id === noteId) continue; // Skip self-references

    const body = note.body || '';
    const lines = body.split('\n');
    const pattern = new RegExp(`\\[([^\\]]+)\\]\\(:\/${noteId}(?:#([a-z0-9-]+))?\\)`, 'gi');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(line)) !== null) {
        backlinks.push({
          source_id: note.id,
          source_title: note.title,
          text: match[1],
          section_slug: match[2] || null,
          line_number: i + 1,
          line_content: line,
        });
      }
    }
  }

  return backlinks;
}

/**
 * Get all links for a note (outgoing and backlinks)
 */
async function getLinks(noteId: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  // Get the note content
  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title,body' },
  });

  const body = note.body || '';

  // Extract outgoing links
  const rawOutgoing = extractOutgoingLinks(body);

  // Resolve target note titles
  const outgoingLinks: OutgoingLink[] = await Promise.all(
    rawOutgoing.map(async (link) => {
      let targetTitle: string | null = null;
      try {
        const targetNote = await joplinApi<JoplinNote>(`/notes/${link.targetId}`, {
          params: { fields: 'id,title' },
        });
        targetTitle = targetNote.title;
      } catch {
        // Target note may have been deleted
        targetTitle = null;
      }

      return {
        text: link.text,
        target_id: link.targetId,
        target_title: targetTitle,
        section_slug: link.sectionSlug,
        line_number: link.lineNumber,
        line_content: link.lineContent,
      };
    })
  );

  // Find backlinks
  const backlinks = await findBacklinks(noteId);

  outputJson({
    note: {
      id: note.id,
      title: note.title,
    },
    outgoing_links: {
      count: outgoingLinks.length,
      links: outgoingLinks,
    },
    backlinks: {
      count: backlinks.length,
      links: backlinks,
    },
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'get_links':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: note_id is required for get_links`);
        }
        await getLinks(positional[1]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
