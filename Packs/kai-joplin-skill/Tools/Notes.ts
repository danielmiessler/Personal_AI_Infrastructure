#!/usr/bin/env bun
/**
 * Joplin Notes Tool
 * Manage Joplin notes with smart display for token efficiency
 *
 * Usage:
 *   bun run Notes.ts get <note_id> [--toc-only] [--force-full] [--section <num>] [--start-line <num>] [--line-count <num>]
 *   bun run Notes.ts create "Title" --notebook "Notebook Name" [--body "Content"] [--is-todo] [--todo-completed]
 *   bun run Notes.ts update <note_id> [--title "New Title"] [--body "New Content"] [--is-todo] [--todo-completed]
 *   bun run Notes.ts delete <note_id>
 *   bun run Notes.ts rename <note_id> "New Title"
 *   bun run Notes.ts move <note_id> <notebook_id>
 *   bun run Notes.ts find_in_notebook "Notebook Name" [--query "search text"] [--task] [--completed] [--limit <num>] [--offset <num>]
 */

import {
  joplinApi,
  joplinApiPaginated,
  JoplinNote,
  JoplinNotebook,
  outputJson,
  outputError,
  parseArgs,
  isValidId,
} from './Client.ts';

const USAGE = `Usage:
  bun run Notes.ts get <note_id> [--toc-only] [--force-full] [--section <num>] [--start-line <num>] [--line-count <num>]
  bun run Notes.ts create "Title" --notebook "Notebook Name" [--body "Content"] [--is-todo] [--todo-completed]
  bun run Notes.ts update <note_id> [--title "New Title"] [--body "New Content"] [--is-todo] [--todo-completed]
  bun run Notes.ts delete <note_id>
  bun run Notes.ts rename <note_id> "New Title"
  bun run Notes.ts move <note_id> <notebook_id>
  bun run Notes.ts find_in_notebook "Notebook Name" [--query "search text"] [--task] [--completed] [--limit <num>] [--offset <num>]`;

const LONG_NOTE_THRESHOLD = 100; // lines

/**
 * Find notebook by name
 */
async function findNotebookByName(name: string): Promise<JoplinNotebook | null> {
  const notebooks = await joplinApiPaginated<JoplinNotebook>('/folders', {
    params: { fields: 'id,title,parent_id' },
  });

  // Try exact match first
  const exactMatch = notebooks.find((nb) => nb.title === name);
  if (exactMatch) return exactMatch;

  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  return notebooks.find((nb) => nb.title.toLowerCase() === lowerName) || null;
}

/**
 * Generate table of contents from markdown content
 */
function generateToc(body: string): { level: number; text: string; slug: string; line: number }[] {
  const lines = body.split('\n');
  const toc: { level: number; text: string; slug: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      toc.push({ level, text, slug, line: i + 1 });
    }
  }

  return toc;
}

/**
 * Get a note with smart content display
 */
