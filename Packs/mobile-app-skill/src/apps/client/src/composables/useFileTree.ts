import { ref, computed } from 'vue';
import type { FileEntry, FileListResponse, FileReadResponse } from '@/types/files';

const HOME = import.meta.env.VITE_HOME_DIR || '';

export function useFileTree() {
  const currentPath = ref(HOME);
  const entries = ref<FileEntry[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const showHidden = ref(false);

  const selectedFile = ref<FileEntry | null>(null);
  const fileContent = ref<string>('');
  const fileMimeType = ref<string>('');
  const isLoadingFile = ref(false);

  const pathParts = computed(() => {
    const parts = currentPath.value.split('/').filter(Boolean);
    const result: { name: string; path: string }[] = [];
    let accumulated = '';

    for (const part of parts) {
      accumulated += '/' + part;
      result.push({ name: part, path: accumulated });
    }

    return result;
  });

  const parentPath = computed(() => {
    const parts = currentPath.value.split('/').filter(Boolean);
    if (parts.length <= 1) return null;
    parts.pop();
    return '/' + parts.join('/');
  });

  async function loadDirectory(path?: string) {
    const targetPath = path ?? currentPath.value;
    isLoading.value = true;
    error.value = null;

    try {
      const hiddenParam = showHidden.value ? '&hidden=true' : '';
      const response = await fetch(`/api/files/list?path=${encodeURIComponent(targetPath)}${hiddenParam}`);
      const data: FileListResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to load directory');
      }

      currentPath.value = data.path;
      entries.value = data.entries;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      entries.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function navigateTo(path: string) {
    selectedFile.value = null;
    fileContent.value = '';
    await loadDirectory(path);
  }

  async function goUp() {
    if (parentPath.value) {
      await navigateTo(parentPath.value);
    }
  }

  async function openEntry(entry: FileEntry) {
    if (entry.isDirectory) {
      await navigateTo(entry.path);
    } else {
      await readFile(entry);
    }
  }

  async function readFile(entry: FileEntry) {
    selectedFile.value = entry;
    isLoadingFile.value = true;
    fileContent.value = '';
    fileMimeType.value = '';

    try {
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(entry.path)}`);
      const data: FileReadResponse = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || 'Failed to read file');
      }

      fileContent.value = data.content;
      fileMimeType.value = data.mimeType;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoadingFile.value = false;
    }
  }

  function closeFile() {
    selectedFile.value = null;
    fileContent.value = '';
    fileMimeType.value = '';
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getFileIcon(entry: FileEntry): string {
    if (entry.isDirectory) return 'folder';
    switch (entry.extension) {
      case '.md': return 'md';
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx': return 'js';
      case '.json': return 'json';
      case '.py': return 'py';
      default: return 'default';
    }
  }

  async function toggleHidden() {
    showHidden.value = !showHidden.value;
    await loadDirectory();
  }

  function downloadFile(entry: FileEntry) {
    // Create a link to trigger browser download
    const link = document.createElement('a');
    link.href = `/api/files/download?path=${encodeURIComponent(entry.path)}`;
    link.download = entry.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function isDownloadableFile(entry: FileEntry): boolean {
    // Files that should show download button (not previewable as text/image)
    const downloadableExtensions = [
      '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
      '.pdf', '.zip', '.tar', '.gz', '.dmg', '.exe',
      '.mp3', '.mp4', '.wav', '.mov', '.avi'
    ];
    return !entry.isDirectory && downloadableExtensions.includes(entry.extension || '');
  }

  return {
    // State
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

    // Actions
    loadDirectory,
    navigateTo,
    goUp,
    openEntry,
    readFile,
    closeFile,
    toggleHidden,
    downloadFile,

    // Helpers
    formatSize,
    getFileIcon,
    isDownloadableFile,
  };
}
