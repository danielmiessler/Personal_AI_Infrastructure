<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ToolCall } from '@/types/chat';

const props = defineProps<{
  tool: ToolCall;
}>();

const isExpanded = ref(false);

const isRunning = computed(() => props.tool.result === undefined);

const statusColor = computed(() => {
  if (isRunning.value) return 'text-yellow-400';
  if (props.tool.isError) return 'text-red-400';
  return 'text-green-400';
});

const statusIcon = computed(() => {
  if (isRunning.value) return '⟳';
  if (props.tool.isError) return '✕';
  return '✓';
});

const toolIcon = computed(() => {
  const name = props.tool.name.toLowerCase();
  if (name.includes('read')) return '📄';
  if (name.includes('write') || name.includes('edit')) return '✏️';
  if (name.includes('bash') || name.includes('shell')) return '💻';
  if (name.includes('search') || name.includes('grep') || name.includes('glob')) return '🔍';
  if (name.includes('web')) return '🌐';
  return '🔧';
});

const truncatedResult = computed(() => {
  if (!props.tool.result) return '';
  const result = props.tool.result;
  if (result.length > 200 && !isExpanded.value) {
    return result.slice(0, 200) + '...';
  }
  return result;
});
</script>

<template>
  <div
    class="w-full border rounded-lg overflow-hidden"
    :class="{
      'border-yellow-500/30 bg-yellow-500/5': isRunning,
      'border-red-500/30 bg-red-500/5': !isRunning && tool.isError,
      'border-gray-600 bg-gray-800/50': !isRunning && !tool.isError,
    }"
  >
    <!-- Header -->
    <button
      class="w-full flex items-center gap-2 px-3 py-2 text-left"
      @click="isExpanded = !isExpanded"
    >
      <span class="text-lg">{{ toolIcon }}</span>
      <span class="flex-1 text-sm font-medium text-gray-200 truncate">{{ tool.name }}</span>
      <span :class="statusColor" class="text-sm">{{ statusIcon }}</span>
      <svg
        class="w-4 h-4 text-gray-500 transition-transform"
        :class="{ 'rotate-180': isExpanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Expanded content -->
    <div v-if="isExpanded" class="px-3 pb-3 space-y-2">
      <!-- Input -->
      <div v-if="tool.input" class="text-xs">
        <div class="text-gray-500 mb-1">Input:</div>
        <pre class="bg-gray-900 rounded p-2 overflow-x-auto text-gray-300 max-h-32 overflow-y-auto">{{ typeof tool.input === 'string' ? tool.input : JSON.stringify(tool.input, null, 2) }}</pre>
      </div>

      <!-- Result -->
      <div v-if="tool.result !== undefined" class="text-xs">
        <div class="flex items-center justify-between mb-1">
          <span class="text-gray-500">Result:</span>
          <button
            v-if="tool.result.length > 200"
            class="text-primary-400 hover:text-primary-300"
            @click.stop="isExpanded = !isExpanded"
          >
            {{ tool.result.length > 200 && !isExpanded ? 'Show more' : 'Show less' }}
          </button>
        </div>
        <pre
          class="bg-gray-900 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto"
          :class="{ 'text-red-400': tool.isError, 'text-gray-300': !tool.isError }"
        >{{ truncatedResult }}</pre>
      </div>

      <!-- Running indicator -->
      <div v-else class="flex items-center gap-2 text-xs text-yellow-400">
        <div class="flex gap-1">
          <div class="w-1.5 h-1.5 bg-yellow-400 rounded-full loading-dot"></div>
          <div class="w-1.5 h-1.5 bg-yellow-400 rounded-full loading-dot"></div>
          <div class="w-1.5 h-1.5 bg-yellow-400 rounded-full loading-dot"></div>
        </div>
        <span>Running...</span>
      </div>
    </div>
  </div>
</template>
