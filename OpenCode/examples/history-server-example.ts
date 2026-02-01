#!/usr/bin/env bun
/**
 * PAI History Server for OpenCode (Example)
 *
 * This MCP server demonstrates how to track conversation history in OpenCode
 * by monitoring OpenCode's SQLite database and saving to PAI history format.
 *
 * This is an example/template - adapt to your needs.
 */

import Database from 'bun:sqlite';
import { join } from 'path';
import { existsSync, mkdirSync, appendFileSync } from 'fs';

// Configuration
const HOME = process.env.HOME || process.env.USERPROFILE || '';
const OPENCODE_DIR = join(HOME, '.opencode');
const OPENCODE_DB = join(OPENCODE_DIR, 'conversations.db');
const PAI_DIR = process.env.PAI_DIR || join(OPENCODE_DIR, 'pai');
const HISTORY_DIR = join(PAI_DIR, 'history', 'sessions');

// Ensure history directory exists
if (!existsSync(HISTORY_DIR)) {
  mkdirSync(HISTORY_DIR, { recursive: true });
}

// State tracking
let lastProcessedTimestamp = new Date().toISOString();
let db: Database | null = null;

/**
 * Initialize database connection
 */
function initDatabase(): Database | null {
  if (!existsSync(OPENCODE_DB)) {
    console.error(`[History] OpenCode database not found: ${OPENCODE_DB}`);
    return null;
  }

  try {
    return new Database(OPENCODE_DB, { readonly: true });
  } catch (error) {
    console.error('[History] Failed to open database:', error);
    return null;
  }
}

/**
 * Save conversation to PAI history
 */
function saveToHistory(conversation: any) {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  const historyFile = join(HISTORY_DIR, `${dateStr}.md`);

  const entry = `
## ${timestamp}

**Conversation ID:** ${conversation.id || 'unknown'}

**Messages:**
${conversation.messages?.map((msg: any) => `
### ${msg.role}
${msg.content}
`).join('\n') || 'No messages'}

---
`;

  try {
    appendFileSync(historyFile, entry, 'utf-8');
    console.error(`[History] Saved conversation to ${historyFile}`);
  } catch (error) {
    console.error('[History] Failed to save:', error);
  }
}

/**
 * Poll for new conversations
 */
function pollConversations() {
  if (!db) {
    db = initDatabase();
    if (!db) {
      return;
    }
  }

  try {
    // Query for recent messages
    // NOTE: This is a hypothetical schema - adjust based on actual OpenCode DB structure
    const query = db.prepare(`
      SELECT *
      FROM conversations
      WHERE updated_at > ?
      ORDER BY updated_at DESC
      LIMIT 10
    `);

    const conversations = query.all(lastProcessedTimestamp);

    for (const conv of conversations as any[]) {
      saveToHistory(conv);

      // Update timestamp
      if (conv.updated_at > lastProcessedTimestamp) {
        lastProcessedTimestamp = conv.updated_at;
      }
    }
  } catch (error) {
    console.error('[History] Query failed:', error);
  }
}

/**
 * MCP Server Protocol Handler
 */
process.stdin.setEncoding('utf8');

process.stdin.on('data', (data) => {
  try {
    const request = JSON.parse(data.toString());

    if (request.method === 'initialize') {
      // Initialize the server
      console.error('[History] Initializing PAI History Server...');

      db = initDatabase();

      // Start polling for conversations
      const pollInterval = setInterval(pollConversations, 30000); // Every 30 seconds

      // Cleanup on exit
      process.on('SIGINT', () => {
        clearInterval(pollInterval);
        if (db) {
          db.close();
        }
        process.exit(0);
      });

      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          capabilities: ['history-tracking'],
          metadata: {
            name: 'PAI History',
            version: '1.0.0',
            description: 'Automatic conversation history tracking'
          }
        }
      };

      process.stdout.write(JSON.stringify(response) + '\n');
      console.error('[History] Server initialized');
    }

    if (request.method === 'tools/list') {
      // Optionally expose history as a tool
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'get_recent_history',
              description: 'Retrieve recent conversation history',
              inputSchema: {
                type: 'object',
                properties: {
                  days: {
                    type: 'number',
                    description: 'Number of days to look back',
                    default: 7
                  }
                }
              }
            }
          ]
        }
      };

      process.stdout.write(JSON.stringify(response) + '\n');
    }

  } catch (error) {
    console.error('[History] Error handling request:', error);
  }
});

// Keep server alive
process.stdin.resume();

console.error('[History] PAI History Server started');
console.error(`[History] Monitoring: ${OPENCODE_DB}`);
console.error(`[History] Saving to: ${HISTORY_DIR}`);
