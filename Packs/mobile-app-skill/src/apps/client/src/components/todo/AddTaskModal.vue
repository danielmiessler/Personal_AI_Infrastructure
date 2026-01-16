<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { RecurringConfig, KaiTask, ClaudeModel } from '@/composables/useKaiTodo';

const props = defineProps<{
  task?: KaiTask; // If provided, we're editing
}>();

const emit = defineEmits<{
  close: [];
  add: [title: string, priority: string, skill?: string, notes?: string, autonomous?: boolean, recurring?: RecurringConfig, model?: ClaudeModel];
  update: [id: string, updates: { title?: string; priority?: string; skill?: string; notes?: string; autonomous?: boolean; recurring?: RecurringConfig; model?: ClaudeModel }];
}>();

const isEditing = computed(() => !!props.task);

const title = ref('');
const priority = ref('medium');
const skill = ref('');
const notes = ref('');
const autonomous = ref(false);
const model = ref<ClaudeModel | undefined>(undefined);
const isRecurring = ref(false);
const recurringInterval = ref<'daily' | 'weekly' | 'custom'>('daily');
const customDays = ref(3);
const runTime = ref('09:00');

// Pre-populate form when editing
onMounted(() => {
  if (props.task) {
    title.value = props.task.title;
    priority.value = props.task.priority;
    skill.value = props.task.skill || '';
    notes.value = props.task.notes || '';
    autonomous.value = props.task.autonomous || false;
    model.value = props.task.model;
    if (props.task.recurring) {
      isRecurring.value = true;
      recurringInterval.value = props.task.recurring.interval;
      customDays.value = props.task.recurring.customDays || 3;
      runTime.value = props.task.recurring.runTime || '09:00';
    }
  }
});

const recurringConfig = computed<RecurringConfig | undefined>(() => {
  if (!isRecurring.value) return undefined;
  return {
    interval: recurringInterval.value,
    customDays: recurringInterval.value === 'custom' ? customDays.value : undefined,
    runTime: runTime.value,
  };
});

const handleSubmit = () => {
  if (!title.value.trim()) return;

  if (isEditing.value && props.task) {
    emit('update', props.task.id, {
      title: title.value.trim(),
      priority: priority.value,
      skill: skill.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
      autonomous: autonomous.value || undefined,
      recurring: recurringConfig.value,
      model: model.value,
    });
  } else {
    emit('add', title.value.trim(), priority.value, skill.value.trim() || undefined, notes.value.trim() || undefined, autonomous.value || undefined, recurringConfig.value, model.value);
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
    <div class="relative w-full max-w-lg bg-gray-800 rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 class="text-lg font-semibold">{{ isEditing ? 'Edit Task' : 'Add Task' }}</h2>
        <button
          class="p-2 rounded-lg hover:bg-gray-700 touch-feedback"
          @click="emit('close')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Title -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Task Title *</label>
          <input
            v-model="title"
            type="text"
            placeholder="What should Kai work on?"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
            autofocus
          />
        </div>

        <!-- Priority -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Priority</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="priority === 'high' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'"
              @click="priority = 'high'"
            >
              High
            </button>
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="priority === 'medium' ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'"
              @click="priority = 'medium'"
            >
              Medium
            </button>
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="priority === 'low' ? 'bg-gray-500' : 'bg-gray-700 hover:bg-gray-600'"
              @click="priority = 'low'"
            >
              Low
            </button>
          </div>
        </div>

        <!-- Skill -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Related Skill (optional)</label>
          <input
            v-model="skill"
            type="text"
            placeholder="e.g., MobileApp, HomeAssistant"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
          />
        </div>

        <!-- Model -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Claude Model (optional)</label>
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="model === undefined ? 'bg-gray-600 ring-2 ring-gray-400' : 'bg-gray-700 hover:bg-gray-600'"
              @click="model = undefined"
            >
              Default
            </button>
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="model === 'haiku' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'"
              @click="model = 'haiku'"
            >
              Haiku
            </button>
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="model === 'sonnet' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'"
              @click="model = 'sonnet'"
            >
              Sonnet
            </button>
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
              :class="model === 'opus' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'"
              @click="model = 'opus'"
            >
              Opus
            </button>
          </div>
          <p class="mt-1 text-xs text-gray-500">Haiku = fast/cheap, Sonnet = balanced, Opus = best quality</p>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Notes (optional)</label>
          <textarea
            v-model="notes"
            placeholder="Additional context or requirements"
            rows="3"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500 resize-none"
          ></textarea>
        </div>

        <!-- Autonomous -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="relative w-11 h-6 rounded-full transition-colors"
            :class="autonomous ? 'bg-primary-600' : 'bg-gray-600'"
            @click="autonomous = !autonomous"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
              :class="autonomous ? 'translate-x-5' : 'translate-x-0'"
            ></span>
          </button>
          <div>
            <label class="text-sm font-medium text-gray-300">Auto-process</label>
            <p class="text-xs text-gray-500">Run automatically when Claude usage available</p>
          </div>
        </div>

        <!-- Recurring -->
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="relative w-11 h-6 rounded-full transition-colors"
              :class="isRecurring ? 'bg-primary-600' : 'bg-gray-600'"
              @click="isRecurring = !isRecurring"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                :class="isRecurring ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
            <div>
              <label class="text-sm font-medium text-gray-300">Recurring</label>
              <p class="text-xs text-gray-500">Repeat task on a schedule</p>
            </div>
          </div>

          <!-- Recurring Options -->
          <div v-if="isRecurring" class="ml-14 space-y-3">
            <div class="flex gap-2">
              <button
                type="button"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                :class="recurringInterval === 'daily' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
                @click="recurringInterval = 'daily'"
              >
                Daily
              </button>
              <button
                type="button"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                :class="recurringInterval === 'weekly' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
                @click="recurringInterval = 'weekly'"
              >
                Weekly
              </button>
              <button
                type="button"
                class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                :class="recurringInterval === 'custom' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
                @click="recurringInterval = 'custom'"
              >
                Custom
              </button>
            </div>

            <!-- Custom Days Input -->
            <div v-if="recurringInterval === 'custom'" class="flex items-center gap-2">
              <span class="text-sm text-gray-400">Every</span>
              <input
                v-model.number="customDays"
                type="number"
                min="1"
                max="365"
                class="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-center focus:outline-none focus:border-primary-500"
              />
              <span class="text-sm text-gray-400">days</span>
            </div>

            <!-- Run Time Input -->
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-400">Run at</span>
              <input
                v-model="runTime"
                type="time"
                class="px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="!title.trim()"
          class="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium touch-feedback"
        >
          {{ isEditing ? 'Save Changes' : 'Add to Queue' }}
        </button>
      </form>

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
