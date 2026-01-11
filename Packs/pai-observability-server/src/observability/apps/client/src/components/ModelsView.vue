<template>
  <div class="space-y-4">
    <!-- Status Bar -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div
          class="w-2 h-2 rounded-full"
          :class="ollamaHealthy ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'"
        ></div>
        <span class="text-sm text-[var(--text-secondary)]">
          {{ ollamaHealthy ? 'Ollama Connected' : 'Ollama Disconnected' }}
        </span>
        <span v-if="models.length > 0" class="text-sm text-[var(--text-secondary)]">
          · {{ models.length }} model{{ models.length === 1 ? '' : 's' }}
        </span>
      </div>
      <button
        @click="fetchModels"
        class="text-sm text-[var(--accent-blue)] hover:underline"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </div>

    <!-- Models Grid -->
    <div v-if="models.length > 0" class="grid gap-3">
      <div
        v-for="model in models"
        :key="model.name"
        class="bg-[var(--bg-secondary)] rounded-lg p-4 border-l-4"
        :class="isRecentlyUsed(model.name) ? 'border-[var(--accent-green)]' : 'border-[var(--text-secondary)]'"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-mono text-sm font-semibold text-[var(--accent-blue)]">
                {{ model.name }}
              </h3>
              <span
                v-if="isRecentlyUsed(model.name)"
                class="text-xs px-2 py-0.5 bg-[var(--accent-green)] bg-opacity-20 text-[var(--accent-green)] rounded"
              >
                Active
              </span>
            </div>
            <p class="text-xs text-[var(--text-secondary)] mt-1">
              {{ model.details?.family || 'Unknown' }} ·
              {{ model.details?.parameter_size || 'Unknown size' }}
            </p>
            <div class="flex gap-4 mt-2 text-xs text-[var(--text-secondary)]">
              <span>Size: {{ formatSize(model.size) }}</span>
              <span v-if="model.details?.quantization_level">
                Quant: {{ model.details.quantization_level }}
              </span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs text-[var(--text-secondary)]">
              Modified: {{ formatDate(model.modified_at) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isLoading && ollamaHealthy" class="text-center text-[var(--text-secondary)] py-12">
      No models found. Pull a model with: <code class="text-[var(--accent-blue)]">ollama pull &lt;model&gt;</code>
    </div>

    <!-- Error State -->
    <div v-else-if="!isLoading && !ollamaHealthy" class="text-center text-[var(--accent-red)] py-12">
      <p>Cannot connect to Ollama</p>
      <p class="text-sm text-[var(--text-secondary)] mt-2">
        Make sure Ollama is running: <code class="text-[var(--accent-blue)]">ollama serve</code>
      </p>
    </div>

    <!-- Loading State -->
    <div v-else class="text-center text-[var(--text-secondary)] py-12">
      Loading models...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface OllamaModel {
  name: string
  modified_at: string
  size: number
  digest: string
  details?: {
    format: string
    family: string
    families: string[]
    parameter_size: string
    quantization_level: string
  }
}

interface Props {
  recentlyUsedModels: Set<string>
}

const props = defineProps<Props>()

const models = ref<OllamaModel[]>([])
const ollamaHealthy = ref(false)
const isLoading = ref(false)
let pollInterval: ReturnType<typeof setInterval> | null = null

async function fetchModels() {
  isLoading.value = true
  try {
    const response = await fetch('http://localhost:11434/api/tags')

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    models.value = data.models || []
    ollamaHealthy.value = true
  } catch (error) {
    console.error('Failed to fetch models:', error)
    ollamaHealthy.value = false
    models.value = []
  } finally {
    isLoading.value = false
  }
}

function isRecentlyUsed(modelName: string): boolean {
  return props.recentlyUsedModels.has(modelName)
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

onMounted(() => {
  fetchModels()
  // Poll every 10 seconds
  pollInterval = setInterval(fetchModels, 10000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>
