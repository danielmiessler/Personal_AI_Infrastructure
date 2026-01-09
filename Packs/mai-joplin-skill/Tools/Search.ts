#!/usr/bin/env bun
/**
 * Joplin Search Tool
 * Search notes by various criteria
 *
 * Usage:
 *   bun run Search.ts find_notes "query" [--task] [--completed] [--limit <num>] [--offset <num>]
 *   bun run Search.ts find_notes "*" [--task] [--completed] [--limit <num>] [--offset <num>]  # List all notes
 *   bun run Search.ts find_notes_with_tag "tag_name" [--task] [--completed] [--limit <num>] [--offset <num>]
 *   bun run Search.ts find_in_note <note_id> "pattern" [--case-sensitive] [--multiline] [--dotall] [--limit <num>] [--offset <num>]
 */

import {
  joplinApi,
  joplinApiPaginated,
  JoplinNote,
  JoplinTag,
  JoplinSearchResult,
  outputJson,
  outputError,
  parseArgs,
  isValidId,
} from './Client.ts';

const USAGE = `Usage:
  bun run Search.ts find_notes "query" [--task] [--completed] [--limit <num>] [--offset <num>]
  bun run Search.ts find_notes "*" [--task] [--completed] [--limit <num>] [--offset <num>]
  bun run Search.ts find_notes_with_tag "tag_name" [--task] [--completed] [--limit <num>] [--offset <num>]
  bun run Search.ts find_in_note <note_id> "pattern" [--case-sensitive] [--multiline] [--dotall] [--limit <num>] [--offset <num>]`;

/**
 * Find notes by search query
 */
async function findNotes(
  query: string,
  options: {
    task?: boolean;
    completed?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<void> {
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  let notes: JoplinSearchResult[];
  let total: number;

  if (query === '*') {
    // List all notes
    const allNotes = await joplinApiPaginated<JoplinNote>('/notes', {
      params: {
        fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed',
        order_by: 'updated_time',
        order_dir: 'DESC',
      },
    });

    // Apply filters
    let filtered = allNotes;

    if (options.task !== undefined) {
      filtered = filtered.filter((n) => (n.is_todo === 1) === options.task);
    }

    if (options.completed !== undefined) {
      filtered = filtered.filter((n) => (n.todo_completed !== 0) === options.completed);
    }

    total = filtered.length;
    notes = filtered.slice(offset, offset + limit);
  } else {
    // Use Joplin's search
    const searchParams: Record<string, string | number> = {
      query,
      fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed',
      order_by: 'updated_time',
      order_dir: 'DESC',
    };

    // The Joplin search API doesn't support pagination well for complex filters,
    // so we fetch all and filter/paginate ourselves
    const searchResults = await joplinApiPaginated<JoplinSearchResult>('/search', {
      params: searchParams,
    });

    let filtered = searchResults;

    if (options.task !== undefined) {
      filtered = filtered.filter((n) => (n.is_todo === 1) === options.task);
    }

    if (options.completed !== undefined) {
      filtered = filtered.filter((n) => (n.todo_completed !== 0) === options.completed);
    }

    total = filtered.length;
    notes = filtered.slice(offset, offset + limit);
  }

  outputJson({
    query: query === '*' ? '(all notes)' : query,
    total,
    offset,
    limit,
    has_more: offset + limit < total,
    notes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.body ? n.body.substring(0, 200) + (n.body.length > 200 ? '...' : '') : '',
      parent_id: n.parent_id,
      is_todo: n.is_todo === 1,
      todo_completed: n.todo_completed !== 0,
      created_time: new Date(n.created_time).toISOString(),
      updated_time: new Date(n.updated_time).toISOString(),
    })),
  });
}

/**
 * Find notes with a specific tag
 */
