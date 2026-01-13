import { readdir, stat, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { homedir } from 'node:os';
import type { FileEntry, FileListResponse, FileReadResponse, SearchResult } from '../types';

const HOME = homedir();
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.jsonl': 'application/x-ndjson',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.jsx': 'text/javascript',
  '.tsx': 'text/typescript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.xml': 'text/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.sh': 'text/x-shellscript',
  '.bash': 'text/x-shellscript',
  '.zsh': 'text/x-shellscript',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.h': 'text/x-c',
  '.hpp': 'text/x-c++',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.sql': 'text/x-sql',
  '.toml': 'text/x-toml',
  '.ini': 'text/x-ini',
  '.env': 'text/plain',
  '.log': 'text/plain',
  '.csv': 'text/csv',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  // MS Office
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
};

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function isTextFile(mimeType: string): boolean {
  return mimeType.startsWith('text/') ||
         mimeType === 'application/json' ||
         mimeType === 'application/x-ndjson' ||
         mimeType === 'image/svg+xml';
}

function normalizePath(path: string): string {
  // Expand ~ to home directory
  if (path.startsWith('~')) {
    path = path.replace('~', HOME);
  }
  // Ensure path is within allowed scope (home directory)
  if (!path.startsWith(HOME)) {
    throw new Error('Access denied: path outside home directory');
  }
  return path;
}

export async function listDirectory(path: string): Promise<FileListResponse> {
  const normalizedPath = normalizePath(path || HOME);

  const entries = await readdir(normalizedPath, { withFileTypes: true });

  const fileEntries: FileEntry[] = await Promise.all(
    entries
      .filter(entry => !entry.name.startsWith('.')) // Hide dotfiles by default
      .map(async (entry) => {
        const fullPath = join(normalizedPath, entry.name);
        try {
          const stats = await stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            extension: entry.isDirectory() ? null : extname(entry.name).toLowerCase() || null,
          };
        } catch {
          // Handle permission errors gracefully
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: 0,
            mtime: new Date().toISOString(),
            extension: null,
          };
        }
      })
  );

  // Sort: directories first, then alphabetically
  fileEntries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return { entries: fileEntries, path: normalizedPath };
}

export async function listDirectoryWithHidden(path: string): Promise<FileListResponse> {
  const normalizedPath = normalizePath(path || HOME);

  const entries = await readdir(normalizedPath, { withFileTypes: true });

  const fileEntries: FileEntry[] = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(normalizedPath, entry.name);
      try {
        const stats = await stat(fullPath);
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          extension: entry.isDirectory() ? null : extname(entry.name).toLowerCase() || null,
        };
      } catch {
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: 0,
          mtime: new Date().toISOString(),
          extension: null,
        };
      }
    })
  );

  fileEntries.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });

  return { entries: fileEntries, path: normalizedPath };
}

export async function readFileContent(path: string): Promise<FileReadResponse> {
  const normalizedPath = normalizePath(path);

  const stats = await stat(normalizedPath);

  if (stats.isDirectory()) {
    throw new Error('Cannot read directory as file');
  }

  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  const mimeType = getMimeType(normalizedPath);

  if (!isTextFile(mimeType)) {
    // For binary files, return base64
    const buffer = await readFile(normalizedPath);
    return {
      content: buffer.toString('base64'),
      mimeType: mimeType + ';base64',
      size: stats.size,
      path: normalizedPath,
    };
  }

  const content = await readFile(normalizedPath, 'utf-8');

  return {
    content,
    mimeType,
    size: stats.size,
    path: normalizedPath,
  };
}

export async function getFileStat(path: string): Promise<FileEntry> {
  const normalizedPath = normalizePath(path);
  const stats = await stat(normalizedPath);

  return {
    name: basename(normalizedPath),
    path: normalizedPath,
    isDirectory: stats.isDirectory(),
    size: stats.size,
    mtime: stats.mtime.toISOString(),
    extension: stats.isDirectory() ? null : extname(normalizedPath).toLowerCase() || null,
  };
}

export async function searchFiles(query: string, rootPath?: string): Promise<SearchResult[]> {
  const root = normalizePath(rootPath || HOME);
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const maxResults = 50;

  async function walk(dir: string, depth: number = 0): Promise<void> {
    if (depth > 5 || results.length >= maxResults) return; // Limit depth and results

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (entry.name.startsWith('.')) continue; // Skip hidden

        const fullPath = join(dir, entry.name);
        const nameLower = entry.name.toLowerCase();

        // Check filename match
        if (nameLower.includes(queryLower)) {
          results.push({
            path: fullPath,
            name: entry.name,
            matches: [entry.name],
            score: nameLower === queryLower ? 100 : 50,
          });
        }

        // Recurse into directories
        if (entry.isDirectory()) {
          await walk(fullPath, depth + 1);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await walk(root);

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

export interface FileDownload {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}

export async function downloadFile(path: string): Promise<FileDownload> {
  const normalizedPath = normalizePath(path);
  const stats = await stat(normalizedPath);

  if (stats.isDirectory()) {
    throw new Error('Cannot download directory');
  }

  const buffer = await readFile(normalizedPath);
  const mimeType = getMimeType(normalizedPath);
  const filename = basename(normalizedPath);

  return {
    buffer,
    mimeType,
    filename,
    size: stats.size,
  };
}

export { HOME, normalizePath, getMimeType };
