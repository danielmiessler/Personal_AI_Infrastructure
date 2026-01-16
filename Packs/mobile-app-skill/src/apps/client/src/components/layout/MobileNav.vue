<script setup lang="ts">
defineProps<{
  current: string;
}>();

const emit = defineEmits<{
  navigate: [view: string];
}>();

const navItems = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'todo', label: 'Todo', icon: 'todo' },
  { id: 'files', label: 'Files', icon: 'folder' },
  { id: 'knowledge', label: 'Know', icon: 'book' },
  { id: 'observability', label: 'Observe', icon: 'activity' },
  { id: 'terminal', label: 'Term', icon: 'terminal' },
];
</script>

<template>
  <nav class="flex-shrink-0 bg-gray-800 border-t border-gray-700 pb-safe">
    <div class="flex justify-around items-center h-14">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="emit('navigate', item.id)"
        :class="[
          'flex flex-col items-center justify-center w-full h-full touch-feedback',
          current === item.id ? 'text-primary-400' : 'text-gray-400'
        ]"
      >
        <!-- Chat icon -->
        <svg v-if="item.icon === 'chat'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <!-- Folder icon -->
        <svg v-else-if="item.icon === 'folder'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <!-- Todo icon (checklist) -->
        <svg v-else-if="item.icon === 'todo'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <!-- Book icon -->
        <svg v-else-if="item.icon === 'book'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <!-- Activity icon (observability) -->
        <svg v-else-if="item.icon === 'activity'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <!-- Terminal icon -->
        <svg v-else-if="item.icon === 'terminal'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-xs mt-1">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