async function getNote(
  noteId: string,
  options: {
    tocOnly?: boolean;
    forceFull?: boolean;
    section?: string;
    startLine?: number;
    lineCount?: number;
    metadataOnly?: boolean;
  } = {}
): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed,markup_language' },
  });

  const body = note.body || '';
  const lines = body.split('\n');
  const lineCount = lines.length;
  const isLong = lineCount > LONG_NOTE_THRESHOLD;
  const toc = generateToc(body);

  // Base metadata
  const metadata = {
    id: note.id,
    title: note.title,
    parent_id: note.parent_id,
    created_time: new Date(note.created_time).toISOString(),
    updated_time: new Date(note.updated_time).toISOString(),
    is_todo: note.is_todo === 1,
    todo_completed: note.todo_completed === 1,
    line_count: lineCount,
    is_long: isLong,
  };

  // Metadata only
  if (options.metadataOnly) {
    outputJson({ ...metadata, toc });
    return;
  }

  // TOC only
  if (options.tocOnly) {
    outputJson({ ...metadata, toc, content: null });
    return;
  }

  // Section extraction
  if (options.section) {
    const sectionNum = parseInt(options.section, 10);
    let targetToc = isNaN(sectionNum)
      ? toc.find((t) => t.slug === options.section || t.text === options.section)
      : toc[sectionNum - 1];

    if (!targetToc) {
      outputError(`Section '${options.section}' not found. Available sections: ${toc.map((t) => t.text).join(', ')}`);
    }

    // Find next section at same or higher level
    const sectionIdx = toc.indexOf(targetToc!);
    const nextSection = toc.slice(sectionIdx + 1).find((t) => t.level <= targetToc!.level);
    const endLine = nextSection ? nextSection.line - 1 : lineCount;

    const sectionContent = lines.slice(targetToc!.line - 1, endLine).join('\n');
    outputJson({
      ...metadata,
      section: targetToc!.text,
      content: sectionContent,
    });
    return;
  }

  // Sequential reading
  if (options.startLine !== undefined) {
    const start = Math.max(0, options.startLine - 1);
    const count = options.lineCount || 50;
    const end = Math.min(start + count, lineCount);
    const content = lines.slice(start, end).join('\n');

    outputJson({
      ...metadata,
      start_line: start + 1,
      end_line: end,
      has_more: end < lineCount,
      content,
    });
    return;
  }

  // Smart display: short notes get full content, long notes get TOC
  if (isLong && !options.forceFull) {
    outputJson({
      ...metadata,
      toc,
      content: `Note is ${lineCount} lines. Use --force-full for full content or --start-line for sequential reading.`,
    });
    return;
  }

  // Full content
  outputJson({
    ...metadata,
    toc: toc.length > 0 ? toc : undefined,
    content: body,
  });
}

/**
 * Create a new note
 */
async function createNote(
  title: string,
  notebookName: string,
  options: {
    body?: string;
    isTodo?: boolean;
    todoCompleted?: boolean;
  } = {}
): Promise<void> {
  if (!title) {
    outputError('Note title is required');
  }

  if (!notebookName) {
    outputError('Notebook name is required (--notebook)');
  }

  const notebook = await findNotebookByName(notebookName);
  if (!notebook) {
    outputError(`Notebook '${notebookName}' not found`);
  }

  const body: Record<string, unknown> = {
    title,
    parent_id: notebook!.id,
    body: options.body || '',
  };

  if (options.isTodo) {
    body.is_todo = 1;
    if (options.todoCompleted) {
      body.todo_completed = Date.now();
    }
  }

  const note = await joplinApi<JoplinNote>('/notes', {
    method: 'POST',
    body,
  });

  outputJson({
    success: true,
    message: `Created note '${note.title}'`,
    id: note.id,
    title: note.title,
    notebook_id: note.parent_id,
    notebook_name: notebook!.title,
    is_todo: note.is_todo === 1,
  });
}

/**
 * Update an existing note
 */
async function updateNote(
  noteId: string,
  options: {
    title?: string;
    body?: string;
    isTodo?: boolean;
    todoCompleted?: boolean;
  } = {}
): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  if (!options.title && options.body === undefined && options.isTodo === undefined && options.todoCompleted === undefined) {
    outputError('At least one field must be provided to update (--title, --body, --is-todo, --todo-completed)');
  }

  const body: Record<string, unknown> = {};

  if (options.title) {
    body.title = options.title;
  }
  if (options.body !== undefined) {
    body.body = options.body;
  }
  if (options.isTodo !== undefined) {
    body.is_todo = options.isTodo ? 1 : 0;
  }
  if (options.todoCompleted !== undefined) {
    body.todo_completed = options.todoCompleted ? Date.now() : 0;
  }

  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    method: 'PUT',
    body,
  });

  outputJson({
    success: true,
    message: `Updated note '${note.title}'`,
    id: note.id,
    title: note.title,
  });
}

/**
 * Delete a note
 */
async function deleteNote(noteId: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  // Get note info first
  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title' },
  });

  await joplinApi(`/notes/${noteId}`, { method: 'DELETE' });

  outputJson({
    success: true,
    message: `Deleted note '${note.title}'`,
    id: noteId,
  });
}

/**
 * Rename a note
 */
