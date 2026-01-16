<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}>();

const threshold = props.threshold ?? 80;

const indicatorStyle = computed(() => ({
  transform: `translateY(${Math.min(props.pullDistance, threshold)}px)`,
  opacity: Math.min(props.pullDistance / (threshold * 0.7), 1),
}));

const progress = computed(() => Math.min(props.pullDistance / threshold, 1));
</script>

<template>
  <div
    class="absolute top-0 left-0 right-0 flex justify-center pointer-events-none z-10"
    :style="indicatorStyle"
  >
    <div
      class="flex items-center justify-center w-10 h-10 -mt-12 bg-gray-800 rounded-full shadow-lg"
      :class="{ 'animate-spin': isRefreshing }"
    >
      <svg
        class="w-5 h-5 text-primary-400"
        :style="{ transform: `rotate(${progress * 360}deg)` }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </div>
  </div>
</template>
