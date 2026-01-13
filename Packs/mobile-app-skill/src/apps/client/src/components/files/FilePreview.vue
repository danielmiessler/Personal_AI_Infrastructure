<script setup lang="ts">
import { computed } from 'vue';
import type { FileEntry } from '@/types/files';

const props = defineProps<{
  file: FileEntry;
  content: string;
  mimeType: string;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  close: [];
  download: [];
}>();


const isImage = computed(() => props.mimeType.startsWith('image/'));
const isBase64 = computed(() => props.mimeType.includes(';base64'));

const imageSrc = computed(() => {
  if (isImage.value && isBase64.value) {
    const type = props.mimeType.replace(';base64', '');
    return `data:${type};base64,${props.content}`;
  }
  return '';
});

const displayContent = computed(() => {
  if (isBase64.value && !isImage.value) {
    return '[Binary file - cannot display]';
  }
  return props.content;
});

const lineCount = computed(() => {
  return props.content.split('\n').length;
});
</script>

<template>
  <div class="h-full flex flex-col bg-gray-900">
    <!-- Header -->
    <div class="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div class="flex items-center gap-2 min-w-0">
        <button
          @click="emit('close')"
          class="p-1.5 rounded hover:bg-gray-700 touch-feedback flex-shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="font-medium truncate">{{ file.name }}</h2>
      </div>
      <div class="flex items-center gap-3 flex-shrink-0">
        <span class="text-xs text-gray-500">{{ lineCount }} lines</span>
        <!-- Download button -->
        <button
          @click="emit('download')"
          class="p-1.5 rounded bg-primary-600 hover:bg-primary-500 touch-feedback"
          title="Download file"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center h-full">
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
          <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
          <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
        </div>
      </div>

      <!-- Image preview -->
      <div v-else-if="isImage && imageSrc" class="flex items-center justify-center h-full">
        <img :src="imageSrc" :alt="file.name" class="max-w-full max-h-full object-contain" />
      </div>

      <!-- Text content -->
      <pre v-else class="text-sm font-mono text-gray-300 whitespace-pre-wrap break-words"><code>{{ displayContent }}</code></pre>
    </div>
  </div>
</template>
