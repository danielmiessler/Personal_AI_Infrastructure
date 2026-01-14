import { handleFilesRoute } from './routes/files';
import { handleSessionsRoute } from './routes/sessions';
import { handleKnowledgeRoute } from './routes/knowledge';
import { handleTodoRoute } from './routes/todo';
import {
  handleTerminalOpen,
  handleTerminalMessage,
  handleTerminalClose,
  handleTerminalError,
} from './routes/terminal';
import { claudeCodeService, type StreamEvent } from './services/claude-code';
import { sessionStore } from './services/session-store';
import { wikiLinkResolver } from './services/wiki-links';
import {
  initObservability,
  addObservabilityClient,
  removeObservabilityClient,
} from './services/observability';
import { join } from 'node:path';
import type { ServerWebSocket } from 'bun';

const PORT = 5050;

// ============================================================================
// Prompt Augmentation for Research Requests
// ============================================================================

const RESEARCH_PATTERNS = [
  /\bresearch\b/i,
  /\bdo research\b/i,
  /\bfind information\b/i,
  /\binvestigate\b/i,
  /\blook into\b/i,
  /\bwhat do you know about\b/i,
];

const RESEARCH_CLI_INSTRUCTION = `
IMPORTANT: For this research request, you MUST use the research CLI tool via Bash:

\`\`\`bash
# Run this command (all 3 sources in parallel):
research --all "your search query"
\`\`\`

The CLI is at ~/.config/pai/bin/research and returns JSON with results from Perplexity, Gemini, and Claude.

DO NOT use WebSearch directly. Use the research CLI instead for comprehensive multi-source results.

Now, here is the user's request:
`;

function augmentPromptIfResearch(message: string): string {
  const isResearchRequest = RESEARCH_PATTERNS.some(pattern => pattern.test(message));

  if (isResearchRequest) {
    console.log('[PromptAugment] Detected research request, adding CLI instructions');
    return RESEARCH_CLI_INSTRUCTION + message;
  }

  return message;
}
const CLIENT_DIST = join(import.meta.dir, '../../client/dist');
const DISCONNECT_GRACE_PERIOD_MS = 300000; // 5 minutes - research CLI with all 3 sources can take 3+ mins

interface WebSocketData {
  sessionId?: string;
  type?: 'chat' | 'observability' | 'terminal';
  tmuxProcess?: import('bun').Subprocess<'pipe', 'pipe', 'pipe'>;
}

// Track active sessions and their WebSocket connections
interface ActiveSession {
  ws: ServerWebSocket<WebSocketData> | null;
  disconnectedAt: number | null;
  pendingContent: string;
  pendingToolCalls: any[];
  currentTool: any;
  abortTimer: ReturnType<typeof setTimeout> | null;
}

const activeSessions = new Map<string, ActiveSession>();

function getOrCreateActiveSession(sessionId: string, ws: ServerWebSocket<WebSocketData>): ActiveSession {
  let session = activeSessions.get(sessionId);
  if (!session) {
    session = {
      ws,
      disconnectedAt: null,
      pendingContent: '',
      pendingToolCalls: [],
      currentTool: null,
      abortTimer: null,
    };
    activeSessions.set(sessionId, session);
  } else {
    // Reconnecting - clear disconnect state
    if (session.abortTimer) {
      clearTimeout(session.abortTimer);
      session.abortTimer = null;
    }
    session.ws = ws;
    session.disconnectedAt = null;
    console.log(`[WebSocket] Session ${sessionId} reconnected`);
  }
  return session;
}

function handleSessionDisconnect(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.ws = null;
  session.disconnectedAt = Date.now();

  // Only abort after grace period if process is still running
  if (claudeCodeService.isActive(sessionId)) {
    console.log(`[WebSocket] Session ${sessionId} disconnected, waiting ${DISCONNECT_GRACE_PERIOD_MS / 1000}s before abort`);
    session.abortTimer = setTimeout(async () => {
      if (session.disconnectedAt && claudeCodeService.isActive(sessionId)) {
        console.log(`[WebSocket] Grace period expired, saving partial content and aborting session ${sessionId}`);

        // Save any pending content before aborting
        if (session.pendingContent || session.pendingToolCalls.length > 0) {
          console.log(`[WebSocket] Saving partial response for ${sessionId} before abort`);
          await sessionStore.addMessage(sessionId, {
            role: 'assistant',
            content: session.pendingContent + '\n\n[Response interrupted - client disconnected]',
            timestamp: new Date().toISOString(),
            toolCalls: session.pendingToolCalls.length > 0 ? session.pendingToolCalls : undefined,
          });
        }

        claudeCodeService.abort(sessionId);
        cleanupSession(sessionId);
      }
    }, DISCONNECT_GRACE_PERIOD_MS);
  }
}

function cleanupSession(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (session?.abortTimer) {
    clearTimeout(session.abortTimer);
  }
  activeSessions.delete(sessionId);
}

