export interface Note {
  name: string;
  path: string;
  folder: string;
  mtime: string;
}

export interface NoteDetail {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  wikiLinks: string[];
  backlinks: BackLink[];
}

export interface BackLink {
  name: string;
  path: string;
  context?: string;
}

export interface SearchResult {
  name: string;
  path: string;
  folder: string;
  snippet?: string;
}
