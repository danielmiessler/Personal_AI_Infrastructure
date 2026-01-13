<script setup lang="ts">
import { ref } from 'vue';
import type { Session } from '@/types/chat';

defineProps<{
  sessions: Session[];
  currentSessionId?: string;
}>();

const emit = defineEmits<{
  select: [sessionId: string];
  new: [];
  close: [];
  delete: [sessionId: string];
  rename: [sessionId: string, name: string];
}>();

const editingSessionId = ref<string | null>(null);
const editingName = ref('');
const confirmDeleteId = ref<string | null>(null);

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

const startEditing = (session: Session, e: Event) => {
  e.stopPropagation();
  editingSessionId.value = session.id;
  editingName.value = session.name;
};

const saveEdit = (e: Event) => {
  e.stopPropagation();
  if (editingSessionId.value && editingName.value.trim()) {
    emit('rename', editingSessionId.value, editingName.value.trim());
  }
  editingSessionId.value = null;
  editingName.value = '';
};

const cancelEdit = (e: Event) => {
  e.stopPropagation();
  editingSessionId.value = null;
  editingName.value = '';
};

const showDeleteConfirm = (sessionId: string, e: Event) => {
  e.stopPropagation();
  confirmDeleteId.value = sessionId;
};

const confirmDelete = (e: Event) => {
  e.stopPropagation();
  if (confirmDeleteId.value) {
    emit('delete', confirmDeleteId.value);
    confirmDeleteId.value = null;
  }
};

const cancelDelete = (e: Event) => {
  e.stopPropagation();
  confirmDeleteId.value = null;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    saveEdit(e);
  } else if (e.key === 'Escape') {
    cancelEdit(e);
  }
};
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/60"
      @click="emit('close')"
    ></div>

    <!-- Modal -->
    <div class="relative w-full max-w-lg bg-gray-800 rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-up">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 class="text-lg font-semibold">Chat Sessions</h2>
        <button
          class="p-2 rounded-lg hover:bg-gray-700 touch-feedback"
          @click="emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- New session button -->
      <button
        class="flex items-center gap-3 px-4 py-3 border-b border-gray-700 hover:bg-gray-700/50 touch-feedback"
        @click="emit('new')"
      >
        <div class="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span class="font-medium">New Chat</span>
      </button>

      <!-- Sessions list -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="relative"
        >
          <!-- Delete confirmation overlay -->
          <div
            v-if="confirmDeleteId === session.id"
            class="absolute inset-0 z-10 flex items-center justify-center bg-red-900/90 px-4"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm">Delete this chat?</span>
              <button
                class="px-3 py-1.5 bg-red-600 rounded-lg text-sm font-medium touch-feedback"
                @click="confirmDelete"
              >
                Delete
              </button>
              <button
                class="px-3 py-1.5 bg-gray-600 rounded-lg text-sm font-medium touch-feedback"
                @click="cancelDelete"
              >
                Cancel
              </button>
            </div>
          </div>

          <!-- Session row -->
          <div
            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 touch-feedback cursor-pointer"
            :class="{ 'bg-primary-600/20': session.id === currentSessionId }"
            @click="emit('select', session.id)"
          >
            <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>

            <div class="flex-1 min-w-0">
              <!-- Editing mode -->
              <div v-if="editingSessionId === session.id" class="flex items-center gap-2">
                <input
                  v-model="editingName"
                  type="text"
                  class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary-500"
                  @keydown="handleKeydown"
                  @click.stop
                  autofocus
                />
                <button
                  class="p-1 text-green-400 hover:text-green-300"
                  @click="saveEdit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  class="p-1 text-gray-400 hover:text-gray-300"
                  @click="cancelEdit"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Display mode -->
              <template v-else>
                <div class="flex items-center justify-between">
                  <span class="font-medium truncate">{{ session.name }}</span>
                  <span class="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {{ formatDate(session.updatedAt) }}
                  </span>
                </div>
                <div class="text-sm text-gray-500 truncate">
                  {{ session.messageCount || 0 }} messages
                </div>
              </template>
            </div>

            <!-- Action buttons (when not editing) -->
            <div v-if="editingSessionId !== session.id" class="flex items-center gap-1 flex-shrink-0">
              <!-- Edit button -->
              <button
                class="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-600 rounded touch-feedback"
                @click="startEditing(session, $event)"
                title="Rename"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <!-- Delete button -->
              <button
                class="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded touch-feedback"
                @click="showDeleteConfirm(session.id, $event)"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <!-- Active indicator -->
              <div
                v-if="session.id === currentSessionId"
                class="w-2 h-2 rounded-full bg-primary-400 ml-1"
              ></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="sessions.length === 0"
          class="py-8 text-center text-gray-500"
        >
          <p>No previous chats</p>
          <p class="text-sm mt-1">Start a new conversation</p>
        </div>
      </div>

      <!-- Safe area padding -->
      <div class="h-safe"></div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.2s ease-out;
}

.h-safe {
  height: env(safe-area-inset-bottom);
}
</style>
