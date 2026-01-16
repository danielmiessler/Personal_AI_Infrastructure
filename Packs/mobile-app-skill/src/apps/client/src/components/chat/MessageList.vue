<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { Message } from '@/types/chat';
import MessageBubble from './MessageBubble.vue';

const props = defineProps<{
  messages: Message[];
}>();

const emit = defineEmits<{
  refresh: [];
}>();

const containerRef = ref<HTMLElement | null>(null);
const isRefreshing = ref(false);
const pullDistance = ref(0);
const isPulling = ref(false);

const PULL_THRESHOLD = 80;
const pullThreshold = PULL_THRESHOLD; // For template access
let touchStartY = 0;

const scrollToBottom = async () => {
  await nextTick();
  if (containerRef.value) {
    containerRef.value.scrollTop = containerRef.value.scrollHeight;
  }
};

// Pull-to-refresh handlers
const handleTouchStart = (e: TouchEvent) => {
  if (containerRef.value?.scrollTop === 0) {
    touchStartY = e.touches[0].clientY;
    isPulling.value = true;
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || containerRef.value?.scrollTop !== 0) {
    pullDistance.value = 0;
    return;
  }

  const touchY = e.touches[0].clientY;
  const diff = touchY - touchStartY;

  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, PULL_THRESHOLD + 20);
  }
};

const handleTouchEnd = async () => {
  if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
    isRefreshing.value = true;
    emit('refresh');
    // Visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    isRefreshing.value = false;
  }
  pullDistance.value = 0;
  isPulling.value = false;
};

// Auto-scroll when messages change
watch(
  () => props.messages.length,
  () => scrollToBottom(),
  { immediate: true }
);

// Also scroll when streaming content updates
watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => {
    const lastMessage = props.messages[props.messages.length - 1];
    if (lastMessage?.isStreaming) {
      scrollToBottom();
    }
  }
);
</script>

<template>
  <div
    ref="containerRef"
    class="flex-1 overflow-y-auto p-4 space-y-4 relative"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh indicator -->
    <div
      v-if="pullDistance > 0 || isRefreshing"
      class="absolute left-0 right-0 flex justify-center transition-transform duration-200"
      :style="{ transform: `translateY(${pullDistance - 40}px)` }"
    >
      <div
        class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
        :class="{ 'animate-spin': isRefreshing }"
      >
        <svg
          v-if="!isRefreshing"
          class="w-5 h-5 text-gray-300 transition-transform"
          :class="{ 'rotate-180': pullDistance >= pullThreshold }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
        <svg v-else class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    </div>

    <MessageBubble
      v-for="message in messages"
      :key="message.id"
      :message="message"
    />

    <!-- Empty state -->
    <div
      v-if="messages.length === 0"
      class="flex flex-col items-center justify-center h-full text-gray-500"
    >
      <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p class="text-lg font-medium">Start a conversation</p>
      <p class="text-sm mt-1">Ask Claude anything about your codebase</p>
    </div>
  </div>
</template>
