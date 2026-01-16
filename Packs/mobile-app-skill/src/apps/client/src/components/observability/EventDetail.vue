<script setup lang="ts">
import { computed } from 'vue';
import type { HookEvent } from '@/types/observability';

const props = defineProps<{
  event: HookEvent;
}>();

const emit = defineEmits<{
  close: [];
}>();

const formattedPayload = computed(() => {
  try {
    return JSON.stringify(props.event.payload, null, 2);
  } catch {
    return String(props.event.payload);
  }
});

const toolInfo = computed(() => {
  if (props.event.hook_event_type === 'PreToolUse' || props.event.hook_event_type === 'PostToolUse') {
    return {
      name: props.event.payload?.tool_name as string,
      input: props.event.payload?.tool_input,
    };
  }
  return null;
});
</script>

<template>
  <div class="fixed inset-0 bg-gray-900 z-50 flex flex-col">
    <!-- Header -->
    <div class="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div class="flex items-center gap-3">
        <button
          @click="emit('close')"
          class="p-1.5 rounded hover:bg-gray-700 touch-feedback"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="flex-1">
          <h2 class="font-semibold">Event Details</h2>
          <p class="text-xs text-gray-500">{{ event.timestamp_pst }}</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Event type -->
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-xs text-gray-500 mb-1">Event Type</p>
        <p class="text-sm font-medium" :class="{
          'text-green-400': event.hook_event_type === 'SessionStart',
          'text-red-400': event.hook_event_type === 'SessionEnd',
          'text-blue-400': event.hook_event_type === 'UserPromptSubmit',
          'text-yellow-400': event.hook_event_type === 'PreToolUse' || event.hook_event_type === 'PostToolUse',
          'text-purple-400': event.hook_event_type === 'SubagentStop',
          'text-orange-400': event.hook_event_type === 'Stop',
        }">{{ event.hook_event_type }}</p>
      </div>

      <!-- Agent & Session -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p class="text-xs text-gray-500 mb-1">Agent</p>
          <p class="text-sm font-medium text-gray-200">{{ event.source_app }}</p>
        </div>
        <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p class="text-xs text-gray-500 mb-1">Session</p>
          <p class="text-sm font-mono text-gray-200 truncate">{{ event.session_id }}</p>
        </div>
      </div>

      <!-- Tool info (if applicable) -->
      <div v-if="toolInfo" class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-xs text-gray-500 mb-1">Tool</p>
        <p class="text-sm font-medium text-yellow-400">{{ toolInfo.name }}</p>
        <div v-if="toolInfo.input" class="mt-2">
          <p class="text-xs text-gray-500 mb-1">Input</p>
          <pre class="text-xs text-gray-300 bg-gray-900 rounded p-2 overflow-x-auto">{{ JSON.stringify(toolInfo.input, null, 2) }}</pre>
        </div>
      </div>

      <!-- Full payload -->
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-xs text-gray-500 mb-1">Full Payload</p>
        <pre class="text-xs text-gray-300 bg-gray-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">{{ formattedPayload }}</pre>
      </div>
    </div>
  </div>
</template>
