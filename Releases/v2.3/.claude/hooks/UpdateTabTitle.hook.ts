#!/usr/bin/env bun
/**
 * UpdateTabTitle.hook.ts - Tab Title + Voice Announcement (UserPromptSubmit)
 *
 * PURPOSE:
 * Provides real-time visual feedback for user prompts. Uses AI inference
 * to generate a concise 3-4 word summary and updates the terminal tab title
 * with color coding to show task state.
 *
 * VOICE: Announces the inference-generated sentence when prompt is received
 * (e.g., "Checking the config.", "Fixing the bug."). Same as tab title.
 * Task completion voice happens via StopOrchestrator using the 🗣️ line.
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
 * - Haiku inference API call: Generates summary
 * - Reads transcript for conversation context
 * - Voice server: Announces the inference-generated summary
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
 *
 * TAB/VOICE FORMAT (same for both):
 * - Complete sentence, 3-4 words maximum
 * - Starts with gerund, ends with period
 * - Examples: "Checking the config.", "Fixing the bug.", "Scanning PAI."
 *
 * ERROR HANDLING:
 * - Inference failure: Falls back to "Processing"
 * - Invalid summary: Falls back to quickTitle
 * - Kitty unavailable: Silent failure (escape codes for other terminals)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes (visual feedback)
 * - Typical execution: <500ms (Haiku inference is fast)
 * - Includes 5-second stdin timeout
 */

import { execSync } from 'child_process';
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
 * Returns a complete sentence matching the expected format
 */
