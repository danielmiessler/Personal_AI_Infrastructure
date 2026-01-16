import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, SessionDetail, Message, ToolCall } from '@/types/chat';

const API_BASE = '/api';

export const useChatSessionStore = defineStore('chatSession', () => {
  const sessions = ref<Session[]>([]);
  const currentSession = ref<SessionDetail | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Streaming state
  const streamingMessage = ref<Message | null>(null);
  const pendingToolCall = ref<ToolCall | null>(null);

  const messages = computed(() => {
    const stored = currentSession.value?.messages || [];
    if (streamingMessage.value) {
      return [...stored, streamingMessage.value];
    }
    return stored;
  });

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`);
      const data = await response.json();
      sessions.value = data.sessions || [];
    } catch (e) {
      console.error('Failed to load sessions:', e);
      error.value = String(e);
    }
  };

  const createSession = async (name?: string): Promise<Session | null> => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      await loadSessions();
      return data;
    } catch (e) {
      console.error('Failed to create session:', e);
      error.value = String(e);
      return null;
    }
  };

  const loadSession = async (sessionId: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error('Session not found');
      }
      currentSession.value = await response.json();
    } catch (e) {
      console.error('Failed to load session:', e);
      error.value = String(e);
      currentSession.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null;
      }
      await loadSessions();
    } catch (e) {
      console.error('Failed to delete session:', e);
      error.value = String(e);
    }
  };

  const renameSession = async (sessionId: string, name: string) => {
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      await loadSessions();
      if (currentSession.value?.id === sessionId) {
        currentSession.value.name = name;
      }
    } catch (e) {
      console.error('Failed to rename session:', e);
      error.value = String(e);
    }
  };

  // Add a user message to the current view (before sending to server)
  const addUserMessage = (content: string) => {
    if (!currentSession.value) return;

    const message: Message = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    currentSession.value.messages.push(message);
  };

  // Start streaming a new assistant message
  const startStreamingMessage = () => {
    streamingMessage.value = {
      id: `streaming_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolCalls: [],
      isStreaming: true,
    };
  };

  // Append text to the streaming message
  const appendToStreamingMessage = (text: string) => {
    if (streamingMessage.value) {
      streamingMessage.value.content += text;
    }
  };

  // Add a tool call to the streaming message
  const addToolCallStart = (name: string, input: any) => {
    pendingToolCall.value = { name, input };
    if (streamingMessage.value) {
      streamingMessage.value.toolCalls = streamingMessage.value.toolCalls || [];
      streamingMessage.value.toolCalls.push(pendingToolCall.value);
    }
  };

  // Update the pending tool call with result
  const addToolCallResult = (result: string, isError: boolean) => {
    if (pendingToolCall.value) {
      pendingToolCall.value.result = result;
      pendingToolCall.value.isError = isError;
      pendingToolCall.value = null;
    }
  };

  // Finalize the streaming message
  const finishStreamingMessage = () => {
    if (streamingMessage.value && currentSession.value) {
      streamingMessage.value.isStreaming = false;
      currentSession.value.messages.push({ ...streamingMessage.value });
      streamingMessage.value = null;
      pendingToolCall.value = null;
    }
  };

  // Handle error during streaming
  const handleStreamError = (errorMsg: string) => {
    if (streamingMessage.value) {
      streamingMessage.value.content += `\n\n**Error:** ${errorMsg}`;
      finishStreamingMessage();
    }
  };

  // Clear streaming state (e.g., on abort)
  const clearStreaming = () => {
    streamingMessage.value = null;
    pendingToolCall.value = null;
  };

  return {
    sessions,
    currentSession,
    messages,
    isLoading,
    error,
    streamingMessage,
    loadSessions,
    createSession,
    loadSession,
    deleteSession,
    renameSession,
    addUserMessage,
    startStreamingMessage,
    appendToStreamingMessage,
    addToolCallStart,
    addToolCallResult,
    finishStreamingMessage,
    handleStreamError,
    clearStreaming,
  };
});
