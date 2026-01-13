<script setup lang="ts">
import type { HookEvent } from '@/types/observability';

const props = defineProps<{
  event: HookEvent;
  getEventTypeColor: (type: string) => string;
  getRelativeTime: (timestamp: number) => string;
}>();

const emit = defineEmits<{
  select: [event: HookEvent];
}>();

function getToolName(): string | null {
  if (props.event.hook_event_type === 'PreToolUse' || props.event.hook_event_type === 'PostToolUse') {
    return (props.event.payload?.tool_name as string) || null;
  }
  return null;
}

function getEventSummary(): string {
  const type = props.event.hook_event_type;
  const payload = props.event.payload;

  switch (type) {
    case 'SessionStart':
      return 'Session started';
    case 'SessionEnd':
      return 'Session ended';
    case 'UserPromptSubmit':
      const prompt = (payload?.prompt as string) || '';
      return prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt || 'User prompt';
    case 'PreToolUse':
      return `Calling ${getToolName() || 'tool'}`;
    case 'PostToolUse':
      return `Completed ${getToolName() || 'tool'}`;
    case 'SubagentStop':
      return 'Subagent completed';
    case 'Stop':
      return 'Task completed';
    default:
      return type;
  }
}
</script>

<template>
  <div
    class="bg-gray-800 rounded-lg p-3 touch-feedback cursor-pointer border border-gray-700 hover:border-gray-600"
    @click="emit('select', event)"
  >
    <div class="flex items-start gap-3">
      <!-- Event type indicator -->
      <div class="flex-shrink-0 mt-1">
        <div
          class="w-2 h-2 rounded-full"
          :class="{
            'bg-green-400': event.hook_event_type === 'SessionStart',
            'bg-red-400': event.hook_event_type === 'SessionEnd',
            'bg-blue-400': event.hook_event_type === 'UserPromptSubmit',
            'bg-yellow-400': event.hook_event_type === 'PreToolUse',
            'bg-yellow-300': event.hook_event_type === 'PostToolUse',
            'bg-purple-400': event.hook_event_type === 'SubagentStop',
            'bg-orange-400': event.hook_event_type === 'Stop',
          }"
        ></div>
      </div>

      <!-- Event content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-700" :class="getEventTypeColor(event.hook_event_type)">
            {{ event.hook_event_type }}
          </span>
          <span class="text-xs text-gray-500">
            {{ getRelativeTime(event.timestamp) }}
          </span>
        </div>

        <p class="text-sm text-gray-300 mt-1 truncate">
          {{ getEventSummary() }}
        </p>

        <div class="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span class="truncate">{{ event.source_app }}</span>
          <span>·</span>
          <span class="truncate font-mono">{{ event.session_id.slice(0, 8) }}</span>
        </div>
      </div>

      <!-- Chevron -->
      <svg class="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </div>
</template>
