import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WSMessage } from '@/types/chat';

type MessageHandler = (message: WSMessage) => void;

export const useWebSocketStore = defineStore('websocket', () => {
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const error = ref<string | null>(null);

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let messageHandlers: MessageHandler[] = [];

  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/chat`;
    console.log('[WS] Connecting to:', url);
    return url;
  };

  const connect = () => {
    if (ws?.readyState === WebSocket.OPEN || isConnecting.value) {
      return;
    }

    isConnecting.value = true;
    error.value = null;

    try {
      ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        console.log('[WS] Connected');
        isConnected.value = true;
        isConnecting.value = false;
        error.value = null;
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        isConnected.value = false;
        isConnecting.value = false;
        ws = null;

        // Auto-reconnect after 3 seconds
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        error.value = 'WebSocket connection error';
        isConnecting.value = false;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage;
          console.log('[WS] Received:', message.type);
          messageHandlers.forEach(handler => handler(message));
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };
    } catch (e) {
      console.error('[WS] Failed to connect:', e);
      error.value = String(e);
      isConnecting.value = false;
    }
  };

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    isConnected.value = false;
    isConnecting.value = false;
  };

  const send = (type: string, payload: any) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error('[WS] Not connected');
      return false;
    }

    try {
      ws.send(JSON.stringify({ type, payload }));
      return true;
    } catch (e) {
      console.error('[WS] Send error:', e);
      return false;
    }
  };

  const sendChat = (sessionId: string, message: string) => {
    return send('chat', { sessionId, message });
  };

  const sendAbort = (sessionId: string) => {
    return send('abort', { sessionId });
  };

  const onMessage = (handler: MessageHandler) => {
    messageHandlers.push(handler);
    return () => {
      messageHandlers = messageHandlers.filter(h => h !== handler);
    };
  };

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    send,
    sendChat,
    sendAbort,
    onMessage,
  };
});
