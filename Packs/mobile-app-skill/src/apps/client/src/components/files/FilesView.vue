<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFileTree } from '@/composables/useFileTree';
import { usePullToRefresh } from '@/composables/usePullToRefresh';
import FilePreview from './FilePreview.vue';
import PullToRefresh from '@/components/common/PullToRefresh.vue';

const route = useRoute();
const router = useRouter();

const {
  currentPath,
  entries,
  isLoading,
  error,
  selectedFile,
  fileContent,
  fileMimeType,
  isLoadingFile,
  pathParts,
  parentPath,
  showHidden,
  loadDirectory,
  navigateTo,
  goUp,
  openEntry,
  closeFile,
  toggleHidden,
  downloadFile,
  formatSize,
  getFileIcon,
} = useFileTree();

function handleDownload() {
  if (selectedFile.value) {
    downloadFile(selectedFile.value);
  }
}

const listContainer = ref<HTMLElement | null>(null);

// Pull to refresh
const { pullDistance, isRefreshing } = usePullToRefresh(listContainer, {
  onRefresh: async () => {
    await loadDirectory();
  },
});

// Load initial directory
onMounted(() => {
  const pathParam = route.params.path;
  const initialPath = pathParam
    ? '/' + (Array.isArray(pathParam) ? pathParam.join('/') : pathParam)
    : import.meta.env.VITE_HOME_DIR || '';
  loadDirectory(initialPath);
});

// Sync URL with current path
watch(currentPath, (newPath) => {
  const urlPath = '/files' + newPath;
  if (route.fullPath !== urlPath) {
    router.replace(urlPath);
  }
});

function handleBreadcrumbClick(path: string) {
  navigateTo(path);
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Breadcrumb navigation -->
    <div class="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-3 py-2">
      <div class="flex items-center gap-1 text-sm">
        <button
          v-if="parentPath"
          @click="goUp"
          class="p-1.5 rounded hover:bg-gray-700 touch-feedback flex-shrink-0"
          title="Go up"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="flex-1 flex items-center gap-1 overflow-x-auto">
          <button
            v-for="(part, index) in pathParts"
            :key="part.path"
            @click="handleBreadcrumbClick(part.path)"
            class="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-700 touch-feedback whitespace-nowrap"
            :class="index === pathParts.length - 1 ? 'text-primary-400' : 'text-gray-400'"
          >
            <span v-if="index > 0" class="text-gray-600">/</span>
            <span>{{ part.name }}</span>
          </button>
        </div>

        <!-- Hidden files toggle -->
        <button
          @click="toggleHidden"
          class="p-1.5 rounded hover:bg-gray-700 touch-feedback flex-shrink-0"
          :class="showHidden ? 'text-primary-400' : 'text-gray-500'"
          :title="showHidden ? 'Hide hidden files' : 'Show hidden files'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="showHidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path v-if="showHidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
      </div>
    </div>

    <!-- File list or preview -->
    <div class="flex-1 overflow-hidden relative">
      <!-- Loading state -->
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-900/50">
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
          <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
          <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="p-4 text-red-400">
        <p>{{ error }}</p>
        <button @click="loadDirectory()" class="mt-2 px-3 py-1 bg-gray-700 rounded">
          Retry
        </button>
      </div>

      <!-- File preview -->
      <FilePreview
        v-else-if="selectedFile"
        :file="selectedFile"
        :content="fileContent"
        :mimeType="fileMimeType"
        :isLoading="isLoadingFile"
        @close="closeFile"
        @download="handleDownload"
      />

      <!-- Directory listing -->
      <div v-else ref="listContainer" class="h-full overflow-y-auto relative">
        <PullToRefresh :pull-distance="pullDistance" :is-refreshing="isRefreshing" />
        <div v-if="entries.length === 0" class="p-4 text-gray-500 text-center">
          Empty directory
        </div>

        <ul v-else class="divide-y divide-gray-800">
          <li
            v-for="entry in entries"
            :key="entry.path"
            @click="openEntry(entry)"
            class="flex items-center gap-3 px-4 py-3 touch-feedback cursor-pointer"
          >
            <!-- Icon -->
            <div :class="['w-6 h-6 flex-shrink-0', `file-icon-${getFileIcon(entry)}`]">
              <!-- Folder icon -->
              <svg v-if="entry.isDirectory" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <!-- File icon -->
              <svg v-else fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>

            <!-- Name and info -->
            <div class="flex-1 min-w-0">
              <p class="truncate text-gray-100">{{ entry.name }}</p>
              <p class="text-xs text-gray-500">
                <span v-if="!entry.isDirectory">{{ formatSize(entry.size) }}</span>
              </p>
            </div>

            <!-- Chevron for directories -->
            <svg v-if="entry.isDirectory" class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
