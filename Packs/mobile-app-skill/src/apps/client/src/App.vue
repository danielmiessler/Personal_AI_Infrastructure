<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MobileNav from './components/layout/MobileNav.vue';
import { useIOSViewport } from '@/composables/useIOSViewport';
import { useWebSocket } from '@/composables/useWebSocket';

const route = useRoute();
const router = useRouter();

// Initialize iOS viewport handling for keyboard-aware layout
useIOSViewport();

// Connect WebSocket globally on app mount
const { connect } = useWebSocket();
onMounted(() => {
  connect();
});

const currentView = computed(() => {
  if (route.path.startsWith('/chat')) return 'chat';
  if (route.path.startsWith('/todo')) return 'todo';
  if (route.path.startsWith('/files')) return 'files';
  if (route.path.startsWith('/knowledge')) return 'knowledge';
  if (route.path.startsWith('/observability')) return 'observability';
  if (route.path.startsWith('/terminal')) return 'terminal';
  return 'chat';
});

function navigateTo(view: string) {
  router.push(`/${view}`);
}
</script>

<template>
  <div class="h-dvh flex flex-col bg-gray-900 text-gray-100">
    <!-- Main content area -->
    <main class="flex-1 overflow-hidden pt-safe">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <!-- Bottom navigation -->
    <MobileNav :current="currentView" @navigate="navigateTo" />
  </div>
</template>
