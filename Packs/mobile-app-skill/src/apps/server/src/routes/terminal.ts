/**
 * Terminal WebSocket Handler
 *
 * Bridges a tmux session to a WebSocket client using capture-pane/send-keys
 * approach (no PTY required). Enables terminal mirroring from Mac to mobile.
 */

import type { ServerWebSocket } from 'bun';

const TMUX_SESSION_NAME = 'kai';
const CAPTURE_INTERVAL_MS = 250; // Poll interval for screen updates

interface TerminalWebSocketData {
  type: 'terminal';
}

interface TerminalConnection {
  ws: ServerWebSocket<TerminalWebSocketData>;
  captureInterval: ReturnType<typeof setInterval> | null;
  lastContent: string;
  paneWidth: number;
  paneHeight: number;
}

// Track active terminal connections
const activeTerminals = new Map<ServerWebSocket<TerminalWebSocketData>, TerminalConnection>();

/**
 * Check if tmux session exists
 */
async function tmuxSessionExists(): Promise<boolean> {
  const proc = Bun.spawn(['tmux', 'has-session', '-t', TMUX_SESSION_NAME], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const exitCode = await proc.exited;
  return exitCode === 0;
}

/**
 * Get tmux pane dimensions
 */
async function getTmuxDimensions(): Promise<{ cols: number; rows: number }> {
  const proc = Bun.spawn(['tmux', 'display', '-p', '-t', TMUX_SESSION_NAME, '#{pane_width} #{pane_height}'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  const parts = output.trim().split(' ');
  const cols = parseInt(parts[0]) || 80;
  const rows = parseInt(parts[1]) || 24;
  return { cols, rows };
}

/**
 * Capture current tmux pane content
 * -p prints to stdout, -e includes escape sequences (colors)
 */
async function capturePane(): Promise<string> {
  const proc = Bun.spawn(['tmux', 'capture-pane', '-t', TMUX_SESSION_NAME, '-p', '-e'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const output = await new Response(proc.stdout).text();
  return output;
}

/**
 * Send keys to tmux session
 */
async function sendKeys(keys: string): Promise<void> {
  // Escape special characters for tmux
  // Send raw keys without any interpretation
  const proc = Bun.spawn(['tmux', 'send-keys', '-t', TMUX_SESSION_NAME, '-l', keys], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
}

/**
 * Send special key sequences to tmux
 */
async function sendSpecialKey(key: string): Promise<void> {
  const proc = Bun.spawn(['tmux', 'send-keys', '-t', TMUX_SESSION_NAME, key], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
}

/**
 * Resize tmux pane
 */
async function resizePane(cols: number, rows: number): Promise<void> {
  // Resize the window, which will resize the pane
  const proc = Bun.spawn(['tmux', 'resize-window', '-t', TMUX_SESSION_NAME, '-x', String(cols), '-y', String(rows)], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
}

/**
 * Start capture polling for a connection
 */
function startCapture(conn: TerminalConnection) {
  if (conn.captureInterval) return;

  conn.captureInterval = setInterval(async () => {
    try {
      const content = await capturePane();

      // Only send if content changed
      if (content !== conn.lastContent) {
        conn.lastContent = content;
        try {
          conn.ws.send(JSON.stringify({
            type: 'screen',
            content: content,
          }));
        } catch (sendErr) {
          console.error('[Terminal] Send error, stopping capture:', sendErr);
          stopCapture(conn);
        }
      }
    } catch (e) {
      console.error('[Terminal] Capture error:', e);
    }
  }, CAPTURE_INTERVAL_MS);
}

/**
 * Stop capture polling for a connection
 */
function stopCapture(conn: TerminalConnection) {
  if (conn.captureInterval) {
    clearInterval(conn.captureInterval);
    conn.captureInterval = null;
  }
}

/**
 * Handle new terminal WebSocket connection
 */
export function handleTerminalOpen(ws: ServerWebSocket<TerminalWebSocketData>) {
  console.log('[Terminal] Client connected');

  const conn: TerminalConnection = {
    ws,
    captureInterval: null,
    lastContent: '',
    paneWidth: 80,
    paneHeight: 24,
  };

  activeTerminals.set(ws, conn);

  // Check if tmux session exists, then start streaming
  (async () => {
    const exists = await tmuxSessionExists();

    if (!exists) {
      ws.send(JSON.stringify({
        type: 'error',
        message: `No tmux session "${TMUX_SESSION_NAME}" found. Start it on your Mac with: tmux new -s ${TMUX_SESSION_NAME}`
      }));
      return;
    }

    // Get initial dimensions
    const dims = await getTmuxDimensions();
    conn.paneWidth = dims.cols;
    conn.paneHeight = dims.rows;

    ws.send(JSON.stringify({
      type: 'connected',
      session: TMUX_SESSION_NAME,
      cols: dims.cols,
      rows: dims.rows,
    }));

    // Send initial screen content
    const initialContent = await capturePane();
    conn.lastContent = initialContent;
    console.log(`[Terminal] Sending initial screen (${initialContent.length} chars)`);
    ws.send(JSON.stringify({
      type: 'screen',
      content: initialContent,
    }));

    // Start polling for updates
    startCapture(conn);
    console.log('[Terminal] Started capture polling');
  })();
}

/**
 * Handle incoming WebSocket messages (user input)
 */
export function handleTerminalMessage(ws: ServerWebSocket<TerminalWebSocketData>, message: string) {
  try {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'input': {
        // Handle regular text input
        const input = data.data as string;

        // Check for special key sequences
        if (input === '\r' || input === '\n') {
          sendSpecialKey('Enter');
        } else if (input === '\x7f' || input === '\b') {
          sendSpecialKey('BSpace');
        } else if (input === '\x1b') {
          sendSpecialKey('Escape');
        } else if (input === '\t') {
          sendSpecialKey('Tab');
        } else if (input.startsWith('\x1b[')) {
          // Arrow keys and other escape sequences
          const seq = input.slice(2);
          if (seq === 'A') sendSpecialKey('Up');
          else if (seq === 'B') sendSpecialKey('Down');
          else if (seq === 'C') sendSpecialKey('Right');
          else if (seq === 'D') sendSpecialKey('Left');
          else if (seq === '3~') sendSpecialKey('DC'); // Delete
          else if (seq === 'H') sendSpecialKey('Home');
          else if (seq === 'F') sendSpecialKey('End');
          else sendKeys(input); // Unknown sequence, send as-is
        } else if (input.charCodeAt(0) < 32) {
          // Control characters (Ctrl+C = 0x03, Ctrl+D = 0x04, etc.)
          const ctrlChar = String.fromCharCode(input.charCodeAt(0) + 64);
          sendSpecialKey(`C-${ctrlChar.toLowerCase()}`);
        } else {
          // Regular text
          sendKeys(input);
        }
        break;
      }

      case 'resize': {
        const { cols, rows } = data;
        if (cols && rows) {
          console.log(`[Terminal] Resizing tmux to ${cols}x${rows}`);
          const conn = activeTerminals.get(ws);
          if (conn) {
            conn.paneWidth = cols;
            conn.paneHeight = rows;
          }
          // Async resize and refresh
          (async () => {
            await resizePane(cols, rows);
            // Force a screen refresh after resize
            const content = await capturePane();
            if (conn) {
              conn.lastContent = content;
              try {
                ws.send(JSON.stringify({ type: 'screen', content }));
              } catch {}
            }
          })();
        }
        break;
      }

      case 'refresh': {
        // Force a screen refresh
        (async () => {
          const content = await capturePane();
          const conn = activeTerminals.get(ws);
          if (conn) {
            conn.lastContent = content;
          }
          ws.send(JSON.stringify({
            type: 'screen',
            content: content,
          }));
        })();
        break;
      }

      default:
        console.log('[Terminal] Unknown message type:', data.type);
    }
  } catch (e) {
    console.error('[Terminal] Error handling message:', e);
  }
}

/**
 * Handle WebSocket close
 */
export function handleTerminalClose(ws: ServerWebSocket<TerminalWebSocketData>) {
  console.log('[Terminal] Client disconnected');

  const conn = activeTerminals.get(ws);
  if (conn) {
    stopCapture(conn);
    activeTerminals.delete(ws);
  }
}

/**
 * Handle WebSocket error
 */
export function handleTerminalError(ws: ServerWebSocket<TerminalWebSocketData>, error: Error) {
  console.error('[Terminal] WebSocket error:', error);
  handleTerminalClose(ws);
}
