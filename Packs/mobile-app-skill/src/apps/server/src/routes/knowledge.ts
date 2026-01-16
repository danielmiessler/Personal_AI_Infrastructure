import { readFile } from 'node:fs/promises';
import { wikiLinkResolver } from '../services/wiki-links';

interface Frontmatter {
  [key: string]: any;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const frontmatter: Frontmatter = {};
  let body = content;

  if (content.startsWith('---')) {
    const endIndex = content.indexOf('---', 3);
    if (endIndex !== -1) {
      const yamlContent = content.slice(3, endIndex).trim();
      body = content.slice(endIndex + 3).trim();

      // Simple YAML parsing for common cases
      for (const line of yamlContent.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();

          // Remove quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          frontmatter[key] = value;
        }
      }
    }
  }

  return { frontmatter, body };
}

function extractWikiLinks(content: string): string[] {
  const pattern = /\[\[([^\]|#]+)(?:[|#][^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const target = match[1].trim();
    if (!links.includes(target)) {
      links.push(target);
    }
  }

  return links;
}

export async function handleKnowledgeRoute(
  url: URL,
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const path = url.pathname.replace('/api/knowledge', '');
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  // Initialize the wiki-link resolver
  await wikiLinkResolver.init();

  // GET /api/knowledge/notes - List recent notes
  if (req.method === 'GET' && (path === '/notes' || path === '/notes/')) {
    const folder = url.searchParams.get('folder');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const notes = await wikiLinkResolver.getRecentNotes(limit);

    // Filter by folder if specified
    const filtered = folder
      ? notes.filter(n => n.folder.startsWith(folder))
      : notes;

    return new Response(JSON.stringify({
      notes: filtered.map(n => ({
        name: n.name,
        path: n.path,
        folder: n.folder,
        mtime: new Date(n.mtime).toISOString(),
      })),
      vaultPath: wikiLinkResolver.getVaultPath(),
    }), { headers });
  }

  // GET /api/knowledge/note - Get single note with content
  if (req.method === 'GET' && path === '/note') {
    const notePath = url.searchParams.get('path');

    if (!notePath) {
      return new Response(JSON.stringify({ error: 'Path required' }), { status: 400, headers });
    }

    try {
      const content = await readFile(notePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const wikiLinks = extractWikiLinks(content);
      const backlinks = wikiLinkResolver.getBacklinks(notePath);

      return new Response(JSON.stringify({
        path: notePath,
        content: body,
        frontmatter,
        wikiLinks,
        backlinks: backlinks.map(b => ({
          name: b.fromName,
          path: b.from,
          context: b.context,
        })),
      }), { headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404, headers });
    }
  }

  // GET /api/knowledge/resolve - Resolve a wiki-link
  if (req.method === 'GET' && path === '/resolve') {
    const link = url.searchParams.get('link');

    if (!link) {
      return new Response(JSON.stringify({ error: 'Link required' }), { status: 400, headers });
    }

    const resolved = wikiLinkResolver.resolve(link);

    if (resolved) {
      return new Response(JSON.stringify({
        resolved: true,
        path: resolved.path,
        name: resolved.name,
        folder: resolved.folder,
      }), { headers });
    }

    // Try to find suggestions
    const suggestions = await wikiLinkResolver.searchNotes(link, 5);

    return new Response(JSON.stringify({
      resolved: false,
      suggestions: suggestions.map(s => ({
        name: s.name,
        path: s.path,
        folder: s.folder,
      })),
    }), { headers });
  }

  // GET /api/knowledge/search - Search notes
  if (req.method === 'GET' && path === '/search') {
    const query = url.searchParams.get('q');
    const fullText = url.searchParams.get('fullText') === 'true';

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query required' }), { status: 400, headers });
    }

    if (fullText) {
      const results = await wikiLinkResolver.fullTextSearch(query);
      return new Response(JSON.stringify({
        results: results.map(r => ({
          name: r.name,
          path: r.path,
          folder: r.folder,
          snippet: r.snippet,
        })),
      }), { headers });
    } else {
      const results = await wikiLinkResolver.searchNotes(query);
      return new Response(JSON.stringify({
        results: results.map(r => ({
          name: r.name,
          path: r.path,
          folder: r.folder,
        })),
      }), { headers });
    }
  }

  return null;
}
