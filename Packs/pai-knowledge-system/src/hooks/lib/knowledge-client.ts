/**
 * Knowledge Client for Hooks
 *
 * Lightweight client for hook integration with the knowledge graph MCP.
 * Uses SSE transport to communicate with the Graphiti MCP server.
 * Designed for fail-safe operation with timeouts and graceful degradation.
 */

import { sanitizeGroupId } from "./lucene.js";

export interface KnowledgeClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

export interface AddEpisodeParams {
  name: string;
  episode_body: string;
  source?: string;
  source_description?: string;
  reference_timestamp?: string;
  group_id?: string;
}

export interface AddEpisodeResult {
  success: boolean;
  uuid?: string;
  error?: string;
}

interface SSESession {
  sessionId: string;
  messagesUrl: string;
  initialized: boolean;
}

const DEFAULT_CONFIG: KnowledgeClientConfig = {
  baseURL: process.env.PAI_KNOWLEDGE_MCP_URL || 'http://localhost:8000',
  timeout: parseInt(process.env.PAI_KNOWLEDGE_TIMEOUT || '15000', 10),
  retries: parseInt(process.env.PAI_KNOWLEDGE_RETRIES || '3', 10)
};

/**
 * Parse SSE event data from response text
 */
function parseSSEEvent(text: string): { event?: string; data?: string } {
  const lines = text.split('\n');
  let event: string | undefined;
  let data: string | undefined;

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data = line.slice(5).trim();
    }
  }

  return { event, data };
}

/**
 * Get SSE session endpoint from the server
 */
async function getSSESession(config: KnowledgeClientConfig): Promise<SSESession | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const sseUrl = `${config.baseURL}/sse`;
    const response = await fetch(sseUrl, {
      headers: { 'Accept': 'text/event-stream' },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    // Read just enough to get the endpoint event
    const reader = response.body?.getReader();
    if (!reader) {
      return null;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    // Read chunks until we get the endpoint
    for (let i = 0; i < 10; i++) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Check if we have a complete event
      if (buffer.includes('\n\n') || buffer.includes('data:')) {
        const { event, data } = parseSSEEvent(buffer);

        if (event === 'endpoint' && data) {
          // Cancel the reader - we have what we need
          reader.cancel().catch(() => {});

          // Extract session ID from the messages URL
          const sessionMatch = data.match(/session_id=([a-f0-9]+)/);
          const sessionId = sessionMatch?.[1] || '';

          return {
            sessionId,
            messagesUrl: `${config.baseURL}${data}`,
            initialized: false
          };
        }
      }
    }

    reader.cancel().catch(() => {});
    return null;
  } catch {
    return null;
  }
}

/**
 * Initialize MCP session with server capabilities
 */
async function initializeSession(
  session: SSESession,
  config: KnowledgeClientConfig
): Promise<boolean> {
  if (session.initialized) {
    return true;
  }

  const initRequest = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'pai-knowledge-hook',
        version: '1.0.0'
      }
    }
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(session.messagesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initRequest),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (response.ok || response.status === 202) {
      // Send initialized notification
      const notifyRequest = {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      };

      await fetch(session.messagesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifyRequest)
      }).catch(() => {});

      session.initialized = true;
      // Pause to let server process initialization
      // SSE transport queues requests asynchronously, so we need to wait
      // for the server to finish processing initialize before sending tools/call
      await new Promise(r => setTimeout(r, 800));
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Check if MCP server is healthy by attempting SSE connection
 */
export async function checkHealth(config: KnowledgeClientConfig = DEFAULT_CONFIG): Promise<boolean> {
  const session = await getSSESession(config);
  return session !== null;
}

/**
 * Send JSON-RPC request via SSE messages endpoint
 */
async function sendRequest(
  session: SSESession,
  request: object,
  config: KnowledgeClientConfig
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeout);

    const response = await fetch(session.messagesUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 100)}`
      };
    }

    // For SSE transport, 202 Accepted means the request was queued
    // The actual result comes via SSE stream, but for add_memory we don't need to wait
    if (response.status === 202) {
      return { success: true };
    }

    // Try to parse JSON response if available
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      if (data.error) {
        return {
          success: false,
          error: data.error.message || 'Unknown MCP error'
        };
      }
      return { success: true, result: data.result };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Add an episode to the knowledge graph
 */
export async function addEpisode(
  params: AddEpisodeParams,
  config: KnowledgeClientConfig = DEFAULT_CONFIG
): Promise<AddEpisodeResult> {
  // Sanitize group_id to avoid RediSearch/Lucene syntax errors
  const sanitizedGroupId = sanitizeGroupId(params.group_id);

  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'add_memory',
      arguments: {
        name: params.name.slice(0, 200),
        episode_body: params.episode_body.slice(0, 5000),
        source: params.source || 'text',
        source_description: params.source_description || '',
        group_id: sanitizedGroupId
      }
    }
  };

  for (let attempt = 0; attempt < config.retries; attempt++) {
    try {
      // Get SSE session for this request
      const session = await getSSESession(config);
      if (!session) {
        if (attempt < config.retries - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return { success: false, error: 'Failed to establish SSE session' };
      }

      // Initialize session before sending requests
      const initialized = await initializeSession(session, config);
      if (!initialized) {
        if (attempt < config.retries - 1) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return { success: false, error: 'Failed to initialize MCP session' };
      }

      const result = await sendRequest(session, request, config);

      if (result.success) {
        // Extract UUID from result if available
        let uuid: string | undefined;
        if (typeof result.result === 'object' && result.result !== null) {
          const r = result.result as Record<string, unknown>;
          uuid = (r.uuid || r.episode_uuid || r.id) as string | undefined;
        }
        return { success: true, uuid };
      }

      // Check if retryable
      if (attempt < config.retries - 1) {
        const isRetryable = result.error?.includes('abort') ||
          result.error?.includes('ECONNREFUSED') ||
          result.error?.includes('timeout') ||
          result.error?.includes('before initialization');

        if (isRetryable) {
          // Longer backoff for initialization timing issues
          const backoff = result.error?.includes('before initialization')
            ? 1000 * (attempt + 1)
            : 500 * (attempt + 1);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
      }

      return { success: false, error: result.error };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < config.retries - 1) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }

      return { success: false, error: message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Get current configuration
 */
export function getConfig(): KnowledgeClientConfig {
  return { ...DEFAULT_CONFIG };
}
