<script setup lang="ts">
import type { ObservabilityStats, AgentActivity } from '@/types/observability';

defineProps<{
  stats: ObservabilityStats;
  agentActivity: AgentActivity[];
  isConnected: boolean;
}>();
</script>

<template>
  <div class="space-y-4">
    <!-- Connection status -->
    <div class="flex items-center gap-2 text-sm">
      <div
        class="w-2 h-2 rounded-full"
        :class="isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'"
      ></div>
      <span :class="isConnected ? 'text-green-400' : 'text-red-400'">
        {{ isConnected ? 'Live' : 'Disconnected' }}
      </span>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-2xl font-bold text-primary-400">{{ stats.activeAgents }}</p>
        <p class="text-xs text-gray-500">Active Agents</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-2xl font-bold text-yellow-400">{{ stats.toolCalls }}</p>
        <p class="text-xs text-gray-500">Tool Calls (5m)</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-2xl font-bold text-blue-400">{{ stats.totalEvents }}</p>
        <p class="text-xs text-gray-500">Events (5m)</p>
      </div>
      <div class="bg-gray-800 rounded-lg p-3 border border-gray-700">
        <p class="text-2xl font-bold text-purple-400">{{ stats.sessions }}</p>
        <p class="text-xs text-gray-500">Sessions</p>
      </div>
    </div>

    <!-- Agent activity -->
    <div v-if="agentActivity.length > 0" class="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <p class="text-xs text-gray-500 mb-2">Active Agents</p>
      <div class="space-y-2">
        <div
          v-for="agent in agentActivity"
          :key="agent.name"
          class="flex items-center gap-2"
        >
          <div
            class="w-2 h-2 rounded-full flex-shrink-0"
            :style="{ backgroundColor: agent.color }"
          ></div>
          <span class="text-sm text-gray-300 flex-1 truncate">{{ agent.name }}</span>
          <span class="text-xs text-gray-500">{{ agent.eventCount }} events</span>
        </div>
      </div>
    </div>
  </div>
</template>
