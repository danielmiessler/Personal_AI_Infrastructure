// $PAI_DIR/observability/apps/server/src/index.ts
// HTTP + WebSocket server for observability dashboard

import { startFileIngestion, getRecentEvents, getFilterOptions } from './file-ingest';

const wsClients = new Set<any>();

// Start file-based ingestion with WebSocket broadcast callback
startFileIngestion((events) => {
  events.forEach(event => {
    const message = JSON.stringify({ type: 'event', data: event });
    wsClients.forEach(client => {
      try {
        client.send(message);
      } catch (err) {
        wsClients.delete(client);
      }
    });
  });
});

const server = Bun.serve({
  port: 4000,

  async fetch(req: Request) {
    const url = new URL(req.url);

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // GET /events/filter-options
    if (url.pathname === '/events/filter-options' && req.method === 'GET') {
      const options = getFilterOptions();
      return new Response(JSON.stringify(options), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // GET /events/recent
    if (url.pathname === '/events/recent' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const events = getRecentEvents(limit);
      return new Response(JSON.stringify(events), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // GET /events/by-agent/:agentName
    if (url.pathname.startsWith('/events/by-agent/') && req.method === 'GET') {
      const agentName = decodeURIComponent(url.pathname.split('/')[3]);
      const limit = parseInt(url.searchParams.get('limit') || '100');

      if (!agentName) {
        return new Response(JSON.stringify({ error: 'Agent name is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      const allEvents = getRecentEvents(limit);
      const agentEvents = allEvents.filter(e => e.agent_name === agentName);

      return new Response(JSON.stringify(agentEvents), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/stream') {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
    }

    return new Response('PAI Observability Server', {
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
  },

  websocket: {
    open(ws) {
      console.log('WebSocket client connected');
      wsClients.add(ws);

      const events = getRecentEvents(50);
      ws.send(JSON.stringify({ type: 'initial', data: events }));
    },

    message(ws, message) {
      console.log('Received message:', message);
    },

    close(ws) {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    },

    error(ws, error) {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    }
  }
});

console.log(`🚀 Server running on http://localhost:${server.port}`);
console.log(`📊 WebSocket endpoint: ws://localhost:${server.port}/stream`);
