<script setup lang="ts">
import { computed } from 'vue';
import type { Message } from '@/types/chat';
import ToolCallCard from './ToolCallCard.vue';

const props = defineProps<{
  message: Message;
}>();

const isUser = computed(() => props.message.role === 'user');
const isSystem = computed(() => props.message.role === 'system');

const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});
</script>

<template>
  <div
    class="flex"
    :class="{
      'justify-end': isUser,
      'justify-start': !isUser,
      'justify-center': isSystem,
    }"
  >
    <!-- System message -->
    <div v-if="isSystem" class="max-w-[90%] px-3 py-1.5 bg-gray-700/50 rounded-lg text-sm text-gray-400 text-center">
      {{ message.content }}
    </div>

    <!-- User message -->
    <div v-else-if="isUser" class="max-w-[85%] flex flex-col items-end">
      <div class="px-4 py-2.5 bg-primary-600 rounded-2xl rounded-br-sm">
        <p class="text-white whitespace-pre-wrap break-words">{{ message.content }}</p>
      </div>
      <span class="text-xs text-gray-500 mt-1 mr-1">{{ formattedTime }}</span>
    </div>

    <!-- Assistant message -->
    <div v-else class="max-w-[90%] flex flex-col items-start">
      <!-- Tool calls -->
      <div v-if="message.toolCalls?.length" class="w-full space-y-2 mb-2">
        <ToolCallCard
          v-for="(tool, idx) in message.toolCalls"
          :key="idx"
          :tool="tool"
        />
      </div>

      <!-- Text content -->
      <div v-if="message.content" class="px-4 py-2.5 bg-gray-700 rounded-2xl rounded-bl-sm">
        <p class="text-gray-100 whitespace-pre-wrap break-words">{{ message.content }}</p>
        <span
          v-if="message.isStreaming"
          class="inline-block w-2 h-4 bg-primary-400 ml-1 animate-pulse"
        ></span>
      </div>
      <span class="text-xs text-gray-500 mt-1 ml-1">{{ formattedTime }}</span>
    </div>
  </div>
</template>
