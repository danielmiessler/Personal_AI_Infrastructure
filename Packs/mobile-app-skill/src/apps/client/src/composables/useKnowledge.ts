import { ref } from 'vue';
import type { Note, NoteDetail, SearchResult } from '@/types/knowledge';

const API_BASE = '/api/knowledge';

export function useKnowledge() {
  const notes = ref<Note[]>([]);
  const currentNote = ref<NoteDetail | null>(null);
  const searchResults = ref<SearchResult[]>([]);
  const isLoading = ref(false);
  const isSearching = ref(false);
  const error = ref<string | null>(null);

  // Navigation history for back button
  const history = ref<string[]>([]);

  const loadNotes = async (folder?: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (folder) params.set('folder', folder);

      const response = await fetch(`${API_BASE}/notes?${params}`);
      const data = await response.json();
      notes.value = data.notes || [];
    } catch (e) {
      console.error('Failed to load notes:', e);
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  };

  const loadNote = async (path: string, addToHistory = true) => {
    isLoading.value = true;
    error.value = null;

    // Add current note to history before navigating
    if (addToHistory && currentNote.value) {
      history.value.push(currentNote.value.path);
    }

    try {
      const response = await fetch(`${API_BASE}/note?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Note not found');
      }
      currentNote.value = await response.json();
    } catch (e) {
      console.error('Failed to load note:', e);
      error.value = String(e);
      currentNote.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const goBack = async () => {
    if (history.value.length > 0) {
      const previousPath = history.value.pop()!;
      await loadNote(previousPath, false);
    } else {
      currentNote.value = null;
    }
  };

  const resolveWikiLink = async (link: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE}/resolve?link=${encodeURIComponent(link)}`);
      const data = await response.json();
      if (data.resolved) {
        return data.path;
      }
      return null;
    } catch (e) {
      console.error('Failed to resolve link:', e);
      return null;
    }
  };

  const search = async (query: string, fullText = false) => {
    if (!query.trim()) {
      searchResults.value = [];
      return;
    }

    isSearching.value = true;

    try {
      const params = new URLSearchParams({ q: query });
      if (fullText) params.set('fullText', 'true');

      const response = await fetch(`${API_BASE}/search?${params}`);
      const data = await response.json();
      searchResults.value = data.results || [];
    } catch (e) {
      console.error('Search failed:', e);
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  };

  const clearSearch = () => {
    searchResults.value = [];
  };

  const closeNote = () => {
    currentNote.value = null;
    history.value = [];
  };

  const canGoBack = () => history.value.length > 0 || currentNote.value !== null;

  return {
    notes,
    currentNote,
    searchResults,
    isLoading,
    isSearching,
    error,
    history,
    loadNotes,
    loadNote,
    goBack,
    resolveWikiLink,
    search,
    clearSearch,
    closeNote,
    canGoBack,
  };
}
