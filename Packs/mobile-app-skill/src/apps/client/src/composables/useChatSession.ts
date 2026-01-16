import { storeToRefs } from 'pinia';
import { useChatSessionStore } from '@/stores/chat-session';

export type { Session, SessionDetail, Message, ToolCall } from '@/types/chat';

export function useChatSession() {
  const store = useChatSessionStore();
  const {
    sessions,
    currentSession,
    messages,
    isLoading,
    error,
    streamingMessage,
  } = storeToRefs(store);

  return {
    sessions,
    currentSession,
    messages,
    isLoading,
    error,
    streamingMessage,
    loadSessions: store.loadSessions,
    createSession: store.createSession,
    loadSession: store.loadSession,
    deleteSession: store.deleteSession,
    renameSession: store.renameSession,
    addUserMessage: store.addUserMessage,
    startStreamingMessage: store.startStreamingMessage,
    appendToStreamingMessage: store.appendToStreamingMessage,
    addToolCallStart: store.addToolCallStart,
    addToolCallResult: store.addToolCallResult,
    finishStreamingMessage: store.finishStreamingMessage,
    handleStreamError: store.handleStreamError,
    clearStreaming: store.clearStreaming,
  };
}
