import { sessionStore } from '../services/session-store';

export async function handleSessionsRoute(
  url: URL,
  req: Request,
  corsHeaders: Record<string, string>
): Promise<Response | null> {
  const path = url.pathname.replace('/api/sessions', '');
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  // GET /api/sessions - List all sessions
  if (req.method === 'GET' && (path === '' || path === '/')) {
    const sessions = await sessionStore.list();
    return new Response(JSON.stringify({
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    }), { headers });
  }

  // POST /api/sessions - Create new session
  if (req.method === 'POST' && (path === '' || path === '/')) {
    try {
      const body = await req.json().catch(() => ({}));
      const session = await sessionStore.create(body.name);
      return new Response(JSON.stringify({
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
      }), { status: 201, headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers });
    }
  }

  // GET /api/sessions/:id - Get session with messages
  const getMatch = path.match(/^\/([^/]+)$/);
  if (req.method === 'GET' && getMatch) {
    const sessionId = getMatch[1];
    const session = await sessionStore.get(sessionId);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers });
    }

    return new Response(JSON.stringify({
      id: session.id,
      name: session.name,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }), { headers });
  }

  // PUT /api/sessions/:id - Rename session
  const putMatch = path.match(/^\/([^/]+)$/);
  if (req.method === 'PUT' && putMatch) {
    const sessionId = putMatch[1];
    try {
      const body = await req.json();
      if (!body.name) {
        return new Response(JSON.stringify({ error: 'Name required' }), { status: 400, headers });
      }

      const success = await sessionStore.rename(sessionId, body.name);
      if (!success) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify({ success: true }), { headers });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 400, headers });
    }
  }

  // DELETE /api/sessions/:id - Delete session
  const deleteMatch = path.match(/^\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const sessionId = deleteMatch[1];
    const success = await sessionStore.delete(sessionId);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers });
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return null;
}
