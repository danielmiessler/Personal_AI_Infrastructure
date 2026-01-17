#!/usr/bin/env bun
// $PAI_DIR/hooks/vault-context-injector.ts
// UserPromptSubmit hook: Auto-search vault and inject context before Claude responds

// Import VaultReader functions - use absolute path based on PAI_DIR
const paiDir = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const vaultReaderPath = `${paiDir}/skills/SecondBrain/Tools/VaultReader.ts`;

// Dynamic import to handle path resolution
const {
  getVaultConfig,
  findRelated
} = await import(vaultReaderPath);

type SearchResult = {
  file: string;
  category: string;
  matches: Array<{ line: number; content: string }>;
};

interface UserPromptSubmitPayload {
  prompt: string;
  session_id?: string;
  [key: string]: any;
}

/**
 * Extract meaningful search terms from user prompt
 * Skip common words, focus on nouns and proper names
 */
function extractSearchTerms(prompt: string): string[] {
  const stopWords = new Set([
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'the', 'a', 'an',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'can', 'may', 'might', 'must', 'shall',
    'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'once', 'here', 'there',
    'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'also', 'now', 'help', 'want', 'need', 'please', 'thanks',
    'tell', 'show', 'give', 'make', 'let', 'know', 'think', 'see', 'look'
  ]);

  // Extract words, preserving capitalized terms (likely proper nouns/names)
  const words = prompt
    .replace(/[?!.,;:'"()[\]{}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const terms: string[] = [];

  for (const word of words) {
    const lower = word.toLowerCase();

    // Keep capitalized words (proper nouns, project names)
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
      terms.push(word);
    }
    // Keep non-stop words
    else if (!stopWords.has(lower)) {
      terms.push(lower);
    }
  }

  // Deduplicate and limit
  return [...new Set(terms)].slice(0, 5);
}

/**
 * Format search results as concise context for Claude
 */
function formatContextOutput(results: SearchResult[], searchTerms: string[]): string {
  if (results.length === 0) {
    return ''; // No output if nothing found
  }

  const lines: string[] = [];
  lines.push('<system-reminder>');
  lines.push('VAULT CONTEXT (Auto-injected by vault-context-injector hook)');
  lines.push('');
  lines.push(`Found ${results.length} relevant notes for: ${searchTerms.join(', ')}`);
  lines.push('');

  // Show top 5 results with brief excerpts
  for (const result of results.slice(0, 5)) {
    lines.push(`[${result.category}] ${result.file}`);
    if (result.matches.length > 0) {
      // Show first match as context
      lines.push(`  → ${result.matches[0].content.substring(0, 150)}...`);
    }
  }

  lines.push('');
  lines.push('USE THIS CONTEXT in your response. Do not give generic answers when vault has specific information.');
  lines.push('</system-reminder>');

  return lines.join('\n');
}

async function main() {
  try {
    // Read event payload from stdin
    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    let payload: UserPromptSubmitPayload;
    try {
      payload = JSON.parse(stdinData);
    } catch {
      // Not valid JSON, exit silently
      process.exit(0);
    }

    // Get user's prompt
    const prompt = payload.prompt;
    if (!prompt || prompt.length < 5) {
      process.exit(0);
    }

    // Check vault configuration
    const config = getVaultConfig();
    if (!config.vault_root) {
      // No vault configured, exit silently
      process.exit(0);
    }

    // Extract search terms from prompt
    const searchTerms = extractSearchTerms(prompt);
    if (searchTerms.length === 0) {
      process.exit(0);
    }

    // Search vault for related content
    const results = findRelated(config.vault_root, searchTerms.join(' '), { limit: 10 });

    // Format and output context
    const output = formatContextOutput(results, searchTerms);
    if (output) {
      console.log(output);
    }

  } catch (error) {
    // Never crash - hooks must be silent on errors
    // Uncomment for debugging:
    // console.error('[vault-context-injector] Error:', error);
  }

  process.exit(0);
}

main();
