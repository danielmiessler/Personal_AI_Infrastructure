#!/usr/bin/env bun
/**
 * UpdateTabTitle.hook.ts - Tab Title + Voice Announcement (UserPromptSubmit)
 *
 * PURPOSE:
 * Provides real-time visual and audio feedback for user prompts. Uses AI inference
 * to generate a concise 3-4 word summary, updates the terminal tab title with color
 * coding, and announces the task via the voice server.
 *
 * TRIGGER: UserPromptSubmit
 *
 * INPUT:
 * - stdin: Hook input JSON with prompt, session_id, transcript_path
 *
 * OUTPUT:
 * - stdout: None
 * - stderr: Status and debug messages
 * - exit(0): Always (non-blocking)
 *
 * SIDE EFFECTS:
 * - Kitty remote control: Sets tab title and color
 * - Voice server HTTP request: Announces task
 * - Haiku inference API call: Generates summary
 * - Reads transcript for conversation context
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: None
 * - COORDINATES WITH: SetQuestionTab (shares tab color management)
 * - COORDINATES WITH: StopOrchestrator/tab-state (resets color on completion)
 * - MUST RUN BEFORE: None
 * - MUST RUN AFTER: None
 *
 * TAB COLOR SCHEME (inactive tab only - active tab stays dark blue):
 * - Dark purple (#1E0A3C): AI inference/thinking (🧠 prefix)
 * - Dark orange (#804000): Actively working (⚙️ prefix)
 * - Dark teal (#085050): Waiting for user input (SetQuestionTab)
 * - Dark blue (#002B80): Active tab always uses this
 *
 * SUMMARY GENERATION:
 * 1. Immediately shows "Processing…" with purple color
 * 2. Uses Haiku with conversation context to generate summary
 * 3. Validates summary (rejects garbage like "I appreciate...")
 * 4. Updates tab to gerund-based summary (e.g., "Fixing auth bug")
 * 5. Announces via voice server
 *
 * VOICE FORMAT:
 * - Always starts with gerund (Checking, Fixing, Creating, etc.)
 * - 3-4 words maximum
 * - Examples: "Checking config", "Debugging auth", "Creating component"
 *
 * ERROR HANDLING:
 * - Inference failure: Falls back to "Processing"
 * - Invalid summary: Falls back to quickTitle
 * - Kitty unavailable: Silent failure (escape codes for other terminals)
 * - Voice server unavailable: Silent failure
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (visual feedback)
 * - Typical execution: <500ms (Haiku inference is fast)
 * - Includes 5-second stdin timeout
 */

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { inference } from '../skills/CORE/Tools/Inference';
import { isValidTabSummary, getTabFallback } from './lib/response-format';

// Tab colors - different states
const TAB_WORKING_BG = '#804000';      // Dark orange - actively working
const TAB_INFERENCE_BG = '#1E0A3C';    // Very dark purple - inference/AI thinking
const ACTIVE_TAB_BG = '#002B80';       // Dark blue - active tab base
const ACTIVE_TEXT = '#FFFFFF';          // White text for active
const INACTIVE_TEXT = '#A0A0A0';        // Gray text for inactive


interface HookInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

/**
 * Read stdin with timeout
 */
