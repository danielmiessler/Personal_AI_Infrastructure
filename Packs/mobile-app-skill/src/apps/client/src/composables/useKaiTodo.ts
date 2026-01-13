import { ref } from 'vue';

export interface RecurringConfig {
  interval: 'daily' | 'weekly' | 'custom';
  customDays?: number; // For custom interval
  runTime?: string;    // HH:mm format - time of day to run
  lastRun?: string;    // ISO date of last completion
  nextRun?: string;    // ISO date of next scheduled run
}

export type ClaudeModel = 'sonnet' | 'opus' | 'haiku';

export interface KaiTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  added: string;
  skill?: string;
  notes?: string;
  autonomous?: boolean;
  recurring?: RecurringConfig;
  model?: ClaudeModel;
  status: 'queued' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
}

export interface KaiTasks {
  queued: KaiTask[];
  inProgress: KaiTask[];
  completed: KaiTask[];
}

export function useKaiTodo() {
  const tasks = ref<KaiTasks>({ queued: [], inProgress: [], completed: [] });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const fetchTasks = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/todo');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      tasks.value = await response.json();
    } catch (e) {
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  };

  const addTask = async (title: string, options: { priority?: string; skill?: string; notes?: string; autonomous?: boolean; recurring?: RecurringConfig; model?: ClaudeModel } = {}) => {
    try {
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ...options }),
      });

      if (!response.ok) throw new Error('Failed to add task');
      await fetchTasks();
      return true;
    } catch (e) {
      error.value = String(e);
      return false;
    }
  };

  const updateStatus = async (id: string, status: 'queued' | 'in_progress' | 'completed') => {
    try {
      const response = await fetch(`/api/todo/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update task');
      await fetchTasks();
      return true;
    } catch (e) {
      error.value = String(e);
      return false;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/todo/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');
      await fetchTasks();
      return true;
    } catch (e) {
      error.value = String(e);
      return false;
    }
  };

  const updateTask = async (id: string, updates: { title?: string; priority?: string; skill?: string; notes?: string; autonomous?: boolean; recurring?: RecurringConfig; model?: ClaudeModel }) => {
    try {
      const response = await fetch(`/api/todo/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update task');
      await fetchTasks();
      return true;
    } catch (e) {
      error.value = String(e);
      return false;
    }
  };

  const startTask = async (id: string) => {
    return updateStatus(id, 'in_progress');
  };

  const completeTask = async (id: string) => {
    return updateStatus(id, 'completed');
  };

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    updateStatus,
    deleteTask,
    startTask,
    completeTask,
  };
}
