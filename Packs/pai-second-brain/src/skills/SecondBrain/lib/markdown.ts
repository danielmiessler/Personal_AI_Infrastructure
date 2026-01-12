/**
 * Markdown content extraction utilities
 * Shared across all SecondBrain tools
 */

/**
 * Extract title from markdown content
 * Tries: H1 header > frontmatter title > filename
 */
export function extractTitle(content: string, filename: string): string {
  // Try to get title from H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];

  // Try frontmatter title
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m);
  if (frontmatterMatch) return frontmatterMatch[1];

  // Fall back to filename
  return filename.replace(/\.md$/, "").replace(/-/g, " ");
}

/**
 * Extract summary/preview from markdown content
 * Returns first meaningful paragraph
 */
export function extractSummary(content: string, maxLength = 200): string {
  // Skip frontmatter
  let text = content.replace(/^---[\s\S]*?---\s*/m, "");

  // Skip title
  text = text.replace(/^#\s+.+\n/m, "");

  // Get first meaningful paragraph
  const paragraphs = text.split(/\n\n+/).filter((p) => {
    const trimmed = p.trim();
    return (
      trimmed.length > 30 &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("|")
    );
  });

  if (paragraphs.length > 0) {
    return paragraphs[0].replace(/\n/g, " ").trim().substring(0, maxLength);
  }

  // Fallback: first non-empty lines
  const lines = text
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(0, 3);
  return lines.join(" ").substring(0, maxLength);
}

/**
 * Extract key points related to a topic
 * Returns headers and relevant bullet points
 */
export function extractKeyPoints(
  content: string,
  topic: string,
  maxPoints = 5
): string[] {
  const points: string[] = [];
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/).filter((w) => w.length > 3);

  // Extract headers as key points
  const headers = content.match(/^##\s+.+$/gm) || [];
  for (const header of headers.slice(0, 3)) {
    points.push(header.replace(/^##\s+/, ""));
  }

  // Extract bullet points containing topic keywords
  const bullets = content.match(/^[-*]\s+.+$/gm) || [];
  for (const bullet of bullets) {
    const bulletLower = bullet.toLowerCase();
    if (topicWords.some((w) => bulletLower.includes(w))) {
      const cleaned = bullet.replace(/^[-*]\s+/, "").substring(0, 100);
      if (!points.includes(cleaned)) {
        points.push(cleaned);
      }
    }
    if (points.length >= maxPoints) break;
  }

  return points.slice(0, maxPoints);
}

/**
 * Extract key snippets matching a query
 * Returns relevant paragraphs/sections
 */
export function extractKeySnippets(
  content: string,
  query: string,
  maxSnippets = 3
): string[] {
  const snippets: string[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);

  // Split into paragraphs
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 20);

  for (const para of paragraphs) {
    const paraLower = para.toLowerCase();
    const matchCount = queryWords.filter((w) => paraLower.includes(w)).length;

    if (matchCount > 0) {
      const cleaned = para.replace(/\n/g, " ").trim().substring(0, 200);
      snippets.push(cleaned);
      if (snippets.length >= maxSnippets) break;
    }
  }

  return snippets;
}

/**
 * Strip frontmatter from markdown content
 */
export function stripFrontmatter(content: string): string {
  return content.replace(/^---[\s\S]*?---\s*/m, "");
}

/**
 * Extract frontmatter as object
 */
export function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
      result[key] = value;
    }
  }

  return result;
}
