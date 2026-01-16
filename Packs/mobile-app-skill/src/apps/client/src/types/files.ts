export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: string;
  extension: string | null;
}

export interface FileListResponse {
  entries: FileEntry[];
  path: string;
}

export interface FileReadResponse {
  content: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface SearchResult {
  path: string;
  name: string;
  matches: string[];
  score: number;
}
