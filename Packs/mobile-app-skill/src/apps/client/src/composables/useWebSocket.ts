import { storeToRefs } from 'pinia';
import { onUnmounted } from 'vue';
import { useWebSocketStore } from '@/stores/websocket';
import type { WSMessage } from '@/types/chat';

type MessageHandler = (message: WSMessage) => void;

export function useWebSocket() {
  const store = useWebSocketStore();
  const { isConnected, isConnecting, error } = storeToRefs(store);

  // Auto-cleanup message handlers on unmount
  let cleanupHandlers: (() => void)[] = [];

  const onMessage = (handler: MessageHandler) => {
    const cleanup = store.onMessage(handler);
    cleanupHandlers.push(cleanup);
    return cleanup;
  };

  onUnmounted(() => {
    cleanupHandlers.forEach(cleanup => cleanup());
  });

  return {
    isConnected,
    isConnecting,
    error,
    connect: store.connect,
    disconnect: store.disconnect,
    send: store.send,
    sendChat: store.sendChat,
    sendAbort: store.sendAbort,
    onMessage,
  };
}
