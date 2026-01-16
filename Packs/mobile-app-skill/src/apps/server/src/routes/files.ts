import {
  listDirectory,
  listDirectoryWithHidden,
  readFileContent,
  getFileStat,
  searchFiles,
  downloadFile,
  HOME,
} from '../services/file-system';

export async function handleFilesRoute(
  url: URL,
  req: Request,
  headers: Record<string, string>
): Promise<Response | null> {
  const pathname = url.pathname;

  // GET /api/files/list - List directory contents
  if (pathname === '/api/files/list' && req.method === 'GET') {
    try {
      const path = url.searchParams.get('path') || HOME;
      const showHidden = url.searchParams.get('hidden') === 'true';

      const result = showHidden
        ? await listDirectoryWithHidden(path)
        : await listDirectory(path);

      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /api/files/read - Read file contents
  if (pathname === '/api/files/read' && req.method === 'GET') {
    try {
      const path = url.searchParams.get('path');
      if (!path) {
        return new Response(
          JSON.stringify({ error: 'path parameter required' }),
          {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
          }
        );
      }

      const result = await readFileContent(path);

      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('ENOENT') ? 404 : 400;
      return new Response(
        JSON.stringify({ error: message }),
        {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /api/files/stat - Get file/directory info
  if (pathname === '/api/files/stat' && req.method === 'GET') {
    try {
      const path = url.searchParams.get('path');
      if (!path) {
        return new Response(
          JSON.stringify({ error: 'path parameter required' }),
          {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
          }
        );
      }

      const result = await getFileStat(path);

      return new Response(JSON.stringify(result), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('ENOENT') ? 404 : 400;
      return new Response(
        JSON.stringify({ error: message }),
        {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /api/files/search - Search for files
  if (pathname === '/api/files/search' && req.method === 'GET') {
    try {
      const query = url.searchParams.get('q');
      const path = url.searchParams.get('path') || HOME;

      if (!query) {
        return new Response(
          JSON.stringify({ error: 'q parameter required' }),
          {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
          }
        );
      }

      const results = await searchFiles(query, path);

      return new Response(JSON.stringify({ results }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // GET /api/files/download - Download file (raw binary)
  if (pathname === '/api/files/download' && req.method === 'GET') {
    try {
      const path = url.searchParams.get('path');
      if (!path) {
        return new Response(
          JSON.stringify({ error: 'path parameter required' }),
          {
            status: 400,
            headers: { ...headers, 'Content-Type': 'application/json' },
          }
        );
      }

      const file = await downloadFile(path);

      return new Response(file.buffer, {
        headers: {
          ...headers,
          'Content-Type': file.mimeType,
          'Content-Disposition': `attachment; filename="${file.filename}"`,
          'Content-Length': file.size.toString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('ENOENT') ? 404 : 400;
      return new Response(
        JSON.stringify({ error: message }),
        {
          status,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return null; // Not handled
}