async function readStdinWithTimeout(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => reject(new Error('Timeout')), timeout);
    process.stdin.on('data', (chunk) => { data += chunk.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

/**
 * Quick fallback - just a generic placeholder while inference runs
 * Never extracts words from prompt - always use inference for semantic understanding
 * MUST return a gerund (word ending in "ing") to pass isValidTabSummary validation
 */
function quickTitle(_prompt: string): string {
  return 'Processing request';
}

/**
 * Get recent conversation context from transcript
 * Returns last N human/assistant turns formatted for context
 */
function getRecentContext(transcriptPath: string, maxTurns: number = 4): string {
  try {
    if (!transcriptPath) return '';

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    const turns: { role: string; text: string }[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);

        // Handle user messages (skip tool_result, only capture actual text)
        if (entry.type === 'user' && entry.message?.content) {
          let text = '';
          if (typeof entry.message.content === 'string') {
            text = entry.message.content;
          } else if (Array.isArray(entry.message.content)) {
            // Extract only text blocks, skip tool_result blocks
            text = entry.message.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ');
          }
          if (text.trim()) {
            turns.push({ role: 'User', text: text.slice(0, 500) });
          }
        }

        // Handle assistant messages - extract key action/topic
        if (entry.type === 'assistant' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message.content)
              ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '';
          if (text) {
            // Extract just the summary line if present, otherwise first 300 chars
            const summaryMatch = text.match(/SUMMARY:\s*([^\n]+)/);
            const shortText = summaryMatch ? summaryMatch[1] : text.slice(0, 300);
            turns.push({ role: 'Assistant', text: shortText });
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Get last N turns
    const recentTurns = turns.slice(-maxTurns);
    if (recentTurns.length === 0) return '';

    return recentTurns.map(t => `${t.role}: ${t.text}`).join('\n');
  } catch (err) {
    console.error('[UpdateTabTitle] Error reading transcript:', err);
    return '';
  }
}

const SYSTEM_PROMPT = `Summarize what the user wants in 3-4 words max. Start with a gerund:
- Questions → "Checking config", "Finding file"
- Commands → "Fixing bug", "Creating component"
- Investigation → "Debugging auth", "Analyzing logs"
- Research → "Researching API"
- Continuation → Use CONTEXT to understand what "it/that" means

CRITICAL: Keep it SHORT - 3-4 words only. Must fit in a tab title.
If the request uses "it", "that", "this" - use conversation context.

Output ONLY the summary. No quotes, no punctuation.
Examples: "Checking config", "Fixing auth bug", "Testing cache"`;

/**
 * Generate concise 3-4 word summary using Inference (standard/Sonnet) with conversation context
 */
async function summarizePrompt(prompt: string, transcriptPath: string): Promise<string> {
  // Get recent conversation context
  const context = getRecentContext(transcriptPath);

  // Build user prompt with context if available
  let userPrompt: string;
  if (context) {
    userPrompt = `CONTEXT (recent conversation):
${context}

CURRENT REQUEST:
${prompt.slice(0, 800)}`;
  } else {
    userPrompt = prompt.slice(0, 1000);
  }

  const result = await inference({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    timeout: 15000,
    level: 'fast',  // Haiku for speed - tab titles need to appear quickly
  });

  if (result.success && result.output) {
    const summary = result.output.replace(/^["']|["']$/g, '').replace(/[.!?]$/g, '');
    const words = summary.split(/\s+/).slice(0, 4);
    return words.join(' ');
  }

  return quickTitle(prompt);
}

type TabState = 'normal' | 'working' | 'inference';

/**
 * Set terminal tab title and color based on state
 * Uses Kitty remote control if available (hooks run without TTY),
 * falls back to escape codes for other terminals
 */
function setTabTitle(title: string, state: TabState = 'normal'): void {
  try {
    // Add "…" suffix for active states
    const titleWithSuffix = state !== 'normal' ? `${title}…` : title;
    const finalTitle = titleWithSuffix.length > 50 ? titleWithSuffix.slice(0, 47) + '…' : titleWithSuffix;

    // Check if we're in Kitty (TERM=xterm-kitty or KITTY_LISTEN_ON set)
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;

    if (isKitty) {
      // Use Kitty remote control - works even without TTY
      // spawnSync with array bypasses shell, making command injection impossible
      spawnSync('kitty', ['@', 'set-tab-title', finalTitle], { stdio: 'ignore', timeout: 2000 });

      // Set color based on state
      if (state === 'inference') {
        spawnSync('kitten', [
          '@', 'set-tab-color', '--self',
          `active_bg=${ACTIVE_TAB_BG}`, `active_fg=${ACTIVE_TEXT}`,
          `inactive_bg=${TAB_INFERENCE_BG}`, `inactive_fg=${INACTIVE_TEXT}`
        ], { stdio: 'ignore', timeout: 2000 });
        console.error('[UpdateTabTitle] Set inference color (purple on inactive only)');
      } else if (state === 'working') {
        spawnSync('kitten', [
          '@', 'set-tab-color', '--self',
          `active_bg=${ACTIVE_TAB_BG}`, `active_fg=${ACTIVE_TEXT}`,
          `inactive_bg=${TAB_WORKING_BG}`, `inactive_fg=${INACTIVE_TEXT}`
        ], { stdio: 'ignore', timeout: 2000 });
        console.error('[UpdateTabTitle] Set working color (orange on inactive only)');
      }

      console.error('[UpdateTabTitle] Set via Kitty remote control');
    } else {
      // Fallback to escape codes for other terminals - using printf directly to avoid shell parsing issues
      spawnSync('printf', [`\\033]0;${finalTitle}\\007`], { stdio: ['ignore', 'ignore', 'inherit'] });
      spawnSync('printf', [`\\033]2;${finalTitle}\\007`], { stdio: ['ignore', 'ignore', 'inherit'] });
      spawnSync('printf', [`\\033]30;${finalTitle}\\007`], { stdio: ['ignore', 'ignore', 'inherit'] });
    }
  } catch (err) {
    console.error(`[UpdateTabTitle] Failed to set title: ${err}`);
  }
}

/**
 * Send voice notification
 */
function announceVoice(summary: string): void {
  try {
    // Summary already starts with gerund - use directly, capitalize first letter
    const message = summary.charAt(0).toUpperCase() + summary.slice(1);
    
    // Use spawn to send the request without blocking, still avoiding shell interpretation
    spawnSync('curl', [
      '-s', '-X', 'POST', 'http://localhost:8888/notify',
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ message })
    ], { stdio: 'ignore', timeout: 2000 });
  } catch {
    // Voice server might not be running
  }
}

async function main() {
  try {
    console.error('[UpdateTabTitle] Hook started');
    const input = await readStdinWithTimeout();
    const data: HookInput = JSON.parse(input);
    const prompt = data.prompt || '';
    console.error(`[UpdateTabTitle] Prompt: "${prompt.slice(0, 50)}..."`);

    if (!prompt || prompt.length < 3) {
      console.error('[UpdateTabTitle] Prompt too short, exiting');
      process.exit(0);
    }

    // Set quick fallback title immediately with inference state (purple + "…")
    const quickFallback = quickTitle(prompt);
    console.error(`[UpdateTabTitle] Quick fallback: "${quickFallback}"`);
    setTabTitle(`🧠${quickFallback}`, 'inference');  // Brain = AI thinking/inference

    // Get better summary from Sonnet (standard level with full conversation context)
    console.error('[UpdateTabTitle] Calling Sonnet inference with context...');
    const rawSummary = await summarizePrompt(prompt, data.transcript_path);
    console.error(`[UpdateTabTitle] Raw summary: "${rawSummary}"`);

    // Validate summary - reject garbage like "I appreciate you reaching out"
    let summary = rawSummary;
    if (!isValidTabSummary(rawSummary)) {
      console.error('[UpdateTabTitle] Invalid summary detected, using quickTitle fallback');
      summary = quickTitle(prompt);
      // If quickTitle also fails validation, use format-compliant fallback
      if (!isValidTabSummary(summary)) {
        console.error('[UpdateTabTitle] quickTitle also invalid, using final fallback');
        summary = getTabFallback();
      }
    }
    console.error(`[UpdateTabTitle] Final summary: "${summary}"`);

    // Update tab with SHORT title (4 words max - gerund + topic) + working state
    const shortTitle = summary.split(/\s+/).slice(0, 4).join(' ');
    setTabTitle(`⚙️${shortTitle}`, 'working');  // Orange = actively working on task

    // Voice announcement - validated to prevent garbage
    if (isValidTabSummary(summary)) {
      announceVoice(summary);
      console.error(`[UpdateTabTitle] Voice: "${summary}"`);
    } else {
      console.error(`[UpdateTabTitle] Skipped voice - invalid summary: "${summary}"`);
    }
    console.error('[UpdateTabTitle] Complete');

    process.exit(0);
  } catch (err) {
    console.error(`[UpdateTabTitle] Error: ${err}`);
    process.exit(0);
  }
}

main();
