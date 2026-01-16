<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const terminalContainer = ref<HTMLElement | null>(null);
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
const errorMessage = ref<string>('');

let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let ws: WebSocket | null = null;

function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/terminal`;
}

function connect() {
  const url = getWebSocketUrl();
  console.log('[Terminal] Connecting to:', url);

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('[Terminal] Already connected');
    return;
  }

  connectionStatus.value = 'connecting';
  errorMessage.value = '';

  try {
    ws = new WebSocket(url);
    console.log('[Terminal] WebSocket created');
  } catch (e) {
    console.error('[Terminal] Failed to create WebSocket:', e);
    connectionStatus.value = 'error';
    errorMessage.value = 'Failed to connect';
    return;
  }

  ws.onopen = () => {
    console.log('[Terminal] WebSocket connected successfully');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connected':
          connectionStatus.value = 'connected';
          // Resize xterm to match Mac's tmux dimensions exactly
          if (terminal && data.cols && data.rows) {
            console.log(`[Terminal] Resizing xterm to match Mac: ${data.cols}x${data.rows}`);
            terminal.resize(data.cols, data.rows);
          }
          break;

        case 'screen':
          // Full screen update - use buffer swap to prevent iOS flicker
          if (terminal && data.content) {
            try {
              const rows = terminal.rows;

              // Build content with explicit positioning per line
              // This avoids clear/reset which causes width recalculation
              const lines = data.content.split('\n');
              let output = '\x1b[?25l'; // Hide cursor during update
              output += '\x1b[H'; // Home cursor

              for (let i = 0; i < rows; i++) {
                const line = lines[i] || '';
                // Write line content then erase to end of line (preserves ANSI colors)
                output += line + '\x1b[K'; // \x1b[K = erase to end of line
                if (i < rows - 1) {
                  output += '\r\n';
                }
              }

              output += '\x1b[?25h'; // Show cursor
              terminal.write(output);
            } catch (termErr) {
              console.error('[Terminal] Write error:', termErr);
            }
          }
          break;

        case 'error':
          connectionStatus.value = 'error';
          errorMessage.value = data.message;
          terminal?.clear();
          terminal?.write(`\x1b[31m${data.message}\x1b[0m\r\n`);
          break;

        case 'exit':
          connectionStatus.value = 'disconnected';
          terminal?.write(`\r\n\x1b[33mSession ended (code: ${data.code})\x1b[0m\r\n`);
          break;
      }
    } catch (e) {
      console.error('[Terminal] Failed to parse message:', e);
    }
  };

  ws.onclose = (event) => {
    console.log('[Terminal] WebSocket closed - code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean);
    connectionStatus.value = 'disconnected';
  };

  ws.onerror = (e) => {
    console.error('[Terminal] WebSocket error:', e);
    connectionStatus.value = 'error';
    errorMessage.value = 'Connection failed';
  };
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  connectionStatus.value = 'disconnected';
}

function sendInput(data: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'input', data }));
  }
}

function initTerminal() {
  if (!terminalContainer.value) return;

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 10,
    fontFamily: 'Courier New, Courier, monospace',
    theme: {
      background: '#1a1a2e',
      foreground: '#e0e0e0',
      cursor: '#f0f0f0',
      cursorAccent: '#1a1a2e',
      selectionBackground: '#44475a',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
    allowTransparency: true,
    scrollback: 5000,
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  terminal.open(terminalContainer.value);

  // Don't auto-fit - we'll match Mac's dimensions instead

  // Handle user input
  terminal.onData((data) => {
    sendInput(data);
  });

  // Connect WebSocket (server will send initial screen)
  connect();
}

function handleReconnect() {
  terminal?.clear();
  terminal?.write('\x1b[36mReconnecting...\x1b[0m\r\n');
  connect();
}

onMounted(() => {
  console.log('[Terminal] Component mounted');
  initTerminal();
});

onUnmounted(() => {
  disconnect();
  terminal?.dispose();
});
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900">
    <!-- Header -->
    <header class="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="font-medium">Terminal</span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Connection status -->
        <div class="flex items-center gap-1.5">
          <span
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500': connectionStatus === 'connected',
              'bg-yellow-500 animate-pulse': connectionStatus === 'connecting',
              'bg-gray-500': connectionStatus === 'disconnected',
              'bg-red-500': connectionStatus === 'error',
            }"
          ></span>
          <span class="text-xs text-gray-400 capitalize">{{ connectionStatus }}</span>
        </div>

        <!-- Reconnect button -->
        <button
          v-if="connectionStatus !== 'connected' && connectionStatus !== 'connecting'"
          @click="handleReconnect"
          class="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-500 rounded transition-colors"
        >
          Reconnect
        </button>
      </div>
    </header>

    <!-- Error banner -->
    <div
      v-if="errorMessage"
      class="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-200 text-sm"
    >
      {{ errorMessage }}
    </div>

    <!-- Terminal container -->
    <div
      ref="terminalContainer"
      class="flex-1 overflow-hidden"
    ></div>

    <!-- Help text for disconnected state -->
    <div
      v-if="connectionStatus === 'error' || connectionStatus === 'disconnected'"
      class="px-4 py-3 bg-gray-800 border-t border-gray-700 text-sm text-gray-400"
    >
      <p class="mb-2">To mirror your Mac terminal:</p>
      <code class="block px-2 py-1 bg-gray-900 rounded text-xs text-green-400">
        tmux new -s kai
      </code>
    </div>
  </div>
</template>

<style scoped>
/* Ensure terminal fills container */
:deep(.xterm) {
  height: 100%;
  /* Prevent layout recalculation */
  contain: layout style;
}

:deep(.xterm-viewport) {
  /* Force hidden overflow - no scrollbar width allocation */
  overflow: hidden !important;
  /* iOS scroll via touch instead */
  -webkit-overflow-scrolling: touch;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  display: none;
  width: 0 !important;
}

/* iOS rendering stabilization */
:deep(.xterm-screen) {
  touch-action: pan-y pinch-zoom;
  /* Force GPU layer to prevent repaint jitter */
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  /* Lock width to prevent reflow */
  contain: layout style;
}

/* Stabilize row rendering */
:deep(.xterm-rows) {
  transform: translateZ(0);
  -webkit-transform: translateZ(0);
  /* Prevent width recalculation */
  width: 100% !important;
}

/* Prevent text selection flash during updates */
:deep(.xterm-char-measure-element) {
  visibility: hidden !important;
}

/* Lock canvas dimensions */
:deep(.xterm-screen canvas) {
  contain: strict;
}
</style>