async function renameNote(noteId: string, newTitle: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  if (!newTitle) {
    outputError('New title is required');
  }

  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    method: 'PUT',
    body: { title: newTitle },
  });

  outputJson({
    success: true,
    message: `Renamed note to '${note.title}'`,
    id: note.id,
    title: note.title,
  });
}

/**
 * Move a note to a different notebook
 */
async function moveNote(noteId: string, notebookId: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  if (!isValidId(notebookId)) {
    outputError('Invalid notebook ID. Must be 32-character hex string.');
  }

  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    method: 'PUT',
    body: { parent_id: notebookId },
  });

  outputJson({
    success: true,
    message: `Moved note to notebook ${notebookId}`,
    id: note.id,
    title: note.title,
    notebook_id: note.parent_id,
  });
}

/**
 * Find notes in a specific notebook
 */
async function findNotesInNotebook(
  notebookName: string,
  options: {
    query?: string;
    task?: boolean;
    completed?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<void> {
  const notebook = await findNotebookByName(notebookName);
  if (!notebook) {
    outputError(`Notebook '${notebookName}' not found`);
  }

  // Get all notes in the notebook
  const allNotes = await joplinApiPaginated<JoplinNote>(`/folders/${notebook!.id}/notes`, {
    params: {
      fields: 'id,title,body,created_time,updated_time,is_todo,todo_completed',
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

  if (options.query && options.query !== '*') {
    const queryLower = options.query.toLowerCase();
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(queryLower) ||
        (n.body && n.body.toLowerCase().includes(queryLower))
    );
  }

  const total = notes.length;
  const offset = options.offset || 0;
  const limit = options.limit || 20;
  const paginatedNotes = notes.slice(offset, offset + limit);

  outputJson({
    notebook: {
      id: notebook!.id,
      title: notebook!.title,
    },
    total,
    offset,
    limit,
    has_more: offset + limit < total,
    notes: paginatedNotes.map((n) => ({
      id: n.id,
      title: n.title,
      preview: n.body ? n.body.substring(0, 200) + (n.body.length > 200 ? '...' : '') : '',
      is_todo: n.is_todo === 1,
      todo_completed: n.todo_completed !== 0,
      created_time: new Date(n.created_time).toISOString(),
      updated_time: new Date(n.updated_time).toISOString(),
    })),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'get':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: note_id is required for get`);
        }
        await getNote(positional[1], {
          tocOnly: flags['toc-only'] === true,
          forceFull: flags['force-full'] === true,
          section: flags.section as string | undefined,
          startLine: flags['start-line'] ? parseInt(flags['start-line'] as string, 10) : undefined,
          lineCount: flags['line-count'] ? parseInt(flags['line-count'] as string, 10) : undefined,
          metadataOnly: flags['metadata-only'] === true,
        });
        break;

      case 'create':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: title is required for create`);
        }
        await createNote(positional[1], flags.notebook as string, {
          body: flags.body as string | undefined,
          isTodo: flags['is-todo'] === true,
          todoCompleted: flags['todo-completed'] === true,
        });
        break;

      case 'update':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: note_id is required for update`);
        }
        await updateNote(positional[1], {
          title: flags.title as string | undefined,
          body: flags.body as string | undefined,
          isTodo: flags['is-todo'] !== undefined ? flags['is-todo'] === true || flags['is-todo'] === 'true' : undefined,
          todoCompleted: flags['todo-completed'] !== undefined ? flags['todo-completed'] === true || flags['todo-completed'] === 'true' : undefined,
        });
        break;

      case 'delete':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: note_id is required for delete`);
        }
        await deleteNote(positional[1]);
        break;

      case 'rename':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: note_id and new title are required for rename`);
        }
        await renameNote(positional[1], positional[2]);
        break;

      case 'move':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: note_id and notebook_id are required for move`);
        }
        await moveNote(positional[1], positional[2]);
        break;

      case 'find_in_notebook':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: notebook name is required for find_in_notebook`);
        }
        await findNotesInNotebook(positional[1], {
          query: flags.query as string | undefined,
          task: flags.task !== undefined ? flags.task === true || flags.task === 'true' : undefined,
          completed: flags.completed !== undefined ? flags.completed === true || flags.completed === 'true' : undefined,
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
