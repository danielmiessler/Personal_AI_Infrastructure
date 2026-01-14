<template>
  <div class="min-h-screen bg-[var(--bg-primary)] p-6">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--accent-blue)]">
        PAI Observability
      </h1>
      <p class="text-[var(--text-secondary)]">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
        · {{ events.length }} events
      </p>
    </header>

    <!-- Tab Navigation -->
    <div class="flex gap-4 mb-6 border-b border-[var(--text-secondary)] border-opacity-20">
      <button
        @click="activeTab = 'events'"
        class="pb-2 px-1 text-sm font-medium transition-colors"
        :class="activeTab === 'events'
          ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
      >
        Events
      </button>
      <button
        @click="activeTab = 'models'"
        class="pb-2 px-1 text-sm font-medium transition-colors"
        :class="activeTab === 'models'
          ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'"
      >
        Models
      </button>
    </div>

    <!-- Content Views -->
    <EventsFeed v-if="activeTab === 'events'" :events="events" />
    <ModelsView v-if="activeTab === 'models'" :recently-used-models="recentlyUsedModels" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import EventsFeed from './components/EventsFeed.vue'
import ModelsView from './components/ModelsView.vue'

interface HookEvent {
  id: number
  source_app: string
  agent_name?: string
  hook_event_type: string
  payload: Record<string, any>
  timestamp?: number
}

const events = ref<HookEvent[]>([])
const isConnected = ref(false)
const activeTab = ref<'events' | 'models'>('events')
let ws: WebSocket | null = null

// Track models used in recent events (last 5 minutes)
const recentlyUsedModels = computed(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  const modelNames = new Set<string>()

  for (const event of events.value) {
    if (!event.timestamp || event.timestamp < fiveMinutesAgo) continue

    // Check for model usage in tool calls
    const toolName = event.payload?.tool_name
    if (toolName && (toolName.includes('Chat') || toolName.includes('Generate') || toolName.includes('Run'))) {
      // Try to extract model name from tool input
      const modelName =
        event.payload?.tool_input?.model ||
        event.payload?.tool_input?.args?.model ||
        event.payload?.result?.model

      if (modelName) {
        modelNames.add(modelName)
      }
    }

    // Check for model in payload directly
    if (event.payload?.model) {
      modelNames.add(event.payload.model)
    }
  }

  return modelNames
})

function connect() {
  ws = new WebSocket('ws://localhost:4000/stream')

  ws.onopen = () => {
    isConnected.value = true
    console.log('Connected to observability server')
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'initial') {
      events.value = data.data
    } else if (data.type === 'event') {
      events.value.unshift(data.data)
      if (events.value.length > 100) {
        events.value.pop()
      }
    }
  }

  ws.onclose = () => {
    isConnected.value = false
    console.log('Disconnected from observability server')
    // Reconnect after 3 seconds
    setTimeout(connect, 3000)
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  ws?.close()
})
</script>
