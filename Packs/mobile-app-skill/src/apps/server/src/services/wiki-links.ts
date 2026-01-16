import { readdir, readFile } from 'node:fs/promises';
import { join, basename, dirname, relative } from 'node:path';

export interface NoteIndex {
  path: string;           // Full path to file
  name: string;           // Note name without extension
  folder: string;         // Folder path relative to vault
  mtime: number;          // Last modified time
}

export interface WikiLink {
  raw: string;            // Original [[link]] content
  target: string;         // Target note name
  alias?: string;         // Display alias if [[target|alias]]
  heading?: string;       // Heading if [[target#heading]]
}

export interface BackLink {
  from: string;           // Path of note containing the link
  fromName: string;       // Name of note containing the link
  context?: string;       // Surrounding text context
}

const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || join(process.env.HOME || '', 'Documents/personal');

class WikiLinkResolver {
  private index = new Map<string, NoteIndex>();  // lowercase name → NoteIndex
  private pathIndex = new Map<string, NoteIndex>(); // full path → NoteIndex
  private backlinks = new Map<string, BackLink[]>(); // target path → backlinks
  private initialized = false;
  private initializing = false;

  async init(): Promise<void> {
    if (this.initialized || this.initializing) return;
    this.initializing = true;

    console.log('[WikiLinks] Building index...');
    const startTime = Date.now();

    try {
      await this.indexDirectory(VAULT_PATH);
      await this.buildBacklinks();

      console.log(`[WikiLinks] Indexed ${this.index.size} notes in ${Date.now() - startTime}ms`);
      this.initialized = true;
    } catch (err) {
      console.error('[WikiLinks] Failed to build index:', err);
    } finally {
      this.initializing = false;
    }
  }

  private async indexDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        // Skip hidden files/folders and common non-note directories
        if (entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === '.obsidian' ||
            entry.name === '.trash') {
          continue;
        }

        if (entry.isDirectory()) {
          await this.indexDirectory(fullPath);
        } else if (entry.name.endsWith('.md')) {
          const name = basename(entry.name, '.md');
          const folder = relative(VAULT_PATH, dirname(fullPath));

          const stat = await Bun.file(fullPath).stat();

          const noteIndex: NoteIndex = {
            path: fullPath,
            name,
            folder,
            mtime: stat?.mtime?.getTime() || Date.now(),
          };

          // Index by lowercase name for case-insensitive lookup
          this.index.set(name.toLowerCase(), noteIndex);
          this.pathIndex.set(fullPath, noteIndex);
        }
      }
    } catch (err) {
      // Ignore permission errors
    }
  }

  private async buildBacklinks(): Promise<void> {
    const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;

    for (const [path, note] of this.pathIndex) {
      try {
        const content = await readFile(path, 'utf-8');
        const matches = content.matchAll(wikiLinkPattern);

        for (const match of matches) {
          const link = this.parseWikiLink(match[1]);
          const resolved = this.resolve(link.target);

          if (resolved) {
            const existing = this.backlinks.get(resolved.path) || [];

            // Extract context around the link
            const linkIndex = match.index || 0;
            const contextStart = Math.max(0, linkIndex - 50);
            const contextEnd = Math.min(content.length, linkIndex + match[0].length + 50);
            const context = content.slice(contextStart, contextEnd).replace(/\n/g, ' ').trim();

            existing.push({
              from: path,
              fromName: note.name,
              context: contextStart > 0 ? '...' + context : context,
            });

            this.backlinks.set(resolved.path, existing);
          }
        }
      } catch (err) {
        // Skip files we can't read
      }
    }
  }

  parseWikiLink(linkContent: string): WikiLink {
    let target = linkContent;
    let alias: string | undefined;
    let heading: string | undefined;

    // Handle alias: [[target|alias]]
    const pipeIndex = linkContent.indexOf('|');
    if (pipeIndex !== -1) {
      target = linkContent.slice(0, pipeIndex);
      alias = linkContent.slice(pipeIndex + 1);
    }

    // Handle heading: [[target#heading]]
    const hashIndex = target.indexOf('#');
    if (hashIndex !== -1) {
      heading = target.slice(hashIndex + 1);
      target = target.slice(0, hashIndex);
    }

    return { raw: linkContent, target: target.trim(), alias, heading };
  }

  resolve(linkTarget: string): NoteIndex | null {
    // Normalize the target
    const normalized = linkTarget.toLowerCase().trim();

    // Direct name match
    if (this.index.has(normalized)) {
      return this.index.get(normalized)!;
    }

    // Try with path (folder/note)
    if (linkTarget.includes('/')) {
      const name = basename(linkTarget).toLowerCase();
      if (this.index.has(name)) {
        const note = this.index.get(name)!;
        // Verify the folder matches
        if (note.folder.toLowerCase().endsWith(dirname(linkTarget).toLowerCase())) {
          return note;
        }
      }
    }

    return null;
  }

  getBacklinks(notePath: string): BackLink[] {
    return this.backlinks.get(notePath) || [];
  }

  async getRecentNotes(limit = 50): Promise<NoteIndex[]> {
    await this.init();

    return Array.from(this.pathIndex.values())
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit);
  }

  async searchNotes(query: string, limit = 20): Promise<NoteIndex[]> {
    await this.init();

    const lowerQuery = query.toLowerCase();
    const results: NoteIndex[] = [];

    for (const note of this.pathIndex.values()) {
      if (note.name.toLowerCase().includes(lowerQuery)) {
        results.push(note);
        if (results.length >= limit) break;
      }
    }

    // Sort by relevance (exact match first, then by recency)
    return results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery;
      const bExact = b.name.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return b.mtime - a.mtime;
    });
  }

  async fullTextSearch(query: string, limit = 20): Promise<Array<NoteIndex & { snippet: string }>> {
    await this.init();

    const lowerQuery = query.toLowerCase();
    const results: Array<NoteIndex & { snippet: string }> = [];

    for (const note of this.pathIndex.values()) {
      try {
        const content = await readFile(note.path, 'utf-8');
        const lowerContent = content.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);

        if (index !== -1) {
          // Extract snippet around match
          const start = Math.max(0, index - 40);
          const end = Math.min(content.length, index + query.length + 40);
          let snippet = content.slice(start, end).replace(/\n/g, ' ').trim();
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';

          results.push({ ...note, snippet });
          if (results.length >= limit) break;
        }
      } catch (err) {
        // Skip unreadable files
      }
    }

    return results;
  }

  getVaultPath(): string {
    return VAULT_PATH;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const wikiLinkResolver = new WikiLinkResolver();