function quickTitle(_prompt: string): string {
  return 'Processing the request.';
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

        // Skip assistant messages - they confuse the summarizer
        // Only user messages matter for understanding what the user wants
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

const SYSTEM_PROMPT = `You summarize what the USER wants in their CURRENT message. Ignore assistant responses.

Output a 3-4 word sentence: "[Gerund] the [thing]."

Examples:
- User complains something is broken → "Fixing the issue."
- User asks to check something → "Checking the config."
- User wants something created → "Creating the component."

CRITICAL: Focus ONLY on what the user is asking/complaining about. NEVER summarize assistant text.

Output ONLY the sentence. Nothing else.`;

interface SummaryResult {
  summary: string;
  fromInference: boolean;
}

/**
 * Generate concise 3-4 word summary using Inference (standard/Sonnet) with conversation context
 * Returns both the summary and whether it came from inference (vs fallback)
 */
async function summarizePrompt(prompt: string, transcriptPath: string): Promise<SummaryResult> {
  // Get recent conversation context
  const context = getRecentContext(transcriptPath);

  // Build user prompt - prioritize current request, context is secondary
  let userPrompt: string;
  if (context) {
    userPrompt = `USER'S CURRENT MESSAGE (summarize THIS):
${prompt.slice(0, 800)}

Previous user messages for reference only:
${context}`;
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
    // Clean up quotes, keep the period, limit to 4 words
    let summary = result.output.replace(/^["']|["']$/g, '').trim();
    const words = summary.split(/\s+/).slice(0, 4);
    summary = words.join(' ');
    // Ensure it ends with period
    if (!summary.endsWith('.')) summary += '.';
    return { summary, fromInference: true };
  }

  return { summary: quickTitle(prompt), fromInference: false };
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
    const truncated = titleWithSuffix.length > 50 ? titleWithSuffix.slice(0, 47) + '…' : titleWithSuffix;
    const escaped = truncated.replace(/'/g, "'\\''");

    // Check if we're in Kitty (TERM=xterm-kitty or KITTY_LISTEN_ON set)
    const isKitty = process.env.TERM === 'xterm-kitty' || process.env.KITTY_LISTEN_ON;

    if (isKitty) {
      // Use Kitty remote control - works even without TTY
      execSync(`kitty @ set-tab-title "${escaped}"`, { stdio: 'ignore', timeout: 2000 });

      // Set color based on state
      if (state === 'inference') {
        // Purple for inference/AI thinking - active tab stays dark blue, inactive shows purple
        execSync(
          `kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_BG} active_fg=${ACTIVE_TEXT} inactive_bg=${TAB_INFERENCE_BG} inactive_fg=${INACTIVE_TEXT}`,
          { stdio: 'ignore', timeout: 2000 }
        );
        console.error('[UpdateTabTitle] Set inference color (purple on inactive only)');
      } else if (state === 'working') {
        // Orange for actively working - active tab stays dark blue, inactive shows orange
        execSync(
          `kitten @ set-tab-color --self active_bg=${ACTIVE_TAB_BG} active_fg=${ACTIVE_TEXT} inactive_bg=${TAB_WORKING_BG} inactive_fg=${INACTIVE_TEXT}`,
          { stdio: 'ignore', timeout: 2000 }
        );
        console.error('[UpdateTabTitle] Set working color (orange on inactive only)');
      }

      console.error('[UpdateTabTitle] Set via Kitty remote control');
    } else {
      // Fallback to escape codes for other terminals
      execSync(`printf '\\033]0;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
      execSync(`printf '\\033]2;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
      execSync(`printf '\\033]30;${escaped}\\007' >&2`, { stdio: ['pipe', 'pipe', 'inherit'] });
    }
  } catch (err) {
    console.error(`[UpdateTabTitle] Failed to set title: ${err}`);
  }
}

/**
 * Announce prompt receipt via voice server.
 * Summary is already a complete sentence from Haiku.
 */
async function announceVoice(summary: string): Promise<void> {
  const identity = await import('./lib/identity').then(m => m.getIdentity());

  if (!identity.voiceId) {
    console.error('[UpdateTabTitle] No voice ID configured, skipping voice');
    return;
  }

  // Summary is already a complete sentence from Haiku (e.g., "Fixing the bug now.")
  // Just ensure proper capitalization
  const message = summary.charAt(0).toUpperCase() + summary.slice(1);

  try {
    const response = await fetch('http://localhost:8888/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: identity.name,
        message: message,
        voice_enabled: true,
        voice_id: identity.voiceId,
        voice_settings: identity.voice,
      }),
    });

    if (!response.ok) {
      console.error('[UpdateTabTitle] Voice server error:', response.statusText);
    } else {
      console.error(`[UpdateTabTitle] Voice sent: "${message}"`);
    }
  } catch (err) {
    console.error('[UpdateTabTitle] Voice failed:', err);
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

    // Get better summary from Haiku inference with full conversation context
    console.error('[UpdateTabTitle] Calling Haiku inference with context...');
    const { summary: rawSummary, fromInference } = await summarizePrompt(prompt, data.transcript_path);
    console.error(`[UpdateTabTitle] Raw summary: "${rawSummary}" (fromInference: ${fromInference})`);

    // Validate summary - reject garbage like "I appreciate you reaching out"
    let summary = rawSummary;
    let usedFallback = !fromInference;  // Already a fallback if inference failed
    if (!isValidTabSummary(rawSummary)) {
      console.error('[UpdateTabTitle] Invalid summary detected, using quickTitle fallback');
      summary = quickTitle(prompt);
      usedFallback = true;
      // If quickTitle also fails validation, use format-compliant fallback
      if (!isValidTabSummary(summary)) {
        console.error('[UpdateTabTitle] quickTitle also invalid, using final fallback');
        summary = getTabFallback();
      }
    }
    console.error(`[UpdateTabTitle] Final summary: "${summary}" (fallback: ${usedFallback})`);

    // Update tab with SHORT title (4 words max - gerund + topic) + working state
    const shortTitle = summary.split(/\s+/).slice(0, 4).join(' ');
    setTabTitle(`⚙️${shortTitle}`, 'working');  // Orange = actively working on task

    // Voice announcement - speaks the inference-generated summary (e.g., "Checking config")
    // ONLY announce if we got a REAL summary from inference, NOT fallbacks
    if (!usedFallback && isValidTabSummary(shortTitle)) {
      await announceVoice(shortTitle);
      console.error(`[UpdateTabTitle] Voice announced: "${shortTitle}"`);
    } else {
      console.error(`[UpdateTabTitle] Skipped voice - using fallback (fromInference=${fromInference}, usedFallback=${usedFallback})`);
    }

    console.error('[UpdateTabTitle] Complete');

    process.exit(0);
  } catch (err) {
    console.error(`[UpdateTabTitle] Error: ${err}`);
    process.exit(0);
  }
}

main();
