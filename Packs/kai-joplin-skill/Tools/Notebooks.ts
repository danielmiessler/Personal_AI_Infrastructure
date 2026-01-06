#!/usr/bin/env bun
/**
 * Joplin Notebooks Tool
 * Manage Joplin notebooks (folders)
 *
 * Usage:
 *   bun run Notebooks.ts list
 *   bun run Notebooks.ts create "Notebook Name" [--parent <parent_id>]
 *   bun run Notebooks.ts delete <notebook_id>
 *   bun run Notebooks.ts rename <notebook_id> "New Name"
 *   bun run Notebooks.ts move <notebook_id> <parent_id>  (use "" for root)
 *   bun run Notebooks.ts get <notebook_id>
 */

import {
  joplinApi,
  joplinApiPaginated,
  JoplinNotebook,
  outputJson,
  outputError,
  parseArgs,
  isValidId,
} from './Client.ts';

const USAGE = `Usage:
  bun run Notebooks.ts list
  bun run Notebooks.ts create "Notebook Name" [--parent <parent_id>]
  bun run Notebooks.ts delete <notebook_id>
  bun run Notebooks.ts rename <notebook_id> "New Name"
  bun run Notebooks.ts move <notebook_id> <parent_id>
  bun run Notebooks.ts get <notebook_id>`;

interface NotebookWithChildren extends JoplinNotebook {
  children?: NotebookWithChildren[];
}

/**
 * Build a tree structure from flat notebook list
 */
