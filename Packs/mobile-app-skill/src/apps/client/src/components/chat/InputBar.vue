<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  disabled?: boolean;
  isStreaming?: boolean;
}>();

const emit = defineEmits<{
  send: [message: string];
  abort: [];
}>();

const inputRef = ref<HTMLTextAreaElement | null>(null);
const message = ref('');
const inputHeight = ref(44);

// iOS keyboard handling using visualViewport
const handleViewportResize = () => {
  if (window.visualViewport) {
    document.documentElement.style.setProperty(
      '--keyboard-height',
      `${window.innerHeight - window.visualViewport.height}px`
    );
  }
};

onMounted(() => {
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportResize);
  }
});

onUnmounted(() => {
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleViewportResize);
    window.visualViewport.removeEventListener('scroll', handleViewportResize);
  }
});

const handleInput = () => {
  // Auto-resize textarea
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
    const newHeight = Math.min(inputRef.value.scrollHeight, 120);
    inputRef.value.style.height = `${newHeight}px`;
    inputHeight.value = newHeight;
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  // Submit on Enter (without Shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

const handleSend = () => {
  const trimmed = message.value.trim();
  if (!trimmed || props.disabled) return;

  emit('send', trimmed);
  message.value = '';

  // Reset textarea height
  if (inputRef.value) {
    inputRef.value.style.height = '44px';
    inputHeight.value = 44;
  }
};

const handleAbort = () => {
  emit('abort');
};
</script>

<template>
  <div
    class="flex-shrink-0 border-t border-gray-700 bg-gray-800 p-3"
    :style="{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }"
  >
    <div class="flex items-end gap-2">
      <div class="flex-1 relative">
        <textarea
          ref="inputRef"
          v-model="message"
          :disabled="disabled"
          placeholder="Message Claude..."
          rows="1"
          class="w-full bg-gray-700 text-gray-100 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 placeholder-gray-500"
          :style="{ minHeight: '44px', maxHeight: '120px' }"
          @input="handleInput"
          @keydown="handleKeydown"
        ></textarea>
      </div>

      <!-- Send / Abort button -->
      <button
        v-if="isStreaming"
        class="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-xl transition-colors touch-feedback"
        @click="handleAbort"
      >
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
      <button
        v-else
        :disabled="!message.trim() || disabled"
        class="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 disabled:opacity-50 rounded-xl transition-colors touch-feedback"
        @click="handleSend"
      >
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  </div>
</template>
