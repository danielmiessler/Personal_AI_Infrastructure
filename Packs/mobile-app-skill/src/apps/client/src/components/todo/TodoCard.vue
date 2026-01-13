<script setup lang="ts">
import type { KaiTask } from '@/composables/useKaiTodo';

defineProps<{
  task: KaiTask;
}>();

const emit = defineEmits<{
  start: [task: KaiTask];
  complete: [task: KaiTask];
  delete: [task: KaiTask];
  edit: [task: KaiTask];
}>();

const priorityBadge = (priority: string) => {
  switch (priority) {
    case 'high': return { class: 'bg-red-500/20 text-red-400', label: 'High' };
    case 'low': return { class: 'bg-gray-500/20 text-gray-400', label: 'Low' };
    default: return { class: 'bg-yellow-500/20 text-yellow-400', label: 'Med' };
  }
};

const modelBadge = (model: string) => {
  switch (model) {
    case 'haiku': return { class: 'bg-green-500/20 text-green-400', label: 'Haiku' };
    case 'sonnet': return { class: 'bg-blue-500/20 text-blue-400', label: 'Sonnet' };
    case 'opus': return { class: 'bg-purple-500/20 text-purple-400', label: 'Opus' };
    default: return null;
  }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today ${timeStr}`;
  if (isTomorrow) return `Tomorrow ${timeStr}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
};
</script>

<template>
  <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs text-gray-500 font-mono">{{ task.id }}</span>
          <span
            class="text-xs px-1.5 py-0.5 rounded"
            :class="priorityBadge(task.priority).class"
          >
            {{ priorityBadge(task.priority).label }}
          </span>
        </div>
        <h3 class="font-medium text-gray-100">{{ task.title }}</h3>
      </div>
    </div>

    <!-- Metadata -->
    <div class="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
      <span v-if="task.added">Added {{ formatDate(task.added) }}</span>
      <span v-if="task.skill" class="px-1.5 py-0.5 bg-gray-700 rounded">{{ task.skill }}</span>
      <span v-if="task.autonomous" class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Auto
      </span>
      <span v-if="task.model && modelBadge(task.model)" class="px-1.5 py-0.5 rounded flex items-center gap-1" :class="modelBadge(task.model)!.class">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {{ modelBadge(task.model)!.label }}
      </span>
      <span v-if="task.recurring" class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ task.recurring.interval === 'custom' ? `${task.recurring.customDays}d` : task.recurring.interval === 'daily' ? 'Daily' : 'Weekly' }}
      </span>
      <span v-if="task.recurring?.lastRun" class="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Last: {{ formatDateTime(task.recurring.lastRun) }}
      </span>
      <span v-if="task.recurring?.nextRun" class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Next: {{ formatDateTime(task.recurring.nextRun) }}
      </span>
      <span v-if="task.startedAt && task.status === 'in_progress'" class="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Started: {{ formatDateTime(task.startedAt) }}
      </span>
      <span v-if="task.completedAt" class="text-green-400">
        Completed {{ formatDate(task.completedAt) }}
      </span>
    </div>

    <!-- Notes -->
    <p v-if="task.notes" class="mt-2 text-sm text-gray-400">{{ task.notes }}</p>

    <!-- Actions -->
    <div class="mt-3 flex gap-2">
      <template v-if="task.status === 'queued'">
        <button
          class="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium touch-feedback"
          @click="emit('start', task)"
        >
          Start Task
        </button>
        <button
          class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg touch-feedback"
          @click="emit('edit', task)"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg touch-feedback"
          @click="emit('delete', task)"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </template>

      <template v-else-if="task.status === 'in_progress'">
        <button
          class="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium touch-feedback"
          @click="emit('complete', task)"
        >
          Mark Complete
        </button>
        <button
          class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg touch-feedback"
          @click="emit('edit', task)"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          class="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm touch-feedback"
          @click="emit('start', task)"
        >
          Continue
        </button>
      </template>

      <template v-else>
        <button
          class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg touch-feedback"
          @click="emit('edit', task)"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg touch-feedback"
          @click="emit('delete', task)"
        >
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>