async function findNotesWithTag(
  tagName: string,
  options: {
    task?: boolean;
    completed?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<void> {
  // Find the tag
  const tags = await joplinApiPaginated<JoplinTag>('/tags', {
    params: { fields: 'id,title' },
  });

  const tag = tags.find((t) => t.title === tagName) ||
    tags.find((t) => t.title.toLowerCase() === tagName.toLowerCase());

  if (!tag) {
    outputError(`Tag '${tagName}' not found`);
  }

  // Get notes with this tag
  const allNotes = await joplinApiPaginated<JoplinNote>(`/tags/${tag!.id}/notes`, {
    params: {
      fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed',
      order_by: 'updated_time',
      order_dir: 'DESC',
    },
  });

  // Apply filters
  let notes = allNotes;

  if (options.task !== undefined) {
    notes = notes.filter((n) => (n.is_todo === 1) === options.task);
  }

  if (options.completed !== undefined) {
    notes = notes.filter((n) => (n.todo_completed !== 0) === options.completed);
  }

  const total = notes.length;
  const offset = options.offset || 0;
  const limit = options.limit || 20;
  const paginatedNotes = notes.slice(offset, offset + limit);

  outputJson({
    tag: {
      id: tag!.id,
      name: tag!.title,
    },
    total,
    offset,
    limit,
    has_more: offset + limit < total,
    notes: paginatedNotes.map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.body ? n.body.substring(0, 200) + (n.body.length > 200 ? '...' : '') : '',
      parent_id: n.parent_id,
      is_todo: n.is_todo === 1,
      todo_completed: n.todo_completed !== 0,
      created_time: new Date(n.created_time).toISOString(),
      updated_time: new Date(n.updated_time).toISOString(),
    })),
  });
}

interface RegexMatch {
  line_number: number;
  line_content: string;
  match: string;
  start_index: number;
  end_index: number;
}

/**
 * Search for a regex pattern inside a specific note
 */
async function findInNote(
  noteId: string,
  pattern: string,
  options: {
    caseSensitive?: boolean;
    multiline?: boolean;
    dotall?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  if (!pattern) {
    outputError('Pattern is required');
  }

  // Get the note content
  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title,body' },
  });

  const body = note.body || '';
  const lines = body.split('\n');

  // Build regex flags
  let flags = 'g';
  if (!options.caseSensitive) {
    flags += 'i';
  }
  if (options.multiline !== false) {
    // Default to multiline mode
    flags += 'm';
  }
  if (options.dotall) {
    flags += 's';
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch (error) {
    outputError(`Invalid regex pattern: ${error instanceof Error ? error.message : error}`);
    return; // TypeScript doesn't know outputError exits
  }

  // Find all matches with line context
  const allMatches: RegexMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    const lineRegex = new RegExp(pattern, flags);

    while ((match = lineRegex.exec(line)) !== null) {
      allMatches.push({
        line_number: i + 1,
        line_content: line,
        match: match[0],
        start_index: match.index,
        end_index: match.index + match[0].length,
      });

      // Prevent infinite loop for zero-length matches
      if (match[0].length === 0) {
        lineRegex.lastIndex++;
      }
    }
  }

  const total = allMatches.length;
  const offset = options.offset || 0;
  const limit = options.limit || 20;
  const paginatedMatches = allMatches.slice(offset, offset + limit);

  outputJson({
    note: {
      id: note.id,
      title: note.title,
    },
    pattern,
    total_matches: total,
    offset,
    limit,
    has_more: offset + limit < total,
    matches: paginatedMatches,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'find_notes':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: query is required for find_notes`);
        }
        await findNotes(positional[1], {
          task: flags.task !== undefined ? flags.task === true || flags.task === 'true' : undefined,
          completed: flags.completed !== undefined ? flags.completed === true || flags.completed === 'true' : undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
          offset: flags.offset ? parseInt(flags.offset as string, 10) : undefined,
        });
        break;

      case 'find_notes_with_tag':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: tag_name is required for find_notes_with_tag`);
        }
        await findNotesWithTag(positional[1], {
          task: flags.task !== undefined ? flags.task === true || flags.task === 'true' : undefined,
          completed: flags.completed !== undefined ? flags.completed === true || flags.completed === 'true' : undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
          offset: flags.offset ? parseInt(flags.offset as string, 10) : undefined,
        });
        break;

      case 'find_in_note':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: note_id and pattern are required for find_in_note`);
        }
        await findInNote(positional[1], positional[2], {
          caseSensitive: flags['case-sensitive'] === true,
          multiline: flags.multiline !== 'false',
          dotall: flags.dotall === true,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
          offset: flags.offset ? parseInt(flags.offset as string, 10) : undefined,
        });
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
