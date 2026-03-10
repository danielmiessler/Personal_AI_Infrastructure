<template>
  <div class="mx-4 mt-4 mobile:mx-2 mobile:mt-2">
    <div class="glass-panel rounded-2xl p-2 flex gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="$emit('set-tab', tab.id)"
        class="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
        :class="[
          activeTab === tab.id
            ? 'bg-[var(--theme-accent-primary)] text-white shadow-lg'
            : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-secondary)]'
        ]"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.count !== undefined"
          class="ml-1 px-1.5 py-0.5 text-xs rounded-full"
          :class="[
            activeTab === tab.id
              ? 'bg-white/20'
              : 'bg-[var(--theme-bg-tertiary)]'
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Monitor, Cloud } from 'lucide-vue-next';

interface Tab {
  id: 'local' | 'remote';
  label: string;
  icon: any;
  count?: number;
}

defineProps<{
  activeTab: 'local' | 'remote';
  localCount?: number;
  remoteCount?: number;
}>();

defineEmits<{
  'set-tab': ['local' | 'remote'];
}>();

const tabs: Tab[] = [
  { id: 'local', label: 'Local', icon: Monitor },
  { id: 'remote', label: 'Remote', icon: Cloud }
];
</script>
