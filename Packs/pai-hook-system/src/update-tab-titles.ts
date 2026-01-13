#!/usr/bin/env bun
import { readStdinJson } from './lib/stdin';
// $PAI_DIR/hooks/update-tab-titles.ts
// UserPromptSubmit hook: Update terminal tab title with task context

interface UserPromptPayload {
  session_id: string;
  prompt?: string;
  message?: string;
  [key: string]: any;
}

function setTabTitle(title: string): void {
  // OSC escape sequences for terminal tab and window titles
  const tabEscape = `\x1b]1;${title}\x07`;
  const windowEscape = `\x1b]2;${title}\x07`;

  process.stderr.write(tabEscape);
  process.stderr.write(windowEscape);
}

function extractTaskKeywords(prompt: string): string {
  // Remove common filler words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
    'my', 'your', 'please', 'help', 'want', 'need', 'like', 'just'
  ]);

  // Clean and tokenize
  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Take first 3-4 significant words
  const keywords = words.slice(0, 4);

  if (keywords.length === 0) {
    return 'Working';
  }

  // Capitalize first word
  keywords[0] = keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);

  return keywords.join(' ');
}

function launchBackgroundSummarization(prompt: string, sessionId: string): void {
  // Optional: Launch a background process to get a better title via AI
  // This is fire-and-forget - doesn't block the hook

  // Skip if prompt is too short
  if (prompt.length < 20) return;

  // This could call a fast model (e.g., Haiku) to summarize
  // For now, we just use keyword extraction (instant)

  // Example of what background summarization would look like:
  // Bun.spawn(['bun', 'run', 'summarize-task.ts', '--prompt', prompt], {
  //   stdout: 'ignore',
  //   stderr: 'ignore'
  // });
}

async function main() {
  try {
    const payload = await readStdinJson<UserPromptPayload>();
    if (!payload.prompt && !payload.message) {
      process.exit(0);
    }
    const prompt = payload.prompt || payload.message || '';

    if (!prompt || prompt.length < 3) {
      process.exit(0);
    }

    // Generate quick title from keywords (instant)
    const keywords = extractTaskKeywords(prompt);
    setTabTitle(`🤖 ${keywords}`);

    // Optionally launch background summarization for better title
    launchBackgroundSummarization(prompt, payload.session_id);

  } catch (error) {
    // Never crash
    console.error('Tab title update error:', error);
  }

  process.exit(0);
}

main();
