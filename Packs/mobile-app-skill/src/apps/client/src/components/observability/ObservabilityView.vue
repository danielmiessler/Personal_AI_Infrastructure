<script setup lang="ts">
import { ref } from 'vue';
import { useObservability } from '@/composables/useObservability';
import type { HookEvent } from '@/types/observability';
import LiveStats from './LiveStats.vue';
import EventCard from './EventCard.vue';
import EventDetail from './EventDetail.vue';

const {
  recentEvents,
  isConnected,
  isConnecting,
  error,
  stats,
  agentActivity,
  connect,
  getEventTypeColor,
  getRelativeTime,
} = useObservability();

const activeTab = ref<'stats' | 'events'>('stats');
const selectedEvent = ref<HookEvent | null>(null);

function handleEventSelect(event: HookEvent) {
  selectedEvent.value = event;
}

function handleCloseDetail() {
  selectedEvent.value = null;
}

function handleRetry() {
  connect();
}
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-semibold">AI Observability</h1>
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full"
            :class="isConnected ? 'bg-green-400 animate-pulse' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'"
          ></div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex mt-3 gap-1">
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'stats' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="activeTab = 'stats'"
        >
          <svg class="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Stats
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          :class="activeTab === 'events' ? 'bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'"
          @click="activeTab = 'events'"
        >
          <svg class="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Events
          <span v-if="recentEvents.length" class="ml-1 px-1.5 py-0.5 bg-gray-800 rounded-full text-xs">
            {{ recentEvents.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Error state -->
      <div v-if="error && !isConnected" class="text-center py-8">
        <p class="text-red-400 mb-2">{{ error }}</p>
        <button
          class="px-4 py-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600"
          @click="handleRetry"
        >
          Retry
        </button>
        <p class="text-xs text-gray-500 mt-4">
          Make sure the observability server is running on port 4000
        </p>
      </div>

      <!-- Stats view -->
      <LiveStats
        v-else-if="activeTab === 'stats'"
        :stats="stats"
        :agent-activity="agentActivity"
        :is-connected="isConnected"
      />

      <!-- Events view -->
      <div v-else-if="activeTab === 'events'">
        <div v-if="recentEvents.length === 0" class="text-center py-8 text-gray-500">
          <p>No events yet</p>
          <p class="text-xs mt-1">Events will appear here in real-time</p>
        </div>
        <div v-else class="space-y-2">
          <EventCard
            v-for="event in recentEvents"
            :key="`${event.session_id}-${event.timestamp}`"
            :event="event"
            :get-event-type-color="getEventTypeColor"
            :get-relative-time="getRelativeTime"
            @select="handleEventSelect"
          />
        </div>
      </div>
    </div>

    <!-- Event detail modal -->
    <EventDetail
      v-if="selectedEvent"
      :event="selectedEvent"
      @close="handleCloseDetail"
    />
  </div>
</template>