// Initialize services
sessionStore.init();
wikiLinkResolver.init(); // Start indexing vault in background
initObservability(); // Start watching hook event files

// Create Bun server with HTTP and WebSocket support
const server = Bun.serve<WebSocketData>({
  port: PORT,
  hostname: '0.0.0.0', // Allow Tailscale access

  async fetch(req: Request) {
    const url = new URL(req.url);

    // CORS headers
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // API routes
    if (url.pathname.startsWith('/api/files')) {
      const response = await handleFilesRoute(url, req, headers);
      if (response) return response;
    }

    if (url.pathname.startsWith('/api/sessions')) {
      const response = await handleSessionsRoute(url, req, headers);
      if (response) return response;
    }

    if (url.pathname.startsWith('/api/knowledge')) {
      const response = await handleKnowledgeRoute(url, req, headers);
      if (response) return response;
    }

    if (url.pathname.startsWith('/api/todo')) {
      const response = await handleTodoRoute(url, req, headers);
      if (response) return response;
    }

    // Health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // WebSocket upgrade for chat (only if it's actually a WebSocket request)
    if (url.pathname === '/chat' && req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req, {
        data: { sessionId: undefined, type: 'chat' },
      });
      if (success) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // WebSocket proxy for observability stream
    if (url.pathname === '/observability/stream' && req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req, {
        data: { type: 'observability' },
      });
      if (success) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // WebSocket for terminal mirroring
    if (url.pathname === '/terminal' && req.headers.get('upgrade') === 'websocket') {
      const success = server.upgrade(req, {
        data: { type: 'terminal' },
      });
      if (success) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Serve static files from client dist
    if (url.pathname === '/' || !url.pathname.startsWith('/api')) {
      try {
        let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
        const file = Bun.file(join(CLIENT_DIST, filePath));

        if (await file.exists()) {
          return new Response(file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'Cache-Control': filePath === '/index.html' ? 'no-cache' : 'max-age=31536000',
            },
          });
        }

        // SPA fallback - serve index.html for client-side routing
        const indexFile = Bun.file(join(CLIENT_DIST, 'index.html'));
        if (await indexFile.exists()) {
          return new Response(indexFile, {
            headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' },
          });
        }
      } catch {
        // Fall through to 404
      }
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },

  websocket: {
    open(ws) {
      // Handle terminal mirroring
      if (ws.data.type === 'terminal') {
        handleTerminalOpen(ws as any);
        return;
      }

      // Handle observability - stream hook events directly from local files
      if (ws.data.type === 'observability') {
        console.log('[WebSocket] Observability client connected');
        addObservabilityClient(ws);
        return;
      }

      // Chat WebSocket
      console.log('[WebSocket] Client connected');
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
    },

    async message(ws, message) {
      // Handle terminal messages
      if (ws.data.type === 'terminal') {
        handleTerminalMessage(ws as any, message.toString());
        return;
      }

      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] Received:', data.type);

        switch (data.type) {
          case 'chat': {
            const { sessionId, message: userMessage } = data.payload;

            if (!sessionId || !userMessage) {
              ws.send(JSON.stringify({ type: 'error', payload: { error: 'Missing sessionId or message' } }));
              return;
            }

            // Get session to check for claude session ID
            const session = await sessionStore.get(sessionId);
            if (!session) {
              ws.send(JSON.stringify({ type: 'error', payload: { error: 'Session not found' } }));
              return;
            }

            // Store the user message
            await sessionStore.addMessage(sessionId, {
              role: 'user',
              content: userMessage,
              timestamp: new Date().toISOString(),
            });

            ws.data.sessionId = sessionId;

            // Track this active session with WebSocket reference
            const activeSession = getOrCreateActiveSession(sessionId, ws);
            activeSession.pendingContent = '';
            activeSession.pendingToolCalls = [];
            activeSession.currentTool = null;

            // Helper to safely send to WebSocket (may be disconnected)
            const safeSend = (data: any) => {
              const current = activeSessions.get(sessionId);
              if (current?.ws) {
                try {
                  current.ws.send(JSON.stringify(data));
                } catch (e) {
                  console.log(`[WebSocket] Failed to send to ${sessionId}, client may be disconnected`);
                }
              }
            };

            // Stream Claude response
            // Augment prompt for research requests to use CLI
            const augmentedMessage = augmentPromptIfResearch(userMessage);
            console.log(`[PromptAugment] Final message length: ${augmentedMessage.length}`);

            try {
              await claudeCodeService.streamChat(
                augmentedMessage,
                sessionId,
                (event: StreamEvent) => {
                  const active = activeSessions.get(sessionId);
                  if (!active) return;

                  switch (event.type) {
                    case 'text':
                      active.pendingContent += event.content || '';
                      safeSend({
                        type: 'chunk',
                        sessionId,
                        payload: { text: event.content },
                      });
                      break;

                    case 'tool_use':
                      active.currentTool = {
                        name: event.tool?.name,
                        input: event.tool?.input,
                      };
                      safeSend({
                        type: 'tool_start',
                        sessionId,
                        payload: {
                          toolName: event.tool?.name,
                          toolInput: event.tool?.input,
                        },
                      });
                      break;

                    case 'tool_result':
                      if (active.currentTool) {
                        active.currentTool.result = event.tool?.result;
                        active.currentTool.isError = event.tool?.isError;
                        active.pendingToolCalls.push(active.currentTool);
                        active.currentTool = null;
                      }
                      safeSend({
                        type: 'tool_result',
                        sessionId,
                        payload: {
                          result: event.tool?.result,
                          isError: event.tool?.isError,
                        },
                      });
                      break;

                    case 'result':
                      // Store claude session ID for continuation - CRITICAL for resume
                      if (event.sessionId) {
                        console.log(`[WebSocket] Saving claudeSessionId: ${event.sessionId}`);
                        sessionStore.setClaudeSessionId(sessionId, event.sessionId);
                      }

                      // Store the complete assistant message
                      if (active.pendingContent || active.pendingToolCalls.length > 0) {
                        sessionStore.addMessage(sessionId, {
                          role: 'assistant',
                          content: active.pendingContent,
                          timestamp: new Date().toISOString(),
                          toolCalls: active.pendingToolCalls.length > 0 ? active.pendingToolCalls : undefined,
                        });
                      }

                      safeSend({
                        type: 'complete',
                        sessionId,
                        payload: {
                          costUsd: event.costUsd,
                          durationMs: event.durationMs,
                          claudeSessionId: event.sessionId,
                        },
                      });

                      // Clean up active session tracking
                      cleanupSession(sessionId);
                      break;

                    case 'error':
                      safeSend({
                        type: 'error',
                        sessionId,
                        payload: { error: event.content },
                      });
                      break;

                    case 'system':
                      safeSend({
                        type: 'system',
                        sessionId,
                        payload: { message: event.content },
                      });
                      break;
                  }
                },
                {
                  resumeSessionId: session.claudeSessionId,
                  cwd: process.env.HOME,
                }
              );
            } catch (err) {
              console.error(`[WebSocket] Chat error for ${sessionId}:`, err);

              // Save partial response even on error
              const active = activeSessions.get(sessionId);
              if (active && (active.pendingContent || active.pendingToolCalls.length > 0)) {
                console.log(`[WebSocket] Saving partial response for ${sessionId}`);
                await sessionStore.addMessage(sessionId, {
                  role: 'assistant',
                  content: active.pendingContent + '\n\n[Response interrupted]',
                  timestamp: new Date().toISOString(),
                  toolCalls: active.pendingToolCalls.length > 0 ? active.pendingToolCalls : undefined,
                });
              }

              safeSend({
                type: 'error',
                sessionId,
                payload: { error: String(err) },
              });

              cleanupSession(sessionId);
            }
            break;
          }

          case 'abort': {
            const { sessionId } = data.payload;
            if (sessionId) {
              const aborted = claudeCodeService.abort(sessionId);
              ws.send(JSON.stringify({
                type: 'aborted',
                sessionId,
                payload: { success: aborted },
              }));
            }
            break;
          }

          default:
            ws.send(JSON.stringify({ type: 'error', payload: { error: `Unknown message type: ${data.type}` } }));
        }
      } catch (err) {
        console.error('[WebSocket] Error:', err);
        ws.send(JSON.stringify({ type: 'error', payload: { error: String(err) } }));
      }
    },

    close(ws) {
      // Handle terminal close
      if (ws.data.type === 'terminal') {
        handleTerminalClose(ws as any);
        return;
      }

      // Remove observability client
      if (ws.data.type === 'observability') {
        removeObservabilityClient(ws);
        return;
      }

      console.log('[WebSocket] Client disconnected');
      // Don't abort immediately - use grace period to allow process to complete
      if (ws.data.sessionId) {
        handleSessionDisconnect(ws.data.sessionId);
      }
    },

    error(ws, error) {
      // Handle terminal error
      if (ws.data.type === 'terminal') {
        handleTerminalError(ws as any, error);
        return;
      }

      // Remove observability client on error
      if (ws.data.type === 'observability') {
        console.error('[WebSocket] Observability error:', error);
        removeObservabilityClient(ws);
        return;
      }

      console.error('[WebSocket] Error:', error);
      // Don't abort immediately - use grace period
      if (ws.data.sessionId) {
        handleSessionDisconnect(ws.data.sessionId);
      }
    },
  },
});

console.log(`
==================================
   PAI Mobile App Server
==================================
   Port: ${server.port}
   API:  http://localhost:${server.port}/api
   WS:   ws://localhost:${server.port}/chat
==================================
`);
