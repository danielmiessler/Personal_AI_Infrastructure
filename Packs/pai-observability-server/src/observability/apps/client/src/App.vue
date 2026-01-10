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

    <div class="space-y-2">
      <div
        v-for="event in events"
        :key="event.id"
        class="bg-[var(--bg-secondary)] rounded-lg p-4 border-l-4"
        :class="getBorderColor(event.hook_event_type)"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono text-sm text-[var(--accent-blue)]">
              {{ event.agent_name || event.source_app }}
            </span>
            <span class="mx-2 text-[var(--text-secondary)]">·</span>
            <span class="text-sm">{{ event.hook_event_type }}</span>
          </div>
          <span class="text-xs text-[var(--text-secondary)]">
            {{ formatTime(event.timestamp) }}
          </span>
        </div>

        <div v-if="event.payload?.tool_name" class="mt-2">
          <span class="text-[var(--accent-green)]">
            {{ event.payload.tool_name }}
          </span>
          <span v-if="event.payload?.tool_input?.command" class="ml-2 font-mono text-xs text-[var(--text-secondary)]">
            {{ truncate(event.payload.tool_input.command, 60) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="events.length === 0" class="text-center text-[var(--text-secondary)] py-12">
      No events yet. Start using Claude Code to see activity here.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

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
let ws: WebSocket | null = null

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

function getBorderColor(eventType: string): string {
  const colors: Record<string, string> = {
    'PreToolUse': 'border-[var(--accent-blue)]',
    'PostToolUse': 'border-[var(--accent-green)]',
    'Stop': 'border-[var(--accent-yellow)]',
    'Completed': 'border-[var(--accent-green)]',
    'UserPromptSubmit': 'border-[var(--text-secondary)]',
  }
  return colors[eventType] || 'border-[var(--text-secondary)]'
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '...'
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  ws?.close()
})
</script>
