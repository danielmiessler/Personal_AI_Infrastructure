/**
 * Frontmatter Parser
 *
 * Parses YAML frontmatter from markdown files captured by the history system.
 */

export interface HistoryFrontmatter {
  capture_type: 'LEARNING' | 'SESSION' | 'RESEARCH' | 'DECISION' | 'FEATURE';
  timestamp: string;
  session_id: string;
  executor: string;
  agent_completion?: string;
}

export interface ParsedMarkdown {
  frontmatter: HistoryFrontmatter;
  body: string;
  title: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
  frontmatter: HistoryFrontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error('Invalid frontmatter format: missing --- delimiters');
  }

  const yamlContent = match[1];
  const body = match[2].trim();

  // Parse YAML manually (simple key: value pairs)
  const frontmatter: Record<string, string> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key && value) {
      frontmatter[key] = value;
    }
  }

  // Validate required fields
  const required = ['capture_type', 'timestamp', 'session_id', 'executor'];
  for (const field of required) {
    if (!frontmatter[field]) {
      throw new Error(`Missing required frontmatter field: ${field}`);
    }
  }

  return {
    frontmatter: frontmatter as unknown as HistoryFrontmatter,
    body
  };
}

/**
 * Extract title from markdown body
 */
export function extractTitle(body: string, fallback: string): string {
  // Try various heading patterns
  const patterns = [
    // # LEARNING: Title or # RESEARCH: Title
    /^#\s+(?:LEARNING|RESEARCH|DECISION|FEATURE|SESSION):\s*(.+)$/m,
    // # Any heading
    /^#\s+(.+)$/m,
    // **Bold text** at start
    /^\*\*(.+?)\*\*/m,
    // First non-empty line
    /^([^\n#*-].{10,})/m
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1].trim().slice(0, 100);
    }
  }

  return fallback;
}

/**
 * Parse markdown file with frontmatter and extract all metadata
 */
export function parseMarkdownFile(content: string): ParsedMarkdown {
  const { frontmatter, body } = parseFrontmatter(content);
  const title = extractTitle(body, frontmatter.capture_type);

  return {
    frontmatter,
    body,
    title
  };
}

/**
 * Clean markdown body for knowledge storage
 * Removes capture system footer and excessive whitespace
 */
export function cleanBody(body: string): string {
  return body
    // Remove capture footer (with optional blank lines before ---)
    .replace(/\n+---\n+\*Captured by PAI[^*]*\*\s*$/s, '')
    // Remove excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