function buildNotebookTree(notebooks: JoplinNotebook[]): NotebookWithChildren[] {
  const notebookMap = new Map<string, NotebookWithChildren>();
  const roots: NotebookWithChildren[] = [];

  // First pass: create all nodes
  for (const notebook of notebooks) {
    notebookMap.set(notebook.id, { ...notebook, children: [] });
  }

  // Second pass: build tree
  for (const notebook of notebooks) {
    const node = notebookMap.get(notebook.id)!;
    if (notebook.parent_id && notebookMap.has(notebook.parent_id)) {
      const parent = notebookMap.get(notebook.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Format notebook for display (matching MCP format)
 */
function formatNotebook(notebook: JoplinNotebook, parentTitle?: string): string {
  const parts = [
    `Title: ${notebook.title}`,
    `ID: ${notebook.id}`,
  ];
  if (parentTitle) {
    parts.push(`Parent: ${parentTitle}`);
  }
  parts.push(`Created: ${new Date(notebook.created_time).toISOString()}`);
  return parts.join('\n');
}

/**
 * List all notebooks
 */
async function listNotebooks(): Promise<void> {
  const notebooks = await joplinApiPaginated<JoplinNotebook>('/folders', {
    params: { fields: 'id,title,parent_id,created_time,updated_time' },
  });

  // Build a map for parent lookups
  const notebookMap = new Map<string, JoplinNotebook>();
  for (const nb of notebooks) {
    notebookMap.set(nb.id, nb);
  }

  // Format output similar to MCP
  const formatted = notebooks.map((nb) => {
    const parentNb = nb.parent_id ? notebookMap.get(nb.parent_id) : null;
    return formatNotebook(nb, parentNb?.title);
  });

  outputJson({
    count: notebooks.length,
    notebooks: notebooks.map((nb) => ({
      id: nb.id,
      title: nb.title,
      parent_id: nb.parent_id || null,
      parent_title: nb.parent_id ? notebookMap.get(nb.parent_id)?.title || null : null,
      created_time: new Date(nb.created_time).toISOString(),
      updated_time: new Date(nb.updated_time).toISOString(),
    })),
  });
}

/**
 * Get a single notebook
 */
async function getNotebook(notebookId: string): Promise<void> {
  if (!isValidId(notebookId)) {
    outputError('Invalid notebook ID. Must be 32-character hex string.');
  }

  const notebook = await joplinApi<JoplinNotebook>(`/folders/${notebookId}`, {
    params: { fields: 'id,title,parent_id,created_time,updated_time' },
  });

  outputJson({
    id: notebook.id,
    title: notebook.title,
    parent_id: notebook.parent_id || null,
    created_time: new Date(notebook.created_time).toISOString(),
    updated_time: new Date(notebook.updated_time).toISOString(),
  });
}

/**
 * Create a new notebook
 */
async function createNotebook(title: string, parentId?: string): Promise<void> {
  if (!title) {
    outputError('Notebook title is required');
  }

  if (parentId && !isValidId(parentId)) {
    outputError('Invalid parent ID. Must be 32-character hex string.');
  }

  const body: Record<string, unknown> = { title };
  if (parentId) {
    body.parent_id = parentId;
  }

  const notebook = await joplinApi<JoplinNotebook>('/folders', {
    method: 'POST',
    body,
  });

  outputJson({
    success: true,
    message: `Created notebook '${notebook.title}'`,
    id: notebook.id,
    title: notebook.title,
    parent_id: notebook.parent_id || null,
  });
}

/**
 * Delete a notebook
 */
async function deleteNotebook(notebookId: string): Promise<void> {
  if (!isValidId(notebookId)) {
    outputError('Invalid notebook ID. Must be 32-character hex string.');
  }

  // Get notebook info first
  const notebook = await joplinApi<JoplinNotebook>(`/folders/${notebookId}`, {
    params: { fields: 'id,title' },
  });

  await joplinApi(`/folders/${notebookId}`, { method: 'DELETE' });

  outputJson({
    success: true,
    message: `Deleted notebook '${notebook.title}'`,
    id: notebookId,
  });
}

/**
 * Rename a notebook
 */
async function renameNotebook(notebookId: string, newTitle: string): Promise<void> {
  if (!isValidId(notebookId)) {
    outputError('Invalid notebook ID. Must be 32-character hex string.');
  }

  if (!newTitle) {
    outputError('New title is required');
  }

  const notebook = await joplinApi<JoplinNotebook>(`/folders/${notebookId}`, {
    method: 'PUT',
    body: { title: newTitle },
  });

  outputJson({
    success: true,
    message: `Renamed notebook to '${notebook.title}'`,
    id: notebook.id,
    title: notebook.title,
  });
}

/**
 * Move a notebook to a new parent
 */
async function moveNotebook(notebookId: string, parentId: string): Promise<void> {
  if (!isValidId(notebookId)) {
    outputError('Invalid notebook ID. Must be 32-character hex string.');
  }

  // Empty string or "root" means move to root
  const actualParentId = parentId === '' || parentId === 'root' ? '' : parentId;

  if (actualParentId && !isValidId(actualParentId)) {
    outputError('Invalid parent ID. Must be 32-character hex string or empty for root.');
  }

  const notebook = await joplinApi<JoplinNotebook>(`/folders/${notebookId}`, {
    method: 'PUT',
    body: { parent_id: actualParentId },
  });

  outputJson({
    success: true,
    message: actualParentId
      ? `Moved notebook to parent ${actualParentId}`
      : `Moved notebook to root level`,
    id: notebook.id,
    title: notebook.title,
    parent_id: notebook.parent_id || null,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'list':
        await listNotebooks();
        break;

      case 'get':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: notebook_id is required for get`);
        }
        await getNotebook(positional[1]);
        break;

      case 'create':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: notebook title is required for create`);
        }
        await createNotebook(positional[1], flags.parent as string | undefined);
        break;

      case 'delete':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: notebook_id is required for delete`);
        }
        await deleteNotebook(positional[1]);
        break;

      case 'rename':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: notebook_id and new title are required for rename`);
        }
        await renameNotebook(positional[1], positional[2]);
        break;

      case 'move':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: notebook_id is required for move`);
        }
        await moveNotebook(positional[1], positional[2] || '');
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
