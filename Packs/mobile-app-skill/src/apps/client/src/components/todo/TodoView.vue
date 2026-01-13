<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useKaiTodo, type KaiTask, type RecurringConfig, type ClaudeModel } from '@/composables/useKaiTodo';
import { useWebSocket } from '@/composables/useWebSocket';
import { useChatSession } from '@/composables/useChatSession';
import { useRouter } from 'vue-router';
import TodoCard from './TodoCard.vue';
import AddTaskModal from './AddTaskModal.vue';

const router = useRouter();
const { tasks, isLoading, error, fetchTasks, addTask, updateTask, startTask, completeTask, deleteTask } = useKaiTodo();
const { isConnected, sendChat } = useWebSocket();
const { currentSession, createSession, loadSession } = useChatSession();

const showAddModal = ref(false);
const editingTask = ref<KaiTask | undefined>(undefined);
const activeTab = ref<'queued' | 'recurring' | 'in_progress' | 'completed'>('queued');

onMounted(() => {
  fetchTasks();
});

// Get recurring tasks that have been run at least once (have lastRun)
// These move from queued to recurring view after first completion
const recurringTasks = computed(() => {
  const allTasks = [...tasks.value.queued, ...tasks.value.inProgress];
  return allTasks
    .filter(task => task.recurring?.lastRun)
    .sort((a, b) => new Date(b.added).getTime() - new Date(a.added).getTime());
});

// Queued tasks excludes recurring tasks that have already been run
// (those appear in recurring view instead)
const queuedTasks = computed(() => {
  return tasks.value.queued.filter(task => !task.recurring?.lastRun);
});

const currentTasks = computed(() => {
  switch (activeTab.value) {
    case 'queued': return queuedTasks.value;
    case 'recurring': return recurringTasks.value;
    case 'in_progress': return tasks.value.inProgress;
    case 'completed': return tasks.value.completed;
  }
});

const queuedCount = computed(() => queuedTasks.value.length);
const recurringCount = computed(() => recurringTasks.value.length);
const inProgressCount = computed(() => tasks.value.inProgress.length);

const handleAddTask = async (title: string, priority: string, skill?: string, notes?: string, autonomous?: boolean, recurring?: RecurringConfig, model?: ClaudeModel) => {
  await addTask(title, { priority, skill, notes, autonomous, recurring, model });
  showAddModal.value = false;
  editingTask.value = undefined;
};

const handleUpdateTask = async (id: string, updates: { title?: string; priority?: string; skill?: string; notes?: string; autonomous?: boolean; recurring?: RecurringConfig; model?: ClaudeModel }) => {
  await updateTask(id, updates);
  showAddModal.value = false;
  editingTask.value = undefined;
};

const handleEdit = (task: KaiTask) => {
  editingTask.value = task;
  showAddModal.value = true;
};

const handleCloseModal = () => {
  showAddModal.value = false;
  editingTask.value = undefined;
};

const handleStartTask = async (task: KaiTask) => {
  // Mark as in progress
  await startTask(task.id);

  // Navigate to chat and start working on it
  if (!currentSession.value) {
    const session = await createSession();
    if (session) await loadSession(session.id);
  }

  // Send task to Claude
  const prompt = task.skill
    ? `Working on task [${task.id}]: ${task.title}\n\nRelevant skill: ${task.skill}\n${task.notes ? `Notes: ${task.notes}` : ''}`
    : `Working on task [${task.id}]: ${task.title}${task.notes ? `\n\nNotes: ${task.notes}` : ''}`;

  router.push('/chat');

  // Small delay to ensure we're on chat view
  setTimeout(() => {
    if (currentSession.value && isConnected.value) {
      sendChat(currentSession.value.id, prompt);
    }
  }, 500);
};

const handleComplete = async (task: KaiTask) => {
  await completeTask(task.id);
};

const handleDelete = async (task: KaiTask) => {
  await deleteTask(task.id);
};
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">Kai Todo</h1>
        <button
          class="p-2 rounded-lg bg-primary-600 hover:bg-primary-700 touch-feedback"
          @click="showAddModal = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex mt-3 gap-1">
        <button
          class="flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'queued' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="activeTab = 'queued'"
        >
          Queued
          <span v-if="queuedCount" class="ml-1 px-1.5 py-0.5 bg-gray-800 rounded-full text-xs">
            {{ queuedCount }}
          </span>
        </button>
        <button
          class="flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'recurring' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="activeTab = 'recurring'"
        >
          <svg class="w-4 h-4 inline-block -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span v-if="recurringCount" class="ml-1 px-1.5 py-0.5 bg-purple-600 rounded-full text-xs">
            {{ recurringCount }}
          </span>
        </button>
        <button
          class="flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'in_progress' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="activeTab = 'in_progress'"
        >
          Active
          <span v-if="inProgressCount" class="ml-1 px-1.5 py-0.5 bg-yellow-600 rounded-full text-xs">
            {{ inProgressCount }}
          </span>
        </button>
        <button
          class="flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'completed' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="activeTab = 'completed'"
        >
          Done
        </button>
      </div>
    </div>

    <!-- Task List -->
    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="isLoading" class="flex items-center justify-center py-8">
        <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      </div>

      <div v-else-if="error" class="text-center py-8 text-red-400">
        {{ error }}
        <button class="block mx-auto mt-2 text-primary-400" @click="fetchTasks">Retry</button>
      </div>

      <div v-else-if="currentTasks.length === 0" class="text-center py-8 text-gray-500">
        <p v-if="activeTab === 'queued'">No tasks queued</p>
        <p v-else-if="activeTab === 'recurring'">No recurring tasks</p>
        <p v-else-if="activeTab === 'in_progress'">No tasks in progress</p>
        <p v-else>No completed tasks</p>
      </div>

      <div v-else class="space-y-3">
        <TodoCard
          v-for="task in currentTasks"
          :key="task.id"
          :task="task"
          @start="handleStartTask"
          @complete="handleComplete"
          @delete="handleDelete"
          @edit="handleEdit"
        />
      </div>
    </div>

    <!-- Add/Edit Task Modal -->
    <AddTaskModal
      v-if="showAddModal"
      :task="editingTask"
      @close="handleCloseModal"
      @add="handleAddTask"
      @update="handleUpdateTask"
    />
  </div>
</template>
