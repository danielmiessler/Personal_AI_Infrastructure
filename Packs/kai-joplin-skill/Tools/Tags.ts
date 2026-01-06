#!/usr/bin/env bun
/**
 * Joplin Tags Tool
 * Manage Joplin tags
 *
 * Usage:
 *   bun run Tags.ts list
 *   bun run Tags.ts create "Tag Name"
 *   bun run Tags.ts delete <tag_id>
 *   bun run Tags.ts tag <note_id> "Tag Name"
 *   bun run Tags.ts untag <note_id> "Tag Name"
 *   bun run Tags.ts get_by_note <note_id>
 */

import {
  joplinApi,
  joplinApiPaginated,
  JoplinTag,
  JoplinNote,
  outputJson,
  outputError,
  parseArgs,
  isValidId,
} from './Client.ts';

const USAGE = `Usage:
  bun run Tags.ts list
  bun run Tags.ts create "Tag Name"
  bun run Tags.ts delete <tag_id>
  bun run Tags.ts tag <note_id> "Tag Name"
  bun run Tags.ts untag <note_id> "Tag Name"
  bun run Tags.ts get_by_note <note_id>`;

/**
 * Find tag by name
 */
async function findTagByName(name: string): Promise<JoplinTag | null> {
  const tags = await joplinApiPaginated<JoplinTag>('/tags', {
    params: { fields: 'id,title,created_time,updated_time' },
  });

  // Try exact match first
  const exactMatch = tags.find((t) => t.title === name);
  if (exactMatch) return exactMatch;

  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  return tags.find((t) => t.title.toLowerCase() === lowerName) || null;
}

/**
 * Get note count for a tag
 */
async function getTagNoteCount(tagId: string): Promise<number> {
  const notes = await joplinApiPaginated<JoplinNote>(`/tags/${tagId}/notes`, {
    params: { fields: 'id' },
  });
  return notes.length;
}

/**
 * List all tags with note counts
 */
async function listTags(): Promise<void> {
  const tags = await joplinApiPaginated<JoplinTag>('/tags', {
    params: { fields: 'id,title,created_time,updated_time' },
  });

  // Get note counts for each tag
  const tagsWithCounts = await Promise.all(
    tags.map(async (tag) => ({
      id: tag.id,
      title: tag.title,
      note_count: await getTagNoteCount(tag.id),
      created_time: new Date(tag.created_time).toISOString(),
      updated_time: new Date(tag.updated_time).toISOString(),
    }))
  );

  outputJson({
    count: tags.length,
    tags: tagsWithCounts,
  });
}

/**
 * Create a new tag
 */
async function createTag(title: string): Promise<void> {
  if (!title) {
    outputError('Tag title is required');
  }

  // Check if tag already exists
  const existing = await findTagByName(title);
  if (existing) {
    outputJson({
      success: true,
      message: `Tag '${existing.title}' already exists`,
      id: existing.id,
      title: existing.title,
      already_existed: true,
    });
    return;
  }

  const tag = await joplinApi<JoplinTag>('/tags', {
    method: 'POST',
    body: { title },
  });

  outputJson({
    success: true,
    message: `Created tag '${tag.title}'`,
    id: tag.id,
    title: tag.title,
    already_existed: false,
  });
}

/**
 * Delete a tag
 */
async function deleteTag(tagId: string): Promise<void> {
  if (!isValidId(tagId)) {
    outputError('Invalid tag ID. Must be 32-character hex string.');
  }

  // Get tag info first
  const tag = await joplinApi<JoplinTag>(`/tags/${tagId}`, {
    params: { fields: 'id,title' },
  });

  await joplinApi(`/tags/${tagId}`, { method: 'DELETE' });

  outputJson({
    success: true,
    message: `Deleted tag '${tag.title}'`,
    id: tagId,
  });
}

/**
 * Add a tag to a note
 */
async function tagNote(noteId: string, tagName: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  if (!tagName) {
    outputError('Tag name is required');
  }

  // Find or create the tag
  let tag = await findTagByName(tagName);
  if (!tag) {
    // Create the tag
    tag = await joplinApi<JoplinTag>('/tags', {
      method: 'POST',
      body: { title: tagName },
    });
  }

  // Get note info for response
  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title' },
  });

  // Add note to tag
  await joplinApi(`/tags/${tag.id}/notes`, {
    method: 'POST',
    body: { id: noteId },
  });

  outputJson({
    success: true,
    message: `Added tag '${tag.title}' to note '${note.title}'`,
    note_id: noteId,
    note_title: note.title,
    tag_id: tag.id,
    tag_name: tag.title,
  });
}

/**
 * Remove a tag from a note
 */
async function untagNote(noteId: string, tagName: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  if (!tagName) {
    outputError('Tag name is required');
  }

  // Find the tag
  const tag = await findTagByName(tagName);
  if (!tag) {
    outputError(`Tag '${tagName}' not found`);
  }

  // Get note info for response
  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title' },
  });

  // Remove note from tag
  await joplinApi(`/tags/${tag!.id}/notes/${noteId}`, {
    method: 'DELETE',
  });

  outputJson({
    success: true,
    message: `Removed tag '${tag!.title}' from note '${note.title}'`,
    note_id: noteId,
    note_title: note.title,
    tag_id: tag!.id,
    tag_name: tag!.title,
  });
}

/**
 * Get all tags for a note
 */
async function getTagsByNote(noteId: string): Promise<void> {
  if (!isValidId(noteId)) {
    outputError('Invalid note ID. Must be 32-character hex string.');
  }

  // Get note info
  const note = await joplinApi<JoplinNote>(`/notes/${noteId}`, {
    params: { fields: 'id,title' },
  });

  // Get tags for note
  const tags = await joplinApiPaginated<JoplinTag>(`/notes/${noteId}/tags`, {
    params: { fields: 'id,title,created_time' },
  });

  outputJson({
    note: {
      id: note.id,
      title: note.title,
    },
    count: tags.length,
    tags: tags.map((t) => ({
      id: t.id,
      title: t.title,
      created_time: new Date(t.created_time).toISOString(),
    })),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'list':
        await listTags();
        break;

      case 'create':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: tag title is required for create`);
        }
        await createTag(positional[1]);
        break;

      case 'delete':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: tag_id is required for delete`);
        }
        await deleteTag(positional[1]);
        break;

      case 'tag':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: note_id and tag name are required for tag`);
        }
        await tagNote(positional[1], positional[2]);
        break;

      case 'untag':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: note_id and tag name are required for untag`);
        }
        await untagNote(positional[1], positional[2]);
        break;

      case 'get_by_note':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: note_id is required for get_by_note`);
        }
        await getTagsByNote(positional[1]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
