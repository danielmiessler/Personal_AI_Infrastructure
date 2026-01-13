<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useWebSocket } from '@/composables/useWebSocket';
import { useChatSession } from '@/composables/useChatSession';
import type { WSMessage } from '@/types/chat';
import MessageList from './MessageList.vue';
import InputBar from './InputBar.vue';
import SessionPicker from './SessionPicker.vue';

const {
  isConnected,
  isConnecting,
  sendChat,
  sendAbort,
  onMessage,
} = useWebSocket();

const {
  sessions,
  currentSession,
  messages,
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
  streamingMessage,
} = useChatSession();

const isStreaming = ref(false);
const showSessionPicker = ref(false);

// Handle incoming WebSocket messages
const handleMessage = (msg: WSMessage) => {
  if (msg.sessionId && msg.sessionId !== currentSession.value?.id) {
    return; // Ignore messages for other sessions
  }

  switch (msg.type) {
    case 'chunk':
      if (!streamingMessage.value) {
        startStreamingMessage();
      }
      appendToStreamingMessage(msg.payload?.text || '');
      break;

    case 'tool_start':
      if (!streamingMessage.value) {
        startStreamingMessage();
      }
      addToolCallStart(msg.payload?.toolName, msg.payload?.toolInput);
      break;

    case 'tool_result':
      addToolCallResult(msg.payload?.result || '', msg.payload?.isError || false);
      break;

    case 'complete':
      finishStreamingMessage();
      isStreaming.value = false;
      break;

    case 'error':
      handleStreamError(msg.payload?.error || 'Unknown error');
      isStreaming.value = false;
      break;

    case 'aborted':
      clearStreaming();
      isStreaming.value = false;
      break;
  }
};

onMounted(async () => {
  // WebSocket connected globally in App.vue
  await loadSessions();

  // Auto-select most recent session or create new one
  if (sessions.value.length > 0) {
    await loadSession(sessions.value[0].id);
  } else {
    const newSession = await createSession();
    if (newSession) {
      await loadSession(newSession.id);
    }
  }
});

let unsubscribe: (() => void) | null = null;

// Register message handler - use immediate:true to handle already-connected state
watch(isConnected, (connected) => {
  if (connected && !unsubscribe) {
    console.log('[ChatView] Registering message handler');
    unsubscribe = onMessage(handleMessage);
  } else if (!connected && unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}, { immediate: true });

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
});

const handleSend = (message: string) => {
  if (!currentSession.value || !isConnected.value) return;

  addUserMessage(message);
  isStreaming.value = true;
  sendChat(currentSession.value.id, message);
};

const handleAbort = () => {
  if (currentSession.value) {
    sendAbort(currentSession.value.id);
  }
};

const handleNewSession = async () => {
  const newSession = await createSession();
  if (newSession) {
    await loadSession(newSession.id);
  }
  showSessionPicker.value = false;
};

const handleSelectSession = async (sessionId: string) => {
  await loadSession(sessionId);
  showSessionPicker.value = false;
};

const handleDeleteSession = async (sessionId: string) => {
  await deleteSession(sessionId);
  // If we deleted the current session, create a new one
  if (!currentSession.value && sessions.value.length === 0) {
    const newSession = await createSession();
    if (newSession) {
      await loadSession(newSession.id);
    }
  } else if (!currentSession.value && sessions.value.length > 0) {
    await loadSession(sessions.value[0].id);
  }
};

const handleRenameSession = async (sessionId: string, name: string) => {
  await renameSession(sessionId, name);
};

const handleRefresh = async () => {
  if (currentSession.value) {
    console.log('[ChatView] Refreshing session:', currentSession.value.id);
    await loadSession(currentSession.value.id);
  }
};
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900">
    <!-- Header -->
    <div class="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
      <button
        class="flex items-center gap-2 touch-feedback rounded-lg px-2 py-1 -ml-2"
        @click="showSessionPicker = true"
      >
        <h1 class="font-semibold truncate max-w-[200px]">
          {{ currentSession?.name || 'Chat' }}
        </h1>
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div class="flex items-center gap-2">
        <!-- Connection status -->
        <div
          class="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
          :class="{
            'bg-green-500/20 text-green-400': isConnected,
            'bg-yellow-500/20 text-yellow-400': isConnecting,
            'bg-red-500/20 text-red-400': !isConnected && !isConnecting,
          }"
        >
          <div
            class="w-1.5 h-1.5 rounded-full"
            :class="{
              'bg-green-400': isConnected,
              'bg-yellow-400 animate-pulse': isConnecting,
              'bg-red-400': !isConnected && !isConnecting,
            }"
          ></div>
          <span>{{ isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Offline' }}</span>
        </div>

        <!-- New chat button -->
        <button
          class="p-2 rounded-lg hover:bg-gray-700 touch-feedback"
          @click="handleNewSession"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <MessageList :messages="messages" @refresh="handleRefresh" />

    <!-- Input -->
    <InputBar
      :disabled="!isConnected || !currentSession"
      :is-streaming="isStreaming"
      @send="handleSend"
      @abort="handleAbort"
    />

    <!-- Session picker modal -->
    <SessionPicker
      v-if="showSessionPicker"
      :sessions="sessions"
      :current-session-id="currentSession?.id"
      @select="handleSelectSession"
      @new="handleNewSession"
      @close="showSessionPicker = false"
      @delete="handleDeleteSession"
      @rename="handleRenameSession"
    />
  </div>
</template>
