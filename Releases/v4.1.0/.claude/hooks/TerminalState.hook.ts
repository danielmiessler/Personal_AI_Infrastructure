#!/usr/bin/env bun
/**
 * TerminalState.hook.ts — Consolidated terminal state management
 *
 * Handles all terminal tab state across the session lifecycle.
 * Routes by hook event to the appropriate handler function.
 *
 * Events handled:
 * - SessionStart:   Persist Kitty env variables, reset tab to idle state
 * - UserPromptSubmit: Set tab title from prompt (thinking → working), fire voice
 * - Stop:           Reset tab to completed state after response
 * - PreToolUse (AskUserQuestion): Set tab to question/teal state
 *
 * VOICE: Fire-and-forget (no await) to prevent blocking session startup.
 * Task completion voice is separate (VoiceCompletion.hook.ts).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { inference } from '../PAI/Tools/Inference';
import { isValidWorkingTitle, isValidQuestionTitle, getWorkingFallback, getQuestionFallback, trimToValidTitle } from './lib/output-validators';
import { setTabState, readTabState, getSessionOneWord, persistKittySession } from './lib/tab-setter';
import { getIdentity, getDAName } from './lib/identity';
import { readHookInput, parseTranscriptFromInput } from './lib/hook-io';
import { handleTabState } from './handlers/TabState';
import { paiPath } from './lib/paths';
import { announce } from './lib/voice';

// ─── Shared types ────────────────────────────────────────────────────────────

interface UserPromptInput {
  session_id: string;
  prompt: string;
  transcript_path: string;
  hook_event_name: string;
}

interface SessionStartInput {
  session_id?: string;
  hook_event_name: string;
  source?: string;
}

interface PreToolUseInput {
  session_id?: string;
  tool_name: string;
  tool_input?: any;
  hook_event_name: string;
}

// ─── UserPromptSubmit: tab title + voice ─────────────────────────────────────

// Common imperative → gerund mappings
const GERUND_MAP: Record<string, string> = {
  fix: 'Fixing', update: 'Updating', add: 'Adding', remove: 'Removing',
  delete: 'Deleting', check: 'Checking', create: 'Creating', build: 'Building',
  deploy: 'Deploying', debug: 'Debugging', test: 'Testing', review: 'Reviewing',
  refactor: 'Refactoring', implement: 'Implementing', write: 'Writing',
  read: 'Reading', find: 'Finding', search: 'Searching', install: 'Installing',
  configure: 'Configuring', run: 'Running', start: 'Starting', stop: 'Stopping',
  restart: 'Restarting', open: 'Opening', close: 'Closing', move: 'Moving',
  rename: 'Renaming', merge: 'Merging', revert: 'Reverting', clean: 'Cleaning',
  show: 'Showing', list: 'Listing', get: 'Getting', set: 'Setting',
  make: 'Making', change: 'Changing', modify: 'Modifying', adjust: 'Adjusting',
  improve: 'Improving', optimize: 'Optimizing', analyze: 'Analyzing',
  research: 'Researching', investigate: 'Investigating', explain: 'Explaining',
  push: 'Pushing', pull: 'Pulling', commit: 'Committing', design: 'Designing',
};

const FALSE_GERUNDS = new Set([
  'something', 'nothing', 'anything', 'everything',
  'morning', 'evening', 'string', 'king', 'ring', 'thing',
  'bring', 'spring', 'swing', 'wing', 'cling', 'fling', 'sting',
  'during', 'using', 'being', 'ceiling', 'feeling',
]);

const FILTER_WORDS = new Set([
  'the', 'a', 'an', 'i', 'my', 'we', 'you', 'your', 'this', 'that', 'it',
  'is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'should',
  'would', 'will', 'have', 'has', 'had', 'just', 'also', 'need', 'want',
  'please', 'why', 'how', 'what', 'when', 'where', 'which', 'who', 'think',
  'fucking', 'fuck', 'shit', 'damn', 'dumb', 'ass', 'bitch', 'cunt', 'whore',
]);

function extractPromptTitle(prompt: string): string | null {
  const text = prompt.trim().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 200);
  const words = text.split(' ').filter(w => w.length > 1);
  if (words.length === 0) return null;

  const firstLower = words[0].toLowerCase().replace(/[^a-z]/g, '');

  if (firstLower.endsWith('ing') && firstLower.length > 4 && !FALSE_GERUNDS.has(firstLower)) {
    return trimToValidTitle(words, isValidWorkingTitle);
  }

  const gerund = GERUND_MAP[firstLower];
  if (gerund) {
    const rest = words.slice(1, 3).join(' ');
    const result = rest ? `${gerund} ${rest}` : gerund;
    return result.endsWith('.') ? result : result + '.';
  }

  return null;
}

const SYSTEM_PROMPT = `Create a 2-4 word COMPLETE SENTENCE summarizing the user's CURRENT MESSAGE.

RULES:
1. Start with a gerund (-ing verb): Fixing, Checking, Updating, etc.
2. Include the specific OBJECT being acted on
3. MUST be a COMPLETE sentence (no dangling prepositions or articles)
4. End with a period
5. NEVER use generic subjects: "task", "work", "request", "response"
6. MAXIMUM 4 words total including the gerund
7. ONLY reference topics EXPLICITLY present in the user's message. If the user didn't mention a topic, it MUST NOT appear in your output.

GOOD: "Fixing auth bug.", "Checking tab code.", "Reviewing config."
BAD: "Completing the task.", "Fixing the authentication bug in login.", "Working on it."

Output ONLY the sentence. Nothing else.`;

function isTitleRelevantToPrompt(title: string, prompt: string): boolean {
  const content = title.replace(/\.$/, '').trim();
  const words = content.split(/\s+/);
  if (words.length < 2) return true;

  const topicWords = words.slice(1)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(w => w.length > 2 && !FILTER_WORDS.has(w));

  if (topicWords.length === 0) return true;

  const promptLower = prompt.toLowerCase();

  return topicWords.every(word =>
    promptLower.includes(word) || promptLower.includes(word.slice(0, Math.max(4, Math.floor(word.length * 0.6))))
  );
}

async function summarizePrompt(prompt: string): Promise<{ voice: string | null; title: string | null }> {
  const cleanPrompt = prompt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
  const result = await inference({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: cleanPrompt,
    timeout: 10000,
    level: 'fast',
  });

  if (result.success && result.output) {
    const raw = result.output.replace(/<[^>]*>/g, '').replace(/^["']|["']$/g, '').trim();
    const words = raw.split(/\s+/);
    const summary = trimToValidTitle(words, isValidWorkingTitle) || '';

    const voiceSummary = summary || null;
    let tabTitle = voiceSummary;
    if (tabTitle && !isTitleRelevantToPrompt(tabTitle, cleanPrompt)) {
      console.error(`[TerminalState] Contaminated title rejected for tab: "${tabTitle}" — voice still fires`);
      tabTitle = null;
    }

    return { voice: voiceSummary, title: tabTitle };
  }

  return { voice: null, title: null };
}

async function handleUserPromptSubmit(data: UserPromptInput): Promise<void> {
  const prompt = data.prompt || '';

  if (!prompt || prompt.length < 3) return;

  // Skip ratings (1-10) — preserve current tab title
  if (/^([1-9]|10)$/.test(prompt.trim())) return;

  const sessionLabel = data.session_id ? getSessionOneWord(data.session_id) : null;
  const prefix = sessionLabel ? `${sessionLabel} | ` : '';

  // Phase 1: Immediate deterministic title (purple = thinking)
  const quickTitle = extractPromptTitle(prompt);
  const thinkingTitle = quickTitle || getWorkingFallback();
  setTabState({ title: `🧠 ${prefix}${thinkingTitle}`, state: 'thinking', sessionId: data.session_id });

  // Phase 2: Check shared PromptAnalysis result first, fall back to own inference
  let inferredTitle: string | null = null;
  let voiceSummary: string | null = null;
  try {
    const { readAnalysisResult } = await import('./PromptAnalysis.hook');
    const shared = readAnalysisResult(data.session_id);
    if (shared?.tab_title) {
      inferredTitle = shared.tab_title;
      voiceSummary = shared.tab_title;
      console.error(`[TerminalState] Using shared PromptAnalysis tab_title: "${inferredTitle}"`);
    }
  } catch {}

  // Fall back to own inference if no shared result
  if (!inferredTitle) {
    const result = await summarizePrompt(prompt);
    voiceSummary = result.voice;
    inferredTitle = result.title;
  }
  const finalTitle = inferredTitle || (quickTitle && isValidWorkingTitle(quickTitle) ? quickTitle : getWorkingFallback());
  setTabState({ title: `⚙️ ${prefix}${finalTitle}`, state: 'working', sessionId: data.session_id });

  // Voice feedback — fire-and-forget, no await (gated by voice.enabled)
  const voiceContent = voiceSummary || (quickTitle && isValidWorkingTitle(quickTitle) ? quickTitle : null);
  if (voiceContent) {
    announce(voiceContent.replace(/\.$/, ''), { voiceId: getIdentity().mainDAVoiceID });
    console.error(`[TerminalState] Voice queued: "${voiceContent}"`);
  } else {
    console.error(`[TerminalState] No meaningful voice content, skipping`);
  }

  console.error(`[TerminalState] UserPromptSubmit: "${finalTitle}"`);
}

// ─── SessionStart: kitty env + tab reset ─────────────────────────────────────

function handleSessionStart(data: SessionStartInput): void {
  // Skip for subagents
  const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
  const isSubagent = claudeProjectDir.includes('/.claude/Agents/') ||
                    process.env.CLAUDE_AGENT_TYPE !== undefined;
  if (isSubagent) return;

  const sessionId = data.session_id;

  // Persist Kitty environment per-session (new API — per-session files, no shared state)
  const kittyListenOn = process.env.KITTY_LISTEN_ON;
  const kittyWindowId = process.env.KITTY_WINDOW_ID;
  if (kittyListenOn && kittyWindowId && sessionId) {
    persistKittySession(sessionId, kittyListenOn, kittyWindowId);
  }

  // Legacy: also write kitty-env.json for hooks that don't have session ID
  if (kittyListenOn && kittyWindowId) {
    const stateDir = paiPath('MEMORY', 'STATE');
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      join(stateDir, 'kitty-env.json'),
      JSON.stringify({ KITTY_LISTEN_ON: kittyListenOn, KITTY_WINDOW_ID: kittyWindowId }, null, 2)
    );
  }

  // Reset tab title — prevent stale titles bleeding through
  try {
    const current = readTabState(sessionId);
    if (current && (current.state === 'working' || current.state === 'thinking')) {
      console.error(`🔄 Tab in ${current.state} state — preserving title through compaction`);
    } else {
      setTabState({ title: `${getDAName()} ready…`, state: 'idle', sessionId });
      console.error('🔄 Tab title reset to clean state');
    }
  } catch (err) {
    console.error(`⚠️ Failed to reset tab title: ${err}`);
  }
}

// ─── Stop: tab reset after response ──────────────────────────────────────────

async function handleStop(input: any): Promise<void> {
  const parsed = await parseTranscriptFromInput(input);
  try {
    await handleTabState(parsed, input.session_id);
  } catch (err) {
    console.error('[TerminalState] Stop handler failed:', err);
  }
}

// ─── PreToolUse (AskUserQuestion): teal question tab ─────────────────────────

function handleAskUserQuestion(data: PreToolUseInput): void {
  const FALLBACK_TITLE = getQuestionFallback();
  let summary = FALLBACK_TITLE;
  const sessionId = data.session_id;

  try {
    const questions = data.tool_input?.questions;
    if (Array.isArray(questions) && questions.length > 0) {
      const q = questions[0];
      if (q.header && typeof q.header === 'string' && q.header.trim().length > 0) {
        summary = q.header.trim();
      } else if (q.question && typeof q.question === 'string') {
        const words = q.question.trim().split(/\s+/).slice(0, 3);
        summary = words.join(' ').replace(/\?$/, '');
      }
    }
  } catch {
    // Use fallback
  }

  if (!isValidQuestionTitle(summary)) {
    summary = FALLBACK_TITLE;
  }

  try {
    const currentState = readTabState(sessionId);
    const previousTitle = currentState?.title || undefined;
    setTabState({ title: summary, state: 'question', previousTitle, sessionId });
    console.error(`[TerminalState] AskUserQuestion: teal tab — "${summary}"`);
  } catch (error) {
    console.error('[TerminalState] Kitty remote control unavailable');
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    const input = await readHookInput();
    if (!input) process.exit(0);

    const event = input.hook_event_name;

    if (event === 'SessionStart') {
      handleSessionStart(input as unknown as SessionStartInput);
    } else if (event === 'UserPromptSubmit') {
      await handleUserPromptSubmit(input as unknown as UserPromptInput);
    } else if (event === 'Stop') {
      await handleStop(input);
    } else if (event === 'PreToolUse' && (input as any).tool_name === 'AskUserQuestion') {
      handleAskUserQuestion(input as unknown as PreToolUseInput);
    }
  } catch (err) {
    console.error(`[TerminalState] Error: ${err}`);
  }

  process.exit(0);
}

main();
