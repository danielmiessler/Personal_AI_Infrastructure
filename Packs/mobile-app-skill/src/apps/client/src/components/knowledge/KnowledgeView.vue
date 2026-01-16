<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useKnowledge } from '@/composables/useKnowledge';
import { usePullToRefresh } from '@/composables/usePullToRefresh';
import NoteViewer from './NoteViewer.vue';
import PullToRefresh from '@/components/common/PullToRefresh.vue';

const {
  notes,
  currentNote,
  searchResults,
  isLoading,
  isSearching,
  loadNotes,
  loadNote,
  goBack,
  resolveWikiLink,
  search,
  clearSearch,
  canGoBack,
} = useKnowledge();

const searchQuery = ref('');
const searchMode = ref<'title' | 'content'>('title');
const listContainer = ref<HTMLElement | null>(null);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

// Pull to refresh
const { pullDistance, isRefreshing } = usePullToRefresh(listContainer, {
  onRefresh: async () => {
    await loadNotes();
  },
});

// Debounced search
watch(searchQuery, (query) => {
  if (searchTimeout) clearTimeout(searchTimeout);

  if (!query.trim()) {
    clearSearch();
    return;
  }

  searchTimeout = setTimeout(() => {
    search(query, searchMode.value === 'content');
  }, 300);
});

onMounted(() => {
  loadNotes();
});

const handleNoteClick = (path: string) => {
  loadNote(path);
  searchQuery.value = '';
  clearSearch();
};

const handleResolveLink = async (link: string) => {
  const resolvedPath = await resolveWikiLink(link);
  if (resolvedPath) {
    loadNote(resolvedPath);
  } else {
    // Could show a toast or search for the link
    searchQuery.value = link;
    search(link);
  }
};

const handleBack = () => {
  goBack();
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const toggleSearchMode = () => {
  searchMode.value = searchMode.value === 'title' ? 'content' : 'title';
  if (searchQuery.value) {
    search(searchQuery.value, searchMode.value === 'content');
  }
};
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Note viewer (when a note is open) -->
    <NoteViewer
      v-if="currentNote"
      :note="currentNote"
      :can-go-back="canGoBack()"
      @back="handleBack"
      @navigate="handleNoteClick"
      @resolve-link="handleResolveLink"
    />

    <!-- Notes list (when no note is open) -->
    <template v-else>
      <!-- Search bar -->
      <div class="flex-shrink-0 p-3 bg-gray-800 border-b border-gray-700">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search notes..."
              class="w-full bg-gray-700 text-gray-100 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <!-- Clear button -->
            <button
              v-if="searchQuery"
              @click="searchQuery = ''; clearSearch()"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Search mode toggle -->
          <button
            @click="toggleSearchMode"
            class="px-3 py-2 rounded-lg text-sm font-medium touch-feedback"
            :class="searchMode === 'content' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300'"
          >
            {{ searchMode === 'content' ? 'Content' : 'Title' }}
          </button>
        </div>
      </div>

      <!-- Search results -->
      <div v-if="searchQuery && searchResults.length > 0" class="flex-1 overflow-y-auto">
        <div class="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide bg-gray-800/50">
          {{ searchResults.length }} result{{ searchResults.length !== 1 ? 's' : '' }}
        </div>
        <ul class="divide-y divide-gray-800">
          <li
            v-for="result in searchResults"
            :key="result.path"
            @click="handleNoteClick(result.path)"
            class="px-4 py-3 touch-feedback cursor-pointer hover:bg-gray-800/50"
          >
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ result.name }}</div>
                <div v-if="result.folder" class="text-xs text-gray-500 truncate">{{ result.folder }}</div>
                <div v-if="result.snippet" class="text-sm text-gray-400 mt-1 line-clamp-2">{{ result.snippet }}</div>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- No search results -->
      <div v-else-if="searchQuery && !isSearching && searchResults.length === 0" class="flex-1 flex items-center justify-center">
        <div class="text-center text-gray-500">
          <p>No notes found for "{{ searchQuery }}"</p>
          <button
            v-if="searchMode === 'title'"
            @click="toggleSearchMode"
            class="mt-2 text-primary-400 hover:text-primary-300"
          >
            Try searching content instead
          </button>
        </div>
      </div>

      <!-- Recent notes list -->
      <div v-else ref="listContainer" class="flex-1 overflow-y-auto relative">
        <PullToRefresh :pull-distance="pullDistance" :is-refreshing="isRefreshing" />
        <div v-if="isLoading" class="flex items-center justify-center h-32">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
            <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
            <div class="w-2 h-2 bg-primary-400 rounded-full loading-dot"></div>
          </div>
        </div>

        <div v-else-if="notes.length === 0" class="p-4 text-center text-gray-500">
          No notes found in vault
        </div>

        <template v-else>
          <div class="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide bg-gray-800/50">
            Recent Notes
          </div>
          <ul class="divide-y divide-gray-800">
            <li
              v-for="note in notes"
              :key="note.path"
              @click="handleNoteClick(note.path)"
              class="px-4 py-3 touch-feedback cursor-pointer hover:bg-gray-800/50"
            >
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <div class="flex-1 min-w-0">
                  <div class="font-medium truncate">{{ note.name }}</div>
                  <div class="flex items-center gap-2 text-xs text-gray-500">
                    <span v-if="note.folder" class="truncate">{{ note.folder }}</span>
                    <span>{{ formatDate(note.mtime) }}</span>
                  </div>
                </div>
                <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
